<?php

namespace App\Models;

use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_super_admin',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
            'status' => 'boolean',
        ];
    }

    // ─── JWT ────────────────────────────────────────

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'is_super_admin' => $this->is_super_admin,
            'name' => $this->name,
        ];
    }

    // ─── Relaciones ─────────────────────────────────

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_user')
            ->withPivot(['rol', 'estado'])
            ->withTimestamps();
    }

    public function tenantUsers(): HasMany
    {
        return $this->hasMany(TenantUser::class);
    }

    public function activeTenants(): BelongsToMany
    {
        return $this->tenants()
            ->wherePivot('estado', true)
            ->where('tenants.estado', 'ACTIVO');
    }

    // ─── Helpers ────────────────────────────────────

    public function hasAccessToTenant(int $tenantId): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        return $this->tenantUsers()
            ->where('tenant_id', $tenantId)
            ->where('estado', true)
            ->exists();
    }

    /**
     * Verifica si el usuario pertenece al tenant, sin importar el estado.
     */
    public function belongsToTenant(int $tenantId): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        return $this->tenantUsers()
            ->where('tenant_id', $tenantId)
            ->exists();
    }

    public function getRoleInTenant(int $tenantId): ?string
    {
        $pivot = $this->tenantUsers()
            ->where('tenant_id', $tenantId)
            ->where('estado', true)
            ->first();

        return $pivot?->rol;
    }

    // ─── Relaciones Marketplace (Proveedor) ─────────

    public function proveedores(): BelongsToMany
    {
        return $this->belongsToMany(MarketProveedor::class, 'market_proveedor_user', 'user_id', 'proveedor_id')
            ->withPivot(['rol', 'estado'])
            ->withTimestamps();
    }

    public function proveedorUsers(): HasMany
    {
        return $this->hasMany(MarketProveedorUser::class, 'user_id');
    }

    public function activeProveedores(): BelongsToMany
    {
        return $this->proveedores()
            ->wherePivot('estado', true)
            ->where('market_proveedores.estado', 'activo')
            ->whereNull('market_proveedores.deleted_at');
    }

    public function hasAccessToProveedor(int $proveedorId): bool
    {
        return $this->proveedorUsers()
            ->where('proveedor_id', $proveedorId)
            ->where('estado', true)
            ->exists();
    }

    public function getRoleInProveedor(int $proveedorId): ?string
    {
        $pivot = $this->proveedorUsers()
            ->where('proveedor_id', $proveedorId)
            ->where('estado', true)
            ->first();

        return $pivot?->rol;
    }
}
