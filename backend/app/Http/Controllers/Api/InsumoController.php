<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Insumo;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InsumoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $insumos = Insumo::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $insumos->items(),
                'meta' => [
                    'current_page' => $insumos->currentPage(),
                    'last_page'    => $insumos->lastPage(),
                    'per_page'     => $insumos->perPage(),
                    'total'        => $insumos->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar insumos: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los insumos', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Insumo $insumo): JsonResponse
    {
        try {
            $insumo->load('labores:id,nombre,tipo_pago');

            return response()->json(['data' => $insumo]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'        => 'required|string|max:100',
                'unidad_medida' => 'required|string|max:100',
            ]);

            $insumo = Insumo::create($validated);

            $this->auditoria->registrarCreacion($request, 'INSUMOS', $insumo, "Se creó el insumo '{$insumo->nombre}'");

            return response()->json([
                'message' => 'Insumo creado correctamente',
                'data'    => $insumo,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Insumo $insumo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'        => 'sometimes|string|max:100',
                'unidad_medida' => 'sometimes|string|max:100',
                'estado'        => 'sometimes|boolean',
            ]);

            $datosAnteriores = $insumo->toArray();
            $insumo->update($validated);

            $this->auditoria->registrarEdicion($request, 'INSUMOS', $insumo, $datosAnteriores, "Se editó el insumo '{$insumo->nombre}'");

            return response()->json([
                'message' => 'Insumo actualizado correctamente',
                'data'    => $insumo->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Insumo $insumo): JsonResponse
    {
        try {
            if ($insumo->labores()->where('estado', true)->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el insumo porque tiene labores activas asociadas',
                    'code'    => 'INSUMO_CON_LABORES',
                ], 409);
            }

            $this->auditoria->registrarEliminacion($request, 'INSUMOS', $insumo, "Se eliminó el insumo '{$insumo->nombre}'");
            $insumo->delete();

            return response()->json(['message' => "Insumo '{$insumo->nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el insumo', 'error' => $e->getMessage()], 500);
        }
    }
}
