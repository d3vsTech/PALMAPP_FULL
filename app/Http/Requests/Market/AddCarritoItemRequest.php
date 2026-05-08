<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class AddCarritoItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'producto_id' => 'required|integer|exists:market_productos,id',
            'cantidad'    => 'required|integer|min:1|max:9999',
        ];
    }

    public function messages(): array
    {
        return [
            'producto_id.required' => 'El producto es obligatorio',
            'producto_id.integer'  => 'El identificador del producto debe ser un número entero',
            'producto_id.exists'   => 'El producto seleccionado no existe',
            'cantidad.required'    => 'La cantidad es obligatoria',
            'cantidad.integer'     => 'La cantidad debe ser un número entero',
            'cantidad.min'         => 'La cantidad mínima es 1',
            'cantidad.max'         => 'La cantidad máxima por línea es 9.999',
        ];
    }
}
