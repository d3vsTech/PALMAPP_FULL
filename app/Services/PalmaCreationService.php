<?php

namespace App\Services;

use App\Jobs\CrearPalmasJob;
use App\Jobs\EliminarPalmasJob;
use App\Models\Linea;
use App\Models\Palma;
use App\Models\Sublote;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;

class PalmaCreationService
{
    public const SYNC_THRESHOLD = 5_000;
    public const CHUNK_SIZE     = 2_000;

    /**
     * Camino sincrono: inserta palmas en chunks y actualiza contadores.
     * Los contadores se actualizan FUERA de la transaccion de insercion
     * para no mantener locks innecesarios durante el COUNT.
     */
    public function createSync(Sublote $sublote, int $cantidad, ?int $lineaId = null): void
    {
        $maxContador = $this->getMaxContador($sublote->id);
        $this->insertChunkedStreamed($sublote, $cantidad, $lineaId, $maxContador);
        $this->updateCounters($sublote->id, $lineaId);
    }

    /**
     * Camino asincrono: despacha un Job en Bus::batch para tracking.
     */
    public function createAsync(
        Sublote $sublote,
        int $cantidad,
        ?int $lineaId,
        int $tenantId,
        int $userId,
    ): string {
        $batch = Bus::batch([
            new CrearPalmasJob(
                tenantId:  $tenantId,
                subloteId: $sublote->id,
                lineaId:   $lineaId,
                cantidad:  $cantidad,
                userId:    $userId,
            ),
        ])
            ->name("crear-palmas-sublote-{$sublote->id}")
            ->dispatch();

        return $batch->id;
    }

    /**
     * Camino sincrono de eliminacion: borra las ultimas $cantidad palmas en chunks.
     * Usa ORDER BY id DESC (numerico) en lugar de codigo DESC (string) para evitar
     * orden incorrecto cuando los codigos superan 3 digitos ("099" > "1000" en string).
     */
    public function deleteSync(Sublote $sublote, int $cantidad): void
    {
        $remaining       = $cantidad;
        $lineasAfectadas = collect();

        while ($remaining > 0) {
            $chunk = min($remaining, self::CHUNK_SIZE);

            $palmasInfo = DB::table('palmas')
                ->where('sublote_id', $sublote->id)
                ->orderByDesc('id')
                ->limit($chunk)
                ->get(['id', 'linea_id']);

            if ($palmasInfo->isEmpty()) break;

            $lineasAfectadas = $lineasAfectadas
                ->merge($palmasInfo->pluck('linea_id')->filter())
                ->unique();

            Palma::whereIn('id', $palmasInfo->pluck('id'))->delete();
            $remaining -= $palmasInfo->count();
        }

        $this->updateCounters($sublote->id, null, $lineasAfectadas->all());
    }

    /**
     * Camino asincrono de eliminacion: despacha EliminarPalmasJob en Bus::batch.
     */
    public function deleteAsync(
        Sublote $sublote,
        int $cantidad,
        int $tenantId,
        int $userId,
    ): string {
        $batch = Bus::batch([
            new EliminarPalmasJob(
                tenantId:  $tenantId,
                subloteId: $sublote->id,
                cantidad:  $cantidad,
            ),
        ])
            ->name("eliminar-palmas-sublote-{$sublote->id}")
            ->dispatch();

        return $batch->id;
    }

    /**
     * Obtiene el maximo contador existente para el sublote.
     * Usa ORDER BY id DESC para aprovechar el indice (sublote_id, id) en lugar de
     * un full-scan con regex MAX(SUBSTRING(...)).
     */
    public function getMaxContador(int $subloteId): int
    {
        $lastCodigo = DB::table('palmas')
            ->where('sublote_id', $subloteId)
            ->orderByDesc('id')
            ->value('codigo');

        if (!$lastCodigo) return 0;

        // Extrae el numero tras el ultimo '-': "Sublote A1-125" → 125
        return (int) substr(strrchr($lastCodigo, '-'), 1);
    }

    /**
     * Inserta palmas construyendo y enviando cada chunk de forma independiente
     * para evitar acumular el array completo en memoria antes del primer INSERT.
     */
    private function insertChunkedStreamed(
        Sublote $sublote,
        int $cantidad,
        ?int $lineaId,
        int $startContador,
    ): void {
        $now      = now();
        $tenantId = $sublote->tenant_id;
        $nombre   = $sublote->nombre;
        $remaining = $cantidad;

        while ($remaining > 0) {
            $chunk  = min($remaining, self::CHUNK_SIZE);
            $palmas = [];

            for ($i = 0; $i < $chunk; $i++) {
                $startContador++;
                $palmas[] = [
                    'tenant_id'   => $tenantId,
                    'sublote_id'  => $sublote->id,
                    'linea_id'    => $lineaId,
                    'codigo'      => $nombre . '-' . str_pad($startContador, 3, '0', STR_PAD_LEFT),
                    'descripcion' => null,
                    'estado'      => true,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];
            }

            Palma::insert($palmas);
            $remaining -= $chunk;
        }
    }

    /**
     * Actualiza contadores de sublote y lineas usando SQL raw (sin COUNT via Eloquent
     * para evitar problema de scope de tenant dentro de jobs async).
     * Se llama FUERA de la transaccion de insercion para no bloquear la BD
     * durante la query de conteo.
     *
     * @param int        $subloteId
     * @param int|null   $lineaId         Linea afectada en creacion (una sola)
     * @param int[]      $lineasAfectadas Lineas afectadas en eliminacion (multiples)
     */
    public function updateCounters(int $subloteId, ?int $lineaId, array $lineasAfectadas = []): void
    {
        DB::table('sublotes')
            ->where('id', $subloteId)
            ->update([
                'cantidad_palmas' => DB::raw('(SELECT COUNT(*) FROM palmas WHERE sublote_id = ' . $subloteId . ')'),
                'updated_at'      => now(),
            ]);

        $todasLineas = array_filter(array_unique(array_merge(
            $lineaId ? [$lineaId] : [],
            $lineasAfectadas,
        )));

        foreach ($todasLineas as $lid) {
            DB::table('lineas')
                ->where('id', $lid)
                ->update([
                    'cantidad_palmas' => DB::raw('(SELECT COUNT(*) FROM palmas WHERE linea_id = ' . (int) $lid . ')'),
                    'updated_at'      => now(),
                ]);
        }
    }
}
