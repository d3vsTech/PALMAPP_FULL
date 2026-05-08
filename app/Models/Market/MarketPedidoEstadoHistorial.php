<?php

namespace App\Models\Market;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPedidoEstadoHistorial extends Model
{
    protected $table = 'market_pedido_estados_historial';

    // Solo tiene created_at y fecha_cambio (sin updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'pedido_id', 'estado_anterior', 'estado_nuevo',
        'user_id', 'comentario', 'fecha_cambio',
    ];

    protected function casts(): array
    {
        return [
            'fecha_cambio' => 'datetime',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(MarketPedido::class, 'pedido_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
