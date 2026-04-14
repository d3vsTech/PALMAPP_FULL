<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CargoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $cargos = Cargo::query()
                ->with('modalidad:id,nombre')
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->salario_tipo, fn($q, $t) => $q->where('salario_tipo', $t))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $cargos->items(),
                'meta' => [
                    'current_page' => $cargos->currentPage(),
                    'last_page'    => $cargos->lastPage(),
                    'per_page'     => $cargos->perPage(),
                    'total'        => $cargos->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar cargos: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los cargos', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Cargo $cargo): JsonResponse
    {
        try {
            $cargo->load('modalidad:id,nombre');

            return response()->json(['data' => $cargo]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener cargo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el cargo', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'modalidad_id' => 'required|exists:modalidad_contrato,id',
                'nombre'       => 'required|string|max:100',
                'salario_tipo' => 'required|in:FIJO,VARIABLE',
                'salario'      => 'nullable|numeric|min:0|max:999999999999.99',
            ]);

            $cargo = Cargo::create($validated);

            $this->auditoria->registrarCreacion($request, 'CARGOS', $cargo, "Se creó el cargo '{$cargo->nombre}' ({$cargo->salario_tipo})");

            return response()->json([
                'message' => 'Cargo creado correctamente',
                'data'    => $cargo->load('modalidad:id,nombre'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear cargo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el cargo', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Cargo $cargo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'modalidad_id' => 'sometimes|exists:modalidad_contrato,id',
                'nombre'       => 'sometimes|string|max:100',
                'salario_tipo' => 'sometimes|in:FIJO,VARIABLE',
                'salario'      => 'nullable|numeric|min:0|max:999999999999.99',
                'estado'       => 'sometimes|boolean',
            ]);

            $datosAnteriores = $cargo->toArray();
            $cargo->update($validated);

            $this->auditoria->registrarEdicion($request, 'CARGOS', $cargo, $datosAnteriores, "Se editó el cargo '{$cargo->nombre}'");

            return response()->json([
                'message' => 'Cargo actualizado correctamente',
                'data'    => $cargo->fresh()->load('modalidad:id,nombre'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar cargo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el cargo', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Cargo $cargo): JsonResponse
    {
        try {
            $this->auditoria->registrarEliminacion($request, 'CARGOS', $cargo, "Se eliminó el cargo '{$cargo->nombre}'");
            $cargo->delete();

            return response()->json(['message' => "Cargo '{$cargo->nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar cargo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el cargo', 'error' => $e->getMessage()], 500);
        }
    }
}
