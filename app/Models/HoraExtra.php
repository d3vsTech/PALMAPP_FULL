<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HoraExtra extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'horas_extra';

    public const ESTADO_PENDIENTE = 'PENDIENTE';
    public const ESTADO_APROBADA  = 'APROBADA';
    public const ESTADO_RECHAZADA = 'RECHAZADA';
    public const ESTADO_LIQUIDADA = 'LIQUIDADA';

    protected $fillable = [
        'tenant_id', 'operacion_id', 'empleado_id', 'tipo_hora_extra_id',
        'codigo', 'porcentaje_recargo', 'paga_hora_completa',
        'cantidad_horas', 'valor_hora_base', 'valor_calculado',
        'observacion',
        'estado', 'motivo_rechazo', 'aprobado_por', 'aprobado_at',
        'nomina_id', 'creado_por',
        'sync_uuid', 'sync_estado',
    ];

    protected function casts(): array
    {
        return [
            'porcentaje_recargo' => 'decimal:2',
            'paga_hora_completa' => 'boolean',
            'cantidad_horas'     => 'decimal:2',
            'valor_hora_base'    => 'decimal:2',
            'valor_calculado'    => 'decimal:2',
            'aprobado_at'        => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (HoraExtra $he) {
            // Snapshot desde el tipo paramétrico
            if ($he->tipo_hora_extra_id) {
                $tipo = TipoHoraExtra::find($he->tipo_hora_extra_id);
                if ($tipo) {
                    if (empty($he->codigo)) {
                        $he->codigo = $tipo->codigo;
                    }
                    if ($he->porcentaje_recargo === null) {
                        $he->porcentaje_recargo = $tipo->porcentaje_recargo;
                    }
                    if (!isset($he->attributes['paga_hora_completa'])) {
                        $he->paga_hora_completa = $tipo->paga_hora_completa;
                    }
                }
            }

            // valor_hora_base: salario del empleado / divisor mensual del tenant.
            // Si el empleado no tiene salario_base, se cae al SMLV del tenant.
            if ($he->valor_hora_base === null && $he->empleado_id) {
                $tenantConfig = TenantConfig::where('tenant_id', $he->tenant_id)->first();
                $empleado = Empleado::find($he->empleado_id);
                $salario  = $empleado?->salario_base ?? $tenantConfig?->salario_minimo_vigente;

                if (!$salario) {
                    throw new \DomainException('CALC_ERROR: empleado sin salario_base y tenant sin salario_minimo_vigente configurado.');
                }

                $divisor = (int) ($tenantConfig?->divisor_jornada_mensual ?? 240);
                $he->valor_hora_base = round(((float) $salario) / $divisor, 2);
            }

            // valor_calculado: depende del flag paga_hora_completa
            if ($he->valor_calculado === null
                && $he->cantidad_horas !== null
                && $he->valor_hora_base !== null
                && $he->porcentaje_recargo !== null
            ) {
                $factor = $he->paga_hora_completa
                    ? (1 + ((float) $he->porcentaje_recargo) / 100)
                    : (((float) $he->porcentaje_recargo) / 100);

                $he->valor_calculado = round(
                    ((float) $he->cantidad_horas) * ((float) $he->valor_hora_base) * $factor,
                    2
                );
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

    public function tipoHoraExtra(): BelongsTo
    {
        return $this->belongsTo(TipoHoraExtra::class, 'tipo_hora_extra_id');
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

    public function scopeNoLiquidadas($query)
    {
        return $query->whereNull('nomina_id');
    }

    public function scopeEnRango($query, $inicio, $fin)
    {
        return $query->whereHas('operacion', function ($q) use ($inicio, $fin) {
            $q->whereBetween('fecha', [$inicio, $fin]);
        });
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
}
