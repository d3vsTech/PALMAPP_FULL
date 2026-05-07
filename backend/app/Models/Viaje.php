<?php

namespace App\Models;

use App\Constants\ViajeEstado;
use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Viaje extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'empresa_transportadora_id', 'transportador_id', 'extractora_id',
        'remision', 'placa_vehiculo', 'nombre_conductor',
        'fecha_viaje', 'hora_salida',
        'peso_viaje', 'cantidad_gajos_total', 'observaciones', 'es_homogeneo',
        // Datos del formulario de extractora (hidratados al pasar a EN_VALIDACION).
        'numero_remision_extractora', 'fecha_llegada', 'hora_llegada',
        'fruto_verde', 'sobre_maduro', 'podrido', 'pedunculo_largo', 'mal_formado',
        'observaciones_extractora',
        // Timestamps de transición.
        'despachado_at', 'llegada_planta_at', 'validacion_at', 'finalizado_at',
        'creado_por', 'estado',
        'sync_uuid', 'sync_estado', 'estado_activo',
    ];

    protected function casts(): array
    {
        return [
            'fecha_viaje' => 'date',
            'hora_salida' => 'string',
            'peso_viaje' => 'decimal:2',
            'es_homogeneo' => 'boolean',
            'estado_activo' => 'boolean',
            'fecha_llegada' => 'date',
            'hora_llegada' => 'string',
            'fruto_verde' => 'decimal:2',
            'sobre_maduro' => 'decimal:2',
            'podrido' => 'decimal:2',
            'pedunculo_largo' => 'decimal:2',
            'mal_formado' => 'decimal:2',
            'despachado_at' => 'datetime',
            'llegada_planta_at' => 'datetime',
            'validacion_at' => 'datetime',
            'finalizado_at' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(EmpresaTransportadora::class, 'empresa_transportadora_id');
    }

    public function transportador(): BelongsTo
    {
        return $this->belongsTo(Transportador::class);
    }

    public function extractora(): BelongsTo
    {
        return $this->belongsTo(Extractora::class);
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(ViajeDetalle::class);
    }

    public function documentosBascula(): HasMany
    {
        return $this->hasMany(ViajeDocumentoBascula::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado_activo', true);
    }

    public function scopeCreados($query)
    {
        return $query->where('estado', ViajeEstado::CREADO);
    }

    public function scopeEnValidacion($query)
    {
        return $query->where('estado', ViajeEstado::EN_VALIDACION);
    }

    public function scopeFinalizados($query)
    {
        return $query->where('estado', ViajeEstado::FINALIZADO);
    }

    public function esEditable(): bool
    {
        return $this->estado === ViajeEstado::CREADO;
    }
}
