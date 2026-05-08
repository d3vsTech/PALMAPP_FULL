<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Models\Market\MarketCategoria;
use App\Models\Market\MarketProducto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MarketCatalogoController extends Controller
{
    /**
     * GET /api/v1/tenant/market/categorias
     */
    public function categorias(): JsonResponse
    {
        try {
            $categorias = MarketCategoria::activas()
                ->withCount([
                    'productos' => fn ($q) => $q->where('estado', 'activo')
                        ->where('stock_disponible', '>', 0)
                        ->where('precio_unitario', '>', 0)
                        ->whereHas('proveedor', fn ($p) => $p->where('estado', 'activo')),
                ])
                ->get(['id', 'nombre', 'slug', 'icono', 'orden']);

            return response()->json(['data' => $categorias]);

        } catch (\Throwable $e) {
            Log::error('Market: error al listar categorías: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener las categorías',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/market/productos
     *
     * Filtros: ?categoria_id= ?buscar= ?ordenar=(precio_asc|precio_desc) ?destacados=true
     * Paginación: 12 por página
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = MarketProducto::activos()
                ->where('stock_disponible', '>', 0)
                ->where('precio_unitario', '>', 0)
                ->whereHas('proveedor', fn ($q) => $q->where('estado', 'activo'))
                ->with([
                    'proveedor:id,nombre_empresa',
                    'categoria:id,nombre,slug',
                    'unidadMedida:id,abreviatura',
                    'preciosVolumen',
                ])
                ->when($request->filled('categoria_id'), fn ($q) =>
                    $q->where('categoria_id', (int) $request->categoria_id)
                )
                ->when($request->filled('categoria_slug'), fn ($q) =>
                    $q->whereHas('categoria', fn ($sq) =>
                        $sq->where('slug', $request->categoria_slug)
                    )
                )
                ->when($request->filled('buscar'), fn ($q) =>
                    $q->where(fn ($sq) =>
                        $sq->where('nombre', 'ilike', '%' . $request->buscar . '%')
                            ->orWhere('descripcion', 'ilike', '%' . $request->buscar . '%')
                    )
                )
                ->when(
                    $request->filled('destacados') && filter_var($request->destacados, FILTER_VALIDATE_BOOLEAN),
                    fn ($q) => $q->destacados()
                );

            match ($request->ordenar) {
                'precio_asc'  => $query->orderBy('precio_unitario', 'asc'),
                'precio_desc' => $query->orderBy('precio_unitario', 'desc'),
                default       => $query->orderByDesc('destacado')->orderBy('nombre'),
            };

            $productos = $query->paginate(12);

            return response()->json([
                'data' => $productos->items(),
                'meta' => [
                    'current_page' => $productos->currentPage(),
                    'last_page'    => $productos->lastPage(),
                    'per_page'     => $productos->perPage(),
                    'total'        => $productos->total(),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('Market: error al listar productos: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener los productos',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/market/productos/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $producto = MarketProducto::whereHas('proveedor', fn ($q) => $q->where('estado', 'activo'))
                ->with([
                    'proveedor:id,nombre_empresa,ciudad,calificacion_promedio',
                    'categoria:id,nombre,slug',
                    'unidadMedida:id,codigo,nombre,abreviatura',
                    'imagenes',
                    'preciosVolumen',
                ])
                ->find($id);

            if (! $producto) {
                return response()->json([
                    'message' => 'Producto no encontrado',
                    'code'    => 'PRODUCTO_NOT_FOUND',
                ], 404);
            }

            return response()->json(['data' => $producto]);

        } catch (\Throwable $e) {
            Log::error("Market: error al obtener producto {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener el producto',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
