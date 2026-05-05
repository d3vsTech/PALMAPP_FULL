<?php

namespace App\Services;

use App\Models\Jornal;
use App\Models\Labor;
use App\Models\PrecioAbono;
use App\Models\PrecioPalma;
use InvalidArgumentException;

/**
 * Calcula los valores (valor_unitario, precio_insumo_snapshot, valor_total)
 * de un jornal según su categoría y tipo.
 *
 * Reglas de precio por tipo:
 *   - PLATEO / PODA:         precios_palma.precio_palma × cantidad_palmas
 *   - FERTILIZACION:         precio_abono por rango de gramos × cantidad_palmas
 *   - SANIDAD / OTROS:       precios_palma.precio_palma (valor plano, sin multiplicar)
 *                            (si precio_palma IS NULL → valor_total NULL)
 *   - FINCA:                 labor.valor_base
 */
class JornalCalculationService
{
    /**
     * @return array{valor_unitario: string|null, precio_insumo_snapshot: string|null, valor_total: string|null}
     */
    public function calcularPalma(
        string $tipo,
        int $tenantId,
        ?int $cantidadPalmas = null,
        ?int $insumoId = null,
        ?int $gramosPorPalma = null,
    ): array {
        return match ($tipo) {
            Jornal::TIPO_PLATEO, Jornal::TIPO_PODA =>
                $this->calcularPorPrecioFijo($tipo, $tenantId, $cantidadPalmas),

            Jornal::TIPO_FERTILIZACION =>
                $this->calcularFertilizacion($tenantId, $cantidadPalmas, $insumoId, $gramosPorPalma),

            Jornal::TIPO_SANIDAD, Jornal::TIPO_OTROS =>
                $this->calcularSanidadOtros($tipo, $tenantId),

            default => throw new InvalidArgumentException("Tipo de labor de palma no soportado: {$tipo}"),
        };
    }

    /**
     * @return array{valor_unitario: string|null, precio_insumo_snapshot: null, valor_total: string|null}
     */
    public function calcularFinca(int $laborId): array
    {
        $labor = Labor::findOrFail($laborId);

        return [
            'valor_unitario' => (string) $labor->valor_base,
            'precio_insumo_snapshot' => null,
            'valor_total' => (string) $labor->valor_base,
        ];
    }

    // ────────────────────────────────────────────────────────────────────
    // Implementación interna
    // ────────────────────────────────────────────────────────────────────

    private function calcularPorPrecioFijo(string $tipo, int $tenantId, ?int $cantidadPalmas): array
    {
        if (!$cantidadPalmas) {
            throw new InvalidArgumentException("{$tipo} requiere cantidad_palmas.");
        }

        $precio = PrecioPalma::query()
            ->where('tenant_id', $tenantId)
            ->where('tipo', $tipo)
            ->where('estado', true)
            ->value('precio_palma');

        if ($precio === null) {
            throw new InvalidArgumentException(
                "No hay precio configurado en `precios_palma` para tipo {$tipo}."
            );
        }

        return [
            'valor_unitario' => (string) $precio,
            'precio_insumo_snapshot' => null,
            'valor_total' => (string) round($cantidadPalmas * (float) $precio, 2),
        ];
    }

    private function calcularFertilizacion(
        int $tenantId,
        ?int $cantidadPalmas,
        ?int $insumoId,
        ?int $gramosPorPalma,
    ): array {
        if (!$cantidadPalmas || !$insumoId || !$gramosPorPalma) {
            throw new InvalidArgumentException(
                'FERTILIZACION requiere cantidad_palmas, insumo_id y gramos_por_palma.'
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
            'valor_unitario' => (string) $precioPalma,
            'precio_insumo_snapshot' => (string) $precioPalma,
            'valor_total' => (string) round($cantidadPalmas * $precioPalma, 2),
        ];
    }

    /**
     * SANIDAD y OTROS: valor plano de `precios_palma.precio_palma` (sin multiplicar).
     * Si no hay precio configurado, se guarda NULL (se hidrata cuando el admin
     * configure el precio en `precios_palma`).
     */
    private function calcularSanidadOtros(string $tipo, int $tenantId): array
    {
        $precio = PrecioPalma::query()
            ->where('tenant_id', $tenantId)
            ->where('tipo', $tipo)
            ->where('estado', true)
            ->value('precio_palma');

        if ($precio === null) {
            return [
                'valor_unitario' => null,
                'precio_insumo_snapshot' => null,
                'valor_total' => null,
            ];
        }

        return [
            'valor_unitario' => (string) $precio,
            'precio_insumo_snapshot' => null,
            'valor_total' => (string) $precio,
        ];
    }
}
