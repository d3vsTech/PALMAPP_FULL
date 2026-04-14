<?php

namespace App\Http\Requests\Sublote;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubloteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_id'         => 'sometimes|required|exists:lotes,id',
            'nombre'          => 'sometimes|required|string|max:50',
            'estado'          => 'sometimes|boolean',
            'cantidad_palmas' => 'sometimes|integer|min:0|max:99999',
        ];
    }

    public function messages(): array
    {
        return [
            'lote_id.exists'          => 'El lote seleccionado no existe',
            'nombre.max'              => 'El nombre no puede exceder 50 caracteres',
            'estado.boolean'          => 'El estado debe ser verdadero o falso',
            'cantidad_palmas.integer' => 'La cantidad de palmas debe ser un número entero',
            'cantidad_palmas.min'     => 'La cantidad de palmas no puede ser negativa',
            'cantidad_palmas.max'     => 'La cantidad de palmas no puede exceder 99999',
        ];
    }
}
