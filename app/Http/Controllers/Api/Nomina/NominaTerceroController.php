<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nomina\AgregarDescuentoOperarioActaRequest;
use App\Http\Requests\Nomina\LiquidarTerceroRequest;
use App\Http\Requests\Nomina\RegistrarPagoTerceroRequest;
use App\Models\Nomina;
use App\Models\NominaEmpleado;
use App\Models\NominaTercero;
use App\Models\NominaTerceroOperario;
use App\Models\NominaTerceroOperarioDescuento;
use App\Models\Operario;
use App\Models\Tercero;
use App\Services\AuditoriaService;
use App\Services\Nomina\LiquidarTerceroService;
use App\Services\Nomina\RegistrarPagoTerceroService;
use App\Services\Pdf\ActaTerceroPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Endpoints de la pantalla "Liquidación de Terceros" (PR-4 / PR-4.2).
 *
 * Rutas:
 *   GET    /nominas/{nomina}/terceros-actas                              — resumen agrupado
 *   GET    /nominas/{nomina}/terceros/{tercero}                          — detalle del acta (solo-lectura)
 *   POST   /nominas/{nomina}/terceros/{tercero}/liquidar                 — calcula y persiste el acta
 *   POST   /nominas/{nomina}/terceros/{tercero}/registrar-pago          — marca PAGADO
 *   GET    /nominas/{nomina}/terceros/{tercero}/acta/pdf                — descarga PDF
 *   GET    /nominas/{nomina}/terceros/{tercero}/operarios/{op}/detalle  — desglose de labores (solo-lectura)
 *   POST   /nominas/{nomina}/terceros/{tercero}/operarios/{op}/descuentos         — agregar descuento
 *   DELETE /nominas/{nomina}/terceros/{tercero}/operarios/{op}/descuentos/{desc}  — eliminar descuento
 *
 * El endpoint PUT /operarios/{op} fue eliminado en PR-4.2 (vista de solo-lectura).
 */
class NominaTerceroController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected LiquidarTerceroService $liquidador,
        protected RegistrarPagoTerceroService $registrador,
        protected ActaTerceroPdfService $pdf,
    ) {}

    /**
     * Resumen de contratistas en la nómina con totales por acta.
     */
    public function index(Nomina $nomina): JsonResponse
    {
        $actas = NominaTercero::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->with(['tercero:id,tipo_persona,razon_social,nombre_completo,nombre_comercial,nit,cedula'])
            ->orderBy('id')
            ->get();

        $data = $actas->map(fn ($a) => [
            'id'                 => $a->id,
            'tercero_id'         => $a->tercero_id,
            'tercero_nombre'     => $this->nombreTercero($a->tercero),
            'total_dias'         => (int) $a->total_dias,
            'total_jornales'     => (float) $a->total_jornales,
            'total_cosecha'      => (float) $a->total_cosecha,
            'total_bruto'        => (float) $a->total_bruto,
            'total_a_transferir' => (float) $a->total_a_transferir,
            'estado_pago'        => $a->estado_pago,
            'orden_pago_numero'  => $a->orden_pago_numero,
            'metodo_pago'        => $a->metodo_pago,
            'pagado_at'          => $a->pagado_at?->format('Y-m-d H:i'),
        ]);

        $resumen = [
            'total_a_transferir_global' => (float) $actas->sum('total_a_transferir'),
            'pendiente'                 => (float) $actas->where('estado_pago', NominaTercero::ESTADO_PENDIENTE)->sum('total_a_transferir'),
            'pagado'                    => (float) $actas->where('estado_pago', NominaTercero::ESTADO_PAGADO)->sum('total_a_transferir'),
            'contratistas'              => $actas->count(),
        ];

        return response()->json(['data' => $data, 'resumen' => $resumen]);
    }

    /**
     * Detalle del acta de un contratista con líneas por operario (solo-lectura).
     * Incluye `total_jornales`, `total_cosecha`, `descuentos[]` y `subtotal` por operario.
     */
    public function show(Nomina $nomina, Tercero $tercero): JsonResponse
    {
        $acta = $this->resolverActaOrFail($nomina, $tercero);

        return response()->json([
            'data' => $this->pdf->data($acta),
        ]);
    }

    /**
     * Calcula el acta del contratista y hace updateOrCreate. Idempotente.
     */
    public function liquidar(LiquidarTerceroRequest $request, Nomina $nomina, Tercero $tercero): JsonResponse
    {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede liquidar terceros en una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            $tenantId = (int) $request->header('X-Tenant-Id');
            $userId   = $request->user()->id;
            $acta     = $this->liquidador->liquidar($nomina, $tercero, $tenantId, $userId);

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $acta, [],
                "Se liquidó acta de tercero #{$tercero->id} en nómina #{$nomina->id} — total: {$acta->total_a_transferir}",
            );

            return response()->json([
                'message' => 'Acta del tercero liquidada correctamente',
                'data'    => $this->pdf->data($acta),
            ]);
        } catch (\DomainException $e) {
            $code = str_contains($e->getMessage(), 'TERCERO_SIN_OPERARIOS_EN_NOMINA')
                ? 'TERCERO_SIN_OPERARIOS_EN_NOMINA'
                : 'CALC_ERROR';
            return response()->json(['message' => $e->getMessage(), 'code' => $code], 422);
        } catch (\Throwable $e) {
            Log::error('Error al liquidar tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al liquidar tercero', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Devuelve el desglose de labores de un operario (cosecha por lote/gajos/promedio
     * y jornales por labor/unidades/precio) para el acordeón de la pantalla.
     * Solo-lectura — no altera ningún dato.
     */
    public function detalleOperario(Nomina $nomina, Tercero $tercero, Operario $operario): JsonResponse
    {
        if ((int) $operario->tercero_id !== (int) $tercero->id) {
            return response()->json([
                'message' => 'El operario no pertenece a este tercero',
                'code'    => 'OPERARIO_NO_PERTENECE_A_TERCERO',
            ], 422);
        }

        $acta = $this->resolverActaOrFail($nomina, $tercero);

        $detalle = $this->liquidador->calcularDetalleOperario(
            $operario->id,
            $nomina->fecha_inicio,
            $nomina->fecha_fin,
            $nomina->id
        );

        return response()->json(['data' => $detalle]);
    }

    /**
     * Agrega un descuento con concepto a una línea de operario del acta.
     * Recalcula subtotal del operario y total_a_transferir del acta.
     */
    public function agregarDescuento(
        AgregarDescuentoOperarioActaRequest $request,
        Nomina $nomina,
        Tercero $tercero,
        Operario $operario,
    ): JsonResponse {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede modificar el acta de una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            if ((int) $operario->tercero_id !== (int) $tercero->id) {
                return response()->json([
                    'message' => 'El operario no pertenece a este tercero',
                    'code'    => 'OPERARIO_NO_PERTENECE_A_TERCERO',
                ], 422);
            }

            $acta  = $this->resolverActaOrFail($nomina, $tercero);
            $linea = $this->resolverLineaOrFail($acta, $operario->id);

            $tenantId  = (int) $request->header('X-Tenant-Id');
            $validated = $request->validated();

            $descuento = $this->liquidador->agregarDescuento(
                $linea,
                (int) $validated['concepto_id'],
                (float) $validated['valor'],
                $validated['observacion'] ?? null,
                $tenantId,
                $acta
            );

            $this->auditoria->registrarCreacion(
                $request, 'NOMINA', $descuento,
                "Descuento #{$descuento->id} agregado a acta tercero #{$tercero->id} nómina #{$nomina->id} operario #{$operario->id}",
            );

            $actaFresh = $acta->fresh(['operarios.operario', 'operarios.descuentos.concepto', 'tercero']);

            return response()->json([
                'message' => 'Descuento agregado correctamente',
                'data'    => $this->pdf->data($actaFresh),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al agregar descuento: ' . $e->getMessage());
            return response()->json(['message' => 'Error al agregar descuento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Elimina un descuento de una línea de operario del acta.
     * Recalcula subtotal del operario y total_a_transferir del acta.
     */
    public function eliminarDescuento(
        Request $request,
        Nomina $nomina,
        Tercero $tercero,
        Operario $operario,
        int $descuento,
    ): JsonResponse {
        try {
            if ($nomina->isCerrada()) {
                return response()->json([
                    'message' => 'No se puede modificar el acta de una nómina cerrada',
                    'code'    => 'NOMINA_CERRADA',
                ], 409);
            }

            if ((int) $operario->tercero_id !== (int) $tercero->id) {
                return response()->json([
                    'message' => 'El operario no pertenece a este tercero',
                    'code'    => 'OPERARIO_NO_PERTENECE_A_TERCERO',
                ], 422);
            }

            $acta  = $this->resolverActaOrFail($nomina, $tercero);
            $linea = $this->resolverLineaOrFail($acta, $operario->id);

            // Verificar que el descuento pertenece a esta línea
            $existe = NominaTerceroOperarioDescuento::withoutGlobalScope('tenant')
                ->where('id', $descuento)
                ->where('nomina_tercero_operario_id', $linea->id)
                ->exists();

            if (! $existe) {
                return response()->json([
                    'message' => 'El descuento no existe o no pertenece a este operario',
                    'code'    => 'DESCUENTO_NO_ENCONTRADO',
                ], 404);
            }

            $this->liquidador->eliminarDescuento($descuento, $linea, $acta);

            $this->auditoria->registrarEliminacion(
                $request, 'NOMINA', new NominaTerceroOperarioDescuento(['id' => $descuento]),
                "Descuento #{$descuento} eliminado de acta tercero #{$tercero->id} nómina #{$nomina->id} operario #{$operario->id}",
            );

            $actaFresh = $acta->fresh(['operarios.operario', 'operarios.descuentos.concepto', 'tercero']);

            return response()->json([
                'message' => 'Descuento eliminado correctamente',
                'data'    => $this->pdf->data($actaFresh),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar descuento: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar descuento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Marca el acta como PAGADA y registra los datos del giro.
     * Habilitado incluso cuando nomina.estado=CERRADA.
     */
    public function registrarPago(
        RegistrarPagoTerceroRequest $request,
        Nomina $nomina,
        Tercero $tercero,
    ): JsonResponse {
        try {
            $acta = $this->resolverActaOrFail($nomina, $tercero);

            $actaPagada = $this->registrador->registrar(
                $acta,
                $request->validated(),
                $request->user()->id
            );

            $this->auditoria->registrarEdicion(
                $request, 'NOMINA', $actaPagada, ['estado_pago' => NominaTercero::ESTADO_PENDIENTE],
                "Registro de pago acta tercero #{$tercero->id} nómina #{$nomina->id} — {$actaPagada->metodo_pago}",
            );

            return response()->json([
                'message' => 'Pago registrado correctamente',
                'data'    => $this->pdf->data($actaPagada),
            ]);
        } catch (\DomainException $e) {
            $code = str_contains($e->getMessage(), 'ACTA_TERCERO_YA_PAGADA')
                ? 'ACTA_TERCERO_YA_PAGADA'
                : 'CALC_ERROR';
            return response()->json(['message' => $e->getMessage(), 'code' => $code], 409);
        } catch (\Throwable $e) {
            Log::error('Error al registrar pago del tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al registrar pago', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PDF descargable del acta del contratista.
     */
    public function actaPdf(Nomina $nomina, Tercero $tercero): Response
    {
        $acta = $this->resolverActaOrFail($nomina, $tercero);
        return $this->pdf->pdf($acta);
    }

    // ─── Privados ────────────────────────────────────────────────────────────

    private function resolverActaOrFail(Nomina $nomina, Tercero $tercero): NominaTercero
    {
        $acta = NominaTercero::withoutGlobalScope('tenant')
            ->where('nomina_id', $nomina->id)
            ->where('tercero_id', $tercero->id)
            ->with(['operarios.operario', 'operarios.descuentos.concepto', 'tercero', 'pagadoPor'])
            ->first();

        if ($acta) {
            return $acta;
        }

        $tieneOperarios = NominaEmpleado::where('nomina_id', $nomina->id)
            ->where('tercero_id', $tercero->id)
            ->whereNotNull('operario_id')
            ->exists();

        abort(response()->json([
            'message' => $tieneOperarios
                ? 'El acta no existe aún — ejecuta `POST /liquidar` para crearla.'
                : 'Este tercero no tiene operarios en la nómina.',
            'code'    => $tieneOperarios ? 'ACTA_NO_CALCULADA' : 'TERCERO_SIN_OPERARIOS_EN_NOMINA',
        ], 404));
    }

    private function resolverLineaOrFail(NominaTercero $acta, int $operarioId): NominaTerceroOperario
    {
        $linea = NominaTerceroOperario::withoutGlobalScope('tenant')
            ->where('nomina_tercero_id', $acta->id)
            ->where('operario_id', $operarioId)
            ->first();

        if (! $linea) {
            abort(response()->json([
                'message' => 'El operario no tiene línea en esta acta. Ejecuta `POST /liquidar` primero.',
                'code'    => 'ACTA_NO_CALCULADA',
            ], 404));
        }

        return $linea;
    }

    private function nombreTercero(?Tercero $tercero): ?string
    {
        if (! $tercero) {
            return null;
        }
        return $tercero->tipo_persona === Tercero::TIPO_JURIDICA
            ? ($tercero->razon_social ?? $tercero->nombre_comercial ?? 'Sin nombre')
            : ($tercero->nombre_completo ?? $tercero->nombre_comercial ?? 'Sin nombre');
    }
}
