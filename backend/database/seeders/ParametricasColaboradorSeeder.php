<?php

namespace Database\Seeders;

use App\Models\Arl;
use App\Models\EntidadBancaria;
use App\Models\Eps;
use App\Models\FondoPension;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Sembra los catálogos paramétricos del colaborador (EPS, fondos de pensión,
 * ARL y entidades bancarias) para cada tenant ACTIVO.
 *
 * Idempotente: usa updateOrCreate sobre (tenant_id, nombre).
 */
class ParametricasColaboradorSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        $catalogos = [
            [Eps::class,             Eps::INICIALES],
            [FondoPension::class,    FondoPension::INICIALES],
            [Arl::class,             Arl::INICIALES],
            [EntidadBancaria::class, EntidadBancaria::INICIALES],
        ];

        $totalRegistros = 0;
        foreach ($tenants as $tenant) {
            foreach ($catalogos as [$modelClass, $nombres]) {
                foreach ($nombres as $nombre) {
                    $modelClass::updateOrCreate(
                        ['tenant_id' => $tenant->id, 'nombre' => $nombre],
                        ['estado' => true],
                    );
                    $totalRegistros++;
                }
            }
        }

        $this->command->info(" ✓ ParametricasColaboradorSeeder: {$totalRegistros} registros × {$tenants->count()} tenants");
    }
}
