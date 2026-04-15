<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sublote\StoreSubloteRequest;
use App\Http\Requests\Sublote\UpdateSubloteRequest;
use App\Models\Linea;
use App\Models\Lote;
use App\Models\Sublote;
use App\Services\AuditoriaService;
use App\Services\PalmaCreationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubloteController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected PalmaCreationService $palmaService,
    ) {}

    /**
     * Verifica si hay un batch activo de creación de palmas para un sublote.
     * Evita operaciones concurrentes que generen códigos duplicados.
     */
    private function hayBatchActivoParaSublote(int $subloteId): bool
    {
        $nombre = "crear-palmas-sublote-{$subloteId}";

        return DB::table('job_batches')
            ->where('name', $nombre)
            ->whereNull('finished_at')
            ->whereNull('cancelled_at')
            ->exists();
    }

    /**
     * GET /api/v1/tenant/sublotes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $sublotes = Sublote::query()
                ->with('lote:id,nombre,predio_id', 'lote.predio:id,nombre')
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->lote_id, fn($q, $id) => $q->where('lote_id', $id))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->withCount('palmas')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $sublotes->items(),
                'meta' => [
                    'current_page' => $sublotes->currentPage(),
                    'last_page'    => $sublotes->lastPage(),
                    'per_page'     => $sublotes->perPage(),
                    'total'        => $sublotes->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar sublotes: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los sublotes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/sublotes/{sublote}
     */
    public function show(Sublote $sublote): JsonResponse
    {
        try {
            $sublote->load([
                'lote:id,nombre,predio_id',
                'lote.predio:id,nombre',
                'lineas' => fn($q) => $q->withCount('palmas')->orderBy('numero'),
                'palmas' => fn($q) => $q->with('linea:id,numero')->orderBy('codigo'),
            ]);

            return response()->json(['data' => $sublote]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/sublotes
     */
    public function store(StoreSubloteRequest $request): JsonResponse
    {
        try {
            $lote = Lote::find($request->lote_id);
            if (!$lote) {
                return response()->json([
                    'message' => 'El lote no pertenece a esta finca',
                    'code'    => 'LOTE_NOT_FOUND',
                ], 404);
            }

            $cantidadPalmas = (int) ($request->cantidad_palmas ?? 0);
            $esAsync = $cantidadPalmas > PalmaCreationService::SYNC_THRESHOLD;

            DB::beginTransaction();

            $sublote = Sublote::create([
                'lote_id'         => $request->lote_id,
                'nombre'          => $request->nombre,
                'cantidad_palmas' => $cantidadPalmas,
            ]);

            if ($cantidadPalmas > 0 && !$esAsync) {
                $this->palmaService->createSync($sublote, $cantidadPalmas);
            }

            DB::commit();

            // Si es async, despachar el job DESPUÉS del commit (el sublote ya existe)
            $batchId = null;
            if ($esAsync) {
                $batchId = $this->palmaService->createAsync(
                    sublote:  $sublote,
                    cantidad: $cantidadPalmas,
                    lineaId:  null,
                    tenantId: $sublote->tenant_id,
                    userId:   $request->user()->id,
                );
            }

            $this->auditoria->registrarCreacion(
                $request,
                'SUBLOTES',
                $sublote,
                "Se creó el sublote '{$sublote->nombre}' en lote '{$lote->nombre}'" .
                ($cantidadPalmas > 0
                    ? ($esAsync
                        ? " — encoladas {$cantidadPalmas} palmas (batch: {$batchId})"
                        : " con {$cantidadPalmas} palmas")
                    : ''),
            );

            $respuesta = [
                'message' => 'Sublote creado correctamente',
                'data'    => $sublote->load('lote:id,nombre'),
            ];

            if ($esAsync) {
                $respuesta['palmas_async'] = true;
                $respuesta['batch_id']     = $batchId;
                $respuesta['message']      = "Sublote creado. {$cantidadPalmas} palma(s) se crearán en segundo plano.";
            }

            return response()->json($respuesta, 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al crear sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/sublotes/{sublote}
     */
    public function update(UpdateSubloteRequest $request, Sublote $sublote): JsonResponse
    {
        try {
            if ($request->has('lote_id') && $request->lote_id !== $sublote->lote_id) {
                $lote = Lote::find($request->lote_id);
                if (!$lote) {
                    return response()->json([
                        'message' => 'El lote no pertenece a esta finca',
                        'code'    => 'LOTE_NOT_FOUND',
                    ], 404);
                }
            }

            $datosAnteriores = $sublote->toArray();
            $ajustarPalmas   = $request->has('cantidad_palmas');
            $diferenciaAsync = 0;
            $batchId         = null;

            // Si se van a ajustar palmas, rechazar si hay un batch activo
            if ($ajustarPalmas && $this->hayBatchActivoParaSublote($sublote->id)) {
                return response()->json([
                    'message' => 'Hay un proceso de creación de palmas en curso para este sublote. Espere a que finalice.',
                    'code'    => 'BATCH_EN_CURSO',
                ], 409);
            }

            DB::beginTransaction();

            if ($ajustarPalmas) {
                $nuevaCantidad  = (int) $request->cantidad_palmas;
                $cantidadActual = (int) $sublote->cantidad_palmas;

                if ($nuevaCantidad > $cantidadActual) {
                    $diferencia = $nuevaCantidad - $cantidadActual;

                    if ($diferencia > PalmaCreationService::SYNC_THRESHOLD) {
                        // Async: postergar dispatch hasta después del commit
                        $diferenciaAsync = $diferencia;
                    } else {
                        $this->palmaService->createSync($sublote, $diferencia);
                    }
                } elseif ($nuevaCantidad < $cantidadActual) {
                    $diferencia = $cantidadActual - $nuevaCantidad;
                    $palmasAEliminar = $sublote->palmas()
                        ->orderBy('codigo', 'desc')
                        ->take($diferencia)
                        ->get();

                    $lineasAfectadas = $palmasAEliminar->pluck('linea_id')->filter()->unique();

                    $palmasAEliminar->each->delete();

                    // Sincronizar contadores de líneas afectadas
                    foreach (Linea::whereIn('id', $lineasAfectadas)->get() as $linea) {
                        $linea->update(['cantidad_palmas' => $linea->palmas()->count()]);
                    }
                }
            }

            $sublote->update($request->validated());

            DB::commit();

            // Despachar job async después del commit
            if ($diferenciaAsync > 0) {
                $batchId = $this->palmaService->createAsync(
                    sublote:  $sublote,
                    cantidad: $diferenciaAsync,
                    lineaId:  null,
                    tenantId: $sublote->tenant_id,
                    userId:   $request->user()->id,
                );
            }

            $this->auditoria->registrarEdicion(
                $request,
                'SUBLOTES',
                $sublote,
                $datosAnteriores,
                "Se editó el sublote '{$sublote->nombre}'"
                    . ($batchId ? " — encoladas {$diferenciaAsync} palmas (batch: {$batchId})" : ''),
            );

            $respuesta = [
                'message' => 'Sublote actualizado correctamente',
                'data'    => $sublote->fresh()->load('lote:id,nombre'),
            ];

            if ($batchId) {
                $respuesta['palmas_async'] = true;
                $respuesta['batch_id']     = $batchId;
                $respuesta['message']      = "Sublote actualizado. {$diferenciaAsync} palma(s) adicional(es) se crearán en segundo plano.";
            }

            return response()->json($respuesta);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al actualizar sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/sublotes/{sublote}
     */
    public function destroy(Request $request, Sublote $sublote): JsonResponse
    {
        try {
            DB::beginTransaction();

            $sublote->palmas()->delete();
            $sublote->lineas()->delete();

            $this->auditoria->registrarEliminacion(
                $request,
                'SUBLOTES',
                $sublote,
                "Se eliminó el sublote '{$sublote->nombre}' con todas sus palmas y líneas",
            );

            $sublote->delete();

            DB::commit();

            return response()->json([
                'message' => "Sublote '{$sublote->nombre}' eliminado correctamente",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al eliminar sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

}
