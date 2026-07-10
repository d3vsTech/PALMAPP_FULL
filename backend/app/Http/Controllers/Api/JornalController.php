<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Jornal\StoreJornalRequest;
use App\Models\Jornal;
use App\Models\Labor;
use App\Models\Operacion;
use App\Models\Operario;
use App\Services\AuditoriaService;
use App\Services\JornalCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

            $terceroId = $data['tercero_id'] ?? null;
            $calc = $this->calcService->calcular($labor, $data, $terceroId);

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
                    'operario:id,nombres,apellidos',
                    'tercero:id,tipo_persona,razon_social,nombre_completo',
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

            $terceroId = $data['tercero_id'] ?? null;
            $calc = $this->calcService->calcular($labor, $data, $terceroId);

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

    public function bulkStore(Request $request, Operacion $operacion): JsonResponse
    {
        if ($operacion->isAprobada()) {
            return response()->json([
                'message' => 'No se pueden agregar jornales a una planilla aprobada',
                'code'    => 'OPERACION_APROBADA',
            ], 409);
        }

        $validated = $request->validate([
            'items'                   => 'required|array|min:1|max:200',
            'items.*.labor_id'        => 'required|exists:labores,id',
            'items.*.empleado_id'     => 'nullable|exists:empleados,id',
            'items.*.operario_id'     => 'nullable|exists:operarios,id',
            'items.*.lote_id'         => 'nullable|exists:lotes,id',
            'items.*.sublote_id'      => 'nullable|exists:sublotes,id',
            'items.*.cantidad_palmas' => 'nullable|integer|min:1',
            'items.*.insumo_id'       => 'nullable|exists:insumos,id',
            'items.*.gramos_por_palma'=> 'nullable|integer|min:1',
            'items.*.descripcion'     => 'nullable|string',
            'items.*.nombre_trabajo'  => 'nullable|string|max:255',
            'items.*.ubicacion'       => 'nullable|string|max:255',
            'items.*.observacion'     => 'nullable|string',
        ]);

        try {
            $created = DB::transaction(function () use ($validated, $operacion) {
                $results = [];
                foreach ($validated['items'] as $idx => $itemData) {
                    $tieneEmpleado = !empty($itemData['empleado_id']);
                    $tieneOperario = !empty($itemData['operario_id']);

                    if (!$tieneEmpleado && !$tieneOperario) {
                        throw new \InvalidArgumentException("items.{$idx}: debe proveer empleado_id o operario_id.");
                    }
                    if ($tieneEmpleado && $tieneOperario) {
                        throw new \InvalidArgumentException("items.{$idx}: solo puede proveer empleado_id o operario_id, no ambos.");
                    }

                    if ($tieneOperario) {
                        $operario = Operario::find($itemData['operario_id']);
                        if ($operario) {
                            $itemData['tercero_id'] = $operario->tercero_id;
                        }
                    }

                    $labor = Labor::findOrFail($itemData['labor_id']);

                    if ($labor->esCosecha()) {
                        throw new \InvalidArgumentException("items.{$idx}: la labor COSECHA se registra vía /cosechas/bulk.");
                    }

                    $itemData['categoria'] = $labor->categoria;
                    $itemData['tipo']      = $labor->tipo;

                    $terceroId = $itemData['tercero_id'] ?? null;
                    $calc = $this->calcService->calcular($labor, $itemData, $terceroId);

                    $jornal = Jornal::create(array_merge($itemData, [
                        'operacion_id'           => $operacion->id,
                        'valor_unitario'         => $calc['valor_unitario'],
                        'precio_insumo_snapshot' => $calc['precio_insumo_snapshot'],
                        'valor_total'            => $calc['valor_total'],
                        'estado'                 => true,
                    ]));

                    $results[] = ['id' => $jornal->id, 'sync_uuid' => $jornal->sync_uuid];
                }
                return $results;
            });

            return response()->json(['data' => $created], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error en bulk de jornales: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear jornales en bulk', 'error' => $e->getMessage()], 500);
        }
    }
}
