<?php

namespace App\Models\Market;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketPedido extends Model
{
    protected $table = 'market_pedidos';

    protected $fillable = [
        'codigo', 'tenant_id', 'proveedor_id', 'estado',
        'subtotal', 'costo_envio', 'total',
        'metodo_pago', 'direccion_entrega', 'notas',
        'fecha_pedido', 'fecha_entrega_estimada', 'fecha_entrega_real',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'               => 'decimal:2',
            'costo_envio'            => 'decimal:2',
            'total'                  => 'decimal:2',
            'fecha_pedido'           => 'datetime',
            'fecha_entrega_estimada' => 'date',
            'fecha_entrega_real'     => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(MarketProveedor::class, 'proveedor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketPedidoItem::class, 'pedido_id');
    }

    public function historial(): HasMany
    {
        return $this->hasMany(MarketPedidoEstadoHistorial::class, 'pedido_id')
            ->orderBy('fecha_cambio');
    }

    public function scopeDelTenant($query, int $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeDelProveedor($query, int $proveedorId)
    {
        return $query->where('proveedor_id', $proveedorId);
    }

    public static function generarCodigo(): string
    {
        $ultimo = static::orderByDesc('id')->first();
        $numero = $ultimo ? ((int) substr($ultimo->codigo, 4)) + 1 : 1;

        return 'PED-' . str_pad($numero, 3, '0', STR_PAD_LEFT);
    }
}
