<?php

namespace App\Jobs;

use App\Models\Auditoria;
use App\Models\Market\ImportacionProductos;
use App\Models\Market\MarketProducto;
use App\Models\Market\MarketProductoImagen;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\File;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;
use ZipArchive;

class ProcesarImportacionProductosJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    private const MAX_FILAS         = 500;
    private const CHUNK_SIZE        = 50;
    private const MAX_IMG_BYTES     = 3 * 1024 * 1024;
    private const MIMES_PERMITIDOS  = ['jpg', 'jpeg', 'png', 'webp'];

    private ?string $tmpDir = null;

    /** Imágenes copiadas al disco public en la transacción en curso (para rollback manual). */
    private array $imagenesEnTransaccion = [];

    public function __construct(
        public int    $importacionId,
        public int    $proveedorId,
        public int    $userId,
        public string $userName,
        public string $userEmail,
        public string $userIp,
        public string $userAgent,
    ) {}

    public function handle(): void
    {
        $importacion = ImportacionProductos::find($this->importacionId);

        if (!$importacion || $importacion->isTerminal()) {
            return;
        }

        $importacion->update([
            'estado'      => ImportacionProductos::ESTADO_PROCESANDO,
            'iniciado_at' => now(),
        ]);

        try {
            $zipPath = Storage::disk('local')->path($importacion->archivo_path);

            $this->tmpDir = Storage::disk('local')->path(
                "market/importaciones/{$this->proveedorId}/tmp_" . Str::uuid()
            );

            $this->extraerZip($zipPath, $this->tmpDir);

            $this->validarEstructuraZip($this->tmpDir);

            $excelPath = $this->tmpDir . DIRECTORY_SEPARATOR . 'productos.xlsx';
            $rows      = $this->leerExcel($excelPath);

            if (count($rows) > self::MAX_FILAS) {
                $importacion->update([
                    'estado'        => ImportacionProductos::ESTADO_FALLIDO,
                    'error_fatal'   => 'El archivo excede el límite de ' . self::MAX_FILAS . ' filas permitidas por importación.',
                    'finalizado_at' => now(),
                ]);
                return;
            }

            $importacion->update(['total_filas' => count($rows)]);

            $allResultados = [];
            $totalExitosas = 0;
            $totalFallidas = 0;

            foreach (array_chunk($rows, self::CHUNK_SIZE, true) as $chunk) {
                [$chunkResultados, $chunkExitosas, $chunkFallidas] = $this->processChunk($chunk);

                $allResultados  = array_merge($allResultados, $chunkResultados);
                $totalExitosas += $chunkExitosas;
                $totalFallidas += $chunkFallidas;

                $importacion->update([
                    'filas_exitosas' => $totalExitosas,
                    'filas_fallidas' => $totalFallidas,
                    'resultados'     => $allResultados,
                ]);

                unset($chunk, $chunkResultados);
            }

            $estadoFinal = $totalFallidas === 0
                ? ImportacionProductos::ESTADO_COMPLETADO
                : ($totalExitosas === 0
                    ? ImportacionProductos::ESTADO_FALLIDO
                    : ImportacionProductos::ESTADO_CON_ERRORES);

            $importacion->update([
                'estado'        => $estadoFinal,
                'finalizado_at' => now(),
            ]);

            $this->registrarAuditoria($importacion, $totalExitosas, $totalFallidas);

        } catch (ImportacionEstructuraInvalidaException $e) {
            $importacion->update([
                'estado'        => ImportacionProductos::ESTADO_FALLIDO,
                'error_fatal'   => $e->getMessage(),
                'finalizado_at' => now(),
            ]);
        } catch (Throwable $e) {
            $importacion->update([
                'estado'        => ImportacionProductos::ESTADO_FALLIDO,
                'error_fatal'   => 'Error fatal al procesar el archivo: ' . $e->getMessage(),
                'finalizado_at' => now(),
            ]);
            Log::error('ProcesarImportacionProductosJob falló', [
                'importacion_id' => $this->importacionId,
                'proveedor_id'   => $this->proveedorId,
                'exception'      => $e->getMessage(),
                'trace'          => $e->getTraceAsString(),
            ]);
        } finally {
            $this->limpiarTmp();
        }
    }

    // ─── Extracción y validación del ZIP ─────────────────

    private function extraerZip(string $zipPath, string $destino): void
    {
        if (!class_exists(ZipArchive::class)) {
            throw new ImportacionEstructuraInvalidaException(
                'La extensión PHP "zip" no está habilitada en el servidor.'
            );
        }

        $zip = new ZipArchive();
        $res = $zip->open($zipPath);

        if ($res !== true) {
            throw new ImportacionEstructuraInvalidaException(
                'No se pudo abrir el archivo ZIP (código: ' . $res . ').'
            );
        }

        if (!is_dir($destino) && !mkdir($destino, 0775, true) && !is_dir($destino)) {
            $zip->close();
            throw new \RuntimeException("No se pudo crear el directorio temporal: {$destino}");
        }

        $zip->extractTo($destino);
        $zip->close();
    }

    private function validarEstructuraZip(string $tmpDir): void
    {
        $excelPath  = $tmpDir . DIRECTORY_SEPARATOR . 'productos.xlsx';
        $imagenesDir = $tmpDir . DIRECTORY_SEPARATOR . 'imagenes';

        if (!is_file($excelPath)) {
            throw new ImportacionEstructuraInvalidaException(
                'El ZIP no contiene el archivo "productos.xlsx" en la raíz.'
            );
        }

        if (!is_dir($imagenesDir)) {
            throw new ImportacionEstructuraInvalidaException(
                'El ZIP no contiene la carpeta "imagenes/" en la raíz.'
            );
        }
    }

    // ─── Lectura del Excel ───────────────────────────────

    private function leerExcel(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet       = $spreadsheet->getActiveSheet();
        $rows        = $sheet->toArray(null, true, true, true);

        array_shift($rows); // descartar cabecera

        // Descartar filas completamente vacías (PhpSpreadsheet rellena hasta el área usada)
        $rows = array_filter($rows, function ($row) {
            return count(array_filter($row, fn($v) => $v !== null && trim((string) $v) !== '')) > 0;
        });

        // Preservar índice original de fila (clave) para reportar errores con su número real
        return $rows;
    }

    // ─── Procesamiento por chunk ─────────────────────────

    private function processChunk(array $chunk): array
    {
        $resultados    = [];
        $chunkExitosas = 0;
        $chunkFallidas = 0;

        foreach ($chunk as $rowIndex => $cells) {
            $data      = $this->mapRow($cells);
            $validator = $this->makeValidator($data);

            if ($validator->fails()) {
                $resultados[] = [
                    'fila'    => $rowIndex,
                    'estado'  => 'fallido',
                    'sku'     => $data['sku'] ?? null,
                    'mensaje' => implode(' | ', Arr::flatten($validator->errors()->toArray())),
                ];
                $chunkFallidas++;
                continue;
            }

            $validated = $validator->validated();

            try {
                $this->procesarProducto($validated, $data['__imagen_principal_archivo'], $data['__imagenes_galeria_archivos']);

                $resultados[] = [
                    'fila'    => $rowIndex,
                    'estado'  => 'exitoso',
                    'sku'     => $validated['sku'] ?? null,
                    'mensaje' => "Producto '{$validated['nombre']}' creado correctamente.",
                ];
                $chunkExitosas++;
            } catch (FilaImportacionException $e) {
                $resultados[] = [
                    'fila'    => $rowIndex,
                    'estado'  => 'fallido',
                    'sku'     => $validated['sku'] ?? null,
                    'mensaje' => $e->getMessage(),
                ];
                $chunkFallidas++;
            } catch (Throwable $e) {
                Log::warning('Error procesando fila de importación de productos', [
                    'importacion_id' => $this->importacionId,
                    'fila'           => $rowIndex,
                    'error'          => $e->getMessage(),
                ]);

                $resultados[] = [
                    'fila'    => $rowIndex,
                    'estado'  => 'fallido',
                    'sku'     => $validated['sku'] ?? null,
                    'mensaje' => 'Error inesperado al crear el producto: ' . $e->getMessage(),
                ];
                $chunkFallidas++;
            }
        }

        return [$resultados, $chunkExitosas, $chunkFallidas];
    }

    /**
     * Procesa una fila ya validada: copia imágenes y crea producto + galería en una transacción.
     * Si la transacción falla, elimina las imágenes copiadas al disco public (rollback manual).
     */
    private function procesarProducto(array $validated, ?string $imagenPrincipalArchivo, array $imagenesGaleriaArchivos): void
    {
        // Validación de existencia y reglas de imágenes antes de copiar
        $imagenesPaths = [];

        if ($imagenPrincipalArchivo !== null) {
            $imagenesPaths['principal'] = $this->validarImagenLocal($imagenPrincipalArchivo);
        }

        $imagenesPaths['galeria'] = [];
        foreach ($imagenesGaleriaArchivos as $nombreArchivo) {
            $imagenesPaths['galeria'][] = [
                'nombre' => $nombreArchivo,
                'path'   => $this->validarImagenLocal($nombreArchivo),
            ];
        }

        $this->imagenesEnTransaccion = [];

        try {
            DB::transaction(function () use ($validated, $imagenesPaths) {
                $urlPrincipal = null;
                if (isset($imagenesPaths['principal'])) {
                    $urlPrincipal = $this->copiarImagenAPublic($imagenesPaths['principal']);
                }

                $sku = !empty($validated['sku'])
                    ? $validated['sku']
                    : $this->generarSku();

                $producto = MarketProducto::create([
                    'proveedor_id'     => $this->proveedorId,
                    'categoria_id'     => $validated['categoria_id'],
                    'unidad_medida_id' => $validated['unidad_medida_id'],
                    'sku'              => $sku,
                    'nombre'           => $validated['nombre'],
                    'descripcion'      => $validated['descripcion'],
                    'especificaciones' => $validated['especificaciones'] ?? null,
                    'precio_unitario'  => $validated['precio_unitario'],
                    'stock_disponible' => $validated['stock_disponible'],
                    'stock_minimo'     => $validated['stock_minimo'] ?? null,
                    'imagen_principal' => $urlPrincipal,
                    'estado'           => $validated['estado'] ?? 'activo',
                    'destacado'        => $validated['destacado'] ?? false,
                ]);

                $orden = 1;
                foreach ($imagenesPaths['galeria'] as $img) {
                    $url = $this->copiarImagenAPublic($img['path']);

                    MarketProductoImagen::create([
                        'producto_id' => $producto->id,
                        'url'         => $url,
                        'orden'       => $orden++,
                        'alt_text'    => null,
                    ]);
                }
            });
        } catch (Throwable $e) {
            $this->limpiarImagenesEnTransaccion();
            throw $e;
        } finally {
            $this->imagenesEnTransaccion = [];
        }
    }

    /**
     * Valida que la imagen referenciada exista en tmp/imagenes/, tenga extensión permitida y respete el tamaño.
     * Devuelve la ruta absoluta del archivo en el tmp.
     */
    private function validarImagenLocal(string $nombreArchivo): string
    {
        $ruta = $this->tmpDir . DIRECTORY_SEPARATOR . 'imagenes' . DIRECTORY_SEPARATOR . $nombreArchivo;

        if (!is_file($ruta)) {
            throw new FilaImportacionException(
                "La imagen '{$nombreArchivo}' no se encuentra en la carpeta imagenes/ del ZIP."
            );
        }

        $ext = strtolower(pathinfo($nombreArchivo, PATHINFO_EXTENSION));

        if (!in_array($ext, self::MIMES_PERMITIDOS, true)) {
            throw new FilaImportacionException(
                "La imagen '{$nombreArchivo}' tiene un formato inválido. Permitidos: " . implode(', ', self::MIMES_PERMITIDOS) . '.'
            );
        }

        if (filesize($ruta) > self::MAX_IMG_BYTES) {
            throw new FilaImportacionException(
                "La imagen '{$nombreArchivo}' excede los 3 MB."
            );
        }

        return $ruta;
    }

    /**
     * Copia un archivo local a storage/app/public/market/productos/{proveedorId} con un UUID,
     * registra la ruta para rollback manual y devuelve la URL pública.
     */
    private function copiarImagenAPublic(string $rutaLocal): string
    {
        $ext  = strtolower(pathinfo($rutaLocal, PATHINFO_EXTENSION));
        $name = Str::uuid() . '.' . $ext;

        $relPath = Storage::disk('public')->putFileAs(
            "market/productos/{$this->proveedorId}",
            new File($rutaLocal),
            $name
        );

        $this->imagenesEnTransaccion[] = $relPath;

        return Storage::disk('public')->url($relPath);
    }

    private function limpiarImagenesEnTransaccion(): void
    {
        foreach ($this->imagenesEnTransaccion as $relPath) {
            try {
                if (Storage::disk('public')->exists($relPath)) {
                    Storage::disk('public')->delete($relPath);
                }
            } catch (Throwable $e) {
                Log::warning('No se pudo limpiar imagen tras rollback', [
                    'path'  => $relPath,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    // ─── Mapeo y validación de filas ─────────────────────

    private function mapRow(array $cells): array
    {
        $v = fn($col) => (isset($cells[$col]) && $cells[$col] !== '' && $cells[$col] !== null)
            ? trim((string) $cells[$col])
            : null;

        $especificaciones = null;
        if ($raw = $v('K')) {
            $especificaciones = [];
            foreach (explode('|', $raw) as $par) {
                if (str_contains($par, ':')) {
                    [$k, $val]                  = explode(':', $par, 2);
                    $especificaciones[trim($k)] = trim($val);
                }
            }
            if (empty($especificaciones)) {
                $especificaciones = null;
            }
        }

        $destacadoRaw = $v('J');
        $destacado    = match (strtolower((string) $destacadoRaw)) {
            '1', 'true', 'si', 'sí' => true,
            '0', 'false', 'no'      => false,
            default                 => null,
        };

        $imagenPrincipalArchivo  = $v('L');
        $imagenesGaleriaArchivos = [];
        if ($raw = $v('M')) {
            $imagenesGaleriaArchivos = array_values(array_filter(
                array_map('trim', explode('|', $raw)),
                fn($n) => $n !== ''
            ));
        }

        return [
            'nombre'           => $v('A'),
            'descripcion'      => $v('B'),
            'categoria_id'     => $v('C') !== null ? (int) $v('C') : null,
            'unidad_medida_id' => $v('D') !== null ? (int) $v('D') : null,
            'precio_unitario'  => $v('E'),
            'stock_disponible' => $v('F') !== null ? (int) $v('F') : null,
            'stock_minimo'     => $v('G') !== null ? (int) $v('G') : null,
            'sku'              => $v('H'),
            'estado'           => $v('I') !== null ? strtolower($v('I')) : null,
            'destacado'        => $destacado,
            'especificaciones' => $especificaciones,

            // Campos auxiliares (no van al validator de reglas, se manejan aparte)
            '__imagen_principal_archivo'  => $imagenPrincipalArchivo,
            '__imagenes_galeria_archivos' => $imagenesGaleriaArchivos,
        ];
    }

    private function makeValidator(array $data): \Illuminate\Validation\Validator
    {
        $rules = [
            'nombre'           => 'required|string|max:150',
            'descripcion'      => 'required|string',
            'categoria_id'     => 'required|integer|exists:market_categorias,id',
            'unidad_medida_id' => 'required|integer|exists:market_unidades_medida,id',
            'precio_unitario'  => 'required|numeric|min:0|max:9999999999.99',
            'stock_disponible' => 'required|integer|min:0',
            'stock_minimo'     => 'nullable|integer|min:0',
            'sku'              => [
                'nullable', 'string', 'max:50',
                Rule::unique('market_productos', 'sku'),
            ],
            'estado'           => 'nullable|in:activo,inactivo,agotado',
            'destacado'        => 'nullable|boolean',
            'especificaciones' => 'nullable|array',
        ];

        return Validator::make(
            Arr::except($data, ['__imagen_principal_archivo', '__imagenes_galeria_archivos']),
            $rules,
            [
                'sku.unique' => "El SKU ':input' ya existe en el catálogo.",
            ]
        );
    }

    private function generarSku(): string
    {
        $base = 'PROV' . $this->proveedorId . '-' . now()->timestamp . '-' . Str::random(4);

        // Loop defensivo en caso de colisión por timestamp idéntico
        while (MarketProducto::where('sku', $base)->exists()) {
            $base = 'PROV' . $this->proveedorId . '-' . now()->timestamp . '-' . Str::random(4);
        }

        return $base;
    }

    // ─── Auditoría, limpieza y failed() ──────────────────

    private function registrarAuditoria(ImportacionProductos $importacion, int $exitosas, int $fallidas): void
    {
        try {
            Auditoria::withoutGlobalScope('tenant')->create([
                'tenant_id'     => null,
                'user_id'       => $this->userId,
                'usuario'       => $this->userName,
                'correo'        => $this->userEmail,
                'accion'        => 'IMPORTACION_MASIVA',
                'modulo'        => 'MARKET_PRODUCTOS',
                'observaciones' => "Importación masiva de productos finalizada: {$exitosas} exitosas, {$fallidas} fallidas de {$importacion->total_filas} filas. Archivo: {$importacion->nombre_archivo_original}",
                'direccion_ip'  => $this->userIp,
                'user_agent'    => $this->userAgent,
                'datos_nuevos'  => [
                    'importacion_id' => $importacion->id,
                    'proveedor_id'   => $this->proveedorId,
                    'total_filas'    => $importacion->total_filas,
                    'filas_exitosas' => $exitosas,
                    'filas_fallidas' => $fallidas,
                    'estado_final'   => $importacion->estado,
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('No se pudo registrar auditoría de importación masiva de productos', [
                'importacion_id' => $importacion->id,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    private function limpiarTmp(): void
    {
        if ($this->tmpDir && is_dir($this->tmpDir)) {
            $this->borrarDirectorioRecursivo($this->tmpDir);
        }
    }

    private function borrarDirectorioRecursivo(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->borrarDirectorioRecursivo($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }

    public function failed(Throwable $e): void
    {
        $this->limpiarTmp();

        ImportacionProductos::where('id', $this->importacionId)
            ->whereNotIn('estado', [
                ImportacionProductos::ESTADO_COMPLETADO,
                ImportacionProductos::ESTADO_CON_ERRORES,
                ImportacionProductos::ESTADO_FALLIDO,
            ])
            ->update([
                'estado'        => ImportacionProductos::ESTADO_FALLIDO,
                'error_fatal'   => 'El job falló inesperadamente: ' . $e->getMessage(),
                'finalizado_at' => now(),
            ]);

        Log::error('ProcesarImportacionProductosJob::failed', [
            'importacion_id' => $this->importacionId,
            'exception'      => $e->getMessage(),
        ]);
    }
}

/**
 * Error fatal de estructura del ZIP — aborta toda la importación con mensaje legible.
 */
class ImportacionEstructuraInvalidaException extends \RuntimeException {}

/**
 * Error a nivel de fila — la fila se marca como fallida pero el resto del lote continúa.
 */
class FilaImportacionException extends \RuntimeException {}
