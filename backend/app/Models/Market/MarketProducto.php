<?php

namespace App\Models\Market;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketProducto extends Model
{
    protected $table = 'market_productos';

    protected $fillable = [
        'proveedor_id', 'categoria_id', 'unidad_medida_id',
        'sku', 'nombre', 'descripcion', 'especificaciones',
        'precio_unitario', 'stock_disponible', 'stock_minimo',
        'imagen_principal', 'estado', 'destacado',
        'calificacion_promedio', 'total_reseñas',
        'unidades_vendidas', 'ingresos_acumulados',
    ];

    protected function casts(): array
    {
        return [
            'especificaciones'      => 'array',
            'precio_unitario'       => 'decimal:2',
            'stock_disponible'      => 'integer',
            'stock_minimo'          => 'integer',
            'destacado'             => 'boolean',
            'calificacion_promedio' => 'decimal:2',
            'total_reseñas'         => 'integer',
            'unidades_vendidas'     => 'integer',
            'ingresos_acumulados'   => 'decimal:2',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(MarketProveedor::class, 'proveedor_id');
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(MarketCategoria::class, 'categoria_id');
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(MarketUnidadMedida::class, 'unidad_medida_id');
    }

    public function imagenes(): HasMany
    {
        return $this->hasMany(MarketProductoImagen::class, 'producto_id')->orderBy('orden');
    }

    public function preciosVolumen(): HasMany
    {
        return $this->hasMany(MarketPrecioVolumen::class, 'producto_id')
            ->where('activo', true)
            ->orderBy('cantidad_minima');
    }

    public function pedidoItems(): HasMany
    {
        return $this->hasMany(MarketPedidoItem::class, 'producto_id');
    }

    public function carritoItems(): HasMany
    {
        return $this->hasMany(MarketCarritoItem::class, 'producto_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopeDestacados($query)
    {
        return $query->where('destacado', true);
    }

    public function getStockBajoAttribute(): bool
    {
        return $this->stock_minimo !== null && $this->stock_disponible <= $this->stock_minimo;
    }

    /**
     * Calcula el precio aplicable según la cantidad, considerando precios por volumen.
     */
    public function getPrecioParaCantidad(int $cantidad): float
    {
        $precioVolumen = $this->preciosVolumen()
            ->where('cantidad_minima', '<=', $cantidad)
            ->orderByDesc('cantidad_minima')
            ->first();

        return $precioVolumen ? (float) $precioVolumen->precio_unidad : (float) $this->precio_unitario;
    }
}
