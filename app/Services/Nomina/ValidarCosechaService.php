<?php

namespace App\Services\Nomina;

use App\Constants\ViajeEstado;
use App\Models\Empleado;
use App\Models\Lote;
use App\Models\Nomina;
use App\Models\NominaPromedioLote;
use App\Models\NominaValidacionCosecha;
use App\Models\Operacion;
use App\Models\Operario;
use App\Models\PromedioLote;
use App\Models\RegistroCosecha;
use App\Models\Viaje;
use App\Models\ViajeDetalle;
use Illuminate\Support\Carbon;

class ValidarCosechaService
{
    /**
     * Construye el payload de comparación cosecha-colaboradores vs extractora.
     *
     * kg_trabajado por cuadrillero = floor(gajos_efectivos / N) × promedio_efectivo_del_lote.
     * promedio_efectivo = promedio_manual (si admin ajustó para esta nómina) ?? AVG(PromedioLote en período) ?? fallback baseline.
     *
     * kg_extractora = peso_calculado_empleado (escrito por ViajeCalculationService al finalizar el viaje)
     *                 ?? floor(gajos/N) × promedio_kg_gajo snapshot (fallback legacy)
     *                 ?? 0.
     */
    public function bundle(Nomina $nomina): array
    {
        $tenantId = $nomina->tenant_id;
        $inicio   = $nomina->fecha_inicio;
        $fin      = $nomina->fecha_fin;
        $anio     = Carbon::parse($inicio)->year;

        $cosechas = RegistroCosecha::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->with([
                'cuadrilla'     => fn($q) => $q->where('estado', true),
                'operacion:id,fecha',
                'lote:id,nombre',
                'sublote:id,nombre',
                'viajeDetalles' => fn($q) => $q->where('estado', true)
                                               ->with('viaje:id,numero_remision_extractora'),
            ])
            ->get(['id', 'lote_id', 'sublote_id', 'operacion_id',
                   'gajos_reportados', 'gajos_reconteo', 'promedio_kg_gajo']);

        $loteIds = $cosechas->pluck('lote_id')->unique()->values()->toArray();
        $promedioMap = $this->buildPromedioEfectivoMap($nomina, $loteIds, $anio);

        $totalKgColaboradores = 0.0;
        $detalle = [];

        foreach ($cosechas as $rc) {
            $cuadrilla = $rc->cuadrilla;
            $N = $cuadrilla->count();
            if ($N === 0) continue;

            $gajosEfectivos = (int) ($rc->gajos_reconteo ?? $rc->gajos_reportados ?? 0);
            $gajosPersona   = $gajosEfectivos > 0 ? (int) floor($gajosEfectivos / $N) : 0;

            $promEfectivo = $promedioMap[$rc->lote_id]['efectivo'] ?? 0.0;
            $remision     = $rc->viajeDetalles->first()?->viaje?->numero_remision_extractora;
            $loteName     = $rc->lote?->nombre ?? "Lote {$rc->lote_id}";
            $subloteName  = $rc->sublote?->nombre;
            $fecha        = $rc->operacion?->fecha?->format('Y-m-d');

            // Splits de esta cosecha que aún no están FINALIZADOS.
            // Si > 0, kg_extractora puede estar incompleto en la validación.
            $splitsPendientes = ViajeDetalle::activos()
                ->where('cosecha_id', $rc->id)
                ->whereHas('viaje', fn ($q) => $q->where('estado', '!=', ViajeEstado::FINALIZADO))
                ->count();

            foreach ($cuadrilla as $cc) {
                $kgTrabajado = round($gajosPersona * $promEfectivo, 2);

                if ($cc->peso_calculado_empleado !== null) {
                    $kgExtractora = (float) $cc->peso_calculado_empleado;
                } elseif ($rc->promedio_kg_gajo !== null) {
                    $kgExtractora = round($gajosPersona * (float) $rc->promedio_kg_gajo, 2);
                } else {
                    $kgExtractora = 0.0;
                }

                $totalKgColaboradores += $kgTrabajado;

                $filaDetalle = [
                    'fecha'             => $fecha,
                    'lote'              => $loteName,
                    'sublote'           => $subloteName,
                    'remision'          => $remision,
                    'gajos_trabajados'  => $rc->gajos_reportados,
                    'gajos_verificados' => $rc->gajos_reconteo ?? $rc->gajos_reportados,
                    'diferencia_gajos'  => ($rc->gajos_reconteo ?? $rc->gajos_reportados) - $rc->gajos_reportados,
                    'splits_pendientes' => $splitsPendientes,
                    'kg_trabajado'      => $kgTrabajado,
                    'kg_extractora'     => $kgExtractora,
                    'diferencia_kg'     => round($kgTrabajado - $kgExtractora, 2),
                ];

                if ($cc->empleado_id) {
                    $key = "emp_{$cc->empleado_id}";
                    $detalle[$key] ??= [
                        'tipo'           => 'EMPLEADO',
                        'colaborador_id' => $cc->empleado_id,
                        'kg'             => 0.0,
                        'cosechas'       => [],
                    ];
                } else {
                    $key = "op_{$cc->operario_id}";
                    $detalle[$key] ??= [
                        'tipo'           => 'OPERARIO',
                        'colaborador_id' => $cc->operario_id,
                        'kg'             => 0.0,
                        'cosechas'       => [],
                    ];
                }
                $detalle[$key]['kg']        += $kgTrabajado;
                $detalle[$key]['cosechas'][] = $filaDetalle;
            }
        }

        $totalKgExtractora = (float) Viaje::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('estado', ViajeEstado::FINALIZADO)
            ->where('estado_activo', true)
            ->whereBetween('fecha_viaje', [$inicio, $fin])
            ->sum('peso_viaje');

        $empleadoIds = collect($detalle)->where('tipo', 'EMPLEADO')->pluck('colaborador_id');
        $operarioIds = collect($detalle)->where('tipo', 'OPERARIO')->pluck('colaborador_id');

        $empleadosMap = Empleado::withoutGlobalScope('tenant')
            ->whereIn('id', $empleadoIds)
            ->get(['id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'cargo'])
            ->keyBy('id');

        $operariosMap = Operario::withoutGlobalScope('tenant')
            ->whereIn('id', $operarioIds)
            ->get(['id', 'nombres', 'apellidos', 'cargo'])
            ->keyBy('id');

        $detalle = array_map(function (array $item) use ($empleadosMap, $operariosMap): array {
            if ($item['tipo'] === 'EMPLEADO' && $e = $empleadosMap->get($item['colaborador_id'])) {
                $item['nombre_completo'] = $e->nombre_completo;
                $item['cargo']           = $e->cargo;
            } elseif ($item['tipo'] === 'OPERARIO' && $op = $operariosMap->get($item['colaborador_id'])) {
                $item['nombre_completo'] = trim($op->nombres . ' ' . $op->apellidos);
                $item['cargo']           = $op->cargo;
            }
            return $item;
        }, $detalle);

        $promediosPorLote = array_values(array_map(
            fn(int $loteId, array $info) => [
                'lote_id'           => $loteId,
                'lote_nombre'       => $info['nombre'],
                'promedio_auto'     => $info['auto'],
                'promedio_manual'   => $info['manual'],
                'promedio_efectivo' => $info['efectivo'],
            ],
            array_keys($promedioMap),
            array_values($promedioMap)
        ));

        return [
            'total_kg_colaboradores'  => round($totalKgColaboradores, 2),
            'total_kg_extractora'     => round($totalKgExtractora, 2),
            'diferencia_kg'           => round($totalKgColaboradores - $totalKgExtractora, 2),
            'promedios_por_lote'      => $promediosPorLote,
            'detalle_por_colaborador' => array_values($detalle),
        ];
    }

    /**
     * Persiste el snapshot de validación. Idempotente (upsert).
     *
     * @throws \DomainException si la nómina ya está CERRADA
     */
    public function confirmar(Nomina $nomina, int $userId): NominaValidacionCosecha
    {
        if ($nomina->isCerrada()) {
            throw new \DomainException('NOMINA_CERRADA: la nómina ya está cerrada.');
        }

        $data = $this->bundle($nomina);

        return NominaValidacionCosecha::withoutGlobalScope('tenant')->updateOrCreate(
            ['nomina_id' => $nomina->id],
            [
                'tenant_id'               => $nomina->tenant_id,
                'total_kg_colaboradores'  => $data['total_kg_colaboradores'],
                'total_kg_extractora'     => $data['total_kg_extractora'],
                'diferencia_kg'           => $data['diferencia_kg'],
                'detalle_por_colaborador' => $data['detalle_por_colaborador'],
                'validado_por'            => $userId,
                'validado_at'             => now(),
            ]
        );
    }

    /**
     * Guarda el promedio efectivo ajustado por admin para esta nómina × lote.
     * Escribe en nomina_promedio_lote (NO en PromedioLote, que es solo auto-generado por viajes).
     * Idempotente: un segundo PUT actualiza el registro existente.
     *
     * @throws \DomainException si la nómina ya está CERRADA
     */
    public function ajustarPromedio(Nomina $nomina, int $loteId, float $promedio): NominaPromedioLote
    {
        if ($nomina->isCerrada()) {
            throw new \DomainException('NOMINA_CERRADA: la nómina ya está cerrada.');
        }

        $anio = Carbon::parse($nomina->fecha_inicio)->year;
        $promedioAuto = $this->calcularPromedioAuto(
            $nomina->tenant_id, $loteId, $nomina->fecha_inicio, $nomina->fecha_fin, $anio
        );

        return NominaPromedioLote::withoutGlobalScope('tenant')->updateOrCreate(
            [
                'tenant_id' => $nomina->tenant_id,
                'nomina_id' => $nomina->id,
                'lote_id'   => $loteId,
            ],
            [
                'promedio_auto'     => $promedioAuto ?? $promedio,
                'promedio_manual'   => $promedio,
                'promedio_efectivo' => $promedio,
                'ajustado_por'      => auth()->id(),
                'ajustado_at'       => now(),
            ]
        );
    }

    /**
     * Construye el mapa [lote_id => [nombre, auto, manual, efectivo]] para todos
     * los lotes del período. Usado por bundle() y para poblar promedios_por_lote.
     */
    private function buildPromedioEfectivoMap(Nomina $nomina, array $loteIds, int $anio): array
    {
        if (empty($loteIds)) return [];

        $nplRecords = NominaPromedioLote::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->whereIn('lote_id', $loteIds)
            ->get()
            ->keyBy('lote_id');

        $autoPromedios = PromedioLote::withoutGlobalScope('tenant')
            ->where('tenant_id', $nomina->tenant_id)
            ->whereIn('lote_id', $loteIds)
            ->whereBetween('fecha', [$nomina->fecha_inicio, $nomina->fecha_fin])
            ->selectRaw('lote_id, AVG(promedio) as avg_promedio')
            ->groupBy('lote_id')
            ->pluck('avg_promedio', 'lote_id');

        $loteNames = Lote::withoutGlobalScope('tenant')
            ->whereIn('id', $loteIds)
            ->pluck('nombre', 'id');

        $map = [];
        foreach ($loteIds as $loteId) {
            $npl    = $nplRecords->get($loteId);
            $autoAvg = $autoPromedios->get($loteId);

            if (! $autoAvg) {
                $autoAvg = PromedioLote::withoutGlobalScope('tenant')
                    ->where('tenant_id', $nomina->tenant_id)
                    ->where('lote_id', $loteId)
                    ->where('anio', $anio)
                    ->whereNull('viaje_id')
                    ->orderByDesc('created_at')
                    ->value('promedio');
            }

            $auto     = $autoAvg ? round((float) $autoAvg, 4) : null;
            $manual   = $npl ? (float) $npl->promedio_manual : null;
            $efectivo = $npl ? (float) $npl->promedio_efectivo : ($auto ?? 0.0);

            $map[$loteId] = [
                'nombre'   => $loteNames->get($loteId) ?? "Lote {$loteId}",
                'auto'     => $auto,
                'manual'   => $manual,
                'efectivo' => $efectivo,
            ];
        }

        return $map;
    }

    /**
     * Calcula el promedio automático del lote en el período:
     * AVG(PromedioLote auto-generados por viajes) con fallback al baseline admin del año.
     */
    public function calcularPromedioAuto(int $tenantId, int $loteId, $inicio, $fin, int $anio): ?float
    {
        $avg = PromedioLote::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('lote_id', $loteId)
            ->whereBetween('fecha', [$inicio, $fin])
            ->avg('promedio');

        if ($avg) return round((float) $avg, 4);

        $baseline = PromedioLote::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('lote_id', $loteId)
            ->where('anio', $anio)
            ->whereNull('viaje_id')
            ->orderByDesc('created_at')
            ->value('promedio');

        return $baseline ? round((float) $baseline, 4) : null;
    }
}
