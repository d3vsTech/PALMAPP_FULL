<?php

namespace App\Http\Controllers\Api;

use App\Constants\DocumentoCategoria;
use App\Http\Controllers\Controller;
use App\Http\Requests\Empleado\StoreEmpleadoAvatarRequest;
use App\Http\Requests\Empleado\StoreEmpleadoRequest;
use App\Http\Requests\Empleado\UpdateEmpleadoRequest;
use App\Models\Arl;
use App\Models\Departamento;
use App\Models\Empleado;
use App\Models\EntidadBancaria;
use App\Models\Eps;
use App\Models\FondoCesantias;
use App\Models\FondoPension;
use App\Models\Predio;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmpleadoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Listado liviano para dropdowns (select).
     * Sin paginación, solo columnas necesarias. Default: activos.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $empleados = Empleado::query()
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->when($request->modalidad_pago, fn($q, $m) => $q->where('modalidad_pago', $m))
                ->when($request->predio_id, fn($q, $p) => $q->where('predio_id', $p))
                ->orderBy('primer_nombre')
                ->orderBy('primer_apellido')
                ->get(['id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
                       'documento', 'modalidad_pago', 'estado']);

            return response()->json([
                'data' => $empleados->map(fn($e) => [
                    'id'              => $e->id,
                    'nombre_completo' => $e->nombre_completo,
                    'documento'       => $e->documento,
                    'modalidad_pago'  => $e->modalidad_pago,
                ])->values(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en colaboradores/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar colaboradores', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $incluirEliminados = filter_var($request->incluir_eliminados, FILTER_VALIDATE_BOOLEAN);
            $soloEliminados    = filter_var($request->solo_eliminados, FILTER_VALIDATE_BOOLEAN);

            $empleados = Empleado::query()
                ->when($incluirEliminados, fn($q) => $q->withTrashed())
                ->when($soloEliminados, fn($q) => $q->onlyTrashed())
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

    /**
     * Bundle para inicializar el wizard de edición de colaborador en una sola petición.
     * Reemplaza las 8 llamadas paralelas que hacía el frontend al montar el wizard.
     *
     * Modo edición: GET /colaboradores/{empleado}/wizard-init
     * Modo creación: GET /colaboradores/wizard-init (sin model binding)
     */
    public function wizardInit(Request $request, ?Empleado $empleado = null): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $colaborador = null;
            if ($empleado !== null && $empleado->exists) {
                $empleado->load('predio:id,nombre', 'contratoVigente');
                $colaborador = $empleado;
            }

            $parametricas = [
                'predios' => Cache::remember(
                    WizardCache::predios($tenantId) . ':wizard',
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Predio::query()
                        ->when($request->has('estado_predio'), fn ($q) => $q->where('estado', true))
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'estado']),
                ),

                'eps' => Cache::remember(
                    WizardCache::eps($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Eps::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
                ),

                'arl' => Cache::remember(
                    WizardCache::arl($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Arl::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
                ),

                'fondos_pension' => Cache::remember(
                    WizardCache::fondosPension($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => FondoPension::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
                ),

                'fondos_cesantias' => Cache::remember(
                    WizardCache::fondosCesantias($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => FondoCesantias::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
                ),

                'entidades_bancarias' => Cache::remember(
                    WizardCache::entidadesBancarias($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => EntidadBancaria::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
                ),

                'departamentos' => Cache::remember(
                    WizardCache::departamentos(),
                    WizardCache::TTL_UBICACIONES,
                    fn () => Departamento::orderBy('nombre')->get(['codigo', 'nombre']),
                ),

                'documento_categorias' => DocumentoCategoria::CATEGORIAS,
            ];

            return response()->json([
                'data' => [
                    'colaborador'  => $colaborador,
                    'parametricas' => $parametricas,
                ],
            ])->header('Cache-Control', 'private, max-age=0, must-revalidate');
        } catch (\Throwable $e) {
            Log::error('Error en wizard-init de colaborador: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al inicializar el wizard',
                'error'   => $e->getMessage(),
            ], 500);
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

            WizardCache::forgetOperacionesKey(WizardCache::operacionesColaboradores((int) app('current_tenant_id')));

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

                // Si cambia fecha_retiro (sin cambio de fecha_ingreso): actualizar contrato
                if ($fechaRetiroCambio && ! $fechaIngresoCambio) {
                    $contratoVigente = $empleado->contratoVigente;

                    if ($contratoVigente && $empleado->fecha_retiro) {
                        // Tenía contrato vigente → se establece fecha de retiro
                        $contratoVigente->update([
                            'fecha_terminacion' => $empleado->fecha_retiro,
                            'estado_contrato'   => 'TERMINADO',
                        ]);
                    } elseif (! $contratoVigente && $empleado->fecha_retiro) {
                        // Contrato ya era TERMINADO y se corrige la fecha de retiro
                        $empleado->contratos()->terminados()
                            ->latest('fecha_inicio')
                            ->first()
                            ?->update(['fecha_terminacion' => $empleado->fecha_retiro]);
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

            WizardCache::forgetOperacionesKey(WizardCache::operacionesColaboradores((int) app('current_tenant_id')));

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
            $nombreCompleto = $empleado->nombre_completo;
            $documento = $empleado->documento;

            $this->auditoria->registrarEliminacion(
                $request, 'COLABORADORES', $empleado,
                "Se eliminó el colaborador '{$nombreCompleto}' (Doc: {$documento})"
            );

            // Soft delete: preserva jornales, nómina, cosechas, contratos, documentos y archivos.
            $empleado->delete();

            WizardCache::forgetOperacionesKey(WizardCache::operacionesColaboradores((int) app('current_tenant_id')));

            return response()->json(['message' => "Colaborador '{$nombreCompleto}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el colaborador', 'error' => $e->getMessage()], 500);
        }
    }

    public function restaurar(Request $request, Empleado $empleado): JsonResponse
    {
        try {
            if (! $empleado->trashed()) {
                return response()->json([
                    'message' => 'El colaborador no está eliminado',
                    'code'    => 'EMPLEADO_NO_ELIMINADO',
                ], 409);
            }

            $duplicado = Empleado::where('documento', $empleado->documento)
                ->where('id', '!=', $empleado->id)
                ->exists();

            if ($duplicado) {
                return response()->json([
                    'message' => 'No se puede restaurar: ya existe un colaborador activo con este documento',
                    'code'    => 'DOCUMENTO_DUPLICADO',
                ], 409);
            }

            $empleado->restore();

            WizardCache::forgetOperacionesKey(WizardCache::operacionesColaboradores((int) app('current_tenant_id')));

            $this->auditoria->registrar(
                request: $request,
                accion: 'RESTAURAR',
                modulo: 'COLABORADORES',
                observaciones: "Se restauró el colaborador '{$empleado->nombre_completo}' (Doc: {$empleado->documento})",
                datosNuevos: $empleado->fresh()->toArray(),
            );

            return response()->json([
                'message' => "Colaborador '{$empleado->nombre_completo}' restaurado correctamente",
                'data'    => $empleado->fresh()->load('predio:id,nombre', 'contratoVigente'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al restaurar empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al restaurar el colaborador', 'error' => $e->getMessage()], 500);
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

            WizardCache::forgetOperacionesKey(WizardCache::operacionesColaboradores((int) app('current_tenant_id')));

            return response()->json([
                'message' => "Colaborador {$accion} correctamente",
                'data'    => $empleado,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al cambiar estado del empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cambiar el estado del colaborador', 'error' => $e->getMessage()], 500);
        }
    }

    public function uploadAvatar(StoreEmpleadoAvatarRequest $request, Empleado $empleado): JsonResponse
    {
        try {
            $datosAnteriores = ['avatar_path' => $empleado->avatar_path];
            $tenantId = app('current_tenant_id');

            if ($empleado->avatar_path) {
                Storage::disk('public')->delete($empleado->avatar_path);
            }

            $file = $request->file('avatar');
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs(
                "tenants/{$tenantId}/empleados/{$empleado->id}/avatar",
                $filename,
                'public'
            );

            $empleado->update(['avatar_path' => $path]);

            $this->auditoria->registrarEdicion(
                $request, 'COLABORADORES', $empleado, $datosAnteriores,
                "Se actualizó el avatar del colaborador '{$empleado->nombre_completo}'"
            );

            return response()->json([
                'message' => 'Avatar actualizado correctamente',
                'data'    => $empleado->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al subir avatar del empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al subir el avatar', 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteAvatar(Request $request, Empleado $empleado): JsonResponse
    {
        try {
            if (! $empleado->avatar_path) {
                return response()->json([
                    'message' => 'El colaborador no tiene avatar asignado',
                    'code'    => 'AVATAR_NOT_FOUND',
                ], 409);
            }

            $datosAnteriores = ['avatar_path' => $empleado->avatar_path];
            Storage::disk('public')->delete($empleado->avatar_path);
            $empleado->update(['avatar_path' => null]);

            $this->auditoria->registrarEdicion(
                $request, 'COLABORADORES', $empleado, $datosAnteriores,
                "Se eliminó el avatar del colaborador '{$empleado->nombre_completo}'"
            );

            return response()->json([
                'message' => 'Avatar eliminado correctamente',
                'data'    => $empleado->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar avatar del empleado: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el avatar', 'error' => $e->getMessage()], 500);
        }
    }
}
