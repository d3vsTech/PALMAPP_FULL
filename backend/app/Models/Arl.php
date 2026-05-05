<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Arl extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'arl';

    protected $fillable = ['tenant_id', 'nombre', 'estado'];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public const INICIALES = [
        'Sura',
        'Positiva',
        'Colmena Seguros',
        'Bolívar',
        'AXA Colpatria',
        'La Equidad',
        'Liberty',
        'Mapfre',
        'Seguros Alfa',
    ];
}
