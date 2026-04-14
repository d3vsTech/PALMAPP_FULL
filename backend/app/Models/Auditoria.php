<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Auditoria extends Model
{
    use BelongsToTenant;

    protected $table = 'auditorias';

    protected $fillable = [
        'tenant_id', 'user_id', 'usuario', 'correo',
        'accion', 'modulo', 'observaciones',
        'direccion_ip', 'user_agent',
        'datos_anteriores', 'datos_nuevos',
    ];

    protected function casts(): array
    {
        return [
            'datos_anteriores' => 'array',
            'datos_nuevos' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
