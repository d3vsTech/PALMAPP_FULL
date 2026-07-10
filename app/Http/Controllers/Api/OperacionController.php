<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Operacion\StoreOperacionRequest;
use App\Http\Requests\Operacion\UpdateOperacionRequest;
use App\Models\Ausencia;
use App\Models\Empleado;
use App\Models\HoraExtra;
use App\Models\Insumo;
use App\Models\Jornal;
use App\Models\Labor;
use App\Models\Lote;
use App\Models\MotivoAusencia;
use App\Models\Operacion;
use App\Models\Operario;
use App\Models\Sublote;
use App\Models\TerceroLaborPrecio;
use App\Models\TipoHoraExtra;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OperacionController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            // Subquery: personas únicas por operación (empleados + operarios, en jornales + cosecha_cuadrilla).
            // CONCAT('E_', id) vs CONCAT('O_', id) evita colisiones de IDs entre empleados y operarios.
            $colaboradoresSub = DB::query()
                ->fromSub(function ($q) {
                    $q->from('jornales')
                        ->selectRaw("operacion_id, CONCAT('E_', empleado_id) as persona_key")
                        ->where('estado', true)
                        ->whereNotNull('empleado_id')
                        ->union(
                            DB::table('jornales')
                                ->selectRaw("operacion_id, CONCAT('O_', operario_id) as persona_key")
                                ->where('estado', true)
                                ->whereNotNull('operario_id')
                        )
                        ->union(
                            DB::table('cosecha_cuadrilla')
                                ->join('registro_cosecha', 'cosecha_cuadrilla.cosecha_id', '=', 'registro_cosecha.id')
                                ->selectRaw("registro_cosecha.operacion_id, CONCAT('E_', cosecha_cuadrilla.empleado_id) as persona_key")
                                ->where('cosecha_cuadrilla.estado', true)
                                ->where('registro_cosecha.estado', true)
                                ->whereNotNull('cosecha_cuadrilla.empleado_id')
                        )
                        ->union(
                            DB::table('cosecha_cuadrilla')
                                ->join('registro_cosecha', 'cosecha_cuadrilla.cosecha_id', '=', 'registro_cosecha.id')
                                ->selectRaw("registro_cosecha.operacion_id, CONCAT('O_', cosecha_cuadrilla.operario_id) as persona_key")
                                ->where('cosecha_cuadrilla.estado', true)
                                ->where('registro_cosecha.estado', true)
                                ->whereNotNull('cosecha_cuadrilla.operario_id')
                        );
                }, 'personas_union')
                ->selectRaw('operacion_id, COUNT(DISTINCT persona_key) as total')
                ->groupBy('operacion_id');

            $operaciones = Operacion::query()
                ->with('creadoPor:id,name', 'aprobadoPor:id,name')
                ->withCount(['jornales', 'cosechas', 'ausencias'])
                ->withSum(['jornales as total_jornales_sum' => fn($q) => $q->where('estado', true)], 'valor_total')
                ->withSum(['cosechas as total_cosechas_sum' => fn($q) => $q->where('estado', true)], 'valor_total')
                ->leftJoinSub($colaboradoresSub, 'colaboradores', 'colaboradores.operacion_id', '=', 'operaciones.id')
                ->addSelect('operaciones.*', DB::raw('COALESCE(colaboradores.total, 0) as colaboradores_count'))
                ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
                ->when($request->fecha_desde, fn($q, $d) => $q->where('fecha', '>=', $d))
                ->when($request->fecha_hasta, fn($q, $d) => $q->where('fecha', '<=', $d))
                ->orderByDesc('fecha')
                ->paginate($request->per_page ?? 15);

            // Hidratar total_general = jornales + cosechas (ambos nullable → tratar como 0).
            $operaciones->getCollection()->transform(function ($op) {
                $tj = (float) ($op->total_jornales_sum ?? 0);
                $tc = (float) ($op->total_cosechas_sum ?? 0);
                $op->total_general = round($tj + $tc, 2);
                return $op;
            });

            return response()->json([
                'data' => $operaciones->items(),
                'meta' => [
                    'current_page' => $operaciones->currentPage(),
                    'last_page'    => $operaciones->lastPage(),
                    'per_page'     => $operaciones->perPage(),
                    'total'        => $operaciones->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar operaciones: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar operaciones', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Indicadores Principales (cards superiores del módulo de Operaciones).
     * Cuenta planillas por estado dentro del período seleccionado.
     *
     * Query: periodo = mensual (default) | semanal | quincenal | personalizado
     *        fecha_desde, fecha_hasta (solo con periodo=personalizado)
     */
    public function indicadores(Request $request): JsonResponse
    {
        try {
            $periodo = $request->input('periodo', 'mensual');
            [$desde, $hasta] = $this->resolverRangoPeriodo($periodo, $request);

            $porEstado = Operacion::query()
                ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
                ->selectRaw('estado, COUNT(*) as total')
                ->groupBy('estado')
                ->pluck('total', 'estado');

            $borrador  = (int) ($porEstado[Operacion::ESTADO_BORRADOR] ?? 0);
            $aprobadas = (int) ($porEstado[Operacion::ESTADO_APROBADA] ?? 0);
            $total     = $borrador + $aprobadas;

            return response()->json([
                'data' => [
                    'periodo' => [
                        'tipo'        => $periodo,
                        'fecha_desde' => $desde->toDateString(),
                        'fecha_hasta' => $hasta->toDateString(),
                    ],
                    'planillas_borrador'  => $borrador,
                    'planillas_aprobadas' => $aprobadas,
                    'total_planillas'     => $total,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al obtener indicadores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener los indicadores', 'error' => $e->getMessage()], 500);
        }
    }

    private function resolverRangoPeriodo(string $periodo, Request $request): array
    {
        $hoy = Carbon::now();

        return match ($periodo) {
            'semanal'       => [$hoy->copy()->startOfWeek(), $hoy->copy()->endOfWeek()],
            'quincenal'     => $this->rangoQuincenalActual($hoy),
            'mensual'       => [$hoy->copy()->startOfMonth(), $hoy->copy()->endOfMonth()],
            'personalizado' => $this->rangoPersonalizado($request),
            default => throw new \InvalidArgumentException("Período no soportado: {$periodo}. Use mensual, semanal, quincenal o personalizado."),
        };
    }

    /**
     * Quincena en curso según el día de hoy:
     *   - día 1-15  → Q1: día 1 al 15 del mes
     *   - día 16-31 → Q2: día 16 al último día del mes
     */
    private function rangoQuincenalActual(Carbon $hoy): array
    {
        if ($hoy->day <= 15) {
            return [$hoy->copy()->startOfMonth(), $hoy->copy()->day(15)->endOfDay()];
        }

        return [$hoy->copy()->day(16)->startOfDay(), $hoy->copy()->endOfMonth()];
    }

    private function rangoPersonalizado(Request $request): array
    {
        $desde = $request->input('fecha_desde');
        $hasta = $request->input('fecha_hasta');

        if (!$desde || !$hasta) {
            throw new \InvalidArgumentException('periodo=personalizado requiere fecha_desde y fecha_hasta (YYYY-MM-DD).');
        }

        return [Carbon::parse($desde)->startOfDay(), Carbon::parse($hasta)->endOfDay()];
    }

    /**
     * Relaciones eager-loaded del detalle de una planilla. Compartido entre
     * `show()` y `wizardInit()` para garantizar idéntica forma de respuesta.
     */
    private const SHOW_RELATIONS = [
        'creadoPor:id,name',
        'aprobadoPor:id,name',
        'cosechas.cuadrilla.empleado:id,primer_nombre,primer_apellido,documento',
        'cosechas.cuadrilla.operario:id,nombres,apellidos',
        'cosechas.cuadrilla.tercero:id,tipo_persona,razon_social,nombre_completo',
        'cosechas.lote:id,nombre',
        'cosechas.sublote:id,nombre',
        'jornales.empleado:id,primer_nombre,primer_apellido,documento',
        'jornales.operario:id,nombres,apellidos',
        'jornales.tercero:id,tipo_persona,razon_social,nombre_completo',
        'jornales.labor:id,nombre,categoria,tipo,tipo_pago,precio_palma',
        'jornales.lote:id,nombre',
        'jornales.sublote:id,nombre',
        'jornales.insumo:id,nombre',
        'ausencias.empleado:id,primer_nombre,primer_apellido',
        'ausencias.motivoAusencia:id,nombre,tipo_base',
        'horasExtra.empleado:id,primer_nombre,primer_apellido',
        'horasExtra.tipoHoraExtra:id,codigo,nombre,porcentaje_recargo',
    ];

    public function show(Operacion $operacion): JsonResponse
    {
        try {
            $operacion->load(self::SHOW_RELATIONS);

            return response()->json(['data' => $operacion]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener la operación', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreOperacionRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['creado_por'] = $request->user()?->id;
            $data['estado']     = Operacion::ESTADO_BORRADOR;

            $operacion = Operacion::create($data);

            $this->auditoria->registrarCreacion(
                $request, 'OPERACIONES', $operacion,
                "Se creó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla creada correctamente',
                'data'    => $operacion->load('creadoPor:id,name'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateOperacionRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se puede editar una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $datosAnteriores = $operacion->toArray();
            $operacion->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'OPERACIONES', $operacion, $datosAnteriores,
                "Se editó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla actualizada correctamente',
                'data'    => $operacion->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se puede eliminar una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($operacion->cosechas()->whereHas('viajeDetalles', fn($q) => $q->where('estado', true))->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar: una o más cosechas de la planilla están asignadas a un viaje',
                    'code'    => 'COSECHA_EN_VIAJE',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'OPERACIONES', $operacion,
                "Se eliminó la planilla del día {$operacion->fecha->format('Y-m-d')} con todos sus registros",
            );

            DB::transaction(function () use ($operacion) {
                $cosechaIds = $operacion->cosechas()->pluck('id');

                // FK: viaje_detalle → registro_cosecha (registros inactivos que pasaron el check)
                DB::table('viaje_detalle')->whereIn('cosecha_id', $cosechaIds)->delete();
                // FK: cosecha_cuadrilla → registro_cosecha
                DB::table('cosecha_cuadrilla')->whereIn('cosecha_id', $cosechaIds)->delete();

                $operacion->cosechas()->delete();
                $operacion->jornales()->delete();
                $operacion->ausencias()->delete();
                $operacion->horasExtra()->delete();
                $operacion->delete();
            });

            return response()->json(['message' => 'Planilla eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function aprobar(Request $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'La planilla ya está aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $datosAnteriores = $operacion->toArray();
            $operacion->aprobar($request->user()->id);

            $this->auditoria->registrarEdicion(
                $request, 'OPERACIONES', $operacion, $datosAnteriores,
                "Se aprobó la planilla del día {$operacion->fecha->format('Y-m-d')}",
            );

            return response()->json([
                'message' => 'Planilla aprobada correctamente',
                'data'    => $operacion->fresh()->load('aprobadoPor:id,name'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al aprobar operacion: ' . $e->getMessage());
            return response()->json(['message' => 'Error al aprobar la planilla', 'error' => $e->getMessage()], 500);
        }
    }

    public function resumen(Operacion $operacion): JsonResponse
    {
        try {
            return response()->json(['data' => $this->calcularResumen($operacion)]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener resumen: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el resumen', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Calcula el resumen reutilizando las relaciones ya cargadas cuando es
     * posible. Si vienes de `wizardInit()` con la planilla eager-loaded, no
     * dispara queries adicionales para labores/ausencias — solo 1 para horas
     * extra (que no se trae en `SHOW_RELATIONS`). El endpoint standalone
     * `resumen()` paga las cargas faltantes con `loadMissing`.
     */
    private function calcularResumen(Operacion $operacion): array
    {
        $operacion->loadMissing([
            'creadoPor:id,name',
            'jornales:id,operacion_id,categoria,tipo,estado',
            'cosechas:id,operacion_id,estado',
            'ausencias:id,operacion_id,estado',
        ]);

        $labores = [
            'cosecha'       => $operacion->cosechas->where('estado', true)->count(),
            'plateo'        => 0,
            'poda'          => 0,
            'fertilizacion' => 0,
            'sanidad'       => 0,
            'otros'         => 0,
            'labores_finca' => 0,
        ];

        foreach ($operacion->jornales as $j) {
            if (!$j->estado) continue;
            if ($j->categoria === Jornal::CATEGORIA_FINCA) {
                $labores['labores_finca']++;
                continue;
            }
            // PALMA: tipo IS NULL → bucket "otros" (custom); tipo = PLATEO/
            // PODA/FERTILIZACION/SANIDAD → bucket homónimo.
            $key = $j->tipo !== null ? strtolower($j->tipo) : 'otros';
            if (array_key_exists($key, $labores)) {
                $labores[$key]++;
            }
        }

        $ausencias = [
            'pendientes' => 0,
            'aprobadas'  => 0,
            'rechazadas' => 0,
            'liquidadas' => 0,
        ];
        $mapAusencia = [
            Ausencia::ESTADO_PENDIENTE => 'pendientes',
            Ausencia::ESTADO_APROBADA  => 'aprobadas',
            Ausencia::ESTADO_RECHAZADA => 'rechazadas',
            Ausencia::ESTADO_LIQUIDADA => 'liquidadas',
        ];
        foreach ($operacion->ausencias as $a) {
            if (isset($mapAusencia[$a->estado])) {
                $ausencias[$mapAusencia[$a->estado]]++;
            }
        }
        $ausencias['total'] = array_sum($ausencias);

        // Horas extra: única query SQL real porque requiere SUM y no viene en
        // las relaciones eager-loaded del show.
        $horasExtraRows = HoraExtra::query()
            ->where('operacion_id', $operacion->id)
            ->selectRaw('estado, COUNT(*) as total, COALESCE(SUM(cantidad_horas), 0) as horas, COALESCE(SUM(valor_calculado), 0) as valor')
            ->groupBy('estado')
            ->get()
            ->keyBy('estado');

        $horasExtra = [
            'pendientes' => (int) ($horasExtraRows[HoraExtra::ESTADO_PENDIENTE]->total ?? 0),
            'aprobadas'  => (int) ($horasExtraRows[HoraExtra::ESTADO_APROBADA]->total ?? 0),
            'rechazadas' => (int) ($horasExtraRows[HoraExtra::ESTADO_RECHAZADA]->total ?? 0),
            'liquidadas' => (int) ($horasExtraRows[HoraExtra::ESTADO_LIQUIDADA]->total ?? 0),
        ];
        $horasExtra['total']         = $horasExtra['pendientes'] + $horasExtra['aprobadas']
                                      + $horasExtra['rechazadas'] + $horasExtra['liquidadas'];
        $horasExtra['horas_totales'] = number_format((float) $horasExtraRows->sum('horas'), 2, '.', '');
        $horasExtra['valor_total']   = number_format((float) $horasExtraRows->sum('valor'), 2, '.', '');

        return [
            'fecha'           => $operacion->fecha?->format('Y-m-d'),
            'elaborado_por'   => $operacion->creadoPor?->name,
            'hubo_lluvia'     => (bool) $operacion->hubo_lluvia,
            'cantidad_lluvia' => $operacion->cantidad_lluvia,
            'inicio_labores'  => $operacion->hora_inicio,
            'estado'          => $operacion->estado,
            'labores'         => $labores,
            'ausencias'       => $ausencias,
            'horas_extra'     => $horasExtra,
        ];
    }

    /**
     * Bundle único para abrir el wizard de planilla en lectura/edición/creación.
     * Reemplaza las ~10 peticiones que el frontend disparaba (7 catálogos +
     * sublotes + show + resumen) por una sola respuesta cacheada por tenant.
     *
     * - Modo edición/lectura: GET /operaciones/{operacion}/wizard-init
     * - Modo creación:        GET /operaciones/wizard-init
     */
    public function wizardInit(Request $request, ?Operacion $operacion = null): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $planilla = null;
            $resumen  = null;
            if ($operacion !== null && $operacion->exists) {
                $operacion->load(self::SHOW_RELATIONS);
                $planilla = $operacion;
                $resumen  = $this->calcularResumen($operacion);
            }

            $parametricas = [
                'colaboradores'    => Cache::remember(
                    WizardCache::operacionesColaboradores($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Empleado::query()
                        ->where('estado', true)
                        ->orderBy('primer_nombre')
                        ->orderBy('primer_apellido')
                        ->get(['id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
                               'documento', 'modalidad_pago', 'estado'])
                        ->map(fn ($e) => [
                            'id'              => $e->id,
                            'nombre_completo' => $e->nombre_completo,
                            'documento'       => $e->documento,
                            'modalidad_pago'  => $e->modalidad_pago,
                        ])->values()->all(),
                ),

                'lotes' => Cache::remember(
                    WizardCache::operacionesLotes($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Lote::query()
                        ->where('estado', true)
                        ->with('predio:id,nombre')
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'predio_id']),
                ),

                'sublotes' => Cache::remember(
                    WizardCache::operacionesSublotes($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Sublote::query()
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'lote_id', 'cantidad_palmas']),
                ),

                'insumos' => Cache::remember(
                    WizardCache::operacionesInsumos($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Insumo::query()
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'unidad_medida']),
                ),

                'labores_palma' => Cache::remember(
                    WizardCache::operacionesLabores($tenantId, 'PALMA'),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => $this->cargarLaboresParaSelect('PALMA'),
                ),

                'labores_finca' => Cache::remember(
                    WizardCache::operacionesLabores($tenantId, 'FINCA'),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => $this->cargarLaboresParaSelect('FINCA'),
                ),

                'motivos_ausencia' => Cache::remember(
                    WizardCache::operacionesMotivosAusencia($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => MotivoAusencia::query()
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'tipo_base', 'es_remunerada', 'afecta_nomina',
                               'porcentaje_pago_default', 'requiere_soporte', 'color',
                               'afecta_seguridad_social', 'afecta_parafiscales', 'afecta_prestaciones']),
                ),

                'tipos_hora_extra' => Cache::remember(
                    WizardCache::operacionesTiposHoraExtra($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => TipoHoraExtra::query()
                        ->where('estado', true)
                        ->orderBy('codigo')
                        ->get(['id', 'codigo', 'nombre', 'porcentaje_recargo', 'franja_horaria',
                               'aplica_festivo', 'es_extra', 'paga_hora_completa', 'descripcion']),
                ),

                'operarios' => Cache::remember(
                    WizardCache::operacionesOperarios($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => Operario::query()
                        ->where('estado', true)
                        ->with('tercero:id,tipo_persona,razon_social,nombre_completo,nombre_comercial')
                        ->orderBy('nombres')
                        ->orderBy('apellidos')
                        ->get(['id', 'tercero_id', 'nombres', 'apellidos', 'cedula'])
                        ->map(fn ($o) => [
                            'id'              => $o->id,
                            'tercero_id'      => $o->tercero_id,
                            'nombre_completo' => $o->nombre_completo,
                            'cedula'          => $o->cedula,
                            'tercero_nombre'  => $o->tercero?->nombre_display,
                        ])->values()->all(),
                ),

                // Overrides activos de `tercero_labor_precios`. Incluye TODOS los
                // overrides de cualquier categoría (PALMA + FINCA), con o sin
                // `tipo_pago` poblado:
                //
                //   - tipo_pago=POR_PALMA|JORNAL_FIJO → cambia el modo de pago efectivo
                //   - tipo_pago=null                  → solo overridea precio_palma (modo de pago hereda del catálogo)
                //
                // El frontend resuelve, al seleccionar una persona en un tab del wizard:
                //   1. Si es operario → busca (tercero_id, labor_id) en este array.
                //   2. tipo_pago efectivo  = override.tipo_pago ?? labor.tipo_pago (catálogo).
                //   3. precio_palma a mostrar = override.precio_palma (si existe el match) ?? labor.precio_palma.
                //
                // El backend hace la MISMA resolución al validar y calcular el POST de jornal,
                // así que el preview del frontend siempre coincide con el cálculo persistido.
                'tercero_labor_overrides' => Cache::remember(
                    WizardCache::operacionesTerceroLaborOverrides($tenantId),
                    WizardCache::TTL_PARAMETRICA,
                    fn () => TerceroLaborPrecio::query()
                        ->where('estado', true)
                        ->get(['tercero_id', 'labor_id', 'tipo_pago', 'precio_palma'])
                        ->map(fn ($p) => [
                            'tercero_id'   => $p->tercero_id,
                            'labor_id'     => $p->labor_id,
                            'tipo_pago'    => $p->tipo_pago,
                            'precio_palma' => $p->precio_palma,
                        ])->values()->all(),
                ),
            ];

            return response()->json([
                'data' => [
                    'planilla'     => $planilla,
                    'resumen'      => $resumen,
                    'parametricas' => $parametricas,
                ],
            ])->header('Cache-Control', 'private, max-age=0, must-revalidate');
        } catch (\Throwable $e) {
            Log::error('Error en operaciones/wizard-init: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al inicializar el wizard de planilla',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Replica el shape de `LaborController::select()` para reutilizar en el
     * bundle: incluye el accessor virtual `requiere_cosecha_workflow`.
     */
    private function cargarLaboresParaSelect(string $categoria)
    {
        $labores = Labor::query()
            ->where('categoria', $categoria)
            ->where('estado', true)
            ->orderBy('es_sistema', 'desc')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema']);

        $labores->each(function (Labor $l) {
            $l->requiere_cosecha_workflow = $l->requiereFlujoCosecha();
        });

        return $labores;
    }
}
