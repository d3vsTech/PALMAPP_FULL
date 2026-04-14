<?php

namespace App\Http\Requests\Palma;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePalmaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'descripcion' => 'nullable|string|max:255',
            'estado'      => 'sometimes|boolean',
            'linea_id'    => 'nullable|integer|exists:lineas,id',
        ];
    }

    public function messages(): array
    {
        return [
            'descripcion.max' => 'La descripción no puede exceder 255 caracteres',
            'estado.boolean'  => 'El estado debe ser verdadero o falso',
            'linea_id.exists' => 'La línea seleccionada no existe',
        ];
    }
}
