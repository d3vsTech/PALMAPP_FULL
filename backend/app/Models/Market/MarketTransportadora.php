<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;

class MarketTransportadora extends Model
{
    protected $table = 'market_transportadoras';

    protected $fillable = ['nombre', 'codigo', 'activo', 'orden'];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'orden'  => 'integer',
        ];
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true)->orderBy('orden')->orderBy('nombre');
    }
}
