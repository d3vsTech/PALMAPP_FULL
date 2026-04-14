<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NominaConcepto extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'nomina_concepto';

    protected $fillable = [
        'tenant_id', 'nombre', 'codigo', 'tipo', 'subtipo',
        'operacion', 'calculo', 'valor_referencia', 'base_calculo',
        'aplica_a', 'es_obligatorio', 'activo',
    ];

    protected function casts(): array
    {
        return [
            'valor_referencia' => 'decimal:4',
            'es_obligatorio' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function tablaLegal(): HasMany
    {
        return $this->hasMany(NominaTablaLegal::class, 'concepto_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeDeducciones($query)
    {
        return $query->where('operacion', 'RESTA');
    }

    public function scopeBonificaciones($query)
    {
        return $query->where('operacion', 'SUMA');
    }
}
