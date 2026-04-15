<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Palma\DestroyMasivoPalmaRequest;
use App\Http\Requests\Palma\StorePalmaRequest;
use App\Http\Requests\Palma\UpdatePalmaRequest;
use App\Models\Linea;
use App\Models\Palma;
use App\Models\Sublote;
use App\Services\AuditoriaService;
use App\Services\PalmaCreationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PalmaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected PalmaCreationService $palmaService,
    ) {}

    /**
     * GET /api/v1/tenant/palmas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $palmas = Palma::query()
                ->with('sublote:id,nombre', 'linea:id,numero')
                ->when($request->sublote_id, fn($q, $id) => $q->where('sublote_id', $id))
                ->when($request->linea_id, fn($q, $id) => $q->where('linea_id', $id))
                ->when($request->has('sin_linea'), fn($q) => $q->whereNull('linea_id'))
                ->when($request->search, fn($q, $s) => $q->where('codigo', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('codigo')
                ->paginate($request->per_page ?? 50);

            return response()->json([
                'data' => $palmas->items(),
                'meta' => [
                    'current_page' => $palmas->currentPage(),
                    'last_page'    => $palmas->lastPage(),
                    'per_page'     => $palmas->perPage(),
                    'total'        => $palmas->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar palmas: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar las palmas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/palmas/{palma}
     */
    public function show(Palma $palma): JsonResponse
    {
        try {
            $palma->load([
                'sublote:id,nombre,lote_id',
                'sublote.lote:id,nombre',
                'linea:id,numero',
            ]);

            return response()->json(['data' => $palma]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener palma: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener la palma',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/palmas
     * Crea palmas en un sublote según cantidad_palmas.
     * Si el sublote tiene líneas, linea_id es obligatorio.
     */
    public function store(StorePalmaRequest $request): JsonResponse
    {
        try {
            $sublote = Sublote::find($request->sublote_id);
            if (!$sublote) {
                return response()->json([
                    'message' => 'El sublote no pertenece a esta finca',
                    'code'    => 'SUBLOTE_NOT_FOUND',
                ], 404);
            }

            $subloteHasLineas = $sublote->lineas()->exists();

            // Si el sublote tiene líneas, linea_id es obligatorio
            if ($subloteHasLineas && !$request->linea_id) {
                return response()->json([
                    'message' => 'Error de validación',
                    'errors'  => ['linea_id' => ['El sublote tiene líneas configuradas. Debe especificar la línea.']],
                ], 422);
            }

            // Validar que la línea pertenezca al sublote
            $linea = null;
            if ($request->linea_id) {
                $linea = Linea::where('id', $request->linea_id)
                    ->where('sublote_id', $sublote->id)
                    ->first();

                if (!$linea) {
                    return response()->json([
                        'message' => 'Error de validación',
                        'errors'  => ['linea_id' => ['La línea no pertenece a este sublote.']],
                    ], 422);
                }
            }

            $cantidadPalmas = (int) $request->cantidad_palmas;

            // Camino ASYNC: cantidad > umbral → despachar job en cola
            if ($cantidadPalmas > PalmaCreationService::SYNC_THRESHOLD) {
                $batchId = $this->palmaService->createAsync(
                    sublote:  $sublote,
                    cantidad: $cantidadPalmas,
                    lineaId:  $linea?->id,
                    tenantId: $sublote->tenant_id,
                    userId:   $request->user()->id,
                );

                $this->auditoria->registrar(
                    request: $request,
                    accion: 'CREAR',
                    modulo: 'PALMAS',
                    observaciones: "Se encoló la creación de {$cantidadPalmas} palma(s) en sublote '{$sublote->nombre}'"
                        . ($linea ? " línea {$linea->numero}" : '') . " (batch: {$batchId})",
                );

                return response()->json([
                    'message'    => "Solicitud aceptada. {$cantidadPalmas} palma(s) se crearán en segundo plano.",
                    'async'      => true,
                    'batch_id'   => $batchId,
                    'sublote_id' => $sublote->id,
                    'linea_id'   => $linea?->id,
                    'cantidad'   => $cantidadPalmas,
                ], 202);
            }

            // Camino SYNC: cantidad <= umbral → insertar dentro de la transacción
            DB::beginTransaction();

            $this->palmaService->createSync($sublote, $cantidadPalmas, $linea?->id);

            DB::commit();

            $this->auditoria->registrar(
                request: $request,
                accion: 'CREAR',
                modulo: 'PALMAS',
                observaciones: "Se crearon {$cantidadPalmas} palma(s) en sublote '{$sublote->nombre}'"
                    . ($linea ? " línea {$linea->numero}" : ''),
            );

            return response()->json([
                'message'        => "{$cantidadPalmas} palma(s) creada(s) correctamente",
                'async'          => false,
                'cantidad_creada' => $cantidadPalmas,
                'sublote_id'     => $sublote->id,
                'linea_id'       => $linea?->id,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al crear palmas: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear las palmas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/palmas/batch/{batchId}
     * Consulta el estado de un batch de creación de palmas.
     */
    public function batchStatus(string $batchId): JsonResponse
    {
        $batch = Bus::findBatch($batchId);

        if (!$batch) {
            return response()->json([
                'message' => 'Batch no encontrado',
                'code'    => 'BATCH_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id'            => $batch->id,
                'name'          => $batch->name,
                'total_jobs'    => $batch->totalJobs,
                'pending_jobs'  => $batch->pendingJobs,
                'failed_jobs'   => $batch->failedJobs,
                'processed_jobs' => $batch->processedJobs(),
                'progress'      => $batch->progress(),
                'finished'      => $batch->finished(),
                'cancelled'     => $batch->cancelled(),
                'has_failures'  => $batch->hasFailures(),
                'created_at'    => $batch->createdAt,
                'finished_at'   => $batch->finishedAt,
            ],
        ]);
    }

    /**
     * PUT /api/v1/tenant/palmas/{palma}
     */
    public function update(UpdatePalmaRequest $request, Palma $palma): JsonResponse
    {
        try {
            // Validar que la línea pertenezca al mismo sublote
            if ($request->has('linea_id') && $request->linea_id !== null) {
                $lineaValida = Linea::where('id', $request->linea_id)
                    ->where('sublote_id', $palma->sublote_id)
                    ->exists();

                if (!$lineaValida) {
                    return response()->json([
                        'message' => 'Error de validación',
                        'errors'  => ['linea_id' => ['La línea no pertenece al sublote de esta palma.']],
                    ], 422);
                }
            }

            $datosAnteriores = $palma->toArray();
            $oldLineaId = $palma->linea_id;

            $palma->update($request->validated());

            // Sincronizar contadores de líneas si cambió
            if ($request->has('linea_id') && $oldLineaId !== $palma->linea_id) {
                if ($oldLineaId) {
                    Linea::where('id', $oldLineaId)
                        ->update(['cantidad_palmas' => Palma::where('linea_id', $oldLineaId)->count()]);
                }
                if ($palma->linea_id) {
                    Linea::where('id', $palma->linea_id)
                        ->update(['cantidad_palmas' => Palma::where('linea_id', $palma->linea_id)->count()]);
                }
            }

            $this->auditoria->registrarEdicion(
                $request,
                'PALMAS',
                $palma,
                $datosAnteriores,
                "Se editó la palma '{$palma->codigo}'",
            );

            return response()->json([
                'message' => 'Palma actualizada correctamente',
                'data'    => $palma->fresh()->load('sublote:id,nombre', 'linea:id,numero'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar palma: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar la palma',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/palmas/masivo
     * Eliminación masiva de palmas
     */
    public function destroyMasivo(DestroyMasivoPalmaRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $palmas = Palma::whereIn('id', $request->palmas_ids)->get();

            if ($palmas->isEmpty()) {
                return response()->json([
                    'message' => 'No se encontraron palmas para eliminar',
                ], 404);
            }

            $sublotesAfectados = $palmas->pluck('sublote_id')->unique();
            $lineasAfectadas = $palmas->pluck('linea_id')->filter()->unique();
            $codigos = $palmas->pluck('codigo')->toArray();

            Palma::whereIn('id', $request->palmas_ids)->delete();

            // Actualizar contadores de sublotes afectados
            foreach (Sublote::whereIn('id', $sublotesAfectados)->get() as $sublote) {
                $sublote->update(['cantidad_palmas' => $sublote->palmas()->count()]);
            }

            // Sincronizar contadores de líneas afectadas
            foreach (Linea::whereIn('id', $lineasAfectadas)->get() as $linea) {
                $linea->update(['cantidad_palmas' => $linea->palmas()->count()]);
            }

            DB::commit();

            $this->auditoria->registrar(
                request: $request,
                accion: 'ELIMINAR',
                modulo: 'PALMAS',
                observaciones: "Se eliminaron " . count($codigos) . " palmas: " . implode(', ', array_slice($codigos, 0, 5)) . (count($codigos) > 5 ? '...' : ''),
                datosAnteriores: ['palmas_eliminadas' => $codigos],
            );

            return response()->json([
                'message' => count($codigos) . ' palma(s) eliminada(s) correctamente',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al eliminar palmas masivamente: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar las palmas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
