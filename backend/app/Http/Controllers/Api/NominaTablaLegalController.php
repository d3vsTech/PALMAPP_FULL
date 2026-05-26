<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NominaConcepto;
use App\Models\NominaTablaLegal;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NominaTablaLegalController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/configuracion/tablas-legales
     * Lista todos los registros de tabla legal del tenant.
     * Permiso requerido: configuracion.editar
     */
    public function index(): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $tablas = NominaTablaLegal::with('concepto')
                ->where('tenant_id', $tenantId)
                ->orderBy('id')
                ->get()
                ->map(fn($t) => $this->formatTabla($t));

            return response()->json(['data' => $tablas]);
        } catch (\Throwable $e) {
            Log::error('Error al listar tablas legales: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener las tablas legales', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/v1/tenant/configuracion/tablas-legales/conceptos-select
     * Lista los conceptos legales disponibles para el dropdown (Salud, Pensión, ARL).
     * Permiso requerido: configuracion.editar
     */
    public function conceptosSelect(): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $conceptos = NominaConcepto::where('tenant_id', $tenantId)
                ->whereIn('subtipo', ['SALUD', 'PENSION', 'ARL'])
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'subtipo']);

            return response()->json(['data' => $conceptos]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener conceptos select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener los conceptos', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/v1/tenant/configuracion/tablas-legales
     * Crea un nuevo registro de tabla legal.
     * Permiso requerido: configuracion.editar
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $validated = $request->validate([
                'concepto_id'          => [
                    'required', 'integer',
                    \Illuminate\Validation\Rule::exists('nomina_concepto', 'id')
                        ->where('tenant_id', $tenantId),
                ],
                'porcentaje_empleado'  => 'required|numeric|min:0|max:100',
                'porcentaje_empresa'   => 'required|numeric|min:0|max:100',
                'vigente_desde'        => 'required|date_format:d/m/Y',
                'vigente_hasta'        => 'nullable|date_format:d/m/Y',
            ], [
                'concepto_id.required'  => 'El concepto es obligatorio',
                'concepto_id.exists'    => 'El concepto seleccionado no es válido',
                'porcentaje_empleado.required' => 'El porcentaje del empleado es obligatorio',
                'porcentaje_empresa.required'  => 'El porcentaje de la empresa es obligatorio',
                'vigente_desde.required'       => 'La fecha de vigencia inicial es obligatoria',
                'vigente_desde.date_format'    => 'La fecha debe tener formato dd/mm/yyyy',
                'vigente_hasta.date_format'    => 'La fecha debe tener formato dd/mm/yyyy',
            ]);

            $tabla = NominaTablaLegal::create([
                'tenant_id'           => $tenantId,
                'concepto_id'         => $validated['concepto_id'],
                'porcentaje_empleado' => $validated['porcentaje_empleado'],
                'porcentaje_empresa'  => $validated['porcentaje_empresa'],
                'vigente_desde'       => \Carbon\Carbon::createFromFormat('d/m/Y', $validated['vigente_desde']),
                'vigente_hasta'       => isset($validated['vigente_hasta'])
                    ? \Carbon\Carbon::createFromFormat('d/m/Y', $validated['vigente_hasta'])
                    : null,
            ]);

            $tabla->load('concepto');

            $this->auditoria->registrarCreacion(
                $request,
                'TABLAS_LEGALES',
                $tabla,
                "Se creó tabla legal para concepto '{$tabla->concepto->nombre}'",
            );

            return response()->json([
                'message' => 'Tabla legal creada correctamente',
                'data'    => $this->formatTabla($tabla),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear tabla legal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la tabla legal', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/configuracion/tablas-legales/{tablaLegal}
     * Actualiza un registro de tabla legal.
     * Permiso requerido: configuracion.editar
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');
            $tabla = NominaTablaLegal::where('tenant_id', $tenantId)->findOrFail($id);

            $validated = $request->validate([
                'concepto_id'          => [
                    'sometimes', 'integer',
                    \Illuminate\Validation\Rule::exists('nomina_concepto', 'id')
                        ->where('tenant_id', $tenantId),
                ],
                'porcentaje_empleado'  => 'sometimes|numeric|min:0|max:100',
                'porcentaje_empresa'   => 'sometimes|numeric|min:0|max:100',
                'vigente_desde'        => 'sometimes|date_format:d/m/Y',
                'vigente_hasta'        => 'sometimes|nullable|date_format:d/m/Y',
            ], [
                'concepto_id.exists'         => 'El concepto seleccionado no es válido',
                'vigente_desde.date_format'  => 'La fecha debe tener formato dd/mm/yyyy',
                'vigente_hasta.date_format'  => 'La fecha debe tener formato dd/mm/yyyy',
            ]);

            $datosAnteriores = $tabla->only([
                'concepto_id', 'porcentaje_empleado', 'porcentaje_empresa',
                'vigente_desde', 'vigente_hasta',
            ]);

            if (isset($validated['vigente_desde'])) {
                $validated['vigente_desde'] = \Carbon\Carbon::createFromFormat('d/m/Y', $validated['vigente_desde']);
            }
            if (array_key_exists('vigente_hasta', $validated)) {
                $validated['vigente_hasta'] = $validated['vigente_hasta']
                    ? \Carbon\Carbon::createFromFormat('d/m/Y', $validated['vigente_hasta'])
                    : null;
            }

            $tabla->update($validated);
            $tabla->load('concepto');

            $this->auditoria->registrarEdicion(
                $request,
                'TABLAS_LEGALES',
                $tabla,
                $datosAnteriores,
                "Se actualizó tabla legal para concepto '{$tabla->concepto->nombre}'",
            );

            return response()->json([
                'message' => 'Tabla legal actualizada correctamente',
                'data'    => $this->formatTabla($tabla),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'Registro no encontrado', 'code' => 'NOT_FOUND'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar tabla legal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la tabla legal', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/configuracion/tablas-legales/{tablaLegal}
     * Elimina un registro de tabla legal.
     * Permiso requerido: configuracion.editar
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');
            $tabla = NominaTablaLegal::where('tenant_id', $tenantId)
                ->with('concepto')
                ->findOrFail($id);

            $nombreConcepto = $tabla->concepto?->nombre ?? "ID {$id}";

            $tabla->delete();

            $this->auditoria->registrarEliminacion(
                $request,
                'TABLAS_LEGALES',
                $tabla,
                "Se eliminó tabla legal del concepto '{$nombreConcepto}'",
            );

            return response()->json([
                'message' => "Tabla legal del concepto '{$nombreConcepto}' eliminada correctamente",
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'Registro no encontrado', 'code' => 'NOT_FOUND'], 404);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar tabla legal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la tabla legal', 'error' => $e->getMessage()], 500);
        }
    }

    private function formatTabla(NominaTablaLegal $tabla): array
    {
        return [
            'id'                  => $tabla->id,
            'concepto_id'         => $tabla->concepto_id,
            'concepto'            => $tabla->concepto ? [
                'id'     => $tabla->concepto->id,
                'nombre' => $tabla->concepto->nombre,
                'subtipo' => $tabla->concepto->subtipo,
            ] : null,
            'porcentaje_empleado' => $tabla->porcentaje_empleado,
            'porcentaje_empresa'  => $tabla->porcentaje_empresa,
            'vigente_desde'       => $tabla->vigente_desde?->format('d/m/Y'),
            'vigente_hasta'       => $tabla->vigente_hasta
                ? $tabla->vigente_hasta->format('d/m/Y')
                : null,
        ];
    }
}
