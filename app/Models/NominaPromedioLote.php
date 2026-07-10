<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaPromedioLote extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_promedio_lote';

    protected $fillable = [
        'tenant_id', 'nomina_id', 'lote_id',
        'promedio_auto', 'promedio_manual', 'promedio_efectivo',
        'ajustado_por', 'ajustado_at',
    ];

    protected function casts(): array
    {
        return [
            'promedio_auto'     => 'decimal:4',
            'promedio_manual'   => 'decimal:4',
            'promedio_efectivo' => 'decimal:4',
            'ajustado_at'       => 'datetime',
        ];
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function ajustadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ajustado_por');
    }
}
