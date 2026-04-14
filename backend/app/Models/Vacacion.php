<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vacacion extends Model
{
    use BelongsToTenant;

    protected $table = 'vacaciones';

    protected $fillable = [
        'tenant_id', 'empleado_id', 'fecha_inicio', 'fecha_fin',
        'dias_habiles', 'dias_calendario', 'valor_dia', 'total_pagado',
        'estado', 'aprobado_por', 'nomina_id', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'valor_dia' => 'decimal:2',
            'total_pagado' => 'decimal:2',
        ];
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }
}
