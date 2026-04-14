<?php

namespace App\Http\Requests\Palma;

use Illuminate\Foundation\Http\FormRequest;

class StorePalmaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sublote_id'      => 'required|exists:sublotes,id',
            'cantidad_palmas' => 'required|integer|min:1|max:9999',
            'linea_id'        => 'nullable|integer|exists:lineas,id',
        ];
    }

    public function messages(): array
    {
        return [
            'sublote_id.required'       => 'El sublote es obligatorio',
            'sublote_id.exists'         => 'El sublote seleccionado no existe',
            'cantidad_palmas.required'  => 'La cantidad de palmas es obligatoria',
            'cantidad_palmas.integer'   => 'La cantidad de palmas debe ser un número entero',
            'cantidad_palmas.min'       => 'Debe crear al menos 1 palma',
            'cantidad_palmas.max'       => 'No puede crear más de 9999 palmas a la vez',
            'linea_id.exists'           => 'La línea seleccionada no existe',
        ];
    }
}
