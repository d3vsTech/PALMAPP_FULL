<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\AjustarPromedioLoteNominaRequest;
use App\Models\Lote;
use App\Models\Nomina;
use App\Models\NominaValidacionCosecha;
use App\Services\AuditoriaService;
use App\Services\Nomina\ValidarCosechaService;
use App\Models\NominaPromedioLote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ValidarCosechaController extends Controller
{
    public function __construct(
        protected ValidarCosechaService $service,
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /nominas/{nomina}/validar-cosecha
     *
     * Devuelve el payload de comparación kg-colaboradores vs kg-extractora,
     * junto con el estado de confirmación del snapshot (si ya fue confirmado).
     */
    public function bundle(Nomina $nomina): JsonResponse
    {
        $data = $this->service->bundle($nomina);

        $validacion = NominaValidacionCosecha::where('nomina_id', $nomina->id)->first();
        $data['validado_at']  = $validacion?->validado_at?->toIso8601String();
        $data['validado_por'] = $validacion?->validadoPor?->name;

        return response()->json(['data' => $data]);
    }

    /**
     * PUT /nominas/{nomina}/promedios-lote/{lote}
     *
     * Guarda el promedio efectivo ajustado por el admin en nomina_promedio_lote
     * (por nómina × lote). No escribe en PromedioLote, que es solo auto-generado
     * por ViajeCalculationService. Idempotente: dos PUT sobre el mismo lote
     * actualizan el registro, nunca duplican.
     *
     * El frontend debe hacer GET /validar-cosecha después para ver la diferencia
     * actualizada con el nuevo promedio efectivo.
     */
    public function ajustarPromedio(
        AjustarPromedioLoteNominaRequest $request,
        Nomina $nomina,
        Lote   $lote,
    ): JsonResponse {
        try {
            $registro = $this->service->ajustarPromedio(
                $nomina,
                $lote->id,
                (float) $request->validated('promedio')
            );

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $nomina, [],
                "Se ajustó promedio lote #{$lote->id} ({$lote->nombre}) en nómina #{$nomina->id} → {$registro->promedio_efectivo}",
            );

            return response()->json([
                'message' => 'Promedio ajustado correctamente',
                'data'    => [
                    'lote_id'           => $registro->lote_id,
                    'lote_nombre'       => $lote->nombre,
                    'promedio_auto'     => (float) $registro->promedio_auto,
                    'promedio_manual'   => (float) $registro->promedio_manual,
                    'promedio_efectivo' => (float) $registro->promedio_efectivo,
                    'ajustado_at'       => $registro->ajustado_at?->toIso8601String(),
                ],
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => 'NOMINA_CERRADA',
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al ajustar promedio lote: ' . $e->getMessage());
            return response()->json(['message' => 'Error al ajustar promedio'], 500);
        }
    }

    /**
     * POST /nominas/{nomina}/validar-cosecha/confirmar
     *
     * Persiste el snapshot de validación. Idempotente: un segundo POST reemplaza
     * al primero con los datos más recientes (upsert por nomina_id).
     */
    public function confirmar(Request $request, Nomina $nomina): JsonResponse
    {
        try {
            $validacion = $this->service->confirmar($nomina, $request->user()->id);

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $nomina,
                "Se confirmó validación de cosecha de nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => 'Validación de cosecha confirmada',
                'data'    => $validacion,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => 'NOMINA_CERRADA',
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al confirmar validación de cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al confirmar validación'], 500);
        }
    }
}
