<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NominaEmpleado extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_empleado';

    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_LIQUIDADO = 'LIQUIDADO';

    public const SALARIO_FIJO     = 'FIJO';
    public const SALARIO_VARIABLE = 'VARIABLE';

    protected $fillable = [
        'tenant_id', 'nomina_id', 'empleado_id', 'salario_tipo',
        'salario_base', 'dias_trabajados',
        'total_jornales', 'total_cosecha',
        'dias_ausencia_descontados', 'total_ausencias_descuento', 'total_ausencias_remunerado',
        'total_incapacidades',
        'total_horas_extra', 'total_recargos',
        'subsidio_transporte',
        'cargo_snapshot', 'predio_snapshot', 'salario_minimo_snapshot',
        'total_devengado', 'total_bonificaciones', 'total_deducciones',
        'total_neto', 'estado',
        'liquidado_por', 'liquidado_at',
    ];

    protected function casts(): array
    {
        return [
            'salario_base' => 'decimal:2',
            'dias_trabajados' => 'integer',
            'total_jornales' => 'decimal:2',
            'total_cosecha' => 'decimal:2',
            'dias_ausencia_descontados' => 'decimal:2',
            'total_ausencias_descuento' => 'decimal:2',
            'total_ausencias_remunerado' => 'decimal:2',
            'total_incapacidades' => 'decimal:2',
            'total_horas_extra' => 'decimal:2',
            'total_recargos' => 'decimal:2',
            'subsidio_transporte' => 'decimal:2',
            'salario_minimo_snapshot' => 'decimal:2',
            'total_devengado' => 'decimal:2',
            'total_bonificaciones' => 'decimal:2',
            'total_deducciones' => 'decimal:2',
            'total_neto' => 'decimal:2',
            'liquidado_at' => 'datetime',
        ];
    }

    public function isLiquidado(): bool
    {
        return $this->estado === self::ESTADO_LIQUIDADO;
    }

    public function isFijo(): bool
    {
        return $this->salario_tipo === self::SALARIO_FIJO;
    }

    public function isVariable(): bool
    {
        return $this->salario_tipo === self::SALARIO_VARIABLE;
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }

    public function scopeLiquidados($query)
    {
        return $query->where('estado', self::ESTADO_LIQUIDADO);
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function conceptos(): HasMany
    {
        return $this->hasMany(NominaEmpleadoConcepto::class);
    }

    public function jornalRefs(): HasMany
    {
        return $this->hasMany(NominaJornalRef::class);
    }

    public function cosechaRefs(): HasMany
    {
        return $this->hasMany(NominaCosechaRef::class);
    }

    public function horaExtraRefs(): HasMany
    {
        return $this->hasMany(NominaHoraExtraRef::class);
    }

    public function liquidadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'liquidado_por');
    }
}
