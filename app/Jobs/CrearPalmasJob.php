<?php

namespace App\Jobs;

use App\Models\Sublote;
use App\Services\PalmaCreationService;
use App\Support\WizardCache;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CrearPalmasJob implements ShouldQueue, ShouldBeUnique
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        public int  $tenantId,
        public int  $subloteId,
        public ?int $lineaId,
        public int  $cantidad,
        public int  $userId,
    ) {}

    public function uniqueId(): string
    {
        return "crear-palmas-{$this->subloteId}";
    }

    public function handle(PalmaCreationService $service): void
    {
        app()->instance('current_tenant_id', $this->tenantId);

        $sublote = Sublote::withoutTenant()->findOrFail($this->subloteId);
        // createSync: inserta chunk a chunk (sin transaccion global) y
        // llama updateCounters al final fuera de cualquier lock de insercion.
        $service->createSync($sublote, $this->cantidad, $this->lineaId);

        WizardCache::forgetPrediosResumenes($this->tenantId);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('CrearPalmasJob falló', [
            'sublote_id' => $this->subloteId,
            'linea_id'   => $this->lineaId,
            'cantidad'   => $this->cantidad,
            'tenant_id'  => $this->tenantId,
            'error'      => $exception->getMessage(),
        ]);
    }
}
