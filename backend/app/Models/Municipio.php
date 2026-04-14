<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Municipio extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $primaryKey = 'codigo';
    protected $keyType = 'string';

    protected $fillable = ['codigo', 'nombre', 'departamento_codigo'];

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_codigo', 'codigo');
    }
}
