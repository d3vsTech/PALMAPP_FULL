<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Operacion extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'operaciones';

    protected $fillable = [
        'tenant_id', 'fecha', 'hora_inicio', 'hora_fin',
        'estado', 'hubo_lluvia', 'hora_inicio_lluvia', 'hora_fin_lluvia',
        'observaciones', 'creado_por', 'aprobado_por', 'aprobado_at',
    ];

    protected function casts(): array
    {
        return [
            'fecha'              => 'date',
            'hubo_lluvia'        => 'boolean',
            'aprobado_at'        => 'datetime',
        ];
    }

    // ─── Relaciones ───

    public function jornales(): HasMany
    {
        return $this->hasMany(Jornal::class, 'operacion_id');
    }

    public function cosechas(): HasMany
    {
        return $this->hasMany(RegistroCosecha::class, 'operacion_id');
    }

    public function ausencias(): HasMany
    {
        return $this->hasMany(Ausencia::class, 'operacion_id');
    }

    /**
     * Ausencias aprobadas que cubren la fecha de esta operación,
     * incluyendo las reportadas en operaciones anteriores cuyo
     * rango aún incluye este día (ej: incapacidad de 15 días).
     */
    public function ausenciasVigentes()
    {
        return Ausencia::query()
            ->aprobadas()
            ->vigentesEnFecha($this->fecha);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    // ─── Scopes ───

    public function scopeBorradores($query)
    {
        return $query->where('estado', 'BORRADOR');
    }

    public function scopeAprobadas($query)
    {
        return $query->where('estado', 'APROBADA');
    }

    public function scopeEnRango($query, $fechaInicio, $fechaFin)
    {
        return $query->whereBetween('fecha', [$fechaInicio, $fechaFin]);
    }

    // ─── Helpers ───

    public function isAprobada(): bool
    {
        return $this->estado === 'APROBADA';
    }

    public function aprobar(int $userId): void
    {
        $this->update([
            'estado'      => 'APROBADA',
            'aprobado_por' => $userId,
            'aprobado_at'  => now(),
        ]);
    }
}
