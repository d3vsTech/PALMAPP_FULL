<?php

namespace App\Http\Requests\EntidadBancaria;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEntidadBancariaRequest extends FormRequest
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
                Rule::unique('entidades_bancarias', 'nombre')->where('tenant_id', $tenantId),
            ],
            'codigo'   => 'nullable|string|max:10',
            'contacto' => 'nullable|string|max:50',
            'estado'   => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.max'      => 'El nombre no puede exceder los 100 caracteres.',
            'nombre.unique'   => 'Ya existe una entidad bancaria con este nombre.',
        ];
    }
}
