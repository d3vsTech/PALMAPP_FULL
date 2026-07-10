<?php

namespace Tests\Feature\Api\Nomina;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Verifica que los endpoints de validar cosecha responden correctamente
 * cuando la nómina ya está CERRADA.
 */
class ValidarCosechaCerradaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int  $tenantId;
    private int  $nominaId;
    private int  $loteId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Finca Cerrada', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->user = User::create([
            'name'           => 'Admin Test',
            'email'          => 'admin@cerrada.test',
            'password'       => 'password',
            'is_super_admin' => true,
            'status'         => true,
        ]);

        $this->nominaId = DB::table('nominas')->insertGetId([
            'tenant_id' => $this->tenantId, 'mes' => 5, 'anio' => 2026,
            'fecha_inicio' => '2026-05-01', 'fecha_fin' => '2026-05-15',
            'tipo_pago_snapshot' => 'QUINCENAL', 'estado' => 'CERRADA',
            'cerrada_por' => $this->user->id, 'cerrada_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $predioId = DB::table('predios')->insertGetId([
            'tenant_id' => $this->tenantId, 'nombre' => 'Predio A',
            'ubicacion' => 'Zona Norte', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->loteId = DB::table('lotes')->insertGetId([
            'tenant_id' => $this->tenantId, 'predio_id' => $predioId,
            'nombre' => 'Lote 1', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_bundle_sigue_funcionando_en_nomina_cerrada(): void
    {
        // El GET del bundle siempre está disponible (solo lectura)
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->getJson("/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha");

        $response->assertOk();
    }

    public function test_confirmar_falla_409_en_nomina_cerrada(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->postJson("/api/v1/tenant/nominas/{$this->nominaId}/validar-cosecha/confirmar");

        $response->assertStatus(409)
            ->assertJsonPath('code', 'NOMINA_CERRADA');
    }

    public function test_ajustar_promedio_falla_409_en_nomina_cerrada(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->putJson(
                "/api/v1/tenant/nominas/{$this->nominaId}/promedios-lote/{$this->loteId}",
                ['promedio' => 18.50]
            );

        $response->assertStatus(409)
            ->assertJsonPath('code', 'NOMINA_CERRADA');
    }
}
