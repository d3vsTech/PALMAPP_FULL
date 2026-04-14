<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrecioCosecha;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrecioCosechaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $precios = PrecioCosecha::query()
                ->with('lote:id,nombre')
                ->when($request->lote_id, fn($q, $id) => $q->where('lote_id', $id))
                ->when($request->anio, fn($q, $a) => $q->where('anio', $a))
                ->orderByDesc('anio')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $precios->items(),
                'meta' => [
                    'current_page' => $precios->currentPage(),
                    'last_page'    => $precios->lastPage(),
                    'per_page'     => $precios->perPage(),
                    'total'        => $precios->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar precios de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los precios de cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(PrecioCosecha $precioCosecha): JsonResponse
    {
        try {
            $precioCosecha->load('lote:id,nombre');
            return response()->json(['data' => $precioCosecha]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener precio de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el precio de cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'lote_id' => 'required|exists:lotes,id',
                'precio'  => 'required|numeric|min:0|max:99999999.99',
                'anio'    => 'required|integer|min:2000|max:2100',
            ]);

            $existe = PrecioCosecha::where('lote_id', $validated['lote_id'])
                ->where('anio', $validated['anio'])
                ->exists();

            if ($existe) {
                return response()->json([
                    'message' => 'Ya existe un precio de cosecha para este lote en el año indicado',
                    'code'    => 'PRECIO_COSECHA_DUPLICADO',
                ], 409);
            }

            $precio = PrecioCosecha::create($validated);

            $this->auditoria->registrarCreacion($request, 'PRECIOS_COSECHA', $precio, "Se creó precio de cosecha para lote #{$precio->lote_id} año {$precio->anio}: \${$precio->precio}");

            return response()->json([
                'message' => 'Precio de cosecha creado correctamente',
                'data'    => $precio->load('lote:id,nombre'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear precio de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el precio de cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, PrecioCosecha $precioCosecha): JsonResponse
    {
        try {
            $validated = $request->validate([
                'precio' => 'sometimes|numeric|min:0|max:99999999.99',
                'anio'   => 'sometimes|integer|min:2000|max:2100',
            ]);

            // Verificar duplicado si cambia el año
            if (isset($validated['anio']) && $validated['anio'] != $precioCosecha->anio) {
                $existe = PrecioCosecha::where('lote_id', $precioCosecha->lote_id)
                    ->where('anio', $validated['anio'])
                    ->where('id', '!=', $precioCosecha->id)
                    ->exists();

                if ($existe) {
                    return response()->json([
                        'message' => 'Ya existe un precio de cosecha para este lote en el año indicado',
                        'code'    => 'PRECIO_COSECHA_DUPLICADO',
                    ], 409);
                }
            }

            $datosAnteriores = $precioCosecha->toArray();
            $precioCosecha->update($validated);

            $this->auditoria->registrarEdicion($request, 'PRECIOS_COSECHA', $precioCosecha, $datosAnteriores, "Se editó precio de cosecha lote #{$precioCosecha->lote_id} año {$precioCosecha->anio}");

            return response()->json([
                'message' => 'Precio de cosecha actualizado correctamente',
                'data'    => $precioCosecha->fresh()->load('lote:id,nombre'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar precio de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el precio de cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, PrecioCosecha $precioCosecha): JsonResponse
    {
        try {
            $this->auditoria->registrarEliminacion($request, 'PRECIOS_COSECHA', $precioCosecha, "Se eliminó precio de cosecha lote #{$precioCosecha->lote_id} año {$precioCosecha->anio}: \${$precioCosecha->precio}");
            $precioCosecha->delete();

            return response()->json(['message' => 'Precio de cosecha eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar precio de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el precio de cosecha', 'error' => $e->getMessage()], 500);
        }
    }
}
