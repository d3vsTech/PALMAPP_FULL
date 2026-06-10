<?php

namespace App\Services;

use App\Models\Labor;
use App\Models\PrecioAbono;
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
    public function calcular(Labor $labor, array $data): array
    {
        if ($labor->esCosecha()) {
            throw new InvalidArgumentException(
                'La labor COSECHA se registra vía POST /operaciones/{id}/cosechas, no como jornal.'
            );
        }

        if ($labor->esPorPalma()) {
            if ($labor->esFertilizacion()) {
                return $this->calcularFertilizacion(
                    tenantId:       (int) $labor->tenant_id,
                    cantidadPalmas: $data['cantidad_palmas'] ?? null,
                    insumoId:       $data['insumo_id'] ?? null,
                    gramosPorPalma: $data['gramos_por_palma'] ?? null,
                );
            }

            return $this->calcularPorPalmaSimple($labor, $data['cantidad_palmas'] ?? null);
        }

        // JORNAL_FIJO — para cualquier categoría (PALMA o FINCA).
        return $this->calcularJornalFijo($labor);
    }

    // ────────────────────────────────────────────────────────────────────
    // Ramas
    // ────────────────────────────────────────────────────────────────────

    /**
     * POR_PALMA simple (PLATEO, PODA, SANIDAD, custom PALMA POR_PALMA).
     */
    private function calcularPorPalmaSimple(Labor $labor, ?int $cantidadPalmas): array
    {
        if ($cantidadPalmas === null) {
            throw new InvalidArgumentException(
                "Se requiere cantidad_palmas para la labor '{$labor->nombre}' (tipo_pago POR_PALMA)."
            );
        }

        if ($labor->precio_palma === null) {
            return ['valor_unitario' => null, 'precio_insumo_snapshot' => null, 'valor_total' => null];
        }

        $precio = (float) $labor->precio_palma;

        return [
            'valor_unitario'         => (string) $precio,
            'precio_insumo_snapshot' => null,
            'valor_total'            => (string) round($cantidadPalmas * $precio, 2),
        ];
    }

    /**
     * JORNAL_FIJO — valor plano de labor.precio_palma.
     */
    private function calcularJornalFijo(Labor $labor): array
    {
        if ($labor->precio_palma === null) {
            return ['valor_unitario' => null, 'precio_insumo_snapshot' => null, 'valor_total' => null];
        }

        $precio = (string) (float) $labor->precio_palma;

        return [
            'valor_unitario'         => $precio,
            'precio_insumo_snapshot' => null,
            'valor_total'            => $precio,
        ];
    }

    /**
     * FERTILIZACION en POR_PALMA: precio por rango de gramos.
     */
    private function calcularFertilizacion(
        int $tenantId,
        ?int $cantidadPalmas,
        ?int $insumoId,
        ?int $gramosPorPalma,
    ): array {
        if (!$cantidadPalmas || !$insumoId || !$gramosPorPalma) {
            throw new InvalidArgumentException(
                'FERTILIZACION en POR_PALMA requiere cantidad_palmas, insumo_id y gramos_por_palma.'
            );
        }

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

        return [
            'valor_unitario'         => (string) $precioPalma,
            'precio_insumo_snapshot' => (string) $precioPalma,
            'valor_total'            => (string) round($cantidadPalmas * $precioPalma, 2),
        ];
    }
}
