<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\AgregarEmpleadosNominaRequest;
use App\Http\Requests\Nomina\AgregarTercerosNominaRequest;
use App\Http\Requests\Nomina\LiquidarEmpleadoRequest;
use App\Models\CosechaCuadrilla;
use App\Models\Empleado;
use App\Models\Nomina;
use App\Models\NominaEmpleado;
use App\Models\NominaPromedioLote;
use App\Models\NominaTercero;
use App\Models\NominaTerceroOperario;
use App\Models\NominaValidacionCosecha;
use App\Models\Operacion;
use App\Models\Operario;
use App\Models\Tercero;
use App\Services\AuditoriaService;
use App\Services\Nomina\AgrupadorJornalesService;
use App\Services\Nomina\DesprendibleService;
use App\Services\Nomina\HidratarActaTerceroService;
use App\Services\Nomina\NominaCalculationService;
use App\Services\Nomina\PrestamoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class NominaEmpleadoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected NominaCalculationService $calc,
        protected AgrupadorJornalesService $agrupador,
        protected DesprendibleService $desprendible,
        protected HidratarActaTerceroService $hidratarActa,
        protected PrestamoService $prestamos,
    ) {}

    /**
     * Colaboradores disponibles para agregar a la nómina.
     * Devuelve dos bloques: empleados propios y operarios de terceros.
     */
    public function empleadosDisponibles(Nomina $nomina): JsonResponse
    {
        $empleadoIdsIncluidos = NominaEmpleado::where('nomina_id', $nomina->id)
            ->whereNotNull('empleado_id')
            ->pluck('empleado_id');

        $operarioIdsIncluidos = NominaEmpleado::where('nomina_id', $nomina->id)
            ->whereNotNull('operario_id')
            ->pluck('operario_id');

        $empleados = Empleado::activos()
            ->whereNotIn('id', $empleadoIdsIncluidos)
            ->with('predio:id,nombre')
            ->orderBy('primer_apellido')
            ->orderBy('primer_nombre')
            ->get([
                'id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
                'documento', 'cargo', 'modalidad_pago', 'salario_base', 'predio_id',
            ]);

        $operarios = Operario::where('estado', true)
            ->whereNotIn('id', $operarioIdsIncluidos)
            ->with('tercero:id,razon_social,nombre_completo,tipo_persona')
            ->orderBy('apellidos')
            ->orderBy('nombres')
            ->get(['id', 'tercero_id', 'nombres', 'apellidos', 'cedula', 'cargo']);

        return response()->json([
            'data' => [
                'empleados' => $empleados->map(fn($e) => [
                    'id'              => $e->id,
                    'nombre_completo' => $e->nombre_completo,
                    'documento'       => $e->documento,
                    'cargo'           => $e->cargo,
                    'modalidad_pago'  => $e->modalidad_pago,
                    'salario_base'    => (float) $e->salario_base,
                    'predio'          => $e->predio?->only(['id', 'nombre']),
                ]),
                'operarios' => $operarios->map(fn($op) => [
                    'id'              => $op->id,
                    'nombre_completo' => trim($op->nombres . ' ' . $op->apellidos),
                    'cedula'          => $op->cedula,
                    'cargo'           => $op->cargo,
                    'tercero'         => [
                        'id'          => $op->tercero->id,
                        'razon_social'=> $op->tercero->razon_social ?? $op->tercero->nombre_completo,
                    ],
                ]),
            ],
        ]);
    }

    /**
     * Agrega empleados y/u operarios a la nómina (estado PENDIENTE). Idempotente.
     */
    public function agregar(AgregarEmpleadosNominaRequest $request, Nomina $nomina): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se pueden agregar colaboradores a una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $validated = $request->validated();
            $tenantId  = (int) $request->header('X-Tenant-Id');

            $creados = DB::transaction(function () use ($validated, $nomina, $tenantId) {
                $filas = [];
                $filas = array_merge($filas, $this->insertarEmpleados($validated['empleado_ids'] ?? [], $nomina, $tenantId));
                $filas = array_merge($filas, $this->insertarOperarios($validated['operario_ids'] ?? [], $nomina, $tenantId));
                return $filas;
            });

            $empCount = collect($creados)->whereNotNull('empleado_id')->count();
            $opCount  = collect($creados)->whereNotNull('operario_id')->count();

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $nomina,
                "Se agregaron {$empCount} empleado(s) y {$opCount} operario(s) a nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => "{$empCount} empleado(s) y {$opCount} operario(s) agregado(s) a la nómina",
                'data'    => $creados,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al agregar colaboradores a nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al agregar colaboradores', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Alias del endpoint `agregar()` centrado en operarios/terceros.
     * Acepta `operario_ids[]`, `tercero_ids[]` (expande a operarios activos), o
     * `terceros[]` (anidado con XOR de pertenencia validado en el FormRequest).
     *
     * Además de crear filas en `nomina_empleado`, pre-hidrata `nomina_tercero`
     * y `nomina_tercero_operario` con totales en 0. La liquidación real del
     * acta llega en PR-4 vía `LiquidarTerceroService::liquidar()`, que hace
     * `updateOrCreate` sobre las mismas filas.
     */
    public function agregarTerceros(AgregarTercerosNominaRequest $request, Nomina $nomina): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se pueden agregar terceros a una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $tenantId    = (int) $request->header('X-Tenant-Id');
            $operarioIds = $request->resolverOperarioIds();

            $creados = DB::transaction(
                fn () => $this->insertarOperarios($operarioIds, $nomina, $tenantId)
            );

            $opCount = count($creados);

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $nomina,
                "Se agregaron {$opCount} operario(s) de terceros a nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => "{$opCount} operario(s) agregado(s) a la nómina",
                'data'    => $creados,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al agregar terceros a nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al agregar terceros', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Elimina TODAS las filas de un tercero de la nómina (nomina_empleado con
     * ese `tercero_id`, `nomina_tercero_operario` y el acta `nomina_tercero`)
     * si están PENDIENTES. Bloquea con 409 si alguna fila está LIQUIDADA.
     */
    public function eliminarTercero(Request $request, Nomina $nomina, Tercero $tercero): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar terceros de una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $filas = NominaEmpleado::where('nomina_id', $nomina->id)
                ->where('tercero_id', $tercero->id)
                ->get();

            if ($filas->isEmpty()) {
                return response()->json([
                    'message' => 'Ese tercero no tiene operarios en la nómina',
                    'code'    => 'TERCERO_SIN_OPERARIOS_EN_NOMINA',
                ], 404);
            }

            $tieneLiquidados = $filas->contains(fn ($f) => $f->isLiquidado());
            if ($tieneLiquidados) {
                return response()->json([
                    'message' => 'No se puede eliminar un tercero con operarios ya liquidados',
                    'code'    => 'OPERARIO_LIQUIDADO_EN_TERCERO',
                ], 409);
            }

            DB::transaction(function () use ($filas, $nomina, $tercero) {
                foreach ($filas as $f) {
                    $f->delete();
                }

                $acta = NominaTercero::withoutGlobalScope('tenant')
                    ->where('nomina_id', $nomina->id)
                    ->where('tercero_id', $tercero->id)
                    ->first();

                if ($acta) {
                    NominaTerceroOperario::withoutGlobalScope('tenant')
                        ->where('nomina_tercero_id', $acta->id)
                        ->delete();
                    $acta->delete();
                }
            });

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nomina, [],
                "Se quitó el tercero #{$tercero->id} de nómina #{$nomina->id} ({$filas->count()} operario(s))",
            );

            return response()->json([
                'message' => "Tercero #{$tercero->id} eliminado de la nómina ({$filas->count()} operario(s))",
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar tercero de nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar tercero', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Devuelve el estado de hidratación del paso 4 para que el frontend sepa
     * qué llamadas todavía faltan antes de intentar cerrar la nómina.
     */
    public function paso4Checklist(Nomina $nomina): JsonResponse
    {
        $empleados = NominaEmpleado::where('nomina_id', $nomina->id)
            ->whereNotNull('empleado_id')
            ->count();

        $operarios = NominaEmpleado::where('nomina_id', $nomina->id)
            ->whereNotNull('operario_id')
            ->count();

        $actas = NominaTercero::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->count();

        $lineas = NominaTerceroOperario::withoutGlobalScope('tenant')
            ->whereIn('nomina_tercero_id', function ($q) use ($nomina) {
                $q->select('id')->from('nomina_tercero')->where('nomina_id', $nomina->id);
            })
            ->count();

        $promedios = NominaPromedioLote::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->count();

        $validacion = NominaValidacionCosecha::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->first();

        $validado = $validacion !== null && $validacion->isConfirmado();

        $tieneCosechas = CosechaCuadrilla::withoutGlobalScope('tenant')
            ->where('tenant_id', $nomina->tenant_id)
            ->where('estado', true)
            ->whereHas('cosecha.operacion', function ($q) use ($nomina) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$nomina->fecha_inicio, $nomina->fecha_fin]);
            })
            ->exists();

        $requiereValidacion = $tieneCosechas;
        $listoParaCerrar    = ($empleados + $operarios) > 0
            && (! $requiereValidacion || $validado);

        return response()->json([
            'data' => [
                'nomina_empleado_empleados'            => $empleados,
                'nomina_empleado_operarios'            => $operarios,
                'nomina_tercero_creados'               => $actas,
                'nomina_tercero_operario_creados'      => $lineas,
                'nomina_promedio_lote_ajustados'       => $promedios,
                'nomina_validacion_cosecha_confirmada' => $validado,
                'requiere_validacion_cosecha'          => $requiereValidacion,
                'listo_para_cerrar'                    => $listoParaCerrar,
            ],
        ]);
    }

    /**
     * Inserta empleados propios en `nomina_empleado` (idempotente).
     * Retorna solo las filas recién creadas (los duplicados se saltan silenciosamente).
     */
    private function insertarEmpleados(array $empleadoIds, Nomina $nomina, int $tenantId): array
    {
        if (empty($empleadoIds)) {
            return [];
        }

        $creados = [];
        $empleados = Empleado::activos()->whereIn('id', $empleadoIds)->get();

        foreach ($empleados as $emp) {
            $yaEsta = NominaEmpleado::where('nomina_id', $nomina->id)
                ->where('empleado_id', $emp->id)
                ->exists();
            if ($yaEsta) {
                continue;
            }

            $salarioTipo = $emp->modalidad_pago === 'PRODUCCION'
                ? NominaEmpleado::SALARIO_VARIABLE
                : NominaEmpleado::SALARIO_FIJO;

            $creados[] = NominaEmpleado::create([
                'tenant_id'    => $tenantId,
                'nomina_id'    => $nomina->id,
                'empleado_id'  => $emp->id,
                'operario_id'  => null,
                'tercero_id'   => null,
                'salario_tipo' => $salarioTipo,
                'salario_base' => $emp->salario_base ?? 0,
                'estado'       => NominaEmpleado::ESTADO_PENDIENTE,
            ]);
        }

        return $creados;
    }

    /**
     * Inserta operarios en `nomina_empleado` (idempotente) y pre-hidrata
     * `nomina_tercero` + `nomina_tercero_operario` para su contratista.
     */
    private function insertarOperarios(array $operarioIds, Nomina $nomina, int $tenantId): array
    {
        if (empty($operarioIds)) {
            return [];
        }

        $creados = [];
        $operarios = Operario::where('estado', true)->whereIn('id', $operarioIds)->get();

        foreach ($operarios as $op) {
            $yaEsta = NominaEmpleado::where('nomina_id', $nomina->id)
                ->where('operario_id', $op->id)
                ->exists();
            if ($yaEsta) {
                continue;
            }

            $creados[] = NominaEmpleado::create([
                'tenant_id'    => $tenantId,
                'nomina_id'    => $nomina->id,
                'empleado_id'  => null,
                'operario_id'  => $op->id,
                'tercero_id'   => $op->tercero_id,
                'salario_tipo' => null,
                'salario_base' => 0,
                'estado'       => NominaEmpleado::ESTADO_PENDIENTE,
            ]);

            $this->hidratarActa->hidratar($nomina, $op, $tenantId);
        }

        return $creados;
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
            $esOperario      = $nominaEmpleado->operario_id !== null;
            $operarioId      = $nominaEmpleado->operario_id;
            $terceroId       = $nominaEmpleado->tercero_id;
            $nominaId        = $nominaEmpleado->nomina_id;

            DB::transaction(function () use ($nominaEmpleado, $esOperario, $operarioId, $terceroId, $nominaId) {
                $nominaEmpleado->delete();

                if (! $esOperario || ! $terceroId) {
                    return;
                }

                $acta = NominaTercero::withoutGlobalScope('tenant')
                    ->where('nomina_id', $nominaId)
                    ->where('tercero_id', $terceroId)
                    ->first();

                if (! $acta) {
                    return;
                }

                NominaTerceroOperario::withoutGlobalScope('tenant')
                    ->where('nomina_tercero_id', $acta->id)
                    ->where('operario_id', $operarioId)
                    ->delete();

                $this->hidratarActa->limpiarSiVacia($nominaId, $terceroId);
            });

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nominaEmpleado, $datosAnteriores,
                "Se quitó " . ($esOperario ? "operario #{$operarioId}" : "empleado #{$nominaEmpleado->empleado_id}") . " de nómina #{$nominaId}",
            );

            return response()->json(['message' => ($esOperario ? 'Operario' : 'Empleado') . ' quitado de la nómina']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar empleado de nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Preview del cálculo (sin persistir). Lo usa el editor al abrirse.
     * Para operarios devuelve estructura reducida (sin conceptos legales ni subsidio).
     */
    public function preview(NominaEmpleado $nominaEmpleado): JsonResponse
    {
        try {
            if ($nominaEmpleado->esDeOperario()) {
                $nominaEmpleado->load(['operario.tercero', 'nomina']);
            } else {
                $nominaEmpleado->load(['empleado.predio', 'nomina']);
            }

            $preview = $this->calc->previewLiquidacion($nominaEmpleado);

            if ($nominaEmpleado->esDeOperario()) {
                $op         = $nominaEmpleado->operario;
                $entityData = [
                    'id'              => $op->id,
                    'nombre_completo' => trim($op->nombres . ' ' . $op->apellidos),
                    'documento'       => $op->cedula,
                    'cargo'           => $op->cargo,
                    'salario_tipo'    => null,
                    'predio'          => null,
                    'tercero'         => [
                        'id'           => $op->tercero->id,
                        'razon_social' => $op->tercero->razon_social ?? $op->tercero->nombre_completo,
                    ],
                ];
            } else {
                $entityData = [
                    'id'              => $nominaEmpleado->empleado->id,
                    'nombre_completo' => $nominaEmpleado->empleado->nombre_completo,
                    'documento'       => $nominaEmpleado->empleado->documento,
                    'cargo'           => $nominaEmpleado->empleado->cargo,
                    'salario_tipo'    => $nominaEmpleado->salario_tipo,
                    'predio'          => $nominaEmpleado->empleado->predio?->only(['id', 'nombre']),
                ];
            }

            $extra = ['empleado' => $entityData];

            // Préstamos pendientes solo para colaboradores internos
            if (! $nominaEmpleado->esDeOperario()) {
                $nomina = $nominaEmpleado->nomina;
                $cuotasPendientes = $this->prestamos
                    ->cuotasPendientesParaNomina(
                        $nominaEmpleado->empleado_id,
                        $nomina->anio,
                        $nomina->mes,
                        $nomina->quincena,
                    )
                    ->map(fn ($c) => [
                        'prestamo_cuota_id'        => $c->id,
                        'prestamo_id'              => $c->prestamo_id,
                        'concepto'                 => $c->prestamo->concepto,
                        'numero_cuota'             => $c->numero_cuota,
                        'total_cuotas'             => $c->prestamo->num_cuotas,
                        'monto'                    => (float) $c->monto,
                        'saldo_restante_prestamo'  => (float) $c->prestamo->saldo_pendiente,
                    ]);

                $extra['prestamos_pendientes'] = $cuotasPendientes->values();
            }

            return response()->json([
                'data' => array_merge($preview, $extra),
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
        $nominaEmpleado->loadMissing(['nomina', 'empleado']);

        $esVariable = $nominaEmpleado->isVariable()
            || $nominaEmpleado->empleado?->modalidad_pago === 'PRODUCCION';

        if (! $esVariable) {
            return response()->json([
                'message' => 'Resumen de trabajo solo aplica a empleados con modalidad VARIABLE',
                'code'    => 'EMPLEADO_NO_VARIABLE',
            ], 422);
        }
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
