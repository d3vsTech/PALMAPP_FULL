<?php

namespace Tests\Feature\Services\Nomina;

use App\Services\Nomina\CerrarNominaService;
use App\Services\Nomina\NominaCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Verifica que CerrarNominaService lanza NOMINA_VALIDACION_COSECHA_REQUERIDA
 * cuando hay cosechas en el período y no se confirmó el paso 3.
 * Y que el cierre funciona sin error cuando no hay cosechas o cuando
 * la validación ya fue confirmada.
 */
class CerrarSinValidacionCosechaTest extends TestCase
{
    use RefreshDatabase;

    private int $tenantId;
    private int $nominaId;
    private int $userId;
    private int $empleadoId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Test', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->userId = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'admin@test.com',
            'password' => bcrypt('password'), 'is_super_admin' => true, 'status' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->nominaId = DB::table('nominas')->insertGetId([
            'tenant_id' => $this->tenantId, 'mes' => 6, 'anio' => 2026,
            'fecha_inicio' => '2026-06-01', 'fecha_fin' => '2026-06-15',
            'tipo_pago_snapshot' => 'QUINCENAL', 'estado' => 'BORRADOR',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->empleadoId = DB::table('empleados')->insertGetId([
            'tenant_id' => $this->tenantId, 'primer_nombre' => 'Ana',
            'primer_apellido' => 'López', 'documento' => '1001',
            'modalidad_pago' => 'FIJO', 'salario_base' => 1500000,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('nomina_empleado')->insert([
            'tenant_id' => $this->tenantId, 'nomina_id' => $this->nominaId,
            'empleado_id' => $this->empleadoId, 'operario_id' => null, 'tercero_id' => null,
            'salario_tipo' => 'FIJO', 'estado' => 'LIQUIDADO',
            'dias_trabajados' => 15, 'total_devengado' => 1500000, 'total_neto' => 1380000,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_cerrar_falla_si_hay_cosechas_y_no_se_confirmo_paso3(): void
    {
        $this->crearCosechaEnRango('2026-06-05');

        $service = new CerrarNominaService(app(NominaCalculationService::class));
        $nomina  = \App\Models\Nomina::withoutGlobalScope('tenant')->find($this->nominaId);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessageMatches('/NOMINA_VALIDACION_COSECHA_REQUERIDA/');

        $service->cerrar($nomina, $this->userId);
    }

    public function test_cerrar_no_falla_por_validacion_si_paso3_confirmado(): void
    {
        $this->crearCosechaEnRango('2026-06-05');

        DB::table('nomina_validacion_cosecha')->insert([
            'tenant_id' => $this->tenantId, 'nomina_id' => $this->nominaId,
            'total_kg_colaboradores' => 750, 'total_kg_extractora' => 700,
            'diferencia_kg' => 50, 'detalle_por_colaborador' => '[]',
            'validado_por' => $this->userId, 'validado_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $service = new CerrarNominaService(app(NominaCalculationService::class));
        $nomina  = \App\Models\Nomina::withoutGlobalScope('tenant')->find($this->nominaId);

        try {
            $service->cerrar($nomina, $this->userId);
        } catch (\DomainException $e) {
            $this->assertStringNotContainsString(
                'NOMINA_VALIDACION_COSECHA_REQUERIDA',
                $e->getMessage(),
                'No debe fallar por validación de cosecha cuando el paso 3 ya fue confirmado'
            );
        }
    }

    public function test_cerrar_no_requiere_validacion_si_no_hay_cosechas(): void
    {
        // Sin cosechas en el rango → la validación del paso 3 no aplica

        $service = new CerrarNominaService(app(NominaCalculationService::class));
        $nomina  = \App\Models\Nomina::withoutGlobalScope('tenant')->find($this->nominaId);

        try {
            $service->cerrar($nomina, $this->userId);
        } catch (\DomainException $e) {
            $this->assertStringNotContainsString(
                'NOMINA_VALIDACION_COSECHA_REQUERIDA',
                $e->getMessage(),
                'Sin cosechas no debe exigir validación del paso 3'
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private function crearCosechaEnRango(string $fecha): void
    {
        $predioId = DB::table('predios')->insertGetId([
            'tenant_id' => $this->tenantId, 'nombre' => 'Predio A',
            'ubicacion' => 'Zona Norte', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $loteId = DB::table('lotes')->insertGetId([
            'tenant_id' => $this->tenantId, 'predio_id' => $predioId,
            'nombre' => 'Lote 1', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $operacionId = DB::table('operaciones')->insertGetId([
            'tenant_id' => $this->tenantId, 'fecha' => $fecha,
            'estado' => 'APROBADA', 'creado_por' => $this->userId,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $cosechaId = DB::table('registro_cosecha')->insertGetId([
            'tenant_id' => $this->tenantId, 'operacion_id' => $operacionId,
            'lote_id' => $loteId, 'gajos_reportados' => 50,
            'peso_confirmado' => 750.00, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('cosecha_cuadrilla')->insert([
            'tenant_id'  => $this->tenantId,
            'cosecha_id' => $cosechaId,
            'empleado_id' => $this->empleadoId,
            'operario_id' => null,
            'tercero_id'  => null,
            'estado'      => true,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
}
