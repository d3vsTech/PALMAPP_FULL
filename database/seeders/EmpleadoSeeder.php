<?php

namespace Database\Seeders;

use App\Models\Empleado;
use App\Models\Predio;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Sembra empleados demo por tenant ACTIVO. Estos tres empleados aparecen
 * en los mockups del módulo de Nómina y permiten probar el flujo completo
 * (1 FIJO + 2 VARIABLE).
 *
 * Idempotente: usa firstOrCreate sobre (tenant_id, documento) para no
 * duplicar al re-ejecutar.
 */
class EmpleadoSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('estado', 'ACTIVO')->get();
        $creados = 0;

        foreach ($tenants as $tenant) {
            $predio = Predio::where('tenant_id', $tenant->id)->first();

            foreach ($this->empleadosBase() as $datos) {
                $empleado = Empleado::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'documento' => $datos['documento'],
                    ],
                    array_merge($datos, [
                        'tenant_id' => $tenant->id,
                        'predio_id' => $predio?->id,
                    ])
                );

                if ($empleado->wasRecentlyCreated) {
                    $creados++;
                }
            }
        }

        $this->command->info(" ✓ EmpleadoSeeder: {$creados} empleados creados ({$tenants->count()} tenants)");
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function empleadosBase(): array
    {
        return [
            [
                'primer_nombre'              => 'María',
                'segundo_nombre'             => null,
                'primer_apellido'            => 'González',
                'segundo_apellido'           => 'López',
                'tipo_documento'             => 'CC',
                'documento'                  => '1098700001',
                'fecha_expedicion_documento' => '2010-03-15',
                'lugar_expedicion'           => 'Acacías',
                'cargo'                      => 'Administradora',
                'salario_base'               => 1500000,
                'modalidad_pago'             => 'FIJO',
                'correo_electronico'         => 'maria.gonzalez@laesperanza.com',
                'telefono'                   => '3001112233',
                'fecha_nacimiento'           => '1990-05-20',
                'fecha_ingreso'              => '2024-01-15',
                'direccion'                  => 'Calle 5 #10-23',
                'municipio'                  => 'Acacías',
                'departamento'               => 'Meta',
                'eps'                        => 'SURA',
                'fondo_pension'              => 'COLPENSIONES',
                'arl'                        => 'POSITIVA',
                'caja_compensacion'          => 'CONFAMILIAR',
                'estado'                     => true,
            ],
            [
                'primer_nombre'              => 'Carlos',
                'segundo_nombre'             => null,
                'primer_apellido'            => 'Rodríguez',
                'segundo_apellido'           => 'García',
                'tipo_documento'             => 'CC',
                'documento'                  => '1098700002',
                'fecha_expedicion_documento' => '2008-09-10',
                'lugar_expedicion'           => 'Acacías',
                'cargo'                      => 'Operario de palma',
                'salario_base'               => 1300000,
                'modalidad_pago'             => 'PRODUCCION',
                'correo_electronico'         => null,
                'telefono'                   => '3002223344',
                'fecha_nacimiento'           => '1988-11-03',
                'fecha_ingreso'              => '2023-06-01',
                'direccion'                  => 'Vereda El Porvenir',
                'municipio'                  => 'Acacías',
                'departamento'               => 'Meta',
                'eps'                        => 'NUEVA EPS',
                'fondo_pension'              => 'PORVENIR',
                'arl'                        => 'SURA',
                'caja_compensacion'          => 'CONFAMILIAR',
                'estado'                     => true,
            ],
            [
                'primer_nombre'              => 'Luis',
                'segundo_nombre'             => null,
                'primer_apellido'            => 'Martínez',
                'segundo_apellido'           => 'Pérez',
                'tipo_documento'             => 'CC',
                'documento'                  => '1098700003',
                'fecha_expedicion_documento' => '2012-04-22',
                'lugar_expedicion'           => 'Villavicencio',
                'cargo'                      => 'Operario de palma',
                'salario_base'               => 1400000,
                'modalidad_pago'             => 'PRODUCCION',
                'correo_electronico'         => null,
                'telefono'                   => '3003334455',
                'fecha_nacimiento'           => '1992-07-18',
                'fecha_ingreso'              => '2024-03-10',
                'direccion'                  => 'Vereda La Esperanza',
                'municipio'                  => 'Acacías',
                'departamento'               => 'Meta',
                'eps'                        => 'SANITAS',
                'fondo_pension'              => 'PROTECCIÓN',
                'arl'                        => 'SURA',
                'caja_compensacion'          => 'CONFAMILIAR',
                'estado'                     => true,
            ],
        ];
    }
}
