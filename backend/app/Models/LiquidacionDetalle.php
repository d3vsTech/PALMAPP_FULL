<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiquidacionDetalle extends Model
{
    use BelongsToTenant;

    protected $table = 'liquidacion_detalle';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'liquidacion_id', 'concepto_id',
        'nombre_concepto', 'tipo', 'operacion',
        'dias_base', 'valor_base', 'valor', 'formula_aplicada',
    ];

    protected function casts(): array
    {
        return [
            'dias_base' => 'decimal:2',
            'valor_base' => 'decimal:2',
            'valor' => 'decimal:2',
        ];
    }

    public function liquidacion(): BelongsTo
    {
        return $this->belongsTo(Liquidacion::class);
    }

    public function concepto(): BelongsTo
    {
        return $this->belongsTo(NominaConcepto::class, 'concepto_id');
    }
}
