<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmpresaTransportadora extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'empresa_transportadora';

    protected $fillable = [
        'tenant_id', 'razon_social', 'tipo_persona', 'nit', 'telefono', 'direccion',
        'ciudad', 'email', 'contacto_nombre', 'observaciones', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function transportadores(): HasMany
    {
        return $this->hasMany(Transportador::class);
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
