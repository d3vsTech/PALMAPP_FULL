<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketCategoria extends Model
{
    protected $table = 'market_categorias';

    protected $fillable = [
        'nombre', 'slug', 'descripcion', 'icono', 'orden', 'activa',
    ];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
            'orden'  => 'integer',
        ];
    }

    public function productos(): HasMany
    {
        return $this->hasMany(MarketProducto::class, 'categoria_id');
    }

    public function scopeActivas($query)
    {
        return $query->where('activa', true)->orderBy('orden');
    }
}
