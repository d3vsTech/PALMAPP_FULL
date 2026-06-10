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
                    'tipo_pago_nomina'         => $config->tipo_pago_nomina,
                    'salario_minimo_vigente'   => $config->salario_minimo_vigente,
                    'auxilio_transporte'       => $config->auxilio_transporte,
                    'divisor_jornada_mensual'  => $config->divisor_jornada_mensual,
                    'horas_semanales'          => $config->horas_semanales,
                    'dia_inicio_q1'            => $config->dia_inicio_q1,
                    'dia_fin_q1'               => $config->dia_fin_q1,
                    'dia_inicio_q2'            => $config->dia_inicio_q2,
                    'dia_fin_q2'               => $config->dia_fin_q2,
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
                'tipo_pago_nomina'         => 'sometimes|in:QUINCENAL,MENSUAL',
                'salario_minimo_vigente'   => 'sometimes|numeric|min:0|max:99999999.99',
                'auxilio_transporte'       => 'sometimes|numeric|min:0|max:99999999.99',
                'divisor_jornada_mensual'  => 'sometimes|integer|min:1|max:480',
                'horas_semanales'          => 'sometimes|integer|min:1|max:96',
                'dia_inicio_q1'            => 'sometimes|integer|min:1|max:31',
                'dia_fin_q1'               => 'sometimes|integer|min:1|max:31',
                'dia_inicio_q2'            => 'sometimes|integer|min:1|max:31',
                'dia_fin_q2'               => 'sometimes|integer|min:1|max:31',
            ]);

            if (isset($validated['horas_semanales'])) {
                $validated['divisor_jornada_mensual'] = $validated['horas_semanales'] * 5;
                unset($validated['horas_semanales']);
            }

            $tenantId = app('current_tenant_id');
            $config = TenantConfig::where('tenant_id', $tenantId)->first();

            if (!$config) {
                return response()->json([
                    'message' => 'No se encontró la configuración del tenant',
                    'code'    => 'CONFIG_NOT_FOUND',
                ], 404);
            }

            // Validación cruzada de los días de corte: combinar payload + valores actuales.
            // El tipo efectivo determina qué validaciones aplican.
            $tipoPago = $validated['tipo_pago_nomina'] ?? $config->tipo_pago_nomina;
            $q1Inicio = $validated['dia_inicio_q1'] ?? $config->dia_inicio_q1;
            $q1Fin    = $validated['dia_fin_q1']    ?? $config->dia_fin_q1;

            $erroresCortes = [];

            if ($q1Fin < $q1Inicio) {
                $erroresCortes['dia_fin_q1'] = ['Debe ser mayor o igual al día de inicio de Q1.'];
            }

            // Q2 solo aplica en modo QUINCENAL
            if ($tipoPago === 'QUINCENAL') {
                $q2Inicio = $validated['dia_inicio_q2'] ?? $config->dia_inicio_q2;
                $q2Fin    = $validated['dia_fin_q2']    ?? $config->dia_fin_q2;

                if ($q2Inicio <= $q1Fin) {
                    $erroresCortes['dia_inicio_q2'] = ['Debe ser mayor al día de fin de Q1 (sin solapamiento).'];
                }
                if ($q2Fin < $q2Inicio) {
                    $erroresCortes['dia_fin_q2'] = ['Debe ser mayor o igual al día de inicio de Q2.'];
                }
            }

            if ($erroresCortes) {
                return response()->json([
                    'message' => 'Configuración de fechas de corte inválida',
                    'errors'  => $erroresCortes,
                    'code'    => 'CORTE_QUINCENA_INVALIDO',
                ], 422);
            }

            $datosAnteriores = $config->only([
                'tipo_pago_nomina', 'salario_minimo_vigente', 'auxilio_transporte', 'divisor_jornada_mensual',
                'dia_inicio_q1', 'dia_fin_q1', 'dia_inicio_q2', 'dia_fin_q2',
            ]);

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
                    'tipo_pago_nomina'         => $config->tipo_pago_nomina,
                    'salario_minimo_vigente'   => $config->salario_minimo_vigente,
                    'auxilio_transporte'       => $config->auxilio_transporte,
                    'divisor_jornada_mensual'  => $config->divisor_jornada_mensual,
                    'horas_semanales'          => $config->horas_semanales,
                    'dia_inicio_q1'            => $config->dia_inicio_q1,
                    'dia_fin_q1'               => $config->dia_fin_q1,
                    'dia_inicio_q2'            => $config->dia_inicio_q2,
                    'dia_fin_q2'               => $config->dia_fin_q2,
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
