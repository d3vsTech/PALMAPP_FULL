<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operario;
use App\Models\Tercero;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class OperarioController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Standalone select para el wizard de operaciones (todos los operarios activos).
     * GET /operarios/select
     */
    public function selectStandalone(Request $request): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $operarios = Cache::remember(
                WizardCache::operacionesOperarios($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => Operario::query()
                    ->where('estado', true)
                    ->with('tercero:id,tipo_persona,razon_social,nombre_completo,nombre_comercial')
                    ->orderBy('nombres')
                    ->orderBy('apellidos')
                    ->get(['id', 'tercero_id', 'nombres', 'apellidos', 'cedula'])
                    ->map(fn ($o) => [
                        'id'              => $o->id,
                        'tercero_id'      => $o->tercero_id,
                        'nombre_completo' => $o->nombre_completo,
                        'cedula'          => $o->cedula,
                        'tercero_nombre'  => $o->tercero?->nombre_display,
                    ])->values()->all(),
            );

            return response()->json(['data' => $operarios]);
        } catch (\Throwable $e) {
            Log::error('Error en operarios/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar operarios', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Select nested bajo un tercero específico.
     * GET /terceros/{tercero}/operarios/select
     */
    public function select(Tercero $tercero): JsonResponse
    {
        try {
            $operarios = $tercero->operarios()
                ->where('estado', true)
                ->orderBy('nombres')
                ->orderBy('apellidos')
                ->get(['id', 'tercero_id', 'nombres', 'apellidos', 'cedula'])
                ->map(fn ($o) => [
                    'id'              => $o->id,
                    'tercero_id'      => $o->tercero_id,
                    'nombre_completo' => $o->nombre_completo,
                    'cedula'          => $o->cedula,
                ]);

            return response()->json(['data' => $operarios]);
        } catch (\Throwable $e) {
            Log::error('Error en terceros/{tercero}/operarios/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar operarios', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Tercero $tercero): JsonResponse
    {
        try {
            $operarios = $tercero->operarios()
                ->orderBy('nombres')
                ->orderBy('apellidos')
                ->get();

            return response()->json(['data' => $operarios]);
        } catch (\Throwable $e) {
            Log::error('Error al listar operarios: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar operarios', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Tercero $tercero, Operario $operario): JsonResponse
    {
        try {
            $this->verificarPertenencia($tercero, $operario);

            return response()->json(['data' => $operario]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener operario: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener operario', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $data = $request->validate([
                'nombres'   => 'required|string|max:100',
                'apellidos' => 'required|string|max:100',
                'cedula'    => 'nullable|string|max:20',
                'cargo'     => 'nullable|string|max:100',
                'eps'       => 'nullable|string|max:50',
                'arl'       => 'nullable|string|max:50',
            ]);

            $operario = $tercero->operarios()->create(array_merge($data, ['estado' => true]));

            $this->invalidarCacheOperarios();

            $this->auditoria->registrarCreacion(
                $request, 'OPERARIOS', $operario,
                "Se creó operario {$operario->nombre_completo} para tercero #{$tercero->id}",
            );

            return response()->json(['message' => 'Operario creado correctamente', 'data' => $operario], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear operario: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear operario', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Tercero $tercero, Operario $operario): JsonResponse
    {
        try {
            $this->verificarPertenencia($tercero, $operario);

            $data = $request->validate([
                'nombres'   => 'sometimes|string|max:100',
                'apellidos' => 'sometimes|string|max:100',
                'cedula'    => 'nullable|string|max:20',
                'cargo'     => 'nullable|string|max:100',
                'eps'       => 'nullable|string|max:50',
                'arl'       => 'nullable|string|max:50',
            ]);

            $datosAnteriores = $operario->toArray();
            $operario->update($data);

            $this->invalidarCacheOperarios();

            $this->auditoria->registrarEdicion(
                $request, 'OPERARIOS', $operario, $datosAnteriores,
                "Se editó operario #{$operario->id}",
            );

            return response()->json(['message' => 'Operario actualizado correctamente', 'data' => $operario->fresh()]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar operario: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar operario', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Tercero $tercero, Operario $operario): JsonResponse
    {
        try {
            $this->verificarPertenencia($tercero, $operario);

            if ($operario->jornales()->exists() || $operario->cosechasCuadrilla()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar un operario que tiene jornales o cosechas asociadas.',
                    'code'    => 'OPERARIO_CON_JORNALES',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'OPERARIOS', $operario,
                "Se eliminó operario #{$operario->id}: {$operario->nombre_completo}",
            );

            $operario->delete();
            $this->invalidarCacheOperarios();

            return response()->json(['message' => 'Operario eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar operario: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar operario', 'error' => $e->getMessage()], 500);
        }
    }

    public function toggle(Request $request, Tercero $tercero, Operario $operario): JsonResponse
    {
        try {
            $this->verificarPertenencia($tercero, $operario);

            $operario->update(['estado' => !$operario->estado]);
            $this->invalidarCacheOperarios();

            $accion = $operario->estado ? 'activado' : 'desactivado';
            $this->auditoria->registrarEdicion(
                $request, 'OPERARIOS', $operario, ['estado' => !$operario->estado],
                "Se {$accion} operario #{$operario->id}",
            );

            return response()->json(['message' => "Operario {$accion} correctamente", 'data' => $operario]);
        } catch (\Throwable $e) {
            Log::error('Error al cambiar estado de operario: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cambiar estado', 'error' => $e->getMessage()], 500);
        }
    }

    private function verificarPertenencia(Tercero $tercero, Operario $operario): void
    {
        if ((int) $operario->tercero_id !== $tercero->id) {
            abort(404, 'Operario no encontrado para este tercero.');
        }
    }

    private function invalidarCacheOperarios(): void
    {
        $tenantId = (int) app('current_tenant_id');
        WizardCache::forgetOperacionesKey(WizardCache::operacionesOperarios($tenantId));
    }
}
