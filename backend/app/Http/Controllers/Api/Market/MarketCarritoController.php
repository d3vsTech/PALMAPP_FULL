<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\AddCarritoItemRequest;
use App\Http\Requests\Market\UpdateCarritoItemRequest;
use App\Models\Market\MarketCarrito;
use App\Models\Market\MarketCarritoItem;
use App\Models\Market\MarketProducto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MarketCarritoController extends Controller
{
    /**
     * GET /api/v1/tenant/market/carrito
     *
     * Obtiene (o crea) el carrito del tenant actual.
     * Calcula precios por volumen en tiempo real.
     */
    public function show(): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $carrito = MarketCarrito::firstOrCreate(['tenant_id' => $tenantId]);
            $carrito->load('itemsConProducto');

            $items = $carrito->itemsConProducto->map(function ($item) {
                $precioUnitario = $item->producto->getPrecioParaCantidad($item->cantidad);
                $subtotal = round($precioUnitario * $item->cantidad, 2);

                return [
                    'id'       => $item->id,
                    'producto' => [
                        'id'               => $item->producto->id,
                        'nombre'           => $item->producto->nombre,
                        'sku'              => $item->producto->sku,
                        'imagen_principal' => $item->producto->imagen_principal,
                        'estado'           => $item->producto->estado,
                        'stock_disponible' => $item->producto->stock_disponible,
                        'stock_bajo'       => $item->producto->stock_bajo,
                        'unidad_medida'    => $item->producto->unidadMedida?->only(['id', 'abreviatura']),
                        'proveedor'        => $item->producto->proveedor?->only(['id', 'nombre_empresa']),
                        'precios_volumen'  => $item->producto->preciosVolumen->map(fn ($pv) => [
                            'cantidad_minima' => $pv->cantidad_minima,
                            'precio_unidad'   => (float) $pv->precio_unidad,
                        ]),
                    ],
                    'cantidad'        => $item->cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal'        => $subtotal,
                ];
            });

            $subtotalCarrito = $items->sum('subtotal');

            return response()->json([
                'data' => [
                    'id'    => $carrito->id,
                    'items' => $items->values(),
                    'resumen' => [
                        'subtotal'      => round($subtotalCarrito, 2),
                        'costo_envio'   => 0,
                        'total'         => round($subtotalCarrito, 2),
                        'cantidad_items' => $items->count(),
                    ],
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('Market: error al obtener carrito: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener el carrito',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/market/carrito/items
     *
     * Agrega o actualiza un producto en el carrito (upsert, SET cantidad — no acumulativo).
     */
    public function addItem(AddCarritoItemRequest $request): JsonResponse
    {
        try {
            $tenantId  = app('current_tenant_id');
            $validated = $request->validated();

            $producto = MarketProducto::with('proveedor')->find($validated['producto_id']);

            if ($producto->estado !== 'activo') {
                return response()->json([
                    'message' => 'El producto no está disponible para la venta',
                    'code'    => 'PRODUCTO_NO_ACTIVO',
                ], 409);
            }

            if ($producto->proveedor->estado !== 'activo') {
                return response()->json([
                    'message' => 'El proveedor de este producto no está activo',
                    'code'    => 'PROVEEDOR_INACTIVO',
                ], 409);
            }

            if ($producto->stock_disponible <= 0) {
                return response()->json([
                    'message' => 'El producto no tiene stock disponible',
                    'code'    => 'SIN_STOCK',
                ], 409);
            }

            if ($producto->precio_unitario <= 0) {
                return response()->json([
                    'message' => 'El producto no tiene precio configurado',
                    'code'    => 'PRODUCTO_SIN_PRECIO',
                ], 409);
            }

            $carrito = MarketCarrito::firstOrCreate(['tenant_id' => $tenantId]);

            $item = MarketCarritoItem::updateOrCreate(
                ['carrito_id' => $carrito->id, 'producto_id' => $validated['producto_id']],
                ['cantidad' => $validated['cantidad']]
            );

            $item->load(['producto.preciosVolumen', 'producto.unidadMedida']);
            $precioUnitario = $item->producto->getPrecioParaCantidad($item->cantidad);

            return response()->json([
                'message' => 'Producto agregado al carrito',
                'data'    => [
                    'id'              => $item->id,
                    'producto_id'     => $item->producto_id,
                    'cantidad'        => $item->cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal'        => round($precioUnitario * $item->cantidad, 2),
                ],
            ], 201);

        } catch (\Throwable $e) {
            Log::error('Market: error al agregar item al carrito: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al agregar el producto al carrito',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/market/carrito/items/{itemId}
     */
    public function updateItem(UpdateCarritoItemRequest $request, int $itemId): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $item = MarketCarritoItem::whereHas('carrito', fn ($q) =>
                $q->where('tenant_id', $tenantId)
            )->find($itemId);

            if (! $item) {
                return response()->json([
                    'message' => 'Ítem del carrito no encontrado',
                    'code'    => 'CARRITO_ITEM_NOT_FOUND',
                ], 404);
            }

            $item->update(['cantidad' => $request->validated()['cantidad']]);
            $item->load(['producto.preciosVolumen']);
            $precioUnitario = $item->producto->getPrecioParaCantidad($item->cantidad);

            return response()->json([
                'message' => 'Cantidad actualizada',
                'data'    => [
                    'id'              => $item->id,
                    'cantidad'        => $item->cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal'        => round($precioUnitario * $item->cantidad, 2),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error("Market: error al actualizar item {$itemId}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al actualizar el ítem del carrito',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/market/carrito/items/{itemId}
     */
    public function removeItem(int $itemId): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $item = MarketCarritoItem::whereHas('carrito', fn ($q) =>
                $q->where('tenant_id', $tenantId)
            )->find($itemId);

            if (! $item) {
                return response()->json([
                    'message' => 'Ítem del carrito no encontrado',
                    'code'    => 'CARRITO_ITEM_NOT_FOUND',
                ], 404);
            }

            $item->delete();

            return response()->json(['message' => 'Producto eliminado del carrito']);

        } catch (\Throwable $e) {
            Log::error("Market: error al eliminar item {$itemId}: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al eliminar el ítem del carrito',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/market/carrito
     *
     * Vacía todos los ítems del carrito. Mantiene el registro del carrito.
     */
    public function clear(): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $carrito = MarketCarrito::where('tenant_id', $tenantId)->first();

            if ($carrito) {
                $carrito->items()->delete();
            }

            return response()->json(['message' => 'Carrito vaciado correctamente']);

        } catch (\Throwable $e) {
            Log::error('Market: error al vaciar carrito: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al vaciar el carrito',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
