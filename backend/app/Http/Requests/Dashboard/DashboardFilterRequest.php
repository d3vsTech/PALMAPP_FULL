<?php

namespace App\Http\Requests\Dashboard;

use Illuminate\Foundation\Http\FormRequest;

class DashboardFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'periodo'      => 'nullable|in:semanal,quincenal,mensual,personalizado',
            'fecha_inicio' => 'nullable|date_format:Y-m-d|required_if:periodo,personalizado',
            'fecha_fin'    => 'nullable|date_format:Y-m-d|after_or_equal:fecha_inicio|required_if:periodo,personalizado',
        ];
    }

    public function messages(): array
    {
        return [
            'periodo.in'               => 'El periodo debe ser semanal, quincenal, mensual o personalizado.',
            'fecha_inicio.date_format' => 'La fecha de inicio debe tener el formato Y-m-d.',
            'fecha_fin.date_format'    => 'La fecha de fin debe tener el formato Y-m-d.',
            'fecha_inicio.required_if' => 'La fecha de inicio es obligatoria cuando el periodo es personalizado.',
            'fecha_fin.required_if'    => 'La fecha de fin es obligatoria cuando el periodo es personalizado.',
            'fecha_fin.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
        ];
    }
}
