<?php

namespace App\Http\Requests\Sublote;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubloteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_id'          => 'required|exists:lotes,id',
            'nombre'           => 'required|string|max:50',
            'cantidad_palmas'  => 'sometimes|integer|min:0|max:99999',
        ];
    }

    public function messages(): array
    {
        return [
            'lote_id.required'        => 'El lote es obligatorio',
            'lote_id.exists'          => 'El lote seleccionado no existe',
            'nombre.required'         => 'El nombre del sublote es obligatorio',
            'nombre.max'              => 'El nombre no puede exceder 50 caracteres',
            'cantidad_palmas.integer' => 'La cantidad de palmas debe ser un número entero',
            'cantidad_palmas.min'     => 'La cantidad de palmas no puede ser negativa',
            'cantidad_palmas.max'     => 'La cantidad de palmas no puede exceder 99999',
        ];
    }
}
