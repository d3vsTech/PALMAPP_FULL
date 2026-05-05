<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FondoPension\StoreFondoPensionRequest;
use App\Http\Requests\FondoPension\UpdateFondoPensionRequest;
use App\Models\FondoPension;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FondoPensionController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $items = FondoPension::query()
                ->activos()
                ->orderBy('nombre')
                ->get(['id', 'nombre']);

            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('Error en fondos-pension/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar fondos de pensión', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = FondoPension::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $items->items(),
                'meta' => [
                    'current_page' => $items->currentPage(),
                    'last_page'    => $items->lastPage(),
                    'per_page'     => $items->perPage(),
                    'total'        => $items->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar fondos de pensión: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los fondos de pensión', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(FondoPension $fondoPension): JsonResponse
    {
        return response()->json(['data' => $fondoPension]);
    }

    public function store(StoreFondoPensionRequest $request): JsonResponse
    {
        try {
            $fondo = FondoPension::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'FONDOS_PENSION', $fondo,
                "Se creó el fondo de pensión '{$fondo->nombre}'"
            );

            return response()->json([
                'message' => 'Fondo de pensión creado correctamente',
                'data'    => $fondo,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear fondo de pensión: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el fondo de pensión', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateFondoPensionRequest $request, FondoPension $fondoPension): JsonResponse
    {
        try {
            $datosAnteriores = $fondoPension->toArray();
            $fondoPension->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'FONDOS_PENSION', $fondoPension, $datosAnteriores,
                "Se editó el fondo de pensión '{$fondoPension->nombre}'"
            );

            return response()->json([
                'message' => 'Fondo de pensión actualizado correctamente',
                'data'    => $fondoPension->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar fondo de pensión: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el fondo de pensión', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, FondoPension $fondoPension): JsonResponse
    {
        try {
            $nombre = $fondoPension->nombre;

            $this->auditoria->registrarEliminacion(
                $request, 'FONDOS_PENSION', $fondoPension,
                "Se eliminó el fondo de pensión '{$nombre}'"
            );
            $fondoPension->delete();

            return response()->json(['message' => "Fondo de pensión '{$nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar fondo de pensión: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el fondo de pensión', 'error' => $e->getMessage()], 500);
        }
    }
}
