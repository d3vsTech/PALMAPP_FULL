<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModalidadContrato extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'modalidad_contrato';

    protected $fillable = [
        'tenant_id', 'nombre', 'descripcion', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function cargos(): HasMany
    {
        return $this->hasMany(Cargo::class, 'modalidad_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
