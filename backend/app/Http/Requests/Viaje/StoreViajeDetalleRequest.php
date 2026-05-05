<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

class StoreViajeDetalleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cosecha_id' => 'required|integer|exists:registro_cosecha,id',
        ];
    }

    public function messages(): array
    {
        return [
            'cosecha_id.required' => 'Debe seleccionar una cosecha.',
            'cosecha_id.exists'   => 'La cosecha no existe.',
        ];
    }
}
