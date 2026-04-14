<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Liquidacion extends Model
{
    use BelongsToTenant;

    protected $table = 'liquidaciones';

    protected $fillable = [
        'tenant_id', 'empleado_id', 'fecha_retiro', 'motivo_retiro',
        'salario_base', 'fecha_ingreso', 'dias_trabajados',
        'valor_cesantias', 'valor_intereses_ces', 'valor_prima',
        'valor_vacaciones', 'valor_indemnizacion', 'valor_bonificaciones',
        'valor_salud', 'valor_pension', 'valor_otras_deducciones',
        'total_bruto', 'total_deducciones', 'total_neto',
        'estado', 'aprobado_por', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_retiro' => 'date',
            'fecha_ingreso' => 'date',
            'salario_base' => 'decimal:2',
            'valor_cesantias' => 'decimal:2',
            'valor_intereses_ces' => 'decimal:2',
            'valor_prima' => 'decimal:2',
            'valor_vacaciones' => 'decimal:2',
            'valor_indemnizacion' => 'decimal:2',
            'valor_bonificaciones' => 'decimal:2',
            'valor_salud' => 'decimal:2',
            'valor_pension' => 'decimal:2',
            'valor_otras_deducciones' => 'decimal:2',
            'total_bruto' => 'decimal:2',
            'total_deducciones' => 'decimal:2',
            'total_neto' => 'decimal:2',
        ];
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(LiquidacionDetalle::class);
    }
}
