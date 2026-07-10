<?php

namespace App\Services\Nomina;

use App\Models\Ausencia;
use App\Models\CosechaCuadrilla;
use App\Models\HoraExtra;
use App\Models\Jornal;
use App\Models\Nomina;
use App\Models\NominaCosechaRef;
use App\Models\NominaEmpleado;
use App\Models\NominaHoraExtraRef;
use App\Models\NominaJornalRef;
use App\Models\NominaPromedioLote;
use App\Models\NominaTercero;
use App\Models\NominaValidacionCosecha;
use App\Models\Operacion;
use App\Models\PrecioCosecha;
use App\Models\PromedioLote;
use Illuminate\Support\Facades\DB;

/**
 * Cierra una nómina de forma transaccional:
 *   - Valida que todos los empleados estén LIQUIDADOS.
 *   - Crea snapshots de jornales/cosechas/horas extras (nomina_jornal_ref, etc.)
 *     para preservar valores históricos contra cambios posteriores.
 *   - Marca las ausencias APROBADAS y horas extras APROBADAS del rango como
 *     LIQUIDADAS y las vincula a esta nómina (nomina_id).
 *   - Recalcula los totales globales y cambia el estado a CERRADA.
 *
 * Una nómina CERRADA es inmutable: cualquier intento de mutarla devuelve
 * NOMINA_CERRADA en los controllers.
 */
class CerrarNominaService
{
    public function __construct(private readonly NominaCalculationService $calc) {}

    public function cerrar(Nomina $nomina, int $userId): Nomina
    {
        if ($nomina->isCerrada()) {
            throw new \DomainException('NOMINA_CERRADA: la nómina ya está cerrada.');
        }

        $pendientes = NominaEmpleado::where('nomina_id', $nomina->id)
            ->where('estado', NominaEmpleado::ESTADO_PENDIENTE)
            ->count();

        if ($pendientes > 0) {
            throw new \DomainException(
                "NOMINA_CON_PENDIENTES: hay {$pendientes} empleado(s) pendientes de liquidar."
            );
        }

        $this->validarCosechaConfirmada($nomina);
        $this->validarActasTercerosLiquidadas($nomina);

        return DB::transaction(function () use ($nomina, $userId) {
            $empleados = NominaEmpleado::where('nomina_id', $nomina->id)
                ->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)
                ->get();

            $inicio = $nomina->fecha_inicio;
            $fin    = $nomina->fecha_fin;

            foreach ($empleados as $ne) {
                $this->snapshotJornales($ne, $inicio, $fin);
                $this->snapshotCosechas($ne, $inicio, $fin);
                if (! $ne->esDeOperario()) {
                    $this->snapshotYLiquidarHorasExtra($ne, $nomina->id, $inicio, $fin);
                    $this->liquidarAusencias($ne, $nomina->id, $inicio, $fin);
                }
            }

            // Recalcular totales finales (en caso de que falten)
            $this->calc->recalcularTotalesNomina($nomina);

            $nomina->update([
                'estado'      => Nomina::ESTADO_CERRADA,
                'cerrada_por' => $userId,
                'cerrada_at'  => now(),
            ]);

            return $nomina->fresh();
        });
    }

    /**
     * Cada contratista con operarios en la nómina DEBE tener su `nomina_tercero`
     * calculada (via `POST /nominas/{id}/terceros/{tercero}/liquidar`).
     * Estados aceptados: PENDIENTE o PAGADO. `PENDIENTE` significa "acta lista,
     * pago aún no coordinado" y es un cierre válido (registrar-pago post-cierre
     * es la única excepción documentada al patrón CERRADA = inmutable).
     *
     * PR-3.5 pre-hidrata las filas con totales 0 al agregar operarios, así que
     * el fallo por "acta ausente" indica que la fila fue borrada manualmente o
     * que la nómina es previa al deploy de PR-3.5.
     * Fallo por "acta no calculada": la fila existe pero `total_a_transferir=0`
     * y hay jornales/cosechas de sus operarios que valen algo → el usuario
     * debe pasar por la pantalla PR-4 y ejecutar liquidar.
     */
    private function validarActasTercerosLiquidadas(Nomina $nomina): void
    {
        $tercerosEnNomina = NominaEmpleado::where('nomina_id', $nomina->id)
            ->whereNotNull('tercero_id')
            ->pluck('tercero_id')
            ->unique()
            ->values();

        if ($tercerosEnNomina->isEmpty()) {
            return;
        }

        $actas = NominaTercero::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->whereIn('tercero_id', $tercerosEnNomina)
            ->get(['tercero_id', 'total_a_transferir', 'total_dias']);

        $conActa       = $actas->pluck('tercero_id')->all();
        $sinActa       = $tercerosEnNomina->diff($conActa)->values();
        $sinCalculo    = $actas->filter(fn ($a) => (float) $a->total_a_transferir <= 0 && (int) $a->total_dias === 0)
            ->pluck('tercero_id')
            ->values();

        if ($sinActa->isNotEmpty() || $sinCalculo->isNotEmpty()) {
            throw new \DomainException(
                'NOMINA_TERCERO_NO_LIQUIDADO: cada contratista con operarios debe tener su acta liquidada. '
                . 'Falta ejecutar `POST /nominas/' . $nomina->id . '/terceros/{tercero}/liquidar` para tercero(s): '
                . $sinActa->merge($sinCalculo)->unique()->values()->join(', ')
            );
        }
    }

    private function validarCosechaConfirmada(Nomina $nomina): void
    {
        $tieneCosechas = CosechaCuadrilla::withoutGlobalScope('tenant')
            ->where('tenant_id', $nomina->tenant_id)
            ->where('estado', true)
            ->whereHas('cosecha.operacion', function ($q) use ($nomina) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$nomina->fecha_inicio, $nomina->fecha_fin]);
            })
            ->exists();

        if (! $tieneCosechas) {
            return;
        }

        $validacion = NominaValidacionCosecha::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->first();

        if (! $validacion || ! $validacion->isConfirmado()) {
            throw new \DomainException(
                'NOMINA_VALIDACION_COSECHA_REQUERIDA: debe confirmar la validación de cosecha antes de cerrar la nómina.'
            );
        }
    }

    private function snapshotJornales(NominaEmpleado $ne, $inicio, $fin): void
    {
        $field    = $ne->esDeOperario() ? 'operario_id' : 'empleado_id';
        $value    = $ne->esDeOperario() ? $ne->operario_id : $ne->empleado_id;
        $jornales = Jornal::where($field, $value)
            ->where('estado', true)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->get();

        foreach ($jornales as $j) {
            NominaJornalRef::updateOrCreate(
                [
                    'nomina_empleado_id' => $ne->id,
                    'jornal_id'          => $j->id,
                ],
                [
                    'tenant_id'      => $ne->tenant_id,
                    'valor_snapshot' => $j->valor_total ?? 0,
                    'estado'         => true,
                ]
            );
        }
    }

    private function snapshotCosechas(NominaEmpleado $ne, $inicio, $fin): void
    {
        $field      = $ne->esDeOperario() ? 'operario_id' : 'empleado_id';
        $value      = $ne->esDeOperario() ? $ne->operario_id : $ne->empleado_id;
        $cuadrillas = CosechaCuadrilla::where($field, $value)
            ->where('estado', true)
            ->with(['cosecha:id,lote_id,gajos_reportados,gajos_reconteo'])
            ->whereHas('cosecha.operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->get();

        $tenantId = $ne->tenant_id;
        $anio     = \Illuminate\Support\Carbon::parse($inicio)->year;

        foreach ($cuadrillas as $cc) {
            $cosecha = $cc->cosecha;
            $loteId  = $cosecha->lote_id;

            // Gajos efectivos del total de la cuadrilla
            $gajosEfectivos = $cosecha->gajos_reconteo ?? $cosecha->gajos_reportados ?? 0;
            $N = $cosecha->cuadrilla()->where('estado', true)->count();
            $gajosEmpleado = ($N > 0 && $gajosEfectivos > 0)
                ? (int) floor($gajosEfectivos / $N)
                : 0;

            // Preferir promedio efectivo guardado para esta nómina (ajustado por admin en wizard)
            $promedioPromedio = NominaPromedioLote::where('nomina_id', $ne->nomina_id)
                ->where('lote_id', $loteId)
                ->value('promedio_efectivo');
            if ($promedioPromedio) {
                $promedioPromedio = (float) $promedioPromedio;
            }

            // Fallback: promedio de promedios del lote en el período (con fallback a baseline admin)
            if (! $promedioPromedio) {
                $promedioPromedio = PromedioLote::where('tenant_id', $tenantId)
                    ->where('lote_id', $loteId)
                    ->whereBetween('fecha', [$inicio, $fin])
                    ->avg('promedio');
            }

            if (! $promedioPromedio) {
                $promedioPromedio = PromedioLote::where('tenant_id', $tenantId)
                    ->where('lote_id', $loteId)
                    ->where('anio', $anio)
                    ->whereNull('viaje_id')
                    ->orderByDesc('created_at')
                    ->value('promedio');
            }

            // Precio cosecha del lote
            $precio = PrecioCosecha::where('tenant_id', $tenantId)
                ->where('lote_id', $loteId)
                ->where('anio', $anio)
                ->value('precio');

            $valorSnapshot = ($gajosEmpleado > 0 && $promedioPromedio && $precio)
                ? round($gajosEmpleado * (float) $promedioPromedio * (float) $precio, 2)
                : 0;

            NominaCosechaRef::updateOrCreate(
                [
                    'nomina_empleado_id'   => $ne->id,
                    'cosecha_cuadrilla_id' => $cc->id,
                ],
                [
                    'tenant_id'                   => $tenantId,
                    'valor_snapshot'               => $valorSnapshot,
                    'gajos_asignados'              => $gajosEmpleado ?: null,
                    'precio_cosecha_snapshot'      => $precio ?: null,
                    'promedio_promedios_snapshot'  => $promedioPromedio
                        ? round((float) $promedioPromedio, 4)
                        : null,
                    'estado'                       => true,
                ]
            );
        }
    }

    private function snapshotYLiquidarHorasExtra(NominaEmpleado $ne, int $nominaId, $inicio, $fin): void
    {
        $horas = HoraExtra::where('empleado_id', $ne->empleado_id)
            ->where('estado', HoraExtra::ESTADO_APROBADA)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->get();

        foreach ($horas as $h) {
            NominaHoraExtraRef::updateOrCreate(
                [
                    'nomina_empleado_id' => $ne->id,
                    'hora_extra_id'      => $h->id,
                ],
                [
                    'tenant_id'      => $ne->tenant_id,
                    'valor_snapshot' => $h->valor_calculado ?? 0,
                    'estado'         => true,
                ]
            );

            $h->update([
                'estado'    => HoraExtra::ESTADO_LIQUIDADA,
                'nomina_id' => $nominaId,
            ]);
        }
    }

    private function liquidarAusencias(NominaEmpleado $ne, int $nominaId, $inicio, $fin): void
    {
        Ausencia::where('empleado_id', $ne->empleado_id)
            ->aprobadas()
            ->afectanNomina()
            ->enRango($inicio, $fin)
            ->whereNull('nomina_id')
            ->update([
                'estado'    => Ausencia::ESTADO_LIQUIDADA,
                'nomina_id' => $nominaId,
            ]);
    }
}
