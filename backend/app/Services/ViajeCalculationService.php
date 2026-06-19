<?php

namespace App\Services;

use App\Models\PromedioLote;
use App\Models\RegistroCosecha;
use App\Models\Viaje;
use Illuminate\Support\Facades\DB;

class ViajeCalculationService
{
    /**
     * Al finalizar un viaje, registra el promedio kg/gajo por lote.
     *
     * - HOMOGENEO: promedio = peso_viaje / gajos_efectivos_totales.
     *   Crea un registro en PromedioLote (historial para nómina) y actualiza
     *   registro_cosecha.promedio_kg_gajo (snapshot visual operativo).
     *   Los gajos efectivos son gajos_reconteo si existe, si no gajos_reportados.
     *
     * - NO_HOMOGENEO: no se crea PromedioLote ni se modifica nada.
     */
    public function calcularAlFinalizar(Viaje $viaje): void
    {
        if (! $viaje->es_homogeneo) {
            return;
        }

        if (! $viaje->peso_viaje || (float) $viaje->peso_viaje <= 0) {
            return;
        }

        $detalles = $viaje->detalles()
            ->activos()
            ->with('cosecha:id,lote_id,gajos_reportados,gajos_reconteo')
            ->get();

        if ($detalles->isEmpty()) {
            return;
        }

        // Agrupar por lote para soportar el caso de que el viaje (marcado homogéneo
        // por el usuario) tenga cosechas de más de un lote —aunque esto no debería
        // ocurrir gracias a la validación en addDetalle().
        $porLote = $detalles->groupBy(fn($d) => $d->cosecha->lote_id);

        foreach ($porLote as $loteId => $detalleslote) {
            $totalGajos = $detalleslote->sum(
                fn($d) => $d->cosecha->gajos_reconteo ?? $d->cosecha->gajos_reportados
            );

            if ($totalGajos <= 0) {
                continue;
            }

            $promedio = round(((float) $viaje->peso_viaje) / $totalGajos, 2);

            // Crear registro histórico de promedio para la nómina.
            PromedioLote::create([
                'tenant_id' => $viaje->tenant_id,
                'lote_id'   => $loteId,
                'viaje_id'  => $viaje->id,
                'promedio'  => $promedio,
                'fecha'     => $viaje->fecha_viaje,
                'anio'      => $viaje->fecha_viaje->year,
            ]);

            // Actualizar snapshot visual en registro_cosecha (para vistas operativas).
            $cosechaIds = $detalleslote->pluck('cosecha_id');
            DB::table('registro_cosecha')
                ->whereIn('id', $cosechaIds)
                ->update(['promedio_kg_gajo' => $promedio]);
        }
    }
}
