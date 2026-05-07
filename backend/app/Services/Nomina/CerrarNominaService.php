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
use App\Models\Operacion;
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

        return DB::transaction(function () use ($nomina, $userId) {
            $empleados = NominaEmpleado::where('nomina_id', $nomina->id)
                ->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)
                ->get();

            $inicio = $nomina->fecha_inicio;
            $fin    = $nomina->fecha_fin;

            foreach ($empleados as $ne) {
                $this->snapshotJornales($ne, $inicio, $fin);
                $this->snapshotCosechas($ne, $inicio, $fin);
                $this->snapshotYLiquidarHorasExtra($ne, $nomina->id, $inicio, $fin);
                $this->liquidarAusencias($ne, $nomina->id, $inicio, $fin);
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

    private function snapshotJornales(NominaEmpleado $ne, $inicio, $fin): void
    {
        $jornales = Jornal::where('empleado_id', $ne->empleado_id)
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
        $cuadrillas = CosechaCuadrilla::where('empleado_id', $ne->empleado_id)
            ->where('estado', true)
            ->whereHas('cosecha.operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->get();

        foreach ($cuadrillas as $cc) {
            NominaCosechaRef::updateOrCreate(
                [
                    'nomina_empleado_id'   => $ne->id,
                    'cosecha_cuadrilla_id' => $cc->id,
                ],
                [
                    'tenant_id'      => $ne->tenant_id,
                    'valor_snapshot' => $cc->valor_calculado ?? 0,
                    'estado'         => true,
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
