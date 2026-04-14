<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViajeDetalle extends Model
{
    use BelongsToTenant;

    protected $table = 'viaje_detalle';

    protected $fillable = [
        'tenant_id', 'viaje_id', 'cosecha_id', 'estado',
    ];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function viaje(): BelongsTo
    {
        return $this->belongsTo(Viaje::class);
    }

    public function cosecha(): BelongsTo
    {
        return $this->belongsTo(RegistroCosecha::class, 'cosecha_id');
    }
}
