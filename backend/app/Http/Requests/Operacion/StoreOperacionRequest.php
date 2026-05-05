<?php

namespace App\Http\Requests\Operacion;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOperacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'fecha' => [
                'required', 'date',
                Rule::unique('operaciones', 'fecha')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'hora_inicio'     => 'nullable|date_format:H:i',
            'hora_fin'        => 'nullable|date_format:H:i|after:hora_inicio',
            'hubo_lluvia'     => 'required|boolean',
            'cantidad_lluvia' => 'nullable|numeric|min:0|max:9999.99',
            'observaciones'   => 'nullable|string|max:500',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            if ($this->boolean('hubo_lluvia') && !$this->filled('cantidad_lluvia')) {
                $v->errors()->add('cantidad_lluvia', 'Si hubo lluvia, cantidad_lluvia es obligatoria.');
            }
            if (!$this->boolean('hubo_lluvia') && $this->filled('cantidad_lluvia')) {
                $v->errors()->add('cantidad_lluvia', 'Si no hubo lluvia, cantidad_lluvia debe estar vacía.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'fecha.unique' => 'Ya existe una planilla creada para esa fecha.',
        ];
    }
}
