<?php

namespace Database\Seeders;

use App\Models\Insumo;
use App\Models\Labor;
use App\Models\Lote;
use App\Models\PrecioAbono;
use App\Models\PrecioCosecha;
use App\Models\PrecioPalma;
use App\Models\Predio;
use App\Models\PromedioLote;
use App\Models\Sublote;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Datos demo para poder probar el wizard de Operaciones (Planilla del Día).
 * Crea insumos, precios, labores de finca y estructura de plantación básica
 * para el tenant "Finca La Esperanza".
 *
 * Idempotente: usa firstOrCreate / updateOrCreate.
 * NO siembra empleados — se esperan vía flujo normal de colaboradores.
 */
class DemoOperacionSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('nombre', 'Finca La Esperanza')->first();

        if (!$tenant) {
            $this->command->warn('DemoOperacionSeeder: tenant demo no existe, skip.');
            return;
        }

        app()->instance('current_tenant_id', $tenant->id);

        $this->seedInsumos($tenant->id);
        $this->seedPreciosAbono($tenant->id);
        $this->seedPreciosPalma($tenant->id);
        $this->seedLaboresFinca($tenant->id);
        $this->seedPlantacion($tenant->id);

        $this->command->info(' DemoOperacionSeeder: datos demo cargados para tenant ' . $tenant->nombre);
    }

    private function seedInsumos(int $tenantId): void
    {
        $insumos = [
            ['nombre' => 'Urea',                'unidad_medida' => 'Kilogramos'],
            ['nombre' => 'DAP',                 'unidad_medida' => 'Kilogramos'],
            ['nombre' => 'Cloruro de Potasio',  'unidad_medida' => 'Kilogramos'],
        ];

        foreach ($insumos as $data) {
            Insumo::firstOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $data['nombre']],
                ['unidad_medida' => $data['unidad_medida'], 'estado' => true],
            );
        }
    }

    private function seedPreciosAbono(int $tenantId): void
    {
        // Precios por rango de gramos/palma para jornales de FERTILIZACION.
        // Fórmula: valor_total = cantidad_palmas × precio_palma_del_rango
        // Ejemplo: 500 palmas a 200 g/palma → rango 151-250 → 500 × $2.500 = $1.250.000
        $rangos = [
            ['gramos_min' => 0,   'gramos_max' => 150, 'precio_palma' => 2000.00],
            ['gramos_min' => 151, 'gramos_max' => 250, 'precio_palma' => 2500.00],
            ['gramos_min' => 251, 'gramos_max' => 500, 'precio_palma' => 3000.00],
        ];

        foreach ($rangos as $rango) {
            PrecioAbono::updateOrCreate(
                [
                    'tenant_id'   => $tenantId,
                    'gramos_min'  => $rango['gramos_min'],
                    'gramos_max'  => $rango['gramos_max'],
                ],
                [
                    'precio_palma' => $rango['precio_palma'],
                    'estado'       => true,
                ],
            );
        }
    }

    private function seedPreciosPalma(int $tenantId): void
    {
        // Precio unitario por palma para jornales de tipo PALMA.
        // PLATEO y PODA: valor_total = cantidad_palmas × precio_palma
        // SANIDAD y OTROS: precio_palma es un valor plano (no se multiplica por cantidad).
        //   Si es null, la tarifa queda sin definir y el jornal no calculará valor_total.
        $precios = [
            ['tipo' => PrecioPalma::TIPO_PLATEO,  'precio_palma' => 50.00],
            ['tipo' => PrecioPalma::TIPO_PODA,    'precio_palma' => 80.00],
            ['tipo' => PrecioPalma::TIPO_SANIDAD, 'precio_palma' => null],
            ['tipo' => PrecioPalma::TIPO_OTROS,   'precio_palma' => null],
        ];

        foreach ($precios as $p) {
            PrecioPalma::updateOrCreate(
                ['tenant_id' => $tenantId, 'tipo' => $p['tipo']],
                ['precio_palma' => $p['precio_palma'], 'estado' => true],
            );
        }
    }

    private function seedLaboresFinca(int $tenantId): void
    {
        // Labores de finca con tarifa diaria fija (categoría FINCA).
        // Fórmula: valor_total = valor_base (sin cantidad ni palmas, tarifa plana por jornal).
        $labores = [
            ['nombre' => 'Reparación de portón',   'valor_base' => 45000.00],
            ['nombre' => 'Mantenimiento general',  'valor_base' => 30000.00],
            ['nombre' => 'Transporte interno',     'valor_base' => 50000.00],
        ];

        foreach ($labores as $l) {
            Labor::updateOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $l['nombre']],
                ['valor_base' => $l['valor_base'], 'estado' => true],
            );
        }
    }

    private function seedPlantacion(int $tenantId): void
    {
        // Crea el Predio físico "Predio Principal" con sus Lotes y Sublotes.
        // Este es el único Predio demo asociado al tenant "Finca La Esperanza".
        if (Predio::where('tenant_id', $tenantId)->exists()) {
            return;
        }

        $predio = Predio::create([
            'tenant_id'         => $tenantId,
            'nombre'            => 'Predio Principal',
            'ubicacion'         => 'Vereda El Porvenir',
            'hectareas_totales' => 50.00,
            'estado'            => true,
        ]);

        $lotes = [
            ['nombre' => 'Lote 1', 'hectareas_sembradas' => 20.00],
            ['nombre' => 'Lote 2', 'hectareas_sembradas' => 30.00],
        ];

        $anio = (int) now()->format('Y');

        foreach ($lotes as $idx => $loteData) {
            $lote = Lote::create([
                'tenant_id'           => $tenantId,
                'predio_id'           => $predio->id,
                'nombre'              => $loteData['nombre'],
                'fecha_siembra'       => now()->subYears(5)->toDateString(),
                'hectareas_sembradas' => $loteData['hectareas_sembradas'],
                'estado'              => true,
            ]);

            foreach (range(1, 2) as $s) {
                Sublote::create([
                    'tenant_id'       => $tenantId,
                    'lote_id'         => $lote->id,
                    'nombre'          => "{$loteData['nombre']}.{$s}",
                    // Metadata de capacidad del sublote. NO entra en el cálculo del jornal;
                    // el jornal usa la cantidad que el operario ingresa en la planilla.
                    'cantidad_palmas' => 0,
                    'estado'          => true,
                ]);
            }

            // PromedioLote y PrecioCosecha NO afectan jornales regulares (PLATEO, PODA, etc.).
            // Solo los usa CosechaCalculationService:
            //   valor_total_cosecha = peso_confirmado × PrecioCosecha.precio
            // PromedioLote (12.50 kg/gajo) se guarda como snapshot informativo en RegistroCosecha.
            PromedioLote::updateOrCreate(
                ['tenant_id' => $tenantId, 'lote_id' => $lote->id, 'anio' => $anio],
                ['promedio' => 12.50],
            );

            PrecioCosecha::updateOrCreate(
                ['tenant_id' => $tenantId, 'lote_id' => $lote->id, 'anio' => $anio],
                ['precio' => 800.00],
            );
        }
    }
}
