<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpleadoContrato extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'empleado_contratos';

    protected $fillable = [
        'tenant_id', 'empleado_id',
        'fecha_inicio', 'fecha_terminacion', 'salario',
        'estado_contrato', 'adjunto_path', 'adjunto_nombre_original',
        'observacion', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_terminacion' => 'date',
            'salario' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeVigentes($query)
    {
        return $query->where('estado_contrato', 'VIGENTE');
    }

    public function scopeTerminados($query)
    {
        return $query->where('estado_contrato', 'TERMINADO');
    }
}
