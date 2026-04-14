<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RegistroCosecha extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'registro_cosecha';

    protected $fillable = [
        'tenant_id', 'operacion_id', 'lote_id', 'sublote_id',
        'gajos_reportados', 'gajos_reconteo', 'peso_confirmado',
        'precio_cosecha', 'promedio_kg_gajo', 'valor_total',
        'sync_uuid', 'sync_estado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'peso_confirmado' => 'decimal:2',
            'precio_cosecha' => 'decimal:2',
            'promedio_kg_gajo' => 'decimal:2',
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

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function sublote(): BelongsTo
    {
        return $this->belongsTo(Sublote::class);
    }

    public function cuadrilla(): HasMany
    {
        return $this->hasMany(CosechaCuadrilla::class, 'cosecha_id');
    }

    public function viajeDetalles(): HasMany
    {
        return $this->hasMany(ViajeDetalle::class, 'cosecha_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
