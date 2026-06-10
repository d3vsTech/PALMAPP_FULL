<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\TipoHoraExtra;
use Illuminate\Database\Seeder;

/**
 * Sembra el catálogo de 7 tipos de hora extra colombianos por tenant activo.
 * Porcentajes según Código Sustantivo del Trabajo (arts. 168, 179) y
 * Ley 789/2002 (art. 26).
 *
 * Idempotente: usa updateOrCreate sobre (tenant_id, codigo).
 */
class TipoHoraExtraSeeder extends Seeder
{
    public function run(): void
    {
        $tiposBase = [
            [
                'codigo'             => TipoHoraExtra::CODIGO_HED,
                'nombre'             => 'Hora Extra Diurna (6am-9pm)',
                'porcentaje_recargo' => 25.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => false,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Lunes a sábado 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HEN,
                'nombre'             => 'Hora Extra Nocturna (9pm-6am)',
                'porcentaje_recargo' => 75.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => false,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Lunes a sábado 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_RN,
                'nombre'             => 'Recargo Nocturno',
                'porcentaje_recargo' => 35.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => false,
                'es_extra'           => false,
                'paga_hora_completa' => false,
                'descripcion'        => 'Lunes a sábado 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HRD,
                'nombre'             => 'Hora Ordinaria Dominical/Festivo',
                'porcentaje_recargo' => 90.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => true,
                'es_extra'           => false,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HEDF,
                'nombre'             => 'Hora Extra Diurna Dominical/Festivo',
                'porcentaje_recargo' => 115.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => true,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HENF,
                'nombre'             => 'Hora Extra Nocturna Dominical/Festivo',
                'porcentaje_recargo' => 165.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => true,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_RND,
                'nombre'             => 'Recargo Nocturno Dominical/Festivo',
                'porcentaje_recargo' => 125.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => true,
                'es_extra'           => false,
                'paga_hora_completa' => false,
                'descripcion'        => 'Domingos y festivos 9:00 PM - 6:00 AM',
            ],
        ];

        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        foreach ($tenants as $tenant) {
            foreach ($tiposBase as $tipo) {
                TipoHoraExtra::updateOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'codigo'    => $tipo['codigo'],
                    ],
                    array_merge($tipo, [
                        'tenant_id' => $tenant->id,
                        'estado'    => true,
                    ])
                );
            }
        }

        $this->command->info(' ✓ TipoHoraExtraSeeder: ' . count($tiposBase) . ' tipos × ' . $tenants->count() . ' tenants');
    }
}
