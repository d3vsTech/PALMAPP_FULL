<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrecioPalma;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrecioPalmaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(): JsonResponse
    {
        try {
            $precios = PrecioPalma::orderBy('tipo')->get();

            return response()->json(['data' => $precios]);
        } catch (\Throwable $e) {
            Log::error('Error al listar precios de palma: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los precios de palma', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(PrecioPalma $precioPalma): JsonResponse
    {
        return response()->json(['data' => $precioPalma]);
    }

    public function update(Request $request, PrecioPalma $precioPalma): JsonResponse
    {
        try {
            $validated = $request->validate([
                'precio_palma' => 'sometimes|nullable|numeric|min:0|max:99999999.99',
                'estado'       => 'sometimes|boolean',
            ]);

            $datosAnteriores = $precioPalma->toArray();
            $precioPalma->update($validated);

            $this->auditoria->registrarEdicion(
                $request,
                'PRECIOS_PALMA',
                $precioPalma,
                $datosAnteriores,
                "Se actualizó el precio de la labor de palma '{$precioPalma->tipo}'"
            );

            return response()->json([
                'message' => 'Precio actualizado correctamente',
                'data'    => $precioPalma->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar precio de palma: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el precio', 'error' => $e->getMessage()], 500);
        }
    }
}
