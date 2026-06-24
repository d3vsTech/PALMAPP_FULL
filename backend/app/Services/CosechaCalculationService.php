<?php

namespace App\Services;

use App\Models\Labor;
use App\Models\PrecioCosecha;
use App\Models\PromedioLote;
use App\Models\TerceroLaborPrecio;
use App\Models\TerceroPrecioCosecha;
use InvalidArgumentException;

/**
 * Calcula la cabecera (valor_total) y la distribución en cuadrilla de un
 * registro_cosecha.
 *
 * Reglas:
 *
 *   - labor COSECHA con tipo_pago=POR_PALMA (caso por defecto y único modo
 *     histórico): comportamiento 100% idéntico al anterior — usa
 *     `precios_cosecha` por lote+año.
 *       · Con peso_confirmado: valor_total = peso × precios_cosecha.precio
 *         (si falta precios_cosecha lanza InvalidArgumentException → 422 CALC_ERROR)
 *       · Sin peso_confirmado: valor_total = NULL (se hidrata luego vía PUT)
 *
 *   - labor COSECHA con tipo_pago=JORNAL_FIJO (opt-in del admin): el cálculo
 *     es plano. valor_total = labor.precio_palma. El peso, si llega, se persiste
 *     como tracking agronómico pero no afecta el cálculo. Si precio_palma es
 *     NULL → InvalidArgumentException.
 */
class CosechaCalculationService
{
    /**
     * @return array{precio_cosecha: string|null, promedio_kg_gajo: string|null, valor_total: string|null}
     */
    public function calcular(
        Labor $laborCosecha,
        int $loteId,
        int $anio,
        ?float $pesoConfirmado,
        ?int $terceroId = null,
    ): array {
        if (!$laborCosecha->esCosecha()) {
            throw new InvalidArgumentException(
                "La labor proporcionada no es de tipo COSECHA (tipo={$laborCosecha->tipo})."
            );
        }

        // tipo_pago efectivo: si hay tercero con override en tercero_labor_precios.tipo_pago,
        // ese gana sobre labor.tipo_pago del tenant.
        $tipoPagoEfectivo = $laborCosecha->resolverTipoPago($terceroId);

        if ($tipoPagoEfectivo === Labor::TIPO_PAGO_JORNAL_FIJO) {
            return $this->calcularJornalFijo($laborCosecha, $terceroId);
        }

        return $this->calcularPorPalma($loteId, $anio, $pesoConfirmado, $terceroId);
    }

    /**
     * @return array{valor_por_empleado: string|null, peso_por_empleado: string|null}
     */
    public function distribuirCuadrilla(?float $valorTotal, ?float $peso, int $n): array
    {
        if ($n === 0) {
            return ['valor_por_empleado' => null, 'peso_por_empleado' => null];
        }

        return [
            'valor_por_empleado' => $valorTotal !== null ? (string) round($valorTotal / $n, 2) : null,
            'peso_por_empleado'  => $peso !== null ? (string) round($peso / $n, 2) : null,
        ];
    }

    // ────────────────────────────────────────────────────────────────────
    // Implementación interna
    // ────────────────────────────────────────────────────────────────────

    /**
     * COSECHA POR_PALMA — peso × precio por lote+año.
     * Busca primero override de tercero, fallback al tenant.
     */
    private function calcularPorPalma(int $loteId, int $anio, ?float $pesoConfirmado, ?int $terceroId = null): array
    {
        $precio = null;

        // Override de tercero primero
        if ($terceroId !== null) {
            $precio = TerceroPrecioCosecha::query()
                ->where('tercero_id', $terceroId)
                ->where('lote_id', $loteId)
                ->where('anio', $anio)
                ->value('precio');
        }

        // Fallback al precio del tenant
        if ($precio === null) {
            $precio = PrecioCosecha::query()
                ->where('lote_id', $loteId)
                ->where('anio', $anio)
                ->value('precio');
        }

        $promedio = PromedioLote::query()
            ->where('lote_id', $loteId)
            ->where('anio', $anio)
            ->value('promedio');

        if ($pesoConfirmado !== null && $precio === null) {
            throw new InvalidArgumentException(
                "No hay precio de cosecha configurado para lote {$loteId} año {$anio}."
            );
        }

        $valorTotal = ($pesoConfirmado !== null && $precio !== null)
            ? round($pesoConfirmado * (float) $precio, 2)
            : null;

        return [
            'precio_cosecha'   => $precio !== null ? (string) $precio : null,
            'promedio_kg_gajo' => $promedio !== null ? (string) $promedio : null,
            'valor_total'      => $valorTotal !== null ? (string) $valorTotal : null,
        ];
    }

    /**
     * COSECHA JORNAL_FIJO — valor plano con fallback a precio del tercero.
     */
    private function calcularJornalFijo(Labor $laborCosecha, ?int $terceroId = null): array
    {
        $precio = null;

        // Override de tercero primero
        if ($terceroId !== null) {
            $override = TerceroLaborPrecio::where('tercero_id', $terceroId)
                ->where('labor_id', $laborCosecha->id)
                ->where('estado', true)
                ->value('precio_palma');

            if ($override !== null) {
                $precio = (float) $override;
            }
        }

        // Fallback al precio del tenant
        if ($precio === null) {
            if ($laborCosecha->precio_palma === null) {
                throw new InvalidArgumentException(
                    "La labor COSECHA está configurada como JORNAL_FIJO pero no tiene precio_palma. " .
                    "Configure el precio plano antes de registrar cosechas."
                );
            }
            $precio = (float) $laborCosecha->precio_palma;
        }

        $valor = (string) $precio;

        return [
            'precio_cosecha'   => null,
            'promedio_kg_gajo' => null,
            'valor_total'      => $valor,
        ];
    }
}
