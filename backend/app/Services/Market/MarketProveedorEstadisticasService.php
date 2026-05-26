<?php

namespace App\Services\Market;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MarketProveedorEstadisticasService
{
    /**
     * Resuelve el rango actual y el rango de comparación (misma duración,
     * terminando el día previo al inicio del rango actual).
     *
     * @return array{
     *   preset: string,
     *   actual: array{0: Carbon, 1: Carbon},
     *   anterior: array{0: Carbon, 1: Carbon},
     *   dias: int
     * }
     */
    public function resolverRango(?string $periodo, ?string $desde, ?string $hasta): array
    {
        $preset = $periodo ?: 'ultimos_30_dias';
        $hoy = Carbon::today();

        [$inicio, $fin] = match ($preset) {
            'ultimos_7_dias'   => [$hoy->copy()->subDays(6)->startOfDay(),  $hoy->copy()->endOfDay()],
            'ultimos_30_dias'  => [$hoy->copy()->subDays(29)->startOfDay(), $hoy->copy()->endOfDay()],
            'ultimos_3_meses'  => [$hoy->copy()->subDays(89)->startOfDay(), $hoy->copy()->endOfDay()],
            'ultimos_6_meses'  => [$hoy->copy()->subDays(179)->startOfDay(), $hoy->copy()->endOfDay()],
            'este_anio'        => [$hoy->copy()->startOfYear()->startOfDay(), $hoy->copy()->endOfDay()],
            'personalizado'    => [
                Carbon::createFromFormat('Y-m-d', $desde)->startOfDay(),
                Carbon::createFromFormat('Y-m-d', $hasta)->endOfDay(),
            ],
            default => throw new \InvalidArgumentException("Periodo no soportado: {$preset}"),
        };

        $dias = $inicio->diffInDays($fin) + 1;
        $anteriorFin    = $inicio->copy()->subDay()->endOfDay();
        $anteriorInicio = $anteriorFin->copy()->subDays($dias - 1)->startOfDay();

        return [
            'preset'   => $preset,
            'actual'   => [$inicio, $fin],
            'anterior' => [$anteriorInicio, $anteriorFin],
            'dias'     => $dias,
        ];
    }

    /**
     * Compone el payload completo de estadísticas del proveedor.
     */
    public function obtenerEstadisticas(int $proveedorId, array $rangos): array
    {
        [$a1, $a2] = $rangos['actual'];
        [$b1, $b2] = $rangos['anterior'];

        return [
            'periodo'                => $this->periodoMeta($rangos),
            'kpis'                   => $this->calcularKpis($proveedorId, $a1, $a2, $b1, $b2),
            'evolucion_ventas'       => $this->evolucionVentas($proveedorId),
            'productos_mas_vendidos' => $this->topProductos($proveedorId, $a1, $a2, $b1, $b2),
            'mejores_clientes'       => $this->topClientes($proveedorId, $a1, $a2),
            'metricas_adicionales'   => $this->metricasAdicionales($proveedorId, $a1, $a2),
        ];
    }

    private function periodoMeta(array $rangos): array
    {
        [$a1, $a2] = $rangos['actual'];
        [$b1, $b2] = $rangos['anterior'];

        return [
            'preset'                   => $rangos['preset'],
            'fecha_desde'              => $a1->toDateString(),
            'fecha_hasta'              => $a2->toDateString(),
            'fecha_desde_comparacion'  => $b1->toDateString(),
            'fecha_hasta_comparacion'  => $b2->toDateString(),
            'dias'                     => $rangos['dias'],
        ];
    }

    private function calcularKpis(int $pid, Carbon $a1, Carbon $a2, Carbon $b1, Carbon $b2): array
    {
        $row = DB::selectOne("
            SELECT
                (SELECT COALESCE(SUM(total),0) FROM market_pedidos
                    WHERE proveedor_id = :pid1 AND estado <> 'cancelado'
                    AND fecha_pedido BETWEEN :a1a AND :a2a)              AS ventas_actual,
                (SELECT COALESCE(SUM(total),0) FROM market_pedidos
                    WHERE proveedor_id = :pid2 AND estado <> 'cancelado'
                    AND fecha_pedido BETWEEN :b1a AND :b2a)              AS ventas_anterior,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid3 AND estado = 'entregado'
                    AND fecha_pedido BETWEEN :a1b AND :a2b)              AS completados_actual,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid4 AND estado = 'entregado'
                    AND fecha_pedido BETWEEN :b1b AND :b2b)              AS completados_anterior,
                (SELECT COALESCE(SUM(i.cantidad),0)
                    FROM market_pedido_items i
                    JOIN market_pedidos p ON p.id = i.pedido_id
                    WHERE p.proveedor_id = :pid5 AND p.estado <> 'cancelado'
                    AND p.fecha_pedido BETWEEN :a1c AND :a2c)            AS unidades_actual,
                (SELECT COALESCE(SUM(i.cantidad),0)
                    FROM market_pedido_items i
                    JOIN market_pedidos p ON p.id = i.pedido_id
                    WHERE p.proveedor_id = :pid6 AND p.estado <> 'cancelado'
                    AND p.fecha_pedido BETWEEN :b1c AND :b2c)            AS unidades_anterior,
                (SELECT COUNT(DISTINCT tenant_id) FROM market_pedidos
                    WHERE proveedor_id = :pid7 AND estado <> 'cancelado'
                    AND fecha_pedido BETWEEN :a1d AND :a2d)              AS clientes_actual,
                (SELECT COUNT(DISTINCT tenant_id) FROM market_pedidos
                    WHERE proveedor_id = :pid8 AND estado <> 'cancelado'
                    AND fecha_pedido BETWEEN :b1d AND :b2d)              AS clientes_anterior
        ", [
            'pid1' => $pid, 'pid2' => $pid, 'pid3' => $pid, 'pid4' => $pid,
            'pid5' => $pid, 'pid6' => $pid, 'pid7' => $pid, 'pid8' => $pid,
            'a1a' => $a1, 'a2a' => $a2, 'b1a' => $b1, 'b2a' => $b2,
            'a1b' => $a1, 'a2b' => $a2, 'b1b' => $b1, 'b2b' => $b2,
            'a1c' => $a1, 'a2c' => $a2, 'b1c' => $b1, 'b2c' => $b2,
            'a1d' => $a1, 'a2d' => $a2, 'b1d' => $b1, 'b2d' => $b2,
        ]);

        return [
            'ventas_totales'      => $this->kpiPair((float) $row->ventas_actual,      (float) $row->ventas_anterior),
            'pedidos_completados' => $this->kpiPair((int)   $row->completados_actual, (int)   $row->completados_anterior),
            'productos_vendidos'  => $this->kpiPair((int)   $row->unidades_actual,    (int)   $row->unidades_anterior),
            'clientes_activos'    => $this->kpiPair((int)   $row->clientes_actual,    (int)   $row->clientes_anterior),
        ];
    }

    private function kpiPair(int|float $actual, int|float $anterior): array
    {
        return [
            'actual'               => $actual,
            'anterior'             => $anterior,
            'variacion_porcentaje' => $this->variacion((float) $actual, (float) $anterior),
        ];
    }

    private function variacion(float $actual, float $anterior): ?float
    {
        if ($anterior <= 0) {
            return null;
        }
        return round((($actual - $anterior) / $anterior) * 100, 1);
    }

    /**
     * Últimos 6 meses (mes actual incluido) con total de ventas por mes.
     * Rellena meses sin ventas con total = 0 y agrega label localizado.
     */
    private function evolucionVentas(int $pid): array
    {
        $rows = DB::select("
            SELECT TO_CHAR(date_trunc('month', fecha_pedido), 'YYYY-MM') AS mes,
                   COALESCE(SUM(total), 0) AS total
            FROM market_pedidos
            WHERE proveedor_id = :pid
              AND estado <> 'cancelado'
              AND fecha_pedido >= date_trunc('month', NOW()) - INTERVAL '5 months'
              AND fecha_pedido <  date_trunc('month', NOW()) + INTERVAL '1 month'
            GROUP BY 1
            ORDER BY 1
        ", ['pid' => $pid]);

        $porMes = [];
        foreach ($rows as $r) {
            $porMes[$r->mes] = (float) $r->total;
        }

        $puntos = [];
        $inicio = Carbon::now()->startOfMonth()->subMonths(5);
        for ($i = 0; $i < 6; $i++) {
            $mesCarbon = $inicio->copy()->addMonths($i);
            $mesKey    = $mesCarbon->format('Y-m');
            $puntos[] = [
                'mes'   => $mesKey,
                'label' => mb_convert_case($mesCarbon->locale('es')->isoFormat('MMM'), MB_CASE_TITLE, 'UTF-8'),
                'total' => $porMes[$mesKey] ?? 0.0,
            ];
        }

        $primero = $puntos[0]['total'];
        $ultimo  = $puntos[5]['total'];
        $variacion = $primero > 0 ? round((($ultimo - $primero) / $primero) * 100, 1) : null;

        return [
            'puntos' => $puntos,
            'variacion_porcentaje_vs_6_meses' => $variacion,
        ];
    }

    /**
     * Top 5 productos del proveedor en el periodo actual + tendencia vs periodo anterior.
     */
    private function topProductos(int $pid, Carbon $a1, Carbon $a2, Carbon $b1, Carbon $b2): array
    {
        $top = DB::select("
            SELECT p.id, p.nombre, c.nombre AS categoria,
                   SUM(i.cantidad) AS unidades,
                   SUM(i.subtotal) AS ingresos
            FROM market_pedido_items i
            JOIN market_pedidos pd ON pd.id = i.pedido_id
            JOIN market_productos p ON p.id = i.producto_id
            LEFT JOIN market_categorias c ON c.id = p.categoria_id
            WHERE pd.proveedor_id = :pid
              AND pd.estado <> 'cancelado'
              AND pd.fecha_pedido BETWEEN :a1 AND :a2
            GROUP BY p.id, p.nombre, c.nombre
            ORDER BY unidades DESC
            LIMIT 5
        ", ['pid' => $pid, 'a1' => $a1, 'a2' => $a2]);

        if (empty($top)) {
            return [];
        }

        $ids = array_map(fn ($r) => (int) $r->id, $top);
        $placeholders = implode(',', array_map(fn ($i) => ":id{$i}", array_keys($ids)));
        $params = ['pid' => $pid, 'b1' => $b1, 'b2' => $b2];
        foreach ($ids as $i => $id) {
            $params["id{$i}"] = $id;
        }

        $previas = DB::select("
            SELECT i.producto_id, SUM(i.cantidad) AS unidades_anterior
            FROM market_pedido_items i
            JOIN market_pedidos pd ON pd.id = i.pedido_id
            WHERE pd.proveedor_id = :pid
              AND pd.estado <> 'cancelado'
              AND pd.fecha_pedido BETWEEN :b1 AND :b2
              AND i.producto_id IN ({$placeholders})
            GROUP BY i.producto_id
        ", $params);

        $anterioresPorId = [];
        foreach ($previas as $p) {
            $anterioresPorId[(int) $p->producto_id] = (int) $p->unidades_anterior;
        }

        $resultado = [];
        foreach ($top as $idx => $r) {
            $actual    = (int) $r->unidades;
            $anterior  = $anterioresPorId[(int) $r->id] ?? 0;
            $tendencia = match (true) {
                $actual > $anterior => 'up',
                $actual < $anterior => 'down',
                default             => 'flat',
            };

            $resultado[] = [
                'rank'              => $idx + 1,
                'producto_id'       => (int) $r->id,
                'nombre'            => $r->nombre,
                'categoria'         => $r->categoria,
                'unidades_vendidas' => $actual,
                'ingresos'          => (float) $r->ingresos,
                'tendencia'         => $tendencia,
            ];
        }

        return $resultado;
    }

    /**
     * Top 4 clientes (tenants) por monto total gastado en el periodo.
     */
    private function topClientes(int $pid, Carbon $a1, Carbon $a2): array
    {
        $rows = DB::select("
            SELECT t.id, t.nombre,
                   COUNT(p.id) AS total_pedidos,
                   SUM(p.total) AS total_gastado,
                   MAX(p.fecha_pedido) AS ultimo_pedido
            FROM market_pedidos p
            JOIN tenants t ON t.id = p.tenant_id
            WHERE p.proveedor_id = :pid
              AND p.estado <> 'cancelado'
              AND p.fecha_pedido BETWEEN :a1 AND :a2
            GROUP BY t.id, t.nombre
            ORDER BY total_gastado DESC
            LIMIT 4
        ", ['pid' => $pid, 'a1' => $a1, 'a2' => $a2]);

        $clientes = [];
        foreach ($rows as $idx => $r) {
            $clientes[] = [
                'rank'          => $idx + 1,
                'tenant_id'     => (int) $r->id,
                'nombre'        => $r->nombre,
                'total_pedidos' => (int) $r->total_pedidos,
                'total_gastado' => (float) $r->total_gastado,
                'ultimo_pedido' => $r->ultimo_pedido
                    ? Carbon::parse($r->ultimo_pedido)->toDateString()
                    : null,
            ];
        }

        return $clientes;
    }

    /**
     * Tasa de conversión (entregados/creados), ticket promedio (pedidos no cancelados)
     * y productos activos (count absoluto, sin filtro de periodo).
     */
    private function metricasAdicionales(int $pid, Carbon $a1, Carbon $a2): array
    {
        $row = DB::selectOne("
            SELECT
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid1
                    AND fecha_pedido BETWEEN :a1a AND :a2a)              AS creados,
                (SELECT COUNT(*) FROM market_pedidos
                    WHERE proveedor_id = :pid2 AND estado = 'entregado'
                    AND fecha_pedido BETWEEN :a1b AND :a2b)              AS entregados,
                (SELECT COALESCE(AVG(total), 0) FROM market_pedidos
                    WHERE proveedor_id = :pid3 AND estado <> 'cancelado'
                    AND fecha_pedido BETWEEN :a1c AND :a2c)              AS ticket_promedio,
                (SELECT COUNT(*) FROM market_productos
                    WHERE proveedor_id = :pid4 AND estado = 'activo')    AS productos_activos
        ", [
            'pid1' => $pid, 'pid2' => $pid, 'pid3' => $pid, 'pid4' => $pid,
            'a1a' => $a1, 'a2a' => $a2,
            'a1b' => $a1, 'a2b' => $a2,
            'a1c' => $a1, 'a2c' => $a2,
        ]);

        $creados    = (int) $row->creados;
        $entregados = (int) $row->entregados;
        $tasa = $creados > 0 ? round(($entregados / $creados) * 100, 1) : null;

        return [
            'tasa_conversion_porcentaje' => $tasa,
            'ticket_promedio'            => round((float) $row->ticket_promedio, 2),
            'productos_activos'          => (int) $row->productos_activos,
        ];
    }
}
