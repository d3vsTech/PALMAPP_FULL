<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

class UpdateViajeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fecha_viaje'       => 'sometimes|date',
            'hora_salida'       => 'sometimes|date_format:H:i',
            'transportador_id'  => 'sometimes|integer|exists:transportadores,id',
            'extractora_id'     => 'sometimes|integer|exists:extractoras,id',
            'observaciones'     => 'nullable|string|max:255',
        ];
    }
}
