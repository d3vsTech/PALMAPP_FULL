<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NominaTerceroOperario extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_tercero_operario';

    protected $fillable = [
        'tenant_id', 'nomina_tercero_id', 'operario_id',
        'dias', 'tarifa_dia',
        'total_jornales', 'total_cosecha',
        'subtotal',
        'labores_realizadas', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'dias'           => 'integer',
            'tarifa_dia'     => 'decimal:2',
            'total_jornales' => 'decimal:2',
            'total_cosecha'  => 'decimal:2',
            'subtotal'       => 'decimal:2',
            'labores_realizadas' => 'array',
        ];
    }

    public function nominaTercero(): BelongsTo
    {
        return $this->belongsTo(NominaTercero::class);
    }

    public function operario(): BelongsTo
    {
        return $this->belongsTo(Operario::class);
    }

    public function descuentos(): HasMany
    {
        return $this->hasMany(NominaTerceroOperarioDescuento::class, 'nomina_tercero_operario_id');
    }
}
