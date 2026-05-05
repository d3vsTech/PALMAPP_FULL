<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Permite a fincas que pagan por jornal saltar el flujo de reconteo y pasar
 * el viaje directo de CREADO a EN_VALIDACION sin enlazar cosechas ni aprobar
 * detalles. El campo `observaciones` registra el motivo del salto.
 */
class SaltarValidacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'observaciones' => 'nullable|string|max:500',
        ];
    }
}
