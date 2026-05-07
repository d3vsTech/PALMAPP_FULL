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

    public function indicadores(): JsonResponse
    {
        $borradores = Nomina::where('estado', Nomina::ESTADO_BORRADOR)->count();
        $cerradas   = Nomina::where('estado', Nomina::ESTADO_CERRADA)->count();
        $totalDevengado = (float) Nomina::where('estado', Nomina::ESTADO_CERRADA)->sum('total_general');

        return response()->json([
            'data' => [
                'total_periodos'      => $borradores + $cerradas,
                'borradores'          => $borradores,
                'cerradas'            => $cerradas,
                'total_devengado'     => round($totalDevengado, 2),
            ],
        ]);
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

            $datosAnteriores = $nomina->toArray();

            // Eliminar empleados PENDIENTES vinculados
            $nomina->empleados()->delete();
            $nomina->delete();

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', $nomina, $datosAnteriores,
                "Se eliminó nómina #{$nomina->id} ({$nomina->anio}-{$nomina->mes})",
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
            $code = str_contains($e->getMessage(), 'NOMINA_CERRADA')
                ? 'NOMINA_CERRADA'
                : (str_contains($e->getMessage(), 'NOMINA_CON_PENDIENTES') ? 'NOMINA_CON_PENDIENTES' : 'NOMINA_ERROR');
            return response()->json([
                'message' => $e->getMessage(),
                'code'    => $code,
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al cerrar nómina: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cerrar la nómina', 'error' => $e->getMessage()], 500);
        }
    }
}
