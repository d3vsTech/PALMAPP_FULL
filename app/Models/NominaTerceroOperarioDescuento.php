<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaTerceroOperarioDescuento extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_tercero_operario_descuento';

    protected $fillable = [
        'tenant_id',
        'nomina_tercero_operario_id',
        'concepto_id',
        'valor',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
        ];
    }

    public function lineaOperario(): BelongsTo
    {
        return $this->belongsTo(NominaTerceroOperario::class, 'nomina_tercero_operario_id');
    }

    public function concepto(): BelongsTo
    {
        return $this->belongsTo(NominaConcepto::class, 'concepto_id');
    }
}
