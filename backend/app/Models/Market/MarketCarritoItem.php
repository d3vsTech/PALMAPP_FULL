<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketCarritoItem extends Model
{
    protected $table = 'market_carrito_items';

    protected $fillable = [
        'carrito_id', 'producto_id', 'cantidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
        ];
    }

    public function carrito(): BelongsTo
    {
        return $this->belongsTo(MarketCarrito::class, 'carrito_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(MarketProducto::class, 'producto_id');
    }

    public function getSubtotalAttribute(): float
    {
        if (! $this->relationLoaded('producto')) {
            return 0;
        }

        return $this->producto->getPrecioParaCantidad($this->cantidad) * $this->cantidad;
    }
}
