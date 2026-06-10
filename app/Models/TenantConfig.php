<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantConfig extends Model
{
    protected $table = 'tenant_config';

    protected $fillable = [
        'tenant_id',
        'modulo_dashboard', 'modulo_plantacion', 'modulo_colaboradores',
        'modulo_nomina', 'modulo_operaciones', 'modulo_viajes',
        'modulo_usuarios', 'modulo_configuracion', 'modulo_market',
        'tipo_pago_nomina',
        'moneda', 'zona_horaria', 'pais',
        'salario_minimo_vigente', 'auxilio_transporte',
        'divisor_jornada_mensual',
        'dia_inicio_q1', 'dia_fin_q1', 'dia_inicio_q2', 'dia_fin_q2',
        'anio_vigente',
        'tasa_interes_cesantias',
        'fecha_limite_consignacion_cesantias',
        'fecha_limite_pago_intereses_cesantias',
        'fecha_limite_prima_primer_semestre',
        'fecha_limite_prima_segundo_semestre',
        'dias_vacaciones_anuales',
        'dias_anio_comercial',
        'dias_mes_comercial',
        'sync_habilitado',
        'configuracion_extra',
    ];

    protected function casts(): array
    {
        return [
            'modulo_dashboard'      => 'boolean',
            'modulo_plantacion'     => 'boolean',
            'modulo_colaboradores'  => 'boolean',
            'modulo_nomina'         => 'boolean',
            'modulo_operaciones'    => 'boolean',
            'modulo_viajes'         => 'boolean',
            'modulo_usuarios'       => 'boolean',
            'modulo_configuracion'  => 'boolean',
            'modulo_market'         => 'boolean',
            'sync_habilitado'       => 'boolean',
            'salario_minimo_vigente'  => 'decimal:2',
            'auxilio_transporte'      => 'decimal:2',
            'divisor_jornada_mensual' => 'integer',
            'dia_inicio_q1'           => 'integer',
            'dia_fin_q1'              => 'integer',
            'dia_inicio_q2'           => 'integer',
            'dia_fin_q2'              => 'integer',
            'anio_vigente'            => 'integer',
            'tasa_interes_cesantias'  => 'decimal:2',
            'dias_vacaciones_anuales' => 'integer',
            'dias_anio_comercial'     => 'integer',
            'dias_mes_comercial'      => 'integer',
            'configuracion_extra'     => 'array',
        ];
    }

    public function getHorasSemanalesAttribute(): float
    {
        return ($this->divisor_jornada_mensual ?? 240) / 5;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
