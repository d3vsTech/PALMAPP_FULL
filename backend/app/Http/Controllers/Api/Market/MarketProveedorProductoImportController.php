<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\ImportarProductosRequest;
use App\Jobs\ProcesarImportacionProductosJob;
use App\Models\Market\ImportacionProductos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MarketProveedorProductoImportController extends Controller
{
    /**
     * POST /api/v1/market/proveedor/productos/importar
     * Recibe un ZIP con productos.xlsx + carpeta imagenes/ y dispara el job en background.
     */
    public function importar(ImportarProductosRequest $request): JsonResponse
    {
        try {
            $proveedorId = app('current_proveedor_id');
            $user        = $request->user();
            $file        = $request->file('archivo');

            $path = $file->storeAs(
                "market/importaciones/{$proveedorId}",
                now()->format('Ymd_His') . '_' . Str::uuid() . '.' . $file->getClientOriginalExtension(),
                'local'
            );

            $importacion = ImportacionProductos::create([
                'proveedor_id'            => $proveedorId,
                'user_id'                 => $user->id,
                'nombre_archivo_original' => $file->getClientOriginalName(),
                'archivo_path'            => $path,
                'estado'                  => ImportacionProductos::ESTADO_PENDIENTE,
            ]);

            ProcesarImportacionProductosJob::dispatch(
                importacionId: $importacion->id,
                proveedorId:   $proveedorId,
                userId:        $user->id,
                userName:      $user->name,
                userEmail:     $user->email,
                userIp:        $request->ip() ?? '',
                userAgent:     $request->userAgent() ?? '',
            );

            return response()->json([
                'message' => 'Importación iniciada. Consulte el estado con el ID devuelto.',
                'data'    => [
                    'importacion_id' => $importacion->id,
                    'estado'         => $importacion->estado,
                ],
            ], 202);
        } catch (\Throwable $e) {
            Log::error('Error al iniciar importación masiva de productos: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo iniciar la importación.',
                'code'    => 'IMPORTACION_INIT_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/productos/importaciones/{importacion}
     * Consulta el estado de una importación previa del proveedor actual.
     */
    public function estado(Request $request, ImportacionProductos $importacion): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        if ($importacion->proveedor_id !== $proveedorId) {
            return response()->json([
                'message' => 'Importación no encontrada.',
                'code'    => 'IMPORTACION_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id'                      => $importacion->id,
                'estado'                  => $importacion->estado,
                'nombre_archivo_original' => $importacion->nombre_archivo_original,
                'total_filas'             => $importacion->total_filas,
                'filas_exitosas'          => $importacion->filas_exitosas,
                'filas_fallidas'          => $importacion->filas_fallidas,
                'error_fatal'             => $importacion->error_fatal,
                'resultados'              => $importacion->resultados,
                'iniciado_at'             => $importacion->iniciado_at,
                'finalizado_at'           => $importacion->finalizado_at,
                'created_at'              => $importacion->created_at,
            ],
        ]);
    }

    /**
     * GET /api/v1/market/proveedor/productos/importar/plantilla
     * Genera y descarga un Excel vacío con las cabeceras y una fila de ejemplo.
     */
    public function descargarPlantilla(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Productos');

        $cabeceras = [
            'A' => 'NOMBRE',
            'B' => 'DESCRIPCION',
            'C' => 'CATEGORIA_ID',
            'D' => 'UNIDAD_MEDIDA_ID',
            'E' => 'PRECIO_UNITARIO',
            'F' => 'STOCK_DISPONIBLE',
            'G' => 'STOCK_MINIMO',
            'H' => 'SKU',
            'I' => 'ESTADO',
            'J' => 'DESTACADO',
            'K' => 'ESPECIFICACIONES',
            'L' => 'IMAGEN_PRINCIPAL',
            'M' => 'IMAGENES_GALERIA',
        ];

        foreach ($cabeceras as $col => $label) {
            $sheet->setCellValue("{$col}1", $label);
        }

        $headerRange = 'A1:M1';
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('2E7D32');
        $sheet->getStyle($headerRange)->getFont()->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $ejemplo = [
            'Tomate cherry orgánico 500g',
            'Tomate cherry cultivado sin pesticidas en Boyacá.',
            1,
            1,
            12500.00,
            100,
            10,
            'TOM-CHE-001',
            'activo',
            1,
            'peso:500g|origen:Boyacá|organico:si',
            'tomate-cherry-001.jpg',
            'tomate-cherry-001-b.jpg|tomate-cherry-001-c.jpg',
        ];

        $sheet->fromArray($ejemplo, null, 'A2');

        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->freezePane('A2');

        $writer   = new Xlsx($spreadsheet);
        $filename = 'plantilla_productos.xlsx';

        return response()->streamDownload(
            function () use ($writer) {
                $writer->save('php://output');
            },
            $filename,
            [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control'       => 'no-store, no-cache, must-revalidate',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]
        );
    }
}
