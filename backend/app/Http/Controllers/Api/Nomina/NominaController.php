<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\StoreNominaRequest;
use App\Http\Requests\Nomina\UpdateNominaRequest;
use App\Models\Nomina;
use App\Models\NominaEmpleado;
use App\Services\AuditoriaService;
use App\Services\Nomina\CerrarNominaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NominaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected CerrarNominaService $cerrarService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, (int) $request->input('per_page', 15));

        $query = Nomina::query()
            ->withCount(['empleados', 'empleados as empleados_liquidados_count' => fn($q) => $q->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)])
            ->orderByDesc('anio')
            ->orderByDesc('mes')
            ->orderByDesc('quincena');

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }
        if ($request->filled('mes')) {
            $query->where('mes', (int) $request->input('mes'));
        }
        if ($request->filled('anio')) {
            $query->where('anio', (int) $request->input('anio'));
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    /**
     * Indicadores del listado de nóminas — cards superiores.
     *
     * Filtros opcionales (todos combinables):
     *   ?anio=2026        — solo nóminas del año
     *   ?mes=7            — solo nóminas del mes
     *   ?estado=BORRADOR  — solo nóminas en ese estado
     *
     * Response:
     *   total_periodos, borradores, cerradas                  (siempre)
     *   total_devengado                                        (@deprecated, usar total_colaboradores)
     *   total_colaboradores                                    (SUM total_neto de empleados propios en nóminas CERRADAS filtradas)
     *   total_terceros                                         (SUM total_a_transferir de actas PAGADO en nóminas CERRADAS filtradas)
     *   neto_pagar                                             (total_colaboradores + total_terceros — lo ya efectivamente pagado)
     *   pendiente_pagar                                        (SUM total_a_transferir de actas PENDIENTE con total > 0 en nóminas filtradas)
     */
    public function indicadores(Request $request): JsonResponse
    {
        $filtros = $this->extraerFiltrosIndicadores($request);

        // 1) Conteos y total_devengado (una sola query agregada sobre `nominas`).
        $stats = Nomina::selectRaw(
            "COUNT(CASE WHEN estado = ? THEN 1 END) AS borradores, "
            . "COUNT(CASE WHEN estado = ? THEN 1 END) AS cerradas, "
            . "COALESCE(SUM(CASE WHEN estado = ? THEN total_general END), 0) AS total_devengado",
            [Nomina::ESTADO_BORRADOR, Nomina::ESTADO_CERRADA, Nomina::ESTADO_CERRADA]
        );
        $this->aplicarFiltrosIndicadores($stats, $filtros);
        $stats = $stats->first();

        $borradores     = (int) ($stats->borradores ?? 0);
        $cerradas       = (int) ($stats->cerradas ?? 0);
        $totalDevengado = (float) ($stats->total_devengado ?? 0);

        // 2) Ids de nóminas CERRADAS filtradas (subquery para no traer todo el listado).
        $nominasCerradas = Nomina::where('estado', Nomina::ESTADO_CERRADA);
        $this->aplicarFiltrosIndicadores($nominasCerradas, $filtros);
        $nominasCerradasIds = $nominasCerradas->pluck('id');

        // 3) Total pagado a colaboradores propios (empleado_id !== null) en nóminas CERRADAS.
        $totalColaboradores = $nominasCerradasIds->isEmpty()
            ? 0.0
            : (float) NominaEmpleado::whereIn('nomina_id', $nominasCerradasIds)
                ->whereNotNull('empleado_id')
                ->sum('total_neto');

        // 4) Total pagado a terceros (actas PAGADO) en nóminas CERRADAS.
        $totalTercerosPagados = $nominasCerradasIds->isEmpty()
            ? 0.0
            : (float) DB::table('nomina_tercero')
                ->whereIn('nomina_id', $nominasCerradasIds)
                ->where('estado_pago', 'PAGADO')
                ->sum('total_a_transferir');

        // 5) Pendiente por pagar a terceros — actas PENDIENTE con total > 0.
        //    Se excluyen las pre-hidratadas por PR-3.5 (totales 0). Considera
        //    tanto nóminas BORRADOR (acta ya liquidada, aún sin cerrar) como
        //    CERRADA (giro post-cierre no realizado — excepción documentada).
        $pendienteQuery = DB::table('nomina_tercero as nt')
            ->join('nominas as n', 'n.id', '=', 'nt.nomina_id')
            ->where('nt.estado_pago', 'PENDIENTE')
            ->where('nt.total_a_transferir', '>', 0);
        $this->aplicarFiltrosIndicadores($pendienteQuery, $filtros, 'n');
        $pendientePagar = (float) $pendienteQuery->sum('nt.total_a_transferir');

        return response()->json([
            'data' => [
                'total_periodos'      => $borradores + $cerradas,
                'borradores'          => $borradores,
                'cerradas'            => $cerradas,
                'total_devengado'     => round($totalDevengado, 2),   // @deprecated — usar total_colaboradores
                'total_colaboradores' => round($totalColaboradores, 2),
                'total_terceros'      => round($totalTercerosPagados, 2),
                'neto_pagar'          => round($totalColaboradores + $totalTercerosPagados, 2),
                'pendiente_pagar'     => round($pendientePagar, 2),
            ],
            'meta' => [
                'filtros' => array_filter($filtros, fn ($v) => $v !== null),
            ],
        ]);
    }

    /**
     * Normaliza los filtros de indicadores desde el request.
     */
    private function extraerFiltrosIndicadores(Request $request): array
    {
        return [
            'anio'   => $request->filled('anio')   ? (int) $request->input('anio')   : null,
            'mes'    => $request->filled('mes')    ? (int) $request->input('mes')    : null,
            'estado' => $request->filled('estado') ? (string) $request->input('estado') : null,
        ];
    }

    /**
     * Aplica los filtros a una query builder de `nominas`. `$alias` permite
     * usar el helper sobre JOINs (ej. `n.anio` en vez de `anio`).
     */
    private function aplicarFiltrosIndicadores($query, array $filtros, ?string $alias = null): void
    {
        $prefix = $alias ? "{$alias}." : '';
        if (! is_null($filtros['anio']))   $query->where($prefix . 'anio', $filtros['anio']);
        if (! is_null($filtros['mes']))    $query->where($prefix . 'mes', $filtros['mes']);
        if (! is_null($filtros['estado'])) $query->where($prefix . 'estado', $filtros['estado']);
    }

    public function store(StoreNominaRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $tenantId = (int) $request->header('X-Tenant-Id');

            // El frontend siempre envía 'periodicidad'; el config del tenant
            // ya no participa en este endpoint (es solo un default informativo
            // que el front puede leer de /configuracion/nomina si quiere).
            $tipoPago = $data['periodicidad'];
            $quincena = $tipoPago === Nomina::TIPO_PAGO_MENSUAL ? null : (int) $data['quincena'];

            // Validar duplicado
            $existe = Nomina::where('tenant_id', $tenantId)
                ->where('anio', $data['anio'])
                ->where('mes', $data['mes'])
                ->where('quincena', $quincena)
                ->exists();
            if ($existe) {
                return response()->json([
                    'message' => 'Ya existe una nómina para ese período',
                    'code'    => 'NOMINA_DUPLICADA',
                ], 409);
            }

            $rango = Nomina::calcularRangoFechas($data['mes'], $data['anio'], $quincena, $tipoPago);

            $nomina = Nomina::create([
                'tenant_id'          => $tenantId,
                'mes'                => $data['mes'],
                'anio'               => $data['anio'],
                'quincena'           => $quincena,
                'tipo_pago_snapshot' => $tipoPago,
                'fecha_inicio'       => $rango['fecha_inicio'],
                'fecha_fin'          => $rango['fecha_fin'],
                'estado'             => Nomina::ESTADO_BORRADOR,
                'observacion'        => $data['observacion'] ?? null,
            ]);

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $nomina,
                "Se creó nómina {$nomina->anio}-{$nomina->mes} ({$tipoPago}" . ($quincena ? ", Q{$quincena}" : '') . ")",
            );

            return response()->json([
                'message' => 'Nómina creada correctamente',
                'data'    => $nomina->fresh(),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la nómina', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Nomina $nomina): JsonResponse
    {
        $nomina->load([
            'empleados.empleado:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,documento,cargo,modalidad_pago,salario_base',
            'empleados.liquidadoPor:id,name',
            'cerradaPor:id,name',
        ]);

        return response()->json(['data' => $nomina]);
    }

    public function update(UpdateNominaRequest $request, Nomina $nomina): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede editar una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $tieneLiquidados = $nomina->empleados()
                ->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)
                ->exists();
            if ($tieneLiquidados) {
                return response()->json([
                    'message' => 'No se puede editar el período de una nómina con empleados ya liquidados',
                    'code'    => 'NOMINA_CON_LIQUIDADOS',
                ], 409);
            }

            $data = $request->validated();
            $datosAnteriores = $nomina->toArray();

            // Si cambia mes/quincena, recalcula rango usando el tipo_pago_snapshot
            // de la nómina (NO el config del tenant — la nómina blinda su tipo
            // contra cambios futuros de configuración).
            if (array_intersect_key($data, array_flip(['mes', 'anio', 'quincena']))) {
                $rango = Nomina::calcularRangoFechas(
                    $data['mes'] ?? $nomina->mes,
                    $data['anio'] ?? $nomina->anio,
                    array_key_exists('quincena', $data) ? $data['quincena'] : $nomina->quincena,
                    $nomina->tipo_pago_snapshot,
                );
                $data['fecha_inicio'] = $rango['fecha_inicio'];
                $data['fecha_fin']    = $rango['fecha_fin'];
            }

            $nomina->update($data);

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $nomina, $datosAnteriores,
                "Se editó nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => 'Nómina actualizada correctamente',
                'data'    => $nomina->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la nómina', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Nomina $nomina): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede eliminar una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $tieneLiquidados = $nomina->empleados()
                ->where('estado', NominaEmpleado::ESTADO_LIQUIDADO)
                ->exists();
            if ($tieneLiquidados) {
                return response()->json([
                    'message' => 'No se puede eliminar una nómina con empleados ya liquidados',
                    'code'    => 'NOMINA_CON_LIQUIDADOS',
                ], 409);
            }

            $descripcion = "Se eliminó nómina #{$nomina->id} ({$nomina->anio}-{$nomina->mes})";

            DB::transaction(function () use ($nomina) {
                $nominaId = $nomina->id;

                // 1) Refs por nomina_empleado (jornales, cosechas, horas extra, conceptos)
                $empleadoIds = $nomina->empleados()->pluck('id');
                if ($empleadoIds->isNotEmpty()) {
                    DB::table('nomina_jornal_ref')->whereIn('nomina_empleado_id', $empleadoIds)->delete();
                    DB::table('nomina_cosecha_ref')->whereIn('nomina_empleado_id', $empleadoIds)->delete();
                    DB::table('nomina_hora_extra_ref')->whereIn('nomina_empleado_id', $empleadoIds)->delete();
                    DB::table('nomina_empleado_concepto')->whereIn('nomina_empleado_id', $empleadoIds)->delete();
                }

                // 2) Acta de terceros → primero operarios, luego actas
                $terceroIds = DB::table('nomina_tercero')->where('nomina_id', $nominaId)->pluck('id');
                if ($terceroIds->isNotEmpty()) {
                    DB::table('nomina_tercero_operario')->whereIn('nomina_tercero_id', $terceroIds)->delete();
                    DB::table('nomina_tercero')->whereIn('id', $terceroIds)->delete();
                }

                // 3) Snapshot del paso 3 (Validar Cosecha)
                DB::table('nomina_validacion_cosecha')->where('nomina_id', $nominaId)->delete();

                // 4) Overrides manuales de promedio por lote
                DB::table('nomina_promedio_lote')->where('nomina_id', $nominaId)->delete();

                // 5) Desvincular ausencias/horas_extra defensivamente (en BORRADOR
                //    no deberían estar asociadas, pero evitamos violar restrictOnDelete).
                DB::table('ausencias')->where('nomina_id', $nominaId)->update(['nomina_id' => null]);
                DB::table('horas_extra')->where('nomina_id', $nominaId)->update(['nomina_id' => null]);

                // 6) Filas de colaboradores (empleados + operarios) y la nómina misma
                $nomina->empleados()->delete();
                $nomina->delete();
            });

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nomina, $descripcion,
            );

            return response()->json(['message' => 'Nómina eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la nómina', 'error' => $e->getMessage()], 500);
        }
    }

    public function cerrar(Request $request, Nomina $nomina): JsonResponse
    {
        try {
            if (! $request->user()?->can('nomina.cerrar')) {
                return response()->json([
                    'message' => 'No tienes permisos para cerrar nóminas',
                    'code'    => 'PERMISSION_DENIED',
                ], 403);
            }

            $nominaCerrada = $this->cerrarService->cerrar($nomina, $request->user()->id);

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $nominaCerrada, ['estado' => Nomina::ESTADO_BORRADOR],
                "Se cerró nómina #{$nomina->id}",
            );

            return response()->json([
                'message' => 'Nómina cerrada correctamente',
                'data'    => $nominaCerrada->load('cerradaPor:id,name'),
            ]);
        } catch (\DomainException $e) {
            $msg  = $e->getMessage();
            $code = match (true) {
                str_contains($msg, 'NOMINA_CERRADA')                      => 'NOMINA_CERRADA',
                str_contains($msg, 'NOMINA_CON_PENDIENTES')               => 'NOMINA_CON_PENDIENTES',
                str_contains($msg, 'NOMINA_VALIDACION_COSECHA_REQUERIDA') => 'NOMINA_VALIDACION_COSECHA_REQUERIDA',
                default                                                    => 'NOMINA_ERROR',
            };
            return response()->json([
                'message' => $msg,
                'code'    => $code,
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al cerrar nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cerrar la nómina', 'error' => $e->getMessage()], 500);
        }
    }
}
