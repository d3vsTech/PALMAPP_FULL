<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\HoraExtra\RechazarHoraExtraRequest;
use App\Http\Requests\HoraExtra\StoreHoraExtraRequest;
use App\Http\Requests\HoraExtra\UpdateHoraExtraRequest;
use App\Models\HoraExtra;
use App\Models\Operacion;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HoraExtraController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}


    public function store(StoreHoraExtraRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden agregar horas extra a una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $horaExtra = HoraExtra::create(array_merge($request->validated(), [
                'operacion_id' => $operacion->id,
                'estado'       => HoraExtra::ESTADO_PENDIENTE,
                'creado_por'   => $request->user()?->id,
            ]));

            $this->auditoria->registrarCreacion(
                $request, 'HORAS_EXTRA', $horaExtra,
                "Se registró hora extra ({$horaExtra->codigo}, {$horaExtra->cantidad_horas}h) de empleado #{$horaExtra->empleado_id} en planilla {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Hora extra registrada correctamente',
                'data'    => $horaExtra->load('empleado:id,primer_nombre,primer_apellido', 'tipoHoraExtra:id,codigo,nombre,porcentaje_recargo'),
            ], 201);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => 'CALC_ERROR',
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function bulkStore(Request $request, Operacion $operacion): JsonResponse
    {
        if ($operacion->isAprobada()) {
            return response()->json([
                'message' => 'No se pueden agregar horas extra a una planilla aprobada',
                'code'    => 'OPERACION_APROBADA',
            ], 409);
        }

        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'items'                      => 'required|array|min:1|max:200',
            'items.*.empleado_id'        => 'required|exists:empleados,id',
            'items.*.tipo_hora_extra_id' => 'required|exists:tipos_hora_extra,id',
            'items.*.cantidad_horas'     => 'required|numeric|min:0.25|max:12',
            'items.*.observacion'        => 'nullable|string',
        ]);

        // Validar tenant ownership de todos los tipos en una sola consulta
        $tiposIds = collect($validated['items'])->pluck('tipo_hora_extra_id')->unique()->values()->all();
        $tiposValidos = \App\Models\TipoHoraExtra::whereIn('id', $tiposIds)
            ->where('tenant_id', $tenantId)
            ->where('estado', true)
            ->pluck('id')
            ->flip()
            ->all();

        foreach ($validated['items'] as $idx => $item) {
            if (!isset($tiposValidos[$item['tipo_hora_extra_id']])) {
                return response()->json([
                    'message' => "items.{$idx}: el tipo de hora extra no es válido o está inactivo.",
                    'code'    => 'VALIDATION_ERROR',
                ], 422);
            }
        }

        try {
            $created = DB::transaction(function () use ($validated, $operacion, $request) {
                $results = [];
                foreach ($validated['items'] as $itemData) {
                    $horaExtra = HoraExtra::create(array_merge($itemData, [
                        'operacion_id' => $operacion->id,
                        'estado'       => HoraExtra::ESTADO_PENDIENTE,
                        'creado_por'   => $request->user()?->id,
                    ]));
                    $results[] = ['id' => $horaExtra->id];
                }
                return $results;
            });

            return response()->json(['data' => $created], 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error en bulk de horas extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear horas extra en bulk', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateHoraExtraRequest $request, HoraExtra $horaExtra): JsonResponse
    {
        try {
            $horaExtra->load('operacion');

            if ($horaExtra->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden editar horas extra de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($horaExtra->isLiquidada()) {
                return response()->json([
                    'message' => 'No se puede editar una hora extra ya liquidada en nómina',
                    'code'    => 'HORA_EXTRA_LIQUIDADA',
                ], 409);
            }

            $datosAnteriores = $horaExtra->toArray();

            $data = $request->validated();

            // Si cambian los inputs de cálculo, recalcular snapshots y total.
            $recalcular = array_intersect_key(
                $data,
                array_flip(['tipo_hora_extra_id', 'empleado_id', 'cantidad_horas'])
            );
            if (!empty($recalcular)) {
                // Limpiar campos derivados para que el modelo los recalcule en un nuevo ciclo creating-like.
                $horaExtra->fill($data);
                if (isset($recalcular['tipo_hora_extra_id'])) {
                    $horaExtra->codigo             = null;
                    $horaExtra->porcentaje_recargo = null;
                    // paga_hora_completa se refresca desde el nuevo tipo
                    $horaExtra->paga_hora_completa = null;
                }
                if (isset($recalcular['empleado_id'])) {
                    $horaExtra->valor_hora_base = null;
                }
                $horaExtra->valor_calculado = null;

                // Re-snapshot + recálculo inline (el booted() corre solo en creating).
                if ($horaExtra->tipo_hora_extra_id) {
                    $tipo = \App\Models\TipoHoraExtra::find($horaExtra->tipo_hora_extra_id);
                    if ($tipo) {
                        $horaExtra->codigo             = $tipo->codigo;
                        $horaExtra->porcentaje_recargo = $tipo->porcentaje_recargo;
                        $horaExtra->paga_hora_completa = $tipo->paga_hora_completa;
                    }
                }
                if ($horaExtra->empleado_id) {
                    $tenantConfig = \App\Models\TenantConfig::where('tenant_id', $horaExtra->tenant_id)->first();
                    $empleado = \App\Models\Empleado::find($horaExtra->empleado_id);
                    $salario  = $empleado?->salario_base ?? $tenantConfig?->salario_minimo_vigente;
                    if (!$salario) {
                        throw new \DomainException('CALC_ERROR: empleado sin salario_base y tenant sin salario_minimo_vigente configurado.');
                    }
                    $divisor = (int) ($tenantConfig?->divisor_jornada_mensual ?? 240);
                    $horaExtra->valor_hora_base = round(((float) $salario) / $divisor, 2);
                }
                $factor = $horaExtra->paga_hora_completa
                    ? (1 + ((float) $horaExtra->porcentaje_recargo) / 100)
                    : (((float) $horaExtra->porcentaje_recargo) / 100);
                $horaExtra->valor_calculado = round(
                    ((float) $horaExtra->cantidad_horas) * ((float) $horaExtra->valor_hora_base) * $factor,
                    2
                );
                $horaExtra->save();
            } else {
                $horaExtra->update($data);
            }

            $this->auditoria->registrarEdicion(
                $request, 'HORAS_EXTRA', $horaExtra, $datosAnteriores,
                "Se editó hora extra #{$horaExtra->id}",
            );

            return response()->json([
                'message' => 'Hora extra actualizada correctamente',
                'data'    => $horaExtra->fresh()->load('empleado:id,primer_nombre,primer_apellido', 'tipoHoraExtra:id,codigo,nombre,porcentaje_recargo'),
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => 'CALC_ERROR',
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, HoraExtra $horaExtra): JsonResponse
    {
        try {
            $horaExtra->load('operacion');

            if ($horaExtra->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar horas extra de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($horaExtra->isLiquidada()) {
                return response()->json([
                    'message' => 'No se puede eliminar una hora extra ya liquidada en nómina',
                    'code'    => 'HORA_EXTRA_LIQUIDADA',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'HORAS_EXTRA', $horaExtra,
                "Se eliminó hora extra #{$horaExtra->id}",
            );

            $horaExtra->delete();

            return response()->json(['message' => 'Hora extra eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function aprobar(Request $request, HoraExtra $horaExtra): JsonResponse
    {
        try {
            if ($horaExtra->estado !== HoraExtra::ESTADO_PENDIENTE) {
                return response()->json([
                    'message' => "Solo se pueden aprobar horas extra en estado PENDIENTE (estado actual: {$horaExtra->estado})",
                    'code'    => 'HORA_EXTRA_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $horaExtra->toArray();
            $horaExtra->update([
                'estado'       => HoraExtra::ESTADO_APROBADA,
                'aprobado_por' => $request->user()?->id,
                'aprobado_at'  => now(),
            ]);

            $this->auditoria->registrarEdicion(
                $request, 'HORAS_EXTRA', $horaExtra, $datosAnteriores,
                "Se aprobó hora extra #{$horaExtra->id}",
            );

            return response()->json([
                'message' => 'Hora extra aprobada correctamente',
                'data'    => $horaExtra->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al aprobar hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al aprobar la hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function rechazar(RechazarHoraExtraRequest $request, HoraExtra $horaExtra): JsonResponse
    {
        try {
            if ($horaExtra->estado !== HoraExtra::ESTADO_PENDIENTE) {
                return response()->json([
                    'message' => "Solo se pueden rechazar horas extra en estado PENDIENTE (estado actual: {$horaExtra->estado})",
                    'code'    => 'HORA_EXTRA_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $horaExtra->toArray();
            $horaExtra->update([
                'estado'         => HoraExtra::ESTADO_RECHAZADA,
                'motivo_rechazo' => $request->validated('motivo_rechazo'),
                'aprobado_por'   => $request->user()?->id,
                'aprobado_at'    => now(),
            ]);

            $this->auditoria->registrarEdicion(
                $request, 'HORAS_EXTRA', $horaExtra, $datosAnteriores,
                "Se rechazó hora extra #{$horaExtra->id}",
            );

            return response()->json([
                'message' => 'Hora extra rechazada correctamente',
                'data'    => $horaExtra->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al rechazar hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al rechazar la hora extra', 'error' => $e->getMessage()], 500);
        }
    }
}
