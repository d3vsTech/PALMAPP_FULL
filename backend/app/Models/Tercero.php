<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tercero extends Model
{
    use BelongsToTenant;

    public const TIPO_JURIDICA = 'JURIDICA';
    public const TIPO_NATURAL  = 'NATURAL';

    protected $fillable = [
        'tenant_id', 'tipo_persona',
        'nit', 'razon_social', 'representante',
        'cedula', 'nombre_completo',
        'nombre_comercial', 'telefono', 'email', 'estado',
        'banco', 'tipo_cuenta', 'numero_cuenta', 'titular_cuenta',
    ];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
        ];
    }

    public function getDatosBancariosCompletosAttribute(): bool
    {
        return !empty($this->banco)
            && !empty($this->tipo_cuenta)
            && !empty($this->numero_cuenta)
            && !empty($this->titular_cuenta);
    }

    public function getNombreDisplayAttribute(): string
    {
        return match ($this->tipo_persona) {
            self::TIPO_JURIDICA => $this->razon_social ?? $this->nombre_comercial ?? 'Sin nombre',
            self::TIPO_NATURAL  => $this->nombre_completo ?? $this->nombre_comercial ?? 'Sin nombre',
            default             => $this->nombre_comercial ?? 'Sin nombre',
        };
    }

    public function getDocumentoDisplayAttribute(): ?string
    {
        return match ($this->tipo_persona) {
            self::TIPO_JURIDICA => $this->nit,
            self::TIPO_NATURAL  => $this->cedula,
            default             => null,
        };
    }

    public function operarios(): HasMany
    {
        return $this->hasMany(Operario::class);
    }

    public function laborPrecios(): HasMany
    {
        return $this->hasMany(TerceroLaborPrecio::class);
    }

    public function preciosCosecha(): HasMany
    {
        return $this->hasMany(TerceroPrecioCosecha::class);
    }

    public function preciosAbono(): HasMany
    {
        return $this->hasMany(TerceroPrecioAbono::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
