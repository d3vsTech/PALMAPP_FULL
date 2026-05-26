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
            // ── GRUPO 1 — Ténera DxP (Elaeis guineensis) ────────────────────
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x La Mé'],           // CIRAD / PalmElit (Francia)
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Yangambi'],        // CIRAD / PalmElit (Francia)
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x AVROS'],           // ASD Costa Rica
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Nigeria (NIFOR)'], // MPOB Malasia / ASD
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Ghana (Calabar)'], // ASD Costa Rica
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Ekona'],           // ASD Costa Rica
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'DxP Unipalma'],           // Unipalma S.A. (Colombia)
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'DxP Indupalma'],          // Indupalma Ltda. (Colombia)

            // ── GRUPO 2 — Híbridos OxG con registro ICA ─────────────────────
            // Elaeis oleifera × Elaeis guineensis — tolerante a Pudrición del cogollo
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG AGROSAVIA El Mira (F1)'],        // AGROSAVIA (Colombia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Pacífico RC1'],                  // AGROSAVIA (Colombia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Tumaco RC1'],                    // AGROSAVIA (Colombia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Amazon'],                        // ASD Costa Rica / Rebiotec
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Compacta x Ghana'],              // ASD Costa Rica
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Semillas Unipalma'],             // Unipalma S.A. (Colombia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Indupalma'],                     // Indupalma Ltda. (Colombia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Taisha'],                        // Red Gold Seeds / Disingtec
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG PDR-Taisha'],                    // Negcorpbis / Disingtec
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Coarí x La Mé'],                // PalmElit / CIRAD (Francia)
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Colombia (Coarí x La Mé)'],     // Promotora Herrera Vargas / CIRAD
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Guineensis RI'],                 // PalmElit / CIRAD (Francia)
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
