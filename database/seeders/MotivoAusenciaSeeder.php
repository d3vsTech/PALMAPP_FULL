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
        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        $total = 0;
        foreach ($tenants as $tenant) {
            $total += $this->sembrarParaTenant($tenant);
        }

        $this->command->info(' ✓ MotivoAusenciaSeeder: ' . count($this->motivosBase()) . ' motivos × ' . $tenants->count() . ' tenants');
    }

    public function sembrarParaTenant(Tenant $tenant): int
    {
        $motivos = $this->motivosBase();

        foreach ($motivos as $motivo) {
            MotivoAusencia::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'tipo_base' => $motivo['tipo_base'],
                ],
                array_merge($motivo, [
                    'tenant_id' => $tenant->id,
                    'estado'    => true,
                ])
            );
        }

        return count($motivos);
    }

    private function motivosBase(): array
    {
        return [
            [
                'nombre'                  => 'Incapacidad EPS - General',
                'tipo_base'               => Ausencia::TIPO_INCAPACIDAD_EPS,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 66.67,
                'requiere_soporte'        => true,
                'color'                   => '#3b82f6',
                'condicion'               => 'Día 1-2: 100% / Día 3-90: 66.67%',
                'norma_legal'             => 'Art. 227 CST + Dec. 780',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Incapacidad ARL - Accidente laboral',
                'tipo_base'               => Ausencia::TIPO_INCAPACIDAD_ARL,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
                'color'                   => '#0ea5e9',
                'condicion'               => 'Desde día 2',
                'norma_legal'             => 'Ley 1562 de 2012',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Licencia de maternidad',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_MATERNIDAD,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
                'color'                   => '#ec4899',
                'condicion'               => '18 semanas',
                'norma_legal'             => 'Ley 1822 de 2017',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => true,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Licencia de paternidad',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_PATERNIDAD,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => true,
                'color'                   => '#a855f7',
                'condicion'               => '2 semanas',
                'norma_legal'             => 'Ley 2114 de 2021',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => true,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Licencia por Luto',
                'tipo_base'               => Ausencia::TIPO_LICENCIA_LUTO,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
                'color'                   => '#64748b',
                'condicion'               => '5 días hábiles',
                'norma_legal'             => 'Ley 1280 de 2009',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => true,
                'afecta_prestaciones'     => true,
            ],
            [
                'nombre'                  => 'Permiso remunerado',
                'tipo_base'               => Ausencia::TIPO_PERMISO_REMUNERADO,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
                'color'                   => '#22c55e',
                'condicion'               => 'Según empresa',
                'norma_legal'             => 'CST Art. 57',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => true,
                'afecta_prestaciones'     => true,
            ],
            [
                'nombre'                  => 'Permiso no remunerado',
                'tipo_base'               => Ausencia::TIPO_PERMISO_NO_REMUNERADO,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
                'color'                   => '#ef4444',
                'condicion'               => 'Suspensión',
                'norma_legal'             => 'CST Art. 51',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => false,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Ausencia injustificada',
                'tipo_base'               => Ausencia::TIPO_AUSENCIA_INJUSTIFICADA,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
                'color'                   => '#dc2626',
                'condicion'               => 'Sin soporte',
                'norma_legal'             => 'CST',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => false,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Calamidad doméstica',
                'tipo_base'               => Ausencia::TIPO_CALAMIDAD_DOMESTICA,
                'es_remunerada'           => true,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 100.00,
                'requiere_soporte'        => false,
                'color'                   => '#f97316',
                'condicion'               => '3 días',
                'norma_legal'             => 'Ley 1010 de 2006',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => true,
                'afecta_parafiscales'     => true,
                'afecta_prestaciones'     => true,
            ],
            [
                'nombre'                  => 'Suspensión disciplinaria',
                'tipo_base'               => Ausencia::TIPO_SUSPENSION_DISCIPLINARIA,
                'es_remunerada'           => false,
                'afecta_nomina'           => true,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
                'color'                   => '#71717a',
                'condicion'               => 'Según falta',
                'norma_legal'             => 'CST Art. 112',
                'formula_calculo'         => null,
                'afecta_seguridad_social' => false,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
            [
                'nombre'                  => 'Otro',
                'tipo_base'               => Ausencia::TIPO_OTRO,
                'es_remunerada'           => false,
                'afecta_nomina'           => false,
                'porcentaje_pago_default' => 0.00,
                'requiere_soporte'        => false,
                'color'                   => '#94a3b8',
                'condicion'               => null,
                'norma_legal'             => null,
                'formula_calculo'         => null,
                'afecta_seguridad_social' => false,
                'afecta_parafiscales'     => false,
                'afecta_prestaciones'     => false,
            ],
        ];
    }
}
