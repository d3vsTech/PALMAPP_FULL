<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo paramétrico de Labores de Finca (reparaciones, mantenimiento, etc.).
 * Las Labores de Palma (Cosecha, Plateo, Poda, Fertilización, Sanidad, Otros)
 * NO usan esta tabla: viven como `tipo` dentro de `jornales` y sus precios
 * se configuran en `precios_palma` / `precio_abono` / `precios_cosecha`.
 */
class Labor extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'labores';

    protected $fillable = [
        'tenant_id', 'nombre', 'valor_base', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'valor_base' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class, 'labor_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
