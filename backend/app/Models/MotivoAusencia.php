<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo paramétrico por tenant de motivos de ausencia.
 *
 * Cada motivo está anclado a un `tipo_base` del enum existente
 * (INCAPACIDAD_EPS, ARL, etc.), que es el discriminador que usa la
 * nómina para aplicar reglas especiales (días 1-2 EPS = 100%, etc.).
 *
 * Los flags (`es_remunerada`, `afecta_nomina`, `porcentaje_pago_default`)
 * se snapshotean en `ausencias` al momento de crear la ausencia, para que
 * los valores históricos no cambien si el admin luego edita el motivo.
 */
class MotivoAusencia extends Model
{
    use BelongsToTenant;

    protected $table = 'motivos_ausencia';

    protected $fillable = [
        'tenant_id', 'nombre', 'tipo_base',
        'es_remunerada', 'afecta_nomina', 'porcentaje_pago_default',
        'requiere_soporte', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'es_remunerada'           => 'boolean',
            'afecta_nomina'           => 'boolean',
            'requiere_soporte'        => 'boolean',
            'estado'                  => 'boolean',
            'porcentaje_pago_default' => 'decimal:2',
        ];
    }

    public function ausencias(): HasMany
    {
        return $this->hasMany(Ausencia::class, 'motivo_ausencia_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeDeTipoBase($query, string $tipoBase)
    {
        return $query->where('tipo_base', $tipoBase);
    }
}
