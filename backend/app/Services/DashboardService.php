<?php

namespace App\Services;

use App\Constants\ViajeEstado;
use App\Models\Lote;
use App\Models\Operacion;
use App\Models\Viaje;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Compone el payload completo del dashboard tenant.
     */
    public function obtenerDashboard(Carbon $desde, Carbon $hasta): array
    {
        return [
            'periodo' => [
                'fecha_inicio' => $desde->toDateString(),
                'fecha_fin'    => $hasta->toDateString(),
            ],
            'indicadores' => $this->indicadoresProduccion($desde, $hasta),
            'lotes'       => $this->promedioPorLote($desde, $hasta),
            'viajes'      => $this->viajesFinalizadosEnRango($desde, $hasta),
            'lluvias'     => $this->lluvias(),
        ];
    }

    /**
     * Resuelve un rango [Carbon $desde, Carbon $hasta] a partir del preset
     * o de las fechas custom enviadas por el frontend.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function resolverRango(?string $periodo, ?string $inicio, ?string $fin): array
    {
        $hoy = Carbon::today();
        $periodo = $periodo ?: 'semanal';

        return match ($periodo) {
            'semanal'   => [$hoy->copy()->startOfWeek(), $hoy->copy()->endOfWeek()],
            'quincenal' => [$hoy->copy()->subDays(14)->startOfDay(), $hoy->copy()->endOfDay()],
            'mensual'   => [$hoy->copy()->startOfMonth(), $hoy->copy()->endOfMonth()],
            'personalizado' => [
                Carbon::createFromFormat('Y-m-d', $inicio)->startOfDay(),
                Carbon::createFromFormat('Y-m-d', $fin)->endOfDay(),
            ],
            default => throw new \InvalidArgumentException("Periodo no soportado: {$periodo}"),
        };
    }

    /**
     * Producción total y promedio kg/gajo de la plantación.
     * Solo cuenta cosechas activas de operaciones APROBADAS.
     */
    private function indicadoresProduccion(Carbon $desde, Carbon $hasta): array
    {
        $tenantId = app('current_tenant_id');

        $row = DB::table('registro_cosecha as rc')
            ->join('operaciones as o', 'rc.operacion_id', '=', 'o.id')
            ->where('rc.tenant_id', $tenantId)
            ->where('rc.estado', true)
            ->where('o.estado', Operacion::ESTADO_APROBADA)
            ->whereBetween('o.fecha', [$desde->toDateString(), $hasta->toDateString()])
            ->selectRaw('
                COALESCE(SUM(rc.peso_confirmado), 0) AS peso_total,
                COALESCE(SUM(COALESCE(rc.gajos_reconteo, rc.gajos_reportados)), 0) AS gajos_total
            ')
            ->first();

        $pesoTotal = (float) ($row->peso_total ?? 0);
        $gajosTotal = (int) ($row->gajos_total ?? 0);

        return [
            'produccion_total_kg' => round($pesoTotal, 2),
            'promedio_kg_gajo'    => $gajosTotal > 0 ? round($pesoTotal / $gajosTotal, 3) : 0.0,
        ];
    }

    /**
     * Lista todos los lotes activos del tenant con el kg promedio en el rango.
     * Lotes sin producción aprobada → kg_promedio = 0.
     */
    private function promedioPorLote(Carbon $desde, Carbon $hasta): Collection
    {
        $tenantId = app('current_tenant_id');

        $sub = DB::table('registro_cosecha as rc')
            ->join('operaciones as o', 'rc.operacion_id', '=', 'o.id')
            ->select(
                'rc.lote_id',
                DB::raw('SUM(rc.peso_confirmado) AS peso'),
                DB::raw('SUM(COALESCE(rc.gajos_reconteo, rc.gajos_reportados)) AS gajos')
            )
            ->where('rc.tenant_id', $tenantId)
            ->where('rc.estado', true)
            ->where('o.estado', Operacion::ESTADO_APROBADA)
            ->whereBetween('o.fecha', [$desde->toDateString(), $hasta->toDateString()])
            ->groupBy('rc.lote_id');

        return Lote::activos()
            ->leftJoinSub($sub, 'agg', 'agg.lote_id', '=', 'lotes.id')
            ->selectRaw("
                lotes.id,
                lotes.nombre,
                CONCAT('L-', LPAD(lotes.id::text, 3, '0')) AS codigo,
                COALESCE(ROUND(CASE WHEN COALESCE(agg.gajos, 0) > 0 THEN agg.peso / agg.gajos ELSE 0 END, 2), 0) AS kg_promedio
            ")
            ->orderBy('lotes.nombre')
            ->get()
            ->map(fn ($lote) => [
                'id'          => (int) $lote->id,
                'codigo'      => $lote->codigo,
                'nombre'      => $lote->nombre,
                'kg_promedio' => (float) $lote->kg_promedio,
            ]);
    }

    /**
     * Viajes con estado FINALIZADO dentro del rango.
     */
    private function viajesFinalizadosEnRango(Carbon $desde, Carbon $hasta): Collection
    {
        return Viaje::query()
            ->where('estado', ViajeEstado::FINALIZADO)
            ->whereBetween('fecha_viaje', [$desde->toDateString(), $hasta->toDateString()])
            ->orderBy('fecha_viaje')
            ->get(['id', 'remision', 'peso_viaje', 'fecha_viaje'])
            ->map(fn ($v) => [
                'id'          => (int) $v->id,
                'remision'    => $v->remision,
                'peso_viaje'  => (float) $v->peso_viaje,
                'fecha_viaje' => $v->fecha_viaje?->toDateString(),
            ]);
    }

    /**
     * Lluvias del tenant: semana actual, semana anterior, mes actual y
     * promedio mensual histórico (excluyendo el mes actual).
     * No depende del filtro de fechas.
     */
    private function lluvias(): array
    {
        $hoy = Carbon::now();
        $semIni    = $hoy->copy()->startOfWeek();
        $semFin    = $hoy->copy()->endOfWeek();
        $semAntIni = $semIni->copy()->subWeek();
        $semAntFin = $semFin->copy()->subWeek();
        $mesIni    = $hoy->copy()->startOfMonth();
        $mesFin    = $hoy->copy()->endOfMonth();

        $base = Operacion::query()->where('hubo_lluvia', true);

        $semanaActual   = (clone $base)->whereBetween('fecha', [$semIni->toDateString(), $semFin->toDateString()])->sum('cantidad_lluvia');
        $semanaAnterior = (clone $base)->whereBetween('fecha', [$semAntIni->toDateString(), $semAntFin->toDateString()])->sum('cantidad_lluvia');
        $mesActual      = (clone $base)->whereBetween('fecha', [$mesIni->toDateString(), $mesFin->toDateString()])->sum('cantidad_lluvia');

        $historico = DB::table('operaciones')
            ->where('tenant_id', app('current_tenant_id'))
            ->where('hubo_lluvia', true)
            ->whereRaw('NOT (EXTRACT(YEAR FROM fecha) = ? AND EXTRACT(MONTH FROM fecha) = ?)', [$hoy->year, $hoy->month])
            ->selectRaw('EXTRACT(YEAR FROM fecha) AS y, EXTRACT(MONTH FROM fecha) AS m, SUM(cantidad_lluvia) AS total')
            ->groupBy('y', 'm')
            ->pluck('total');

        return [
            'semana_actual_mm'              => round((float) $semanaActual, 2),
            'semana_anterior_mm'            => round((float) $semanaAnterior, 2),
            'mes_actual_mm'                 => round((float) $mesActual, 2),
            'promedio_mensual_historico_mm' => $historico->count() > 0 ? round((float) $historico->avg(), 2) : 0.0,
        ];
    }
}
