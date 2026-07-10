<?php

namespace Tests\Feature\Api\Nomina;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * POST /nominas/{nomina}/validar-cosecha/confirmar
 *
 * Verifica que el snapshot de validación se persiste y que un segundo
 * POST remplaza al primero (upsert — no duplica filas).
 */
class ConfirmarValidacionCosechaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int  $tenantId;
    private int  $nominaId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Confirmar', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->user = User::create([
            'name'           => 'Admin Test',
            'email'          => 'admin@confirmar.test',
            'password'       => 'password',
            'is_super_admin' => true,
            'status'         => true,
        ]);

        $this->nominaId = DB::table('nominas')->insertGetId([
            'tenant_id' => $this->tenantId, 'mes' => 6, 'anio' => 2026,
            'fecha_inicio' => '2026-06-01', 'fecha_fin' => '2026-06-15',
            'tipo_pago_snapshot' => 'QUINCENAL', 'estado' => 'BORRADOR',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_confirmar_persiste_snapshot(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->postJson("/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha/confirmar");

        $response->assertOk()
            ->assertJsonStructure(['data' => ['nomina_id', 'validado_at', 'validado_por']]);

        $this->assertDatabaseCount('nomina_validacion_cosecha', 1);
        $this->assertDatabaseHas('nomina_validacion_cosecha', [
            'nomina_id'   => $this->nominaId,
            'validado_por' => $this->user->id,
        ]);

        $this->assertNotNull(
            DB::table('nomina_validacion_cosecha')->where('nomina_id', $this->nominaId)->value('validado_at')
        );
    }

    public function test_segundo_confirmar_hace_upsert_sin_duplicar(): void
    {
        $url     = "/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha/confirmar";
        $headers = ['X-Tenant-Id' => $this->tenantId];

        $this->actingAs($this->user, 'api')->withHeaders($headers)->postJson($url)->assertOk();
        $this->actingAs($this->user, 'api')->withHeaders($headers)->postJson($url)->assertOk();

        // El segundo POST no crea una fila nueva — el UNIQUE(nomina_id) lo previene
        $this->assertDatabaseCount('nomina_validacion_cosecha', 1);
    }

    public function test_confirmar_actualiza_totales_con_datos_actuales(): void
    {
        // Primera confirmación: sin cosechas
        $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->postJson("/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha/confirmar")
            ->assertOk();

        $primera = DB::table('nomina_validacion_cosecha')
            ->where('nomina_id', $this->nominaId)
            ->first();
        $this->assertEquals(0.00, (float) $primera->total_kg_colaboradores);

        // Agregar cosecha al período
        $predioId = DB::table('predios')->insertGetId([
            'tenant_id' => $this->tenantId, 'nombre' => 'Predio A',
            'ubicacion' => 'Zona', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $loteId = DB::table('lotes')->insertGetId([
            'tenant_id' => $this->tenantId, 'predio_id' => $predioId,
            'nombre' => 'Lote 1', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $empleadoId = DB::table('empleados')->insertGetId([
            'tenant_id' => $this->tenantId, 'primer_nombre' => 'Ana',
            'primer_apellido' => 'López', 'documento' => '1001',
            'modalidad_pago' => 'FIJO', 'salario_base' => 1500000,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $opId = DB::table('operaciones')->insertGetId([
            'tenant_id' => $this->tenantId, 'fecha' => '2026-06-05',
            'estado' => 'APROBADA', 'creado_por' => $this->user->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $cosechaId = DB::table('registro_cosecha')->insertGetId([
            'tenant_id' => $this->tenantId, 'operacion_id' => $opId, 'lote_id' => $loteId,
            'gajos_reportados' => 50, 'peso_confirmado' => 800.00, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('cosecha_cuadrilla')->insert([
            'tenant_id' => $this->tenantId, 'cosecha_id' => $cosechaId,
            'empleado_id' => $empleadoId, 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // Segunda confirmación: debe reflejar la cosecha
        $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->postJson("/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha/confirmar")
            ->assertOk();

        $segunda = DB::table('nomina_validacion_cosecha')
            ->where('nomina_id', $this->nominaId)
            ->first();
        $this->assertEquals(800.00, (float) $segunda->total_kg_colaboradores);
    }
}
