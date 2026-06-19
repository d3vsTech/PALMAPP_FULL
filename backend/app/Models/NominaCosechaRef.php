<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaCosechaRef extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_cosecha_ref';

    protected $fillable = [
        'tenant_id', 'nomina_empleado_id', 'cosecha_cuadrilla_id',
        'valor_snapshot', 'gajos_asignados',
        'precio_cosecha_snapshot', 'promedio_promedios_snapshot',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'valor_snapshot'              => 'decimal:2',
            'gajos_asignados'             => 'integer',
            'precio_cosecha_snapshot'     => 'decimal:2',
            'promedio_promedios_snapshot' => 'decimal:4',
            'estado'                      => 'boolean',
        ];
    }

    public function nominaEmpleado(): BelongsTo
    {
        return $this->belongsTo(NominaEmpleado::class);
    }

    public function cosechaCuadrilla(): BelongsTo
    {
        return $this->belongsTo(CosechaCuadrilla::class);
    }
}
