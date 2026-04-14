<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sublote extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'lote_id', 'nombre', 'cantidad_palmas', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function palmas(): HasMany
    {
        return $this->hasMany(Palma::class);
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(Linea::class);
    }

    public function registrosCosecha(): HasMany
    {
        return $this->hasMany(RegistroCosecha::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
