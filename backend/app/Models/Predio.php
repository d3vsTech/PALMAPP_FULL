<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Predio extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'nombre', 'ubicacion',
        'latitud', 'longitud', 'hectareas_totales', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'latitud' => 'decimal:7',
            'longitud' => 'decimal:7',
            'hectareas_totales' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class);
    }

    public function sublotes(): HasManyThrough
    {
        return $this->hasManyThrough(Sublote::class, Lote::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
