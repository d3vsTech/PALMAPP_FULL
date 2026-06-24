<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CosechaCuadrilla extends Model
{
    use BelongsToTenant;

    protected $table = 'cosecha_cuadrilla';

    protected $fillable = [
        'tenant_id', 'cosecha_id', 'empleado_id', 'operario_id', 'tercero_id',
        'peso_calculado_empleado', 'valor_calculado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'peso_calculado_empleado' => 'decimal:2',
            'valor_calculado' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function cosecha(): BelongsTo
    {
        return $this->belongsTo(RegistroCosecha::class, 'cosecha_id');
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function operario(): BelongsTo
    {
        return $this->belongsTo(Operario::class);
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function esDeOperario(): bool
    {
        return $this->operario_id !== null;
    }
}
