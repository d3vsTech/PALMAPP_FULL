<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Viaje extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'numero_viaje', 'placa_vehiculo', 'nombre_conductor',
        'fecha_viaje', 'peso_viaje', 'cantidad_gajos_total', 'observaciones',
        'es_homogeneo', 'sync_uuid', 'sync_estado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_viaje' => 'date',
            'peso_viaje' => 'decimal:2',
            'es_homogeneo' => 'boolean',
            'estado' => 'boolean',
        ];
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(ViajeDetalle::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
