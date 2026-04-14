<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantConfig;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConfiguracionNominaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/configuracion/nomina
     * Retorna la configuración de nómina del tenant actual.
     */
    public function show(): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');
            $config = TenantConfig::where('tenant_id', $tenantId)->first();

            if (!$config) {
                return response()->json([
                    'message' => 'No se encontró la configuración del tenant',
                    'code'    => 'CONFIG_NOT_FOUND',
                ], 404);
            }

            return response()->json([
                'data' => [
                    // Editables
                    'tipo_pago_nomina'       => $config->tipo_pago_nomina,
                    'salario_minimo_vigente' => $config->salario_minimo_vigente,
                    'auxilio_transporte'     => $config->auxilio_transporte,
                    // Solo lectura
                    'moneda'        => $config->moneda,
                    'zona_horaria'  => $config->zona_horaria,
                    'pais'          => $config->pais,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener configuración de nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener la configuración', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/configuracion/nomina
     * Actualiza los campos editables de la configuración de nómina.
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'tipo_pago_nomina'       => 'sometimes|in:QUINCENAL,MENSUAL',
                'salario_minimo_vigente' => 'sometimes|numeric|min:0|max:99999999.99',
                'auxilio_transporte'     => 'sometimes|numeric|min:0|max:99999999.99',
            ]);

            $tenantId = app('current_tenant_id');
            $config = TenantConfig::where('tenant_id', $tenantId)->first();

            if (!$config) {
                return response()->json([
                    'message' => 'No se encontró la configuración del tenant',
                    'code'    => 'CONFIG_NOT_FOUND',
                ], 404);
            }

            $datosAnteriores = $config->only(['tipo_pago_nomina', 'salario_minimo_vigente', 'auxilio_transporte']);

            $config->update($validated);

            $this->auditoria->registrarEdicion(
                $request,
                'CONFIGURACION_NOMINA',
                $config,
                $datosAnteriores,
                'Se actualizó la configuración de nómina',
            );

            return response()->json([
                'message' => 'Configuración de nómina actualizada correctamente',
                'data'    => [
                    'tipo_pago_nomina'       => $config->tipo_pago_nomina,
                    'salario_minimo_vigente' => $config->salario_minimo_vigente,
                    'auxilio_transporte'     => $config->auxilio_transporte,
                    'moneda'        => $config->moneda,
                    'zona_horaria'  => $config->zona_horaria,
                    'pais'          => $config->pais,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar configuración de nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la configuración', 'error' => $e->getMessage()], 500);
        }
    }
}
