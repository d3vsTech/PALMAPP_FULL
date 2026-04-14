<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lote\StoreLoteRequest;
use App\Http\Requests\Lote\UpdateLoteRequest;
use App\Models\Lote;
use App\Models\Predio;
use App\Models\Semilla;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoteController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/lotes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $lotes = Lote::query()
                ->with('predio:id,nombre')
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->predio_id, fn($q, $id) => $q->where('predio_id', $id))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->withCount('sublotes')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $lotes->items(),
                'meta' => [
                    'current_page' => $lotes->currentPage(),
                    'last_page'    => $lotes->lastPage(),
                    'per_page'     => $lotes->perPage(),
                    'total'        => $lotes->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar lotes: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los lotes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/lotes/{lote}
     */
    public function show(Lote $lote): JsonResponse
    {
        try {
            $lote->load([
                'predio:id,nombre',
                'sublotes' => fn($q) => $q->withCount('palmas')->orderBy('nombre'),
                'semillas:id,tipo,nombre',
            ]);

            return response()->json(['data' => $lote]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener lote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener el lote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/lotes/semillas
     * Lista semillas activas para asociar a lotes
     */
    public function semillas(): JsonResponse
    {
        try {
            $semillas = Semilla::activos()->orderBy('nombre')->get(['id', 'tipo', 'nombre']);

            return response()->json(['data' => $semillas]);
        } catch (\Throwable $e) {
            Log::error('Error al listar semillas: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar las semillas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/lotes
     */
    public function store(StoreLoteRequest $request): JsonResponse
    {
        try {
            $predio = Predio::find($request->predio_id);
            if (!$predio) {
                return response()->json([
                    'message' => 'El predio no pertenece a esta finca',
                    'code'    => 'PREDIO_NOT_FOUND',
                ], 404);
            }

            DB::beginTransaction();

            $lote = Lote::create($request->validated());

            // Sincronizar semillas si se enviaron
            if ($request->has('semillas_ids') && is_array($request->semillas_ids)) {
                $lote->semillas()->sync($request->semillas_ids);
            }

            DB::commit();

            $this->auditoria->registrarCreacion(
                $request,
                'LOTES',
                $lote,
                "Se creó el lote '{$lote->nombre}' en predio '{$predio->nombre}'",
            );

            return response()->json([
                'message' => 'Lote creado correctamente',
                'data'    => $lote->load('predio:id,nombre', 'semillas:id,tipo,nombre'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al crear lote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear el lote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/lotes/{lote}
     */
    public function update(UpdateLoteRequest $request, Lote $lote): JsonResponse
    {
        try {
            if ($request->has('predio_id') && $request->predio_id !== $lote->predio_id) {
                $predio = Predio::find($request->predio_id);
                if (!$predio) {
                    return response()->json([
                        'message' => 'El predio no pertenece a esta finca',
                        'code'    => 'PREDIO_NOT_FOUND',
                    ], 404);
                }
            }

            DB::beginTransaction();

            $datosAnteriores = $lote->toArray();

            $lote->update($request->validated());

            // Sincronizar semillas si se enviaron
            if ($request->has('semillas_ids')) {
                $lote->semillas()->sync($request->semillas_ids ?? []);
            }

            DB::commit();

            $this->auditoria->registrarEdicion(
                $request,
                'LOTES',
                $lote,
                $datosAnteriores,
                "Se editó el lote '{$lote->nombre}'",
            );

            return response()->json([
                'message' => 'Lote actualizado correctamente',
                'data'    => $lote->fresh()->load('predio:id,nombre', 'semillas:id,tipo,nombre'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al actualizar lote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el lote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/lotes/{lote}
     * Eliminación recursiva: sublotes → líneas → palmas
     */
    public function destroy(Request $request, Lote $lote): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Eliminar recursivamente: palmas → líneas → sublotes
            foreach ($lote->sublotes as $sublote) {
                $sublote->palmas()->delete();
                $sublote->lineas()->delete();
            }
            $lote->sublotes()->delete();

            // Eliminar semillas asociadas (pivot)
            $lote->semillas()->detach();

            $this->auditoria->registrarEliminacion(
                $request,
                'LOTES',
                $lote,
                "Se eliminó el lote '{$lote->nombre}' con todos sus sublotes y palmas",
            );

            $lote->delete();

            DB::commit();

            return response()->json([
                'message' => "Lote '{$lote->nombre}' eliminado correctamente",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al eliminar lote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar el lote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
