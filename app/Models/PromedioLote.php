<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromedioLote extends Model
{
    use BelongsToTenant;

    protected $table = 'promedio_lote';

    protected $fillable = [
        'tenant_id', 'lote_id', 'promedio', 'anio',
    ];

    protected function casts(): array
    {
        return ['promedio' => 'decimal:2'];
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }
}
