<?php

namespace App\Services\Nomina;

use App\Models\CosechaCuadrilla;
use App\Models\Jornal;
use App\Models\Nomina;
use App\Models\NominaEmpleado;
use App\Models\NominaPromedioLote;
use App\Models\NominaTercero;
use App\Models\NominaTerceroOperario;
use App\Models\NominaTerceroOperarioDescuento;
use App\Models\Operacion;
use App\Models\PrecioCosecha;
use App\Models\Tercero;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Calcula el acta agrupada por contratista tomando como fuente de verdad los
 * `nomina_empleado` de los operarios del tercero en la nómina (que ya fueron
 * liquidados individualmente por `NominaCalculationService::liquidarOperario()`).
 *
 * Escribe en `nomina_tercero` (cabecera) y `nomina_tercero_operario` (líneas).
 * El flujo de edición manual de días/tarifa/ajuste fue eliminado (PR-4.2).
 * Los descuentos se gestionan vía `agregarDescuento()` / `eliminarDescuento()`.
 *
 * Fórmula: subtotal = total_jornales + total_cosecha − SUM(descuentos.valor)
 */
class LiquidarTerceroService
{
    public function __construct(private readonly NominaCalculationService $calcService) {}

    /**
     * Calcula y persiste el acta del contratista para esta nómina.
     * Idempotente: re-ejecutar actualiza totales sin pisar estado_pago ni descuentos.
     */
    public function liquidar(Nomina $nomina, Tercero $tercero, int $tenantId, int $userId): NominaTercero
    {
        $filas = NominaEmpleado::where('nomina_id', $nomina->id)
            ->where('tercero_id', $tercero->id)
            ->whereNotNull('operario_id')
            ->with('operario:id,tercero_id,nombres,apellidos,cedula,cargo')
            ->get();

        if ($filas->isEmpty()) {
            throw new \DomainException(
                'TERCERO_SIN_OPERARIOS_EN_NOMINA: el tercero no tiene operarios en esta nómina.'
            );
        }

        // Auto-liquidar operarios PENDIENTES para que sus totales sean correctos.
        foreach ($filas as $ne) {
            if ($ne->estado === NominaEmpleado::ESTADO_PENDIENTE) {
                try {
                    $ne->loadMissing(['operario', 'nomina']);
                    $this->calcService->liquidar($ne, [], $userId);
                    $ne->refresh();
                } catch (\Throwable $e) {
                    Log::warning("LiquidarTerceroService: no se pudo auto-liquidar operario #{$ne->operario_id}: " . $e->getMessage());
                }
            }
        }

        return DB::transaction(function () use ($nomina, $tercero, $tenantId, $filas) {
            $acta = NominaTercero::withoutGlobalScope('tenant')->firstOrCreate(
                ['nomina_id'  => $nomina->id, 'tercero_id' => $tercero->id],
                ['tenant_id'  => $tenantId, 'estado_pago' => NominaTercero::ESTADO_PENDIENTE]
            );

            $totalDias     = 0;
            $totalJornales = 0.0;
            $totalCosecha  = 0.0;

            foreach ($filas as $ne) {
                $dias         = (int) ($ne->dias_trabajados ?? 0);
                $jornalesEmp  = (float) ($ne->total_jornales ?? 0);
                $cosechaEmp   = (float) ($ne->total_cosecha  ?? 0);
                $tarifaDia    = $dias > 0 ? round($jornalesEmp / $dias, 2) : 0.0;
                $labores      = $this->snapshotLabores($ne->operario_id, $nomina->fecha_inicio, $nomina->fecha_fin);

                // Preservar observación si la fila ya existía.
                $existente   = NominaTerceroOperario::withoutGlobalScope('tenant')
                    ->where('nomina_tercero_id', $acta->id)
                    ->where('operario_id', $ne->operario_id)
                    ->first();
                $observacion = $existente?->observacion;

                // Descuentos ya existentes para esta línea.
                $lineaDescuentos = $existente
                    ? $existente->descuentos()->sum('valor')
                    : 0.0;

                $subtotal = round($jornalesEmp + $cosechaEmp - $lineaDescuentos, 2);

                NominaTerceroOperario::withoutGlobalScope('tenant')->updateOrCreate(
                    ['nomina_tercero_id' => $acta->id, 'operario_id' => $ne->operario_id],
                    [
                        'tenant_id'       => $acta->tenant_id,
                        'dias'            => $dias,
                        'tarifa_dia'      => $tarifaDia,
                        'total_jornales'  => $jornalesEmp,
                        'total_cosecha'   => $cosechaEmp,
                        'subtotal'        => $subtotal,
                        'labores_realizadas' => $labores,
                        'observacion'     => $observacion,
                    ]
                );

                $totalDias     += $dias;
                $totalJornales += $jornalesEmp;
                $totalCosecha  += $cosechaEmp;
            }

            // Descuentos de todas las líneas (pueden existir de re-liquidaciones)
            $totalDescuentos = NominaTerceroOperarioDescuento::withoutGlobalScope('tenant')
                ->whereHas('lineaOperario', fn ($q) => $q->where('nomina_tercero_id', $acta->id))
                ->sum('valor');

            $totalBruto       = round($totalJornales + $totalCosecha, 2);
            $totalATransferir = round($totalBruto - $totalDescuentos, 2);

            $acta->update([
                'total_dias'         => $totalDias,
                'total_jornales'     => $totalJornales,
                'total_cosecha'      => $totalCosecha,
                'total_bruto'        => $totalBruto,
                'total_a_transferir' => $totalATransferir,
            ]);

            return $acta->fresh(['operarios.operario', 'operarios.descuentos.concepto', 'tercero']);
        });
    }

    /**
     * Agrega un descuento con concepto a una línea de operario del acta.
     * Recalcula subtotal de la línea y propaga a la cabecera.
     */
    public function agregarDescuento(
        NominaTerceroOperario $linea,
        int $conceptoId,
        float $valor,
        ?string $observacion,
        int $tenantId,
        NominaTercero $acta
    ): NominaTerceroOperarioDescuento {
        return DB::transaction(function () use ($linea, $conceptoId, $valor, $observacion, $tenantId, $acta) {
            $descuento = NominaTerceroOperarioDescuento::create([
                'tenant_id'                  => $tenantId,
                'nomina_tercero_operario_id' => $linea->id,
                'concepto_id'                => $conceptoId,
                'valor'                      => $valor,
                'observacion'                => $observacion,
            ]);

            $this->recalcularSubtotalLinea($linea);
            $this->recalcularTotalesActa($acta);

            return $descuento->load('concepto:id,codigo,nombre');
        });
    }

    /**
     * Elimina un descuento de una línea de operario del acta.
     * Recalcula subtotal de la línea y propaga a la cabecera.
     */
    public function eliminarDescuento(
        int $descuentoId,
        NominaTerceroOperario $linea,
        NominaTercero $acta
    ): void {
        DB::transaction(function () use ($descuentoId, $linea, $acta) {
            NominaTerceroOperarioDescuento::withoutGlobalScope('tenant')
                ->where('id', $descuentoId)
                ->where('nomina_tercero_operario_id', $linea->id)
                ->delete();

            $this->recalcularSubtotalLinea($linea);
            $this->recalcularTotalesActa($acta);
        });
    }

    /**
     * Devuelve el desglose de labores de un operario en el período:
     * cosecha (por lote/sublote con gajos/promedio/peso/precio) y jornales
     * (por labor/lote/sublote con unidades/precio/total).
     *
     * Usado por el endpoint GET /operarios/{op}/detalle para pintar el acordeón
     * de la pantalla "Liquidación de Terceros" en modo solo-lectura.
     */
    public function calcularDetalleOperario(int $operarioId, $inicio, $fin, ?int $nominaId = null): array
    {
        $inicioStr = is_string($inicio) ? $inicio : $inicio->toDateString();
        $finStr    = is_string($fin)    ? $fin    : $fin->toDateString();
        $anio      = (int) substr($inicioStr, 0, 4);

        return [
            'cosecha'  => $this->detalleCosecha($operarioId, $inicioStr, $finStr, $nominaId, $anio),
            'jornales' => $this->detalleJornales($operarioId, $inicioStr, $finStr),
        ];
    }

    // ─── Privados ───────────────────────────────────────────────────────────

    private function recalcularSubtotalLinea(NominaTerceroOperario $linea): void
    {
        $linea->loadMissing('descuentos');
        $totalDesc = (float) $linea->descuentos()->sum('valor');
        $subtotal  = round((float) $linea->total_jornales + (float) $linea->total_cosecha - $totalDesc, 2);
        $linea->update(['subtotal' => $subtotal]);
    }

    /**
     * Recalcula los totales de la cabecera sumando los subtotales de líneas.
     * Fórmula: total_a_transferir = SUM(subtotales) — no hay suma separada de
     * cosecha porque cada subtotal ya incluye total_cosecha del operario.
     */
    private function recalcularTotalesActa(NominaTercero $acta): void
    {
        $lineas = NominaTerceroOperario::withoutGlobalScope('tenant')
            ->where('nomina_tercero_id', $acta->id)
            ->get(['subtotal', 'total_jornales', 'total_cosecha', 'dias']);

        $totalDias        = (int)   $lineas->sum('dias');
        $totalJornales    = (float) round($lineas->sum('total_jornales'), 2);
        $totalCosecha     = (float) round($lineas->sum('total_cosecha'), 2);
        $totalBruto       = round($totalJornales + $totalCosecha, 2);
        $totalATransferir = (float) round($lineas->sum('subtotal'), 2);

        $acta->update([
            'total_dias'         => $totalDias,
            'total_jornales'     => $totalJornales,
            'total_cosecha'      => $totalCosecha,
            'total_bruto'        => $totalBruto,
            'total_a_transferir' => $totalATransferir,
        ]);
    }

    private function detalleCosecha(int $operarioId, string $inicio, string $fin, ?int $nominaId, int $anio): array
    {
        $cuadrillas = CosechaCuadrilla::withoutGlobalScope('tenant')
            ->where('operario_id', $operarioId)
            ->where('estado', true)
            ->with([
                'cosecha:id,lote_id,sublote_id,gajos_reportados,gajos_reconteo,promedio_kg_gajo,precio_cosecha,operacion_id,estado',
                'cosecha.lote:id,nombre',
                'cosecha.sublote:id,nombre',
                'cosecha.operacion:id,fecha,estado',
            ])
            ->whereHas('cosecha.operacion', fn ($q) =>
                $q->where('estado', Operacion::ESTADO_APROBADA)->whereBetween('fecha', [$inicio, $fin])
            )
            ->get();

        $rows = [];
        foreach ($cuadrillas as $cc) {
            $cosecha = $cc->cosecha;
            if (! $cosecha || ! $cosecha->estado) {
                continue;
            }

            $loteId = $cosecha->lote_id;

            $gajosEfectivos = (int) ($cosecha->gajos_reconteo ?? $cosecha->gajos_reportados ?? 0);
            $N              = max(1, CosechaCuadrilla::withoutGlobalScope('tenant')
                ->where('cosecha_id', $cosecha->id)->where('estado', true)->count());
            $gajosOperario  = (int) floor($gajosEfectivos / $N);

            // Promedio: override de nómina → snapshot del registro → 0
            $promedio = 0.0;
            if ($nominaId) {
                $override = NominaPromedioLote::withoutGlobalScope('tenant')
                    ->where('nomina_id', $nominaId)->where('lote_id', $loteId)
                    ->value('promedio_efectivo');
                if ($override !== null) {
                    $promedio = (float) $override;
                }
            }
            if ($promedio <= 0 && $cosecha->promedio_kg_gajo) {
                $promedio = (float) $cosecha->promedio_kg_gajo;
            }

            // Precio: snapshot del registro → tabla PrecioCosecha → 0
            $precioKg = (float) ($cosecha->precio_cosecha ?? 0);
            if ($precioKg <= 0) {
                $precioKg = (float) (PrecioCosecha::withoutGlobalScope('tenant')
                    ->where('lote_id', $loteId)->where('anio', $anio)
                    ->orderByDesc('created_at')->value('precio') ?? 0);
            }

            $pesoKg = round($gajosOperario * $promedio, 2);
            $total  = round($pesoKg * $precioKg, 2);

            $rows[] = [
                'lote_id'          => $loteId,
                'lote'             => $cosecha->lote?->nombre ?? '',
                'sublote_id'       => $cosecha->sublote_id,
                'sublote'          => $cosecha->sublote?->nombre,
                'gajos'            => $gajosOperario,
                'promedio_kg_gajo' => $promedio,
                'peso_kg'          => $pesoKg,
                'precio_unit_kg'   => $precioKg,
                'total'            => $total,
            ];
        }

        return $rows;
    }

    private function detalleJornales(int $operarioId, string $inicio, string $fin): array
    {
        $jornales = Jornal::withoutGlobalScope('tenant')
            ->where('operario_id', $operarioId)
            ->where('estado', true)
            ->whereHas('operacion', fn ($q) =>
                $q->where('estado', Operacion::ESTADO_APROBADA)->whereBetween('fecha', [$inicio, $fin])
            )
            ->with(['labor:id,nombre,tipo,categoria', 'lote:id,nombre', 'sublote:id,nombre'])
            ->get();

        return $jornales
            ->groupBy(fn ($j) => $j->labor_id . '_' . ($j->lote_id ?? 'x') . '_' . ($j->sublote_id ?? 'x'))
            ->map(function ($grupo) {
                $primero = $grupo->first();
                $esFinca = $primero->categoria === Jornal::CATEGORIA_FINCA;

                return [
                    'labor_id'    => $primero->labor_id,
                    'labor_nombre'=> $primero->labor?->nombre ?? ($primero->nombre_trabajo ?? ''),
                    'categoria'   => $primero->categoria,
                    'tipo'        => $primero->tipo,
                    'tipo_pago'   => $esFinca ? 'JORNAL_FIJO' : 'POR_PALMA',
                    'lote_id'     => $primero->lote_id,
                    'lote'        => $primero->lote?->nombre,
                    'sublote_id'  => $primero->sublote_id,
                    'sublote'     => $primero->sublote?->nombre,
                    'unidades'    => $esFinca ? (int) $grupo->count() : (int) $grupo->sum('cantidad_palmas'),
                    'unidad'      => $esFinca ? 'jornal' : 'palmas',
                    'precio_unit' => (float) $primero->valor_unitario,
                    'total'       => (float) round($grupo->sum('valor_total'), 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Devuelve el snapshot JSON de las labores realizadas por el operario
     * (nombres distintos) para pintar los badges del acordeón sin re-leer jornales.
     */
    private function snapshotLabores(int $operarioId, string|\DateTimeInterface $inicio, string|\DateTimeInterface $fin): array
    {
        return Jornal::where('operario_id', $operarioId)
            ->where('estado', true)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio, $fin]);
            })
            ->with('labor:id,nombre,tipo,categoria')
            ->get()
            ->pluck('labor.nombre')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
