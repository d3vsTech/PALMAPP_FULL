<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MotivoAusencia\StoreMotivoAusenciaRequest;
use App\Http\Requests\MotivoAusencia\UpdateMotivoAusenciaRequest;
use App\Models\MotivoAusencia;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MotivoAusenciaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Listado liviano para dropdowns (wizard Paso 4 - Ausencias).
     * Incluye tipo_base + flags para que el frontend pueda mostrar ayuda contextual.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $motivos = MotivoAusencia::query()
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'tipo_base', 'es_remunerada', 'afecta_nomina', 'porcentaje_pago_default', 'requiere_soporte', 'color', 'afecta_seguridad_social', 'afecta_parafiscales', 'afecta_prestaciones']);

            return response()->json(['data' => $motivos]);
        } catch (\Throwable $e) {
            Log::error('Error en motivos-ausencia/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar motivos de ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $motivos = MotivoAusencia::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->tipo_base, fn($q, $t) => $q->where('tipo_base', $t))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $motivos->items(),
                'meta' => [
                    'current_page' => $motivos->currentPage(),
                    'last_page'    => $motivos->lastPage(),
                    'per_page'     => $motivos->perPage(),
                    'total'        => $motivos->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar motivos-ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los motivos de ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(MotivoAusencia $motivoAusencia): JsonResponse
    {
        return response()->json(['data' => $motivoAusencia]);
    }

    public function store(StoreMotivoAusenciaRequest $request): JsonResponse
    {
        try {
            $motivo = MotivoAusencia::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'MOTIVOS_AUSENCIA', $motivo,
                "Se creó el motivo de ausencia '{$motivo->nombre}' (tipo_base: {$motivo->tipo_base})"
            );

            WizardCache::forgetOperacionesKey(WizardCache::operacionesMotivosAusencia((int) app('current_tenant_id')));

            return response()->json([
                'message' => 'Motivo de ausencia creado correctamente',
                'data'    => $motivo,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear motivo de ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el motivo de ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateMotivoAusenciaRequest $request, MotivoAusencia $motivoAusencia): JsonResponse
    {
        try {
            $datosAnteriores = $motivoAusencia->toArray();
            $motivoAusencia->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'MOTIVOS_AUSENCIA', $motivoAusencia, $datosAnteriores,
                "Se editó el motivo de ausencia '{$motivoAusencia->nombre}'"
            );

            WizardCache::forgetOperacionesKey(WizardCache::operacionesMotivosAusencia((int) app('current_tenant_id')));

            return response()->json([
                'message' => 'Motivo de ausencia actualizado correctamente',
                'data'    => $motivoAusencia->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar motivo de ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el motivo de ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, MotivoAusencia $motivoAusencia): JsonResponse
    {
        try {
            if ($motivoAusencia->ausencias()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el motivo porque tiene ausencias asociadas',
                    'code'    => 'MOTIVO_CON_AUSENCIAS',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'MOTIVOS_AUSENCIA', $motivoAusencia,
                "Se eliminó el motivo de ausencia '{$motivoAusencia->nombre}'"
            );
            $motivoAusencia->delete();

            WizardCache::forgetOperacionesKey(WizardCache::operacionesMotivosAusencia((int) app('current_tenant_id')));

            return response()->json(['message' => "Motivo '{$motivoAusencia->nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar motivo de ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el motivo de ausencia', 'error' => $e->getMessage()], 500);
        }
    }
}
