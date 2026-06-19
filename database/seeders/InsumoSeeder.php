<?php

namespace Database\Seeders;

use App\Models\Insumo;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Catálogo base de ~59 fertilizantes usados en palma de aceite (mercado
 * colombiano y regional, últimos 10 años).
 *
 * Provisiona la tabla `insumos` para cada tenant. Idempotente: usa
 * updateOrCreate sobre (tenant_id, nombre) — coincide con el índice
 * único `insumos_tenant_id_nombre_unique`.
 *
 * Fuente: `Fertilizantes_Palma_Aceite.xlsx` (categoría nutricional,
 * nombre comercial y presentación).
 */
class InsumoSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        $total = 0;
        foreach ($tenants as $tenant) {
            $total += $this->sembrarParaTenant($tenant);
        }

        $this->command->info(' ✓ InsumoSeeder: ' . count($this->insumosBase()) . ' insumos × ' . $tenants->count() . " tenants ({$total} upserts)");
    }

    public function sembrarParaTenant(Tenant $tenant): int
    {
        $insumos = $this->insumosBase();

        foreach ($insumos as $insumo) {
            Insumo::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'nombre'    => $insumo['nombre'],
                ],
                [
                    'unidad_medida' => $insumo['unidad_medida'],
                    'estado'        => true,
                ],
            );
        }

        return count($insumos);
    }

    private function insumosBase(): array
    {
        return [
            // ── Nitrógeno (N) ───────────────────────────────────────────
            ['nombre' => 'Urea granulada',                       'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Sulfato de amonio',                    'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Nitrabor',                             'unidad_medida' => 'Gránulo'],
            ['nombre' => 'YaraBela Nitromag',                    'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Agrotain Ultra',                       'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Nitroxtend',                           'unidad_medida' => 'Gránulo'],
            ['nombre' => 'ESN (liberación controlada)',          'unidad_medida' => 'Cápsula'],
            ['nombre' => 'Nitrofoska',                           'unidad_medida' => 'Gránulo'],

            // ── Fósforo (P) ─────────────────────────────────────────────
            ['nombre' => 'DAP',                                  'unidad_medida' => 'Gránulo'],
            ['nombre' => 'MAP',                                  'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Superfosfato triple (TSP)',            'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Superfosfato simple (SSP)',            'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Roca fosfórica Huila',                 'unidad_medida' => 'Polvo / granulado'],
            ['nombre' => 'Fosfato de Bayóvar',                   'unidad_medida' => 'Gránulo'],

            // ── Potasio (K) ─────────────────────────────────────────────
            ['nombre' => 'KCl / Cloruro de potasio',             'unidad_medida' => 'Gránulo / polvo'],
            ['nombre' => 'Sulfato de potasio (SOP)',             'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Polysulphate',                         'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Sulpomag / SOPM',                      'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Krista-K',                             'unidad_medida' => 'Gránulo / soluble'],
            ['nombre' => 'Muriato de potasio estándar',          'unidad_medida' => 'Gránulo rojo/blanco'],

            // ── Magnesio (Mg) ───────────────────────────────────────────
            ['nombre' => 'Kieserita',                            'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Dolomita',                             'unidad_medida' => 'Polvo / granulado'],
            ['nombre' => 'Sulfato de magnesio heptahidratado',   'unidad_medida' => 'Polvo soluble'],
            ['nombre' => 'Magnesamon',                           'unidad_medida' => 'Gránulo'],
            ['nombre' => 'YaraBela Sulfan',                      'unidad_medida' => 'Líquido'],

            // ── Calcio (Ca) y pH ────────────────────────────────────────
            ['nombre' => 'Cal dolomítica',                       'unidad_medida' => 'Polvo'],
            ['nombre' => 'Cal agrícola / Calcita',               'unidad_medida' => 'Polvo'],
            ['nombre' => 'Yeso agrícola',                        'unidad_medida' => 'Polvo / gránulo'],
            ['nombre' => 'YaraLiva Calcinit',                    'unidad_medida' => 'Gránulo / soluble'],
            ['nombre' => 'Lithothamne',                          'unidad_medida' => 'Polvo'],

            // ── Azufre (S) ──────────────────────────────────────────────
            ['nombre' => 'Azufre elemental 90%',                 'unidad_medida' => 'Gránulo / polvo'],
            ['nombre' => 'Tiger-Sul 90S',                        'unidad_medida' => 'Gránulo dispersable'],
            ['nombre' => 'Azufrimag / Thioplex',                 'unidad_medida' => 'Gránulo'],

            // ── Boro (B) ────────────────────────────────────────────────
            ['nombre' => 'Solubor',                              'unidad_medida' => 'Polvo soluble'],
            ['nombre' => 'Fertibor',                             'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Granubor',                             'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Ácido bórico técnico',                 'unidad_medida' => 'Polvo / cristales'],
            ['nombre' => 'Borocol / Borocalcio foliar',          'unidad_medida' => 'Líquido'],

            // ── Micronutrientes y Quelatos ──────────────────────────────
            ['nombre' => 'Ferrilene',                            'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Chelal Fe',                            'unidad_medida' => 'Líquido'],
            ['nombre' => 'Nutrel Zn',                            'unidad_medida' => 'Gránulo / polvo'],
            ['nombre' => 'Zincufol',                             'unidad_medida' => 'Líquido'],
            ['nombre' => 'Sulfato de manganeso',                 'unidad_medida' => 'Polvo'],
            ['nombre' => 'Molibdato de amonio',                  'unidad_medida' => 'Polvo soluble'],
            ['nombre' => 'Cobre EDTA',                           'unidad_medida' => 'Líquido'],
            ['nombre' => 'Kelik Potasio',                        'unidad_medida' => 'Líquido'],

            // ── Compuestos NPK ──────────────────────────────────────────
            ['nombre' => 'YaraMila Complex',                     'unidad_medida' => 'Gránulo'],
            ['nombre' => 'YaraMila Actyva',                      'unidad_medida' => 'Gránulo'],
            ['nombre' => 'NPK 15-15-15',                         'unidad_medida' => 'Gránulo'],
            ['nombre' => 'NPK 17-6-18 + Mg',                     'unidad_medida' => 'Gránulo'],
            ['nombre' => 'PalmKing / Palm Special',              'unidad_medida' => 'Gránulo'],
            ['nombre' => 'Basacote Plus',                        'unidad_medida' => 'Cápsula'],
            ['nombre' => 'Haifa Multi-K',                        'unidad_medida' => 'Soluble / gránulo'],

            // ── Enmiendas Orgánicas ─────────────────────────────────────
            ['nombre' => 'Efluentes POME tratados',              'unidad_medida' => 'Líquido / semisólido'],
            ['nombre' => 'Compost de raquis de palma',           'unidad_medida' => 'Sólido'],
            ['nombre' => 'Gallinaza compostada',                 'unidad_medida' => 'Sólido'],
            ['nombre' => 'Vinaza de caña',                       'unidad_medida' => 'Líquido'],
            ['nombre' => 'Humus de lombriz / vermicompost',      'unidad_medida' => 'Sólido / líquido'],
            ['nombre' => 'Cachaza de caña',                      'unidad_medida' => 'Sólido húmedo'],
        ];
    }
}
