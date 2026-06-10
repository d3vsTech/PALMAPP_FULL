<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo unificado de Labores (palma + finca).
 *
 *  - 5 fijas del sistema (es_sistema=true, categoria='PALMA'): COSECHA, PLATEO,
 *    PODA, FERTILIZACION, SANIDAD. Una por tenant. No se pueden borrar ni
 *    renombrar. Solo `tipo_pago`, `precio_palma` y `estado` son editables.
 *  - Custom de palma (es_sistema=false, categoria='PALMA', tipo=NULL):
 *    libres a crear; tipo_pago configurable POR_PALMA / JORNAL_FIJO.
 *  - Custom de finca (es_sistema=false, categoria='FINCA', tipo=NULL):
 *    libres a crear; tipo_pago siempre JORNAL_FIJO (forzado por el modelo).
 *
 * COSECHA mantiene su flujo especial (registro_cosecha + cosecha_cuadrilla) y
 * FERTILIZACION en POR_PALMA su escala de abono (precio_abono). El resto de
 * cálculos son lineales según tipo_pago.
 */
class Labor extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'labores';

    // ─── Categorías ───────────────────────────────────────────────────

    public const CATEGORIA_PALMA = 'PALMA';
    public const CATEGORIA_FINCA = 'FINCA';

    public const CATEGORIAS = [
        self::CATEGORIA_PALMA,
        self::CATEGORIA_FINCA,
    ];

    // ─── Tipos de labores fijas del sistema (solo aplica si es_sistema=true) ──

    public const TIPO_COSECHA       = 'COSECHA';
    public const TIPO_PLATEO        = 'PLATEO';
    public const TIPO_PODA          = 'PODA';
    public const TIPO_FERTILIZACION = 'FERTILIZACION';
    public const TIPO_SANIDAD       = 'SANIDAD';

    public const TIPOS_FIJOS = [
        self::TIPO_COSECHA,
        self::TIPO_PLATEO,
        self::TIPO_PODA,
        self::TIPO_FERTILIZACION,
        self::TIPO_SANIDAD,
    ];

    /**
     * Nombre canónico de cada labor fija (inmutable). Se aplica en saving()
     * para evitar que el admin renombre las fijas.
     */
    public const NOMBRES_FIJOS = [
        self::TIPO_COSECHA       => 'Cosecha',
        self::TIPO_PLATEO        => 'Plateo',
        self::TIPO_PODA          => 'Poda',
        self::TIPO_FERTILIZACION => 'Fertilización',
        self::TIPO_SANIDAD       => 'Sanidad',
    ];

    // ─── Tipos de pago ────────────────────────────────────────────────

    public const TIPO_PAGO_POR_PALMA   = 'POR_PALMA';
    public const TIPO_PAGO_JORNAL_FIJO = 'JORNAL_FIJO';

    public const TIPOS_PAGO = [
        self::TIPO_PAGO_POR_PALMA,
        self::TIPO_PAGO_JORNAL_FIJO,
    ];

    protected $fillable = [
        'tenant_id', 'categoria', 'tipo', 'nombre',
        'tipo_pago', 'precio_palma', 'es_sistema', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_palma' => 'decimal:2',
            'es_sistema'   => 'boolean',
            'estado'       => 'boolean',
        ];
    }

    // ─── Invariantes ──────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::saving(function (Labor $labor) {
            // Una labor FINCA siempre paga JORNAL_FIJO y no tiene tipo fijo.
            if ($labor->categoria === self::CATEGORIA_FINCA) {
                $labor->tipo_pago = self::TIPO_PAGO_JORNAL_FIJO;
                $labor->tipo      = null;
                $labor->es_sistema = false;
            }

            // Custom de palma no lleva tipo de fija.
            if ($labor->categoria === self::CATEGORIA_PALMA && !$labor->es_sistema) {
                $labor->tipo = null;
            }

            // Fijas del sistema: blindar nombre canónico y categoria=PALMA.
            if ($labor->es_sistema && $labor->tipo !== null) {
                $labor->categoria = self::CATEGORIA_PALMA;
                if (isset(self::NOMBRES_FIJOS[$labor->tipo])) {
                    $labor->nombre = self::NOMBRES_FIJOS[$labor->tipo];
                }
            }
        });

        static::deleting(function (Labor $labor) {
            if ($labor->es_sistema) {
                throw new \DomainException(
                    "No se puede eliminar la labor del sistema '{$labor->nombre}'."
                );
            }
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    public function esFija(): bool
    {
        return (bool) $this->es_sistema;
    }

    public function esCustom(): bool
    {
        return !$this->es_sistema;
    }

    public function esPalma(): bool
    {
        return $this->categoria === self::CATEGORIA_PALMA;
    }

    public function esFinca(): bool
    {
        return $this->categoria === self::CATEGORIA_FINCA;
    }

    public function esPorPalma(): bool
    {
        return $this->tipo_pago === self::TIPO_PAGO_POR_PALMA;
    }

    public function esJornalFijo(): bool
    {
        return $this->tipo_pago === self::TIPO_PAGO_JORNAL_FIJO;
    }

    public function esCosecha(): bool
    {
        return $this->tipo === self::TIPO_COSECHA;
    }

    public function esFertilizacion(): bool
    {
        return $this->tipo === self::TIPO_FERTILIZACION;
    }

    /**
     * Indica si el frontend debe abrir el flujo dedicado de cosecha en lugar
     * del formulario regular de jornal.
     */
    public function requiereFlujoCosecha(): bool
    {
        return $this->esCosecha();
    }

    // ─── Relaciones ───────────────────────────────────────────────────

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class, 'labor_id');
    }

    public function registroCosechas(): HasMany
    {
        return $this->hasMany(RegistroCosecha::class, 'labor_id');
    }

    // ─── Scopes ───────────────────────────────────────────────────────

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeSistema($query)
    {
        return $query->where('es_sistema', true);
    }

    public function scopeCustom($query)
    {
        return $query->where('es_sistema', false);
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

    public function scopePorCategoria($query, string $categoria)
    {
        return $query->where('categoria', $categoria);
    }
}
