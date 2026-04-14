<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ModalidadContrato;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ModalidadContratoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $modalidades = ModalidadContrato::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->withCount('cargos')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $modalidades->items(),
                'meta' => [
                    'current_page' => $modalidades->currentPage(),
                    'last_page'    => $modalidades->lastPage(),
                    'per_page'     => $modalidades->perPage(),
                    'total'        => $modalidades->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar modalidades: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las modalidades', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(ModalidadContrato $modalidad): JsonResponse
    {
        try {
            $modalidad->loadCount('cargos');
            return response()->json(['data' => $modalidad]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener modalidad: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener la modalidad', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'      => 'required|string|max:100',
                'descripcion' => 'nullable|string|max:255',
            ]);

            $modalidad = ModalidadContrato::create($validated);

            $this->auditoria->registrarCreacion($request, 'MODALIDADES', $modalidad, "Se creó la modalidad '{$modalidad->nombre}'");

            return response()->json([
                'message' => 'Modalidad creada correctamente',
                'data'    => $modalidad,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear modalidad: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la modalidad', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, ModalidadContrato $modalidad): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'      => 'sometimes|string|max:100',
                'descripcion' => 'nullable|string|max:255',
                'estado'      => 'sometimes|boolean',
            ]);

            $datosAnteriores = $modalidad->toArray();
            $modalidad->update($validated);

            $this->auditoria->registrarEdicion($request, 'MODALIDADES', $modalidad, $datosAnteriores, "Se editó la modalidad '{$modalidad->nombre}'");

            return response()->json([
                'message' => 'Modalidad actualizada correctamente',
                'data'    => $modalidad->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar modalidad: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la modalidad', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, ModalidadContrato $modalidad): JsonResponse
    {
        try {
            if ($modalidad->cargos()->where('estado', true)->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar la modalidad porque tiene cargos activos asociados',
                    'code'    => 'MODALIDAD_CON_CARGOS',
                ], 409);
            }

            $this->auditoria->registrarEliminacion($request, 'MODALIDADES', $modalidad, "Se eliminó la modalidad '{$modalidad->nombre}'");
            $modalidad->delete();

            return response()->json(['message' => "Modalidad '{$modalidad->nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar modalidad: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la modalidad', 'error' => $e->getMessage()], 500);
        }
    }
}
