<?php

namespace Database\Seeders;

use App\Models\Ausencia;
use App\Models\MotivoAusencia;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Sembra un catálogo base de motivos de ausencia para cada tenant activo.
 * Idempotente: usa updateOrCreate sobre (tenant_id, nombre).
 */
class MotivoAusenciaSeeder extends Seeder
{
    public function run(): void
    {
        $motivosBase = [
            [
                'nombre'                  => 'Incapacidad EPS - General',
                'tipo_base'               => Ausencia::TIPO_INCAPACIDAD_EPS,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 66.67,
                'requiere_soporte'        => true,
            ],
            [
                'nombre'                  => 'Incapacidad ARL - Accidente laboral',
                'tipo_base'               => Ausencia::TIPO_INCAPACIDAD_ARL,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
            ],
            [
                'nombre'                  => 'Licencia de maternidad',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_MATERNIDAD,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
            ],
            [
                'nombre'                  => 'Licencia de paternidad',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_PATERNIDAD,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
            ],
            [
                'nombre'                  => 'Licencia por Luto',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_LUTO,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Permiso remunerado',
                'tipo_base'               => Ausencia::TIPO_PERMISO_REMUNERADO,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Permiso no remunerado',
                'tipo_base'               => Ausencia::TIPO_PERMISO_NO_REMUNERADO,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Ausencia injustificada',
                'tipo_base'               => Ausencia::TIPO_AUSENCIA_INJUSTIFICADA,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Calamidad doméstica',
                'tipo_base'               => Ausencia::TIPO_CALAMIDAD_DOMESTICA,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Suspensión disciplinaria',
                'tipo_base'               => Ausencia::TIPO_SUSPENSION_DISCIPLINARIA,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
            ],
            [
                'nombre'                  => 'Otro',
                'tipo_base'               => Ausencia::TIPO_OTRO,
                'es_remunerada'           => false,
                'afecta_nomina'           => false,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
            ],
        ];

        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        foreach ($tenants as $tenant) {
            foreach ($motivosBase as $motivo) {
                MotivoAusencia::updateOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'nombre'    => $motivo['nombre'],
                    ],
                    array_merge($motivo, [
                        'tenant_id' => $tenant->id,
                        'estado'    => true,
                    ])
                );
            }
        }

        $this->command->info(' ✓ MotivoAusenciaSeeder: ' . count($motivosBase) . ' motivos × ' . $tenants->count() . ' tenants');
    }
}
