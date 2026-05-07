<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Models\NominaConcepto;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * CRUD del catálogo paramétrico de conceptos de nómina.
 *
 * El editor de liquidación usa /select para listar las deducciones voluntarias
 * y bonificaciones disponibles que el operador puede aplicar manualmente.
 */
class NominaConceptoController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function index(Request $request): JsonResponse
    {
        $query = NominaConcepto::query()->orderBy('tipo')->orderBy('nombre');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }
        if ($request->boolean('activo', null) !== null) {
            $query->where('activo', $request->boolean('activo'));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * Lista liviana para dropdowns del editor de liquidación.
     * Filtra por tipo (DEDUCCION_VOLUNTARIA o BONIFICACION_*) y modalidad.
     */
    public function select(Request $request): JsonResponse
    {
        $query = NominaConcepto::query()
            ->where('activo', true)
            ->orderBy('nombre');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        if ($request->filled('aplica_a')) {
            $query->whereIn('aplica_a', [$request->input('aplica_a'), 'AMBOS']);
        }

        $conceptos = $query->get(['id', 'codigo', 'nombre', 'tipo', 'subtipo', 'operacion', 'calculo', 'aplica_a']);

        return response()->json(['data' => $conceptos]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->can('nomina-conceptos.gestionar')) {
            return response()->json(['message' => 'Sin permisos', 'code' => 'PERMISSION_DENIED'], 403);
        }

        $tenantId = (int) $request->header('X-Tenant-Id');

        $data = $request->validate([
            'codigo'           => ['required', 'string', 'max:20', Rule::unique('nomina_concepto', 'codigo')->where('tenant_id', $tenantId)],
            'nombre'           => ['required', 'string', 'max:100'],
            'tipo'             => ['required', 'in:DEDUCCION_LEGAL,DEDUCCION_VOLUNTARIA,BONIFICACION_FIJA,BONIFICACION_VARIABLE'],
            'subtipo'          => ['required', 'in:SALUD,PENSION,ARL,FONDO_SOLIDARIDAD,LIBRANZA,EMBARGO,PRESTAMO,AHORRO_VOLUNTARIO,PRODUCTIVIDAD,TRANSPORTE,ALIMENTACION,ANTIGUEDAD,OTRO'],
            'operacion'        => ['required', 'in:SUMA,RESTA'],
            'calculo'          => ['required', 'in:PORCENTAJE,VALOR_FIJO,FORMULA'],
            'valor_referencia' => ['nullable', 'numeric'],
            'base_calculo'     => ['required', 'in:SALARIO_BASE,TOTAL_DEVENGADO,SALARIO_MINIMO,MANUAL'],
            'aplica_a'         => ['required', 'in:FIJO,VARIABLE,AMBOS'],
            'es_obligatorio'   => ['boolean'],
            'activo'           => ['boolean'],
        ]);

        try {
            $concepto = NominaConcepto::create(array_merge($data, ['tenant_id' => $tenantId]));

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $concepto,
                "Se creó concepto de nómina '{$concepto->codigo}'",
            );

            return response()->json(['message' => 'Concepto creado', 'data' => $concepto], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear concepto: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear concepto', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, NominaConcepto $nominaConcepto): JsonResponse
    {
        if (! $request->user()?->can('nomina-conceptos.gestionar')) {
            return response()->json(['message' => 'Sin permisos', 'code' => 'PERMISSION_DENIED'], 403);
        }

        $data = $request->validate([
            'nombre'           => ['sometimes', 'string', 'max:100'],
            'valor_referencia' => ['sometimes', 'nullable', 'numeric'],
            'base_calculo'     => ['sometimes', 'in:SALARIO_BASE,TOTAL_DEVENGADO,SALARIO_MINIMO,MANUAL'],
            'aplica_a'         => ['sometimes', 'in:FIJO,VARIABLE,AMBOS'],
            'es_obligatorio'   => ['sometimes', 'boolean'],
            'activo'           => ['sometimes', 'boolean'],
        ]);

        try {
            $datosAnteriores = $nominaConcepto->toArray();
            $nominaConcepto->update($data);

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $nominaConcepto, $datosAnteriores,
                "Se editó concepto '{$nominaConcepto->codigo}'",
            );

            return response()->json(['message' => 'Concepto actualizado', 'data' => $nominaConcepto->fresh()]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar concepto: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, NominaConcepto $nominaConcepto): JsonResponse
    {
        if (! $request->user()?->can('nomina-conceptos.gestionar')) {
            return response()->json(['message' => 'Sin permisos', 'code' => 'PERMISSION_DENIED'], 403);
        }

        // Bloquea si está en uso
        $enUso = $nominaConcepto->tablaLegal()->exists()
            || \DB::table('nomina_empleado_concepto')->where('concepto_id', $nominaConcepto->id)->exists();

        if ($enUso) {
            return response()->json([
                'message' => 'No se puede eliminar el concepto: está en uso en nóminas existentes',
                'code'    => 'CONCEPTO_EN_USO',
            ], 409);
        }

        if ($nominaConcepto->es_obligatorio) {
            return response()->json([
                'message' => 'No se puede eliminar un concepto legal obligatorio',
                'code'    => 'CONCEPTO_OBLIGATORIO',
            ], 409);
        }

        try {
            $datosAnteriores = $nominaConcepto->toArray();
            $nominaConcepto->delete();

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nominaConcepto, $datosAnteriores,
                "Se eliminó concepto '{$datosAnteriores['codigo']}'",
            );

            return response()->json(['message' => 'Concepto eliminado']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar concepto: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar', 'error' => $e->getMessage()], 500);
        }
    }
}
