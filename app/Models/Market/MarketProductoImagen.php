<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketProductoImagen extends Model
{
    protected $table = 'market_producto_imagenes';

    // Solo tiene created_at (sin updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'producto_id', 'url', 'orden', 'alt_text',
    ];

    protected function casts(): array
    {
        return [
            'orden' => 'integer',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(MarketProducto::class, 'producto_id');
    }
}
