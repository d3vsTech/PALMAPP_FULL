<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cargo extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'modalidad_id', 'nombre',
        'salario_tipo', 'salario', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'salario' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function modalidad(): BelongsTo
    {
        return $this->belongsTo(ModalidadContrato::class, 'modalidad_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
