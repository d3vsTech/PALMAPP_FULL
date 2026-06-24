<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerceroPrecioCosecha extends Model
{
    use BelongsToTenant;

    protected $table = 'tercero_precios_cosecha';

    protected $fillable = [
        'tenant_id', 'tercero_id', 'lote_id', 'anio', 'precio',
    ];

    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'anio'   => 'integer',
        ];
    }

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }
}
