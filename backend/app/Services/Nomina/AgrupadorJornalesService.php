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
 */
class AgrupadorJornalesService
{
    /**
     * @return array{
     *   cosecha:array{filas:array<int,array<string,mixed>>,subtotal_valor:float,subtotal_jornal:float,subtotal_racimos:int,subtotal_peso:float},
     *   plateo:array{filas:array<int,array<string,mixed>>,subtotal_valor:float,subtotal_jornal:float,subtotal_palmas:int},
     *   poda:array{filas:array<int,array<string,mixed>>,subtotal_valor:float,subtotal_jornal:float,subtotal_palmas:int},
     *   fertilizacion:array{filas:array<int,array<string,mixed>>,subtotal_valor:float,subtotal_jornal:float,subtotal_palmas:int},
     *   sanidad:array{filas:array<int,array<string,mixed>>,subtotal_jornal:float},
     *   otros:array{filas:array<int,array<string,mixed>>,subtotal_jornal:float},
     *   finca:array{filas:array<int,array<string,mixed>>,subtotal_jornal:float},
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
            + ($palmaPorTipo[Jornal::TIPO_OTROS]['subtotal_jornal'] ?? 0)
            + $finca['subtotal_jornal'];

        return [
            'cosecha'       => $cosecha,
            'plateo'        => $palmaPorTipo[Jornal::TIPO_PLATEO]        ?? $this->emptyPalma(),
            'poda'          => $palmaPorTipo[Jornal::TIPO_PODA]          ?? $this->emptyPalma(),
            'fertilizacion' => $palmaPorTipo[Jornal::TIPO_FERTILIZACION] ?? $this->emptyPalma(),
            'sanidad'       => $palmaPorTipo[Jornal::TIPO_SANIDAD]       ?? $this->emptyDescripcion(),
            'otros'         => $palmaPorTipo[Jornal::TIPO_OTROS]         ?? $this->emptyDescripcion(),
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
     * Agrupa jornales de PALMA por tipo (PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS).
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
            ->with(['operacion', 'lote', 'sublote', 'insumo'])
            ->orderBy('id')
            ->get()
            ->groupBy('tipo');

        $resultado = [];
        foreach ($jornales as $tipo => $items) {
            if (in_array($tipo, [Jornal::TIPO_SANIDAD, Jornal::TIPO_OTROS], true)) {
                $resultado[$tipo] = $this->mapearJornalesDescripcion($items);
            } else {
                $resultado[$tipo] = $this->mapearJornalesPalmas($items, $tipo);
            }
        }

        return $resultado;
    }

    /**
     * Para PLATEO/PODA/FERTILIZACION: incluye cantidad_palmas, precio/palma, total.
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
     * Para SANIDAD/OTROS: incluye descripción (sin cantidad_palmas).
     */
    private function mapearJornalesDescripcion($items): array
    {
        $filas = [];
        $subJornal = 0.0;

        foreach ($items as $j) {
            $valor = (float) ($j->valor_total ?? 0);
            $filas[] = [
                'fecha'          => $j->operacion?->fecha?->format('d/m/Y'),
                'lote'           => $j->lote?->nombre,
                'sublote'        => $j->sublote?->nombre,
                'descripcion'    => $j->descripcion ?? $j->nombre_trabajo,
                'nombre_trabajo' => $j->nombre_trabajo,
                'jornal'         => $valor,
            ];
            $subJornal += $valor;
        }

        return [
            'filas'           => $filas,
            'subtotal_jornal' => round($subJornal, 2),
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

    private function emptyDescripcion(): array
    {
        return ['filas' => [], 'subtotal_jornal' => 0.0];
    }
}
