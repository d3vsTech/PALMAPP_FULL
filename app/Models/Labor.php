<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Labor extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'labores';

    const TIPO_JORNAL_FIJO = 'JORNAL_FIJO';
    const TIPO_POR_PALMA_INSUMO = 'POR_PALMA_INSUMO';
    const TIPO_POR_PALMA_SIMPLE = 'POR_PALMA_SIMPLE';

    protected $fillable = [
        'tenant_id', 'nombre', 'tipo_pago', 'valor_base',
        'unidad_medida', 'insumo_id', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'valor_base' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class);
    }

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class, 'labor_id');
    }

    public function esJornalFijo(): bool
    {
        return $this->tipo_pago === self::TIPO_JORNAL_FIJO;
    }

    public function esPorPalma(): bool
    {
        return in_array($this->tipo_pago, [self::TIPO_POR_PALMA_INSUMO, self::TIPO_POR_PALMA_SIMPLE]);
    }

    public function requiereInsumo(): bool
    {
        return $this->tipo_pago === self::TIPO_POR_PALMA_INSUMO;
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
