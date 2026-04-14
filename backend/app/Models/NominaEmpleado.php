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

    protected $fillable = [
        'tenant_id', 'nomina_id', 'empleado_id', 'salario_tipo',
        'salario_base', 'total_jornales', 'total_cosecha',
        'dias_ausencia_descontados', 'total_ausencias_descuento', 'total_ausencias_remunerado',
        'total_devengado', 'total_bonificaciones', 'total_deducciones',
        'total_neto', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'salario_base' => 'decimal:2',
            'total_jornales' => 'decimal:2',
            'total_cosecha' => 'decimal:2',
            'dias_ausencia_descontados' => 'decimal:2',
            'total_ausencias_descuento' => 'decimal:2',
            'total_ausencias_remunerado' => 'decimal:2',
            'total_devengado' => 'decimal:2',
            'total_bonificaciones' => 'decimal:2',
            'total_deducciones' => 'decimal:2',
            'total_neto' => 'decimal:2',
        ];
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
}
