<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\AgregarEmpleadosNominaRequest;
use App\Http\Requests\Nomina\LiquidarEmpleadoRequest;
use App\Models\Empleado;
use App\Models\Nomina;
use App\Models\NominaEmpleado;
use App\Services\AuditoriaService;
use App\Services\Nomina\AgrupadorJornalesService;
use App\Services\Nomina\DesprendibleService;
use App\Services\Nomina\NominaCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class NominaEmpleadoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected NominaCalculationService $calc,
        protected AgrupadorJornalesService $agrupador,
        protected DesprendibleService $desprendible,
    ) {}

    /**
     * Empleados activos del tenant que NO están aún en esta nómina.
     */
    public function empleadosDisponibles(Nomina $nomina): JsonResponse
    {
        $idsIncluidos = NominaEmpleado::where('nomina_id', $nomina->id)->pluck('empleado_id');

        $empleados = Empleado::activos()
            ->whereNotIn('id', $idsIncluidos)
            ->with('predio:id,nombre')
            ->orderBy('primer_apellido')
            ->orderBy('primer_nombre')
            ->get([
                'id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
                'documento', 'cargo', 'modalidad_pago', 'salario_base', 'predio_id',
            ]);

        return response()->json([
            'data' => $empleados->map(fn($e) => [
                'id'              => $e->id,
                'nombre_completo' => $e->nombre_completo,
                'documento'       => $e->documento,
                'cargo'           => $e->cargo,
                'modalidad_pago'  => $e->modalidad_pago,
                'salario_base'    => (float) $e->salario_base,
                'predio'          => $e->predio?->only(['id', 'nombre']),
            ]),
        ]);
    }

    /**
     * Agrega uno o varios empleados a la nómina (estado PENDIENTE).
     */
    public function agregar(AgregarEmpleadosNominaRequest $request, Nomina $nomina): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se pueden agregar empleados a una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $ids = $request->validated()['empleado_ids'];
            $empleados = Empleado::activos()->whereIn('id', $ids)->get();
            $tenantId  = (int) $request->header('X-Tenant-Id');
            $creados   = [];

            foreach ($empleados as $emp) {
                $existente = NominaEmpleado::where('nomina_id', $nomina->id)
                    ->where('empleado_id', $emp->id)
                    ->first();
                if ($existente) {
                    continue;
                }

                $salarioTipo = $emp->modalidad_pago === 'PRODUCCION'
                    ? NominaEmpleado::SALARIO_VARIABLE
                    : NominaEmpleado::SALARIO_FIJO;

                $creados[] = NominaEmpleado::create([
                    'tenant_id'    => $tenantId,
                    'nomina_id'    => $nomina->id,
                    'empleado_id'  => $emp->id,
                    'salario_tipo' => $salarioTipo,
                    'salario_base' => $emp->salario_base ?? 0,
                    'estado'       => NominaEmpleado::ESTADO_PENDIENTE,
                ]);
            }

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $nomina,
                'Se agregaron ' . count($creados) . " empleado(s) a nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => count($creados) . ' empleado(s) agregado(s) a la nómina',
                'data'    => $creados,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al agregar empleados a nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al agregar empleados', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Saca un empleado de la nómina (solo si PENDIENTE y nómina BORRADOR).
     */
    public function eliminar(Request $request, NominaEmpleado $nominaEmpleado): JsonResponse
    {
        try {
            if ($nominaEmpleado->nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar empleados de una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }
            if ($nominaEmpleado->isLiquidado()) {
                return response()->json([
                    'message' => 'No se puede eliminar un empleado ya liquidado',
                    'code'    => 'EMPLEADO_LIQUIDADO',
                ], 409);
            }

            $datosAnteriores = $nominaEmpleado->toArray();
            $nominaEmpleado->delete();

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nominaEmpleado, $datosAnteriores,
                "Se quitó empleado #{$nominaEmpleado->empleado_id} de nómina #{$nominaEmpleado->nomina_id}",
            );

            return response()->json(['message' => 'Empleado quitado de la nómina']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar empleado de nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Preview del cálculo (sin persistir). Lo usa el editor al abrirse.
     */
    public function preview(NominaEmpleado $nominaEmpleado): JsonResponse
    {
        try {
            $nominaEmpleado->load(['empleado.predio', 'nomina']);
            $preview = $this->calc->previewLiquidacion($nominaEmpleado);

            return response()->json([
                'data' => array_merge($preview, [
                    'empleado' => [
                        'id'              => $nominaEmpleado->empleado->id,
                        'nombre_completo' => $nominaEmpleado->empleado->nombre_completo,
                        'documento'       => $nominaEmpleado->empleado->documento,
                        'cargo'           => $nominaEmpleado->empleado->cargo,
                        'salario_tipo'    => $nominaEmpleado->salario_tipo,
                        'predio'          => $nominaEmpleado->empleado->predio?->only(['id', 'nombre']),
                    ],
                ]),
            ]);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error en preview: ' . $e->getMessage());
            return response()->json(['message' => 'Error al calcular preview', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Resumen de trabajo agrupado por categoría/tipo (solo VARIABLE).
     */
    public function resumenTrabajo(NominaEmpleado $nominaEmpleado): JsonResponse
    {
        if (! $nominaEmpleado->isVariable()) {
            return response()->json([
                'message' => 'Resumen de trabajo solo aplica a empleados con modalidad VARIABLE',
                'code'    => 'EMPLEADO_NO_VARIABLE',
            ], 422);
        }

        $nominaEmpleado->loadMissing('nomina');
        $resumen = $this->agrupador->paraEmpleadoEnRango(
            $nominaEmpleado->empleado_id,
            $nominaEmpleado->nomina->fecha_inicio,
            $nominaEmpleado->nomina->fecha_fin
        );

        return response()->json(['data' => $resumen]);
    }

    /**
     * Confirma y guarda la liquidación.
     */
    public function liquidar(LiquidarEmpleadoRequest $request, NominaEmpleado $nominaEmpleado): JsonResponse
    {
        try {
            if ($nominaEmpleado->nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede liquidar en una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $resultado = $this->calc->liquidar(
                $nominaEmpleado,
                $request->validated(),
                $request->user()->id
            );

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $resultado, ['estado' => NominaEmpleado::ESTADO_PENDIENTE],
                "Se liquidó empleado #{$resultado->empleado_id} en nómina #{$resultado->nomina_id} — neto: {$resultado->total_neto}",
            );

            return response()->json([
                'message' => 'Empleado liquidado correctamente',
                'data'    => $resultado,
            ]);
        } catch (\DomainException $e) {
            $code = str_contains($e->getMessage(), 'NOMINA_CERRADA') ? 'NOMINA_CERRADA' : 'CALC_ERROR';
            return response()->json(['message' => $e->getMessage(), 'code' => $code], 409);
        } catch (\Throwable $e) {
            Log::error('Error al liquidar empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al liquidar', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Datos del desprendible (JSON).
     */
    public function desprendible(NominaEmpleado $nominaEmpleado): JsonResponse
    {
        if (! $nominaEmpleado->isLiquidado()) {
            return response()->json([
                'message' => 'El empleado aún no ha sido liquidado',
                'code'    => 'EMPLEADO_NO_LIQUIDADO',
            ], 409);
        }

        return response()->json(['data' => $this->desprendible->data($nominaEmpleado)]);
    }

    /**
     * PDF descargable del desprendible.
     */
    public function desprendiblePdf(NominaEmpleado $nominaEmpleado): Response
    {
        if (! $nominaEmpleado->isLiquidado()) {
            return response()->json([
                'message' => 'El empleado aún no ha sido liquidado',
                'code'    => 'EMPLEADO_NO_LIQUIDADO',
            ], 409);
        }

        return $this->desprendible->pdf($nominaEmpleado);
    }

    /**
     * Genera URL firmada del PDF para envío manual por WhatsApp
     * (placeholder de la integración real con WhatsApp Business API).
     */
    public function desprendibleWhatsapp(NominaEmpleado $nominaEmpleado): JsonResponse
    {
        if (! $nominaEmpleado->isLiquidado()) {
            return response()->json([
                'message' => 'El empleado aún no ha sido liquidado',
                'code'    => 'EMPLEADO_NO_LIQUIDADO',
            ], 409);
        }

        $info = $this->desprendible->whatsapp($nominaEmpleado);

        return response()->json([
            'message' => 'URL del desprendible generada. Abre wa.me con el texto que contenga la URL.',
            'data'    => $info,
        ]);
    }
}
