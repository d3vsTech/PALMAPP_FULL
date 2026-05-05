<?php

namespace App\Http\Requests\HoraExtra;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHoraExtraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empleado_id'        => 'sometimes|exists:empleados,id',
            'tipo_hora_extra_id' => 'sometimes|exists:tipos_hora_extra,id',
            'cantidad_horas'     => 'sometimes|numeric|min:0.25|max:12',
            'observacion'        => 'sometimes|nullable|string',
        ];
    }
}
