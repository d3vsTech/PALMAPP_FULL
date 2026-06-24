<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerceroLaborPrecio extends Model
{
    use BelongsToTenant;

    protected $table = 'tercero_labor_precios';

    protected $fillable = [
        'tenant_id', 'tercero_id', 'labor_id', 'tipo_pago', 'precio_palma', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_palma' => 'decimal:2',
            'estado'       => 'boolean',
        ];
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function labor(): BelongsTo
    {
        return $this->belongsTo(Labor::class);
    }
}
