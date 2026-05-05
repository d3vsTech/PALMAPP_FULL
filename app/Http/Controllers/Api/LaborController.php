<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Labor\StoreLaborRequest;
use App\Models\Labor;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LaborController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Listado liviano para dropdowns (wizard Paso 3 - Labores de Finca).
     * Sin paginación. Incluye valor_base para que el UI muestre el Total al seleccionar.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $labores = Labor::query()
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'valor_base']);

            return response()->json(['data' => $labores]);
        } catch (\Throwable $e) {
            Log::error('Error en labores/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar labores', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $labores = Labor::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $labores->items(),
                'meta' => [
                    'current_page' => $labores->currentPage(),
                    'last_page'    => $labores->lastPage(),
                    'per_page'     => $labores->perPage(),
                    'total'        => $labores->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar labores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las labores', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Labor $labor): JsonResponse
    {
        return response()->json(['data' => $labor]);
    }

    public function store(StoreLaborRequest $request): JsonResponse
    {
        try {
            $labor = Labor::create($request->validated());

            $this->auditoria->registrarCreacion($request, 'LABORES', $labor, "Se creó la labor de finca '{$labor->nombre}'");

            return response()->json([
                'message' => 'Labor creada correctamente',
                'data'    => $labor,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la labor', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Labor $labor): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'     => 'sometimes|string|max:100',
                'valor_base' => 'sometimes|numeric|min:0|max:99999999.99',
                'estado'     => 'sometimes|boolean',
            ]);

            $datosAnteriores = $labor->toArray();
            $labor->update($validated);

            $this->auditoria->registrarEdicion($request, 'LABORES', $labor, $datosAnteriores, "Se editó la labor '{$labor->nombre}'");

            return response()->json([
                'message' => 'Labor actualizada correctamente',
                'data'    => $labor->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la labor', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Labor $labor): JsonResponse
    {
        try {
            if ($labor->jornales()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar la labor porque tiene jornales asociados',
                    'code'    => 'LABOR_CON_JORNALES',
                ], 409);
            }

            $this->auditoria->registrarEliminacion($request, 'LABORES', $labor, "Se eliminó la labor '{$labor->nombre}'");
            $labor->delete();

            return response()->json(['message' => "Labor '{$labor->nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la labor', 'error' => $e->getMessage()], 500);
        }
    }
}
