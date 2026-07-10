<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrestamoCuota extends Model
{
    use BelongsToTenant;

    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_APLICADA  = 'APLICADA';

    protected $table = 'prestamo_cuotas';

    protected $fillable = [
        'tenant_id', 'prestamo_id', 'numero_cuota',
        'anio', 'mes', 'quincena', 'monto', 'estado',
        'nomina_empleado_id', 'nomina_empleado_concepto_id',
        'aplicada_por', 'aplicada_at',
    ];

    protected function casts(): array
    {
        return [
            'monto'          => 'decimal:2',
            'numero_cuota'   => 'integer',
            'anio'           => 'integer',
            'mes'            => 'integer',
            'quincena'       => 'integer',
            'aplicada_at'    => 'datetime',
        ];
    }

    public function isPendiente(): bool
    {
        return $this->estado === self::ESTADO_PENDIENTE;
    }

    public function prestamo(): BelongsTo
    {
        return $this->belongsTo(Prestamo::class);
    }

    public function nominaEmpleado(): BelongsTo
    {
        return $this->belongsTo(NominaEmpleado::class);
    }

    public function nominaEmpleadoConcepto(): BelongsTo
    {
        return $this->belongsTo(NominaEmpleadoConcepto::class);
    }

    public function aplicadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aplicada_por');
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }
}
