<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\DashboardFilterRequest;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class DashboardTenantController extends Controller
{
    public function __construct(protected DashboardService $service) {}

    public function index(DashboardFilterRequest $request): JsonResponse
    {
        try {
            [$desde, $hasta] = $this->service->resolverRango(
                $request->input('periodo', 'semanal'),
                $request->input('fecha_inicio'),
                $request->input('fecha_fin'),
            );

            return response()->json([
                'data' => $this->service->obtenerDashboard($desde, $hasta),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Error en dashboard tenant: ' . $e->getMessage(), [
                'tenant_id' => app()->bound('current_tenant_id') ? app('current_tenant_id') : null,
                'trace'     => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error al cargar el dashboard',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
