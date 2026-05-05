<?php

namespace App\Http\Requests\TipoHoraExtra;

use App\Models\TipoHoraExtra;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTipoHoraExtraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $tipoHoraExtraId = $this->route('tipoHoraExtra')?->id ?? $this->route('tipoHoraExtra');

        return [
            'codigo' => [
                'sometimes',
                Rule::in(TipoHoraExtra::CODIGOS),
                Rule::unique('tipos_hora_extra', 'codigo')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($tipoHoraExtraId),
            ],
            'nombre'             => 'sometimes|string|max:100',
            'porcentaje_recargo' => 'sometimes|numeric|min:0|max:200',
            'franja_horaria'     => ['sometimes', Rule::in(TipoHoraExtra::FRANJAS)],
            'aplica_festivo'     => 'sometimes|boolean',
            'es_extra'           => 'sometimes|boolean',
            'paga_hora_completa' => 'sometimes|boolean',
            'estado'             => 'sometimes|boolean',
        ];
    }
}
