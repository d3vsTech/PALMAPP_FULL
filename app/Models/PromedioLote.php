<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Historial de promedios kg/gajo por lote.
 *
 * Tipos de registro:
 *  - Baseline admin (viaje_id IS NULL): valor inicial configurado por la finca,
 *    usado como fallback cuando no hay viajes finalizados en el período de nómina.
 *  - Generado por viaje (viaje_id IS NOT NULL): creado automáticamente al
 *    finalizar un viaje homogéneo (peso_viaje / total_gajos_efectivos).
 *
 * Un lote puede tener múltiples registros; la nómina usa el promedio de los
 * registros cuya `fecha` cae dentro del período de liquidación.
 */
class PromedioLote extends Model
{
    use BelongsToTenant;

    protected $table = 'promedio_lote';

    protected $fillable = [
        'tenant_id', 'lote_id', 'viaje_id', 'promedio', 'anio', 'fecha',
    ];

    protected function casts(): array
    {
        return [
            'promedio' => 'decimal:2',
            'fecha'    => 'date',
        ];
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function viaje(): BelongsTo
    {
        return $this->belongsTo(Viaje::class);
    }

    /** Registros del período (fecha BETWEEN $inicio AND $fin). */
    public function scopeEnPeriodo($query, string $inicio, string $fin)
    {
        return $query->whereBetween('fecha', [$inicio, $fin]);
    }

    /** Solo los registros generados automáticamente por viajes. */
    public function scopeDeViaje($query)
    {
        return $query->whereNotNull('viaje_id');
    }

    /** Solo los registros configurados manualmente por el admin. */
    public function scopeBaseline($query)
    {
        return $query->whereNull('viaje_id');
    }
}
