<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre', 'tipo_persona', 'nit', 'razon_social', 'correo_contacto', 'telefono',
        'direccion', 'departamento', 'municipio', 'logo_url',
        'estado', 'fecha_activacion', 'fecha_suspension',
        'plan', 'max_empleados', 'max_usuarios',
    ];

    protected function casts(): array
    {
        return [
            'fecha_activacion' => 'date',
            'fecha_suspension' => 'date',
        ];
    }

    public function config(): HasOne
    {
        return $this->hasOne(TenantConfig::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tenant_user')
            ->withPivot(['rol', 'estado'])
            ->withTimestamps();
    }

    public function tenantUsers(): HasMany
    {
        return $this->hasMany(TenantUser::class);
    }

    public function predios(): HasMany
    {
        return $this->hasMany(Predio::class);
    }

    public function empleados(): HasMany
    {
        return $this->hasMany(Empleado::class);
    }

    public function operaciones(): HasMany
    {
        return $this->hasMany(Operacion::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'ACTIVO');
    }

    public function isActivo(): bool
    {
        return $this->estado === 'ACTIVO';
    }

    public function activar(): void
    {
        $this->update([
            'estado' => 'ACTIVO',
            'fecha_activacion' => now(),
            'fecha_suspension' => null,
        ]);
    }

    public function suspender(): void
    {
        $this->update([
            'estado' => 'SUSPENDIDO',
            'fecha_suspension' => now(),
        ]);
    }

    public function desactivar(): void
    {
        $this->update(['estado' => 'INACTIVO']);
    }

    /**
     * Retorna los módulos activos del tenant para que el frontend
     * sepa qué secciones mostrar en el menú.
     */
    public function modulosActivos(): array
    {
        $config = $this->config;

        if (!$config) {
            return [];
        }

        return [
            'dashboard'      => (bool) $config->modulo_dashboard,
            'plantacion'     => (bool) $config->modulo_plantacion,
            'colaboradores'  => (bool) $config->modulo_colaboradores,
            'nomina'         => (bool) $config->modulo_nomina,
            'operaciones'    => (bool) $config->modulo_operaciones,
            'viajes'         => (bool) $config->modulo_viajes,
            'usuarios'       => (bool) $config->modulo_usuarios,
            'configuracion'  => (bool) $config->modulo_configuracion,
            'sync'           => (bool) $config->sync_habilitado,
        ];
    }

    /**
     * Retorna la configuración de nómina del tenant.
     */
    public function configNomina(): array
    {
        $config = $this->config;

        if (!$config) {
            return [];
        }

        return [
            'tipo_pago'          => $config->tipo_pago_nomina,
            'salario_minimo'     => $config->salario_minimo_vigente,
            'auxilio_transporte' => $config->auxilio_transporte,
        ];
    }
}
