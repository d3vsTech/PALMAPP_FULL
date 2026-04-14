<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Empleado\StoreEmpleadoRequest;
use App\Http\Requests\Empleado\UpdateEmpleadoRequest;
use App\Models\Empleado;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EmpleadoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $empleados = Empleado::query()
                ->with('predio:id,nombre')
                ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                    $q->where('primer_nombre', 'ilike', "%{$s}%")
                      ->orWhere('segundo_nombre', 'ilike', "%{$s}%")
                      ->orWhere('primer_apellido', 'ilike', "%{$s}%")
                      ->orWhere('segundo_apellido', 'ilike', "%{$s}%")
                      ->orWhere('documento', 'ilike', "%{$s}%");
                }))
                ->when($request->cargo, fn($q, $v) => $q->where('cargo', 'ilike', "%{$v}%"))
                ->when($request->modalidad_pago, fn($q, $t) => $q->where('modalidad_pago', $t))
                ->when($request->predio_id, fn($q, $v) => $q->where('predio_id', $v))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('primer_apellido')
                ->orderBy('primer_nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $empleados->items(),
                'meta' => [
                    'current_page' => $empleados->currentPage(),
                    'last_page'    => $empleados->lastPage(),
                    'per_page'     => $empleados->perPage(),
                    'total'        => $empleados->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar empleados: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los empleados', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Empleado $empleado): JsonResponse
    {
        try {
            $empleado->load(
                'predio:id,nombre',
                'contratoVigente',
            );

            return response()->json(['data' => $empleado]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el empleado', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreEmpleadoRequest $request): JsonResponse
    {
        try {
            $empleado = DB::transaction(function () use ($request) {
                $empleado = Empleado::create($request->validated());

                // Crear contrato VIGENTE automáticamente
                $empleado->contratos()->create([
                    'fecha_inicio'    => $empleado->fecha_ingreso,
                    'fecha_terminacion' => $empleado->fecha_retiro,
                    'salario'         => $empleado->salario_base,
                    'estado_contrato' => $empleado->fecha_retiro ? 'TERMINADO' : 'VIGENTE',
                ]);

                return $empleado;
            });

            $this->auditoria->registrarCreacion(
                $request, 'COLABORADORES', $empleado,
                "Se creó el colaborador '{$empleado->nombre_completo}' (Doc: {$empleado->documento})"
            );

            return response()->json([
                'message' => 'Colaborador creado correctamente',
                'data'    => $empleado->load('predio:id,nombre', 'contratoVigente'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el colaborador', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateEmpleadoRequest $request, Empleado $empleado): JsonResponse
    {
        try {
            $datosAnteriores = $empleado->toArray();
            $fechaIngresoAnterior = $empleado->fecha_ingreso?->toDateString();
            $fechaRetiroAnterior = $empleado->fecha_retiro?->toDateString();

            DB::transaction(function () use ($request, $empleado, $fechaIngresoAnterior, $fechaRetiroAnterior) {
                $empleado->update($request->validated());

                $fechaIngresoCambio = $request->has('fecha_ingreso')
                    && $empleado->fecha_ingreso?->toDateString() !== $fechaIngresoAnterior;

                $fechaRetiroCambio = $request->has('fecha_retiro')
                    && $empleado->fecha_retiro?->toDateString() !== $fechaRetiroAnterior;

                // Si cambia fecha_ingreso: terminar contrato vigente anterior y crear uno nuevo
                if ($fechaIngresoCambio) {
                    $empleado->contratos()->vigentes()->update([
                        'fecha_terminacion' => $fechaIngresoAnterior ? now() : null,
                        'estado_contrato'   => 'TERMINADO',
                    ]);

                    $empleado->contratos()->create([
                        'fecha_inicio'    => $empleado->fecha_ingreso,
                        'fecha_terminacion' => $empleado->fecha_retiro,
                        'salario'         => $empleado->salario_base,
                        'estado_contrato' => $empleado->fecha_retiro ? 'TERMINADO' : 'VIGENTE',
                    ]);
                }

                // Si cambia fecha_retiro (sin cambio de fecha_ingreso): actualizar contrato vigente
                if ($fechaRetiroCambio && ! $fechaIngresoCambio) {
                    $contratoVigente = $empleado->contratoVigente;

                    if ($contratoVigente && $empleado->fecha_retiro) {
                        $contratoVigente->update([
                            'fecha_terminacion' => $empleado->fecha_retiro,
                            'estado_contrato'   => 'TERMINADO',
                        ]);
                    } elseif (! $contratoVigente && ! $empleado->fecha_retiro) {
                        // Se quitó fecha_retiro (reingreso): crear nuevo contrato vigente
                        $empleado->contratos()->create([
                            'fecha_inicio'    => $empleado->fecha_ingreso,
                            'salario'         => $empleado->salario_base,
                            'estado_contrato' => 'VIGENTE',
                        ]);
                    }
                }
            });

            $this->auditoria->registrarEdicion(
                $request, 'COLABORADORES', $empleado, $datosAnteriores,
                "Se editó el colaborador '{$empleado->nombre_completo}'"
            );

            return response()->json([
                'message' => 'Colaborador actualizado correctamente',
                'data'    => $empleado->fresh()->load('predio:id,nombre', 'contratoVigente'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el colaborador', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Empleado $empleado): JsonResponse
    {
        try {
            if ($empleado->jornales()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el colaborador porque tiene jornales registrados',
                    'code'    => 'EMPLEADO_CON_JORNALES',
                ], 409);
            }

            if ($empleado->nominaEmpleados()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el colaborador porque tiene registros de nómina',
                    'code'    => 'EMPLEADO_CON_NOMINA',
                ], 409);
            }

            $nombreCompleto = $empleado->nombre_completo;

            $this->auditoria->registrarEliminacion(
                $request, 'COLABORADORES', $empleado,
                "Se eliminó el colaborador '{$nombreCompleto}' (Doc: {$empleado->documento})"
            );

            // Eliminar archivos físicos de documentos del disco
            foreach ($empleado->documentos as $doc) {
                Storage::disk('local')->delete($doc->archivo_path);
            }

            $tenantId = app('current_tenant_id');
            Storage::disk('local')->deleteDirectory("tenants/{$tenantId}/empleados/{$empleado->id}");

            $empleado->contratos()->delete();
            $empleado->documentos()->delete();
            $empleado->delete();

            return response()->json(['message' => "Colaborador '{$nombreCompleto}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el colaborador', 'error' => $e->getMessage()], 500);
        }
    }

    public function toggle(Request $request, Empleado $empleado): JsonResponse
    {
        try {
            $datosAnteriores = $empleado->toArray();
            $empleado->update(['estado' => ! $empleado->estado]);

            $accion = $empleado->estado ? 'activó' : 'desactivó';
            $this->auditoria->registrarEdicion(
                $request, 'COLABORADORES', $empleado, $datosAnteriores,
                "Se {$accion} el colaborador '{$empleado->nombre_completo}'"
            );

            return response()->json([
                'message' => "Colaborador {$accion} correctamente",
                'data'    => $empleado,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al cambiar estado del empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cambiar el estado del colaborador', 'error' => $e->getMessage()], 500);
        }
    }
}
