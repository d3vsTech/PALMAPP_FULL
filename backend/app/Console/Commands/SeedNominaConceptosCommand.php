<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Database\Seeders\NominaConceptoSeeder;
use Illuminate\Console\Command;

class SeedNominaConceptosCommand extends Command
{
    protected $signature = 'nomina:seed-conceptos
                            {--tenant= : ID de un tenant específico (omitir = todos los activos)}
                            {--solo-activos : Sembrar solo conceptos legales obligatorios (sin plantilla)}';

    protected $description = 'Siembra (o actualiza) el catálogo de conceptos de nómina para uno o todos los tenants activos. Idempotente.';

    public function handle(): int
    {
        $soloActivos = (bool) $this->option('solo-activos');
        $tenantId    = $this->option('tenant');

        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->where('estado', 'ACTIVO')->get()
            : Tenant::where('estado', 'ACTIVO')->get();

        if ($tenants->isEmpty()) {
            $this->warn('No se encontraron tenants activos.');
            return self::SUCCESS;
        }

        $seeder = new NominaConceptoSeeder();
        $bar    = $this->output->createProgressBar($tenants->count());
        $bar->start();

        foreach ($tenants as $tenant) {
            $seeder->sembrarParaTenant($tenant, $soloActivos);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Conceptos sembrados para {$tenants->count()} tenant(s).");

        return self::SUCCESS;
    }
}
