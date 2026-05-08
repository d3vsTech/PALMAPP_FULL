<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPedidoItem extends Model
{
    protected $table = 'market_pedido_items';

    // Solo tiene created_at (sin updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'pedido_id', 'producto_id', 'cantidad',
        'precio_unitario', 'subtotal', 'descuento', 'nombre_producto',
    ];

    protected function casts(): array
    {
        return [
            'cantidad'       => 'integer',
            'precio_unitario'=> 'decimal:2',
            'subtotal'       => 'decimal:2',
            'descuento'      => 'decimal:2',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(MarketPedido::class, 'pedido_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(MarketProducto::class, 'producto_id');
    }
}
