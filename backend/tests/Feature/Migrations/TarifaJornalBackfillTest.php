<?php

namespace Tests\Feature\Migrations;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TarifaJornalBackfillTest extends TestCase
{
    use RefreshDatabase;

    private int $tenantId;
    private int $terceroId;
    private int $laborId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Backfill', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->terceroId = DB::table('terceros')->insertGetId([
            'tenant_id' => $this->tenantId, 'tipo_persona' => 'NATURAL',
            'nombre_completo' => 'Servicios SA', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->laborId = DB::table('labores')->insertGetId([
            'tenant_id' => $this->tenantId, 'categoria' => 'FINCA',
            'tipo' => null, 'nombre' => 'Guadañada',
            'tipo_pago' => 'JORNAL_FIJO', 'precio_palma' => 45000,
            'es_sistema' => false, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_backfill_popula_tarifa_jornal_desde_precio_palma_para_jornal_fijo(): void
    {
        // Simular fila pre-migración: tipo_pago=JORNAL_FIJO, tarifa_jornal=NULL
        DB::table('tercero_labor_precios')->insert([
            'tenant_id'     => $this->tenantId,
            'tercero_id'    => $this->terceroId,
            'labor_id'      => $this->laborId,
            'tipo_pago'     => 'JORNAL_FIJO',
            'precio_palma'  => 45000.00,
            'tarifa_jornal' => null,
            'estado'        => true,
            'created_at'    => now(), 'updated_at' => now(),
        ]);

        // Ejecutar el SQL de backfill de la migración
        DB::statement("
            UPDATE tercero_labor_precios
            SET tarifa_jornal = precio_palma
            WHERE tipo_pago = 'JORNAL_FIJO' AND tarifa_jornal IS NULL
        ");

        $fila = DB::table('tercero_labor_precios')->first();
        $this->assertEquals('45000.00', number_format((float) $fila->tarifa_jornal, 2, '.', ''));
    }

    public function test_backfill_no_afecta_filas_por_palma(): void
    {
        DB::table('tercero_labor_precios')->insert([
            'tenant_id'     => $this->tenantId,
            'tercero_id'    => $this->terceroId,
            'labor_id'      => $this->laborId,
            'tipo_pago'     => 'POR_PALMA',
            'precio_palma'  => 3000.00,
            'tarifa_jornal' => null,
            'estado'        => true,
            'created_at'    => now(), 'updated_at' => now(),
        ]);

        DB::statement("
            UPDATE tercero_labor_precios
            SET tarifa_jornal = precio_palma
            WHERE tipo_pago = 'JORNAL_FIJO' AND tarifa_jornal IS NULL
        ");

        $fila = DB::table('tercero_labor_precios')->first();
        $this->assertNull($fila->tarifa_jornal);
    }

    public function test_backfill_no_sobreescribe_tarifa_jornal_existente(): void
    {
        DB::table('tercero_labor_precios')->insert([
            'tenant_id'     => $this->tenantId,
            'tercero_id'    => $this->terceroId,
            'labor_id'      => $this->laborId,
            'tipo_pago'     => 'JORNAL_FIJO',
            'precio_palma'  => 45000.00,
            'tarifa_jornal' => 80000.00,
            'estado'        => true,
            'created_at'    => now(), 'updated_at' => now(),
        ]);

        DB::statement("
            UPDATE tercero_labor_precios
            SET tarifa_jornal = precio_palma
            WHERE tipo_pago = 'JORNAL_FIJO' AND tarifa_jornal IS NULL
        ");

        $fila = DB::table('tercero_labor_precios')->first();
        $this->assertEquals('80000.00', number_format((float) $fila->tarifa_jornal, 2, '.', ''));
    }
}
