<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Palma extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'sublote_id', 'linea_id', 'codigo', 'descripcion', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function sublote(): BelongsTo
    {
        return $this->belongsTo(Sublote::class);
    }

    public function linea(): BelongsTo
    {
        return $this->belongsTo(Linea::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
