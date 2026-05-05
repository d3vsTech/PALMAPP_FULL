<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Eps\StoreEpsRequest;
use App\Http\Requests\Eps\UpdateEpsRequest;
use App\Models\Eps;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EpsController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $items = Eps::query()
                ->activos()
                ->orderBy('nombre')
                ->get(['id', 'nombre']);

            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('Error en eps/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = Eps::query()
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
            Log::error('Error al listar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Eps $ep): JsonResponse
    {
        return response()->json(['data' => $ep]);
    }

    public function store(StoreEpsRequest $request): JsonResponse
    {
        try {
            $eps = Eps::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'EPS', $eps,
                "Se creó la EPS '{$eps->nombre}'"
            );

            return response()->json([
                'message' => 'EPS creada correctamente',
                'data'    => $eps,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateEpsRequest $request, Eps $ep): JsonResponse
    {
        try {
            $datosAnteriores = $ep->toArray();
            $ep->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'EPS', $ep, $datosAnteriores,
                "Se editó la EPS '{$ep->nombre}'"
            );

            return response()->json([
                'message' => 'EPS actualizada correctamente',
                'data'    => $ep->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Eps $ep): JsonResponse
    {
        try {
            $nombre = $ep->nombre;

            $this->auditoria->registrarEliminacion(
                $request, 'EPS', $ep,
                "Se eliminó la EPS '{$nombre}'"
            );
            $ep->delete();

            return response()->json(['message' => "EPS '{$nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la EPS', 'error' => $e->getMessage()], 500);
        }
    }
}
