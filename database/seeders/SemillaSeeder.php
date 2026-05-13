<?php

namespace Database\Seeders;

use App\Models\Semilla;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class SemillaSeeder extends Seeder
{
    public function run(): void
    {
        $semillas = [
            // ── HÍBRIDO TENERA (principal en Colombia) ──────────────────────
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'ASD Costa Rica'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Nigeria (AVROS)'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Ghana'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'IRHO Compacta'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Coari x La Mé'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Palmaceite Colombia'],

            // ── HÍBRIDO INTERESPECÍFICO OxG ─────────────────────────────────
            // Elaeis oleifera × Elaeis guineensis — tolerante a Pudrición del cogollo
            ['tipo' => 'HIBRIDO_OXG',    'nombre' => 'OxG Cirad (Corpoica)'],
            ['tipo' => 'HIBRIDO_OXG',    'nombre' => 'OxG Indupalma'],
            ['tipo' => 'HIBRIDO_OXG',    'nombre' => 'OxG ASD'],

            // ── DURA ─────────────────────────────────────────────────────────
            ['tipo' => 'DURA',           'nombre' => 'Deli Dura'],
            ['tipo' => 'DURA',           'nombre' => 'Angola Dura'],

            // ── PISIFERA ─────────────────────────────────────────────────────
            ['tipo' => 'PISIFERA',       'nombre' => 'AVROS Pisifera'],
            ['tipo' => 'PISIFERA',       'nombre' => 'La Mé Pisifera'],
        ];

        $tenants = Tenant::where('estado', 'ACTIVO')->get();
        $total   = 0;

        foreach ($tenants as $tenant) {
            foreach ($semillas as $data) {
                Semilla::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'nombre' => $data['nombre']],
                    ['tipo' => $data['tipo'], 'estado' => true],
                );
                $total++;
            }
        }

        $this->command->info(" SemillaSeeder: {$total} semillas cargadas ({$tenants->count()} tenants)");
    }
}
