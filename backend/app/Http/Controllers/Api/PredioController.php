<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Predio\StorePredioRequest;
use App\Http\Requests\Predio\UpdatePredioRequest;
use App\Models\Lote;
use App\Models\Predio;
use App\Models\Semilla;
use App\Models\Sublote;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PredioController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/predios/wizard-init
     * GET /api/v1/tenant/predios/{predio}/wizard-init
     *
     * Bundle para el wizard de creación/edición de predios.
     * Reemplaza ~14 fetches secuenciales por 1 sola request.
     * Las palmas NO se incluyen; se cargan paginadas al llegar al paso 5.
     */
    public function wizardInit(Request $request, ?Predio $predio = null): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $semillas = Cache::remember(
                WizardCache::semillas($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn() => Semilla::activos()->orderBy('nombre')->get(['id', 'tipo', 'nombre'])->toArray(),
            );

            $departamentos = Cache::remember(
                WizardCache::departamentos(),
                WizardCache::TTL_UBICACIONES,
                fn() => DB::table('departamentos')->orderBy('nombre')->get(['codigo', 'nombre'])->toArray(),
            );

            if ($predio === null) {
                return response()->json([
                    'data' => [
                        'predio'       => null,
                        'lotes'        => [],
                        'sublotes'     => [],
                        'lineas'       => [],
                        'parametricas' => compact('semillas', 'departamentos'),
                    ],
                ]);
            }

            $bundle = Cache::remember(
                WizardCache::predioBundle($tenantId, $predio->id),
                WizardCache::TTL_PREDIO_BUNDLE,
                function () use ($predio) {
                    $predio->load([
                        'lotes'                 => fn($q) => $q->orderBy('nombre'),
                        'lotes.semillas',
                        'lotes.sublotes'        => fn($q) => $q->orderBy('nombre'),
                        'lotes.sublotes.lineas' => fn($q) => $q->orderBy('numero'),
                    ]);

                    $lotes    = [];
                    $sublotes = [];
                    $lineas   = [];

                    foreach ($predio->lotes as $lote) {
                        $lotes[] = [
                            'id'                  => $lote->id,
                            'nombre'              => $lote->nombre,
                            'hectareas_sembradas' => $lote->hectareas_sembradas,
                            'semillas'            => $lote->semillas->map(fn($s) => ['id' => $s->id, 'nombre' => $s->nombre])->values(),
                        ];

                        $sublotes[$lote->id] = [];

                        foreach ($lote->sublotes as $sublote) {
                            $sublotes[$lote->id][] = [
                                'id'              => $sublote->id,
                                'nombre'          => $sublote->nombre,
                                'cantidad_palmas' => (int) $sublote->cantidad_palmas,
                                'cantidad_lineas' => $sublote->lineas->count(),
                            ];

                            $lineas[$sublote->id] = $sublote->lineas->map(fn($l) => [
                                'id'              => $l->id,
                                'numero'          => $l->numero,
                                'cantidad_palmas' => (int) ($l->cantidad_palmas ?? 0),
                            ])->values()->toArray();
                        }
                    }

                    return compact('lotes', 'sublotes', 'lineas');
                },
            );

            return response()->json([
                'data' => [
                    'predio' => [
                        'id'                => $predio->id,
                        'nombre'            => $predio->nombre,
                        'ubicacion'         => $predio->ubicacion,
                        'hectareas_totales' => $predio->hectareas_totales,
                    ],
                    'lotes'        => $bundle['lotes'],
                    'sublotes'     => $bundle['sublotes'],
                    'lineas'       => $bundle['lineas'],
                    'parametricas' => compact('semillas', 'departamentos'),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en predios wizard-init: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al inicializar el wizard de predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/predios
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = (int) ($request->per_page ?? 15);
            $cacheable = !$request->filled('search') && !$request->has('estado');
            $tenantId = (int) app('current_tenant_id');

            $build = function () use ($request, $perPage) {
                $predios = Predio::query()
                    ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                    ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                    ->withCount('lotes')
                    ->withSum('sublotes as palmas_count', 'cantidad_palmas')
                    ->orderBy('nombre')
                    ->paginate($perPage);

                $predios->getCollection()->transform(function ($predio) {
                    $predio->palmas_count = (int) ($predio->palmas_count ?? 0);
                    return $predio;
                });

                return [
                    'data' => $predios->items(),
                    'meta' => [
                        'current_page' => $predios->currentPage(),
                        'last_page'    => $predios->lastPage(),
                        'per_page'     => $predios->perPage(),
                        'total'        => $predios->total(),
                    ],
                ];
            };

            $payload = $cacheable
                ? Cache::remember(
                    WizardCache::predios($tenantId) . ":p:{$perPage}",
                    WizardCache::TTL_PREDIO_BUNDLE,
                    $build,
                )
                : $build();

            $response = response()->json($payload);

            if ($cacheable) {
                $response
                    ->header('Cache-Control', 'private, max-age=600')
                    ->header('ETag', '"' . md5(serialize($payload)) . '"');
            }

            return $response;
        } catch (\Throwable $e) {
            Log::error('Error al listar predios: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los predios',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Forget cached predios listings + globales del tenant.
     * Delegado a WizardCache para que todas las mutaciones (predios,
     * lotes, sublotes, líneas, palmas y jobs async) invaliden las
     * mismas claves.
     */
    protected function forgetPrediosCache(int $tenantId): void
    {
        WizardCache::forgetPrediosResumenes($tenantId);
    }

    /**
     * GET /api/v1/tenant/predios/totales
     *
     * Totales globales del tenant para las tarjetas de la vista
     * "Mi Plantación" (Hectáreas, Lotes, Palmas). Evita el N+1
     * de llamar resumen() por cada predio.
     */
    public function totales(): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = Cache::remember(
                WizardCache::prediosTotales($tenantId),
                WizardCache::TTL_PREDIO_BUNDLE,
                fn() => [
                    'predios_count'     => Predio::count(),
                    'lotes_count'       => Lote::count(),
                    'palmas_count'      => (int) Sublote::sum('cantidad_palmas'),
                    'hectareas_totales' => number_format((float) Predio::sum('hectareas_totales'), 2, '.', ''),
                ],
            );

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener totales de predios: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener los totales de predios',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/predios/{predio}/resumen
     *
     * Devuelve la jerarquía completa del predio (lotes → sublotes con palmas)
     * más los totales agregados. Alimenta el panel "Resumen" del wizard
     * "Crear Nueva Plantación" y de cualquier vista que necesite la foto
     * completa de un predio en una sola llamada.
     */
    public function resumen(Predio $predio): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = Cache::remember(
                WizardCache::predioResumen($tenantId, $predio->id),
                WizardCache::TTL_PREDIO_BUNDLE,
                function () use ($predio) {
                    $predio->load([
                        'lotes'          => fn($q) => $q->orderBy('nombre'),
                        'lotes.sublotes' => fn($q) => $q->orderBy('nombre'),
                    ]);

                    $hectareasSembradas   = (float) $predio->lotes->sum('hectareas_sembradas');
                    $hectareasTotales     = (float) $predio->hectareas_totales;
                    $hectareasDisponibles = $hectareasTotales - $hectareasSembradas;

                    $totalSublotes = 0;
                    $totalPalmas   = 0;

                    $lotes = $predio->lotes->map(function ($lote) use (&$totalSublotes, &$totalPalmas) {
                        $sublotesPalmas = (int) $lote->sublotes->sum('cantidad_palmas');
                        $sublotesCount  = $lote->sublotes->count();

                        $totalSublotes += $sublotesCount;
                        $totalPalmas   += $sublotesPalmas;

                        return [
                            'id'                  => $lote->id,
                            'nombre'              => $lote->nombre,
                            'hectareas_sembradas' => $lote->hectareas_sembradas,
                            'sublotes'            => $lote->sublotes->map(fn($s) => [
                                'id'              => $s->id,
                                'nombre'          => $s->nombre,
                                'cantidad_palmas' => (int) $s->cantidad_palmas,
                            ])->values(),
                            'totales' => [
                                'sublotes' => $sublotesCount,
                                'palmas'   => $sublotesPalmas,
                            ],
                        ];
                    })->values();

                    return [
                        'predio' => [
                            'id'                    => $predio->id,
                            'nombre'                => $predio->nombre,
                            'ubicacion'             => $predio->ubicacion,
                            'hectareas_totales'     => $predio->hectareas_totales,
                            'hectareas_sembradas'   => number_format($hectareasSembradas, 2, '.', ''),
                            'hectareas_disponibles' => number_format($hectareasDisponibles, 2, '.', ''),
                        ],
                        'lotes'              => $lotes,
                        'totales_generales'  => [
                            'lotes'    => $predio->lotes->count(),
                            'sublotes' => $totalSublotes,
                            'palmas'   => $totalPalmas,
                        ],
                    ];
                },
            );

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener resumen del predio: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener el resumen del predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/predios/{predio}
     */
    public function show(Predio $predio): JsonResponse
    {
        try {
            $predio->load(['lotes' => fn($q) => $q->withCount('sublotes')->orderBy('nombre')]);

            return response()->json(['data' => $predio]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener predio: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener el predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/predios
     */
    public function store(StorePredioRequest $request): JsonResponse
    {
        try {
            $predio = Predio::create($request->validated());

            $this->forgetPrediosCache((int) app('current_tenant_id'));

            $this->auditoria->registrarCreacion(
                $request,
                'PREDIOS',
                $predio,
                "Se creó el predio '{$predio->nombre}'",
            );

            return response()->json([
                'message' => 'Predio creado correctamente',
                'data'    => $predio,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear predio: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear el predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/predios/{predio}
     */
    public function update(UpdatePredioRequest $request, Predio $predio): JsonResponse
    {
        try {
            // Validar que las hectáreas_totales no sean menores a la suma de lotes
            if ($request->has('hectareas_totales') && $request->hectareas_totales !== null) {
                $hectareasUsadas = $predio->lotes()->sum('hectareas_sembradas');

                if ((float) $request->hectareas_totales < (float) $hectareasUsadas) {
                    return response()->json([
                        'message' => 'Error de validación',
                        'errors'  => [
                            'hectareas_totales' => [
                                "Las hectáreas totales ({$request->hectareas_totales}) no pueden ser menores a las hectáreas ya sembradas en los lotes ({$hectareasUsadas})"
                            ],
                        ],
                    ], 422);
                }
            }

            $datosAnteriores = $predio->toArray();

            $predio->update($request->validated());

            $this->forgetPrediosCache((int) app('current_tenant_id'));

            $this->auditoria->registrarEdicion(
                $request,
                'PREDIOS',
                $predio,
                $datosAnteriores,
                "Se editó el predio '{$predio->nombre}'",
            );

            return response()->json([
                'message' => 'Predio actualizado correctamente',
                'data'    => $predio->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar predio: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/predios/{predio}
     * Eliminación recursiva: lotes → sublotes → líneas → palmas
     */
    public function destroy(Request $request, Predio $predio): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Eliminar recursivamente: palmas → líneas → sublotes → lotes
            foreach ($predio->lotes as $lote) {
                foreach ($lote->sublotes as $sublote) {
                    $sublote->palmas()->delete();
                    $sublote->lineas()->delete();
                }
                $lote->sublotes()->delete();
                $lote->semillas()->detach();
            }
            $predio->lotes()->delete();

            $this->auditoria->registrarEliminacion(
                $request,
                'PREDIOS',
                $predio,
                "Se eliminó el predio '{$predio->nombre}' con todos sus lotes, sublotes y palmas",
            );

            $predio->delete();

            $this->forgetPrediosCache((int) app('current_tenant_id'));

            DB::commit();

            return response()->json([
                'message' => "Predio '{$predio->nombre}' eliminado correctamente",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al eliminar predio: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar el predio',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
