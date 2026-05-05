<?php

namespace App\Http\Requests\Arl;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateArlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $arlId    = $this->route('arl')?->id;

        return [
            'nombre' => [
                'sometimes', 'string', 'max:100',
                Rule::unique('arl', 'nombre')
                    ->where('tenant_id', $tenantId)
                    ->ignore($arlId),
            ],
            'estado' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max'    => 'El nombre no puede exceder los 100 caracteres.',
            'nombre.unique' => 'Ya existe una ARL con este nombre.',
        ];
    }
}
