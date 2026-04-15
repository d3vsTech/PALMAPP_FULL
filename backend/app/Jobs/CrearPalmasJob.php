<?php

namespace App\Jobs;

use App\Models\Sublote;
use App\Services\PalmaCreationService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class CrearPalmasJob implements ShouldQueue, ShouldBeUnique
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
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

        DB::transaction(function () use ($service) {
            $sublote = Sublote::withoutTenant()->findOrFail($this->subloteId);
            $service->createSync($sublote, $this->cantidad, $this->lineaId);
        });
    }
}
