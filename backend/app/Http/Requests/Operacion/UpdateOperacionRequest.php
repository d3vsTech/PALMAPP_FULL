<?php

namespace App\Http\Requests\Operacion;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOperacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hora_inicio'     => 'sometimes|nullable|date_format:H:i',
            'hora_fin'        => 'sometimes|nullable|date_format:H:i|after:hora_inicio',
            'hubo_lluvia'     => 'sometimes|boolean',
            'cantidad_lluvia' => 'sometimes|nullable|numeric|min:0|max:9999.99',
            'observaciones'   => 'sometimes|nullable|string|max:500',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            if ($this->has('hubo_lluvia')) {
                $hubo = $this->boolean('hubo_lluvia');
                if ($hubo && $this->has('cantidad_lluvia') && !$this->filled('cantidad_lluvia')) {
                    $v->errors()->add('cantidad_lluvia', 'Si hubo lluvia, cantidad_lluvia es obligatoria.');
                }
                if (!$hubo && $this->filled('cantidad_lluvia')) {
                    $v->errors()->add('cantidad_lluvia', 'Si no hubo lluvia, cantidad_lluvia debe estar vacía.');
                }
            }
        });
    }
}
