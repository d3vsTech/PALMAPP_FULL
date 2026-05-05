<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Eps extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'eps';

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
        'Sanitas',
        'Compensar',
        'Salud Total',
        'Famisanar',
        'Nueva EPS',
        'Aliansalud',
        'Mutual Ser',
        'Coosalud',
        'Asmet Salud',
        'Capital Salud',
        'Cajacopi Atlántico',
        'Comfachocó',
        'Comfaoriente',
        'Pijaos Salud',
        'EPS Familiar de Colombia',
        'Savia Salud',
    ];
}
