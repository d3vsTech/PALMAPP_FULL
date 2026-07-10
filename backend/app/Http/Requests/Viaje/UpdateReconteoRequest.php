<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReconteoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gajos_en_viaje'  => 'required|integer|min:0',
            'peso_confirmado' => 'nullable|numeric|min:0|max:99999999.99',
        ];
    }

    public function messages(): array
    {
        return [
            'gajos_en_viaje.required' => 'Los gajos en viaje son obligatorios.',
            'gajos_en_viaje.integer'  => 'Los gajos deben ser un número entero.',
            'gajos_en_viaje.min'      => 'Los gajos no pueden ser negativos.',
        ];
    }
}
