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
            'gajos_reconteo'  => 'required|integer|min:0',
            'peso_confirmado' => 'nullable|numeric|min:0|max:99999999.99',
        ];
    }

    public function messages(): array
    {
        return [
            'gajos_reconteo.required' => 'Los gajos del reconteo son obligatorios.',
            'gajos_reconteo.integer'  => 'Los gajos deben ser un número entero.',
            'gajos_reconteo.min'      => 'Los gajos no pueden ser negativos.',
        ];
    }
}
