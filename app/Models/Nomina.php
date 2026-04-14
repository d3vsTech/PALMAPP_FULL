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

    protected $fillable = [
        'tenant_id', 'quincena', 'mes', 'anio',
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
     */
    public static function calcularRangoFechas(int $mes, int $anio, ?int $quincena = null): array
    {
        $tipo = static::tipoPagoTenant();

        if ($tipo === 'MENSUAL') {
            return [
                'fecha_inicio' => "{$anio}-" . str_pad($mes, 2, '0', STR_PAD_LEFT) . "-01",
                'fecha_fin'    => date('Y-m-t', mktime(0, 0, 0, $mes, 1, $anio)),
            ];
        }

        // QUINCENAL
        $mesPad = str_pad($mes, 2, '0', STR_PAD_LEFT);
        if ($quincena === 1) {
            return [
                'fecha_inicio' => "{$anio}-{$mesPad}-01",
                'fecha_fin'    => "{$anio}-{$mesPad}-15",
            ];
        }

        return [
            'fecha_inicio' => "{$anio}-{$mesPad}-16",
            'fecha_fin'    => date('Y-m-t', mktime(0, 0, 0, $mes, 1, $anio)),
        ];
    }
}
