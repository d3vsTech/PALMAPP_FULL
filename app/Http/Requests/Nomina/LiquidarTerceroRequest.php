<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Body vacío (no requiere payload) — el servicio lee todo desde
 * `nomina_empleado` de los operarios del tercero.
 *
 * Se mantiene como FormRequest para centralizar el guard de permiso.
 */
class LiquidarTerceroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.liquidar') ?? false;
    }

    public function rules(): array
    {
        return [];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para liquidar terceros',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
