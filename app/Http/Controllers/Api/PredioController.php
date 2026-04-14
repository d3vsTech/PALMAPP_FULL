<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Predio\StorePredioRequest;
use App\Http\Requests\Predio\UpdatePredioRequest;
use App\Models\Predio;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PredioController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/predios
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $predios = Predio::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->withCount('lotes')
                ->withSum('sublotes as palmas_count', 'cantidad_palmas')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            // withSum devuelve null cuando no hay sublotes; normalizar a 0
            $predios->getCollection()->transform(function ($predio) {
                $predio->palmas_count = (int) ($predio->palmas_count ?? 0);
                return $predio;
            });

            return response()->json([
                'data' => $predios->items(),
                'meta' => [
                    'current_page' => $predios->currentPage(),
                    'last_page'    => $predios->lastPage(),
                    'per_page'     => $predios->perPage(),
                    'total'        => $predios->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar predios: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los predios',
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
            $predio->load([
                'lotes' => fn($q) => $q->orderBy('nombre'),
                'lotes.sublotes' => fn($q) => $q->orderBy('nombre'),
            ]);

            $hectareasSembradas = (float) $predio->lotes->sum('hectareas_sembradas');
            $hectareasTotales   = (float) $predio->hectareas_totales;
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
                    'sublotes' => $lote->sublotes->map(fn($s) => [
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

            return response()->json([
                'data' => [
                    'predio' => [
                        'id'                    => $predio->id,
                        'nombre'                => $predio->nombre,
                        'ubicacion'             => $predio->ubicacion,
                        'hectareas_totales'     => $predio->hectareas_totales,
                        'hectareas_sembradas'   => number_format($hectareasSembradas, 2, '.', ''),
                        'hectareas_disponibles' => number_format($hectareasDisponibles, 2, '.', ''),
                    ],
                    'lotes' => $lotes,
                    'totales_generales' => [
                        'lotes'    => $predio->lotes->count(),
                        'sublotes' => $totalSublotes,
                        'palmas'   => $totalPalmas,
                    ],
                ],
            ]);
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
