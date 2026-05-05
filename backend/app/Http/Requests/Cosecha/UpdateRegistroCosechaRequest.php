<?php

namespace App\Http\Requests\Cosecha;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRegistroCosechaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gajos_reportados'        => 'sometimes|integer|min:1',
            'gajos_reconteo'          => 'sometimes|nullable|integer|min:0',
            'peso_confirmado'         => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'cuadrilla'               => 'sometimes|array|min:1',
            'cuadrilla.*.empleado_id' => 'required_with:cuadrilla|exists:empleados,id|distinct',
        ];
    }
}
