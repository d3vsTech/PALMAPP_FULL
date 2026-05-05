<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViajeDocumentoBascula extends Model
{
    use BelongsToTenant;

    protected $table = 'viaje_documento_bascula';

    public const ESTADO_PENDIENTE       = 'PENDIENTE';
    public const ESTADO_PROCESANDO      = 'PROCESANDO';
    public const ESTADO_COMPLETADO      = 'COMPLETADO';
    public const ESTADO_REVISION_MANUAL = 'REVISION_MANUAL';
    public const ESTADO_FALLIDO         = 'FALLIDO';

    protected $fillable = [
        'tenant_id', 'viaje_id',
        'archivo_path', 'archivo_nombre_original', 'mime_type', 'archivo_tamano',
        'estado_ocr', 'peso_extraido', 'confianza', 'modelo_usado',
        'respuesta_claude', 'datos_extraidos', 'error_mensaje', 'intentos', 'procesado_at',
        'creado_por',
    ];

    protected function casts(): array
    {
        return [
            'peso_extraido'    => 'decimal:2',
            'confianza'        => 'decimal:3',
            'respuesta_claude' => 'array',
            'datos_extraidos'  => 'array',
            'intentos'         => 'integer',
            'archivo_tamano'   => 'integer',
            'procesado_at'     => 'datetime',
        ];
    }

    public function viaje(): BelongsTo
    {
        return $this->belongsTo(Viaje::class);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function isCompletado(): bool
    {
        return $this->estado_ocr === self::ESTADO_COMPLETADO;
    }

    public function isTerminal(): bool
    {
        return in_array($this->estado_ocr, [
            self::ESTADO_COMPLETADO,
            self::ESTADO_REVISION_MANUAL,
            self::ESTADO_FALLIDO,
        ], true);
    }
}
