<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Departamento extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $primaryKey = 'codigo';
    protected $keyType = 'string';

    protected $fillable = ['codigo', 'nombre'];

    public function municipios(): HasMany
    {
        return $this->hasMany(Municipio::class, 'departamento_codigo', 'codigo');
    }
}
