<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Operacion\StoreOperacionRequest;
use App\Http\Requests\Operacion\UpdateOperacionRequest;
use App\Models\Ausencia;
use App\Models\HoraExtra;
use App\Models\Jornal;
use App\Models\Operacion;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OperacionController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            // Subquery: empleados únicos por operación (entre jornales + cosecha_cuadrilla).
            $colaboradoresSub = DB::query()
                ->fromSub(function ($q) {
                    $q->from('jornales')
                        ->select('operacion_id', 'empleado_id')
                        ->where('estado', true)
                        ->union(
                            DB::table('cosecha_cuadrilla')
                                ->join('registro_cosecha', 'cosecha_cuadrilla.cosecha_id', '=', 'registro_cosecha.id')
                                ->select('registro_cosecha.operacion_id', 'cosecha_cuadrilla.empleado_id')
                                ->where('cosecha_cuadrilla.estado', true)
                                ->where('registro_cosecha.estado', true)
                        );
                }, 'colaboradores_union')
                ->selectRaw('operacion_id, COUNT(DISTINCT empleado_id) as total')
                ->groupBy('operacion_id');

            $operaciones = Operacion::query()
                ->with('creadoPor:id,name', 'aprobadoPor:id,name')
                ->withCount(['jornales', 'cosechas', 'ausencias'])
                ->withSum(['jornales as total_jornales_sum' => fn($q) => $q->where('estado', true)], 'valor_total')
                ->withSum(['cosechas as total_cosechas_sum' => fn($q) => $q->where('estado', true)], 'valor_total')
                ->leftJoinSub($colaboradoresSub, 'colaboradores', 'colaboradores.operacion_id', '=', 'operaciones.id')
                ->addSelect('operaciones.*', DB::raw('COALESCE(colaboradores.total, 0) as colaboradores_count'))
                ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
                ->when($request->fecha_desde, fn($q, $d) => $q->where('fecha', '>=', $d))
                ->when($request->fecha_hasta, fn($q, $d) => $q->where('fecha', '<=', $d))
                ->orderByDesc('fecha')
                ->paginate($request->per_page ?? 15);

            // Hidratar total_general = jornales + cosechas (ambos nullable → tratar como 0).
            $operaciones->getCollection()->transform(function ($op) {
                $tj = (float) ($op->total_jornales_sum ?? 0);
                $tc = (float) ($op->total_cosechas_sum ?? 0);
                $op->total_general = round($tj + $tc, 2);
                return $op;
            });

            return response()->json([
                'data' => $operaciones->items(),
                'meta' => [
                    'current_page' => $operaciones->currentPage(),
                    'last_page'    => $operaciones->lastPage(),
                    'per_page'     => $operaciones->perPage(),
                    'total'        => $operaciones->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar operaciones: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar operaciones', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Indicadores Principales (cards superiores del módulo de Operaciones).
     * Cuenta planillas por estado dentro del período seleccionado.
     *
     * Query: periodo = mensual (default) | semanal | quincenal | personalizado
     *        fecha_desde, fecha_hasta (solo con periodo=personalizado)
     */
    public function indicadores(Request $request): JsonResponse
    {
        try {
            $periodo = $request->input('periodo', 'mensual');
            [$desde, $hasta] = $this->resolverRangoPeriodo($periodo, $request);

            $porEstado = Operacion::query()
                ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
                ->selectRaw('estado, COUNT(*) as total')
                ->groupBy('estado')
                ->pluck('total', 'estado');

            $borrador  = (int) ($porEstado[Operacion::ESTADO_BORRADOR] ?? 0);
            $aprobadas = (int) ($porEstado[Operacion::ESTADO_APROBADA] ?? 0);
            $total     = $borrador + $aprobadas;

            return response()->json([
                'data' => [
                    'periodo' => [
                        'tipo'        => $periodo,
                        'fecha_desde' => $desde->toDateString(),
                        'fecha_hasta' => $hasta->toDateString(),
                    ],
                    'planillas_borrador'  => $borrador,
                    'planillas_aprobadas' => $aprobadas,
                    'total_planillas'     => $total,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al obtener indicadores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener los indicadores', 'error' => $e->getMessage()], 500);
        }
    }

    private function resolverRangoPeriodo(string $periodo, Request $request): array
    {
        $hoy = Carbon::now();

        return match ($periodo) {
            'semanal'       => [$hoy->copy()->startOfWeek(), $hoy->copy()->endOfWeek()],
            'quincenal'     => $this->rangoQuincenalActual($hoy),
            'mensual'       => [$hoy->copy()->startOfMonth(), $hoy->copy()->endOfMonth()],
            'personalizado' => $this->rangoPersonalizado($request),
            default => throw new \InvalidArgumentException("Período no soportado: {$periodo}. Use mensual, semanal, quincenal o personalizado."),
        };
    }

    /**
     * Quincena en curso según el día de hoy:
     *   - día 1-15  → Q1: día 1 al 15 del mes
     *   - día 16-31 → Q2: día 16 al último día del mes
     */
    private function rangoQuincenalActual(Carbon $hoy): array
    {
        if ($hoy->day <= 15) {
            return [$hoy->copy()->startOfMonth(), $hoy->copy()->day(15)->endOfDay()];
        }

        return [$hoy->copy()->day(16)->startOfDay(), $hoy->copy()->endOfMonth()];
    }

    private function rangoPersonalizado(Request $request): array
    {
        $desde = $request->input('fecha_desde');
        $hasta = $request->input('fecha_hasta');

        if (!$desde || !$hasta) {
            throw new \InvalidArgumentException('periodo=personalizado requiere fecha_desde y fecha_hasta (YYYY-MM-DD).');
        }

        return [Carbon::parse($desde)->startOfDay(), Carbon::parse($hasta)->endOfDay()];
    }

    public function show(Operacion $operacion): JsonResponse
    {
        try {
            $operacion->load([
                'creadoPor:id,name',
                'aprobadoPor:id,name',
                'cosechas.cuadrilla.empleado:id,primer_nombre,primer_apellido,documento',
                'cosechas.lote:id,nombre',
                'cosechas.sublote:id,nombre',
                'jornales.empleado:id,primer_nombre,primer_apellido,documento',
                'jornales.labor:id,nombre,valor_base',
                'jornales.lote:id,nombre',
                'jornales.sublote:id,nombre',
                'jornales.insumo:id,nombre',
                'ausencias.empleado:id,primer_nombre,primer_apellido',
            ]);

            return response()->json(['data' => $operacion]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener la operación', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreOperacionRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['creado_por'] = $request->user()?->id;
            $data['estado']     = Operacion::ESTADO_BORRADOR;

            $operacion = Operacion::create($data);

            $this->auditoria->registrarCreacion(
                $request, 'OPERACIONES', $operacion,
                "Se creó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla creada correctamente',
                'data'    => $operacion->load('creadoPor:id,name'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateOperacionRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se puede editar una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $datosAnteriores = $operacion->toArray();
            $operacion->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'OPERACIONES', $operacion, $datosAnteriores,
                "Se editó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla actualizada correctamente',
                'data'    => $operacion->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se puede eliminar una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($operacion->jornales()->exists() || $operacion->cosechas()->exists() || $operacion->ausencias()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar: la planilla tiene jornales, cosechas o ausencias asociadas',
                    'code'    => 'OPERACION_CON_HIJOS',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'OPERACIONES', $operacion,
                "Se eliminó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            $operacion->delete();

            return response()->json(['message' => 'Planilla eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function aprobar(Request $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'La planilla ya está aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $datosAnteriores = $operacion->toArray();
            $operacion->aprobar($request->user()->id);

            $this->auditoria->registrarEdicion(
                $request, 'OPERACIONES', $operacion, $datosAnteriores,
                "Se aprobó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla aprobada correctamente',
                'data'    => $operacion->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al aprobar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al aprobar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function resumen(Operacion $operacion): JsonResponse
    {
        try {
            $operacion->loadMissing('creadoPor:id,name');

            $conteoPorTipo = Jornal::query()
                ->where('operacion_id', $operacion->id)
                ->where('estado', true)
                ->selectRaw('categoria, tipo, COUNT(*) as total')
                ->groupBy('categoria', 'tipo')
                ->get();

            $labores = [
                'cosecha'       => $operacion->cosechas()->where('estado', true)->count(),
                'plateo'        => 0,
                'poda'          => 0,
                'fertilizacion' => 0,
                'sanidad'       => 0,
                'otros'         => 0,
                'auxiliares'    => 0,
            ];

            foreach ($conteoPorTipo as $row) {
                if ($row->categoria === Jornal::CATEGORIA_FINCA) {
                    $labores['auxiliares'] += $row->total;
                    continue;
                }
                $key = strtolower($row->tipo ?? '');
                if (array_key_exists($key, $labores)) {
                    $labores[$key] = $row->total;
                }
            }

            $ausenciasConteo = Ausencia::query()
                ->where('operacion_id', $operacion->id)
                ->selectRaw('estado, COUNT(*) as total')
                ->groupBy('estado')
                ->pluck('total', 'estado');

            $ausencias = [
                'pendientes' => (int) ($ausenciasConteo[Ausencia::ESTADO_PENDIENTE] ?? 0),
                'aprobadas'  => (int) ($ausenciasConteo[Ausencia::ESTADO_APROBADA] ?? 0),
                'rechazadas' => (int) ($ausenciasConteo[Ausencia::ESTADO_RECHAZADA] ?? 0),
                'liquidadas' => (int) ($ausenciasConteo[Ausencia::ESTADO_LIQUIDADA] ?? 0),
            ];
            $ausencias['total'] = array_sum($ausencias);

            $horasExtraRows = HoraExtra::query()
                ->where('operacion_id', $operacion->id)
                ->selectRaw('estado, COUNT(*) as total, COALESCE(SUM(cantidad_horas), 0) as horas, COALESCE(SUM(valor_calculado), 0) as valor')
                ->groupBy('estado')
                ->get()
                ->keyBy('estado');

            $horasExtra = [
                'pendientes' => (int) ($horasExtraRows[HoraExtra::ESTADO_PENDIENTE]->total ?? 0),
                'aprobadas'  => (int) ($horasExtraRows[HoraExtra::ESTADO_APROBADA]->total ?? 0),
                'rechazadas' => (int) ($horasExtraRows[HoraExtra::ESTADO_RECHAZADA]->total ?? 0),
                'liquidadas' => (int) ($horasExtraRows[HoraExtra::ESTADO_LIQUIDADA]->total ?? 0),
            ];
            $horasExtra['total']         = $horasExtra['pendientes'] + $horasExtra['aprobadas']
                                          + $horasExtra['rechazadas'] + $horasExtra['liquidadas'];
            $horasExtra['horas_totales'] = number_format((float) $horasExtraRows->sum('horas'), 2, '.', '');
            $horasExtra['valor_total']   = number_format((float) $horasExtraRows->sum('valor'), 2, '.', '');

            return response()->json([
                'data' => [
                    'fecha'           => $operacion->fecha?->format('Y-m-d'),
                    'elaborado_por'   => $operacion->creadoPor?->name,
                    'hubo_lluvia'     => (bool) $operacion->hubo_lluvia,
                    'cantidad_lluvia' => $operacion->cantidad_lluvia,
                    'inicio_labores'  => $operacion->hora_inicio,
                    'estado'          => $operacion->estado,
                    'labores'         => $labores,
                    'ausencias'       => $ausencias,
                    'horas_extra'     => $horasExtra,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener resumen: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el resumen', 'error' => $e->getMessage()], 500);
        }
    }
}
