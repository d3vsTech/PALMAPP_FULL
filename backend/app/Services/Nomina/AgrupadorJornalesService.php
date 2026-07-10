<?php

namespace App\Services\Nomina;

use App\Models\CosechaCuadrilla;
use App\Models\Empleado;
use App\Models\Jornal;
use App\Models\Operacion;
use Illuminate\Support\Carbon;

/**
 * Construye el "Resumen de Trabajo - Planilla Diaria" del desprendible
 * para empleados VARIABLE: agrupa jornales y cosechas por categoría/tipo
 * con sus subtotales, en el formato exacto que muestra la UI.
 *
 * Solo incluye operaciones APROBADAS (estado=APROBADA).
 *
 * Post-unificación de labores: el bucket "otros" agrupa los jornales de palma
 * que no son de las 5 fijas (PLATEO, PODA, FERTILIZACION, SANIDAD), es decir
 * los jornales con `categoria='PALMA' AND tipo IS NULL` (labores custom de palma).
 */
class AgrupadorJornalesService
{
    /**
     * Clave interna usada para agrupar los jornales custom de palma (tipo NULL).
     */
    private const BUCKET_OTROS = 'OTROS';

    /**
     * @return array{
     *   cosecha:array,
     *   plateo:array,
     *   poda:array,
     *   fertilizacion:array,
     *   sanidad:array,
     *   otros:array,
     *   finca:array,
     *   total_general:float
     * }
     */
    public function paraEmpleadoEnRango(int $empleadoId, Carbon $inicio, Carbon $fin): array
    {
        $cosecha = $this->agruparCosecha($empleadoId, $inicio, $fin);
        $palmaPorTipo = $this->agruparJornalesPalma($empleadoId, $inicio, $fin);
        $finca = $this->agruparFinca($empleadoId, $inicio, $fin);

        $totalGeneral = $cosecha['subtotal_jornal']
            + ($palmaPorTipo[Jornal::TIPO_PLATEO]['subtotal_jornal'] ?? 0)
            + ($palmaPorTipo[Jornal::TIPO_PODA]['subtotal_jornal'] ?? 0)
            + ($palmaPorTipo[Jornal::TIPO_FERTILIZACION]['subtotal_jornal'] ?? 0)
            + ($palmaPorTipo[Jornal::TIPO_SANIDAD]['subtotal_jornal'] ?? 0)
            + ($palmaPorTipo[self::BUCKET_OTROS]['subtotal_jornal'] ?? 0)
            + $finca['subtotal_jornal'];

        return [
            'cosecha'       => $cosecha,
            'plateo'        => $palmaPorTipo[Jornal::TIPO_PLATEO]        ?? $this->emptyPalma(),
            'poda'          => $palmaPorTipo[Jornal::TIPO_PODA]          ?? $this->emptyPalma(),
            'fertilizacion' => $palmaPorTipo[Jornal::TIPO_FERTILIZACION] ?? $this->emptyPalma(),
            'sanidad'       => $palmaPorTipo[Jornal::TIPO_SANIDAD]       ?? $this->emptyMixto(),
            'otros'         => $palmaPorTipo[self::BUCKET_OTROS]         ?? $this->emptyOtros(),
            'finca'         => $finca,
            'total_general' => round($totalGeneral, 2),
        ];
    }

    private function agruparCosecha(int $empleadoId, Carbon $inicio, Carbon $fin): array
    {
        $cuadrillas = CosechaCuadrilla::where('empleado_id', $empleadoId)
            ->where('estado', true)
            ->whereHas('cosecha.operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->with(['cosecha.operacion', 'cosecha.lote', 'cosecha.sublote'])
            ->get();

        $filas = [];
        $subValor = 0.0;
        $subJornal = 0.0;
        $subRacimos = 0;
        $subPeso = 0.0;

        foreach ($cuadrillas as $cc) {
            $cosecha = $cc->cosecha;
            $racimos = (int) ($cosecha->gajos_reportados ?? 0);
            $peso    = (float) ($cosecha->peso_confirmado ?? 0);
            $promedio = (float) ($cosecha->promedio_kg_gajo ?? 0);
            $precio  = (float) ($cosecha->precio_cosecha ?? 0);
            $valor   = (float) ($cosecha->valor_total ?? 0);
            $jornal  = (float) ($cc->valor_calculado ?? 0);

            $filas[] = [
                'fecha'         => $cosecha->operacion?->fecha?->format('d/m/Y'),
                'lote'          => $cosecha->lote?->nombre,
                'sublote'       => $cosecha->sublote?->nombre,
                'cosecha'       => 'C-' . str_pad((string) $cosecha->id, 4, '0', STR_PAD_LEFT),
                'racimos'       => $racimos,
                'promedio_kg'   => $promedio,
                'peso_kg'       => $peso,
                'precio_kg'     => $precio,
                'total_cosecha' => $valor,
                'jornal'        => $jornal,
            ];

            $subValor   += $valor;
            $subJornal  += $jornal;
            $subRacimos += $racimos;
            $subPeso    += $peso;
        }

        return [
            'filas'             => $filas,
            'subtotal_valor'    => round($subValor, 2),
            'subtotal_jornal'   => round($subJornal, 2),
            'subtotal_racimos'  => $subRacimos,
            'subtotal_peso'     => round($subPeso, 2),
        ];
    }

    /**
     * Agrupa jornales de PALMA por tipo:
     *   - tipo IN (PLATEO, PODA, FERTILIZACION, SANIDAD): fijas del sistema.
     *   - tipo IS NULL: labor custom de palma → bucket "OTROS".
     */
    private function agruparJornalesPalma(int $empleadoId, Carbon $inicio, Carbon $fin): array
    {
        $jornales = Jornal::where('empleado_id', $empleadoId)
            ->where('estado', true)
            ->where('categoria', Jornal::CATEGORIA_PALMA)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->with(['operacion', 'lote', 'sublote', 'insumo', 'labor'])
            ->orderBy('id')
            ->get()
            ->groupBy(fn($j) => $j->tipo ?? self::BUCKET_OTROS);

        $resultado = [];
        foreach ($jornales as $tipo => $items) {
            $resultado[$tipo] = match (true) {
                $tipo === Jornal::TIPO_FERTILIZACION                       => $this->mapearJornalesPalmas($items, $tipo),
                in_array($tipo, [Jornal::TIPO_PLATEO, Jornal::TIPO_PODA]) => $this->mapearJornalesMixto($items, $tipo),
                $tipo === Jornal::TIPO_SANIDAD                            => $this->mapearJornalesMixto($items, $tipo),
                $tipo === self::BUCKET_OTROS                              => $this->mapearJornalesOtros($items),
                default                                                    => $this->mapearJornalesOtros($items),
            };
        }

        return $resultado;
    }

    /**
     * Para FERTILIZACION: siempre por palma (sin ambigüedad).
     */
    private function mapearJornalesPalmas($items, string $tipo): array
    {
        $filas = [];
        $subValor = 0.0;
        $subJornal = 0.0;
        $subPalmas = 0;

        foreach ($items as $j) {
            $palmas = (int) ($j->cantidad_palmas ?? 0);
            $precio = (float) ($j->valor_unitario ?? 0);
            $valor  = (float) ($j->valor_total ?? 0);

            $fila = [
                'fecha'         => $j->operacion?->fecha?->format('d/m/Y'),
                'lote'          => $j->lote?->nombre,
                'sublote'       => $j->sublote?->nombre,
                'palmas'        => $palmas,
                'precio_palma'  => $precio,
                'total_palmas'  => $valor,
                'jornal'        => $valor,
            ];

            if ($tipo === Jornal::TIPO_FERTILIZACION) {
                $fila['insumo']           = $j->insumo?->nombre;
                $fila['gramos_por_palma'] = (int) ($j->gramos_por_palma ?? 0);
            }

            $filas[] = $fila;
            $subValor += $valor;
            $subJornal += $valor;
            $subPalmas += $palmas;
        }

        return [
            'filas'           => $filas,
            'subtotal_valor'  => round($subValor, 2),
            'subtotal_jornal' => round($subJornal, 2),
            'subtotal_palmas' => $subPalmas,
        ];
    }

    /**
     * Para PLATEO/PODA/SANIDAD: tipo_pago puede ser POR_PALMA o JORNAL_FIJO.
     * Heurística histórica: cantidad_palmas IS NOT NULL → fue calculado como POR_PALMA.
     * Usa el valor guardado en el jornal (inmune a cambios de configuración posteriores).
     */
    private function mapearJornalesMixto($items, string $tipo): array
    {
        $filas = [];
        $subValor  = 0.0;
        $subJornal = 0.0;
        $subPalmas = 0;

        foreach ($items as $j) {
            $valor  = (float) ($j->valor_total ?? 0);
            $palmas = $j->cantidad_palmas !== null ? (int) $j->cantidad_palmas : null;

            if ($palmas !== null) {
                // POR_PALMA
                $fila = [
                    'fecha'          => $j->operacion?->fecha?->format('d/m/Y'),
                    'lote'           => $j->lote?->nombre,
                    'sublote'        => $j->sublote?->nombre,
                    'palmas'         => $palmas,
                    'precio_palma'   => (float) ($j->valor_unitario ?? 0),
                    'total_palmas'   => $valor,
                    'jornal'         => $valor,
                    'es_por_palma'   => true,
                ];
                $subPalmas += $palmas;
                $subValor  += $valor;
            } else {
                // JORNAL_FIJO
                $fila = [
                    'fecha'          => $j->operacion?->fecha?->format('d/m/Y'),
                    'lote'           => $j->lote?->nombre,
                    'sublote'        => $j->sublote?->nombre,
                    'descripcion'    => $j->descripcion ?? $j->nombre_trabajo,
                    'jornal'         => $valor,
                    'es_por_palma'   => false,
                ];
                if ($tipo === Jornal::TIPO_SANIDAD) {
                    $fila['nombre_trabajo'] = $j->nombre_trabajo;
                }
            }

            $filas[]    = $fila;
            $subJornal += $valor;
        }

        return [
            'filas'           => $filas,
            'subtotal_valor'  => round($subValor, 2),
            'subtotal_jornal' => round($subJornal, 2),
            'subtotal_palmas' => $subPalmas,
        ];
    }

    /**
     * Bucket OTROS: labor custom de palma (tipo IS NULL).
     * El nombre de la labor se lee de $j->labor (no había antes "labor_palma").
     */
    private function mapearJornalesOtros($items): array
    {
        $filas = [];
        $subJornal = 0.0;
        $subPalmas = 0;

        foreach ($items as $j) {
            $valor  = (float) ($j->valor_total ?? 0);
            $palmas = $j->cantidad_palmas !== null ? (int) $j->cantidad_palmas : null;
            $nombreLabor = $j->labor?->nombre;

            if ($palmas !== null) {
                // POR_PALMA (catálogo custom o legado reconfigurado)
                $fila = [
                    'fecha'        => $j->operacion?->fecha?->format('d/m/Y'),
                    'lote'         => $j->lote?->nombre,
                    'sublote'      => $j->sublote?->nombre,
                    'nombre'       => $nombreLabor ?? $j->nombre_trabajo,
                    'palmas'       => $palmas,
                    'precio_palma' => (float) ($j->valor_unitario ?? 0),
                    'total_palmas' => $valor,
                    'jornal'       => $valor,
                    'es_por_palma' => true,
                ];
                $subPalmas += $palmas;
            } else {
                // JORNAL_FIJO
                $fila = [
                    'fecha'          => $j->operacion?->fecha?->format('d/m/Y'),
                    'lote'           => $j->lote?->nombre,
                    'sublote'        => $j->sublote?->nombre,
                    'descripcion'    => $nombreLabor ?? $j->nombre_trabajo ?? $j->descripcion,
                    'nombre_trabajo' => $j->nombre_trabajo,
                    'jornal'         => $valor,
                    'es_por_palma'   => false,
                ];
            }

            $filas[]    = $fila;
            $subJornal += $valor;
        }

        return [
            'filas'           => $filas,
            'subtotal_jornal' => round($subJornal, 2),
            'subtotal_palmas' => $subPalmas,
        ];
    }

    private function agruparFinca(int $empleadoId, Carbon $inicio, Carbon $fin): array
    {
        $jornales = Jornal::where('empleado_id', $empleadoId)
            ->where('estado', true)
            ->where('categoria', Jornal::CATEGORIA_FINCA)
            ->whereHas('operacion', function ($q) use ($inicio, $fin) {
                $q->where('estado', Operacion::ESTADO_APROBADA)
                  ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);
            })
            ->with(['operacion', 'labor'])
            ->orderBy('id')
            ->get();

        $filas = [];
        $subJornal = 0.0;
        foreach ($jornales as $j) {
            $valor = (float) ($j->valor_total ?? 0);
            $filas[] = [
                'fecha'    => $j->operacion?->fecha?->format('d/m/Y'),
                'labor'    => $j->labor?->nombre,
                'lugar'    => $j->ubicacion,
                'jornal'   => $valor,
            ];
            $subJornal += $valor;
        }

        return [
            'filas'           => $filas,
            'subtotal_jornal' => round($subJornal, 2),
        ];
    }

    private function emptyPalma(): array
    {
        return [
            'filas'           => [],
            'subtotal_valor'  => 0.0,
            'subtotal_jornal' => 0.0,
            'subtotal_palmas' => 0,
        ];
    }

    private function emptyMixto(): array
    {
        return [
            'filas'           => [],
            'subtotal_valor'  => 0.0,
            'subtotal_jornal' => 0.0,
            'subtotal_palmas' => 0,
        ];
    }

    private function emptyOtros(): array
    {
        return [
            'filas'           => [],
            'subtotal_jornal' => 0.0,
            'subtotal_palmas' => 0,
        ];
    }
}
