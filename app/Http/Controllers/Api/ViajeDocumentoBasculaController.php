<?php

namespace App\Http\Controllers\Api;

use App\Constants\ViajeEstado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Viaje\SubirDocumentoBasculaRequest;
use App\Jobs\ProcesarFormularioExtractoraJob;
use App\Models\Viaje;
use App\Models\ViajeDocumentoBascula;
use App\Services\AuditoriaService;
use App\Services\ViajeOcrCrossCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ViajeDocumentoBasculaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected ViajeOcrCrossCheckService $crossCheck,
    ) {}

    /**
     * POST /api/v1/tenant/viajes/{viaje}/documento-bascula
     *
     * Recibe el formulario de extractora (imagen o PDF), lo guarda en storage
     * privado y encola `ProcesarFormularioExtractoraJob` para que Claude Vision
     * extraiga los 12 campos del formulario y los guarde en
     * `viaje_documento_bascula.datos_extraidos`. **No hidrata `viajes`**: el
     * frontend hace polling al GET, rellena el form con los datos extraídos,
     * el operador revisa y al darle "Finalizar y guardar" se llaman
     * `PATCH /viajes/{id}/validar` + `POST /viajes/{id}/finalizar` aparte.
     */
    public function store(SubirDocumentoBasculaRequest $request, Viaje $viaje): JsonResponse
    {
        try {
            if (empty(config('services.anthropic.api_key'))) {
                return response()->json([
                    'message' => 'OCR no disponible: ANTHROPIC_API_KEY no está configurada en el servidor.',
                    'code'    => 'ANTHROPIC_SIN_CONFIGURAR',
                ], 503);
            }

            if ($viaje->estado !== ViajeEstado::EN_VALIDACION) {
                return response()->json([
                    'message' => "El viaje está en estado {$viaje->estado}; solo se puede subir el formulario de extractora cuando está EN_VALIDACION.",
                    'code'    => 'VIAJE_ESTADO_INVALIDO',
                ], 409);
            }

            $tenantId = app('current_tenant_id');
            $file     = $request->file('documento');
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path     = "tenants/{$tenantId}/viajes/{$viaje->id}/bascula";

            $storedPath = $file->storeAs($path, $filename, 'local');

            $documento = ViajeDocumentoBascula::create([
                'tenant_id'               => $tenantId,
                'viaje_id'                => $viaje->id,
                'archivo_path'            => $storedPath,
                'archivo_nombre_original' => $file->getClientOriginalName(),
                'mime_type'               => $file->getMimeType() ?: $file->getClientMimeType(),
                'archivo_tamano'          => $file->getSize(),
                'estado_ocr'              => ViajeDocumentoBascula::ESTADO_PENDIENTE,
                'creado_por'              => $request->user()?->id,
            ]);

            ProcesarFormularioExtractoraJob::dispatch($documento);

            $this->auditoria->registrarCreacion(
                $request,
                'VIAJES',
                $documento,
                "Se subió formulario de extractora #{$documento->id} al viaje {$viaje->remision}",
            );

            return response()->json([
                'message' => 'Documento recibido, procesamiento en cola',
                'data'    => [
                    'documento_id' => $documento->id,
                    'estado_ocr'   => $documento->estado_ocr,
                    'poll_url'     => "/api/v1/tenant/viajes/{$viaje->id}/documento-bascula/{$documento->id}",
                ],
            ], 202);
        } catch (\Throwable $e) {
            Log::error('Error al subir documento de báscula', [
                'viaje_id'  => $viaje->id,
                'user_id'   => $request->user()?->id,
                'tenant_id' => app('current_tenant_id'),
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error al subir el documento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/v1/tenant/viajes/{viaje}/documento-bascula/{documento}
     *
     * Endpoint de polling. El front lo consulta cada 2-3 segundos tras el POST
     * hasta que estado_ocr entra a un estado terminal (COMPLETADO,
     * REVISION_MANUAL, FALLIDO). Devuelve los 12 campos extraídos en
     * `datos_extraidos` para que el front los use como hint editable en el
     * formulario del operador. La persistencia y los cálculos se hacen luego
     * vía `PATCH /viajes/{id}/validar` + `POST /viajes/{id}/finalizar`.
     *
     * Además, cuando el OCR ya alcanzó un estado terminal con datos disponibles
     * (COMPLETADO o REVISION_MANUAL), agrega la sección `validaciones_cruzadas`
     * con la comparación tolerante de conductor y placa contra el snapshot
     * del viaje. El front la usa para pintar alertas no bloqueantes cuando
     * `coincide = false` (camión llegó con conductor o placa distintos a los
     * planeados).
     */
    public function show(Request $request, Viaje $viaje, ViajeDocumentoBascula $documento): JsonResponse
    {
        try {
            if ($documento->viaje_id !== $viaje->id) {
                return response()->json([
                    'message' => 'El documento no pertenece a este viaje',
                    'code'    => 'DOCUMENTO_VIAJE_MISMATCH',
                ], 404);
            }

            $payload = [
                'id'              => $documento->id,
                'estado_ocr'      => $documento->estado_ocr,
                'peso_extraido'   => $documento->peso_extraido,
                'confianza'       => $documento->confianza,
                'modelo_usado'    => $documento->modelo_usado,
                'intentos'        => $documento->intentos,
                'procesado_at'    => $documento->procesado_at,
                'error_mensaje'   => $documento->error_mensaje,
                'datos_extraidos' => $documento->datos_extraidos,
                'viaje' => [
                    'id'       => $viaje->id,
                    'remision' => $viaje->remision,
                    'estado'   => $viaje->estado,
                ],
            ];

            $estadoConDatos = in_array($documento->estado_ocr, [
                ViajeDocumentoBascula::ESTADO_COMPLETADO,
                ViajeDocumentoBascula::ESTADO_REVISION_MANUAL,
            ], true);

            if ($estadoConDatos && is_array($documento->datos_extraidos)) {
                $conductorExtraido = $documento->datos_extraidos['nombre_conductor_extraido'] ?? null;
                $placaExtraida     = $documento->datos_extraidos['placa_vehiculo_extraida'] ?? null;

                $payload['validaciones_cruzadas'] = [
                    'conductor' => [
                        'extraido' => $conductorExtraido,
                        'esperado' => $viaje->nombre_conductor,
                        'coincide' => $this->crossCheck->compararConductor($conductorExtraido, $viaje->nombre_conductor),
                    ],
                    'placa' => [
                        'extraido' => $placaExtraida,
                        'esperado' => $viaje->placa_vehiculo,
                        'coincide' => $this->crossCheck->compararPlaca($placaExtraida, $viaje->placa_vehiculo),
                    ],
                ];
            }

            return response()->json(['data' => $payload]);
        } catch (\Throwable $e) {
            Log::error('Error al consultar documento de báscula', [
                'viaje_id'     => $viaje->id,
                'documento_id' => $documento->id,
                'tenant_id'    => app('current_tenant_id'),
                'exception'    => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Error al consultar el documento', 'error' => $e->getMessage()], 500);
        }
    }
}
