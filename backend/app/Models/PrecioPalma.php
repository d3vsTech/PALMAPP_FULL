<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * Config per-tenant del precio por palma para cada tipo de Labor de Palma
 * que se paga con precio fijo: PLATEO, PODA, SANIDAD, OTROS.
 *
 * FERTILIZACION se resuelve por rangos en `precio_abono`.
 * COSECHA se resuelve en `precios_cosecha`.
 */
class PrecioPalma extends Model
{
    use BelongsToTenant;

    protected $table = 'precios_palma';

    public const TIPO_PLATEO  = 'PLATEO';
    public const TIPO_PODA    = 'PODA';
    public const TIPO_SANIDAD = 'SANIDAD';
    public const TIPO_OTROS   = 'OTROS';

    public const TIPOS = [
        self::TIPO_PLATEO,
        self::TIPO_PODA,
        self::TIPO_SANIDAD,
        self::TIPO_OTROS,
    ];

    protected $fillable = [
        'tenant_id', 'tipo', 'precio_palma', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_palma' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeDeTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }
}
