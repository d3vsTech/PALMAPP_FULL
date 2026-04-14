<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Semilla extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'tipo', 'nombre', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function lotes(): BelongsToMany
    {
        return $this->belongsToMany(Lote::class, 'semilla_lote');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
