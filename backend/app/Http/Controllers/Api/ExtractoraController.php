<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Extractora\StoreExtractoraRequest;
use App\Http\Requests\Extractora\UpdateExtractoraRequest;
use App\Models\Extractora;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExtractoraController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    /**
     * Select de extractoras activas.
     * Alimenta el dropdown "Extractora Destino" del form de creación de viaje.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $extractoras = Extractora::query()
                ->activas()
                ->when($request->search, fn ($q, $v) => $q->where('razon_social', 'ilike', "%{$v}%"))
                ->orderBy('razon_social')
                ->get(['id', 'razon_social', 'nit', 'ubicacion', 'ciudad', 'distancia_km']);

            return response()->json(['data' => $extractoras]);
        } catch (\Throwable $e) {
            Log::error('Error al listar extractoras (select): ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar extractoras', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = Extractora::query()
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q2) use ($s) {
                        $q2->where('razon_social', 'ilike', "%{$s}%")
                           ->orWhere('nit', 'ilike', "%{$s}%");
                    });
                })
                ->when($request->has('estado'), fn ($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->when($request->departamento_codigo, fn ($q, $v) => $q->where('departamento_codigo', $v))
                ->orderBy('razon_social')
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
            Log::error('Error al listar extractoras: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las extractoras', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Extractora $extractora): JsonResponse
    {
        try {
            $extractora->load([
                'departamento:codigo,nombre',
                'municipio:codigo,nombre',
            ]);

            return response()->json(['data' => $extractora]);
        } catch (\Throwable $e) {
            Log::error('Error al mostrar extractora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al consultar la extractora', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreExtractoraRequest $request): JsonResponse
    {
        try {
            $extractora = Extractora::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'EXTRACTORAS', $extractora,
                "Se creó la extractora '{$extractora->razon_social}'"
            );

            return response()->json([
                'message' => 'Extractora creada correctamente',
                'data'    => $extractora,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear extractora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la extractora', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateExtractoraRequest $request, Extractora $extractora): JsonResponse
    {
        try {
            $datosAnteriores = $extractora->toArray();
            $extractora->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'EXTRACTORAS', $extractora, $datosAnteriores,
                "Se editó la extractora '{$extractora->razon_social}'"
            );

            return response()->json([
                'message' => 'Extractora actualizada correctamente',
                'data'    => $extractora->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar extractora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la extractora', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Extractora $extractora): JsonResponse
    {
        try {
            $razonSocial = $extractora->razon_social;

            $this->auditoria->registrarEliminacion(
                $request, 'EXTRACTORAS', $extractora,
                "Se inactivó la extractora '{$razonSocial}'"
            );

            // Soft delete: las FK de viajes son restrictOnDelete, así que solo se desactiva.
            $extractora->update(['estado' => false]);

            return response()->json(['message' => "Extractora '{$razonSocial}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar extractora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la extractora', 'error' => $e->getMessage()], 500);
        }
    }
}
