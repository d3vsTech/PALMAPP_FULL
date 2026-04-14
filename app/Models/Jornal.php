<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Jornal extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'jornales';

    protected $fillable = [
        'tenant_id', 'operacion_id', 'empleado_id', 'labor_id', 'lote_id', 'sublote_id',
        'tipo_pago', 'dias_jornal', 'cantidad_palmas', 'gramos_por_palma',
        'precio_insumo_snapshot', 'valor_unitario', 'valor_total', 'observacion',
        'sync_uuid', 'sync_estado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'dias_jornal' => 'decimal:2',
            'precio_insumo_snapshot' => 'decimal:2',
            'valor_unitario' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function getFechaAttribute(): ?\Illuminate\Support\Carbon
    {
        return $this->operacion?->fecha;
    }

    public function operacion(): BelongsTo
    {
        return $this->belongsTo(Operacion::class);
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function labor(): BelongsTo
    {
        return $this->belongsTo(Labor::class, 'labor_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function sublote(): BelongsTo
    {
        return $this->belongsTo(Sublote::class);
    }

    public function scopeEnRango($query, $fechaInicio, $fechaFin)
    {
        return $query->whereHas('operacion', fn($q) =>
            $q->whereBetween('fecha', [$fechaInicio, $fechaFin])
        );
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
