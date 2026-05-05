<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Arl\StoreArlRequest;
use App\Http\Requests\Arl\UpdateArlRequest;
use App\Models\Arl;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ArlController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $items = Arl::query()
                ->activos()
                ->orderBy('nombre')
                ->get(['id', 'nombre']);

            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('Error en arl/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar ARL', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = Arl::query()
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
            Log::error('Error al listar ARL: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las ARL', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Arl $arl): JsonResponse
    {
        return response()->json(['data' => $arl]);
    }

    public function store(StoreArlRequest $request): JsonResponse
    {
        try {
            $arl = Arl::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'ARL', $arl,
                "Se creó la ARL '{$arl->nombre}'"
            );

            return response()->json([
                'message' => 'ARL creada correctamente',
                'data'    => $arl,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear ARL: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la ARL', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateArlRequest $request, Arl $arl): JsonResponse
    {
        try {
            $datosAnteriores = $arl->toArray();
            $arl->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'ARL', $arl, $datosAnteriores,
                "Se editó la ARL '{$arl->nombre}'"
            );

            return response()->json([
                'message' => 'ARL actualizada correctamente',
                'data'    => $arl->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar ARL: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la ARL', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Arl $arl): JsonResponse
    {
        try {
            $nombre = $arl->nombre;

            $this->auditoria->registrarEliminacion(
                $request, 'ARL', $arl,
                "Se eliminó la ARL '{$nombre}'"
            );
            $arl->delete();

            return response()->json(['message' => "ARL '{$nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar ARL: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la ARL', 'error' => $e->getMessage()], 500);
        }
    }
}
