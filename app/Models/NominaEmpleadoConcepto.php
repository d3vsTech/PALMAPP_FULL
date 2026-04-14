<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaEmpleadoConcepto extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_empleado_concepto';

    protected $fillable = [
        'tenant_id', 'nomina_empleado_id', 'concepto_id',
        'operacion', 'valor_calculado', 'porcentaje_aplicado',
        'base_aplicada', 'es_manual', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'valor_calculado' => 'decimal:2',
            'porcentaje_aplicado' => 'decimal:4',
            'base_aplicada' => 'decimal:2',
            'es_manual' => 'boolean',
        ];
    }

    public function nominaEmpleado(): BelongsTo
    {
        return $this->belongsTo(NominaEmpleado::class);
    }

    public function concepto(): BelongsTo
    {
        return $this->belongsTo(NominaConcepto::class, 'concepto_id');
    }
}
