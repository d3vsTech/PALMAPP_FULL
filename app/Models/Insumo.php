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

    public function labores(): HasMany
    {
        return $this->hasMany(Labor::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
