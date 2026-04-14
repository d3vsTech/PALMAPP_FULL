<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Semilla;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SemillaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $semillas = Semilla::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $semillas->items(),
                'meta' => [
                    'current_page' => $semillas->currentPage(),
                    'last_page'    => $semillas->lastPage(),
                    'per_page'     => $semillas->perPage(),
                    'total'        => $semillas->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar semillas: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las semillas', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Semilla $semilla): JsonResponse
    {
        try {
            return response()->json(['data' => $semilla]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener semilla: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener la semilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'tipo'   => 'required|string|max:50',
                'nombre' => 'required|string|max:100',
            ]);

            $semilla = Semilla::create($validated);

            $this->auditoria->registrarCreacion($request, 'SEMILLAS', $semilla, "Se creó la semilla '{$semilla->nombre}'");

            return response()->json(['message' => 'Semilla creada correctamente', 'data' => $semilla], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear semilla: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la semilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Semilla $semilla): JsonResponse
    {
        try {
            $validated = $request->validate([
                'tipo'   => 'sometimes|string|max:50',
                'nombre' => 'sometimes|string|max:100',
                'estado' => 'sometimes|boolean',
            ]);

            $datosAnteriores = $semilla->toArray();
            $semilla->update($validated);

            $this->auditoria->registrarEdicion($request, 'SEMILLAS', $semilla, $datosAnteriores, "Se editó la semilla '{$semilla->nombre}'");

            return response()->json(['message' => 'Semilla actualizada correctamente', 'data' => $semilla->fresh()]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar semilla: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la semilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Semilla $semilla): JsonResponse
    {
        try {
            $this->auditoria->registrarEliminacion($request, 'SEMILLAS', $semilla, "Se eliminó la semilla '{$semilla->nombre}'");
            $semilla->delete();

            return response()->json(['message' => "Semilla '{$semilla->nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar semilla: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la semilla', 'error' => $e->getMessage()], 500);
        }
    }
}
