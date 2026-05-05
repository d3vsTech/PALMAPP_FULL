<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo paramétrico por tenant de tipos de hora extra colombianas.
 *
 * Cada tipo corresponde a un recargo definido por el Código Sustantivo del
 * Trabajo (arts. 168, 179) y la Ley 789/2002 (art. 26):
 *
 *  - HED  Hora Extra Diurna                     25%
 *  - HEN  Hora Extra Nocturna                   75%
 *  - RN   Recargo Nocturno                      35%   (no es extra)
 *  - HRD  Hora Ordinaria Dominical/Festivo      75%
 *  - HEDF Hora Extra Diurna Dominical/Festivo  100%   (75 + 25)
 *  - HENF Hora Extra Nocturna Dominical/Festivo 150%  (75 + 75)
 *  - RND  Recargo Nocturno Dominical/Festivo   110%   (75 + 35)
 *
 * `porcentaje_recargo`, `paga_hora_completa` y `codigo` se snapshotean en
 * `horas_extra` al momento de registrar la hora extra, para que los valores
 * históricos no cambien si el admin luego edita el tipo paramétrico.
 */
class TipoHoraExtra extends Model
{
    use BelongsToTenant;

    protected $table = 'tipos_hora_extra';

    public const CODIGO_HED  = 'HED';
    public const CODIGO_HEN  = 'HEN';
    public const CODIGO_RN   = 'RN';
    public const CODIGO_HRD  = 'HRD';
    public const CODIGO_HEDF = 'HEDF';
    public const CODIGO_HENF = 'HENF';
    public const CODIGO_RND  = 'RND';

    public const CODIGOS = [
        self::CODIGO_HED,
        self::CODIGO_HEN,
        self::CODIGO_RN,
        self::CODIGO_HRD,
        self::CODIGO_HEDF,
        self::CODIGO_HENF,
        self::CODIGO_RND,
    ];

    public const FRANJA_DIURNO   = 'DIURNO';
    public const FRANJA_NOCTURNO = 'NOCTURNO';
    public const FRANJA_MIXTO    = 'MIXTO';

    public const FRANJAS = [
        self::FRANJA_DIURNO,
        self::FRANJA_NOCTURNO,
        self::FRANJA_MIXTO,
    ];

    protected $fillable = [
        'tenant_id', 'codigo', 'nombre',
        'porcentaje_recargo', 'franja_horaria',
        'aplica_festivo', 'es_extra', 'paga_hora_completa',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'porcentaje_recargo' => 'decimal:2',
            'aplica_festivo'     => 'boolean',
            'es_extra'           => 'boolean',
            'paga_hora_completa' => 'boolean',
            'estado'             => 'boolean',
        ];
    }

    public function horasExtra(): HasMany
    {
        return $this->hasMany(HoraExtra::class, 'tipo_hora_extra_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeDeCodigo($query, string $codigo)
    {
        return $query->where('codigo', $codigo);
    }
}
