<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaValidacionCosecha extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_validacion_cosecha';

    protected $fillable = [
        'tenant_id', 'nomina_id',
        'total_kg_colaboradores', 'total_kg_extractora', 'diferencia_kg',
        'detalle_por_colaborador',
        'validado_por', 'validado_at',
    ];

    protected function casts(): array
    {
        return [
            'total_kg_colaboradores' => 'decimal:2',
            'total_kg_extractora'    => 'decimal:2',
            'diferencia_kg'          => 'decimal:2',
            'detalle_por_colaborador' => 'array',
            'validado_at'            => 'datetime',
        ];
    }

    public function isConfirmado(): bool
    {
        return $this->validado_at !== null;
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }
}
