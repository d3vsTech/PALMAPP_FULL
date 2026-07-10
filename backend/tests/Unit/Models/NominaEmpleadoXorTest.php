<?php

namespace Tests\Unit\Models;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NominaEmpleadoXorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_fila_con_solo_empleado_id_se_persiste(): void
    {
        $ids = $this->crearBase();

        DB::table('nomina_empleado')->insert([
            'tenant_id'   => $ids['tenant_id'],
            'nomina_id'   => $ids['nomina_id'],
            'empleado_id' => $ids['empleado_id'],
            'operario_id' => null,
            'tercero_id'  => null,
            'salario_tipo' => 'FIJO',
            'estado'      => 'PENDIENTE',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $this->assertDatabaseCount('nomina_empleado', 1);
    }

    public function test_fila_con_solo_operario_id_se_persiste(): void
    {
        $ids = $this->crearBase();

        DB::table('nomina_empleado')->insert([
            'tenant_id'   => $ids['tenant_id'],
            'nomina_id'   => $ids['nomina_id'],
            'empleado_id' => null,
            'operario_id' => $ids['operario_id'],
            'tercero_id'  => $ids['tercero_id'],
            'salario_tipo' => null,
            'estado'      => 'PENDIENTE',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $this->assertDatabaseCount('nomina_empleado', 1);
    }

    public function test_fila_con_ambos_ids_viola_constraint_xor(): void
    {
        $ids = $this->crearBase();

        $this->expectException(\Illuminate\Database\QueryException::class);

        DB::table('nomina_empleado')->insert([
            'tenant_id'   => $ids['tenant_id'],
            'nomina_id'   => $ids['nomina_id'],
            'empleado_id' => $ids['empleado_id'],
            'operario_id' => $ids['operario_id'],
            'tercero_id'  => $ids['tercero_id'],
            'salario_tipo' => 'FIJO',
            'estado'      => 'PENDIENTE',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function test_fila_sin_ninguno_viola_constraint_xor(): void
    {
        $ids = $this->crearBase();

        $this->expectException(\Illuminate\Database\QueryException::class);

        DB::table('nomina_empleado')->insert([
            'tenant_id'   => $ids['tenant_id'],
            'nomina_id'   => $ids['nomina_id'],
            'empleado_id' => null,
            'operario_id' => null,
            'tercero_id'  => null,
            'salario_tipo' => 'FIJO',
            'estado'      => 'PENDIENTE',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    private function crearBase(): array
    {
        $tenantId = DB::table('tenants')->insertGetId([
            'nombre' => 'Test Finca', 'tipo_persona' => 'JURIDICA', 'estado' => 'ACTIVO',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $nominaId = DB::table('nominas')->insertGetId([
            'tenant_id' => $tenantId, 'mes' => 6, 'anio' => 2026,
            'fecha_inicio' => '2026-06-01', 'fecha_fin' => '2026-06-15',
            'tipo_pago_snapshot' => 'QUINCENAL', 'estado' => 'BORRADOR',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $empleadoId = DB::table('empleados')->insertGetId([
            'tenant_id' => $tenantId, 'primer_nombre' => 'Ana',
            'primer_apellido' => 'López', 'documento' => '1001',
            'modalidad_pago' => 'FIJO', 'salario_base' => 1500000,
            'estado' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $terceroId = DB::table('terceros')->insertGetId([
            'tenant_id' => $tenantId, 'tipo_persona' => 'NATURAL',
            'nombre_completo' => 'Contratista SA', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $operarioId = DB::table('operarios')->insertGetId([
            'tenant_id' => $tenantId, 'tercero_id' => $terceroId,
            'nombres' => 'Pedro', 'apellidos' => 'Ruiz',
            'cedula' => '2002', 'estado' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return compact('tenantId', 'nominaId', 'empleadoId', 'terceroId', 'operarioId');
    }
}
