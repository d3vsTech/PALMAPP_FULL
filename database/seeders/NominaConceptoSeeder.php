<?php

namespace Database\Seeders;

use App\Models\NominaConcepto;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Sembra el catálogo de conceptos de nómina según la normatividad colombiana.
 *
 * Se divide en dos grupos:
 *   - ACTIVOS por defecto: los aplica el motor automáticamente (SALUD, PENSION,
 *     y los seis tramos del Fondo de Solidaridad Pensional según IBC en SMLV).
 *   - PLANTILLA inactiva: catálogo precargado para que el admin active y configure
 *     desde Configuración → Nómina cuando el negocio los necesite.
 *
 * El subsidio de transporte NO va aquí: es columna directa en `nomina_empleado`
 * (decisión documentada en docs/API_NOMINA.md y plan de rediseño).
 *
 * Idempotente con updateOrCreate sobre (tenant_id, codigo).
 */
class NominaConceptoSeeder extends Seeder
{
    public function run(): void
    {
        $conceptos = array_merge($this->activosPorDefecto(), $this->plantillaInactiva());

        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        foreach ($tenants as $tenant) {
            foreach ($conceptos as $concepto) {
                NominaConcepto::updateOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'codigo'    => $concepto['codigo'],
                    ],
                    array_merge($concepto, ['tenant_id' => $tenant->id])
                );
            }
        }

        $total = count($conceptos);
        $this->command->info(" ✓ NominaConceptoSeeder: {$total} conceptos × {$tenants->count()} tenants");
    }

    /**
     * Conceptos que el motor de cálculo aplica automáticamente.
     */
    private function activosPorDefecto(): array
    {
        return [
            // ─── Deducciones legales obligatorias ───
            [
                'codigo'           => 'SALUD',
                'nombre'           => 'Descuento Salud (4%)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'SALUD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 4.0000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => true,
                'activo'           => true,
            ],
            [
                'codigo'           => 'PENSION',
                'nombre'           => 'Descuento Pensión (4%)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'PENSION',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 4.0000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => true,
                'activo'           => true,
            ],

            // ─── Fondo de Solidaridad Pensional (Ley 100/1993 art. 27, modif. Ley 797/2003) ───
            // El motor aplica UN SOLO tramo según el IBC en SMLV.
            [
                'codigo'           => 'FSP_1',
                'nombre'           => 'Fondo Solidaridad Pensional (>4 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 1.0000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
            [
                'codigo'           => 'FSP_2',
                'nombre'           => 'Fondo Solidaridad Pensional (>16 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 1.2000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
            [
                'codigo'           => 'FSP_3',
                'nombre'           => 'Fondo Solidaridad Pensional (>17 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 1.4000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
            [
                'codigo'           => 'FSP_4',
                'nombre'           => 'Fondo Solidaridad Pensional (>18 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 1.6000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
            [
                'codigo'           => 'FSP_5',
                'nombre'           => 'Fondo Solidaridad Pensional (>19 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 1.8000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
            [
                'codigo'           => 'FSP_6',
                'nombre'           => 'Fondo Solidaridad Pensional (>20 SMLV)',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'FONDO_SOLIDARIDAD',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 2.0000,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true,
            ],
        ];
    }

    /**
     * Catálogo precargado, inactivo por defecto. El admin lo activa y ajusta
     * el valor_referencia desde Configuración → Nómina cuando lo necesite.
     */
    private function plantillaInactiva(): array
    {
        return [
            // ─── Deducciones legales adicionales ───
            [
                'codigo'           => 'RETEFUENTE',
                'nombre'           => 'Retención en la Fuente',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'FORMULA',
                'valor_referencia' => 0,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'EMBARGO',
                'nombre'           => 'Embargo Judicial',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'EMBARGO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],

            // ─── Deducciones voluntarias ───
            [
                'codigo'           => 'LIBRANZA',
                'nombre'           => 'Libranza (préstamo bancario)',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'LIBRANZA',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'CUOTA_SINDICAL',
                'nombre'           => 'Cuota Sindical',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 0,
                'base_calculo'    => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'AFC',
                'nombre'           => 'Aporte Voluntario AFC',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'PENSION_VOL',
                'nombre'           => 'Aporte Pensión Voluntaria',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'DCTO_ADELANTO',
                'nombre'           => 'Descuento Adelantos / Préstamo',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'PRESTAMO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true, // activo: lo usa la UI ("DCTO ADELANTOS +Agregar")
            ],
            [
                'codigo'           => 'AHORRO',
                'nombre'           => 'Ahorro Voluntario',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'AHORRO_VOLUNTARIO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true, // activo: lo usa la UI ("AHORROS +Agregar")
            ],

            // ─── Bonificaciones ───
            [
                'codigo'           => 'AUX_ALIMENTACION',
                'nombre'           => 'Auxilio de Alimentación',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'ALIMENTACION',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'BON_PRODUCTIVIDAD',
                'nombre'           => 'Bonificación por Productividad',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'PRODUCTIVIDAD',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'BON_ANTIGUEDAD',
                'nombre'           => 'Bonificación por Antigüedad',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'ANTIGUEDAD',
                'operacion'        => 'SUMA',
                'calculo'          => 'PORCENTAJE',
                'valor_referencia' => 0,
                'base_calculo'    => 'SALARIO_BASE',
                'aplica_a'         => 'FIJO',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'COMISIONES',
                'nombre'           => 'Comisiones por Ventas',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'PRIMA_EXTRALEGAL',
                'nombre'           => 'Prima Extralegal',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'AUX_EDUCATIVO',
                'nombre'           => 'Auxilio Educativo',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => false,
            ],
            [
                'codigo'           => 'BONIFICACION',
                'nombre'           => 'Bonificación (genérica)',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'valor_referencia' => 0,
                'base_calculo'    => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'es_obligatorio'   => false,
                'activo'           => true, // activo: lo usa la UI ("BONIFICACIÓN" input abierto)
            ],
        ];
    }
}
