<?php

namespace App\Http\Requests\MotivoAusencia;

use App\Models\Ausencia;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMotivoAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'                  => 'sometimes|string|max:100',
            'tipo_base'               => ['sometimes', Rule::in([
                Ausencia::TIPO_INCAPACIDAD_EPS,
                Ausencia::TIPO_INCAPACIDAD_ARL,
                Ausencia::TIPO_LICENCIA_MATERNIDAD,
                Ausencia::TIPO_LICENCIA_PATERNIDAD,
                Ausencia::TIPO_LICENCIA_LUTO,
                Ausencia::TIPO_PERMISO_REMUNERADO,
                Ausencia::TIPO_PERMISO_NO_REMUNERADO,
                Ausencia::TIPO_AUSENCIA_INJUSTIFICADA,
                Ausencia::TIPO_CALAMIDAD_DOMESTICA,
                Ausencia::TIPO_SUSPENSION_DISCIPLINARIA,
                Ausencia::TIPO_OTRO,
            ])],
            'es_remunerada'           => 'sometimes|boolean',
            'afecta_nomina'           => 'sometimes|boolean',
            'porcentaje_pago_default' => 'sometimes|numeric|min:0|max:100',
            'requiere_soporte'        => 'sometimes|boolean',
            'estado'                  => 'sometimes|boolean',
            'color'                   => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'condicion'               => 'sometimes|nullable|string|max:100',
            'norma_legal'             => 'sometimes|nullable|string|max:50',
            'formula_calculo'         => 'sometimes|nullable|string|max:200',
            'afecta_seguridad_social' => 'sometimes|boolean',
            'afecta_parafiscales'     => 'sometimes|boolean',
            'afecta_prestaciones'     => 'sometimes|boolean',
        ];
    }
}
