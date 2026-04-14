<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpleadoDocumento extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'empleado_documentos';

    protected $fillable = [
        'tenant_id', 'empleado_id', 'categoria', 'tipo_documento',
        'nombre_archivo', 'archivo_path', 'archivo_nombre_original',
        'mime_type', 'archivo_tamano', 'fecha_documento',
        'observacion', 'subido_por', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_documento' => 'date',
            'estado' => 'boolean',
        ];
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopeCategoria($query, string $categoria)
    {
        return $query->where('categoria', $categoria);
    }
}
