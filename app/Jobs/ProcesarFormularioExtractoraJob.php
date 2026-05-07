<?php

namespace App\Jobs;

use App\Exceptions\ClaudeVisionException;
use App\Models\ViajeDocumentoBascula;
use App\Services\AuditoriaService;
use App\Services\ClaudeVisionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Procesa el formulario de extractora subido al viaje (foto/PDF) usando
 * Claude Vision y guarda los 12 campos extraídos en el documento.
 *
 * Este Job NO toca la tabla `viajes`: el operador revisa los datos extraídos
 * en el frontend, los edita si hace falta, y luego usa los endpoints
 * manuales `PATCH /viajes/{id}/validar` (hidratar) y `POST /viajes/{id}/finalizar`
 * (cerrar) para persistir y disparar los cálculos.
 *
 * Campos críticos: peso_viaje, numero_remision_extractora, fecha_llegada,
 * hora_llegada. Si la confianza es baja o falta cualquier crítico, el
 * documento queda en REVISION_MANUAL para que el frontend pinte una alerta
 * — los datos extraídos se guardan igual como hint editable. Dos campos
 * auxiliares (`nombre_conductor_extraido`, `placa_vehiculo_extraida`) NO
 * se persisten en `viajes`; los lee el GET de polling para emitir alertas
 * cruzadas contra el snapshot del viaje.
 */
class ProcesarFormularioExtractoraJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries   = 3;

    /** Backoff progresivo entre reintentos (segundos). */
    public function backoff(): array
    {
        return [30, 90, 180];
    }

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public ViajeDocumentoBascula $documento,
    ) {}

    public function handle(
        ClaudeVisionService $vision,
        AuditoriaService $auditoria,
    ): void {
        app()->instance('current_tenant_id', $this->documento->tenant_id);

        $this->documento->refresh();
        if ($this->documento->isTerminal()) {
            return; // idempotencia
        }

        $this->documento->update([
            'estado_ocr' => ViajeDocumentoBascula::ESTADO_PROCESANDO,
            'intentos'   => $this->documento->intentos + 1,
        ]);

        $rutaAbsoluta = Storage::disk('local')->path($this->documento->archivo_path);
        $resultado    = $vision->extraerFormularioExtractora($rutaAbsoluta, $this->documento->mime_type);

        $datos     = $resultado['datos'];
        $confianza = $resultado['confianza'];
        $umbral    = (float) config('services.anthropic.bascula.confianza_minima', 0.70);

        $criticosFaltantes = array_filter(
            ClaudeVisionService::CAMPOS_CRITICOS,
            fn ($k) => empty($datos[$k]),
        );

        $estadoFinal = (!empty($criticosFaltantes) || $confianza < $umbral)
            ? ViajeDocumentoBascula::ESTADO_REVISION_MANUAL
            : ViajeDocumentoBascula::ESTADO_COMPLETADO;

        $errorMensaje = null;
        if ($estadoFinal === ViajeDocumentoBascula::ESTADO_REVISION_MANUAL) {
            $errorMensaje = !empty($criticosFaltantes)
                ? 'Faltan campos críticos en el documento: ' . implode(', ', $criticosFaltantes)
                : "Confianza {$confianza} bajo el umbral {$umbral}";
        }

        $this->documento->update([
            'estado_ocr'       => $estadoFinal,
            'peso_extraido'    => $datos['peso_viaje'],
            'confianza'        => $confianza,
            'modelo_usado'     => $resultado['modelo'],
            'respuesta_claude' => $resultado['raw'],
            'datos_extraidos'  => $datos,
            'error_mensaje'    => $errorMensaje,
            'procesado_at'     => now(),
        ]);

        if ($estadoFinal === ViajeDocumentoBascula::ESTADO_REVISION_MANUAL) {
            Log::warning('OCR formulario extractora en REVISION_MANUAL', [
                'documento_id' => $this->documento->id,
                'viaje_id'     => $this->documento->viaje_id,
                'confianza'    => $confianza,
                'razon'        => $errorMensaje,
            ]);
        }

        $observacion = $estadoFinal === ViajeDocumentoBascula::ESTADO_COMPLETADO
            ? "OCR completado para documento #{$this->documento->id} (confianza {$confianza})"
            : "OCR documento #{$this->documento->id} en REVISION_MANUAL ({$errorMensaje})";

        $auditoria->registrar(
            request: app(Request::class),
            accion: 'PROCESAR_FORMULARIO_EXTRACTORA',
            modulo: 'VIAJES',
            observaciones: $observacion,
        );
    }

    public function failed(Throwable $e): void
    {
        app()->instance('current_tenant_id', $this->documento->tenant_id);

        $this->documento->refresh()->update([
            'estado_ocr'    => ViajeDocumentoBascula::ESTADO_FALLIDO,
            'error_mensaje' => 'OCR falló tras reintentos: ' . $e->getMessage(),
            'procesado_at'  => now(),
        ]);

        Log::error('ProcesarFormularioExtractoraJob falló', [
            'documento_id' => $this->documento->id,
            'viaje_id'     => $this->documento->viaje_id,
            'exception'    => $e->getMessage(),
            'is_claude'    => $e instanceof ClaudeVisionException,
        ]);

        try {
            app(AuditoriaService::class)->registrar(
                request: app(Request::class),
                accion: 'PROCESAR_FORMULARIO_EXTRACTORA',
                modulo: 'VIAJES',
                observaciones: "OCR documento #{$this->documento->id} FALLIDO tras {$this->tries} reintentos: " . $e->getMessage(),
            );
        } catch (Throwable $auditEx) {
            // No queremos que un fallo de auditoría enmascare la excepción original.
            Log::error('No se pudo registrar auditoría del fallo de OCR', [
                'documento_id' => $this->documento->id,
                'audit_error'  => $auditEx->getMessage(),
            ]);
        }
    }
}
