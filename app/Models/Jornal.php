<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un Jornal representa lo que ganó un empleado en una operación por una labor.
 * La tabla es unificada con discriminador:
 *   - categoria = 'PALMA' → tipo ∈ {PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS}
 *   - categoria = 'FINCA' → labor_id apunta al catálogo `labores`
 * COSECHA NO vive aquí: se maneja en registro_cosecha + cosecha_cuadrilla.
 */
class Jornal extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'jornales';

    public const CATEGORIA_PALMA = 'PALMA';
    public const CATEGORIA_FINCA = 'FINCA';

    public const TIPO_PLATEO        = 'PLATEO';
    public const TIPO_PODA          = 'PODA';
    public const TIPO_FERTILIZACION = 'FERTILIZACION';
    public const TIPO_SANIDAD       = 'SANIDAD';
    public const TIPO_OTROS         = 'OTROS';

    public const TIPOS_PALMA = [
        self::TIPO_PLATEO,
        self::TIPO_PODA,
        self::TIPO_FERTILIZACION,
        self::TIPO_SANIDAD,
        self::TIPO_OTROS,
    ];

    protected $fillable = [
        'tenant_id', 'operacion_id', 'empleado_id',
        'categoria', 'tipo', 'labor_id',
        'lote_id', 'sublote_id',
        'cantidad_palmas', 'insumo_id', 'gramos_por_palma',
        'descripcion', 'nombre_trabajo', 'ubicacion',
        'valor_unitario', 'precio_insumo_snapshot', 'valor_total',
        'observacion', 'sync_uuid', 'sync_estado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'valor_unitario' => 'decimal:2',
            'precio_insumo_snapshot' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function getFechaAttribute(): ?\Illuminate\Support\Carbon
    {
        return $this->operacion?->fecha;
    }

    public function isPalma(): bool
    {
        return $this->categoria === self::CATEGORIA_PALMA;
    }

    public function isFinca(): bool
    {
        return $this->categoria === self::CATEGORIA_FINCA;
    }

    // ─── Relaciones ───

    public function operacion(): BelongsTo
    {
        return $this->belongsTo(Operacion::class);
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function labor(): BelongsTo
    {
        return $this->belongsTo(Labor::class, 'labor_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function sublote(): BelongsTo
    {
        return $this->belongsTo(Sublote::class);
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class);
    }

    // ─── Scopes ───

    public function scopeEnRango($query, $fechaInicio, $fechaFin)
    {
        return $query->whereHas('operacion', fn($q) =>
            $q->whereBetween('fecha', [$fechaInicio, $fechaFin])
        );
    }

    public function scopePalma($query)
    {
        return $query->where('categoria', self::CATEGORIA_PALMA);
    }

    public function scopeFinca($query)
    {
        return $query->where('categoria', self::CATEGORIA_FINCA);
    }

    public function scopeDeTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }
}
