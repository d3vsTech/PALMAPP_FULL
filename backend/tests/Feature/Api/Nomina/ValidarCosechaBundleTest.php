<?php

namespace Tests\Feature\Api\Nomina;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * GET /nominas/{nomina}/validar-cosecha
 *
 * Verifica que el bundle devuelve los totales correctos de kg colaboradores
 * vs kg extractora, y el desglose por colaborador.
 */
class ValidarCosechaBundleTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int  $tenantId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Bundle', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->user = User::create([
            'name'          => 'Admin Test',
            'email'         => 'admin@bundle.test',
            'password'      => 'password',
            'is_super_admin' => true,
            'status'        => true,
        ]);
    }

    public function test_bundle_devuelve_totales_correctos(): void
    {
        [$nominaId] = $this->crearNomina('2026-06-01', '2026-06-15');

        $empleadoId = DB::table('empleados')->insertGetId([
            'tenant_id' => $this->tenantId, 'primer_nombre' => 'Ana',
            'primer_apellido' => 'López', 'documento' => '1001',
            'modalidad_pago' => 'FIJO', 'salario_base' => 1500000,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->crearCosecha($empleadoId, '2026-06-05', 600.00);

        $this->crearViaje('2026-06-10', 550.00);

        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->getJson("/api/v1/tenant/nominas/{$nominaId}/validar-cosecha");

        $response->assertOk()
            ->assertJsonStructure(['data' => [
                'total_kg_colaboradores', 'total_kg_extractora',
                'diferencia_kg', 'detalle_por_colaborador',
            ]])
            ->assertJson(['data' => [
                'total_kg_colaboradores' => 600.00,
                'total_kg_extractora'    => 550.00,
                'diferencia_kg'          => 50.00,
            ]]);

        $detalle = $response->json('data.detalle_por_colaborador');
        $this->assertCount(1, $detalle);
        $this->assertSame('EMPLEADO', $detalle[0]['tipo']);
        $this->assertSame($empleadoId, $detalle[0]['colaborador_id']);
    }

    public function test_bundle_sin_datos_devuelve_ceros(): void
    {
        [$nominaId] = $this->crearNomina('2026-06-01', '2026-06-15');

        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->getJson("/api/v1/tenant/nominas/{$nominaId}/validar-cosecha");

        $response->assertOk()
            ->assertJson(['data' => [
                'total_kg_colaboradores' => 0.00,
                'total_kg_extractora'    => 0.00,
                'diferencia_kg'          => 0.00,
            ]]);
    }

    public function test_bundle_excluye_cosechas_fuera_del_rango(): void
    {
        [$nominaId] = $this->crearNomina('2026-06-01', '2026-06-15');

        $empleadoId = DB::table('empleados')->insertGetId([
            'tenant_id' => $this->tenantId, 'primer_nombre' => 'Luis',
            'primer_apellido' => 'Pérez', 'documento' => '2002',
            'modalidad_pago' => 'FIJO', 'salario_base' => 1200000,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Cosecha FUERA del rango (junio 20)
        $this->crearCosecha($empleadoId, '2026-06-20', 300.00);

        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->getJson("/api/v1/tenant/nominas/{$nominaId}/validar-cosecha");

        $response->assertOk()
            ->assertJson(['data' => ['total_kg_colaboradores' => 0.00]]);
    }

    public function test_bundle_incluye_estado_de_confirmacion_si_existe(): void
    {
        [$nominaId] = $this->crearNomina('2026-06-01', '2026-06-15');

        DB::table('nomina_validacion_cosecha')->insert([
            'tenant_id' => $this->tenantId, 'nomina_id' => $nominaId,
            'total_kg_colaboradores' => 100, 'total_kg_extractora' => 90,
            'diferencia_kg' => 10, 'detalle_por_colaborador' => '[]',
            'validado_por' => $this->user->id, 'validado_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->getJson("/api/v1/tenant/nominas/{$nominaId}/validar-cosecha");

        $response->assertOk();
        $this->assertNotNull($response->json('data.validado_at'));
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private function crearNomina(string $inicio, string $fin): array
    {
        $id = DB::table('nominas')->insertGetId([
            'tenant_id' => $this->tenantId, 'mes' => 6, 'anio' => 2026,
            'fecha_inicio' => $inicio, 'fecha_fin' => $fin,
            'tipo_pago_snapshot' => 'QUINCENAL', 'estado' => 'BORRADOR',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return [$id];
    }

    private function crearCosecha(int $empleadoId, string $fecha, float $pesoKg): void
    {
        $predioId = DB::table('predios')->insertGetId([
            'tenant_id' => $this->tenantId, 'nombre' => 'Predio Test',
            'ubicacion' => 'Zona', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $loteId = DB::table('lotes')->insertGetId([
            'tenant_id' => $this->tenantId, 'predio_id' => $predioId,
            'nombre' => 'Lote 1', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $opId = DB::table('operaciones')->insertGetId([
            'tenant_id' => $this->tenantId, 'fecha' => $fecha,
            'estado' => 'APROBADA', 'creado_por' => $this->user->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $cosechaId = DB::table('registro_cosecha')->insertGetId([
            'tenant_id' => $this->tenantId, 'operacion_id' => $opId,
            'lote_id' => $loteId, 'gajos_reportados' => 50,
            'peso_confirmado' => $pesoKg, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('cosecha_cuadrilla')->insert([
            'tenant_id' => $this->tenantId, 'cosecha_id' => $cosechaId,
            'empleado_id' => $empleadoId, 'operario_id' => null, 'tercero_id' => null,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function crearViaje(string $fecha, float $pesoKg): void
    {
        DB::table('viajes')->insert([
            'tenant_id'            => $this->tenantId,
            'numero_viaje'         => 'V-' . uniqid(),
            'placa_vehiculo'       => 'ABC123',
            'fecha_viaje'          => $fecha,
            'cantidad_gajos_total' => 100,
            'peso_viaje'           => $pesoKg,
            'estado'               => 'FINALIZADO',
            'estado_activo'        => true,
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);
    }
}
