<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FondoCesantias\StoreFondoCesantiasRequest;
use App\Http\Requests\FondoCesantias\UpdateFondoCesantiasRequest;
use App\Models\FondoCesantias;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FondoCesantiasController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $items = Cache::remember(
                WizardCache::fondosCesantias($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => FondoCesantias::query()
                    ->activos()
                    ->orderBy('nombre')
                    ->get(['id', 'nombre']),
            );

            return response()->json(['data' => $items])
                ->header('Cache-Control', 'private, max-age=600')
                ->header('ETag', '"' . md5(serialize($items)) . '"');
        } catch (\Throwable $e) {
            Log::error('Error en fondos-cesantias/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar fondos de cesantías', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = FondoCesantias::query()
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
            Log::error('Error al listar fondos de cesantías: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los fondos de cesantías', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(FondoCesantias $fondoCesantias): JsonResponse
    {
        return response()->json(['data' => $fondoCesantias]);
    }

    public function store(StoreFondoCesantiasRequest $request): JsonResponse
    {
        try {
            $fondo = FondoCesantias::create($request->validated());

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'fondos_cesantias');

            $this->auditoria->registrarCreacion(
                $request, 'FONDOS_CESANTIAS', $fondo,
                "Se creó el fondo de cesantías '{$fondo->nombre}'"
            );

            return response()->json([
                'message' => 'Fondo de cesantías creado correctamente',
                'data'    => $fondo,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear fondo de cesantías: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el fondo de cesantías', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateFondoCesantiasRequest $request, FondoCesantias $fondoCesantias): JsonResponse
    {
        try {
            $datosAnteriores = $fondoCesantias->toArray();
            $fondoCesantias->update($request->validated());

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'fondos_cesantias');

            $this->auditoria->registrarEdicion(
                $request, 'FONDOS_CESANTIAS', $fondoCesantias, $datosAnteriores,
                "Se editó el fondo de cesantías '{$fondoCesantias->nombre}'"
            );

            return response()->json([
                'message' => 'Fondo de cesantías actualizado correctamente',
                'data'    => $fondoCesantias->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar fondo de cesantías: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el fondo de cesantías', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, FondoCesantias $fondoCesantias): JsonResponse
    {
        try {
            $nombre = $fondoCesantias->nombre;

            $this->auditoria->registrarEliminacion(
                $request, 'FONDOS_CESANTIAS', $fondoCesantias,
                "Se eliminó el fondo de cesantías '{$nombre}'"
            );
            $fondoCesantias->delete();

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'fondos_cesantias');

            return response()->json(['message' => "Fondo de cesantías '{$nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar fondo de cesantías: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el fondo de cesantías', 'error' => $e->getMessage()], 500);
        }
    }
}
