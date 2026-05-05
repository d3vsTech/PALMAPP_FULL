<?php

namespace App\Services;

use App\Models\RegistroCosecha;
use App\Models\Viaje;
use Illuminate\Support\Facades\DB;

class ViajeCalculationService
{
    /**
     * Al finalizar un viaje, recalcula promedio_kg_gajo de las cosechas enlazadas.
     *
     * - HOMOGENEO: promedio = peso_viaje / cantidad_gajos_total (mismo promedio para todos).
     * - NO_HOMOGENEO: cada sublote mantiene su promedio_lote histórico (no se toca).
     */
    public function calcularAlFinalizar(Viaje $viaje): void
    {
        if (! $viaje->es_homogeneo) {
            return;
        }

        if (! $viaje->peso_viaje || ! $viaje->cantidad_gajos_total || $viaje->cantidad_gajos_total <= 0) {
            return;
        }

        $promedio = round(((float) $viaje->peso_viaje) / $viaje->cantidad_gajos_total, 2);

        $cosechaIds = $viaje->detalles()->activos()->pluck('cosecha_id');

        if ($cosechaIds->isEmpty()) {
            return;
        }

        DB::table('registro_cosecha')
            ->whereIn('id', $cosechaIds)
            ->update(['promedio_kg_gajo' => $promedio]);
    }
}
