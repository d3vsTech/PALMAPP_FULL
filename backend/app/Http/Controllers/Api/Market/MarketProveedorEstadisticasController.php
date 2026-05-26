<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\Proveedor\EstadisticasFilterRequest;
use App\Services\Market\MarketProveedorEstadisticasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MarketProveedorEstadisticasController extends Controller
{
    public function __construct(
        protected MarketProveedorEstadisticasService $estadisticas,
    ) {}

    /**
     * GET /api/v1/market/proveedor/estadisticas
     *
     * Devuelve KPIs, evolución de ventas, top productos, top clientes y
     * métricas adicionales para el proveedor autenticado, con comparativa
     * contra el periodo previo equivalente.
     */
    public function index(EstadisticasFilterRequest $request): JsonResponse
    {
        try {
            $proveedorId = (int) app('current_proveedor_id');

            $rangos = $this->estadisticas->resolverRango(
                $request->input('periodo'),
                $request->input('fecha_desde'),
                $request->input('fecha_hasta'),
            );

            return response()->json([
                'data' => $this->estadisticas->obtenerEstadisticas($proveedorId, $rangos),
            ]);
        } catch (\Throwable $e) {
            Log::error('MarketProveedorEstadisticas error', [
                'proveedor_id' => app('current_proveedor_id'),
                'message'      => $e->getMessage(),
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error al cargar las estadísticas',
            ], 500);
        }
    }
}
