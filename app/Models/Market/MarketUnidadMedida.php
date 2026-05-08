<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketUnidadMedida extends Model
{
    protected $table = 'market_unidades_medida';

    protected $fillable = [
        'codigo', 'nombre', 'abreviatura', 'activa',
    ];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
        ];
    }

    public function productos(): HasMany
    {
        return $this->hasMany(MarketProducto::class, 'unidad_medida_id');
    }
}
