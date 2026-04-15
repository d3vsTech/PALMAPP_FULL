<?php

namespace App\Services;

use App\Jobs\CrearPalmasJob;
use App\Models\Linea;
use App\Models\Palma;
use App\Models\Sublote;
use Illuminate\Support\Facades\Bus;

class PalmaCreationService
{
    public const SYNC_THRESHOLD = 5_000;
    public const CHUNK_SIZE     = 1_000;

    /**
     * Camino sincrono: inserta palmas en chunks dentro de la transaccion actual.
     */
    public function createSync(Sublote $sublote, int $cantidad, ?int $lineaId = null): void
    {
        $maxContador = $this->getMaxContador($sublote->id);
        $palmas = $this->buildRecords($sublote, $cantidad, $lineaId, $maxContador);
        $this->insertChunked($palmas);
        $this->updateCounters($sublote, $lineaId);
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

    public function getMaxContador(int $subloteId): int
    {
        return (int) Palma::where('sublote_id', $subloteId)
            ->selectRaw("MAX(CAST(SUBSTRING(codigo FROM '-([0-9]+)$') AS INTEGER)) as max_num")
            ->value('max_num');
    }

    private function buildRecords(Sublote $sublote, int $cantidad, ?int $lineaId, int $startContador): array
    {
        $palmas   = [];
        $now      = now();
        $tenantId = $sublote->tenant_id;

        for ($i = 1; $i <= $cantidad; $i++) {
            $startContador++;
            $palmas[] = [
                'tenant_id'   => $tenantId,
                'sublote_id'  => $sublote->id,
                'linea_id'    => $lineaId,
                'codigo'      => $sublote->nombre . '-' . str_pad($startContador, 3, '0', STR_PAD_LEFT),
                'descripcion' => null,
                'estado'      => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
        }

        return $palmas;
    }

    private function insertChunked(array $palmas): void
    {
        foreach (array_chunk($palmas, self::CHUNK_SIZE) as $chunk) {
            Palma::insert($chunk);
        }
    }

    private function updateCounters(Sublote $sublote, ?int $lineaId): void
    {
        $sublote->update(['cantidad_palmas' => $sublote->palmas()->count()]);

        if ($lineaId) {
            Linea::where('id', $lineaId)->update([
                'cantidad_palmas' => Palma::where('linea_id', $lineaId)->count(),
            ]);
        }
    }
}
