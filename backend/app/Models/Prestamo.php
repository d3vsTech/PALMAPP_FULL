<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Prestamo extends Model
{
    use BelongsToTenant, SoftDeletes;

    public const ESTADO_VIGENTE   = 'VIGENTE';
    public const ESTADO_CANCELADO = 'CANCELADO';
    public const ESTADO_PAGADO    = 'PAGADO';

    protected $fillable = [
        'tenant_id', 'empleado_id', 'concepto',
        'valor_total', 'num_cuotas', 'cuota_valor',
        'inicio_anio', 'inicio_mes', 'inicio_quincena',
        'saldo_pendiente', 'cuotas_pagadas', 'estado',
        'observaciones', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'valor_total'      => 'decimal:2',
            'cuota_valor'      => 'decimal:2',
            'saldo_pendiente'  => 'decimal:2',
            'num_cuotas'       => 'integer',
            'cuotas_pagadas'   => 'integer',
            'inicio_anio'      => 'integer',
            'inicio_mes'       => 'integer',
            'inicio_quincena'  => 'integer',
        ];
    }

    public function isVigente(): bool
    {
        return $this->estado === self::ESTADO_VIGENTE;
    }

    public function isCancelado(): bool
    {
        return $this->estado === self::ESTADO_CANCELADO;
    }

    public function isPagado(): bool
    {
        return $this->estado === self::ESTADO_PAGADO;
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cuotas(): HasMany
    {
        return $this->hasMany(PrestamoCuota::class)->orderBy('numero_cuota');
    }

    public function scopeVigentes($query)
    {
        return $query->where('estado', self::ESTADO_VIGENTE);
    }

    /** Fecha de la última cuota (calculada desde la última cuota generada). */
    public function getFechaFinAttribute(): ?string
    {
        $ultima = $this->cuotas()->orderByDesc('numero_cuota')->first();
        if (! $ultima) {
            return null;
        }
        $dia = $ultima->quincena === 1 ? 15 : (int) date('t', mktime(0, 0, 0, $ultima->mes, 1, $ultima->anio));

        return sprintf('%04d-%02d-%02d', $ultima->anio, $ultima->mes, $dia);
    }

    public function getAvanceAttribute(): string
    {
        return "{$this->cuotas_pagadas}/{$this->num_cuotas}";
    }
}
