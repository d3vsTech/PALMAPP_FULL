<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\NominaConcepto\StoreNominaConceptoRequest;
use App\Http\Requests\NominaConcepto\UpdateNominaConceptoRequest;
use App\Models\NominaConcepto;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

        $conceptos = $query->get([
            'id', 'codigo', 'nombre', 'tipo', 'subtipo', 'operacion', 'calculo', 'aplica_a',
            'porcentaje_empleado', 'porcentaje_empresa',
        ]);

        return response()->json(['data' => $conceptos]);
    }

    public function store(StoreNominaConceptoRequest $request): JsonResponse
    {
        $tenantId = (int) $request->header('X-Tenant-Id');
        $data = $request->validated();

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

    public function update(UpdateNominaConceptoRequest $request, NominaConcepto $nominaConcepto): JsonResponse
    {
        $data = $request->validated();

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
        $enUso = \DB::table('nomina_empleado_concepto')->where('concepto_id', $nominaConcepto->id)->exists();

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
