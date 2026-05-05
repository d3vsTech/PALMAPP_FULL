<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaHoraExtraRef extends Model
{
    use BelongsToTenant;

    protected $table = 'nomina_hora_extra_ref';

    protected $fillable = [
        'tenant_id', 'nomina_empleado_id', 'hora_extra_id',
        'valor_snapshot', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'valor_snapshot' => 'decimal:2',
            'estado' => 'boolean',
        ];
    }

    public function nominaEmpleado(): BelongsTo
    {
        return $this->belongsTo(NominaEmpleado::class);
    }

    public function horaExtra(): BelongsTo
    {
        return $this->belongsTo(HoraExtra::class);
    }
}
