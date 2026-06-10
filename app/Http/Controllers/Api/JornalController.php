<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Jornal\StoreJornalRequest;
use App\Models\Jornal;
use App\Models\Labor;
use App\Models\Operacion;
use App\Services\AuditoriaService;
use App\Services\JornalCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JornalController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected JornalCalculationService $calcService,
    ) {}

    public function store(StoreJornalRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden agregar jornales a una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $data  = $request->validated();
            $labor = $request->getLabor() ?? Labor::findOrFail($data['labor_id']);

            $calc = $this->calcService->calcular($labor, $data);

            $jornal = Jornal::create(array_merge($data, [
                'operacion_id'           => $operacion->id,
                'valor_unitario'         => $calc['valor_unitario'],
                'precio_insumo_snapshot' => $calc['precio_insumo_snapshot'],
                'valor_total'            => $calc['valor_total'],
                'estado'                 => true,
            ]));

            $etiqueta = $jornal->isPalma()
                ? ($labor->tipo ?? 'OTROS')
                : 'FINCA';

            $this->auditoria->registrarCreacion(
                $request, 'JORNALES', $jornal,
                "Se creó jornal {$jornal->categoria}/{$etiqueta} ({$labor->nombre}) en planilla {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Jornal creado correctamente',
                'data'    => $jornal->load(
                    'empleado:id,primer_nombre,primer_apellido',
                    'labor:id,nombre,categoria,tipo,tipo_pago,precio_palma',
                    'lote:id,nombre',
                    'sublote:id,nombre',
                    'insumo:id,nombre',
                ),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear jornal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el jornal', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(StoreJornalRequest $request, Jornal $jornal): JsonResponse
    {
        try {
            $jornal->load('operacion');

            if ($jornal->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden editar jornales de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $data            = $request->validated();
            $labor           = $request->getLabor() ?? Labor::findOrFail($data['labor_id']);
            $datosAnteriores = $jornal->toArray();

            $calc = $this->calcService->calcular($labor, $data);

            $jornal->update(array_merge($data, [
                'valor_unitario'         => $calc['valor_unitario'],
                'precio_insumo_snapshot' => $calc['precio_insumo_snapshot'],
                'valor_total'            => $calc['valor_total'],
            ]));

            $this->auditoria->registrarEdicion(
                $request, 'JORNALES', $jornal, $datosAnteriores,
                "Se editó jornal #{$jornal->id}",
            );

            return response()->json([
                'message' => 'Jornal actualizado correctamente',
                'data'    => $jornal->fresh()->load(
                    'empleado:id,primer_nombre,primer_apellido',
                    'labor:id,nombre,categoria,tipo,tipo_pago,precio_palma',
                ),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar jornal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el jornal', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Jornal $jornal): JsonResponse
    {
        try {
            $jornal->load('operacion');

            if ($jornal->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar jornales de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'JORNALES', $jornal,
                "Se eliminó jornal #{$jornal->id}",
            );

            $jornal->delete();

            return response()->json(['message' => 'Jornal eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar jornal: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el jornal', 'error' => $e->getMessage()], 500);
        }
    }
}
