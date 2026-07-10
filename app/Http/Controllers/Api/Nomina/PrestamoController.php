<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\ActualizarPrestamoRequest;
use App\Http\Requests\Nomina\CrearPrestamoRequest;
use App\Models\Prestamo;
use App\Services\AuditoriaService;
use App\Services\Nomina\PrestamoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Endpoints del módulo de Préstamos a colaboradores internos.
 *
 * Rutas:
 *   GET    /prestamos/indicadores     — 2 cards: vigentes + saldo
 *   GET    /prestamos                 — listado con filtros
 *   POST   /prestamos                 — crear préstamo
 *   GET    /prestamos/{id}            — detalle con calendario de cuotas
 *   PUT    /prestamos/{id}            — editar (limitado si ya hay cuotas aplicadas)
 *   DELETE /prestamos/{id}            — cancelar (soft-delete)
 */
class PrestamoController extends Controller
{
    public function __construct(
        protected PrestamoService $servicio,
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * 2 cards: préstamos vigentes (count) y saldo total pendiente (sum).
     */
    public function indicadores(Request $request): JsonResponse
    {
        if (! $request->user()?->can('nomina.ver')) {
            return response()->json(['message' => 'Sin permiso', 'code' => 'PERMISSION_DENIED'], 403);
        }

        $tenantId = (int) $request->header('X-Tenant-Id');

        $vigentes = Prestamo::where('tenant_id', $tenantId)
            ->where('estado', Prestamo::ESTADO_VIGENTE)
            ->count();

        $saldo = Prestamo::where('tenant_id', $tenantId)
            ->where('estado', Prestamo::ESTADO_VIGENTE)
            ->sum('saldo_pendiente');

        return response()->json([
            'data' => [
                'prestamos_vigentes'   => $vigentes,
                'saldo_total_pendiente' => round((float) $saldo, 2),
            ],
        ]);
    }

    /**
     * Listado de préstamos con filtros opcionales: ?empleado_id, ?estado, ?anio.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('nomina.ver')) {
            return response()->json(['message' => 'Sin permiso', 'code' => 'PERMISSION_DENIED'], 403);
        }

        $tenantId = (int) $request->header('X-Tenant-Id');

        $query = Prestamo::where('tenant_id', $tenantId)
            ->with(['empleado:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,documento,cargo'])
            ->orderByDesc('created_at');

        if ($request->filled('empleado_id')) {
            $query->where('empleado_id', (int) $request->input('empleado_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        if ($request->filled('anio')) {
            $query->where('inicio_anio', (int) $request->input('anio'));
        }

        $prestamos = $query->get()->map(fn ($p) => $this->mapPrestamo($p));

        return response()->json(['data' => $prestamos]);
    }

    /**
     * Detalle de un préstamo con su calendario de cuotas.
     */
    public function show(Request $request, Prestamo $prestamo): JsonResponse
    {
        if (! $request->user()?->can('nomina.ver')) {
            return response()->json(['message' => 'Sin permiso', 'code' => 'PERMISSION_DENIED'], 403);
        }

        $prestamo->load(['empleado:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,documento,cargo', 'cuotas']);

        return response()->json([
            'data' => array_merge($this->mapPrestamo($prestamo), [
                'cuotas' => $prestamo->cuotas->map(fn ($c) => [
                    'id'           => $c->id,
                    'numero_cuota' => $c->numero_cuota,
                    'anio'         => $c->anio,
                    'mes'          => $c->mes,
                    'quincena'     => $c->quincena,
                    'monto'        => (float) $c->monto,
                    'estado'       => $c->estado,
                    'aplicada_at'  => $c->aplicada_at?->toIso8601String(),
                ]),
            ]),
        ]);
    }

    /**
     * Crea un préstamo y genera las cuotas.
     */
    public function store(CrearPrestamoRequest $request): JsonResponse
    {
        try {
            $tenantId = (int) $request->header('X-Tenant-Id');
            $prestamo = $this->servicio->crear($request->validated(), $tenantId, $request->user()->id);

            $this->auditoria->registrarCreacion(
                $request, 'PRESTAMO', $prestamo,
                "Préstamo #{$prestamo->id} de {$prestamo->valor_total} en {$prestamo->num_cuotas} cuotas para empleado #{$prestamo->empleado_id}",
            );

            return response()->json([
                'message' => 'Préstamo registrado correctamente',
                'data'    => $this->mapPrestamo($prestamo),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear préstamo: ' . $e->getMessage());

            return response()->json(['message' => 'Error al crear el préstamo', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Edita el préstamo. Si ya tiene cuotas aplicadas solo se permite
     * cambiar concepto y observaciones.
     */
    public function update(ActualizarPrestamoRequest $request, Prestamo $prestamo): JsonResponse
    {
        try {
            $prestamo = $this->servicio->actualizar($prestamo, $request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'PRESTAMO', $prestamo, [],
                "Préstamo #{$prestamo->id} actualizado",
            );

            return response()->json([
                'message' => 'Préstamo actualizado correctamente',
                'data'    => $this->mapPrestamo($prestamo),
            ]);
        } catch (InvalidArgumentException $e) {
            $code = $e->getMessage() === 'PRESTAMO_NO_EDITABLE' ? 'PRESTAMO_NO_EDITABLE' : 'VALIDATION_ERROR';

            return response()->json([
                'message' => 'No se puede modificar el monto o las cuotas: ya existen cuotas aplicadas.',
                'code'    => $code,
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar préstamo: ' . $e->getMessage());

            return response()->json(['message' => 'Error al actualizar el préstamo', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cancela (soft-delete) el préstamo.
     */
    public function destroy(Request $request, Prestamo $prestamo): JsonResponse
    {
        if (! $request->user()?->can('nomina.editar')) {
            return response()->json(['message' => 'Sin permiso', 'code' => 'PERMISSION_DENIED'], 403);
        }

        try {
            $this->servicio->cancelar($prestamo);

            $this->auditoria->registrarEliminacion(
                $request, 'PRESTAMO', $prestamo,
                "Préstamo #{$prestamo->id} cancelado",
            );

            return response()->json(['message' => 'Préstamo cancelado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al cancelar préstamo: ' . $e->getMessage());

            return response()->json(['message' => 'Error al cancelar el préstamo', 'error' => $e->getMessage()], 500);
        }
    }

    // ─── helpers privados ─────────────────────────────────────────────────────

    private function mapPrestamo(Prestamo $p): array
    {
        $emp = $p->relationLoaded('empleado') ? $p->empleado : null;

        return [
            'id'              => $p->id,
            'empleado'        => $emp ? [
                'id'              => $emp->id,
                'nombre_completo' => $emp->nombre_completo,
                'documento'       => $emp->documento,
                'cargo'           => $emp->cargo,
            ] : ['id' => $p->empleado_id],
            'concepto'        => $p->concepto,
            'valor_total'     => (float) $p->valor_total,
            'saldo_pendiente' => (float) $p->saldo_pendiente,
            'cuota_valor'     => (float) $p->cuota_valor,
            'cuotas_pagadas'  => $p->cuotas_pagadas,
            'num_cuotas'      => $p->num_cuotas,
            'avance'          => $p->avance,
            'fecha_fin'       => $p->fecha_fin,
            'estado'          => $p->estado,
            'frecuencia'      => $p->inicio_quincena !== null ? 'QUINCENAL' : 'MENSUAL',
            'inicio_anio'     => $p->inicio_anio,
            'inicio_mes'      => $p->inicio_mes,
            'inicio_quincena' => $p->inicio_quincena,
            'observaciones'   => $p->observaciones,
            'created_at'      => $p->created_at?->toIso8601String(),
        ];
    }
}
