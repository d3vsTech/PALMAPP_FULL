<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NominaTercero extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_tercero';

    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_PAGADO    = 'PAGADO';

    protected $fillable = [
        'tenant_id', 'nomina_id', 'tercero_id',
        'total_dias', 'total_jornales', 'total_cosecha', 'total_bruto', 'total_a_transferir',
        'estado_pago', 'orden_pago_numero',
        'pagado_at', 'pagado_por', 'metodo_pago', 'referencia_pago', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'total_dias'          => 'integer',
            'total_jornales'      => 'decimal:2',
            'total_cosecha'       => 'decimal:2',
            'total_bruto'         => 'decimal:2',
            'total_a_transferir'  => 'decimal:2',
            'pagado_at'           => 'datetime',
        ];
    }

    public function isPendiente(): bool
    {
        return $this->estado_pago === self::ESTADO_PENDIENTE;
    }

    public function isPagado(): bool
    {
        return $this->estado_pago === self::ESTADO_PAGADO;
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function pagadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pagado_por');
    }

    public function operarios(): HasMany
    {
        return $this->hasMany(NominaTerceroOperario::class);
    }
}
