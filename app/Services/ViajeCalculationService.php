<?php

namespace App\Services;

use App\Models\PromedioLote;
use App\Models\RegistroCosecha;
use App\Models\Viaje;
use App\Models\ViajeDetalle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ViajeCalculationService
{
    /**
     * Al finalizar un viaje, calcula promedios kg/gajo por lote e hidrata
     * cosecha_cuadrilla.peso_calculado_empleado para todos los miembros activos.
     *
     * HOMOGENEO (≤ 1 lote distinto en el viaje):
     *   promedio = peso_viaje / total_gajos_efectivos_del_lote.
     *   Crea PromedioLote (historial para nómina) y actualiza registro_cosecha.promedio_kg_gajo.
     *
     * NO_HOMOGENEO (2+ lotes distintos):
     *   No hay un promedio global del viaje. Se usa PromedioLote del lote/año como fuente
     *   (admin-baseline primero, luego el más reciente de cualquier viaje).
     *   No se crean PromedioLote ni se toca promedio_kg_gajo.
     *
     * En ambos casos se hidrata cosecha_cuadrilla.peso_calculado_empleado acumulando
     * sobre el valor existente (COALESCE + suma) para soportar cosechas partidas (splits).
     * Si la cosecha tiene peso_confirmado directo, se omite la hidratación.
     */
    public function calcularAlFinalizar(Viaje $viaje): void
    {
        $detalles = $viaje->detalles()
            ->activos()
            ->with('cosecha:id,lote_id,gajos_reportados,gajos_reconteo,peso_confirmado')
            ->get();

        if ($detalles->isEmpty()) {
            return;
        }

        if ($viaje->es_homogeneo && $viaje->peso_viaje && (float) $viaje->peso_viaje > 0) {
            $this->procesarHomogeneo($viaje, $detalles);
        } else {
            $this->procesarNoHomogeneo($viaje, $detalles);
        }
    }

    private function procesarHomogeneo(Viaje $viaje, Collection $detalles): void
    {
        $porLote = $detalles->groupBy(fn($d) => $d->cosecha->lote_id);

        foreach ($porLote as $loteId => $detalleslote) {
            $totalGajos = $detalleslote->sum(fn($d) => $this->gajosEfectivosDetalle($d));

            if ($totalGajos <= 0) {
                continue;
            }

            $promedio = round(((float) $viaje->peso_viaje) / $totalGajos, 2);

            PromedioLote::create([
                'tenant_id' => $viaje->tenant_id,
                'lote_id'   => $loteId,
                'viaje_id'  => $viaje->id,
                'promedio'  => $promedio,
                'fecha'     => $viaje->fecha_viaje,
                'anio'      => $viaje->fecha_viaje->year,
            ]);

            $cosechaIds = $detalleslote->pluck('cosecha_id');
            DB::table('registro_cosecha')
                ->whereIn('id', $cosechaIds)
                ->update(['promedio_kg_gajo' => $promedio]);

            foreach ($detalleslote as $detalle) {
                $this->hidratarPesoCuadrilla(
                    $detalle->cosecha,
                    $promedio,
                    $this->gajosEfectivosDetalle($detalle),
                );
            }
        }
    }

    private function procesarNoHomogeneo(Viaje $viaje, Collection $detalles): void
    {
        $anio = $viaje->fecha_viaje->year;

        foreach ($detalles as $detalle) {
            $cosecha = $detalle->cosecha;

            $promedio = PromedioLote::where('tenant_id', $viaje->tenant_id)
                ->where('lote_id', $cosecha->lote_id)
                ->where('anio', $anio)
                ->orderByRaw('CASE WHEN viaje_id IS NULL THEN 0 ELSE 1 END')
                ->orderByDesc('created_at')
                ->value('promedio');

            if (! $promedio) {
                continue;
            }

            $this->hidratarPesoCuadrilla(
                $cosecha,
                (float) $promedio,
                $this->gajosEfectivosDetalle($detalle),
            );
        }
    }

    /**
     * Devuelve los gajos efectivos para este viaje específico.
     * Para cosechas partidas (split): usa gajos_en_viaje del detalle.
     * Fallback a gajos_reconteo o gajos_reportados de la cosecha (modo legacy).
     */
    private function gajosEfectivosDetalle(ViajeDetalle $detalle): int
    {
        return (int) (
            $detalle->gajos_en_viaje
            ?? $detalle->cosecha->gajos_reconteo
            ?? $detalle->cosecha->gajos_reportados
            ?? 0
        );
    }

    /**
     * Acumula peso_calculado_empleado en los miembros activos de la cuadrilla.
     *
     * Usa COALESCE + suma para soportar cosechas partidas (splits):
     *   - Primer viaje del split:  COALESCE(null, 0) + X  = X
     *   - Segundo viaje del split: COALESCE(X1, 0)  + X2 = X1 + X2
     *
     * Si la cosecha tiene peso_confirmado (confirmado directamente en operaciones),
     * se omite para no sobreescribir ese valor con estimados.
     */
    private function hidratarPesoCuadrilla(RegistroCosecha $cosecha, float $promedio, int $gajosEfectivos): void
    {
        if ($cosecha->peso_confirmado !== null) {
            return;
        }

        if ($gajosEfectivos <= 0) {
            return;
        }

        $N = DB::table('cosecha_cuadrilla')
            ->where('cosecha_id', $cosecha->id)
            ->where('estado', true)
            ->count();

        if ($N <= 0) {
            return;
        }

        $pesoPersona = round(floor($gajosEfectivos / $N) * $promedio, 2);

        DB::table('cosecha_cuadrilla')
            ->where('cosecha_id', $cosecha->id)
            ->where('estado', true)
            ->update([
                'peso_calculado_empleado' => DB::raw("COALESCE(peso_calculado_empleado, 0) + {$pesoPersona}"),
            ]);
    }
}
