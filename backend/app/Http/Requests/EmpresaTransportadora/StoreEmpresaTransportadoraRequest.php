<?php

namespace App\Http\Requests\EmpresaTransportadora;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmpresaTransportadoraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'tipo_persona'    => ['required', 'in:JURIDICA,NATURAL'],
            'razon_social'    => ['required', 'string', 'max:150'],
            'nit'             => [
                'required', 'string', 'max:30',
                Rule::unique('empresa_transportadora', 'nit')->where('tenant_id', $tenantId),
            ],
            'telefono'        => ['nullable', 'string', 'max:30'],
            'direccion'       => ['nullable', 'string', 'max:200'],
            'ciudad'          => ['nullable', 'string', 'max:100'],
            'email'           => ['nullable', 'email', 'max:150'],
            'contacto_nombre' => ['nullable', 'string', 'max:150'],
            'observaciones'   => ['nullable', 'string'],
            'estado'          => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_persona.required' => 'El tipo de persona es obligatorio.',
            'tipo_persona.in'       => 'El tipo de persona debe ser JURIDICA o NATURAL.',
            'razon_social.required' => 'El nombre / razón social es obligatorio.',
            'razon_social.max'      => 'El nombre no puede exceder los 150 caracteres.',
            'nit.required'          => 'El NIT es obligatorio.',
            'nit.unique'            => 'Ya existe una empresa con este NIT.',
            'email.email'           => 'El correo electrónico no es válido.',
        ];
    }
}
