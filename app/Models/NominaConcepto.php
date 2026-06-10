<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NominaConcepto extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'nomina_concepto';

    protected $fillable = [
        'tenant_id', 'nombre', 'codigo', 'tipo', 'subtipo',
        'operacion', 'calculo', 'valor_referencia', 'base_calculo',
        'aplica_a', 'es_obligatorio', 'activo',
        'porcentaje_empleado', 'porcentaje_empresa',
        'vigente_desde', 'vigente_hasta',
        'afecta_salario_minimo', 'tipo_remuneracion',
    ];

    protected function casts(): array
    {
        return [
            'valor_referencia' => 'decimal:4',
            'porcentaje_empleado' => 'decimal:2',
            'porcentaje_empresa' => 'decimal:2',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
            'es_obligatorio' => 'boolean',
            'activo' => 'boolean',
            'afecta_salario_minimo' => 'boolean',
        ];
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
