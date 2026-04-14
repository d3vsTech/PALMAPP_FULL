<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacacionAcumulado extends Model
{
    use BelongsToTenant;

    protected $table = 'vacacion_acumulado';

    protected $fillable = [
        'tenant_id', 'empleado_id',
        'dias_generados', 'dias_tomados', 'dias_pagados',
        'dias_disponibles', 'fecha_corte',
    ];

    protected function casts(): array
    {
        return [
            'dias_generados' => 'decimal:2',
            'dias_tomados' => 'decimal:2',
            'dias_pagados' => 'decimal:2',
            'dias_disponibles' => 'decimal:2',
            'fecha_corte' => 'date',
        ];
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }
}
