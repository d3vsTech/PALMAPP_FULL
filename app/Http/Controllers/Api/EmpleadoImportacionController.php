<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Empleado\ImportarEmpleadosRequest;
use App\Jobs\ProcesarImportacionEmpleadosJob;
use App\Models\ImportacionEmpleados;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmpleadoImportacionController extends Controller
{
    public function importar(ImportarEmpleadosRequest $request): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');
            $user     = $request->user();
            $file     = $request->file('archivo');

            $path = $file->storeAs(
                "tenants/{$tenantId}/importaciones/empleados",
                now()->format('Ymd_His') . '_' . Str::uuid() . '.' . $file->getClientOriginalExtension(),
                'local'
            );

            $importacion = ImportacionEmpleados::create([
                'user_id'                 => $user->id,
                'nombre_archivo_original' => $file->getClientOriginalName(),
                'archivo_path'            => $path,
                'estado'                  => ImportacionEmpleados::ESTADO_PENDIENTE,
            ]);

            ProcesarImportacionEmpleadosJob::dispatch(
                importacionId: $importacion->id,
                tenantId:      $tenantId,
                userId:        $user->id,
                userName:      $user->name,
                userEmail:     $user->email,
                userIp:        $request->ip() ?? '',
                userAgent:     $request->userAgent() ?? '',
            );

            return response()->json([
                'message' => 'Importación iniciada. Consulte el estado con el ID devuelto.',
                'data'    => [
                    'importacion_id' => $importacion->id,
                    'estado'         => $importacion->estado,
                ],
            ], 202);
        } catch (\Throwable $e) {
            Log::error('Error al iniciar importación masiva de colaboradores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al iniciar la importación', 'error' => $e->getMessage()], 500);
        }
    }

    public function estado(Request $request, ImportacionEmpleados $importacion): JsonResponse
    {
        try {
            return response()->json([
                'data' => [
                    'id'                      => $importacion->id,
                    'estado'                  => $importacion->estado,
                    'nombre_archivo_original' => $importacion->nombre_archivo_original,
                    'total_filas'             => $importacion->total_filas,
                    'filas_exitosas'          => $importacion->filas_exitosas,
                    'filas_fallidas'          => $importacion->filas_fallidas,
                    'error_fatal'             => $importacion->error_fatal,
                    'resultados'              => $importacion->resultados,
                    'iniciado_at'             => $importacion->iniciado_at,
                    'finalizado_at'           => $importacion->finalizado_at,
                    'created_at'              => $importacion->created_at,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al consultar estado de importación: ' . $e->getMessage());
            return response()->json(['message' => 'Error al consultar el estado de la importación', 'error' => $e->getMessage()], 500);
        }
    }
}
