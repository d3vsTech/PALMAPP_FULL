<?php

namespace App\Http\Requests\Extractora;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExtractoraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'razon_social'        => ['required', 'string', 'max:150'],
            'nit'                 => [
                'required', 'string', 'max:30',
                Rule::unique('extractoras', 'nit')->where('tenant_id', $tenantId),
            ],
            'ubicacion'           => ['required', 'string', 'max:200'],
            'departamento_codigo' => ['nullable', 'string', 'size:2', 'exists:departamentos,codigo'],
            'municipio_codigo'    => ['nullable', 'string', 'size:5', 'exists:municipios,codigo'],
            'ciudad'              => ['nullable', 'string', 'max:100'],
            'telefono'            => ['nullable', 'string', 'max:30'],
            'email'               => ['nullable', 'email', 'max:150'],
            'contacto_nombre'     => ['nullable', 'string', 'max:150'],
            'distancia_km'        => ['nullable', 'numeric', 'min:0'],
            'observaciones'       => ['nullable', 'string'],
            'estado'              => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'razon_social.required' => 'La razón social es obligatoria.',
            'razon_social.max'      => 'La razón social no puede exceder los 150 caracteres.',
            'nit.required'          => 'El NIT es obligatorio.',
            'nit.unique'            => 'Ya existe una extractora con este NIT.',
            'ubicacion.required'    => 'La ubicación es obligatoria.',
            'email.email'           => 'El correo electrónico no es válido.',
            'distancia_km.numeric'  => 'La distancia debe ser un número.',
        ];
    }
}
