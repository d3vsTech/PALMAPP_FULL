<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Nomina extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'nominas';

    public const ESTADO_BORRADOR = 'BORRADOR';
    public const ESTADO_CERRADA  = 'CERRADA';

    public const TIPO_PAGO_QUINCENAL = 'QUINCENAL';
    public const TIPO_PAGO_MENSUAL   = 'MENSUAL';

    protected $fillable = [
        'tenant_id', 'quincena', 'tipo_pago_snapshot', 'mes', 'anio',
        'fecha_inicio', 'fecha_fin',
        'total_fijos', 'total_variables', 'total_bonificaciones',
        'total_deducciones', 'total_general',
        'estado', 'cerrada_por', 'cerrada_at', 'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'cerrada_at' => 'datetime',
            'quincena' => 'integer',
            'mes' => 'integer',
            'anio' => 'integer',
            'total_fijos' => 'decimal:2',
            'total_variables' => 'decimal:2',
            'total_bonificaciones' => 'decimal:2',
            'total_deducciones' => 'decimal:2',
            'total_general' => 'decimal:2',
        ];
    }

    public function empleados(): HasMany
    {
        return $this->hasMany(NominaEmpleado::class);
    }

    public function cerradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cerrada_por');
    }

    public function isCerrada(): bool
    {
        return $this->estado === 'CERRADA';
    }

    public function scopeBorradores($query)
    {
        return $query->where('estado', 'BORRADOR');
    }

    /**
     * Determina si el período es quincenal o mensual según la config del tenant.
     */
    public static function tipoPagoTenant(): string
    {
        $tenant = app('current_tenant');

        return $tenant?->config?->tipo_pago_nomina ?? 'QUINCENAL';
    }

    /**
     * Verifica si la quincena es válida según la configuración.
     * - QUINCENAL: quincena debe ser 1 o 2
     * - MENSUAL: quincena debe ser null o 0
     */
    public static function validarTipoPago(int|null $quincena): bool
    {
        $tipo = static::tipoPagoTenant();

        if ($tipo === 'MENSUAL') {
            return $quincena === null || $quincena === 0;
        }

        // QUINCENAL
        return in_array($quincena, [1, 2], true);
    }

    /**
     * Calcula automáticamente fecha_inicio y fecha_fin según
     * el tipo de pago, mes, año y quincena.
     *
     * Si $tipo no se pasa, cae al config del tenant. Pero el endpoint
     * POST /nominas siempre lo pasa explícitamente desde el body
     * (`periodicidad`), así que el config queda como fallback solo para
     * llamadas internas que no tengan otro contexto.
     *
     * Los días de corte de cada quincena se leen de `tenant_config`
     * (`dia_inicio_q1`, `dia_fin_q1`, `dia_inicio_q2`, `dia_fin_q2`).
     * Defaults sembrados: 1, 15, 16, 31. El `dia_fin_q2` se clampea al
     * último día real del mes (febrero → 28/29, abril → 30, etc.).
     */
    public static function calcularRangoFechas(int $mes, int $anio, ?int $quincena = null, ?string $tipo = null): array
    {
        $tipo = $tipo ?? static::tipoPagoTenant();
        $mesPad = str_pad($mes, 2, '0', STR_PAD_LEFT);
        $ultimoDia = (int) date('t', mktime(0, 0, 0, $mes, 1, $anio));

        if ($tipo === 'MENSUAL') {
            return [
                'fecha_inicio' => "{$anio}-{$mesPad}-01",
                'fecha_fin'    => "{$anio}-{$mesPad}-" . str_pad($ultimoDia, 2, '0', STR_PAD_LEFT),
            ];
        }

        // QUINCENAL — días configurables por tenant
        $config = app('current_tenant')?->config;
        $q1Inicio = (int) ($config?->dia_inicio_q1 ?? 1);
        $q1Fin    = (int) ($config?->dia_fin_q1    ?? 15);
        $q2Inicio = (int) ($config?->dia_inicio_q2 ?? 16);
        $q2Fin    = (int) ($config?->dia_fin_q2    ?? 31);

        if ($quincena === 1) {
            return [
                'fecha_inicio' => sprintf('%d-%s-%02d', $anio, $mesPad, min($q1Inicio, $ultimoDia)),
                'fecha_fin'    => sprintf('%d-%s-%02d', $anio, $mesPad, min($q1Fin, $ultimoDia)),
            ];
        }

        return [
            'fecha_inicio' => sprintf('%d-%s-%02d', $anio, $mesPad, min($q2Inicio, $ultimoDia)),
            'fecha_fin'    => sprintf('%d-%s-%02d', $anio, $mesPad, min($q2Fin, $ultimoDia)),
        ];
    }
}
