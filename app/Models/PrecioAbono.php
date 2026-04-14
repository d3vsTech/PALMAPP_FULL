<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class PrecioAbono extends Model
{
    use BelongsToTenant;

    protected $table = 'precio_abono';

    protected $fillable = [
        'tenant_id', 'gramos_min', 'gramos_max',
        'precio_palma', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'gramos_min' => 'decimal:2',
            'gramos_max' => 'decimal:2',
            'precio_palma' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
