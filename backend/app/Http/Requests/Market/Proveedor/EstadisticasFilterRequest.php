<?php

namespace App\Http\Requests\Market\Proveedor;

use Illuminate\Foundation\Http\FormRequest;

class EstadisticasFilterRequest extends FormRequest
{
    public const PRESETS = [
        'ultimos_7_dias',
        'ultimos_30_dias',
        'ultimos_3_meses',
        'ultimos_6_meses',
        'este_anio',
        'personalizado',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'periodo'     => ['nullable', 'string', 'in:' . implode(',', self::PRESETS)],
            'fecha_desde' => ['nullable', 'date_format:Y-m-d', 'required_if:periodo,personalizado'],
            'fecha_hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:fecha_desde', 'required_if:periodo,personalizado'],
            'formato'     => ['nullable', 'string', 'in:excel'],
        ];
    }

    public function messages(): array
    {
        return [
            'periodo.in'               => 'El periodo debe ser ultimos_7_dias, ultimos_30_dias, ultimos_3_meses, ultimos_6_meses, este_anio o personalizado.',
            'fecha_desde.date_format'  => 'La fecha desde debe tener el formato Y-m-d.',
            'fecha_hasta.date_format'  => 'La fecha hasta debe tener el formato Y-m-d.',
            'fecha_desde.required_if'  => 'La fecha desde es obligatoria cuando el periodo es personalizado.',
            'fecha_hasta.required_if'  => 'La fecha hasta es obligatoria cuando el periodo es personalizado.',
            'fecha_hasta.after_or_equal' => 'La fecha hasta debe ser igual o posterior a la fecha desde.',
            'formato.in'               => 'El formato debe ser excel.',
        ];
    }
}
