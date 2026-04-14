<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lote extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'predio_id', 'nombre',
        'fecha_siembra', 'hectareas_sembradas', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_siembra' => 'date',
            'hectareas_sembradas' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function predio(): BelongsTo
    {
        return $this->belongsTo(Predio::class);
    }

    public function sublotes(): HasMany
    {
        return $this->hasMany(Sublote::class);
    }

    public function semillas(): BelongsToMany
    {
        return $this->belongsToMany(Semilla::class, 'semilla_lote');
    }

    public function promedios(): HasMany
    {
        return $this->hasMany(PromedioLote::class);
    }

    public function preciosCosecha(): HasMany
    {
        return $this->hasMany(PrecioCosecha::class);
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
