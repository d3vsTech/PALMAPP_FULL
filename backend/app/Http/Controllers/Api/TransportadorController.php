<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transportador\StoreTransportadorRequest;
use App\Http\Requests\Transportador\UpdateTransportadorRequest;
use App\Models\Transportador;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TransportadorController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $items = Transportador::query()
                ->with('empresa:id,razon_social,nit')
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q2) use ($s) {
                        $q2->where('nombres', 'ilike', "%{$s}%")
                           ->orWhere('apellidos', 'ilike', "%{$s}%")
                           ->orWhere('numero_documento', 'ilike', "%{$s}%")
                           ->orWhere('placa_vehiculo', 'ilike', "%{$s}%");
                    });
                })
                ->when($request->has('estado'), fn ($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->when($request->empresa_transportadora_id, fn ($q, $v) => $q->where('empresa_transportadora_id', $v))
                ->orderBy('nombres')
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
            Log::error('Error al listar transportadores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los transportadores', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Transportador $transportador): JsonResponse
    {
        try {
            $transportador->load('empresa:id,razon_social,nit');
            return response()->json(['data' => $transportador]);
        } catch (\Throwable $e) {
            Log::error('Error al mostrar transportador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al consultar el transportador', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreTransportadorRequest $request): JsonResponse
    {
        try {
            $transportador = Transportador::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'TRANSPORTADORES', $transportador,
                "Se creó el transportador '{$transportador->nombre_completo}' con placa '{$transportador->placa_vehiculo}'"
            );

            return response()->json([
                'message' => 'Transportador creado correctamente',
                'data'    => $transportador->load('empresa:id,razon_social,nit'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear transportador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el transportador', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateTransportadorRequest $request, Transportador $transportador): JsonResponse
    {
        try {
            $datosAnteriores = $transportador->toArray();
            $transportador->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'TRANSPORTADORES', $transportador, $datosAnteriores,
                "Se editó el transportador '{$transportador->nombre_completo}'"
            );

            return response()->json([
                'message' => 'Transportador actualizado correctamente',
                'data'    => $transportador->fresh()->load('empresa:id,razon_social,nit'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar transportador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el transportador', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Transportador $transportador): JsonResponse
    {
        try {
            if ($transportador->viajes()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el transportador porque tiene viajes asociados',
                    'code'    => 'TRANSPORTADOR_CON_VIAJES',
                ], 409);
            }

            $nombre = $transportador->nombre_completo;

            $this->auditoria->registrarEliminacion(
                $request, 'TRANSPORTADORES', $transportador,
                "Se eliminó el transportador '{$nombre}'"
            );

            $transportador->delete();

            return response()->json(['message' => "Transportador '{$nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar transportador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el transportador', 'error' => $e->getMessage()], 500);
        }
    }
}
