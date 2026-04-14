<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class Ausencia extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'ausencias';

    public const TIPO_INCAPACIDAD_EPS         = 'INCAPACIDAD_EPS';
    public const TIPO_INCAPACIDAD_ARL         = 'INCAPACIDAD_ARL';
    public const TIPO_LICENCIA_MATERNIDAD     = 'LICENCIA_MATERNIDAD';
    public const TIPO_LICENCIA_PATERNIDAD     = 'LICENCIA_PATERNIDAD';
    public const TIPO_LICENCIA_LUTO           = 'LICENCIA_LUTO';
    public const TIPO_PERMISO_REMUNERADO      = 'PERMISO_REMUNERADO';
    public const TIPO_PERMISO_NO_REMUNERADO   = 'PERMISO_NO_REMUNERADO';
    public const TIPO_AUSENCIA_INJUSTIFICADA  = 'AUSENCIA_INJUSTIFICADA';
    public const TIPO_CALAMIDAD_DOMESTICA     = 'CALAMIDAD_DOMESTICA';
    public const TIPO_SUSPENSION_DISCIPLINARIA = 'SUSPENSION_DISCIPLINARIA';
    public const TIPO_OTRO                    = 'OTRO';

    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_APROBADA  = 'APROBADA';
    public const ESTADO_RECHAZADA = 'RECHAZADA';
    public const ESTADO_LIQUIDADA = 'LIQUIDADA';

    protected $fillable = [
        'tenant_id', 'operacion_id', 'empleado_id',
        'tipo', 'fecha_inicio', 'fecha_fin', 'dias_calendario', 'dias_habiles',
        'es_remunerada', 'afecta_nomina', 'porcentaje_pago',
        'valor_dia_base', 'valor_calculado',
        'entidad', 'numero_radicado', 'motivo', 'documento_soporte',
        'estado', 'aprobado_por', 'aprobado_at',
        'nomina_id', 'creado_por',
        'sync_uuid', 'sync_estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio'      => 'date',
            'fecha_fin'         => 'date',
            'aprobado_at'       => 'datetime',
            'es_remunerada'     => 'boolean',
            'afecta_nomina'     => 'boolean',
            'porcentaje_pago'   => 'decimal:2',
            'valor_dia_base'    => 'decimal:2',
            'valor_calculado'   => 'decimal:2',
        ];
    }

    // ─── Boot: forzar fecha_inicio = operacion.fecha al crear ───

    protected static function booted(): void
    {
        static::creating(function (Ausencia $ausencia) {
            // Sincronizar fecha_inicio con la operación padre
            if ($ausencia->operacion_id && empty($ausencia->fecha_inicio)) {
                $operacion = Operacion::find($ausencia->operacion_id);
                if ($operacion) {
                    $ausencia->fecha_inicio = $operacion->fecha;
                }
            }

            // Para ausencias de un solo día, fecha_fin defaultea a fecha_inicio
            if (empty($ausencia->fecha_fin) && !empty($ausencia->fecha_inicio)) {
                $ausencia->fecha_fin = $ausencia->fecha_inicio;
            }

            // Calcular días si no vienen seteados
            if (empty($ausencia->dias_calendario) && $ausencia->fecha_inicio && $ausencia->fecha_fin) {
                $ausencia->dias_calendario = Carbon::parse($ausencia->fecha_inicio)
                    ->diffInDays(Carbon::parse($ausencia->fecha_fin)) + 1;
            }
        });
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

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    // ─── Scopes ───

    public function scopePendientes($query)
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }

    public function scopeAprobadas($query)
    {
        return $query->where('estado', self::ESTADO_APROBADA);
    }

    public function scopeAfectanNomina($query)
    {
        return $query->where('afecta_nomina', true);
    }

    public function scopeNoLiquidadas($query)
    {
        return $query->whereNull('nomina_id');
    }

    /**
     * Ausencias cuyo rango se solapa con [$inicio, $fin].
     */
    public function scopeEnRango($query, $inicio, $fin)
    {
        return $query
            ->where('fecha_inicio', '<=', $fin)
            ->where('fecha_fin', '>=', $inicio);
    }

    /**
     * Ausencias vigentes en una fecha específica (cubren ese día).
     */
    public function scopeVigentesEnFecha($query, $fecha)
    {
        return $query
            ->where('fecha_inicio', '<=', $fecha)
            ->where('fecha_fin', '>=', $fecha);
    }

    // ─── Helpers ───

    public function isAprobada(): bool
    {
        return $this->estado === self::ESTADO_APROBADA;
    }

    public function isLiquidada(): bool
    {
        return $this->estado === self::ESTADO_LIQUIDADA;
    }

    /**
     * Cuenta los días de la ausencia que caen dentro de un rango de nómina.
     * Usa días calendario; un servicio futuro puede ofrecer una variante hábil.
     */
    public function getDiasEnRango(Carbon $inicio, Carbon $fin): int
    {
        $ausInicio = Carbon::parse($this->fecha_inicio);
        $ausFin    = Carbon::parse($this->fecha_fin);

        $overlapInicio = $ausInicio->greaterThan($inicio) ? $ausInicio : $inicio;
        $overlapFin    = $ausFin->lessThan($fin) ? $ausFin : $fin;

        if ($overlapInicio->greaterThan($overlapFin)) {
            return 0;
        }

        return $overlapInicio->diffInDays($overlapFin) + 1;
    }
}
