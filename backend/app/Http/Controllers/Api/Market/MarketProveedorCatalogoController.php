<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Models\Market\MarketBanco;
use App\Models\Market\MarketTransportadora;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MarketProveedorCatalogoController extends Controller
{
    /**
     * GET /api/v1/market/proveedor/catalogos/bancos
     */
    public function bancos(): JsonResponse
    {
        try {
            $bancos = Cache::remember('market:catalogo:bancos', 3600, function () {
                return MarketBanco::activos()->get(['id', 'nombre', 'codigo']);
            });

            return response()->json(['data' => $bancos]);
        } catch (\Throwable $e) {
            Log::error('Market: error al listar bancos: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener los bancos',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/catalogos/transportadoras
     */
    public function transportadoras(): JsonResponse
    {
        try {
            $transportadoras = Cache::remember('market:catalogo:transportadoras', 3600, function () {
                return MarketTransportadora::activos()->get(['id', 'nombre', 'codigo']);
            });

            return response()->json(['data' => $transportadoras]);
        } catch (\Throwable $e) {
            Log::error('Market: error al listar transportadoras: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener las transportadoras',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }
}
