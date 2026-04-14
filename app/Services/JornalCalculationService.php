<?php

namespace App\Services;

use App\Models\Labor;
use App\Models\PrecioAbono;
use InvalidArgumentException;

class JornalCalculationService
{
    /**
     * Calcula los valores de un jornal según el tipo de pago de la labor.
     *
     * @return array{tipo_pago: string, valor_unitario: string, precio_insumo_snapshot: string|null, valor_total: string}
     */
    public function calcular(
        int $laborId,
        float $diasJornal = 1.0,
        ?int $cantidadPalmas = null,
        ?int $gramosPorPalma = null,
    ): array {
        $labor = Labor::with('insumo')->findOrFail($laborId);

        return match ($labor->tipo_pago) {
            Labor::TIPO_JORNAL_FIJO => $this->calcularJornalFijo($labor, $diasJornal),
            Labor::TIPO_POR_PALMA_INSUMO => $this->calcularPorPalmaInsumo($labor, $cantidadPalmas, $gramosPorPalma),
            Labor::TIPO_POR_PALMA_SIMPLE => $this->calcularPorPalmaSimple($labor, $cantidadPalmas),
            default => throw new InvalidArgumentException("Tipo de pago no soportado: {$labor->tipo_pago}"),
        };
    }

    private function calcularJornalFijo(Labor $labor, float $diasJornal): array
    {
        $valorUnitario = $labor->valor_base;
        $valorTotal = round($diasJornal * $valorUnitario, 2);

        return [
            'tipo_pago' => Labor::TIPO_JORNAL_FIJO,
            'valor_unitario' => $valorUnitario,
            'precio_insumo_snapshot' => null,
            'valor_total' => $valorTotal,
        ];
    }

    private function calcularPorPalmaInsumo(Labor $labor, ?int $cantidadPalmas, ?int $gramosPorPalma): array
    {
        if (!$cantidadPalmas || !$gramosPorPalma) {
            throw new InvalidArgumentException('POR_PALMA_INSUMO requiere cantidad_palmas y gramos_por_palma.');
        }

        if (!$labor->insumo_id) {
            throw new InvalidArgumentException("La labor '{$labor->nombre}' tipo POR_PALMA_INSUMO no tiene insumo asociado.");
        }

        $precioAbono = PrecioAbono::where('insumo_id', $labor->insumo_id)
            ->where('gramos_min', '<=', $gramosPorPalma)
            ->where('gramos_max', '>=', $gramosPorPalma)
            ->where('estado', true)
            ->first();

        if (!$precioAbono) {
            throw new InvalidArgumentException(
                "No se encontró precio de abono para el insumo #{$labor->insumo_id} con {$gramosPorPalma}g por palma."
            );
        }

        $precioPalma = $precioAbono->precio_palma;
        $valorTotal = round($cantidadPalmas * $precioPalma, 2);

        return [
            'tipo_pago' => Labor::TIPO_POR_PALMA_INSUMO,
            'valor_unitario' => $precioPalma,
            'precio_insumo_snapshot' => $precioPalma,
            'valor_total' => $valorTotal,
        ];
    }

    private function calcularPorPalmaSimple(Labor $labor, ?int $cantidadPalmas): array
    {
        if (!$cantidadPalmas) {
            throw new InvalidArgumentException('POR_PALMA_SIMPLE requiere cantidad_palmas.');
        }

        $valorUnitario = $labor->valor_base;
        $valorTotal = round($cantidadPalmas * $valorUnitario, 2);

        return [
            'tipo_pago' => Labor::TIPO_POR_PALMA_SIMPLE,
            'valor_unitario' => $valorUnitario,
            'precio_insumo_snapshot' => null,
            'valor_total' => $valorTotal,
        ];
    }
}
