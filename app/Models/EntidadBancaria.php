<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntidadBancaria extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'entidades_bancarias';

    protected $fillable = ['tenant_id', 'nombre', 'codigo', 'contacto', 'estado'];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public const INICIALES = [
        'Bancolombia',
        'Davivienda',
        'Banco de Bogotá',
        'BBVA',
        'Banco Popular',
        'Banco AV Villas',
        'Banco Caja Social',
        'Banco Falabella',
        'Banco Pichincha',
        'Citibank',
        'Itaú',
        'Scotiabank Colpatria',
        'Banco Agrario',
        'Banco GNB Sudameris',
        'Banco Cooperativo Coopcentral',
        'Banco W',
        'Bancamía',
        'Bancoomeva',
        'Nequi',
        'Daviplata',
        'Movii',
        'RappiPay',
        'Lulo Bank',
    ];
}
