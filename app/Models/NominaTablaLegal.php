<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaTablaLegal extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_tabla_legal';

    protected $fillable = [
        'tenant_id', 'concepto_id',
        'porcentaje_empleado', 'porcentaje_empresa',
        'vigente_desde', 'vigente_hasta',
    ];

    protected function casts(): array
    {
        return [
            'porcentaje_empleado' => 'decimal:2',
            'porcentaje_empresa' => 'decimal:2',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
        ];
    }

    public function concepto(): BelongsTo
    {
        return $this->belongsTo(NominaConcepto::class, 'concepto_id');
    }

    public function scopeVigente($query, $fecha = null)
    {
        $fecha = $fecha ?? now()->toDateString();
        return $query
            ->where('vigente_desde', '<=', $fecha)
            ->where(fn($q) => $q->whereNull('vigente_hasta')->orWhere('vigente_hasta', '>=', $fecha));
    }
}
