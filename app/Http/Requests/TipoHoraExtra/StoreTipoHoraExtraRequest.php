<?php

namespace App\Http\Requests\TipoHoraExtra;

use App\Models\TipoHoraExtra;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTipoHoraExtraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'codigo' => [
                'required',
                Rule::in(TipoHoraExtra::CODIGOS),
                Rule::unique('tipos_hora_extra', 'codigo')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'nombre'             => 'required|string|max:100',
            'porcentaje_recargo' => 'required|numeric|min:0|max:200',
            'franja_horaria'     => ['required', Rule::in(TipoHoraExtra::FRANJAS)],
            'aplica_festivo'     => 'sometimes|boolean',
            'es_extra'           => 'sometimes|boolean',
            'paga_hora_completa' => 'sometimes|boolean',
            'estado'             => 'sometimes|boolean',
        ];
    }
}
