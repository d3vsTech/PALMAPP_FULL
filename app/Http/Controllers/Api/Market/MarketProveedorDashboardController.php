<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Models\Market\MarketPedido;
use App\Models\Market\MarketProducto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MarketProveedorDashboardController extends Controller
{
    /**
     * GET /api/v1/market/proveedor/dashboard
     */
    public function index(): JsonResponse
    {
        try {
            $proveedorId = (int) app('current_proveedor_id');

            $indicadores  = $this->calcularIndicadores($proveedorId);
            $recientes    = $this->pedidosRecientes($proveedorId);
            $masVendidos  = $this->productosMasVendidos($proveedorId);

            return response()->json([
                'data' => [
                    'indicadores'           => $indicadores,
                    'pedidos_recientes'     => $recientes,
                    'productos_mas_vendidos'=> $masVendidos,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('MarketProveedorDashboard error', [
                'proveedor_id' => app('current_proveedor_id'),
                'message'      => $e->getMessage(),
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Error al cargar el dashboard'], 500);
        }
    }

    private function calcularIndicadores(int $proveedorId): array
    {
        // Un solo raw query para todos los KPIs de productos y pedidos
        $row = DB::selectOne("
            SELECT
                (SELECT COUNT(*) FROM market_productos
                    WHERE proveedor_id = :pid1 AND estado = 'activo')        AS productos_activos,
                (SELECT COUNT(*) FROM market_productos
                    WHERE proveedor_id = :pid2)                               AS productos_total,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid3 AND estado = 'pendiente')      AS pedidos_pendientes,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid4
                      AND estado IN ('confirmado','preparando','en_transito')) AS pedidos_en_proceso,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid5
                      AND estado = 'entregado'
                      AND fecha_pedido >= date_trunc('month', NOW()))          AS completados_mes,
                (SELECT COALESCE(SUM(total), 0) FROM market_pedidos
                    WHERE proveedor_id = :pid6
                      AND estado <> 'cancelado'
                      AND fecha_pedido >= date_trunc('month', NOW()))          AS ventas_mes_actual,
                (SELECT COALESCE(SUM(total), 0) FROM market_pedidos
                    WHERE proveedor_id = :pid7
                      AND estado <> 'cancelado'
                      AND fecha_pedido >= date_trunc('month', NOW() - INTERVAL '1 month')
                      AND fecha_pedido  < date_trunc('month', NOW()))          AS ventas_mes_anterior
        ", [
            'pid1' => $proveedorId, 'pid2' => $proveedorId, 'pid3' => $proveedorId,
            'pid4' => $proveedorId, 'pid5' => $proveedorId, 'pid6' => $proveedorId,
            'pid7' => $proveedorId,
        ]);

        $actual    = (float) $row->ventas_mes_actual;
        $anterior  = (float) $row->ventas_mes_anterior;
        $variacion = $anterior > 0 ? round((($actual - $anterior) / $anterior) * 100, 1) : null;

        return [
            'productos_activos'          => (int) $row->productos_activos,
            'productos_total'            => (int) $row->productos_total,
            'pedidos_pendientes'         => (int) $row->pedidos_pendientes,
            'pedidos_en_proceso'         => (int) $row->pedidos_en_proceso,
            'pedidos_completados_mes'    => (int) $row->completados_mes,
            'ventas_mes_actual'          => $actual,
            'ventas_mes_anterior'        => $anterior,
            'variacion_ventas_porcentaje'=> $variacion,
        ];
    }

    private function pedidosRecientes(int $proveedorId): array
    {
        $pedidos = MarketPedido::where('proveedor_id', $proveedorId)
            ->with([
                'tenant:id,nombre',
                'items' => fn ($q) => $q->orderBy('id')->limit(1)
                    ->with('producto:id,nombre,unidad_medida_id')
                    ->with('producto.unidadMedida:id,abreviatura'),
            ])
            ->orderByDesc('fecha_pedido')
            ->limit(5)
            ->get(['id', 'proveedor_id', 'tenant_id', 'codigo', 'estado', 'total', 'fecha_pedido']);

        return $pedidos->map(function (MarketPedido $pedido) {
            $primerItem = $pedido->items->first();

            return [
                'id'          => $pedido->id,
                'codigo'      => $pedido->codigo,
                'estado'      => $pedido->estado,
                'total'       => $pedido->total,
                'fecha_pedido'=> $pedido->fecha_pedido,
                'tenant'      => $pedido->tenant
                    ? ['id' => $pedido->tenant->id, 'nombre' => $pedido->tenant->nombre]
                    : null,
                'primer_producto' => $primerItem ? [
                    'nombre'   => $primerItem->nombre_producto,
                    'cantidad' => $primerItem->cantidad,
                    'unidad'   => $primerItem->producto?->unidadMedida?->abreviatura,
                ] : null,
            ];
        })->values()->all();
    }

    private function productosMasVendidos(int $proveedorId): array
    {
        return MarketProducto::where('proveedor_id', $proveedorId)
            ->orderByDesc('unidades_vendidas')
            ->limit(5)
            ->get(['id', 'nombre', 'imagen_principal', 'unidades_vendidas', 'ingresos_acumulados'])
            ->map(fn (MarketProducto $p) => [
                'id'                  => $p->id,
                'nombre'              => $p->nombre,
                'imagen_principal'    => $p->imagen_principal,
                'unidades_vendidas'   => (int) $p->unidades_vendidas,
                'ingresos_acumulados' => (float) $p->ingresos_acumulados,
            ])
            ->values()->all();
    }
}
