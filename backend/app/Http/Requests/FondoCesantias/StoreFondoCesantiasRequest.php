<?php

namespace App\Http\Requests\FondoCesantias;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFondoCesantiasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'nombre' => [
                'required', 'string', 'max:100',
                Rule::unique('fondos_cesantias', 'nombre')->where('tenant_id', $tenantId),
            ],
            'estado' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.max'      => 'El nombre no puede exceder los 100 caracteres.',
            'nombre.unique'   => 'Ya existe un fondo de cesantías con este nombre.',
        ];
    }
}
