<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Linea;
use App\Models\Sublote;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class LineaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/lineas
     *
     * Lista las líneas de un sublote.
     * Cada línea puede tener palmas asignadas (linea_id en palmas).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $lineas = Linea::query()
                ->with('sublote:id,nombre,lote_id', 'sublote.lote:id,nombre,predio_id', 'sublote.lote.predio:id,nombre')
                ->withCount('palmas')
                ->when($request->sublote_id, fn($q, $id) => $q->where('sublote_id', $id))
                ->when($request->search, fn($q, $s) => $q->where('numero', $s))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('sublote_id')
                ->orderBy('numero')
                ->paginate($request->per_page ?? 50);

            return response()->json([
                'data' => $lineas->items(),
                'meta' => [
                    'current_page' => $lineas->currentPage(),
                    'last_page'    => $lineas->lastPage(),
                    'per_page'     => $lineas->perPage(),
                    'total'        => $lineas->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar líneas: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar las líneas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/lineas/{linea}
     */
    public function show(Linea $linea): JsonResponse
    {
        try {
            $linea->load([
                'sublote:id,nombre,lote_id',
                'sublote.lote:id,nombre,predio_id',
                'sublote.lote.predio:id,nombre',
            ]);
            $linea->loadCount('palmas');

            return response()->json(['data' => $linea]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener línea: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener la línea',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/lineas
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'sublote_id'      => 'required|integer|exists:sublotes,id',
                'numero'          => [
                    'required',
                    'integer',
                    'min:1',
                    Rule::unique('lineas', 'numero')->where(fn($q) => $q->where('sublote_id', $request->sublote_id)),
                ],
                'cantidad_palmas' => 'nullable|integer|min:0',
            ], [
                'sublote_id.exists' => 'El sublote seleccionado no existe',
                'numero.unique'     => 'Ya existe una línea con ese número en el sublote',
                'numero.min'        => 'El número de línea debe ser mayor o igual a 1',
            ]);

            $sublote = Sublote::find($request->sublote_id);
            if (!$sublote) {
                return response()->json([
                    'message' => 'El sublote no pertenece a esta finca',
                    'code'    => 'SUBLOTE_NOT_FOUND',
                ], 404);
            }

            $linea = Linea::create([
                'sublote_id'      => $request->sublote_id,
                'numero'          => $request->numero,
                'cantidad_palmas' => (int) ($request->cantidad_palmas ?? 0),
                'estado'          => true,
            ]);

            $this->auditoria->registrarCreacion(
                $request,
                'LINEAS',
                $linea,
                "Se creó la línea {$linea->numero} en el sublote '{$sublote->nombre}'",
            );

            return response()->json([
                'message' => 'Línea creada correctamente',
                'data'    => $linea->load('sublote:id,nombre'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al crear línea: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear la línea',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/lineas/{linea}
     */
    public function update(Request $request, Linea $linea): JsonResponse
    {
        try {
            $request->validate([
                'numero' => [
                    'sometimes',
                    'integer',
                    'min:1',
                    Rule::unique('lineas', 'numero')
                        ->where(fn($q) => $q->where('sublote_id', $linea->sublote_id))
                        ->ignore($linea->id),
                ],
                'cantidad_palmas' => 'sometimes|integer|min:0',
                'estado'          => 'sometimes|boolean',
            ], [
                'numero.unique' => 'Ya existe una línea con ese número en el sublote',
                'numero.min'    => 'El número de línea debe ser mayor o igual a 1',
            ]);

            $datosAnteriores = $linea->toArray();

            $linea->update($request->only(['numero', 'cantidad_palmas', 'estado']));

            $this->auditoria->registrarEdicion(
                $request,
                'LINEAS',
                $linea,
                $datosAnteriores,
                "Se editó la línea {$linea->numero}",
            );

            return response()->json([
                'message' => 'Línea actualizada correctamente',
                'data'    => $linea->fresh()->load('sublote:id,nombre'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al actualizar línea: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar la línea',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/lineas/{linea}
     *
     * Eliminar una línea desasocia las palmas asignadas (linea_id → null).
     * Las palmas no se eliminan — quedan en el sublote sin línea asignada.
     */
    public function destroy(Request $request, Linea $linea): JsonResponse
    {
        try {
            $numero = $linea->numero;

            $this->auditoria->registrarEliminacion(
                $request,
                'LINEAS',
                $linea,
                "Se eliminó la línea {$numero}",
            );

            $linea->delete();

            return response()->json([
                'message' => "Línea {$numero} eliminada correctamente",
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar línea: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar la línea',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
