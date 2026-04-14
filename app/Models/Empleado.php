<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Empleado extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
        'tipo_documento', 'documento', 'fecha_expedicion_documento', 'lugar_expedicion',
        'cargo', 'salario_base', 'modalidad_pago', 'predio_id',
        'correo_electronico', 'telefono',
        'fecha_nacimiento', 'fecha_ingreso', 'fecha_retiro',
        'direccion', 'municipio', 'departamento',
        'eps', 'fondo_pension', 'arl', 'caja_compensacion',
        'talla_camisa', 'talla_pantalon', 'talla_calzado',
        'tipo_cuenta', 'entidad_bancaria', 'numero_cuenta',
        'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_expedicion_documento' => 'date',
            'fecha_nacimiento' => 'date',
            'fecha_ingreso' => 'date',
            'fecha_retiro' => 'date',
            'salario_base' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function predio(): BelongsTo
    {
        return $this->belongsTo(Predio::class);
    }

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class);
    }

    public function ausencias(): HasMany
    {
        return $this->hasMany(Ausencia::class);
    }

    public function cosechasCuadrilla(): HasMany
    {
        return $this->hasMany(CosechaCuadrilla::class);
    }

    public function vacaciones(): HasMany
    {
        return $this->hasMany(Vacacion::class);
    }

    public function vacacionAcumulados(): HasMany
    {
        return $this->hasMany(VacacionAcumulado::class);
    }

    public function liquidaciones(): HasMany
    {
        return $this->hasMany(Liquidacion::class);
    }

    public function nominaEmpleados(): HasMany
    {
        return $this->hasMany(NominaEmpleado::class);
    }

    public function contratos(): HasMany
    {
        return $this->hasMany(EmpleadoContrato::class);
    }

    public function contratoVigente(): HasOne
    {
        return $this->hasOne(EmpleadoContrato::class)
            ->where('estado_contrato', 'VIGENTE')
            ->where('estado', true)
            ->latestOfMany('fecha_inicio');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(EmpleadoDocumento::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim(collect([
            $this->primer_nombre,
            $this->segundo_nombre,
            $this->primer_apellido,
            $this->segundo_apellido,
        ])->filter()->implode(' '));
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeFijos($query)
    {
        return $query->where('modalidad_pago', 'FIJO');
    }

    public function scopeVariables($query)
    {
        return $query->where('modalidad_pago', 'PRODUCCION');
    }
}
