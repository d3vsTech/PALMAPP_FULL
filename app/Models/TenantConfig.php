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
        'modulo_usuarios', 'modulo_configuracion',
        'tipo_pago_nomina',
        'moneda', 'zona_horaria', 'pais',
        'salario_minimo_vigente', 'auxilio_transporte',
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
            'sync_habilitado'       => 'boolean',
            'salario_minimo_vigente' => 'decimal:2',
            'auxilio_transporte'    => 'decimal:2',
            'configuracion_extra'   => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
