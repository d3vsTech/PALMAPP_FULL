<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transportador extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'transportadores';

    protected $fillable = [
        'tenant_id', 'empresa_transportadora_id',
        'nombres', 'apellidos', 'placa_vehiculo',
        'tipo_documento', 'numero_documento', 'telefono',
        'licencia_conduccion', 'licencia_vencimiento',
        'tipo_vehiculo', 'capacidad_kg', 'observaciones', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'licencia_vencimiento' => 'date',
            'capacidad_kg' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(EmpresaTransportadora::class, 'empresa_transportadora_id');
    }

    public function viajes(): HasMany
    {
        return $this->hasMany(Viaje::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
