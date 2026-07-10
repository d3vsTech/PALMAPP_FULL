<?php

namespace App\Services\Nomina;

use App\Models\Nomina;
use App\Models\NominaTercero;
use App\Models\NominaTerceroOperario;
use App\Models\Operario;
use App\Models\TerceroLaborPrecio;

/**
 * Pre-hidrata las tablas `nomina_tercero` y `nomina_tercero_operario` cuando se
 * agrega un operario a una nómina (paso 4 del wizard).
 *
 * Deja las filas creadas en estado inicial (totales 0, PENDIENTE) para que
 * la pantalla de "Liquidación de Terceros" (PR-4) pueda listarlas sin necesitar
 * un paso previo. Los totales reales los calcula `LiquidarTerceroService`
 * (PR-4) haciendo `updateOrCreate` sobre las mismas filas — el UNIQUE
 * `(nomina_id, tercero_id)` garantiza la idempotencia.
 *
 * IMPORTANTE: usa `firstOrCreate` (no `updateOrCreate`) para NO pisar
 * totales ya calculados por PR-4 en re-ejecuciones.
 */
class HidratarActaTerceroService
{
    /**
     * Crea (si no existen) las filas `nomina_tercero` y `nomina_tercero_operario`
     * asociadas al operario recién agregado a la nómina.
     *
     * @return array{acta: NominaTercero, linea: NominaTerceroOperario}
     */
    public function hidratar(Nomina $nomina, Operario $operario, int $tenantId): array
    {
        $acta = NominaTercero::withoutGlobalScope('tenant')->firstOrCreate(
            [
                'nomina_id'  => $nomina->id,
                'tercero_id' => $operario->tercero_id,
            ],
            [
                'tenant_id'          => $tenantId,
                'total_dias'         => 0,
                'total_jornales'     => 0,
                'total_cosecha'      => 0,
                'total_bruto'        => 0,
                'total_a_transferir' => 0,
                'estado_pago'        => NominaTercero::ESTADO_PENDIENTE,
            ]
        );

        $tarifaInicial = $this->resolverTarifaInicial($operario->tercero_id, $tenantId);

        $linea = NominaTerceroOperario::withoutGlobalScope('tenant')->firstOrCreate(
            [
                'nomina_tercero_id' => $acta->id,
                'operario_id'       => $operario->id,
            ],
            [
                'tenant_id'          => $tenantId,
                'dias'               => 0,
                'tarifa_dia'         => $tarifaInicial,
                'ajuste'             => 0,
                'subtotal'           => 0,
                'labores_realizadas' => [],
            ]
        );

        return ['acta' => $acta, 'linea' => $linea];
    }

    /**
     * Elimina la fila `nomina_tercero_operario` de un operario y, si queda
     * huérfana el acta (sin más operarios), también elimina `nomina_tercero`.
     * Solo debe llamarse cuando la nómina está en BORRADOR y las filas están
     * en estado inicial (totales 0). No borra si el acta ya fue liquidada.
     */
    public function limpiarSiVacia(int $nominaId, int $terceroId): void
    {
        $acta = NominaTercero::withoutGlobalScope('tenant')
            ->where('nomina_id', $nominaId)
            ->where('tercero_id', $terceroId)
            ->first();

        if (! $acta) {
            return;
        }

        $tieneLineas = NominaTerceroOperario::withoutGlobalScope('tenant')
            ->where('nomina_tercero_id', $acta->id)
            ->exists();

        if (! $tieneLineas) {
            $acta->delete();
        }
    }

    /**
     * Busca la primera tarifa JORNAL_FIJO configurada para el tercero como
     * punto de partida del acta. Si no hay ninguna, devuelve 0 — el usuario
     * la ajustará más tarde desde la pantalla de PR-4.
     */
    private function resolverTarifaInicial(int $terceroId, int $tenantId): float
    {
        $precio = TerceroLaborPrecio::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('tercero_id', $terceroId)
            ->where('tipo_pago', 'JORNAL_FIJO')
            ->where('estado', true)
            ->whereNotNull('tarifa_jornal')
            ->orderByDesc('id')
            ->first();

        return $precio?->precio_resuelto ?? 0.0;
    }
}
