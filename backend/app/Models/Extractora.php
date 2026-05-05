<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Extractora extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'extractoras';

    protected $fillable = [
        'tenant_id', 'razon_social', 'nit', 'ubicacion',
        'departamento_codigo', 'municipio_codigo',
        'ciudad', 'telefono', 'email', 'contacto_nombre',
        'distancia_km', 'observaciones', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'distancia_km' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_codigo', 'codigo');
    }

    public function municipio(): BelongsTo
    {
        return $this->belongsTo(Municipio::class, 'municipio_codigo', 'codigo');
    }

    public function viajes(): HasMany
    {
        return $this->hasMany(Viaje::class);
    }

    public function scopeActivas($query)
    {
        return $query->where('estado', true);
    }
}
