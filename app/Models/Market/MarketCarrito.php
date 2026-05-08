<?php

namespace App\Models\Market;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketCarrito extends Model
{
    protected $table = 'market_carritos';

    protected $fillable = ['tenant_id'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketCarritoItem::class, 'carrito_id');
    }

    public function itemsConProducto(): HasMany
    {
        return $this->hasMany(MarketCarritoItem::class, 'carrito_id')
            ->with(['producto.unidadMedida', 'producto.preciosVolumen', 'producto.proveedor']);
    }
}
