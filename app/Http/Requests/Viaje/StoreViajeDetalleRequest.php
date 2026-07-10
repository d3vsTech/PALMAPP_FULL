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
            'cosecha_id'     => 'required|integer|exists:registro_cosecha,id',
            'gajos_en_viaje' => 'nullable|integer|min:1',
        ];
    }

    public function messages(): array
    {
        return [
            'cosecha_id.required'      => 'Debe seleccionar una cosecha.',
            'cosecha_id.exists'        => 'La cosecha no existe.',
            'gajos_en_viaje.integer'   => 'Los gajos en viaje deben ser un número entero.',
            'gajos_en_viaje.min'       => 'Los gajos en viaje deben ser al menos 1.',
        ];
    }
}
