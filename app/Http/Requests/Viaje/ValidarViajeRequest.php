<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Hidrata los datos del formulario de extractora cuando el viaje está
 * EN_VALIDACION. Todos los campos son opcionales: el operador puede llenar
 * solo los que la extractora reportó (algunas extractoras no entregan todos
 * los campos de calidad).
 */
class ValidarViajeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'peso_viaje'                 => 'nullable|numeric|min:0|max:99999999.99',
            'numero_remision_extractora' => 'nullable|string|max:50',
            'fecha_llegada'              => 'nullable|date',
            'hora_llegada'               => 'nullable|date_format:H:i',
            'racimos_recibidos'          => 'nullable|integer|min:0',
            'temperatura_pulpa'          => 'nullable|numeric|min:0|max:999.99',
            'acidez_inicial'             => 'nullable|numeric|min:0|max:999.99',
            'humedad_semilla'            => 'nullable|numeric|min:0|max:999.99',
            'calidad_materia_prima'      => 'nullable|in:excelente,buena,regular,deficiente',
            'observaciones_extractora'   => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'hora_llegada.date_format'        => 'La hora de llegada debe tener formato HH:MM (24 horas).',
            'calidad_materia_prima.in'        => 'La calidad de materia prima debe ser: excelente, buena, regular o deficiente.',
        ];
    }
}
