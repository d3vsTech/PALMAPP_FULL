<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViajeDetalle extends Model
{
    use BelongsToTenant;

    protected $table = 'viaje_detalle';

    protected $fillable = [
        'tenant_id', 'viaje_id', 'cosecha_id',
        'gajos_en_viaje',
        'reconteo_aprobado', 'reconteo_aprobado_at', 'reconteo_aprobado_por',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'gajos_en_viaje'      => 'integer',
            'reconteo_aprobado'   => 'boolean',
            'reconteo_aprobado_at' => 'datetime',
            'estado'              => 'boolean',
        ];
    }

    public function viaje(): BelongsTo
    {
        return $this->belongsTo(Viaje::class);
    }

    public function cosecha(): BelongsTo
    {
        return $this->belongsTo(RegistroCosecha::class, 'cosecha_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconteo_aprobado_por');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeAprobados($query)
    {
        return $query->where('reconteo_aprobado', true);
    }

    public function scopePendientes($query)
    {
        return $query->where('reconteo_aprobado', false);
    }
}
