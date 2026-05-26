<?php

namespace App\Models\Market;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportacionProductos extends Model
{
    protected $table = 'importaciones_productos';

    const ESTADO_PENDIENTE   = 'PENDIENTE';
    const ESTADO_PROCESANDO  = 'PROCESANDO';
    const ESTADO_COMPLETADO  = 'COMPLETADO';
    const ESTADO_CON_ERRORES = 'CON_ERRORES';
    const ESTADO_FALLIDO     = 'FALLIDO';

    protected $fillable = [
        'proveedor_id',
        'user_id',
        'nombre_archivo_original',
        'archivo_path',
        'total_filas',
        'filas_exitosas',
        'filas_fallidas',
        'estado',
        'resultados',
        'error_fatal',
        'iniciado_at',
        'finalizado_at',
    ];

    protected function casts(): array
    {
        return [
            'resultados'     => 'array',
            'iniciado_at'    => 'datetime',
            'finalizado_at'  => 'datetime',
            'total_filas'    => 'integer',
            'filas_exitosas' => 'integer',
            'filas_fallidas' => 'integer',
        ];
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(MarketProveedor::class, 'proveedor_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isTerminal(): bool
    {
        return in_array($this->estado, [
            self::ESTADO_COMPLETADO,
            self::ESTADO_CON_ERRORES,
            self::ESTADO_FALLIDO,
        ]);
    }
}
