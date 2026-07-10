<?php

namespace Tests\Unit\Services;

use App\Models\Labor;
use App\Services\JornalCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JornalCalculationServiceTipoPagoTest extends TestCase
{
    use RefreshDatabase;

    private JornalCalculationService $service;
    private int $tenantId;
    private int $terceroId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new JornalCalculationService();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Test', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->terceroId = DB::table('terceros')->insertGetId([
            'tenant_id' => $this->tenantId, 'tipo_persona' => 'JURIDICA',
            'razon_social' => 'Servicios Campo SAS', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_tipo_pago_por_palma_usa_precio_palma_del_tercero(): void
    {
        $laborId = DB::table('labores')->insertGetId([
            'tenant_id'   => $this->tenantId,
            'categoria'   => 'PALMA', 'tipo' => 'PLATEO', 'nombre' => 'Plateo',
            'tipo_pago'   => 'POR_PALMA', 'precio_palma' => 2500,
            'es_sistema'  => true, 'estado' => true,
            'created_at'  => now(), 'updated_at' => now(),
        ]);

        DB::table('tercero_labor_precios')->insert([
            'tenant_id'   => $this->tenantId,
            'tercero_id'  => $this->terceroId,
            'labor_id'    => $laborId,
            'tipo_pago'   => 'POR_PALMA',
            'precio_palma' => 3200,
            'tarifa_jornal' => null,
            'estado'      => true,
            'created_at'  => now(), 'updated_at' => now(),
        ]);

        $labor = Labor::withoutGlobalScope('tenant')->find($laborId);

        $resultado = $this->service->calcular($labor, ['cantidad_palmas' => 10], $this->terceroId);

        $this->assertSame('3200', $resultado['valor_unitario']);
        $this->assertSame('32000', $resultado['valor_total']);
    }

    public function test_tipo_pago_jornal_fijo_usa_tarifa_jornal_del_tercero(): void
    {
        $laborId = DB::table('labores')->insertGetId([
            'tenant_id'   => $this->tenantId,
            'categoria'   => 'FINCA', 'tipo' => null, 'nombre' => 'Guadañada',
            'tipo_pago'   => 'JORNAL_FIJO', 'precio_palma' => 50000,
            'es_sistema'  => false, 'estado' => true,
            'created_at'  => now(), 'updated_at' => now(),
        ]);

        DB::table('tercero_labor_precios')->insert([
            'tenant_id'     => $this->tenantId,
            'tercero_id'    => $this->terceroId,
            'labor_id'      => $laborId,
            'tipo_pago'     => 'JORNAL_FIJO',
            'precio_palma'  => null,
            'tarifa_jornal' => 75000,
            'estado'        => true,
            'created_at'    => now(), 'updated_at' => now(),
        ]);

        $labor = Labor::withoutGlobalScope('tenant')->find($laborId);

        $resultado = $this->service->calcular($labor, [], $this->terceroId);

        $this->assertSame('75000', $resultado['valor_unitario']);
        $this->assertSame('75000', $resultado['valor_total']);
    }

    public function test_sin_tercero_usa_precio_palma_de_la_labor(): void
    {
        $laborId = DB::table('labores')->insertGetId([
            'tenant_id'   => $this->tenantId,
            'categoria'   => 'FINCA', 'tipo' => null, 'nombre' => 'Chapeo',
            'tipo_pago'   => 'JORNAL_FIJO', 'precio_palma' => 55000,
            'es_sistema'  => false, 'estado' => true,
            'created_at'  => now(), 'updated_at' => now(),
        ]);

        $labor = Labor::withoutGlobalScope('tenant')->find($laborId);

        $resultado = $this->service->calcular($labor, [], null);

        // Labor.precio_palma cast a float → (string) 55000.0 = "55000"
        $this->assertSame('55000', $resultado['valor_unitario']);
        $this->assertSame('55000', $resultado['valor_total']);
    }

    public function test_jornal_fijo_no_usa_precio_palma_del_tercero_por_error(): void
    {
        $laborId = DB::table('labores')->insertGetId([
            'tenant_id'  => $this->tenantId,
            'categoria'  => 'FINCA', 'tipo' => null, 'nombre' => 'Deshierbe',
            'tipo_pago'  => 'JORNAL_FIJO', 'precio_palma' => 50000,
            'es_sistema' => false, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('tercero_labor_precios')->insert([
            'tenant_id'     => $this->tenantId,
            'tercero_id'    => $this->terceroId,
            'labor_id'      => $laborId,
            'tipo_pago'     => 'JORNAL_FIJO',
            'precio_palma'  => 50000,
            'tarifa_jornal' => 80000,
            'estado'        => true,
            'created_at'    => now(), 'updated_at' => now(),
        ]);

        $labor = Labor::withoutGlobalScope('tenant')->find($laborId);

        $resultado = $this->service->calcular($labor, [], $this->terceroId);

        // Debe usar tarifa_jornal (80000), NO precio_palma (50000)
        $this->assertSame('80000', $resultado['valor_total']);
        $this->assertNotEquals('50000', $resultado['valor_total']);
    }
}
