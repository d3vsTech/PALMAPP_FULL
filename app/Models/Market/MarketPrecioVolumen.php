<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPrecioVolumen extends Model
{
    protected $table = 'market_precios_volumen';

    protected $fillable = [
        'producto_id', 'cantidad_minima', 'precio_unidad', 'activo',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_minima' => 'integer',
            'precio_unidad'   => 'decimal:2',
            'activo'          => 'boolean',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(MarketProducto::class, 'producto_id');
    }

    public function getDescuentoPorcentajeAttribute(): float
    {
        if (! $this->relationLoaded('producto')) {
            return 0;
        }

        $precioBase = (float) $this->producto->precio_unitario;
        if ($precioBase <= 0) {
            return 0;
        }

        return round((1 - ($this->precio_unidad / $precioBase)) * 100, 0);
    }
}
