<?php

namespace App\Http\Requests\FondoPension;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFondoPensionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $fondoId  = $this->route('fondoPension')?->id;

        return [
            'nombre' => [
                'sometimes', 'string', 'max:100',
                Rule::unique('fondos_pension', 'nombre')
                    ->where('tenant_id', $tenantId)
                    ->ignore($fondoId),
            ],
            'estado' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max'    => 'El nombre no puede exceder los 100 caracteres.',
            'nombre.unique' => 'Ya existe un fondo de pensión con este nombre.',
        ];
    }
}
