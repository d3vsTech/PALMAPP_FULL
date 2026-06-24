<?php

namespace App\Services;

use App\Models\Labor;
use App\Models\PrecioAbono;
use App\Models\TerceroLaborPrecio;
use App\Models\TerceroPrecioAbono;
use InvalidArgumentException;

/**
 * Calcula los valores (valor_unitario, precio_insumo_snapshot, valor_total)
 * de un jornal a partir de la `Labor` asociada.
 *
 * Reglas:
 *   - tipo=COSECHA: rechaza — la cosecha va por su flujo dedicado en
 *     /operaciones/{id}/cosechas + cosecha_cuadrilla.
 *   - tipo=FERTILIZACION + POR_PALMA: precio por rango de gramos en
 *     `precio_abono` × cantidad_palmas (mantiene la lógica histórica).
 *   - tipo_pago=POR_PALMA (cualquier otra): labor.precio_palma × cantidad_palmas.
 *   - tipo_pago=JORNAL_FIJO: labor.precio_palma como valor plano.
 *
 * Si `labor.precio_palma` aún no está configurado (NULL), valor_total queda
 * NULL — el jornal vive en "limbo" hasta que admin lo configure.
 */
class JornalCalculationService
{
    /**
     * @return array{valor_unitario: string|null, precio_insumo_snapshot: string|null, valor_total: string|null}
     */
    public function calcular(Labor $labor, array $data, ?int $terceroId = null): array
    {
        if ($labor->esCosecha()) {
            throw new InvalidArgumentException(
                'La labor COSECHA se registra vía POST /operaciones/{id}/cosechas, no como jornal.'
            );
        }

        // Tipo_pago efectivo: si hay tercero con override en tercero_labor_precios.tipo_pago,
        // ese gana sobre labor.tipo_pago del tenant.
        $tipoPagoEfectivo = $labor->resolverTipoPago($terceroId);

        if ($tipoPagoEfectivo === Labor::TIPO_PAGO_POR_PALMA) {
            if ($labor->esFertilizacion()) {
                return $this->calcularFertilizacion(
                    tenantId:       (int) $labor->tenant_id,
                    cantidadPalmas: $data['cantidad_palmas'] ?? null,
                    insumoId:       $data['insumo_id'] ?? null,
                    gramosPorPalma: $data['gramos_por_palma'] ?? null,
                    terceroId:      $terceroId,
                );
            }

            return $this->calcularPorPalmaSimple($labor, $data['cantidad_palmas'] ?? null, $terceroId);
        }

        // JORNAL_FIJO — para cualquier categoría (PALMA o FINCA).
        return $this->calcularJornalFijo($labor, $terceroId);
    }

    // ────────────────────────────────────────────────────────────────────
    // Ramas
    // ────────────────────────────────────────────────────────────────────

    /**
     * POR_PALMA simple (PLATEO, PODA, SANIDAD, custom PALMA POR_PALMA).
     */
    private function calcularPorPalmaSimple(Labor $labor, ?int $cantidadPalmas, ?int $terceroId = null): array
    {
        if ($cantidadPalmas === null) {
            throw new InvalidArgumentException(
                "Se requiere cantidad_palmas para la labor '{$labor->nombre}' (tipo_pago POR_PALMA)."
            );
        }

        $precio = $this->resolverPrecioLabor($labor, $terceroId);

        if ($precio === null) {
            return ['valor_unitario' => null, 'precio_insumo_snapshot' => null, 'valor_total' => null];
        }

        return [
            'valor_unitario'         => (string) $precio,
            'precio_insumo_snapshot' => null,
            'valor_total'            => (string) round($cantidadPalmas * $precio, 2),
        ];
    }

    /**
     * JORNAL_FIJO — valor plano, con fallback a precio del tercero si aplica.
     */
    private function calcularJornalFijo(Labor $labor, ?int $terceroId = null): array
    {
        $precio = $this->resolverPrecioLabor($labor, $terceroId);

        if ($precio === null) {
            return ['valor_unitario' => null, 'precio_insumo_snapshot' => null, 'valor_total' => null];
        }

        $precioStr = (string) $precio;

        return [
            'valor_unitario'         => $precioStr,
            'precio_insumo_snapshot' => null,
            'valor_total'            => $precioStr,
        ];
    }

    /**
     * FERTILIZACION en POR_PALMA: precio por rango de gramos.
     * Busca primero en tercero_precio_abono, fallback al tenant.
     */
    private function calcularFertilizacion(
        int $tenantId,
        ?int $cantidadPalmas,
        ?int $insumoId,
        ?int $gramosPorPalma,
        ?int $terceroId = null,
    ): array {
        if (!$cantidadPalmas || !$insumoId || !$gramosPorPalma) {
            throw new InvalidArgumentException(
                'FERTILIZACION en POR_PALMA requiere cantidad_palmas, insumo_id y gramos_por_palma.'
            );
        }

        $precioPalma = null;

        // Override de tercero primero
        if ($terceroId) {
            $terceroAbono = TerceroPrecioAbono::query()
                ->where('tenant_id', $tenantId)
                ->where('tercero_id', $terceroId)
                ->where('gramos_min', '<=', $gramosPorPalma)
                ->where('gramos_max', '>=', $gramosPorPalma)
                ->where('estado', true)
                ->first();

            if ($terceroAbono) {
                $precioPalma = (float) $terceroAbono->precio_palma;
            }
        }

        // Fallback al precio del tenant
        if ($precioPalma === null) {
            $precioAbono = PrecioAbono::query()
                ->where('tenant_id', $tenantId)
                ->where('gramos_min', '<=', $gramosPorPalma)
                ->where('gramos_max', '>=', $gramosPorPalma)
                ->where('estado', true)
                ->first();

            if (!$precioAbono) {
                throw new InvalidArgumentException(
                    "No se encontró precio_abono para {$gramosPorPalma}g por palma."
                );
            }

            $precioPalma = (float) $precioAbono->precio_palma;
        }

        return [
            'valor_unitario'         => (string) $precioPalma,
            'precio_insumo_snapshot' => (string) $precioPalma,
            'valor_total'            => (string) round($cantidadPalmas * $precioPalma, 2),
        ];
    }

    /**
     * Resuelve el precio de una labor con fallback:
     *   1. Override específico del tercero (tercero_labor_precios)
     *   2. Precio tenant (labor.precio_palma)
     *   3. NULL — no configurado
     */
    private function resolverPrecioLabor(Labor $labor, ?int $terceroId): ?float
    {
        if ($terceroId !== null) {
            $override = TerceroLaborPrecio::where('tercero_id', $terceroId)
                ->where('labor_id', $labor->id)
                ->where('estado', true)
                ->value('precio_palma');

            if ($override !== null) {
                return (float) $override;
            }
        }

        return $labor->precio_palma !== null ? (float) $labor->precio_palma : null;
    }
}
