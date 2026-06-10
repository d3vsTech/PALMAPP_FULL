<?php

namespace Database\Seeders;

use App\Models\Insumo;
use App\Models\Labor;
use App\Models\Lote;
use App\Models\PrecioAbono;
use App\Models\PrecioCosecha;
use App\Models\Predio;
use App\Models\PromedioLote;
use App\Models\Sublote;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Datos demo para poder probar el wizard de Operaciones (Planilla del Día).
 * Crea insumos, precios, labores fijas + finca y estructura de plantación básica
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
        $this->seedLaboresFijasPalma($tenant->id);
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
        // Aplica solo cuando la labor FERTILIZACION está configurada como POR_PALMA.
        // Fórmula: valor_total = cantidad_palmas × precio_palma_del_rango
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

    /**
     * Las 5 labores fijas del sistema (es_sistema=true). Idempotente.
     * Si ya existen (la migración 000002 las crea por tenant), solo refresca
     * tipo_pago/precio_palma demo.
     */
    private function seedLaboresFijasPalma(int $tenantId): void
    {
        $fijas = [
            ['tipo' => Labor::TIPO_COSECHA,       'tipo_pago' => Labor::TIPO_PAGO_POR_PALMA,   'precio_palma' => null],
            ['tipo' => Labor::TIPO_PLATEO,        'tipo_pago' => Labor::TIPO_PAGO_POR_PALMA,   'precio_palma' => 50.00],
            ['tipo' => Labor::TIPO_PODA,          'tipo_pago' => Labor::TIPO_PAGO_POR_PALMA,   'precio_palma' => 80.00],
            ['tipo' => Labor::TIPO_FERTILIZACION, 'tipo_pago' => Labor::TIPO_PAGO_POR_PALMA,   'precio_palma' => null],
            ['tipo' => Labor::TIPO_SANIDAD,       'tipo_pago' => Labor::TIPO_PAGO_JORNAL_FIJO, 'precio_palma' => null],
        ];

        foreach ($fijas as $f) {
            Labor::updateOrCreate(
                ['tenant_id' => $tenantId, 'tipo' => $f['tipo'], 'es_sistema' => true],
                [
                    'categoria'    => Labor::CATEGORIA_PALMA,
                    'nombre'       => Labor::NOMBRES_FIJOS[$f['tipo']],
                    'tipo_pago'    => $f['tipo_pago'],
                    'precio_palma' => $f['precio_palma'],
                    'estado'       => true,
                ],
            );
        }
    }

    private function seedLaboresFinca(int $tenantId): void
    {
        // Labores de finca con tarifa diaria fija (categoria=FINCA, tipo_pago=JORNAL_FIJO).
        // Fórmula: valor_total = precio_palma (valor plano por jornal).
        $labores = [
            ['nombre' => 'Reparación de portón',   'precio_palma' => 45000.00],
            ['nombre' => 'Mantenimiento general',  'precio_palma' => 30000.00],
            ['nombre' => 'Transporte interno',     'precio_palma' => 50000.00],
        ];

        foreach ($labores as $l) {
            Labor::updateOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $l['nombre']],
                [
                    'categoria'    => Labor::CATEGORIA_FINCA,
                    'tipo'         => null,
                    'tipo_pago'    => Labor::TIPO_PAGO_JORNAL_FIJO,
                    'precio_palma' => $l['precio_palma'],
                    'es_sistema'   => false,
                    'estado'       => true,
                ],
            );
        }
    }

    private function seedPlantacion(int $tenantId): void
    {
        // Crea el Predio físico "Predio Principal" con sus Lotes y Sublotes.
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

        foreach ($lotes as $loteData) {
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
                    // Metadata de capacidad del sublote.
                    'cantidad_palmas' => 0,
                    'estado'          => true,
                ]);
            }

            // PromedioLote y PrecioCosecha solo aplican cuando la labor COSECHA
            // está en POR_PALMA (default). En modo JORNAL_FIJO se ignoran.
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
