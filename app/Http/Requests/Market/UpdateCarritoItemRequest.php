<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCarritoItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cantidad' => 'required|integer|min:1|max:9999',
        ];
    }

    public function messages(): array
    {
        return [
            'cantidad.required' => 'La cantidad es obligatoria',
            'cantidad.integer'  => 'La cantidad debe ser un número entero',
            'cantidad.min'      => 'La cantidad mínima es 1',
            'cantidad.max'      => 'La cantidad máxima por línea es 9.999',
        ];
    }
}
