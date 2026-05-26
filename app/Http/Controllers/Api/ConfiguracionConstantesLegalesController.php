<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantConfig;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConfiguracionConstantesLegalesController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/configuracion/constantes-legales
     * Retorna todas las constantes legales del tenant.
     * Permiso requerido: configuracion.editar
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
                'data' => $this->formatConstantes($config),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener constantes legales: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener las constantes legales', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/configuracion/constantes-legales
     * Actualiza las constantes legales del tenant.
     * Permiso requerido: configuracion.editar
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'anio_vigente'                          => 'sometimes|integer|min:2020|max:2100',
                'salario_minimo_vigente'                => 'sometimes|numeric|min:0|max:99999999.99',
                'auxilio_transporte'                    => 'sometimes|numeric|min:0|max:99999999.99',
                'tasa_interes_cesantias'                => 'sometimes|numeric|min:0|max:100',
                'fecha_limite_consignacion_cesantias'   => 'sometimes|string|max:50',
                'fecha_limite_pago_intereses_cesantias' => 'sometimes|string|max:50',
                'fecha_limite_prima_primer_semestre'    => 'sometimes|string|max:50',
                'fecha_limite_prima_segundo_semestre'   => 'sometimes|string|max:50',
                'dias_vacaciones_anuales'               => 'sometimes|integer|min:1|max:365',
                'dias_anio_comercial'                   => 'sometimes|integer|min:1|max:999',
                'dias_mes_comercial'                    => 'sometimes|integer|min:1|max:99',
            ], [
                'anio_vigente.integer'       => 'El año vigente debe ser un número entero',
                'anio_vigente.min'           => 'El año vigente no puede ser anterior a 2020',
                'anio_vigente.max'           => 'El año vigente no puede ser mayor a 2100',
                'tasa_interes_cesantias.max' => 'La tasa de interés no puede superar el 100%',
                'dias_vacaciones_anuales.min' => 'Los días de vacaciones deben ser al menos 1',
                'dias_anio_comercial.min'    => 'Los días del año comercial deben ser al menos 1',
                'dias_mes_comercial.min'     => 'Los días del mes comercial deben ser al menos 1',
            ]);

            $tenantId = app('current_tenant_id');
            $config = TenantConfig::where('tenant_id', $tenantId)->first();

            if (!$config) {
                return response()->json([
                    'message' => 'No se encontró la configuración del tenant',
                    'code'    => 'CONFIG_NOT_FOUND',
                ], 404);
            }

            $datosAnteriores = $config->only([
                'anio_vigente', 'salario_minimo_vigente', 'auxilio_transporte',
                'tasa_interes_cesantias',
                'fecha_limite_consignacion_cesantias', 'fecha_limite_pago_intereses_cesantias',
                'fecha_limite_prima_primer_semestre', 'fecha_limite_prima_segundo_semestre',
                'dias_vacaciones_anuales', 'dias_anio_comercial', 'dias_mes_comercial',
            ]);

            $config->update($validated);

            $this->auditoria->registrarEdicion(
                $request,
                'CONFIGURACION_LEGAL',
                $config,
                $datosAnteriores,
                'Se actualizaron las constantes legales',
            );

            return response()->json([
                'message' => 'Constantes legales actualizadas correctamente',
                'data'    => $this->formatConstantes($config),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar constantes legales: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar las constantes legales', 'error' => $e->getMessage()], 500);
        }
    }

    private function formatConstantes(TenantConfig $config): array
    {
        return [
            'anio_vigente'                          => $config->anio_vigente ?? now()->year,
            'salario_minimo_vigente'                => $config->salario_minimo_vigente,
            'auxilio_transporte'                    => $config->auxilio_transporte,
            'tasa_interes_cesantias'                => $config->tasa_interes_cesantias,
            'fecha_limite_consignacion_cesantias'   => $config->fecha_limite_consignacion_cesantias,
            'fecha_limite_pago_intereses_cesantias' => $config->fecha_limite_pago_intereses_cesantias,
            'fecha_limite_prima_primer_semestre'    => $config->fecha_limite_prima_primer_semestre,
            'fecha_limite_prima_segundo_semestre'   => $config->fecha_limite_prima_segundo_semestre,
            'dias_vacaciones_anuales'               => $config->dias_vacaciones_anuales,
            'dias_anio_comercial'                   => $config->dias_anio_comercial,
            'dias_mes_comercial'                    => $config->dias_mes_comercial,
        ];
    }
}
