<?php

namespace App\Http\Requests\Palma;

use Illuminate\Foundation\Http\FormRequest;

class DestroyMasivoPalmaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'palmas_ids'   => 'required|array|min:1',
            'palmas_ids.*' => 'integer|exists:palmas,id',
        ];
    }

    public function messages(): array
    {
        return [
            'palmas_ids.required' => 'Debe seleccionar al menos una palma',
            'palmas_ids.array'    => 'Las palmas deben ser un arreglo',
            'palmas_ids.min'      => 'Debe seleccionar al menos una palma',
            'palmas_ids.*.exists' => 'Una de las palmas seleccionadas no existe',
        ];
    }
}
