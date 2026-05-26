<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\Proveedor\EstadisticasFilterRequest;
use App\Services\Market\MarketProveedorEstadisticasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MarketProveedorReportesController extends Controller
{
    private const HEADER_FILL = '166534';
    private const ROW_ALT_FILL = 'F9FAFB';

    private const ESTADO_ETIQUETAS = [
        'pendiente'   => 'Pendiente Confirmación',
        'confirmado'  => 'Confirmado',
        'preparando'  => 'En Preparación',
        'en_transito' => 'En Tránsito',
        'entregado'   => 'Entregado',
        'cancelado'   => 'Cancelado',
    ];

    public function __construct(
        protected MarketProveedorEstadisticasService $estadisticas,
    ) {}

    /**
     * GET /api/v1/market/proveedor/reportes/ventas?formato=excel&periodo=...
     *
     * Detalle de pedidos del periodo: una fila por item.
     */
    public function ventas(EstadisticasFilterRequest $request): Response|JsonResponse
    {
        try {
            $proveedorId = (int) app('current_proveedor_id');
            [$inicio, $fin] = $this->rangoActual($request);

            $rows = DB::select("
                SELECT p.codigo, p.estado, p.fecha_pedido, p.total AS total_pedido,
                       t.nombre AS cliente,
                       i.nombre_producto, i.cantidad, i.precio_unitario, i.subtotal
                FROM market_pedidos p
                JOIN market_pedido_items i ON i.pedido_id = p.id
                JOIN tenants t ON t.id = p.tenant_id
                WHERE p.proveedor_id = :pid
                  AND p.fecha_pedido BETWEEN :a1 AND :a2
                ORDER BY p.fecha_pedido DESC, p.codigo, i.id
            ", ['pid' => $proveedorId, 'a1' => $inicio, 'a2' => $fin]);

            $headers = [
                'Código', 'Cliente', 'Fecha', 'Estado',
                'Producto', 'Cantidad', 'Precio Unit.', 'Subtotal Item', 'Total Pedido',
            ];

            $sheet = $this->nuevoSheet('Ventas', $headers);
            $ultimaColLetra = chr(65 + count($headers) - 1);

            foreach ($rows as $idx => $r) {
                $rN = $idx + 2;
                $sheet->setCellValue("A{$rN}", $r->codigo);
                $sheet->setCellValue("B{$rN}", $r->cliente);
                $sheet->setCellValue("C{$rN}", Carbon::parse($r->fecha_pedido)->format('d/m/Y'));
                $sheet->setCellValue("D{$rN}", self::ESTADO_ETIQUETAS[$r->estado] ?? $r->estado);
                $sheet->setCellValue("E{$rN}", $r->nombre_producto);
                $sheet->setCellValue("F{$rN}", (int) $r->cantidad);
                $sheet->setCellValue("G{$rN}", (float) $r->precio_unitario);
                $sheet->setCellValue("H{$rN}", (float) $r->subtotal);
                $sheet->setCellValue("I{$rN}", (float) $r->total_pedido);

                foreach (['G', 'H', 'I'] as $col) {
                    $sheet->getStyle("{$col}{$rN}")->getNumberFormat()->setFormatCode('$#,##0');
                }

                $this->aplicarFilaAlterna($sheet, $idx, $rN, $ultimaColLetra);
            }

            $this->autosizeColumnas($sheet, $ultimaColLetra);

            return $this->descargarSpreadsheet($sheet->getParent(), 'Reporte-Ventas');
        } catch (\Throwable $e) {
            return $this->errorExcel('ventas', $e);
        }
    }

    /**
     * GET /api/v1/market/proveedor/reportes/productos?formato=excel&periodo=...
     *
     * Productos del proveedor con métricas del periodo.
     */
    public function productos(EstadisticasFilterRequest $request): Response|JsonResponse
    {
        try {
            $proveedorId = (int) app('current_proveedor_id');
            [$inicio, $fin] = $this->rangoActual($request);

            $rows = DB::select("
                SELECT p.sku, p.nombre, c.nombre AS categoria,
                       p.estado, p.stock_disponible, p.precio_unitario,
                       COALESCE(v.unidades, 0)  AS unidades_periodo,
                       COALESCE(v.ingresos, 0)  AS ingresos_periodo
                FROM market_productos p
                LEFT JOIN market_categorias c ON c.id = p.categoria_id
                LEFT JOIN (
                    SELECT i.producto_id,
                           SUM(i.cantidad) AS unidades,
                           SUM(i.subtotal) AS ingresos
                    FROM market_pedido_items i
                    JOIN market_pedidos pd ON pd.id = i.pedido_id
                    WHERE pd.proveedor_id = :pid_v
                      AND pd.estado <> 'cancelado'
                      AND pd.fecha_pedido BETWEEN :a1 AND :a2
                    GROUP BY i.producto_id
                ) v ON v.producto_id = p.id
                WHERE p.proveedor_id = :pid
                ORDER BY unidades_periodo DESC, p.nombre
            ", ['pid' => $proveedorId, 'pid_v' => $proveedorId, 'a1' => $inicio, 'a2' => $fin]);

            $headers = [
                'SKU', 'Nombre', 'Categoría', 'Estado',
                'Stock', 'Precio Unitario', 'Unidades Vendidas', 'Ingresos',
            ];

            $sheet = $this->nuevoSheet('Productos', $headers);
            $ultimaColLetra = chr(65 + count($headers) - 1);

            foreach ($rows as $idx => $r) {
                $rN = $idx + 2;
                $sheet->setCellValue("A{$rN}", $r->sku ?? '—');
                $sheet->setCellValue("B{$rN}", $r->nombre);
                $sheet->setCellValue("C{$rN}", $r->categoria ?? '—');
                $sheet->setCellValue("D{$rN}", ucfirst($r->estado));
                $sheet->setCellValue("E{$rN}", (int) $r->stock_disponible);
                $sheet->setCellValue("F{$rN}", (float) $r->precio_unitario);
                $sheet->setCellValue("G{$rN}", (int) $r->unidades_periodo);
                $sheet->setCellValue("H{$rN}", (float) $r->ingresos_periodo);

                foreach (['F', 'H'] as $col) {
                    $sheet->getStyle("{$col}{$rN}")->getNumberFormat()->setFormatCode('$#,##0');
                }

                $this->aplicarFilaAlterna($sheet, $idx, $rN, $ultimaColLetra);
            }

            $this->autosizeColumnas($sheet, $ultimaColLetra);

            return $this->descargarSpreadsheet($sheet->getParent(), 'Reporte-Productos');
        } catch (\Throwable $e) {
            return $this->errorExcel('productos', $e);
        }
    }

    /**
     * GET /api/v1/market/proveedor/reportes/clientes?formato=excel&periodo=...
     *
     * Tenants compradores del proveedor con métricas del periodo.
     */
    public function clientes(EstadisticasFilterRequest $request): Response|JsonResponse
    {
        try {
            $proveedorId = (int) app('current_proveedor_id');
            [$inicio, $fin] = $this->rangoActual($request);

            $rows = DB::select("
                SELECT t.nombre, t.nit,
                       COUNT(p.id) AS total_pedidos,
                       SUM(p.total) AS total_gastado,
                       AVG(p.total) AS ticket_promedio,
                       MAX(p.fecha_pedido) AS ultimo_pedido
                FROM market_pedidos p
                JOIN tenants t ON t.id = p.tenant_id
                WHERE p.proveedor_id = :pid
                  AND p.estado <> 'cancelado'
                  AND p.fecha_pedido BETWEEN :a1 AND :a2
                GROUP BY t.id, t.nombre, t.nit
                ORDER BY total_gastado DESC
            ", ['pid' => $proveedorId, 'a1' => $inicio, 'a2' => $fin]);

            $headers = ['Cliente', 'NIT', 'Total Pedidos', 'Total Gastado', 'Ticket Promedio', 'Último Pedido'];

            $sheet = $this->nuevoSheet('Clientes', $headers);
            $ultimaColLetra = chr(65 + count($headers) - 1);

            foreach ($rows as $idx => $r) {
                $rN = $idx + 2;
                $sheet->setCellValue("A{$rN}", $r->nombre);
                $sheet->setCellValue("B{$rN}", $r->nit ?? '—');
                $sheet->setCellValue("C{$rN}", (int) $r->total_pedidos);
                $sheet->setCellValue("D{$rN}", (float) $r->total_gastado);
                $sheet->setCellValue("E{$rN}", round((float) $r->ticket_promedio, 2));
                $sheet->setCellValue("F{$rN}", $r->ultimo_pedido
                    ? Carbon::parse($r->ultimo_pedido)->format('d/m/Y')
                    : '—');

                foreach (['D', 'E'] as $col) {
                    $sheet->getStyle("{$col}{$rN}")->getNumberFormat()->setFormatCode('$#,##0');
                }

                $this->aplicarFilaAlterna($sheet, $idx, $rN, $ultimaColLetra);
            }

            $this->autosizeColumnas($sheet, $ultimaColLetra);

            return $this->descargarSpreadsheet($sheet->getParent(), 'Reporte-Clientes');
        } catch (\Throwable $e) {
            return $this->errorExcel('clientes', $e);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function rangoActual(EstadisticasFilterRequest $request): array
    {
        $rangos = $this->estadisticas->resolverRango(
            $request->input('periodo'),
            $request->input('fecha_desde'),
            $request->input('fecha_hasta'),
        );

        return $rangos['actual'];
    }

    private function nuevoSheet(string $title, array $headers): \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($title);

        foreach ($headers as $col => $header) {
            $sheet->setCellValue(chr(65 + $col) . '1', $header);
        }

        $ultima = chr(65 + count($headers) - 1);
        $sheet->getStyle("A1:{$ultima}1")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::HEADER_FILL]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        return $sheet;
    }

    private function aplicarFilaAlterna($sheet, int $idx, int $rN, string $ultimaColLetra): void
    {
        if ($idx % 2 === 0) {
            $sheet->getStyle("A{$rN}:{$ultimaColLetra}{$rN}")
                ->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB(self::ROW_ALT_FILL);
        }
    }

    private function autosizeColumnas($sheet, string $ultimaColLetra): void
    {
        foreach (range('A', $ultimaColLetra) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function descargarSpreadsheet(Spreadsheet $spreadsheet, string $nombreBase): Response
    {
        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        $filename = $nombreBase . '-' . now()->format('Y-m-d') . '.xlsx';

        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
        ]);
    }

    private function errorExcel(string $tipo, \Throwable $e): JsonResponse
    {
        Log::error("Market Proveedor: error al exportar reporte de {$tipo}: " . $e->getMessage(), [
            'proveedor_id' => app('current_proveedor_id'),
            'trace'        => $e->getTraceAsString(),
        ]);

        return response()->json([
            'message' => "Error al exportar el reporte de {$tipo}",
            'error'   => $e->getMessage(),
        ], 500);
    }
}
