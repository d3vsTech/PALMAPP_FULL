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

class EliminarPalmasJob implements ShouldQueue, ShouldBeUnique
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        public int $tenantId,
        public int $subloteId,
        public int $cantidad,
    ) {}

    public function uniqueId(): string
    {
        return "eliminar-palmas-{$this->subloteId}";
    }

    public function handle(PalmaCreationService $service): void
    {
        app()->instance('current_tenant_id', $this->tenantId);

        $sublote = Sublote::withoutTenant()->findOrFail($this->subloteId);
        // deleteSync: elimina chunk a chunk y llama updateCounters al final.
        $service->deleteSync($sublote, $this->cantidad);

        WizardCache::forgetPrediosResumenes($this->tenantId);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('EliminarPalmasJob falló', [
            'sublote_id' => $this->subloteId,
            'cantidad'   => $this->cantidad,
            'tenant_id'  => $this->tenantId,
            'error'      => $exception->getMessage(),
        ]);
    }
}
