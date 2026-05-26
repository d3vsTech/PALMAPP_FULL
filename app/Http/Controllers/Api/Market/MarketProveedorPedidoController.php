<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\Proveedor\UpdateMarketPedidoEstadoRequest;
use App\Models\Market\MarketPedido;
use App\Models\Market\MarketPedidoEstadoHistorial;
use App\Services\AuditoriaService;
use App\Services\Market\MarketFacturaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MarketProveedorPedidoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected MarketFacturaService $facturaService,
    ) {}

    /**
     * GET /api/v1/market/proveedor/pedidos
     *
     * Lista paginada de pedidos del proveedor con stats por estado.
     * Filtros: ?tab= ?estado= ?buscar= ?page=
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');

            // ── Stats ──────────────────────────────────────────────────
            $porConfirmar = MarketPedido::delProveedor($proveedorId)->where('estado', 'pendiente')->count();
            $activos      = MarketPedido::delProveedor($proveedorId)
                ->whereIn('estado', ['confirmado', 'preparando', 'en_transito'])->count();
            $enTransito   = MarketPedido::delProveedor($proveedorId)->where('estado', 'en_transito')->count();
            $completados  = MarketPedido::delProveedor($proveedorId)->where('estado', 'entregado')->count();
            $ventasMes    = (float) MarketPedido::delProveedor($proveedorId)
                ->where('estado', 'entregado')
                ->whereMonth('fecha_pedido', now()->month)
                ->whereYear('fecha_pedido', now()->year)
                ->sum('total');

            // ── Query ──────────────────────────────────────────────────
            $query = MarketPedido::delProveedor($proveedorId)
                ->with(['tenant:id,nombre,telefono,correo_contacto', 'items:id,pedido_id,nombre_producto,cantidad,precio_unitario,subtotal'])
                ->orderByDesc('fecha_pedido');

            // Filtro por tab
            match ($request->input('tab')) {
                'por_confirmar' => $query->where('estado', 'pendiente'),
                'activos'       => $query->whereIn('estado', ['confirmado', 'preparando', 'en_transito']),
                'completados'   => $query->where('estado', 'entregado'),
                default         => null,
            };

            // Filtro por estado específico (dropdown)
            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            // Búsqueda por código o nombre de tenant
            if ($request->filled('buscar')) {
                $buscar = '%' . $request->buscar . '%';
                $query->where(function ($q) use ($buscar) {
                    $q->where('codigo', 'ilike', $buscar)
                      ->orWhereHas('tenant', fn ($t) => $t->where('nombre', 'ilike', $buscar));
                });
            }

            $pedidos = $query->paginate(15);

            // Enriquecer con resumen y acciones disponibles
            $data = $pedidos->getCollection()->map(function (MarketPedido $pedido) {
                $primerItem = $pedido->items->first();
                $resumen = $primerItem
                    ? $primerItem->cantidad . ' ' . ($primerItem->nombre_producto)
                    : '—';
                if ($pedido->items->count() > 1) {
                    $resumen .= ' y ' . ($pedido->items->count() - 1) . ' producto(s) más';
                }

                return [
                    'id'                   => $pedido->id,
                    'codigo'               => $pedido->codigo,
                    'estado'               => $pedido->estado,
                    'prioridad'            => $pedido->prioridad,
                    'estado_pago'          => $pedido->estado_pago,
                    'numero_guia'          => $pedido->numero_guia,
                    'subtotal'             => $pedido->subtotal,
                    'costo_envio'          => $pedido->costo_envio,
                    'total'                => $pedido->total,
                    'metodo_pago'          => $pedido->metodo_pago,
                    'fecha_pedido'         => $pedido->fecha_pedido,
                    'fecha_entrega_estimada' => $pedido->fecha_entrega_estimada,
                    'tenant'               => [
                        'id'      => $pedido->tenant->id,
                        'nombre'  => $pedido->tenant->nombre,
                        'telefono' => $pedido->tenant->telefono,
                        'email'   => $pedido->tenant->correo_contacto,
                    ],
                    'productos_resumen'    => $resumen,
                    'acciones_disponibles' => MarketPedido::$accionesPorEstado[$pedido->estado] ?? [],
                ];
            });

            return response()->json([
                'stats' => [
                    'por_confirmar' => $porConfirmar,
                    'activos'       => $activos,
                    'en_transito'   => $enTransito,
                    'completados'   => $completados,
                    'ventas_mes'    => $ventasMes,
                ],
                'data' => $data,
                'meta' => [
                    'current_page' => $pedidos->currentPage(),
                    'last_page'    => $pedidos->lastPage(),
                    'per_page'     => $pedidos->perPage(),
                    'total'        => $pedidos->total(),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('Market Proveedor: error al listar pedidos: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener los pedidos',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/pedidos/{codigo}
     *
     * Detalle completo del pedido con items, historial y datos del tenant.
     */
    public function show(string $codigo): JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');

            $pedido = MarketPedido::delProveedor($proveedorId)
                ->where('codigo', $codigo)
                ->with([
                    'tenant:id,nombre,nit,correo_contacto,telefono,direccion',
                    'items.producto:id,nombre,imagen_principal',
                    'historial.user:id,name',
                ])
                ->first();

            if (! $pedido) {
                return response()->json([
                    'message' => 'Pedido no encontrado',
                    'code'    => 'PEDIDO_NOT_FOUND',
                ], 404);
            }

            return response()->json([
                'data' => array_merge($pedido->toArray(), [
                    'acciones_disponibles' => MarketPedido::$accionesPorEstado[$pedido->estado] ?? [],
                ]),
            ]);

        } catch (\Throwable $e) {
            Log::error("Market Proveedor: error al obtener pedido {$codigo}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener el pedido',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/market/proveedor/pedidos/{codigo}/estado
     *
     * Cambia el estado del pedido. Valida la máquina de estados y registra historial.
     */
    public function updateEstado(UpdateMarketPedidoEstadoRequest $request, string $codigo): JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');
            $validated   = $request->validated();

            $pedido = MarketPedido::delProveedor($proveedorId)
                ->where('codigo', $codigo)
                ->first();

            if (! $pedido) {
                return response()->json([
                    'message' => 'Pedido no encontrado',
                    'code'    => 'PEDIDO_NOT_FOUND',
                ], 404);
            }

            $estadoNuevo = $validated['estado'];
            $transicionesValidas = MarketPedido::$transicionesValidas[$pedido->estado] ?? [];

            if (! in_array($estadoNuevo, $transicionesValidas, true)) {
                return response()->json([
                    'message' => "No es posible pasar de '{$pedido->estado}' a '{$estadoNuevo}'",
                    'code'    => 'TRANSICION_INVALIDA',
                    'estado_actual'       => $pedido->estado,
                    'transiciones_validas' => $transicionesValidas,
                ], 409);
            }

            $datosAnteriores = $pedido->toArray();
            $estadoAnterior  = $pedido->estado;

            DB::transaction(function () use ($pedido, $estadoNuevo, $validated, $estadoAnterior) {
                $pedido->update([
                    'estado'                 => $estadoNuevo,
                    'numero_guia'            => $validated['numero_guia'] ?? $pedido->numero_guia,
                    'fecha_entrega_estimada' => $validated['fecha_entrega_estimada'] ?? $pedido->fecha_entrega_estimada,
                    'fecha_entrega_real'     => $estadoNuevo === 'entregado' ? now() : $pedido->fecha_entrega_real,
                    'estado_pago'            => $validated['estado_pago'] ?? $pedido->estado_pago,
                    'prioridad'              => $validated['prioridad'] ?? $pedido->prioridad,
                ]);

                MarketPedidoEstadoHistorial::create([
                    'pedido_id'      => $pedido->id,
                    'estado_anterior' => $estadoAnterior,
                    'estado_nuevo'   => $estadoNuevo,
                    'comentario'     => $validated['comentario'] ?? null,
                    'user_id'        => auth()->id(),
                    'fecha_cambio'   => now(),
                ]);
            });

            $pedido->refresh();

            $this->auditoria->registrarEdicion(
                $request,
                'MARKET_PEDIDOS',
                $pedido,
                $datosAnteriores,
                "Estado {$pedido->codigo}: {$estadoAnterior} → {$estadoNuevo}",
            );

            return response()->json([
                'message' => "Estado actualizado a {$estadoNuevo}",
                'data'    => [
                    'id'                   => $pedido->id,
                    'codigo'               => $pedido->codigo,
                    'estado'               => $pedido->estado,
                    'prioridad'            => $pedido->prioridad,
                    'estado_pago'          => $pedido->estado_pago,
                    'numero_guia'          => $pedido->numero_guia,
                    'fecha_entrega_estimada' => $pedido->fecha_entrega_estimada,
                    'fecha_entrega_real'   => $pedido->fecha_entrega_real,
                    'acciones_disponibles' => MarketPedido::$accionesPorEstado[$pedido->estado] ?? [],
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación',
                'errors'  => $e->errors(),
            ], 422);

        } catch (\Throwable $e) {
            Log::error("Market Proveedor: error al cambiar estado pedido {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al actualizar el estado del pedido',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/pedidos/{codigo}/factura
     *
     * Descarga la factura en PDF del pedido.
     */
    public function factura(string $codigo): Response|JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');

            $pedido = MarketPedido::delProveedor($proveedorId)
                ->where('codigo', $codigo)
                ->first();

            if (! $pedido) {
                return response()->json([
                    'message' => 'Pedido no encontrado',
                    'code'    => 'PEDIDO_NOT_FOUND',
                ], 404);
            }

            return $this->facturaService->pdf($pedido);

        } catch (\Throwable $e) {
            Log::error("Market Proveedor: error al generar factura {$codigo}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al generar la factura',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/pedidos/exportar
     *
     * Exporta los pedidos filtrados a un archivo Excel.
     * Acepta los mismos filtros que index() pero sin paginación (máx 1000).
     */
    public function exportar(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');

            $query = MarketPedido::delProveedor($proveedorId)
                ->with(['tenant:id,nombre,correo_contacto'])
                ->orderByDesc('fecha_pedido');

            if ($request->filled('tab')) {
                match ($request->input('tab')) {
                    'por_confirmar' => $query->where('estado', 'pendiente'),
                    'activos'       => $query->whereIn('estado', ['confirmado', 'preparando', 'en_transito']),
                    'completados'   => $query->where('estado', 'entregado'),
                    default         => null,
                };
            }

            if ($request->filled('estado')) {
                $query->where('estado', $request->estado);
            }

            if ($request->filled('buscar')) {
                $buscar = '%' . $request->buscar . '%';
                $query->where(function ($q) use ($buscar) {
                    $q->where('codigo', 'ilike', $buscar)
                      ->orWhereHas('tenant', fn ($t) => $t->where('nombre', 'ilike', $buscar));
                });
            }

            $pedidos = $query->limit(1000)->get();

            // ── Construcción del Excel ─────────────────────────────────
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Pedidos');

            $etiquetas = [
                'pendiente'   => 'Pendiente Confirmación',
                'confirmado'  => 'Confirmado',
                'preparando'  => 'En Preparación',
                'en_transito' => 'En Tránsito',
                'entregado'   => 'Entregado',
                'cancelado'   => 'Cancelado',
            ];

            // Cabeceras
            $headers = ['Código', 'Cliente', 'Estado', 'Prioridad', 'Estado Pago',
                        'Fecha', 'Total', 'Método Pago', 'Núm. Guía', 'Entrega Estimada'];
            foreach ($headers as $col => $header) {
                $cell = chr(65 + $col) . '1';
                $sheet->setCellValue($cell, $header);
            }

            $headerStyle = [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '166534']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ];
            $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);

            // Datos
            foreach ($pedidos as $row => $pedido) {
                $r = $row + 2;
                $sheet->setCellValue("A{$r}", $pedido->codigo);
                $sheet->setCellValue("B{$r}", $pedido->tenant->nombre ?? '—');
                $sheet->setCellValue("C{$r}", $etiquetas[$pedido->estado] ?? $pedido->estado);
                $sheet->setCellValue("D{$r}", ucfirst($pedido->prioridad ?? 'normal'));
                $sheet->setCellValue("E{$r}", ucfirst($pedido->estado_pago ?? 'pendiente'));
                $sheet->setCellValue("F{$r}", $pedido->fecha_pedido?->format('d/m/Y') ?? '');
                $sheet->setCellValue("G{$r}", (float) $pedido->total);
                $sheet->setCellValue("H{$r}", $pedido->metodo_pago ?? '—');
                $sheet->setCellValue("I{$r}", $pedido->numero_guia ?? '—');
                $sheet->setCellValue("J{$r}", $pedido->fecha_entrega_estimada?->format('d/m/Y') ?? '—');

                // Formato moneda en columna G
                $sheet->getStyle("G{$r}")
                    ->getNumberFormat()
                    ->setFormatCode('$#,##0');

                // Color de fila alternada
                if ($row % 2 === 0) {
                    $sheet->getStyle("A{$r}:J{$r}")
                        ->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('F9FAFB');
                }
            }

            // Ajustar anchos de columna
            foreach (range('A', 'J') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Generar el archivo
            $writer = new Xlsx($spreadsheet);
            ob_start();
            $writer->save('php://output');
            $content = ob_get_clean();

            $filename = 'Pedidos-' . now()->format('Y-m-d') . '.xlsx';

            return response($content, 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            ]);

        } catch (\Throwable $e) {
            Log::error('Market Proveedor: error al exportar pedidos: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al exportar los pedidos',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
