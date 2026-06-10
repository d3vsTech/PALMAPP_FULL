<?php

namespace Database\Seeders;

use App\Models\NominaConcepto;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Sembra el catálogo de conceptos de nómina según la normatividad colombiana.
 *
 * Se divide en dos grupos:
 *   - ACTIVOS por defecto: los aplica el motor automáticamente (SALUD, PENSION, ARL,
 *     y los seis tramos del Fondo de Solidaridad Pensional según IBC en SMLV).
 *   - PLANTILLA inactiva: catálogo precargado para que el admin active y configure
 *     desde Configuración → Nómina cuando el negocio los necesite.
 *
 * Los porcentajes vigentes y la vigencia (`porcentaje_empleado`, `porcentaje_empresa`,
 * `vigente_desde`, `vigente_hasta`) viven en la misma tabla `nomina_concepto`:
 * la tabla auxiliar `nomina_tabla_legal` fue consolidada (ver migración
 * 2026_06_03_000007_consolidate_tabla_legal_into_nomina_concepto.php).
 *
 * Idempotente con updateOrCreate sobre (tenant_id, codigo).
 */
class NominaConceptoSeeder extends Seeder
{
    private const VIGENCIA_INICIAL = '2022-12-31';

    public function run(): void
    {
        $tenants = Tenant::where('estado', 'ACTIVO')->get();
        $total = 0;

        foreach ($tenants as $tenant) {
            $total = $this->sembrarParaTenant($tenant);
        }

        $this->command->info(" ✓ NominaConceptoSeeder: {$total} conceptos × {$tenants->count()} tenants");
    }

    /**
     * Siembra los conceptos para un tenant. Idempotente vía updateOrCreate.
     *
     * @param  Tenant  $tenant
     * @param  bool    $soloActivos  Si es true siembra solo los conceptos activos por
     *                               defecto (SALUD, PENSION, ARL, FSP_*). Si es false
     *                               siembra también la plantilla inactiva. Default false.
     * @return int Cantidad de conceptos sembrados.
     */
    public function sembrarParaTenant(Tenant $tenant, bool $soloActivos = false): int
    {
        $conceptos = $soloActivos
            ? $this->activosPorDefecto()
            : array_merge($this->activosPorDefecto(), $this->plantillaInactiva());

        foreach ($conceptos as $concepto) {
            NominaConcepto::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'codigo'    => $concepto['codigo'],
                ],
                array_merge($concepto, ['tenant_id' => $tenant->id])
            );
        }

        return count($conceptos);
    }

    /**
     * Conceptos que el motor de cálculo aplica automáticamente.
     */
    private function activosPorDefecto(): array
    {
        return [
            // ─── Aportes legales (empleado + empresa) ───
            [
                'codigo'                => 'SALUD',
                'nombre'                => 'Salud',
                'tipo'                  => 'APORTE_LEGAL',
                'subtipo'               => 'SALUD',
                'operacion'             => 'RESTA',
                'calculo'               => 'PORCENTAJE',
                'valor_referencia'      => 4.0000,
                'base_calculo'          => 'TOTAL_DEVENGADO',
                'aplica_a'              => 'AMBOS',
                'es_obligatorio'        => true,
                'activo'                => true,
                'porcentaje_empleado'   => 4.00,
                'porcentaje_empresa'    => 8.50,
                'vigente_desde'         => self::VIGENCIA_INICIAL,
                'vigente_hasta'         => null,
                'afecta_salario_minimo' => false,
                'tipo_remuneracion'     => 'REMUNERADO',
            ],
            [
                'codigo'                => 'PENSION',
                'nombre'                => 'Pensión',
                'tipo'                  => 'APORTE_LEGAL',
                'subtipo'               => 'PENSION',
                'operacion'             => 'RESTA',
                'calculo'               => 'PORCENTAJE',
                'valor_referencia'      => 4.0000,
                'base_calculo'          => 'TOTAL_DEVENGADO',
                'aplica_a'              => 'AMBOS',
                'es_obligatorio'        => true,
                'activo'                => true,
                'porcentaje_empleado'   => 4.00,
                'porcentaje_empresa'    => 12.00,
                'vigente_desde'         => self::VIGENCIA_INICIAL,
                'vigente_hasta'         => null,
                'afecta_salario_minimo' => false,
                'tipo_remuneracion'     => 'REMUNERADO',
            ],
            [
                'codigo'                => 'ARL',
                'nombre'                => 'ARL',
                'tipo'                  => 'APORTE_LEGAL',
                'subtipo'               => 'ARL',
                'operacion'             => 'RESTA',
                'calculo'               => 'PORCENTAJE',
                'valor_referencia'      => 0.0000,
                'base_calculo'          => 'TOTAL_DEVENGADO',
                'aplica_a'              => 'AMBOS',
                'es_obligatorio'        => false,
                'activo'                => true,
                'porcentaje_empleado'   => 0.00,
                'porcentaje_empresa'    => 0.522, // riesgo I (valor típico — el tenant ajusta según clasificación)
                'vigente_desde'         => self::VIGENCIA_INICIAL,
                'vigente_hasta'         => null,
                'afecta_salario_minimo' => false,
                'tipo_remuneracion'     => 'REMUNERADO',
            ],

            // ─── Fondo de Solidaridad Pensional (Ley 100/1993 art. 27, modif. Ley 797/2003) ───
            // Comentado: solo se provisionan los 3 conceptos base (SALUD, PENSION, ARL).
            // Activar manualmente si el tenant tiene empleados que superen 4 SMLV.
            // $this->seedFsp('FSP_1', '>4 SMLV',  1.00),
            // $this->seedFsp('FSP_2', '>16 SMLV', 1.20),
            // $this->seedFsp('FSP_3', '>17 SMLV', 1.40),
            // $this->seedFsp('FSP_4', '>18 SMLV', 1.60),
            // $this->seedFsp('FSP_5', '>19 SMLV', 1.80),
            // $this->seedFsp('FSP_6', '>20 SMLV', 2.00),
        ];
    }

    private function seedFsp(string $codigo, string $tramo, float $porcentaje): array
    {
        return [
            'codigo'                => $codigo,
            'nombre'                => "Fondo Solidaridad Pensional ({$tramo})",
            'tipo'                  => 'DEDUCCION_LEGAL',
            'subtipo'               => 'FONDO_SOLIDARIDAD',
            'operacion'             => 'RESTA',
            'calculo'               => 'PORCENTAJE',
            'valor_referencia'      => $porcentaje,
            'base_calculo'          => 'TOTAL_DEVENGADO',
            'aplica_a'              => 'AMBOS',
            'es_obligatorio'        => false,
            'activo'                => true,
            'porcentaje_empleado'   => $porcentaje,
            'porcentaje_empresa'    => 0.00,
            'vigente_desde'         => self::VIGENCIA_INICIAL,
            'vigente_hasta'         => null,
            'afecta_salario_minimo' => false,
            'tipo_remuneracion'     => 'REMUNERADO',
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
            $this->base([
                'codigo'           => 'RETEFUENTE',
                'nombre'           => 'Retención en la Fuente',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'FORMULA',
                'base_calculo'     => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'EMBARGO',
                'nombre'           => 'Embargo Judicial',
                'tipo'             => 'DEDUCCION_LEGAL',
                'subtipo'          => 'EMBARGO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),

            // ─── Deducciones voluntarias ───
            $this->base([
                'codigo'           => 'LIBRANZA',
                'nombre'           => 'Libranza (préstamo bancario)',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'LIBRANZA',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'CUOTA_SINDICAL',
                'nombre'           => 'Cuota Sindical',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'PORCENTAJE',
                'base_calculo'     => 'TOTAL_DEVENGADO',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'AFC',
                'nombre'           => 'Aporte Voluntario AFC',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'PENSION_VOL',
                'nombre'           => 'Aporte Pensión Voluntaria',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'DCTO_ADELANTO',
                'nombre'           => 'Descuento Adelantos / Préstamo',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'PRESTAMO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => true, // lo usa la UI ("DCTO ADELANTOS +Agregar")
            ]),
            $this->base([
                'codigo'           => 'AHORRO',
                'nombre'           => 'Ahorro Voluntario',
                'tipo'             => 'DEDUCCION_VOLUNTARIA',
                'subtipo'          => 'AHORRO_VOLUNTARIO',
                'operacion'        => 'RESTA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => true, // lo usa la UI ("AHORROS +Agregar")
            ]),

            // ─── Bonificaciones ───
            $this->base([
                'codigo'           => 'AUX_ALIMENTACION',
                'nombre'           => 'Auxilio de Alimentación',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'ALIMENTACION',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'BON_PRODUCTIVIDAD',
                'nombre'           => 'Bonificación por Productividad',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'PRODUCTIVIDAD',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'BON_ANTIGUEDAD',
                'nombre'           => 'Bonificación por Antigüedad',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'ANTIGUEDAD',
                'operacion'        => 'SUMA',
                'calculo'          => 'PORCENTAJE',
                'base_calculo'     => 'SALARIO_BASE',
                'aplica_a'         => 'FIJO',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'COMISIONES',
                'nombre'           => 'Comisiones por Ventas',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'PRIMA_EXTRALEGAL',
                'nombre'           => 'Prima Extralegal',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'AUX_EDUCATIVO',
                'nombre'           => 'Auxilio Educativo',
                'tipo'             => 'BONIFICACION_FIJA',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => false,
            ]),
            $this->base([
                'codigo'           => 'BONIFICACION',
                'nombre'           => 'Bonificación (genérica)',
                'tipo'             => 'BONIFICACION_VARIABLE',
                'subtipo'          => 'OTRO',
                'operacion'        => 'SUMA',
                'calculo'          => 'VALOR_FIJO',
                'base_calculo'     => 'MANUAL',
                'aplica_a'         => 'AMBOS',
                'activo'           => true, // lo usa la UI ("BONIFICACIÓN" input abierto)
            ]),
        ];
    }

    /**
     * Defaults para conceptos de la plantilla inactiva (sin porcentajes ni vigencia).
     */
    private function base(array $concepto): array
    {
        return array_merge([
            'valor_referencia'      => 0,
            'es_obligatorio'        => false,
            'porcentaje_empleado'   => null,
            'porcentaje_empresa'    => null,
            'vigente_desde'         => null,
            'vigente_hasta'         => null,
            'afecta_salario_minimo' => false,
            'tipo_remuneracion'     => 'REMUNERADO',
        ], $concepto);
    }
}
