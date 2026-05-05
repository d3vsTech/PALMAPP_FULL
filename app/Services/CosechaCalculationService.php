<?php

namespace App\Services;

use App\Models\PrecioCosecha;
use App\Models\PromedioLote;
use InvalidArgumentException;

/**
 * Calcula la cabecera (valor_total) y la distribución en cuadrilla
 * de un registro_cosecha.
 *
 * Reglas:
 *   - Con peso_confirmado: valor_total = peso × precios_cosecha.precio
 *     (si falta precios_cosecha para lote+año, lanza InvalidArgumentException → 422 CALC_ERROR)
 *   - Sin peso_confirmado:  valor_total = NULL (se hidrata luego vía PUT)
 */
class CosechaCalculationService
{
    /**
     * @return array{precio_cosecha: string|null, promedio_kg_gajo: string|null, valor_total: string|null}
     */
    public function calcular(int $loteId, int $anio, ?float $pesoConfirmado): array
    {
        $precio = PrecioCosecha::query()
            ->where('lote_id', $loteId)
            ->where('anio', $anio)
            ->value('precio');

        $promedio = PromedioLote::query()
            ->where('lote_id', $loteId)
            ->where('anio', $anio)
            ->value('promedio');

        if ($pesoConfirmado !== null && $precio === null) {
            throw new InvalidArgumentException(
                "No hay precio de cosecha configurado en `precios_cosecha` para lote {$loteId} año {$anio}."
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
}
