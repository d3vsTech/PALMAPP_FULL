<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Extractora;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExtractoraController extends Controller
{
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
}
