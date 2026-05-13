<?php

namespace Database\Seeders;

use App\Models\EmpresaTransportadora;
use App\Models\Extractora;
use App\Models\Tenant;
use App\Models\Transportador;
use Illuminate\Database\Seeder;

/**
 * Sembra catálogos ficticios para el módulo de Viajes:
 *  - Empresas Transportadoras
 *  - Transportadores (conductores) ligados a cada empresa
 *  - Extractoras destino
 *
 * Idempotente: usa updateOrCreate por (tenant_id, nit) y (tenant_id, placa_vehiculo).
 */
class ViajesParametricasSeeder extends Seeder
{
    public function run(): void
    {
        // Siembra catálogos de logística para el módulo Viajes.
        // No afecta cálculos de nómina ni jornales.
        // Se aplica a TODOS los tenants activos (no sólo el demo).
        // Crea: 3 empresas transportadoras, 7 conductores, 3 extractoras.
        $empresasBase = [
            [
                'razon_social'    => 'Transportes del Llano S.A.S.',
                'nit'             => '900123456-1',
                'telefono'        => '3201234567',
                'direccion'       => 'Cra 12 # 34-56',
                'ciudad'          => 'Villavicencio',
                'email'           => 'contacto@transllano.co',
                'contacto_nombre' => 'Martha Ortiz',
                'observaciones'   => 'Flota de 12 vehículos. Ruta Meta - Costa Atlántica.',
            ],
            [
                'razon_social'    => 'Logística Palmera del Sur S.A.S.',
                'nit'             => '901234567-2',
                'telefono'        => '3115678901',
                'direccion'       => 'Km 5 Vía San Martín',
                'ciudad'          => 'San Martín',
                'email'           => 'logistica@palmerasur.co',
                'contacto_nombre' => 'Diego Castillo',
                'observaciones'   => null,
            ],
            [
                'razon_social'    => 'Fletes Oriente Ltda.',
                'nit'             => '800987654-3',
                'telefono'        => '3169876543',
                'direccion'       => 'Av. Alfonso López # 45-12',
                'ciudad'          => 'Yopal',
                'email'           => 'operaciones@fletesoriente.com',
                'contacto_nombre' => 'Luis Barrera',
                'observaciones'   => 'Especialista en fruto de palma, refrigerados no.',
            ],
        ];

        $transportadoresBase = [
            // ── Empresa 1: Transportes del Llano ────────────────────────
            [
                'empresa_idx'         => 0,
                'nombres'             => 'Carlos',
                'apellidos'           => 'Rodríguez Pérez',
                'placa_vehiculo'      => 'ABC-123',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '12345678',
                'telefono'            => '3001112233',
                'licencia_conduccion' => 'C2-12345678',
                'licencia_vencimiento'=> '2028-06-15',
                'tipo_vehiculo'       => 'Camión NHR',
                'capacidad_kg'        => 8500.00,
            ],
            [
                'empresa_idx'         => 0,
                'nombres'             => 'Juan',
                'apellidos'           => 'Pérez Morales',
                'placa_vehiculo'      => 'XYZ-789',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '23456789',
                'telefono'            => '3012223344',
                'licencia_conduccion' => 'C2-23456789',
                'licencia_vencimiento'=> '2027-11-20',
                'tipo_vehiculo'       => 'Turbo',
                'capacidad_kg'        => 4500.00,
            ],
            [
                'empresa_idx'         => 0,
                'nombres'             => 'Miguel Ángel',
                'apellidos'           => 'Gómez Ruiz',
                'placa_vehiculo'      => 'DEF-456',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '34567890',
                'telefono'            => '3023334455',
                'licencia_conduccion' => 'C2-34567890',
                'licencia_vencimiento'=> '2029-03-10',
                'tipo_vehiculo'       => 'Camión Doble Troque',
                'capacidad_kg'        => 15000.00,
            ],
            // ── Empresa 2: Logística Palmera del Sur ────────────────────
            [
                'empresa_idx'         => 1,
                'nombres'             => 'Pedro',
                'apellidos'           => 'López Hernández',
                'placa_vehiculo'      => 'GHI-321',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '45678901',
                'telefono'            => '3034445566',
                'licencia_conduccion' => 'C2-45678901',
                'licencia_vencimiento'=> '2027-08-25',
                'tipo_vehiculo'       => 'Camión NPR',
                'capacidad_kg'        => 9500.00,
            ],
            [
                'empresa_idx'         => 1,
                'nombres'             => 'Andrés',
                'apellidos'           => 'Martínez Silva',
                'placa_vehiculo'      => 'JKL-654',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '56789012',
                'telefono'            => '3045556677',
                'licencia_conduccion' => 'C2-56789012',
                'licencia_vencimiento'=> '2028-12-01',
                'tipo_vehiculo'       => 'Turbo',
                'capacidad_kg'        => 5000.00,
            ],
            // ── Empresa 3: Fletes Oriente ────────────────────────────────
            [
                'empresa_idx'         => 2,
                'nombres'             => 'Fernando',
                'apellidos'           => 'Ramírez Torres',
                'placa_vehiculo'      => 'MNO-987',
                'tipo_documento'      => 'CC',
                'numero_documento'    => '67890123',
                'telefono'            => '3056667788',
                'licencia_conduccion' => 'C3-67890123',
                'licencia_vencimiento'=> '2029-07-14',
                'tipo_vehiculo'       => 'Tractomula',
                'capacidad_kg'        => 25000.00,
            ],
            [
                'empresa_idx'         => 2,
                'nombres'             => 'José Luis',
                'apellidos'           => 'Hernández Parra',
                'placa_vehiculo'      => 'PQR-135',
                'tipo_documento'      => 'CE',
                'numero_documento'    => 'CE-78901234',
                'telefono'            => '3067778899',
                'licencia_conduccion' => 'C2-78901234',
                'licencia_vencimiento'=> '2027-04-30',
                'tipo_vehiculo'       => 'Camión NHR',
                'capacidad_kg'        => 8500.00,
            ],
        ];

        $extractorasBase = [
            [
                'razon_social'    => 'Extractora San Miguel S.A.',
                'nit'             => '830111222-1',
                'ubicacion'       => 'Km 12 Vía San Martín - Puerto López',
                'ciudad'          => 'San Martín',
                'telefono'        => '6086712345',
                'email'           => 'recepcion@extsanmiguel.co',
                'contacto_nombre' => 'Roberto Vargas',
                'distancia_km'    => 45.50,
                'observaciones'   => 'Horario de recepción 5am - 8pm.',
            ],
            [
                'razon_social'    => 'Extractora Santa Rosa S.A.S.',
                'nit'             => '900333444-5',
                'ubicacion'       => 'Km 8 Vía Villavicencio - Acacías',
                'ciudad'          => 'Acacías',
                'telefono'        => '6087654321',
                'email'           => 'bascula@extsantarosa.co',
                'contacto_nombre' => 'Carmen Delgado',
                'distancia_km'    => 28.75,
                'observaciones'   => null,
            ],
            [
                'razon_social'    => 'Palmas del Casanare S.A.',
                'nit'             => '800555666-2',
                'ubicacion'       => 'Km 25 Vía Yopal - Tauramena',
                'ciudad'          => 'Tauramena',
                'telefono'        => '6089988776',
                'email'           => 'operaciones@palmascasanare.com',
                'contacto_nombre' => 'Álvaro Benítez',
                'distancia_km'    => 120.00,
                'observaciones'   => 'Planta más lejana, preferir viajes homogéneos.',
            ],
        ];

        $tenants = Tenant::where('estado', 'ACTIVO')->get();
        $totalEmpresas = 0;
        $totalTransportadores = 0;
        $totalExtractoras = 0;

        foreach ($tenants as $tenant) {
            // ── Empresas ────────────────────────────────────────────────
            $empresasCreadas = [];
            foreach ($empresasBase as $empresa) {
                $model = EmpresaTransportadora::updateOrCreate(
                    ['tenant_id' => $tenant->id, 'nit' => $empresa['nit']],
                    array_merge($empresa, ['tenant_id' => $tenant->id, 'estado' => true]),
                );
                $empresasCreadas[] = $model;
                $totalEmpresas++;
            }

            // ── Transportadores ─────────────────────────────────────────
            foreach ($transportadoresBase as $transportador) {
                $empresa = $empresasCreadas[$transportador['empresa_idx']];
                $data = $transportador;
                unset($data['empresa_idx']);

                Transportador::updateOrCreate(
                    ['tenant_id' => $tenant->id, 'placa_vehiculo' => $data['placa_vehiculo']],
                    array_merge($data, [
                        'tenant_id'                 => $tenant->id,
                        'empresa_transportadora_id' => $empresa->id,
                        'estado'                    => true,
                    ]),
                );
                $totalTransportadores++;
            }

            // ── Extractoras ─────────────────────────────────────────────
            foreach ($extractorasBase as $extractora) {
                Extractora::updateOrCreate(
                    ['tenant_id' => $tenant->id, 'nit' => $extractora['nit']],
                    array_merge($extractora, ['tenant_id' => $tenant->id, 'estado' => true]),
                );
                $totalExtractoras++;
            }
        }

        $this->command->info(" ✓ ViajesParametricasSeeder:");
        $this->command->info("     {$totalEmpresas} empresas transportadoras");
        $this->command->info("     {$totalTransportadores} transportadores");
        $this->command->info("     {$totalExtractoras} extractoras");
        $this->command->info("     ({$tenants->count()} tenants)");
    }
}
