<?php

namespace App\Models\Market;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketProveedorUser extends Model
{
    protected $table = 'market_proveedor_user';

    protected $fillable = [
        'proveedor_id', 'user_id', 'rol', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(MarketProveedor::class, 'proveedor_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
