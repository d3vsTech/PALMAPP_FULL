<?php

namespace Tests\Feature\Api\Nomina;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * PUT /nominas/{nomina}/promedios-lote/{lote}
 *
 * Verifica que ajustar el promedio baseline de un lote crea/actualiza
 * el registro en promedio_lote con viaje_id=null (baseline manual).
 */
class AjustarPromedioLoteNominaTest extends TestCase
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
            'nombre' => 'Finca Promedio', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->user = User::create([
            'name'           => 'Admin Test',
            'email'          => 'admin@promedio.test',
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

    public function test_ajustar_promedio_crea_baseline_en_rango(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->putJson(
                "/api/v1/tenant/nominas/{$this->nominaId}/promedios-lote/{$this->loteId}",
                ['promedio' => 18.50]
            );

        $response->assertOk()
            ->assertJsonPath('data.lote_id', $this->loteId)
            ->assertJsonPath('data.promedio', '18.50');

        $this->assertDatabaseHas('promedio_lote', [
            'tenant_id' => $this->tenantId,
            'lote_id'   => $this->loteId,
            'viaje_id'  => null,
            'fecha'     => '2026-06-01',
            'anio'      => 2026,
        ]);
    }

    public function test_ajustar_promedio_es_idempotente(): void
    {
        $url = "/api/v1/tenant/nominas/{$this->nominaId}/promedios-lote/{$this->loteId}";
        $headers = ['X-Tenant-Id' => $this->tenantId];

        // Primera llamada
        $this->actingAs($this->user, 'api')
            ->withHeaders($headers)
            ->putJson($url, ['promedio' => 15.00])
            ->assertOk();

        // Segunda llamada con valor distinto
        $this->actingAs($this->user, 'api')
            ->withHeaders($headers)
            ->putJson($url, ['promedio' => 20.00])
            ->assertOk();

        // Solo un registro (upsert, no duplica)
        $this->assertDatabaseCount('promedio_lote', 1);

        $this->assertDatabaseHas('promedio_lote', [
            'lote_id' => $this->loteId, 'viaje_id' => null,
        ]);

        $promedio = DB::table('promedio_lote')
            ->where('lote_id', $this->loteId)
            ->whereNull('viaje_id')
            ->value('promedio');

        $this->assertEquals(20.00, (float) $promedio);
    }

    public function test_ajustar_promedio_falla_sin_valor(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->putJson(
                "/api/v1/tenant/nominas/{$this->nominaId}/promedios-lote/{$this->loteId}",
                []
            );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['promedio']);
    }

    public function test_ajustar_promedio_falla_con_cero(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->withHeaders(['X-Tenant-Id' => $this->tenantId])
            ->putJson(
                "/api/v1/tenant/nominas/{$this->nominaId}/promedios-lote/{$this->loteId}",
                ['promedio' => 0]
            );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['promedio']);
    }
}
