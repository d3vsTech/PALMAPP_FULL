<?php

namespace App\Models\Market;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketProveedor extends Model
{
    use SoftDeletes;

    protected $table = 'market_proveedores';

    protected $fillable = [
        'nombre_empresa', 'nit', 'telefono', 'email',
        'direccion', 'ciudad', 'departamento', 'descripcion', 'logo_url',
        'estado', 'calificacion_promedio', 'total_ventas',
    ];

    protected function casts(): array
    {
        return [
            'calificacion_promedio' => 'decimal:2',
            'total_ventas'          => 'integer',
        ];
    }

    public function productos(): HasMany
    {
        return $this->hasMany(MarketProducto::class, 'proveedor_id');
    }

    public function proveedorUsers(): HasMany
    {
        return $this->hasMany(MarketProveedorUser::class, 'proveedor_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'market_proveedor_user', 'proveedor_id', 'user_id')
            ->withPivot(['rol', 'estado'])
            ->withTimestamps();
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(MarketPedido::class, 'proveedor_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }
}
