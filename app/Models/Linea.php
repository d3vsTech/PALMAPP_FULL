<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Linea extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'sublote_id', 'numero', 'cantidad_palmas', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
        ];
    }

    public function sublote(): BelongsTo
    {
        return $this->belongsTo(Sublote::class);
    }

    public function palmas(): HasMany
    {
        return $this->hasMany(Palma::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
