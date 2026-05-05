<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ausencia\RechazarAusenciaRequest;
use App\Http\Requests\Ausencia\StoreAusenciaRequest;
use App\Http\Requests\Ausencia\SubirDocumentoAusenciaRequest;
use App\Http\Requests\Ausencia\UpdateAusenciaRequest;
use App\Models\Ausencia;
use App\Models\Operacion;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AusenciaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function store(StoreAusenciaRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden agregar ausencias a una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $data = $request->validated();

            if (!empty($data['fecha_fin'])
                && strtotime($data['fecha_fin']) < strtotime($operacion->fecha->format('Y-m-d'))
            ) {
                return response()->json([
                    'message' => 'fecha_fin no puede ser anterior a la fecha de la operación',
                    'errors'  => ['fecha_fin' => ['Debe ser igual o posterior a la fecha de la operación.']],
                ], 422);
            }

            $ausencia = Ausencia::create(array_merge($data, [
                'operacion_id' => $operacion->id,
                'estado'       => Ausencia::ESTADO_PENDIENTE,
                'creado_por'   => $request->user()?->id,
            ]));

            $this->auditoria->registrarCreacion(
                $request, 'AUSENCIAS', $ausencia,
                "Se registró ausencia de empleado #{$ausencia->empleado_id} (motivo #{$ausencia->motivo_ausencia_id}) en planilla {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Ausencia registrada correctamente',
                'data'    => $ausencia->load('empleado:id,primer_nombre,primer_apellido', 'motivoAusencia:id,nombre,tipo_base'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateAusenciaRequest $request, Ausencia $ausencia): JsonResponse
    {
        try {
            $ausencia->load('operacion');

            if ($ausencia->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden editar ausencias de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($ausencia->isLiquidada()) {
                return response()->json([
                    'message' => 'No se puede editar una ausencia ya liquidada en nómina',
                    'code'    => 'AUSENCIA_LIQUIDADA',
                ], 409);
            }

            $datosAnteriores = $ausencia->toArray();
            $ausencia->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'AUSENCIAS', $ausencia, $datosAnteriores,
                "Se editó ausencia #{$ausencia->id}",
            );

            return response()->json([
                'message' => 'Ausencia actualizada correctamente',
                'data'    => $ausencia->fresh()->load('empleado:id,primer_nombre,primer_apellido', 'motivoAusencia:id,nombre,tipo_base'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Ausencia $ausencia): JsonResponse
    {
        try {
            $ausencia->load('operacion');

            if ($ausencia->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar ausencias de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($ausencia->isLiquidada()) {
                return response()->json([
                    'message' => 'No se puede eliminar una ausencia ya liquidada en nómina',
                    'code'    => 'AUSENCIA_LIQUIDADA',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'AUSENCIAS', $ausencia,
                "Se eliminó ausencia #{$ausencia->id}",
            );

            if ($ausencia->documento_soporte && Storage::disk('local')->exists($ausencia->documento_soporte)) {
                Storage::disk('local')->delete($ausencia->documento_soporte);
            }

            $ausencia->delete();

            return response()->json(['message' => 'Ausencia eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function aprobar(Request $request, Ausencia $ausencia): JsonResponse
    {
        try {
            if ($ausencia->estado !== Ausencia::ESTADO_PENDIENTE) {
                return response()->json([
                    'message' => "Solo se pueden aprobar ausencias en estado PENDIENTE (estado actual: {$ausencia->estado})",
                    'code'    => 'AUSENCIA_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $ausencia->toArray();
            $ausencia->update([
                'estado'       => Ausencia::ESTADO_APROBADA,
                'aprobado_por' => $request->user()?->id,
                'aprobado_at'  => now(),
            ]);

            $this->auditoria->registrarEdicion(
                $request, 'AUSENCIAS', $ausencia, $datosAnteriores,
                "Se aprobó ausencia #{$ausencia->id}",
            );

            return response()->json([
                'message' => 'Ausencia aprobada correctamente',
                'data'    => $ausencia->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al aprobar ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al aprobar la ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function rechazar(RechazarAusenciaRequest $request, Ausencia $ausencia): JsonResponse
    {
        try {
            if ($ausencia->estado !== Ausencia::ESTADO_PENDIENTE) {
                return response()->json([
                    'message' => "Solo se pueden rechazar ausencias en estado PENDIENTE (estado actual: {$ausencia->estado})",
                    'code'    => 'AUSENCIA_ESTADO_INVALIDO',
                ], 409);
            }

            $datosAnteriores = $ausencia->toArray();
            $ausencia->update([
                'estado'         => Ausencia::ESTADO_RECHAZADA,
                'motivo_rechazo' => $request->validated('motivo_rechazo'),
                'aprobado_por'   => $request->user()?->id,
                'aprobado_at'    => now(),
            ]);

            $this->auditoria->registrarEdicion(
                $request, 'AUSENCIAS', $ausencia, $datosAnteriores,
                "Se rechazó ausencia #{$ausencia->id}",
            );

            return response()->json([
                'message' => 'Ausencia rechazada correctamente',
                'data'    => $ausencia->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al rechazar ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al rechazar la ausencia', 'error' => $e->getMessage()], 500);
        }
    }

    public function subirDocumento(SubirDocumentoAusenciaRequest $request, Ausencia $ausencia): JsonResponse
    {
        try {
            if ($ausencia->isLiquidada()) {
                return response()->json([
                    'message' => 'No se puede modificar el soporte de una ausencia liquidada',
                    'code'    => 'AUSENCIA_LIQUIDADA',
                ], 409);
            }

            $tenantId = app('current_tenant_id');
            $file     = $request->file('documento');
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path     = "tenants/{$tenantId}/ausencias/{$ausencia->id}";

            if ($ausencia->documento_soporte && Storage::disk('local')->exists($ausencia->documento_soporte)) {
                Storage::disk('local')->delete($ausencia->documento_soporte);
            }

            $storedPath = $file->storeAs($path, $filename, 'local');

            $datosAnteriores = $ausencia->toArray();
            $ausencia->update(['documento_soporte' => $storedPath]);

            $this->auditoria->registrarEdicion(
                $request, 'AUSENCIAS', $ausencia, $datosAnteriores,
                "Se subió documento soporte a ausencia #{$ausencia->id}",
            );

            return response()->json([
                'message' => 'Documento soporte cargado correctamente',
                'data'    => $ausencia->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al subir documento de ausencia: ' . $e->getMessage());
            return response()->json(['message' => 'Error al subir el documento', 'error' => $e->getMessage()], 500);
        }
    }
}
