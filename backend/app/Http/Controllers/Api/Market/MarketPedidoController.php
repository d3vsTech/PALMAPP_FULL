<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\CheckoutPedidoRequest;
use App\Models\Market\MarketCarrito;
use App\Models\Market\MarketPedido;
use App\Models\Market\MarketPedidoEstadoHistorial;
use App\Models\Market\MarketPedidoItem;
use App\Models\Market\MarketProducto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MarketPedidoController extends Controller
{
    /**
     * GET /api/v1/tenant/market/pedidos
     *
     * Retorna stats (cards superiores) + lista paginada de pedidos.
     * Filtros: ?estado= ?page=
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId     = app('current_tenant_id');
            $estadosActivos = ['pendiente', 'confirmado', 'preparando', 'en_transito'];

            $pedidosActivos = MarketPedido::delTenant($tenantId)
                ->whereIn('estado', $estadosActivos)
                ->count();

            $pedidosEntregados = MarketPedido::delTenant($tenantId)
                ->where('estado', 'entregado')
                ->count();

            $totalGastado = (float) MarketPedido::delTenant($tenantId)
                ->where('estado', '!=', 'cancelado')
                ->sum('total');

            $pedidos = MarketPedido::delTenant($tenantId)
                ->with([
                    'proveedor:id,nombre_empresa',
                    'items:id,pedido_id,nombre_producto,cantidad,precio_unitario,subtotal',
                ])
                ->when($request->filled('estado'), fn ($q) =>
                    $q->where('estado', $request->estado)
                )
                ->orderByDesc('fecha_pedido')
                ->paginate(10);

            return response()->json([
                'stats' => [
                    'pedidos_activos'    => $pedidosActivos,
                    'pedidos_entregados' => $pedidosEntregados,
                    'total_gastado'      => $totalGastado,
                ],
                'data' => $pedidos->items(),
                'meta' => [
                    'current_page' => $pedidos->currentPage(),
                    'last_page'    => $pedidos->lastPage(),
                    'per_page'     => $pedidos->perPage(),
                    'total'        => $pedidos->total(),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('Market: error al listar pedidos: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener los pedidos',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/market/pedidos/{codigo}
     *
     * Detalle completo del pedido con ítems, historial de estados y datos del proveedor.
     */
    public function show(string $codigo): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $pedido = MarketPedido::delTenant($tenantId)
                ->where('codigo', $codigo)
                ->with([
                    'proveedor:id,nombre_empresa,nit,email,ciudad,calificacion_promedio',
                    'items.producto:id,imagen_principal,nombre',
                    'historial.user:id,name',
                ])
                ->first();

            if (! $pedido) {
                return response()->json([
                    'message' => 'Pedido no encontrado',
                    'code'    => 'PEDIDO_NOT_FOUND',
                ], 404);
            }

            return response()->json(['data' => $pedido]);

        } catch (\Throwable $e) {
            Log::error("Market: error al obtener pedido {$codigo}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener el pedido',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/market/pedidos
     *
     * Checkout desde el carrito activo del tenant.
     * Crea un pedido por cada proveedor distinto en el carrito.
     */
    public function store(CheckoutPedidoRequest $request): JsonResponse
    {
        try {
            $tenantId  = app('current_tenant_id');
            $user      = $request->user();
            $validated = $request->validated();

            // 1. Cargar carrito con todos sus ítems y relaciones necesarias
            $carrito = MarketCarrito::where('tenant_id', $tenantId)
                ->with(['itemsConProducto'])
                ->first();

            // 2. Validar que el carrito no esté vacío
            if (! $carrito || $carrito->itemsConProducto->isEmpty()) {
                return response()->json([
                    'message' => 'El carrito está vacío',
                    'code'    => 'CARRITO_VACIO',
                ], 409);
            }

            $items = $carrito->itemsConProducto;

            // 3. Pre-validar stock antes de abrir la transacción (fail-fast)
            $stockErrors = [];
            foreach ($items as $item) {
                if ($item->producto->stock_disponible < $item->cantidad) {
                    $stockErrors[] = [
                        'producto'    => $item->producto->nombre,
                        'disponible'  => $item->producto->stock_disponible,
                        'solicitado'  => $item->cantidad,
                    ];
                }
            }

            if (! empty($stockErrors)) {
                return response()->json([
                    'message' => 'Stock insuficiente para uno o más productos',
                    'code'    => 'STOCK_INSUFICIENTE',
                    'errors'  => $stockErrors,
                ], 409);
            }

            // 4. Agrupar ítems por proveedor — se crea un pedido por proveedor
            $grupos = $items->groupBy(fn ($item) => $item->producto->proveedor_id);

            // 5. Dirección de entrega: request → tenant.direccion → placeholder
            $direccionEntrega = $validated['direccion_entrega']
                ?? app('current_tenant')->direccion
                ?? 'Sin dirección especificada';

            $metodoPago = $validated['metodo_pago'] ?? 'Transferencia Bancaria';
            $notas      = $validated['notas'] ?? null;

            // 6. Transacción: crear pedidos, ítems, historial y decrementar stock
            $pedidosCreados = DB::transaction(function () use (
                $grupos, $tenantId, $user, $direccionEntrega, $metodoPago, $notas, $carrito
            ) {
                $creados = [];

                foreach ($grupos as $proveedorId => $grupoItems) {

                    // a. Calcular subtotal del grupo aplicando precios por volumen
                    $subtotalGrupo = 0.0;
                    $itemsData     = [];

                    foreach ($grupoItems as $item) {
                        $precioUnitario = $item->producto->getPrecioParaCantidad($item->cantidad);
                        $itemSubtotal   = $precioUnitario * $item->cantidad;
                        $subtotalGrupo += $itemSubtotal;

                        $itemsData[] = [
                            'item'           => $item,
                            'producto'       => $item->producto,
                            'precioUnitario' => $precioUnitario,
                            'itemSubtotal'   => round($itemSubtotal, 2),
                        ];
                    }

                    $subtotal   = round($subtotalGrupo, 2);
                    $costoEnvio = 0.0;
                    $total      = round($subtotalGrupo + $costoEnvio, 2);

                    // b. Generar código de pedido dentro de la transacción
                    $codigo = MarketPedido::generarCodigo();

                    // c. Crear el pedido
                    $pedido = MarketPedido::create([
                        'codigo'            => $codigo,
                        'tenant_id'         => $tenantId,
                        'proveedor_id'      => $proveedorId,
                        'estado'            => 'pendiente',
                        'subtotal'          => $subtotal,
                        'costo_envio'       => $costoEnvio,
                        'total'             => $total,
                        'metodo_pago'       => $metodoPago,
                        'direccion_entrega' => $direccionEntrega,
                        'notas'             => $notas,
                        'fecha_pedido'      => now(),
                    ]);

                    // d. Crear ítems con snapshot de nombre y precio
                    foreach ($itemsData as $d) {
                        MarketPedidoItem::create([
                            'pedido_id'       => $pedido->id,
                            'producto_id'     => $d['producto']->id,
                            'cantidad'        => $d['item']->cantidad,
                            'precio_unitario' => $d['precioUnitario'],
                            'subtotal'        => $d['itemSubtotal'],
                            'descuento'       => 0,
                            'nombre_producto' => $d['producto']->nombre,
                        ]);
                    }

                    // e. Registrar estado inicial en historial
                    MarketPedidoEstadoHistorial::create([
                        'pedido_id'      => $pedido->id,
                        'estado_anterior' => null,
                        'estado_nuevo'   => 'pendiente',
                        'user_id'        => $user->id,
                        'comentario'     => 'Pedido creado',
                        'fecha_cambio'   => now(),
                    ]);

                    // f. Decrementar stock con guardia de concurrencia
                    foreach ($itemsData as $d) {
                        $actualizado = MarketProducto::where('id', $d['producto']->id)
                            ->where('stock_disponible', '>=', $d['item']->cantidad)
                            ->decrement('stock_disponible', $d['item']->cantidad);

                        if ($actualizado === 0) {
                            throw new \RuntimeException(
                                "Stock insuficiente para '{$d['producto']->nombre}' al procesar el checkout"
                            );
                        }
                    }

                    $creados[] = $pedido->load(['items', 'proveedor:id,nombre_empresa']);
                }

                // g. Vaciar el carrito (se mantiene el registro vacío)
                $carrito->items()->delete();

                return $creados;
            });

            $totalPedidos = count($pedidosCreados);
            $mensaje = $totalPedidos === 1
                ? 'Pedido creado correctamente'
                : "{$totalPedidos} pedidos creados (uno por proveedor)";

            return response()->json([
                'message'       => $mensaje,
                'data'          => $pedidosCreados,
                'total_pedidos' => $totalPedidos,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\RuntimeException $e) {
            Log::warning('Market: stock insuficiente durante checkout: ' . $e->getMessage());
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => 'STOCK_INSUFICIENTE_CONCURRENTE',
            ], 409);

        } catch (\Throwable $e) {
            Log::error('Market: error en checkout: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al procesar el pedido',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
