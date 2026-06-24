<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Operario extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'tercero_id',
        'nombres', 'apellidos', 'cedula',
        'cargo', 'eps', 'arl', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
        ];
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim($this->nombres . ' ' . $this->apellidos);
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class);
    }

    public function cosechasCuadrilla(): HasMany
    {
        return $this->hasMany(CosechaCuadrilla::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeDelTercero($query, int $terceroId)
    {
        return $query->where('tercero_id', $terceroId);
    }
}
