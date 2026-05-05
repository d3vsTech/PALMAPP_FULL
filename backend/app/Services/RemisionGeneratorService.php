<?php

namespace App\Services;

use App\Models\Viaje;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RemisionGeneratorService
{
    /**
     * Genera una remisión con formato REM-{YYYY}-{NNN} única por tenant+año.
     * Usa bloqueo pesimista para evitar colisiones bajo concurrencia.
     */
    public function generar(int $tenantId, Carbon $fecha): string
    {
        $anio = $fecha->year;
        $prefijo = "REM-{$anio}-";

        return DB::transaction(function () use ($tenantId, $anio, $prefijo) {
            $ultima = Viaje::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->where('remision', 'like', "{$prefijo}%")
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('remision');

            $siguiente = 1;
            if ($ultima) {
                $sufijo = substr($ultima, strlen($prefijo));
                $siguiente = ((int) $sufijo) + 1;
            }

            return $prefijo . str_pad((string) $siguiente, 3, '0', STR_PAD_LEFT);
        });
    }
}
