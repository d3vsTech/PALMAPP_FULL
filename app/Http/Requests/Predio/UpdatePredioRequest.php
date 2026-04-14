<?php

namespace App\Http\Requests\Predio;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePredioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'            => 'sometimes|required|string|max:50',
            'ubicacion'         => 'sometimes|required|string|max:100',
            'latitud'           => 'nullable|numeric|between:-90,90',
            'longitud'          => 'nullable|numeric|between:-180,180',
            'hectareas_totales' => 'nullable|numeric|min:0|max:99999999.99',
            'estado'            => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max'            => 'El nombre no puede exceder 50 caracteres',
            'ubicacion.max'         => 'La ubicación no puede exceder 100 caracteres',
            'latitud.between'       => 'La latitud debe estar entre -90 y 90',
            'longitud.between'      => 'La longitud debe estar entre -180 y 180',
            'hectareas_totales.min' => 'Las hectáreas no pueden ser negativas',
            'estado.boolean'        => 'El estado debe ser verdadero o falso',
        ];
    }
}
