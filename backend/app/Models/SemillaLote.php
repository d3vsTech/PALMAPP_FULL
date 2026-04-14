<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SemillaLote extends Model
{
    use BelongsToTenant;

    protected $table = 'semilla_lote';

    protected $fillable = [
        'tenant_id', 'lote_id', 'semilla_id',
    ];

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function semilla(): BelongsTo
    {
        return $this->belongsTo(Semilla::class);
    }
}
