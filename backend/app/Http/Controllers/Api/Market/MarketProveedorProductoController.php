<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\StoreMarketProductoImagenRequest;
use App\Http\Requests\Market\StoreMarketProductoRequest;
use App\Http\Requests\Market\UpdateMarketProductoRequest;
use App\Models\Market\MarketCategoria;
use App\Models\Market\MarketPedidoItem;
use App\Models\Market\MarketPrecioVolumen;
use App\Models\Market\MarketProducto;
use App\Models\Market\MarketProductoImagen;
use App\Models\Market\MarketUnidadMedida;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MarketProveedorProductoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/market/proveedor/wizard-init
     * Retorna los datos necesarios para los selects del formulario de producto.
     */
    public function wizardInit(): JsonResponse
    {
        $categorias = Cache::remember('market:wizard:categorias', 900, function () {
            return MarketCategoria::where('activa', true)
                ->orderBy('orden')
                ->get(['id', 'nombre', 'slug', 'icono']);
        });

        $unidades = Cache::remember('market:wizard:unidades_medida', 900, function () {
            return MarketUnidadMedida::where('activa', true)
                ->orderBy('nombre')
                ->get(['id', 'codigo', 'nombre', 'abreviatura']);
        });

        return response()->json([
            'data' => [
                'categorias'      => $categorias,
                'unidades_medida' => $unidades,
            ],
        ]);
    }

    /**
     * GET /api/v1/market/proveedor/productos
     */
    public function index(Request $request): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $query = MarketProducto::where('proveedor_id', $proveedorId)
            ->with([
                'categoria:id,nombre,slug',
                'unidadMedida:id,codigo,nombre,abreviatura',
                'preciosVolumen',
            ]);

        $query->when($request->filled('estado'), function ($q) use ($request) {
            $q->where('estado', $request->estado);
        });

        $query->when($request->filled('categoria_id'), function ($q) use ($request) {
            $q->where('categoria_id', $request->categoria_id);
        });

        $query->when($request->boolean('destacados'), function ($q) {
            $q->scopeDestacados();
        });

        $query->when($request->filled('buscar'), function ($q) use ($request) {
            $termino = $request->buscar;
            $q->where(function ($sub) use ($termino) {
                $sub->where('nombre', 'ilike', "%{$termino}%")
                    ->orWhere('sku', 'ilike', "%{$termino}%");
            });
        });

        $ordenar = $request->input('ordenar', 'recientes');
        match ($ordenar) {
            'precio_asc'  => $query->orderBy('precio_unitario'),
            'precio_desc' => $query->orderByDesc('precio_unitario'),
            'nombre'      => $query->orderBy('nombre'),
            default       => $query->orderByDesc('created_at'),
        };

        $perPage   = (int) $request->input('per_page', 15);
        $paginated = $query->paginate($perPage);

        $stats = MarketProducto::where('proveedor_id', $proveedorId)
            ->selectRaw("
                count(*) filter (where estado = 'activo') as total_activos,
                count(*) filter (where estado = 'inactivo') as total_inactivos,
                count(*) filter (where stock_disponible = 0) as total_sin_stock
            ")
            ->first();

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
            'stats' => [
                'total_activos'   => (int) $stats->total_activos,
                'total_inactivos' => (int) $stats->total_inactivos,
                'total_sin_stock' => (int) $stats->total_sin_stock,
            ],
        ]);
    }

    /**
     * POST /api/v1/market/proveedor/productos
     */
    public function store(StoreMarketProductoRequest $request): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        try {
            $producto = DB::transaction(function () use ($request, $proveedorId) {
                $sku = $request->input('sku') ?? $this->generarSku($proveedorId);

                $urlImagenPrincipal = null;
                if ($request->hasFile('imagen_principal')) {
                    $urlImagenPrincipal = $this->uploadImagenPrincipal(
                        $request->file('imagen_principal'),
                        $proveedorId
                    );
                }

                $datos = array_merge($request->safe()->except(['imagen_principal', 'precios_volumen', 'sku']), [
                    'proveedor_id'     => $proveedorId,
                    'sku'              => $sku,
                    'imagen_principal' => $urlImagenPrincipal,
                    'estado'           => $request->input('estado', 'activo'),
                ]);

                $producto = MarketProducto::create($datos);

                if ($request->filled('precios_volumen')) {
                    $this->syncPreciosVolumen($producto, $request->input('precios_volumen'));
                }

                return $producto;
            });

            $producto->load(['categoria:id,nombre', 'unidadMedida:id,nombre,abreviatura', 'preciosVolumen', 'imagenes']);

            $this->auditoria->registrarCreacion($request, 'MARKET_PRODUCTOS', $producto);

            return response()->json(['data' => $producto], 201);
        } catch (\Throwable $e) {
            Log::error('Error creando producto proveedor: ' . $e->getMessage(), [
                'proveedor_id' => $proveedorId,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo crear el producto. Intente de nuevo.',
                'code'    => 'PRODUCTO_CREATE_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/productos/{id}
     */
    public function show(int $id): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $producto = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->with(['categoria', 'unidadMedida', 'imagenes'])
            ->first();

        if (!$producto) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        $preciosVolumen = MarketPrecioVolumen::where('producto_id', $id)
            ->orderBy('cantidad_minima')
            ->get();

        return response()->json([
            'data' => array_merge($producto->toArray(), [
                'precios_volumen' => $preciosVolumen,
            ]),
        ]);
    }

    /**
     * PUT /api/v1/market/proveedor/productos/{id}
     */
    public function update(UpdateMarketProductoRequest $request, int $id): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $producto = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->first();

        if (!$producto) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        try {
            $datosAnteriores = $producto->toArray();

            DB::transaction(function () use ($request, $producto, $proveedorId) {
                if ($request->hasFile('imagen_principal')) {
                    $this->eliminarImagen($producto->imagen_principal);
                    $producto->imagen_principal = $this->uploadImagenPrincipal(
                        $request->file('imagen_principal'),
                        $proveedorId
                    );
                }

                $datos = $request->safe()->except(['imagen_principal', 'precios_volumen']);
                $datos['imagen_principal'] = $producto->imagen_principal;

                $producto->update($datos);

                if ($request->has('precios_volumen')) {
                    $this->syncPreciosVolumen($producto, $request->input('precios_volumen') ?? []);
                }
            });

            $producto->load(['categoria:id,nombre', 'unidadMedida:id,nombre,abreviatura', 'preciosVolumen', 'imagenes']);

            $this->auditoria->registrarEdicion($request, 'MARKET_PRODUCTOS', $producto, $datosAnteriores);

            return response()->json(['data' => $producto]);
        } catch (\Throwable $e) {
            Log::error('Error actualizando producto proveedor: ' . $e->getMessage(), [
                'producto_id'  => $id,
                'proveedor_id' => $proveedorId,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo actualizar el producto. Intente de nuevo.',
                'code'    => 'PRODUCTO_UPDATE_ERROR',
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/market/proveedor/productos/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $producto = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->with('imagenes')
            ->first();

        if (!$producto) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        $tieneOrdenesActivas = MarketPedidoItem::where('producto_id', $id)
            ->whereHas('pedido', fn ($q) => $q->whereIn('estado', [
                'pendiente', 'confirmado', 'preparando', 'en_transito',
            ]))
            ->exists();

        if ($tieneOrdenesActivas) {
            return response()->json([
                'message' => 'No se puede eliminar el producto porque tiene órdenes activas.',
                'code'    => 'PRODUCTO_CON_ORDENES_ACTIVAS',
            ], 409);
        }

        try {
            $datosAnteriores = $producto->toArray();

            foreach ($producto->imagenes as $imagen) {
                $this->eliminarImagen($imagen->url);
            }

            $this->eliminarImagen($producto->imagen_principal);

            $producto->delete();

            $this->auditoria->registrarEliminacion($request, 'MARKET_PRODUCTOS', tap(new MarketProducto(), fn ($m) => $m->forceFill($datosAnteriores)));

            return response()->json(['message' => 'Producto eliminado correctamente.']);
        } catch (\Throwable $e) {
            Log::error('Error eliminando producto proveedor: ' . $e->getMessage(), [
                'producto_id'  => $id,
                'proveedor_id' => $proveedorId,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo eliminar el producto. Intente de nuevo.',
                'code'    => 'PRODUCTO_DELETE_ERROR',
            ], 500);
        }
    }

    /**
     * PATCH /api/v1/market/proveedor/productos/{id}/toggle
     */
    public function toggle(Request $request, int $id): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $producto = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->first();

        if (!$producto) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        $datosAnteriores = $producto->toArray();
        $nuevoEstado     = $producto->estado === 'activo' ? 'inactivo' : 'activo';

        $producto->update(['estado' => $nuevoEstado]);

        $this->auditoria->registrarEdicion(
            $request,
            'MARKET_PRODUCTOS',
            $producto,
            $datosAnteriores,
            "Producto #{$id} cambiado a estado: {$nuevoEstado}"
        );

        return response()->json([
            'data'    => $producto,
            'message' => "Producto " . ($nuevoEstado === 'activo' ? 'activado' : 'desactivado') . " correctamente.",
        ]);
    }

    /**
     * POST /api/v1/market/proveedor/productos/{id}/imagenes
     */
    public function storeImagen(StoreMarketProductoImagenRequest $request, int $id): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $producto = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->first();

        if (!$producto) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        try {
            $file = $request->file('imagen');
            $ext  = $file->getClientOriginalExtension();
            $path = Storage::disk('public')->putFileAs(
                "market/productos/{$proveedorId}",
                $file,
                Str::uuid() . '.' . $ext
            );
            $url = Storage::disk('public')->url($path);

            $orden = $request->input('orden');
            if ($orden === null) {
                $maxOrden = MarketProductoImagen::where('producto_id', $id)->max('orden');
                $orden    = $maxOrden !== null ? $maxOrden + 1 : 0;
            }

            $imagen = MarketProductoImagen::create([
                'producto_id' => $id,
                'url'         => $url,
                'orden'       => $orden,
                'alt_text'    => $request->input('alt_text'),
            ]);

            $this->auditoria->registrar(
                $request,
                'CREAR',
                'MARKET_PRODUCTO_IMAGENES',
                "Imagen añadida al producto #{$id}",
                null,
                $imagen->toArray(),
            );

            return response()->json(['data' => $imagen], 201);
        } catch (\Throwable $e) {
            Log::error('Error subiendo imagen de producto: ' . $e->getMessage(), [
                'producto_id'  => $id,
                'proveedor_id' => $proveedorId,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo subir la imagen. Intente de nuevo.',
                'code'    => 'IMAGEN_UPLOAD_ERROR',
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/market/proveedor/productos/{id}/imagenes/{imgId}
     */
    public function destroyImagen(Request $request, int $id, int $imgId): JsonResponse
    {
        $proveedorId = app('current_proveedor_id');

        $productoExiste = MarketProducto::where('id', $id)
            ->where('proveedor_id', $proveedorId)
            ->exists();

        if (!$productoExiste) {
            return response()->json([
                'message' => 'Producto no encontrado.',
                'code'    => 'PRODUCTO_NOT_FOUND',
            ], 404);
        }

        $imagen = MarketProductoImagen::where('id', $imgId)
            ->where('producto_id', $id)
            ->first();

        if (!$imagen) {
            return response()->json([
                'message' => 'Imagen no encontrada.',
                'code'    => 'IMAGEN_NOT_FOUND',
            ], 404);
        }

        try {
            $datosAnteriores = $imagen->toArray();

            $this->eliminarImagen($imagen->url);
            $imagen->delete();

            $this->auditoria->registrar(
                $request,
                'ELIMINAR',
                'MARKET_PRODUCTO_IMAGENES',
                "Imagen #{$imgId} eliminada del producto #{$id}",
                $datosAnteriores,
            );

            return response()->json(['message' => 'Imagen eliminada correctamente.']);
        } catch (\Throwable $e) {
            Log::error('Error eliminando imagen de producto: ' . $e->getMessage(), [
                'imagen_id'    => $imgId,
                'producto_id'  => $id,
                'proveedor_id' => $proveedorId,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo eliminar la imagen. Intente de nuevo.',
                'code'    => 'IMAGEN_DELETE_ERROR',
            ], 500);
        }
    }

    // ─── Helpers privados ────────────────────────────────────

    private function uploadImagenPrincipal(UploadedFile $file, int $proveedorId): string
    {
        $ext  = $file->getClientOriginalExtension();
        $path = Storage::disk('public')->putFileAs(
            "market/productos/{$proveedorId}",
            $file,
            Str::uuid() . '.' . $ext
        );

        return Storage::disk('public')->url($path);
    }

    private function eliminarImagen(?string $url): void
    {
        if (!$url) {
            return;
        }

        $baseUrl  = Storage::disk('public')->url('');
        $relative = Str::after($url, $baseUrl);

        if ($relative && Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }
    }

    private function syncPreciosVolumen(MarketProducto $producto, array $precios): void
    {
        MarketPrecioVolumen::where('producto_id', $producto->id)->delete();

        foreach ($precios as $precio) {
            MarketPrecioVolumen::create([
                'producto_id'      => $producto->id,
                'cantidad_minima'  => $precio['cantidad_minima'],
                'precio_unidad'    => $precio['precio_unidad'],
                'activo'           => true,
            ]);
        }
    }

    private function generarSku(int $proveedorId): string
    {
        $base = 'PROV' . $proveedorId . '-' . now()->timestamp;

        if (!MarketProducto::where('sku', $base)->exists()) {
            return $base;
        }

        return $base . '-' . Str::random(4);
    }
}
