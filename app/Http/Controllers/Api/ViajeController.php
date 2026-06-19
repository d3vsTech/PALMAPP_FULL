<?php

namespace App\Http\Controllers\Api;

use App\Constants\ViajeEstado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Viaje\SaltarValidacionRequest;
use App\Http\Requests\Viaje\StoreViajeDetalleRequest;
use App\Http\Requests\Viaje\StoreViajeRequest;
use App\Http\Requests\Viaje\UpdateReconteoRequest;
use App\Http\Requests\Viaje\UpdateViajeRequest;
use App\Http\Requests\Viaje\ValidarViajeRequest;
use App\Models\Extractora;
use App\Models\Operacion;
use App\Models\RegistroCosecha;
use App\Models\Transportador;
use App\Models\Viaje;
use App\Models\ViajeDetalle;
use App\Services\AuditoriaService;
use App\Services\RemisionGeneratorService;
use App\Services\ViajeCalculationService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ViajeController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected RemisionGeneratorService $remisionService,
        protected ViajeCalculationService $calculationService,
    ) {}

    // ─────────────────────────────────────────────────────────────
    // LISTADO E INDICADORES
    // ─────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $viajes = Viaje::query()
                ->activos()
                ->with([
                    'transportador:id,nombres,apellidos,placa_vehiculo,empresa_transportadora_id',
                    'empresa:id,razon_social,nit',
                    'extractora:id,razon_social,ubicacion',
                    'creador:id,name',
                ])
                ->withCount(['detalles as detalles_count' => fn ($q) => $q->where('estado', true)])
                ->when($request->remision, fn ($q, $v) => $q->where('remision', 'ilike', "%{$v}%"))
                ->when($request->fecha, fn ($q, $v) => $q->whereDate('fecha_viaje', $v))
                ->when($request->fecha_desde, fn ($q, $v) => $q->where('fecha_viaje', '>=', $v))
                ->when($request->fecha_hasta, fn ($q, $v) => $q->where('fecha_viaje', '<=', $v))
                ->when($request->estado, fn ($q, $v) => $q->where('estado', $v))
                ->when($request->vehiculo, fn ($q, $v) => $q->where('placa_vehiculo', 'ilike', "%{$v}%"))
                ->when($request->conductor, fn ($q, $v) => $q->where('nombre_conductor', 'ilike', "%{$v}%"))
                ->when($request->extractora_id, fn ($q, $v) => $q->where('extractora_id', $v))
                ->when($request->transportador_id, fn ($q, $v) => $q->where('transportador_id', $v))
                ->when($request->empresa_transportadora_id, fn ($q, $v) => $q->where('empresa_transportadora_id', $v))
                ->orderByDesc('fecha_viaje')
                ->orderByDesc('id')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $viajes->items(),
                'meta' => [
                    'current_page' => $viajes->currentPage(),
                    'last_page'    => $viajes->lastPage(),
                    'per_page'     => $viajes->perPage(),
                    'total'        => $viajes->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar viajes: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar viajes', 'error' => $e->getMessage()], 500);
        }
    }

    public function indicadores(Request $request): JsonResponse
    {
        try {
            [$desde, $hasta, $periodo] = $this->resolverPeriodo($request);

            $base = Viaje::query()->activos()
                ->whereBetween('fecha_viaje', [$desde, $hasta]);

            $totales = (clone $base)
                ->selectRaw("
                    COUNT(*) as total_viajes,
                    COUNT(*) FILTER (WHERE estado = ?) as en_validacion,
                    COUNT(*) FILTER (WHERE estado = ?) as finalizados,
                    COALESCE(SUM(peso_viaje), 0) as kilogramos_totales,
                    COALESCE(SUM(cantidad_gajos_total), 0) as gajos_totales
                ", [ViajeEstado::EN_VALIDACION, ViajeEstado::FINALIZADO])
                ->first();

            return response()->json([
                'data' => [
                    'periodo'            => $periodo,
                    'desde'              => $desde->format('Y-m-d'),
                    'hasta'              => $hasta->format('Y-m-d'),
                    'total_viajes'       => (int) $totales->total_viajes,
                    'en_validacion'      => (int) $totales->en_validacion,
                    'finalizados'        => (int) $totales->finalizados,
                    'kilogramos_totales' => (float) $totales->kilogramos_totales,
                    'gajos_totales'      => (int) $totales->gajos_totales,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al calcular indicadores de viajes: ' . $e->getMessage());
            return response()->json(['message' => 'Error al calcular indicadores', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Recomputa es_homogeneo basándose en los lotes de las cosechas activas del viaje.
     * 0 o 1 lote distinto → true (homogéneo). 2+ lotes distintos → false.
     * Se llama tras cada addDetalle() y removeDetalle() dentro de una transacción.
     */
    private function recalcularHomogeneidad(Viaje $viaje): void
    {
        $lotesDistintos = ViajeDetalle::where('viaje_id', $viaje->id)
            ->where('estado', true)
            ->join('registro_cosecha', 'viaje_detalle.cosecha_id', '=', 'registro_cosecha.id')
            ->distinct()
            ->count('registro_cosecha.lote_id');

        $viaje->update(['es_homogeneo' => $lotesDistintos <= 1]);
    }

    private function resolverPeriodo(Request $request): array
    {
        $periodo = strtoupper($request->periodo ?? 'MENSUAL');
        $hoy = Carbon::today();

        return match ($periodo) {
            'SEMANAL' => [$hoy->copy()->subDays(6), $hoy, 'SEMANAL'],
            'ANUAL'   => [$hoy->copy()->startOfYear(), $hoy, 'ANUAL'],
            'CUSTOM'  => [
                Carbon::parse($request->desde ?? $hoy->copy()->startOfMonth()),
                Carbon::parse($request->hasta ?? $hoy),
                'CUSTOM',
            ],
            default   => [$hoy->copy()->startOfMonth(), $hoy, 'MENSUAL'],
        };
    }

    // ─────────────────────────────────────────────────────────────
    // SELECTS PARA ASIGNAR COSECHAS
    // ─────────────────────────────────────────────────────────────

    public function operacionesDisponibles(Request $request): JsonResponse
    {
        try {
            $operaciones = Operacion::query()
                ->aprobadas()
                ->whereHas('cosechas', function ($q) {
                    $q->where('registro_cosecha.estado', true)
                      ->whereNotIn('registro_cosecha.id', function ($sub) {
                          $sub->select('cosecha_id')
                              ->from('viaje_detalle')
                              ->where('estado', true);
                      });
                })
                ->withCount(['cosechas as cosechas_disponibles_count' => function ($q) {
                    $q->where('registro_cosecha.estado', true)
                      ->whereNotIn('registro_cosecha.id', function ($sub) {
                          $sub->select('cosecha_id')
                              ->from('viaje_detalle')
                              ->where('estado', true);
                      });
                }])
                ->when($request->fecha_desde, fn ($q, $v) => $q->where('fecha', '>=', $v))
                ->when($request->fecha_hasta, fn ($q, $v) => $q->where('fecha', '<=', $v))
                ->orderByDesc('fecha')
                ->get(['id', 'fecha', 'estado', 'observaciones']);

            return response()->json(['data' => $operaciones]);
        } catch (\Throwable $e) {
            Log::error('Error al listar operaciones disponibles: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar operaciones', 'error' => $e->getMessage()], 500);
        }
    }

    public function cosechasDisponibles(Operacion $operacion): JsonResponse
    {
        try {
            $cosechas = RegistroCosecha::query()
                ->where('operacion_id', $operacion->id)
                ->where('estado', true)
                ->whereNotIn('id', function ($sub) {
                    $sub->select('cosecha_id')
                        ->from('viaje_detalle')
                        ->where('estado', true);
                })
                ->with(['lote:id,nombre', 'sublote:id,nombre'])
                ->withCount(['cuadrilla as cuadrilla_count' => fn ($q) => $q->where('estado', true)])
                ->get(['id', 'operacion_id', 'lote_id', 'sublote_id', 'gajos_reportados', 'gajos_reconteo', 'peso_confirmado']);

            return response()->json(['data' => $cosechas]);
        } catch (\Throwable $e) {
            Log::error('Error al listar cosechas disponibles: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar cosechas', 'error' => $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CRUD DE VIAJE
    // ─────────────────────────────────────────────────────────────

    public function store(StoreViajeRequest $request): JsonResponse
    {
        try {
            $transportador = Transportador::activos()->find($request->transportador_id);
            if (! $transportador) {
                return response()->json([
                    'message' => 'El transportador no existe o está inactivo',
                    'code'    => 'TRANSPORTADOR_INACTIVO',
                ], 422);
            }

            $extractora = Extractora::activas()->find($request->extractora_id);
            if (! $extractora) {
                return response()->json([
                    'message' => 'La extractora no existe o está inactiva',
                    'code'    => 'EXTRACTORA_INACTIVA',
                ], 422);
            }

            $viaje = DB::transaction(function () use ($request, $transportador, $extractora) {
                $tenantId = app('current_tenant_id');
                $remision = $this->remisionService->generar(
                    $tenantId,
                    Carbon::parse($request->fecha_viaje),
                );

                return Viaje::create([
                    'transportador_id'          => $transportador->id,
                    'empresa_transportadora_id' => $transportador->empresa_transportadora_id,
                    'extractora_id'             => $extractora->id,
                    'remision'                  => $remision,
                    'placa_vehiculo'            => $transportador->placa_vehiculo,
                    'nombre_conductor'          => trim("{$transportador->nombres} {$transportador->apellidos}"),
                    'fecha_viaje'               => $request->fecha_viaje,
                    'hora_salida'               => $request->hora_salida,
                    'es_homogeneo'              => true,
                    'observaciones'             => $request->observaciones,
                    'sync_uuid'                 => $request->sync_uuid,
                    'sync_estado'               => 'SINCRONIZADO',
                    'estado'                    => ViajeEstado::CREADO,
                    'estado_activo'             => true,
                    'creado_por'                => $request->user()?->id,
                ]);
            });

            $this->auditoria->registrarCreacion(
                $request, 'VIAJES', $viaje,
                "Se creó viaje {$viaje->remision}",
            );

            return response()->json([
                'message' => 'Viaje creado correctamente',
                'data'    => $viaje->load(['transportador', 'empresa', 'extractora']),
            ], 201);
        } catch (UniqueConstraintViolationException $e) {
            Log::warning('Colisión de remisión al crear viaje: ' . $e->getMessage());
            return response()->json([
                'message' => 'Colisión al generar remisión, intente de nuevo',
                'code'    => 'REMISION_DUPLICADA',
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear viaje', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Viaje $viaje): JsonResponse
    {
        try {
            $viaje->load([
                'transportador',
                'empresa',
                'extractora',
                'creador:id,name',
                'detalles' => fn ($q) => $q->where('estado', true),
                'detalles.cosecha.lote:id,nombre',
                'detalles.cosecha.sublote:id,nombre',
                'detalles.aprobadoPor:id,name',
            ]);

            return response()->json(['data' => $viaje]);
        } catch (\Throwable $e) {
            Log::error('Error al mostrar viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el viaje', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateViajeRequest $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'Solo se pueden editar viajes en estado CREADO',
                    'code'    => 'VIAJE_NO_EDITABLE',
                ], 409);
            }

            $datosAnteriores = $viaje->toArray();
            $data = $request->validated();

            // Si cambia el transportador, re-snapshot placa y conductor
            if (! empty($data['transportador_id']) && $data['transportador_id'] !== $viaje->transportador_id) {
                $transportador = Transportador::activos()->find($data['transportador_id']);
                if (! $transportador) {
                    return response()->json([
                        'message' => 'El transportador no existe o está inactivo',
                        'code'    => 'TRANSPORTADOR_INACTIVO',
                    ], 422);
                }
                $data['empresa_transportadora_id'] = $transportador->empresa_transportadora_id;
                $data['placa_vehiculo']            = $transportador->placa_vehiculo;
                $data['nombre_conductor']          = trim("{$transportador->nombres} {$transportador->apellidos}");
            }

            if (! empty($data['extractora_id']) && $data['extractora_id'] !== $viaje->extractora_id) {
                $extractora = Extractora::activas()->find($data['extractora_id']);
                if (! $extractora) {
                    return response()->json([
                        'message' => 'La extractora no existe o está inactiva',
                        'code'    => 'EXTRACTORA_INACTIVA',
                    ], 422);
                }
            }

            $viaje->update($data);

            $this->auditoria->registrarEdicion(
                $request, 'VIAJES', $viaje, $datosAnteriores,
                "Se editó viaje {$viaje->remision}",
            );

            return response()->json([
                'message' => 'Viaje actualizado correctamente',
                'data'    => $viaje->fresh(['transportador', 'empresa', 'extractora']),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar viaje', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado === ViajeEstado::FINALIZADO) {
                return response()->json([
                    'message' => 'No se puede eliminar un viaje finalizado',
                    'code'    => 'VIAJE_FINALIZADO',
                ], 409);
            }

            DB::transaction(function () use ($viaje) {
                ViajeDetalle::where('viaje_id', $viaje->id)->update(['estado' => false]);
                $viaje->update(['estado_activo' => false]);
            });

            $this->auditoria->registrarEliminacion(
                $request, 'VIAJES', $viaje,
                "Se eliminó viaje {$viaje->remision}",
            );

            return response()->json(['message' => 'Viaje eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar viaje', 'error' => $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DETALLES (COSECHAS ASIGNADAS AL VIAJE)
    // ─────────────────────────────────────────────────────────────

    public function addDetalle(StoreViajeDetalleRequest $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'Solo se pueden asignar cosechas con el viaje en estado CREADO',
                    'code'    => 'VIAJE_NO_EDITABLE',
                ], 409);
            }

            $cosecha = RegistroCosecha::with('operacion')->find($request->cosecha_id);
            if (! $cosecha) {
                return response()->json(['message' => 'Cosecha no encontrada'], 404);
            }

            if (! $cosecha->operacion || ! $cosecha->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'La operación padre de la cosecha no está aprobada',
                    'code'    => 'OPERACION_NO_APROBADA',
                ], 422);
            }

            $yaAsignada = ViajeDetalle::activos()
                ->where('cosecha_id', $cosecha->id)
                ->exists();

            if ($yaAsignada) {
                return response()->json([
                    'message' => 'Esta cosecha ya está asignada a otro viaje',
                    'code'    => 'COSECHA_YA_ASIGNADA',
                ], 422);
            }

            try {
                $detalle = DB::transaction(function () use ($viaje, $cosecha) {
                    $detalle = ViajeDetalle::create([
                        'viaje_id'   => $viaje->id,
                        'cosecha_id' => $cosecha->id,
                        'estado'     => true,
                    ]);
                    $this->recalcularHomogeneidad($viaje);
                    return $detalle;
                });
            } catch (UniqueConstraintViolationException $e) {
                return response()->json([
                    'message' => 'Esta cosecha ya está asignada a otro viaje',
                    'code'    => 'COSECHA_YA_ASIGNADA',
                ], 422);
            }

            $this->auditoria->registrarCreacion(
                $request, 'VIAJES', $detalle,
                "Se asignó cosecha #{$cosecha->id} al viaje {$viaje->remision}",
            );

            return response()->json([
                'message' => 'Cosecha asignada correctamente',
                'data'    => $detalle->load('cosecha.lote:id,nombre', 'cosecha.sublote:id,nombre'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al asignar cosecha al viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al asignar cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function removeDetalle(Request $request, Viaje $viaje, ViajeDetalle $detalle): JsonResponse
    {
        try {
            if ($detalle->viaje_id !== $viaje->id) {
                return response()->json(['message' => 'Detalle no pertenece al viaje', 'code' => 'DETALLE_NOT_FOUND'], 404);
            }

            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'Solo se pueden quitar cosechas con el viaje en estado CREADO',
                    'code'    => 'VIAJE_NO_EDITABLE',
                ], 409);
            }

            if ($detalle->reconteo_aprobado) {
                return response()->json([
                    'message' => 'No se puede eliminar un detalle con reconteo aprobado',
                    'code'    => 'DETALLE_APROBADO',
                ], 409);
            }

            DB::transaction(function () use ($viaje, $detalle) {
                $detalle->update(['estado' => false]);
                $this->recalcularHomogeneidad($viaje);
            });

            $this->auditoria->registrarEliminacion(
                $request, 'VIAJES', $detalle,
                "Se quitó cosecha #{$detalle->cosecha_id} del viaje {$viaje->remision}",
            );

            return response()->json(['message' => 'Cosecha desasignada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al quitar cosecha del viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al quitar cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RECONTEO
    // ─────────────────────────────────────────────────────────────

    public function updateReconteo(UpdateReconteoRequest $request, Viaje $viaje, ViajeDetalle $detalle): JsonResponse
    {
        try {
            if ($detalle->viaje_id !== $viaje->id) {
                return response()->json(['message' => 'Detalle no pertenece al viaje', 'code' => 'DETALLE_NOT_FOUND'], 404);
            }

            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'El reconteo solo se puede editar en estado CREADO',
                    'code'    => 'VIAJE_NO_EDITABLE',
                ], 409);
            }

            if ($detalle->reconteo_aprobado) {
                return response()->json([
                    'message' => 'El reconteo de este detalle ya fue aprobado',
                    'code'    => 'DETALLE_APROBADO',
                ], 409);
            }

            $data = $request->validated();

            DB::transaction(function () use ($viaje, $detalle, $data) {
                $cosecha = RegistroCosecha::findOrFail($detalle->cosecha_id);
                $datosCosecha = ['gajos_reconteo' => $data['gajos_reconteo']];
                if (array_key_exists('peso_confirmado', $data) && $data['peso_confirmado'] !== null) {
                    $datosCosecha['peso_confirmado'] = $data['peso_confirmado'];
                }
                $cosecha->update($datosCosecha);

                // Refrescar cantidad_gajos_total del viaje
                $total = DB::table('registro_cosecha')
                    ->whereIn('id', function ($sub) use ($viaje) {
                        $sub->select('cosecha_id')->from('viaje_detalle')
                            ->where('viaje_id', $viaje->id)->where('estado', true);
                    })
                    ->sum('gajos_reconteo');

                $viaje->update(['cantidad_gajos_total' => (int) $total]);
            });

            $this->auditoria->registrar(
                $request,
                'EDITAR',
                'VIAJES',
                "Se actualizó reconteo del detalle #{$detalle->id} en viaje {$viaje->remision}",
                null,
                $data,
            );

            return response()->json([
                'message' => 'Reconteo actualizado correctamente',
                'data'    => $detalle->fresh(['cosecha']),
                'viaje'   => $viaje->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar reconteo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar reconteo', 'error' => $e->getMessage()], 500);
        }
    }

    public function aprobarReconteo(Request $request, Viaje $viaje, ViajeDetalle $detalle): JsonResponse
    {
        try {
            if ($detalle->viaje_id !== $viaje->id) {
                return response()->json(['message' => 'Detalle no pertenece al viaje', 'code' => 'DETALLE_NOT_FOUND'], 404);
            }

            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'Solo se pueden aprobar reconteos en estado CREADO',
                    'code'    => 'VIAJE_ESTADO_INVALIDO',
                ], 409);
            }

            if ($detalle->reconteo_aprobado) {
                return response()->json([
                    'message' => 'Este reconteo ya fue aprobado',
                    'code'    => 'DETALLE_APROBADO',
                ], 409);
            }

            $cosecha = RegistroCosecha::findOrFail($detalle->cosecha_id);
            if (is_null($cosecha->gajos_reconteo)) {
                return response()->json([
                    'message' => 'Debe hidratar el reconteo (gajos) antes de aprobarlo',
                    'code'    => 'RECONTEO_PENDIENTE',
                ], 422);
            }

            $autoEnValidacion = false;

            DB::transaction(function () use ($viaje, $detalle, $request, &$autoEnValidacion) {
                $detalle->update([
                    'reconteo_aprobado'    => true,
                    'reconteo_aprobado_at' => now(),
                    'reconteo_aprobado_por' => $request->user()?->id,
                ]);

                $pendientes = ViajeDetalle::where('viaje_id', $viaje->id)
                    ->where('estado', true)
                    ->where('reconteo_aprobado', false)
                    ->count();

                if ($pendientes === 0) {
                    $viaje->update([
                        'estado'        => ViajeEstado::EN_VALIDACION,
                        'validacion_at' => now(),
                    ]);
                    $autoEnValidacion = true;
                }
            });

            $this->auditoria->registrar(
                $request,
                $autoEnValidacion ? 'TRANSICIONAR_VALIDACION' : 'APROBAR_RECONTEO',
                'VIAJES',
                $autoEnValidacion
                    ? "Viaje {$viaje->remision} pasó a validación tras aprobar el último reconteo"
                    : "Se aprobó reconteo del detalle #{$detalle->id} en viaje {$viaje->remision}",
                null,
                ['detalle_id' => $detalle->id, 'viaje_id' => $viaje->id, 'auto_en_validacion' => $autoEnValidacion],
            );

            return response()->json([
                'data' => [
                    'detalle_id'         => $detalle->id,
                    'reconteo_aprobado'  => true,
                    'viaje_estado'       => $viaje->fresh()->estado,
                    'auto_en_validacion' => $autoEnValidacion,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al aprobar reconteo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al aprobar reconteo', 'error' => $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TRANSICIONES DE ESTADO
    // ─────────────────────────────────────────────────────────────

    /**
     * POST /viajes/{viaje}/saltar-validacion
     *
     * Permite a fincas que pagan por jornal saltar el flujo de reconteo y pasar
     * el viaje directo de CREADO a EN_VALIDACION sin enlazar cosechas ni aprobar
     * detalles. Si llega `observaciones`, se concatena al campo del viaje.
     */
    public function saltarValidacion(SaltarValidacionRequest $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado !== ViajeEstado::CREADO) {
                return response()->json([
                    'message' => 'Solo viajes en CREADO pueden saltar a validación',
                    'code'    => 'VIAJE_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $viaje->toArray();

            DB::transaction(function () use ($viaje, $request) {
                $payload = [
                    'estado'        => ViajeEstado::EN_VALIDACION,
                    'validacion_at' => now(),
                ];

                if ($request->filled('observaciones')) {
                    $previo = trim((string) $viaje->observaciones);
                    $nuevo  = trim($request->input('observaciones'));
                    $payload['observaciones'] = $previo === '' ? $nuevo : "{$previo}\n{$nuevo}";
                }

                $viaje->update($payload);
            });

            $this->auditoria->registrar(
                $request,
                'SALTAR_VALIDACION',
                'VIAJES',
                "Viaje {$viaje->remision} saltó a EN_VALIDACION sin reconteo (paga por jornal)",
                $datosAnteriores,
                $viaje->fresh()->toArray(),
            );

            return response()->json([
                'message' => 'Viaje pasado a validación',
                'data'    => $viaje->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al saltar a validación: ' . $e->getMessage());
            return response()->json(['message' => 'Error al saltar a validación', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /viajes/{viaje}/validar
     *
     * Hidrata los datos del formulario de extractora (peso recibido, número
     * de remisión de la extractora, fecha/hora de llegada, observaciones y
     * los 5 porcentajes de calificación de fruto: verde, sobre maduro,
     * podrido, pedúnculo largo, mal formado) sin transicionar el estado.
     * El cierre del viaje lo dispara `finalizar()` aparte.
     */
    public function validar(ValidarViajeRequest $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado !== ViajeEstado::EN_VALIDACION) {
                return response()->json([
                    'message' => 'Solo viajes en EN_VALIDACION pueden recibir datos de validación',
                    'code'    => 'VIAJE_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $viaje->toArray();

            $payload = $request->only([
                'peso_viaje',
                'numero_remision_extractora',
                'fecha_llegada',
                'hora_llegada',
                'fruto_verde',
                'sobre_maduro',
                'podrido',
                'pedunculo_largo',
                'mal_formado',
                'observaciones_extractora',
            ]);

            $viaje->update($payload);

            $this->auditoria->registrar(
                $request,
                'VALIDAR',
                'VIAJES',
                "Se hidrataron datos de validación del viaje {$viaje->remision}",
                $datosAnteriores,
                $viaje->fresh()->toArray(),
            );

            return response()->json([
                'message' => 'Datos de validación guardados',
                'data'    => $viaje->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al validar viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al validar viaje', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /viajes/{viaje}/finalizar
     *
     * Cierra el viaje (EN_VALIDACION → FINALIZADO). Solo exige peso_viaje y
     * cantidad_gajos_total cuando el viaje tiene detalles enlazados (caso
     * "paga por producción"). Para fincas que pagan por jornal — sin
     * detalles — se permite cerrar con todos los campos en NULL.
     */
    public function finalizar(Request $request, Viaje $viaje): JsonResponse
    {
        try {
            if ($viaje->estado !== ViajeEstado::EN_VALIDACION) {
                return response()->json([
                    'message' => 'Solo viajes en EN_VALIDACION pueden finalizarse',
                    'code'    => 'VIAJE_ESTADO_INVALIDO',
                ], 409);
            }

            $tieneDetalles = $viaje->detalles()->where('estado', true)->exists();

            if ($tieneDetalles && (is_null($viaje->peso_viaje) || is_null($viaje->cantidad_gajos_total))) {
                return response()->json([
                    'message' => 'El viaje tiene detalles enlazados; requiere peso_viaje y cantidad_gajos_total para finalizar',
                    'code'    => 'VIAJE_INCOMPLETO',
                ], 422);
            }

            $datosAnteriores = $viaje->toArray();

            DB::transaction(function () use ($viaje) {
                $viaje->update([
                    'estado'         => ViajeEstado::FINALIZADO,
                    'finalizado_at'  => now(),
                ]);

                // calcularAlFinalizar() ya retorna temprano si no hay detalles,
                // peso_viaje, o cantidad_gajos_total. Sirve para ambos flujos.
                $this->calculationService->calcularAlFinalizar($viaje->fresh());
            });

            $this->auditoria->registrar(
                $request,
                'FINALIZAR',
                'VIAJES',
                "Viaje {$viaje->remision} finalizado",
                $datosAnteriores,
                $viaje->fresh()->toArray(),
            );

            return response()->json([
                'message' => 'Viaje finalizado correctamente',
                'data'    => $viaje->fresh(['detalles.cosecha']),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al finalizar viaje: ' . $e->getMessage());
            return response()->json(['message' => 'Error al finalizar viaje', 'error' => $e->getMessage()], 500);
        }
    }
}
