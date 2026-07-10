<?php

namespace App\Http\Controllers\Api\Nomina;

use App\Http\Controllers\Controller;
use App\Models\Lote;
use App\Models\Nomina;
use App\Models\Operacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class NominaPlanillaDiariaController extends Controller
{
    // Colores de sección en Excel (verde principal de la app)
    private const COLOR_SECCION_BG = 'DCFCE7';
    private const COLOR_HEADER_BG  = '166534';
    private const COLOR_SUBTOTAL   = 'F0FDF4';
    private const COLOR_TOTAL_BG   = '14532D';
    private const COLOR_ROW_ALT    = 'F9FAFB';

    /**
     * GET /nominas/{nomina}/planilla-diaria
     *
     * Datos principales del reporte. Agrupa operaciones aprobadas del período
     * por tipo de labor, con colaboradores, valores y neto interno.
     */
    public function index(Request $request, Nomina $nomina): JsonResponse
    {
        $operaciones = $this->operacionesDePeriodo($nomina, $request);

        $cosechas    = $this->construirCosechas($operaciones, $request);
        $jornalesPor = $this->construirJornales($operaciones, $request);

        $seccionCosecha       = $this->seccion($cosechas);
        $seccionPlateo        = $this->seccion($jornalesPor['plateo']);
        $seccionPoda          = $this->seccion($jornalesPor['poda']);
        $seccionFertilizacion = $this->seccion($jornalesPor['fertilizacion']);
        $seccionSanidad       = $this->seccion($jornalesPor['sanidad']);
        $seccionOtros         = $this->seccion($jornalesPor['otros']);
        $seccionAuxiliares    = $this->seccion($jornalesPor['auxiliares']);

        $totalKilos  = $cosechas->sum(fn($r) => (float) $r['kilos']);
        $totalBruto  = collect([$seccionCosecha, $seccionPlateo, $seccionPoda,
                                $seccionFertilizacion, $seccionSanidad,
                                $seccionOtros, $seccionAuxiliares])
                        ->sum(fn($s) => (float) $s['subtotal_total']);
        $totalNeto   = collect([$seccionCosecha, $seccionPlateo, $seccionPoda,
                                $seccionFertilizacion, $seccionSanidad,
                                $seccionOtros, $seccionAuxiliares])
                        ->sum(fn($s) => (float) $s['subtotal_col_neto']);

        return response()->json([
            'data' => [
                'periodo' => [
                    'id'           => $nomina->id,
                    'nombre'       => $this->nombrePeriodo($nomina),
                    'fecha_inicio' => $nomina->fecha_inicio->toDateString(),
                    'fecha_fin'    => $nomina->fecha_fin->toDateString(),
                ],
                'secciones' => [
                    'cosecha'       => $seccionCosecha,
                    'plateo'        => $seccionPlateo,
                    'poda'          => $seccionPoda,
                    'fertilizacion' => $seccionFertilizacion,
                    'sanidad'       => $seccionSanidad,
                    'otros'         => $seccionOtros,
                    'auxiliares'    => $seccionAuxiliares,
                ],
                'totales' => [
                    'total_kilos'               => number_format($totalKilos, 2, '.', ''),
                    'total_bruto'               => number_format($totalBruto, 2, '.', ''),
                    'total_neto_colaboradores'  => number_format($totalNeto, 2, '.', ''),
                ],
            ],
        ]);
    }

    /**
     * GET /nominas/{nomina}/planilla-diaria/lotes
     *
     * Lotes únicos que aparecen en el período, para el filtro dropdown.
     */
    public function lotes(Nomina $nomina): JsonResponse
    {
        $operaciones = Operacion::query()
            ->aprobadas()
            ->enRango($nomina->fecha_inicio, $nomina->fecha_fin)
            ->with(['cosechas:id,operacion_id,lote_id', 'jornales:id,operacion_id,lote_id'])
            ->get(['id']);

        $loteIds = collect();

        foreach ($operaciones as $op) {
            $loteIds = $loteIds
                ->merge($op->cosechas->pluck('lote_id'))
                ->merge($op->jornales->pluck('lote_id'));
        }

        $lotes = Lote::whereIn('id', $loteIds->filter()->unique()->values())
            ->orderBy('nombre')
            ->get(['id', 'nombre']);

        return response()->json(['data' => $lotes]);
    }

    /**
     * GET /nominas/{nomina}/planilla-diaria/exportar
     *
     * Descarga el reporte en formato Excel (.xlsx).
     */
    public function exportar(Request $request, Nomina $nomina): Response|JsonResponse
    {
        try {
            $operaciones = $this->operacionesDePeriodo($nomina, $request);

            $cosechas    = $this->construirCosechas($operaciones, $request);
            $jornalesPor = $this->construirJornales($operaciones, $request);

            $spreadsheet = new Spreadsheet();
            $sheet       = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Planilla Diaria');

            $fila = 1;

            // Título
            $sheet->setCellValue("A{$fila}", 'Planilla Diaria de Trabajo — ' . $this->nombrePeriodo($nomina));
            $sheet->mergeCells("A{$fila}:N{$fila}");
            $sheet->getStyle("A{$fila}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 13],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $fila++;
            $fila++; // fila vacía

            // Secciones
            $secciones = [
                'COSECHA'        => $cosechas,
                'PLATEO'         => $jornalesPor['plateo'],
                'PODA'           => $jornalesPor['poda'],
                'FERTILIZACIÓN'  => $jornalesPor['fertilizacion'],
                'SANIDAD'        => $jornalesPor['sanidad'],
                'OTROS'          => $jornalesPor['otros'],
                'AUXILIARES'     => $jornalesPor['auxiliares'],
            ];

            $totalKilosGlobal = 0;
            $totalBrutoGlobal = 0;
            $totalNetoGlobal  = 0;

            foreach ($secciones as $etiqueta => $registros) {
                if ($registros->isEmpty()) {
                    continue;
                }

                $esCosecha = $etiqueta === 'COSECHA';
                $fila      = $this->escribirSeccion($sheet, $fila, $etiqueta, $registros, $esCosecha);

                $totalKilosGlobal += $esCosecha ? $registros->sum(fn($r) => (float) $r['kilos']) : 0;
                $totalBrutoGlobal += $registros->sum(fn($r) => (float) $r['total']);
                $totalNetoGlobal  += $registros->sum(fn($r) => (float) $r['col_neto']);

                $fila++; // separador entre secciones
            }

            // Totales generales
            $fila++;
            $sheet->setCellValue("A{$fila}", 'TOTALES GENERALES');
            $sheet->setCellValue("G{$fila}", 'Total Kilos');
            $sheet->setCellValue("H{$fila}", number_format($totalKilosGlobal, 2, '.', ''));
            $sheet->setCellValue("K{$fila}", 'Total Bruto');
            $sheet->setCellValue("L{$fila}", number_format($totalBrutoGlobal, 2, '.', ''));
            $sheet->getStyle("L{$fila}")->getNumberFormat()->setFormatCode('$#,##0');
            $sheet->setCellValue("M{$fila}", 'Total Neto Colaboradores');
            $sheet->setCellValue("N{$fila}", number_format($totalNetoGlobal, 2, '.', ''));
            $sheet->getStyle("N{$fila}")->getNumberFormat()->setFormatCode('$#,##0');
            $sheet->getStyle("A{$fila}:N{$fila}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_TOTAL_BG]],
            ]);

            foreach (range('A', 'N') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            $writer   = new Xlsx($spreadsheet);
            ob_start();
            $writer->save('php://output');
            $content = ob_get_clean();

            $filename = 'Planilla-Diaria-' . $nomina->fecha_inicio->format('Y-m-d') . '.xlsx';

            return response($content, 200, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al exportar la planilla diaria',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ── Lógica interna ─────────────────────────────────────────────────────

    /**
     * Carga las operaciones APROBADAS del período con todas las relaciones necesarias.
     * Aplica filtros de colaborador, lote y fecha si vienen en el request.
     */
    private function operacionesDePeriodo(Nomina $nomina, Request $request): Collection
    {
        $query = Operacion::query()
            ->aprobadas()
            ->enRango($nomina->fecha_inicio, $nomina->fecha_fin)
            ->with([
                'cosechas.cuadrilla.empleado:id,primer_nombre,primer_apellido,segundo_nombre,segundo_apellido',
                'cosechas.cuadrilla.operario:id,nombres,apellidos',
                'cosechas.cuadrilla.tercero:id,razon_social,nombre_completo,tipo_persona',
                'cosechas.lote:id,nombre',
                'jornales.empleado:id,primer_nombre,primer_apellido,segundo_nombre,segundo_apellido',
                'jornales.operario:id,nombres,apellidos',
                'jornales.tercero:id,razon_social,nombre_completo,tipo_persona',
                'jornales.labor:id,nombre,categoria,tipo',
                'jornales.lote:id,nombre',
            ]);

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->input('fecha'));
        }

        if ($request->filled('lote_id')) {
            $loteId = (int) $request->input('lote_id');
            $query->where(function ($q) use ($loteId) {
                $q->whereHas('cosechas', fn($c) => $c->where('lote_id', $loteId))
                  ->orWhereHas('jornales', fn($j) => $j->where('lote_id', $loteId));
            });
        }

        return $query->orderBy('fecha')->get();
    }

    /**
     * Construye las filas de la sección COSECHA.
     * Cada registro_cosecha = 1 fila con su cuadrilla.
     */
    private function construirCosechas(Collection $operaciones, Request $request): Collection
    {
        $buscarColaborador = $this->normalizarBusqueda($request->input('colaborador', ''));
        $loteId            = $request->filled('lote_id') ? (int) $request->input('lote_id') : null;

        $filas = collect();

        foreach ($operaciones as $operacion) {
            foreach ($operacion->cosechas as $cosecha) {
                if ($loteId && $cosecha->lote_id !== $loteId) {
                    continue;
                }

                $cuadrilla = $cosecha->cuadrilla->sortBy('empleado_id'); // internos primero

                $colaboradores = $cuadrilla->map(fn($c) => $this->mapColaborador($c))->values();

                if ($buscarColaborador && !$this->cuadrillaContieneNombre($colaboradores, $buscarColaborador)) {
                    continue;
                }

                $numColab     = $cuadrilla->count();
                $valorTotal   = $cosecha->valor_total !== null ? (float) $cosecha->valor_total : null;
                $pagoPorColab = ($valorTotal !== null && $numColab > 0)
                    ? round($valorTotal / $numColab, 2)
                    : null;

                // col_neto: suma valor_calculado de cuadrilleros INTERNOS (empleado_id NOT NULL)
                $colNeto = $cuadrilla
                    ->filter(fn($c) => $c->empleado_id !== null)
                    ->sum(fn($c) => (float) ($c->valor_calculado ?? 0));

                $filas->push([
                    'id'                   => $cosecha->id,
                    'fecha'                => $operacion->fecha->toDateString(),
                    'lote'                 => $cosecha->lote?->nombre,
                    'colaboradores'        => $colaboradores,
                    'gajos'                => $cosecha->gajos_reconteo ?? $cosecha->gajos_reportados,
                    'kilos'                => $cosecha->peso_confirmado !== null
                                                ? number_format((float) $cosecha->peso_confirmado, 2, '.', '')
                                                : null,
                    'promedio'             => $cosecha->promedio_kg_gajo !== null
                                                ? number_format((float) $cosecha->promedio_kg_gajo, 2, '.', '')
                                                : null,
                    'precio'               => $cosecha->precio_cosecha !== null
                                                ? number_format((float) $cosecha->precio_cosecha, 2, '.', '')
                                                : null,
                    'total'                => $valorTotal !== null
                                                ? number_format($valorTotal, 2, '.', '')
                                                : null,
                    'num_colaboradores'    => $numColab,
                    'pago_por_colaborador' => $pagoPorColab !== null
                                                ? number_format($pagoPorColab, 2, '.', '')
                                                : null,
                    'col_neto'             => number_format($colNeto, 2, '.', ''),
                ]);
            }
        }

        return $filas;
    }

    /**
     * Construye las filas de todas las secciones de jornales.
     * Agrupa por (operacion_id, labor_id, lote_id).
     */
    private function construirJornales(Collection $operaciones, Request $request): array
    {
        $buscarColaborador = $this->normalizarBusqueda($request->input('colaborador', ''));
        $loteId            = $request->filled('lote_id') ? (int) $request->input('lote_id') : null;

        // Recopilar todos los jornales activos de las operaciones
        $todosJornales = collect();
        foreach ($operaciones as $operacion) {
            foreach ($operacion->jornales->where('estado', true) as $jornal) {
                if ($loteId && $jornal->lote_id !== $loteId) {
                    continue;
                }
                $jornal->_fecha = $operacion->fecha->toDateString();
                $todosJornales->push($jornal);
            }
        }

        // Agrupar por (operacion_id, labor_id, lote_id)
        $grupos = $todosJornales->groupBy(fn($j) => "{$j->operacion_id}_{$j->labor_id}_{$j->lote_id}");

        $secciones = [
            'plateo'        => collect(),
            'poda'          => collect(),
            'fertilizacion' => collect(),
            'sanidad'       => collect(),
            'otros'         => collect(),
            'auxiliares'    => collect(),
        ];

        foreach ($grupos as $grupoJornales) {
            $primero = $grupoJornales->first();
            $labor   = $primero->labor;

            $colaboradores = $grupoJornales->map(fn($j) => $this->mapColaboradorJornal($j))->values();

            if ($buscarColaborador && !$this->cuadrillaContieneNombre($colaboradores, $buscarColaborador)) {
                continue;
            }

            $totalGrupo   = $grupoJornales->sum(fn($j) => (float) ($j->valor_total ?? 0));
            $colNetoGrupo = $grupoJornales
                ->filter(fn($j) => $j->empleado_id !== null)
                ->sum(fn($j) => (float) ($j->valor_total ?? 0));

            $fila = [
                'id'                   => $primero->id,
                'fecha'                => $primero->_fecha,
                'lote'                 => $primero->lote?->nombre,
                'labor'                => $labor?->nombre,
                'colaboradores'        => $colaboradores,
                'precio'               => $primero->valor_unitario !== null
                                            ? number_format((float) $primero->valor_unitario, 2, '.', '')
                                            : null,
                'total'                => number_format($totalGrupo, 2, '.', ''),
                'num_colaboradores'    => $grupoJornales->count(),
                'pago_por_colaborador' => $primero->valor_unitario !== null
                                            ? number_format((float) $primero->valor_unitario, 2, '.', '')
                                            : null,
                'col_neto'             => number_format($colNetoGrupo, 2, '.', ''),
            ];

            $bucket = $this->bucketJornal($primero);
            $secciones[$bucket]->push($fila);
        }

        // Ordenar cada sección por fecha
        foreach ($secciones as $key => $col) {
            $secciones[$key] = $col->sortBy('fecha')->values();
        }

        return $secciones;
    }

    /**
     * Envuelve una colección de filas en la forma estándar de sección.
     */
    private function seccion(Collection $registros): array
    {
        $subtotalTotal   = $registros->sum(fn($r) => (float) $r['total']);
        $subtotalColNeto = $registros->sum(fn($r) => (float) $r['col_neto']);

        return [
            'count'             => $registros->count(),
            'registros'         => $registros->values(),
            'subtotal_total'    => number_format($subtotalTotal, 2, '.', ''),
            'subtotal_col_neto' => number_format($subtotalColNeto, 2, '.', ''),
        ];
    }

    /**
     * Determina el bucket al que pertenece un jornal según su categoria/tipo.
     */
    private function bucketJornal(object $jornal): string
    {
        if ($jornal->categoria === 'FINCA') {
            return 'auxiliares';
        }

        return match ($jornal->tipo) {
            'PLATEO'        => 'plateo',
            'PODA'          => 'poda',
            'FERTILIZACION' => 'fertilizacion',
            'SANIDAD'       => 'sanidad',
            default         => 'otros', // tipo=NULL → labores custom palma
        };
    }

    /**
     * Escribe una sección en el sheet de Excel y retorna la siguiente fila disponible.
     */
    private function escribirSeccion(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet,
        int $fila,
        string $etiqueta,
        Collection $registros,
        bool $esCosecha
    ): int {
        // Encabezado de sección
        $sheet->setCellValue("A{$fila}", $etiqueta);
        $sheet->mergeCells("A{$fila}:N{$fila}");
        $sheet->getStyle("A{$fila}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => '14532D']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_SECCION_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $fila++;

        // Headers de columnas
        if ($esCosecha) {
            $headers = ['FECHA', 'COL. 1', 'COL. 2', 'COL. 3', 'CUADRILLA', 'LOTE',
                        'Nº GAJOS', 'KILOS', 'PROMEDIO', 'PRECIO', 'TOTAL',
                        'COLAB.', 'PAGO X COLAB.', '$ COL NETO'];
        } else {
            $headers = ['FECHA', 'COL. 1', 'COL. 2', 'COL. 3', 'CUADRILLA', 'LOTE',
                        'LABOR', '', '', 'PRECIO', 'TOTAL',
                        'COLAB.', 'PAGO X COLAB.', '$ COL NETO'];
        }

        foreach ($headers as $i => $h) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}{$fila}", $h);
        }
        $sheet->getStyle("A{$fila}:N{$fila}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $fila++;

        // Filas de datos
        foreach ($registros as $idx => $r) {
            $cols = $r['colaboradores'];
            $col1 = $cols[0]['nombre'] ?? '';
            $col2 = $cols[1]['nombre'] ?? '-';
            $col3 = $cols[2]['nombre'] ?? '-';
            $extra = collect($cols)->slice(3)->pluck('nombre')->implode(', ');

            $sheet->setCellValue("A{$fila}", $r['fecha']);
            $sheet->setCellValue("B{$fila}", $col1);
            $sheet->setCellValue("C{$fila}", $col2);
            $sheet->setCellValue("D{$fila}", $col3);
            $sheet->setCellValue("E{$fila}", $extra ?: '-');
            $sheet->setCellValue("F{$fila}", $r['lote'] ?? '-');

            if ($esCosecha) {
                $sheet->setCellValue("G{$fila}", $r['gajos']);
                $sheet->setCellValue("H{$fila}", $r['kilos'] ?? '-');
                $sheet->setCellValue("I{$fila}", $r['promedio'] ?? '-');
            } else {
                $sheet->setCellValue("G{$fila}", $r['labor'] ?? '-');
            }

            $sheet->setCellValue("J{$fila}", (float) ($r['precio'] ?? 0));
            $sheet->setCellValue("K{$fila}", (float) $r['total']);
            $sheet->setCellValue("L{$fila}", $r['num_colaboradores']);
            $sheet->setCellValue("M{$fila}", (float) ($r['pago_por_colaborador'] ?? 0));
            $sheet->setCellValue("N{$fila}", (float) $r['col_neto']);

            foreach (['J', 'K', 'M', 'N'] as $c) {
                $sheet->getStyle("{$c}{$fila}")->getNumberFormat()->setFormatCode('$#,##0');
            }

            if ($idx % 2 === 0) {
                $sheet->getStyle("A{$fila}:N{$fila}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB(self::COLOR_ROW_ALT);
            }

            $fila++;
        }

        // Subtotal de sección
        $subtotalTotal = $registros->sum(fn($r) => (float) $r['total']);
        $subtotalNeto  = $registros->sum(fn($r) => (float) $r['col_neto']);

        $sheet->setCellValue("A{$fila}", "Subtotal {$etiqueta}");
        $sheet->setCellValue("K{$fila}", $subtotalTotal);
        $sheet->setCellValue("N{$fila}", $subtotalNeto);
        $sheet->getStyle("K{$fila}")->getNumberFormat()->setFormatCode('$#,##0');
        $sheet->getStyle("N{$fila}")->getNumberFormat()->setFormatCode('$#,##0');
        $sheet->getStyle("A{$fila}:N{$fila}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_SUBTOTAL]],
        ]);
        $fila++;

        return $fila;
    }

    // ── Helpers de mapeo y formato ──────────────────────────────────────────

    private function mapColaborador(object $cuadrillero): array
    {
        if ($cuadrillero->empleado_id !== null && $cuadrillero->empleado) {
            $e = $cuadrillero->empleado;
            return [
                'id'     => $e->id,
                'nombre' => trim("{$e->primer_nombre} {$e->primer_apellido}"),
                'tipo'   => 'empleado',
            ];
        }

        if ($cuadrillero->operario_id !== null && $cuadrillero->operario) {
            $o = $cuadrillero->operario;
            $t = $cuadrillero->tercero;
            return [
                'id'             => $o->id,
                'nombre'         => trim("{$o->nombres} {$o->apellidos}"),
                'tipo'           => 'operario',
                'tercero_nombre' => $t ? ($t->tipo_persona === 'NATURAL'
                    ? $t->nombre_completo
                    : $t->razon_social) : null,
            ];
        }

        return ['id' => null, 'nombre' => '—', 'tipo' => 'desconocido'];
    }

    private function mapColaboradorJornal(object $jornal): array
    {
        if ($jornal->empleado_id !== null && $jornal->empleado) {
            $e = $jornal->empleado;
            return [
                'id'     => $e->id,
                'nombre' => trim("{$e->primer_nombre} {$e->primer_apellido}"),
                'tipo'   => 'empleado',
            ];
        }

        if ($jornal->operario_id !== null && $jornal->operario) {
            $o = $jornal->operario;
            $t = $jornal->tercero;
            return [
                'id'             => $o->id,
                'nombre'         => trim("{$o->nombres} {$o->apellidos}"),
                'tipo'           => 'operario',
                'tercero_nombre' => $t ? ($t->tipo_persona === 'NATURAL'
                    ? $t->nombre_completo
                    : $t->razon_social) : null,
            ];
        }

        return ['id' => null, 'nombre' => '—', 'tipo' => 'desconocido'];
    }

    private function cuadrillaContieneNombre(Collection $colaboradores, string $busqueda): bool
    {
        return $colaboradores->contains(
            fn($c) => str_contains(mb_strtolower($c['nombre']), $busqueda)
        );
    }

    private function normalizarBusqueda(string $valor): string
    {
        return mb_strtolower(trim($valor));
    }

    private function nombrePeriodo(Nomina $nomina): string
    {
        $meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        $mes  = $meses[$nomina->mes] ?? $nomina->mes;
        $anio = $nomina->anio;

        if ($nomina->tipo_pago_snapshot === 'MENSUAL' || $nomina->quincena === null) {
            return "Planilla {$mes} {$anio}";
        }

        $q = $nomina->quincena === 1
            ? $nomina->fecha_inicio->day . '–' . $nomina->fecha_fin->day
            : $nomina->fecha_inicio->day . '–' . $nomina->fecha_fin->day;

        return "Planilla {$q} {$mes} {$anio}";
    }
}
