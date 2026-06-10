<?php

namespace App\Http\Requests\EmpresaTransportadora;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmpresaTransportadoraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId  = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $empresaId = $this->route('empresa')?->id;

        return [
            'tipo_persona'    => ['sometimes', 'in:JURIDICA,NATURAL'],
            'razon_social'    => ['sometimes', 'string', 'max:150'],
            'nit'             => [
                'sometimes', 'string', 'max:30',
                Rule::unique('empresa_transportadora', 'nit')
                    ->where('tenant_id', $tenantId)
                    ->ignore($empresaId),
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
            'tipo_persona.in'  => 'El tipo de persona debe ser JURIDICA o NATURAL.',
            'razon_social.max' => 'El nombre no puede exceder los 150 caracteres.',
            'nit.unique'       => 'Ya existe una empresa con este NIT.',
            'email.email'      => 'El correo electrónico no es válido.',
        ];
    }
}
