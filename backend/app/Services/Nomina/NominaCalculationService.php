<?php

namespace App\Services\Nomina;

use App\Models\Ausencia;
use App\Models\CosechaCuadrilla;
use App\Models\Empleado;
use App\Models\HoraExtra;
use App\Models\Jornal;
use App\Models\Nomina;
use App\Models\NominaConcepto;
use App\Models\NominaEmpleado;
use App\Models\NominaEmpleadoConcepto;
use App\Models\Operacion;
use App\Models\PrecioCosecha;
use App\Models\PromedioLote;
use App\Models\TenantConfig;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Núcleo de cálculo de la nómina por empleado.
 *
 * Reglas legales colombianas aplicadas (ver docs/CONTEXTO.md §6.6, §6.9, §6.13):
 *   - Salud y Pensión: 4% cada uno sobre IBC (= total devengado sin subsidio transporte).
 *   - Fondo de Solidaridad Pensional: 1%–2% según tramo IBC en SMLV (>4 SMLV aplica).
 *   - Subsidio de transporte: si salario_base ≤ 2 SMLV, monto proporcional al período.
 *   - Empleados FIJO: salario_base proporcional × días trabajados.
 *   - Empleados VARIABLE: Σ jornales + Σ cosechas del rango (operaciones APROBADAS).
 *   - Ausencias no remuneradas descuentan días al FIJO; las remuneradas suman a incapacidades.
 *   - Horas extras (es_extra=true) y recargos (es_extra=false) suman al devengado, separados
 *     en columnas distintas para cumplir reportes legales (UGPP/DIAN).
 */
class NominaCalculationService
{
    /** Empleadores asumen incapacidad EPS al 66.67% desde el día 3. (CST + Decreto 780/2016) */
    public const PORCENTAJE_INCAPACIDAD_EPS_DESDE_DIA_3 = 66.67;

    /**
     * Calcula sin persistir. Ideal para abrir el editor de liquidación
     * con valores propuestos.
     *
     * @return array{
     *   dias_trabajados:int,
     *   dias_periodo:int,
     *   salario_base:float,
     *   total_jornales:float,
     *   total_cosecha:float,
     *   total_horas_extra:float,
     *   total_recargos:float,
     *   total_incapacidades:float,
     *   dias_ausencia_descontados:float,
     *   total_ausencias_descuento:float,
     *   total_devengado:float,
     *   subsidio_transporte:float,
     *   conceptos_legales:array<int,array{codigo:string,nombre:string,valor:float,porcentaje:float,base:float}>,
     *   total_deducciones_legales:float,
     *   total_neto_propuesto:float
     * }
     */
    public function previewLiquidacion(NominaEmpleado $ne): array
    {
        $nomina   = $ne->nomina ?? Nomina::findOrFail($ne->nomina_id);
        $empleado = $ne->empleado ?? Empleado::findOrFail($ne->empleado_id);
        $config   = $this->tenantConfig($ne->tenant_id);

        $diasPeriodo = $this->diasPeriodo($nomina);
        $inicio = Carbon::parse($nomina->fecha_inicio);
        $fin    = Carbon::parse($nomina->fecha_fin);

        // 1) Ausencias del rango → días no remunerados (descuento) + remuneradas (incapacidades)
        $ausenciasInfo = $this->procesarAusencias($empleado, $inicio, $fin, $diasPeriodo);

        // 2) Días trabajados
        $diasTrabajados = $ne->isFijo()
            ? max(0, $diasPeriodo - $ausenciasInfo['dias_no_remunerados'])
            : $this->contarDiasConJornal($empleado, $inicio, $fin);

        // 3) Devengado base (sin extras todavía)
        $totalJornales = 0.0;
        $totalCosecha  = 0.0;
        $devengadoBase = 0.0;

        if ($ne->isFijo()) {
            $devengadoBase = (float) $empleado->salario_base * ($diasTrabajados / $diasPeriodo);
        } else {
            $totalJornales = $this->sumarJornales($empleado, $inicio, $fin);
            $totalCosecha  = $this->sumarCosecha($empleado, $inicio, $fin);
            $devengadoBase = $totalJornales + $totalCosecha;
        }

        // 4) Horas extras y recargos
        [$totalHorasExtra, $totalRecargos] = $this->sumarHorasExtraYRecargos($empleado, $inicio, $fin);

        // 5) Total devengado (sin subsidio de transporte — el subsidio NO es salario)
        $totalDevengado = round(
            $devengadoBase
                + $ausenciasInfo['total_remunerado']
                + $totalHorasExtra
                + $totalRecargos,
            2
        );

        // 6) Subsidio de transporte (si aplica)
        $subsidioTransporte = $this->calcularSubsidioTransporte(
            $empleado,
            $config,
            $diasTrabajados,
            $diasPeriodo
        );

        // 7) Conceptos legales (SALUD, PENSION, FSP)
        $conceptosLegales = $this->calcularConceptosLegales(
            $ne->tenant_id,
            $ne->salario_tipo,
            $totalDevengado,
            (float) $config->salario_minimo_vigente,
            $diasPeriodo,
            $fin
        );

        $totalDeduccionesLegales = array_sum(array_column($conceptosLegales, 'valor'));
        $totalNeto = round($totalDevengado + $subsidioTransporte - $totalDeduccionesLegales, 2);

        return [
            'dias_periodo'              => $diasPeriodo,
            'dias_trabajados'           => $diasTrabajados,
            'salario_base'              => (float) $empleado->salario_base,
            'total_jornales'            => round($totalJornales, 2),
            'total_cosecha'             => round($totalCosecha, 2),
            'total_horas_extra'         => round($totalHorasExtra, 2),
            'total_recargos'            => round($totalRecargos, 2),
            'total_incapacidades'       => round($ausenciasInfo['total_remunerado'], 2),
            'dias_ausencia_descontados' => $ausenciasInfo['dias_no_remunerados'],
            'total_ausencias_descuento' => round($ausenciasInfo['total_descuento'], 2),
            'total_devengado'           => $totalDevengado,
            'subsidio_transporte'       => round($subsidioTransporte, 2),
            'conceptos_legales'         => $conceptosLegales,
            'total_deducciones_legales' => round($totalDeduccionesLegales, 2),
            'total_neto_propuesto'      => $totalNeto,
        ];
    }

    /**
     * Ejecuta la liquidación: persiste todos los conceptos (legales + manuales),
     * snapshots de cargo/predio/SMLV, y marca el empleado como LIQUIDADO.
     *
     * @param array{
     *   dias_trabajados?:int,
     *   bonificaciones?:array<int,array{nombre:string,valor:float,observacion?:string}>,
     *   deducciones_voluntarias?:array<int,array{concepto_id:int,valor:float,observacion?:string}>
     * } $payload
     */
    public function liquidar(NominaEmpleado $ne, array $payload, int $userId): NominaEmpleado
    {
        if ($ne->nomina->isCerrada()) {
            throw new \DomainException('NOMINA_CERRADA: la nómina ya fue cerrada y no admite nuevas liquidaciones.');
        }

        return DB::transaction(function () use ($ne, $payload, $userId) {
            $nomina   = $ne->nomina;
            $empleado = $ne->empleado;
            $config   = $this->tenantConfig($ne->tenant_id);

            $preview = $this->previewLiquidacion($ne);
            $diasTrabajados = $payload['dias_trabajados'] ?? $preview['dias_trabajados'];

            // Re-calcular si dias_trabajados llegó manualmente (afecta FIJO)
            if ($ne->isFijo() && $diasTrabajados !== $preview['dias_trabajados']) {
                $devengadoBase = (float) $empleado->salario_base * ($diasTrabajados / $preview['dias_periodo']);
                $totalDevengado = round(
                    $devengadoBase
                        + $preview['total_incapacidades']
                        + $preview['total_horas_extra']
                        + $preview['total_recargos'],
                    2
                );
                $subsidio = $this->calcularSubsidioTransporte(
                    $empleado, $config, $diasTrabajados, $preview['dias_periodo']
                );
                $conceptosLegales = $this->calcularConceptosLegales(
                    $ne->tenant_id,
                    $ne->salario_tipo,
                    $totalDevengado,
                    (float) $config->salario_minimo_vigente,
                    $preview['dias_periodo'],
                    Carbon::parse($nomina->fecha_fin)
                );
                $totalDeduccionesLegales = array_sum(array_column($conceptosLegales, 'valor'));
            } else {
                $totalDevengado = $preview['total_devengado'];
                $subsidio = $preview['subsidio_transporte'];
                $conceptosLegales = $preview['conceptos_legales'];
                $totalDeduccionesLegales = $preview['total_deducciones_legales'];
            }

            // Limpiar conceptos previos (re-liquidación borra y reescribe)
            NominaEmpleadoConcepto::where('nomina_empleado_id', $ne->id)->delete();

            // 1) Persistir conceptos legales (no manuales)
            foreach ($conceptosLegales as $cl) {
                NominaEmpleadoConcepto::create([
                    'tenant_id'           => $ne->tenant_id,
                    'nomina_empleado_id'  => $ne->id,
                    'concepto_id'         => $cl['concepto_id'],
                    'operacion'           => 'RESTA',
                    'valor_calculado'     => $cl['valor'],
                    'porcentaje_aplicado' => $cl['porcentaje'],
                    'base_aplicada'       => $cl['base'],
                    'es_manual'           => false,
                ]);
            }

            // 2) Persistir bonificaciones manuales del payload
            $totalBonificaciones = 0.0;
            $conceptoBonificacionGenerica = NominaConcepto::where('tenant_id', $ne->tenant_id)
                ->where('codigo', 'BONIFICACION')
                ->first();

            foreach (($payload['bonificaciones'] ?? []) as $bon) {
                $valor = (float) $bon['valor'];
                if ($valor <= 0 || ! $conceptoBonificacionGenerica) {
                    continue;
                }
                NominaEmpleadoConcepto::create([
                    'tenant_id'          => $ne->tenant_id,
                    'nomina_empleado_id' => $ne->id,
                    'concepto_id'        => $conceptoBonificacionGenerica->id,
                    'operacion'          => 'SUMA',
                    'valor_calculado'    => $valor,
                    'es_manual'          => true,
                    'observacion'        => $bon['nombre'] ?? ($bon['observacion'] ?? null),
                ]);
                $totalBonificaciones += $valor;
            }

            // 3) Persistir deducciones voluntarias (referenciando concepto_id)
            $totalDeduccionesVoluntarias = 0.0;
            foreach (($payload['deducciones_voluntarias'] ?? []) as $dv) {
                $valor = (float) $dv['valor'];
                if ($valor <= 0) {
                    continue;
                }
                $concepto = NominaConcepto::where('tenant_id', $ne->tenant_id)
                    ->where('id', $dv['concepto_id'])
                    ->where('tipo', 'DEDUCCION_VOLUNTARIA')
                    ->first();
                if (! $concepto) {
                    throw new InvalidArgumentException("Concepto de deducción voluntaria inválido: {$dv['concepto_id']}");
                }
                NominaEmpleadoConcepto::create([
                    'tenant_id'          => $ne->tenant_id,
                    'nomina_empleado_id' => $ne->id,
                    'concepto_id'        => $concepto->id,
                    'operacion'          => 'RESTA',
                    'valor_calculado'    => $valor,
                    'es_manual'          => true,
                    'observacion'        => $dv['observacion'] ?? null,
                ]);
                $totalDeduccionesVoluntarias += $valor;
            }

            // 4) Sumar totales finales
            $totalDeducciones = round($totalDeduccionesLegales + $totalDeduccionesVoluntarias, 2);
            $totalNeto = round(
                $totalDevengado + $subsidio + $totalBonificaciones - $totalDeducciones,
                2
            );

            // 5) Persistir el NominaEmpleado con todos los snapshots
            $ne->update([
                'dias_trabajados'             => $diasTrabajados,
                'salario_base'                => $empleado->salario_base,
                'total_jornales'              => $preview['total_jornales'],
                'total_cosecha'               => $preview['total_cosecha'],
                'dias_ausencia_descontados'   => $preview['dias_ausencia_descontados'],
                'total_ausencias_descuento'   => $preview['total_ausencias_descuento'],
                'total_ausencias_remunerado'  => $preview['total_incapacidades'],
                'total_incapacidades'         => $preview['total_incapacidades'],
                'total_horas_extra'           => $preview['total_horas_extra'],
                'total_recargos'              => $preview['total_recargos'],
                'subsidio_transporte'         => $subsidio,
                'cargo_snapshot'              => $empleado->cargo,
                'predio_snapshot'             => $empleado->predio?->nombre,
                'salario_minimo_snapshot'     => $config->salario_minimo_vigente,
                'total_devengado'             => $totalDevengado,
                'total_bonificaciones'        => round($totalBonificaciones, 2),
                'total_deducciones'           => $totalDeducciones,
                'total_neto'                  => $totalNeto,
                'estado'                      => NominaEmpleado::ESTADO_LIQUIDADO,
                'liquidado_por'               => $userId,
                'liquidado_at'                => now(),
            ]);

            // 6) Recalcular totales globales de la nómina
            $this->recalcularTotalesNomina($nomina);

            return $ne->fresh(['empleado', 'conceptos.concepto', 'liquidadoPor']);
        });
    }

    /**
     * Recalcula los totales agregados de la nómina (suma de sus empleados liquidados).
     */
    public function recalcularTotalesNomina(Nomina $nomina): void
    {
        $agregados = NominaEmpleado::where('nomina_id', $nomina->id)
            ->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN salario_tipo = 'FIJO' THEN total_devengado ELSE 0 END), 0) as total_fijos,
                COALESCE(SUM(CASE WHEN salario_tipo = 'VARIABLE' THEN total_devengado ELSE 0 END), 0) as total_variables,
                COALESCE(SUM(total_bonificaciones), 0) as total_bonificaciones,
                COALESCE(SUM(total_deducciones), 0) as total_deducciones,
                COALESCE(SUM(total_neto), 0) as total_neto
            ")
            ->first();

        $nomina->update([
            'total_fijos'          => $agregados->total_fijos,
            'total_variables'      => $agregados->total_variables,
            'total_bonificaciones' => $agregados->total_bonificaciones,
            'total_deducciones'    => $agregados->total_deducciones,
            'total_general'        => $agregados->total_neto,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────────────────────────────

    private function tenantConfig(int $tenantId): TenantConfig
    {
        $config = TenantConfig::where('tenant_id', $tenantId)->first();

        if (! $config || ! $config->salario_minimo_vigente) {
            throw new \DomainException(
                'CALC_ERROR: el tenant no tiene salario_minimo_vigente configurado. '
                . 'Configurarlo en /api/v1/tenant/configuracion/nomina.'
            );
        }

        return $config;
    }

    private function diasPeriodo(Nomina $nomina): int
    {
        return $nomina->tipo_pago_snapshot === Nomina::TIPO_PAGO_MENSUAL ? 30 : 15;
    }

    /**
     * Procesa ausencias APROBADAS del empleado en el rango de la nómina.
     *
     * @return array{dias_no_remunerados:int,total_descuento:float,total_remunerado:float}
     */
    private function procesarAusencias(Empleado $empleado, Carbon $inicio, Carbon $fin, int $diasPeriodo): array
    {
        $ausencias = Ausencia::where('empleado_id', $empleado->id)
            ->aprobadas()
            ->afectanNomina()
            ->enRango($inicio->toDateString(), $fin->toDateString())
            ->get();

        $diasNoRemunerados = 0;
        $totalDescuento    = 0.0;
        $totalRemunerado   = 0.0;
        $valorDia          = (float) $empleado->salario_base / 30;

        foreach ($ausencias as $a) {
            $dias = $a->getDiasEnRango($inicio, $fin);
            if ($dias === 0) {
                continue;
            }

            $porcentaje = (float) ($a->porcentaje_pago ?? 0);

            if (! $a->es_remunerada) {
                // PERMISO_NO_REMUNERADO, AUSENCIA_INJUSTIFICADA, SUSPENSION_DISCIPLINARIA
                $diasNoRemunerados += $dias;
                $totalDescuento    += $valorDia * $dias;
                continue;
            }

            // Ausencia remunerada: incapacidad o licencia
            // EPS: días 1-2 = 100%, días 3+ = 66.67%
            if ($a->tipo === Ausencia::TIPO_INCAPACIDAD_EPS) {
                $diasFullPay   = min($dias, 2);
                $diasParcial   = max(0, $dias - 2);
                $totalRemunerado += $valorDia * $diasFullPay;
                $totalRemunerado += $valorDia * $diasParcial * (self::PORCENTAJE_INCAPACIDAD_EPS_DESDE_DIA_3 / 100);
                continue;
            }

            // ARL, licencias, calamidad, permiso remunerado: aplica el % del motivo (típicamente 100%)
            $totalRemunerado += $valorDia * $dias * ($porcentaje / 100);
        }

        return [
            'dias_no_remunerados' => $diasNoRemunerados,
            'total_descuento'     => $totalDescuento,
            'total_remunerado'    => $totalRemunerado,
        ];
    }

    /**
     * Cuenta días distintos con jornales del empleado en el rango (operaciones APROBADAS).
     */
    private function contarDiasConJornal(Empleado $empleado, Carbon $inicio, Carbon $fin): int
    {
        return (int) Jornal::where('empleado_id', $empleado->id)
            ->where('estado', true)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->join('operaciones', 'jornales.operacion_id', '=', 'operaciones.id')
            ->distinct('operaciones.fecha')
            ->count('operaciones.fecha');
    }

    /**
     * Suma valor_total de todos los jornales del empleado en el rango (PALMA + FINCA).
     */
    private function sumarJornales(Empleado $empleado, Carbon $inicio, Carbon $fin): float
    {
        return (float) Jornal::where('empleado_id', $empleado->id)
            ->where('estado', true)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->sum('valor_total');
    }

    /**
     * Calcula el pago de cosecha del empleado en el período con la fórmula:
     *   gajos_empleado × promedio_de_promedios_lote × precio_cosecha_lote
     *
     * gajos_empleado = FLOOR(gajos_efectivos / N), donde:
     *   - gajos_efectivos = gajos_reconteo si existe, si no gajos_reportados
     *   - N = cantidad de cuadrilleros activos de esa cosecha
     *
     * promedio_de_promedios = AVG(PromedioLote.promedio WHERE lote_id=X AND fecha IN período).
     * Si no hay promedios de viajes en el período, usa el baseline admin más reciente del año.
     */
    private function sumarCosecha(Empleado $empleado, Carbon $inicio, Carbon $fin): float
    {
        $cuadrillas = CosechaCuadrilla::where('empleado_id', $empleado->id)
            ->where('estado', true)
            ->with([
                'cosecha:id,lote_id,gajos_reportados,gajos_reconteo,operacion_id',
                'cosecha.operacion:id,fecha,estado',
            ])
            ->whereHas('cosecha.operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->get();

        if ($cuadrillas->isEmpty()) {
            return 0.0;
        }

        $tenantId = $empleado->tenant_id;
        $anio     = $inicio->year;
        $total    = 0.0;

        foreach ($cuadrillas as $cc) {
            $cosecha = $cc->cosecha;
            $loteId  = $cosecha->lote_id;

            // Gajos efectivos del lote completo (reconteo tiene prioridad sobre reportados)
            $gajosEfectivos = $cosecha->gajos_reconteo ?? $cosecha->gajos_reportados;
            if (! $gajosEfectivos || $gajosEfectivos <= 0) {
                continue;
            }

            // Cuadrilleros activos de esta cosecha (para la división equitativa)
            $N = $cosecha->cuadrilla()->where('estado', true)->count();
            if ($N <= 0) {
                continue;
            }

            $gajosEmpleado = (int) floor($gajosEfectivos / $N);
            if ($gajosEmpleado <= 0) {
                continue;
            }

            // Promedio de promedios del lote en el período (generados por viajes)
            $promedioPromedio = PromedioLote::where('tenant_id', $tenantId)
                ->where('lote_id', $loteId)
                ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
                ->avg('promedio');

            // Fallback: baseline admin más reciente del año si no hay promedios de viajes
            if (! $promedioPromedio) {
                $promedioPromedio = PromedioLote::where('tenant_id', $tenantId)
                    ->where('lote_id', $loteId)
                    ->where('anio', $anio)
                    ->whereNull('viaje_id')
                    ->orderByDesc('created_at')
                    ->value('promedio');
            }

            if (! $promedioPromedio) {
                continue; // Sin promedio disponible: cosecha no liquidable en este período
            }

            // Precio cosecha del lote ($/kg) para el año
            $precio = PrecioCosecha::where('tenant_id', $tenantId)
                ->where('lote_id', $loteId)
                ->where('anio', $anio)
                ->value('precio');

            if (! $precio) {
                continue; // Sin precio configurado: cosecha no liquidable
            }

            $total += round($gajosEmpleado * (float) $promedioPromedio * (float) $precio, 2);
        }

        return $total;
    }

    /**
     * @return array{0:float,1:float} [total_horas_extra, total_recargos]
     */
    private function sumarHorasExtraYRecargos(Empleado $empleado, Carbon $inicio, Carbon $fin): array
    {
        $horas = HoraExtra::where('empleado_id', $empleado->id)
            ->where('estado', HoraExtra::ESTADO_APROBADA)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->with('tipoHoraExtra')
            ->get();

        $totalExtra    = 0.0;
        $totalRecargos = 0.0;
        foreach ($horas as $h) {
            $valor = (float) ($h->valor_calculado ?? 0);
            if ($h->tipoHoraExtra?->es_extra) {
                $totalExtra += $valor;
            } else {
                $totalRecargos += $valor;
            }
        }

        return [$totalExtra, $totalRecargos];
    }

    /**
     * Subsidio de transporte: si salario_base ≤ 2 SMLV y hay días trabajados.
     * Proporcional al período.
     */
    private function calcularSubsidioTransporte(
        Empleado $empleado,
        TenantConfig $config,
        int $diasTrabajados,
        int $diasPeriodo
    ): float {
        if ($diasTrabajados <= 0 || ! $config->auxilio_transporte) {
            return 0.0;
        }

        $smlv = (float) $config->salario_minimo_vigente;
        if ((float) $empleado->salario_base > 2 * $smlv) {
            return 0.0;
        }

        $auxilioBase = (float) $config->auxilio_transporte;
        return round($auxilioBase * ($diasTrabajados / $diasPeriodo), 2);
    }

    /**
     * Calcula los conceptos legales aplicables (SALUD, PENSION, FSP).
     *
     * IBC = total_devengado del período (excluye subsidio transporte).
     * Topes: mínimo 1 SMLV proporcional, máximo 25 SMLV proporcional.
     *
     * El porcentaje se obtiene de nomina_concepto.porcentaje_empleado directamente.
     * Si el concepto no tiene porcentaje_empleado cargado, se usa valor_referencia
     * como fallback (compat con conceptos VALOR_FIJO o tenants sin porcentajes seteados).
     *
     * @return array<int,array{concepto_id:int,codigo:string,nombre:string,porcentaje:float,base:float,valor:float}>
     */
    private function calcularConceptosLegales(
        int $tenantId,
        string $salarioTipo,
        float $totalDevengado,
        float $smlv,
        int $diasPeriodo,
        Carbon $fechaReferencia
    ): array {
        $smlvPeriodo = $smlv * ($diasPeriodo / 30);
        $topeMin     = $smlvPeriodo;
        $topeMax     = 25 * $smlvPeriodo;
        $ibc         = max($topeMin, min($topeMax, $totalDevengado));

        $aplicaA = $salarioTipo === NominaEmpleado::SALARIO_FIJO
            ? ['FIJO', 'AMBOS']
            : ['VARIABLE', 'AMBOS'];

        $resultado = [];

        // SALUD y PENSION (siempre obligatorios)
        $obligatorios = NominaConcepto::where('tenant_id', $tenantId)
            ->where('activo', true)
            ->where('es_obligatorio', true)
            ->whereIn('codigo', ['SALUD', 'PENSION'])
            ->whereIn('aplica_a', $aplicaA)
            ->get();

        foreach ($obligatorios as $c) {
            $porcentaje = $this->resolverPorcentaje($c, $fechaReferencia);
            $resultado[] = [
                'concepto_id' => $c->id,
                'codigo'      => $c->codigo,
                'nombre'      => $c->nombre,
                'porcentaje'  => $porcentaje,
                'base'        => round($ibc, 2),
                'valor'       => round($ibc * $porcentaje / 100, 2),
            ];
        }

        // Fondo de Solidaridad Pensional: solo si IBC mensualizado > 4 SMLV
        $ibcMensualizado = $ibc * (30 / $diasPeriodo);
        $fspCodigo = $this->seleccionarTramoFSP($ibcMensualizado, $smlv);

        if ($fspCodigo !== null) {
            $fsp = NominaConcepto::where('tenant_id', $tenantId)
                ->where('codigo', $fspCodigo)
                ->where('activo', true)
                ->first();
            if ($fsp) {
                $porcentaje = $this->resolverPorcentaje($fsp, $fechaReferencia);
                $resultado[] = [
                    'concepto_id' => $fsp->id,
                    'codigo'      => $fsp->codigo,
                    'nombre'      => $fsp->nombre,
                    'porcentaje'  => $porcentaje,
                    'base'        => round($ibc, 2),
                    'valor'       => round($ibc * $porcentaje / 100, 2),
                ];
            }
        }

        return $resultado;
    }

    /**
     * Resuelve el porcentaje del empleado para un concepto en una fecha dada.
     * Lee directamente de nomina_concepto.porcentaje_empleado; cae a valor_referencia
     * cuando el porcentaje aún no está cargado (compat con conceptos VALOR_FIJO).
     */
    private function resolverPorcentaje(NominaConcepto $concepto, Carbon $fecha): float
    {
        return (float) ($concepto->porcentaje_empleado ?? $concepto->valor_referencia);
    }

    /**
     * Selecciona el tramo de FSP según IBC mensualizado en SMLV.
     * Retorna el código del concepto a aplicar, o null si no aplica.
     *
     * Tramos (Ley 100/1993 art. 27, modif. Ley 797/2003):
     *   >4 SMLV  →  FSP_1 (1.0%)
     *   >16 SMLV →  FSP_2 (1.2%)
     *   >17 SMLV →  FSP_3 (1.4%)
     *   >18 SMLV →  FSP_4 (1.6%)
     *   >19 SMLV →  FSP_5 (1.8%)
     *   >20 SMLV →  FSP_6 (2.0%)
     */
    private function seleccionarTramoFSP(float $ibcMensual, float $smlv): ?string
    {
        $ibcEnSmlv = $ibcMensual / $smlv;

        return match (true) {
            $ibcEnSmlv > 20 => 'FSP_6',
            $ibcEnSmlv > 19 => 'FSP_5',
            $ibcEnSmlv > 18 => 'FSP_4',
            $ibcEnSmlv > 17 => 'FSP_3',
            $ibcEnSmlv > 16 => 'FSP_2',
            $ibcEnSmlv > 4  => 'FSP_1',
            default         => null,
        };
    }
}
