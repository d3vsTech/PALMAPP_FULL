<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Insumo extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'nombre', 'unidad_medida', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    /**
     * Jornales de FERTILIZACION que usaron este insumo.
     */
    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
