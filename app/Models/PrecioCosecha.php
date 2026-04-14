<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrecioCosecha extends Model
{
    use BelongsToTenant;

    protected $table = 'precio_cosecha';

    protected $fillable = [
        'tenant_id', 'lote_id', 'precio', 'anio',
    ];

    protected function casts(): array
    {
        return ['precio' => 'decimal:2'];
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }
}
