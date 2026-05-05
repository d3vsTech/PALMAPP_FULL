<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

class StoreViajeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fecha_viaje'       => 'required|date',
            'hora_salida'       => 'required|date_format:H:i',
            'transportador_id'  => 'required|integer|exists:transportadores,id',
            'extractora_id'     => 'required|integer|exists:extractoras,id',
            'observaciones'     => 'nullable|string|max:255',
            'es_homogeneo'      => 'sometimes|boolean',
            'sync_uuid'         => 'nullable|uuid|unique:viajes,sync_uuid',
        ];
    }

    public function messages(): array
    {
        return [
            'fecha_viaje.required'      => 'La fecha del viaje es obligatoria.',
            'hora_salida.required'      => 'La hora de salida es obligatoria.',
            'hora_salida.date_format'   => 'La hora de salida debe tener formato HH:mm.',
            'transportador_id.required' => 'Debe seleccionar un transportador.',
            'extractora_id.required'    => 'Debe seleccionar una extractora destino.',
        ];
    }
}
