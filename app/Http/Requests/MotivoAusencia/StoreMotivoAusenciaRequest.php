<?php

namespace App\Http\Requests\MotivoAusencia;

use App\Models\Ausencia;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMotivoAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'                  => 'required|string|max:100',
            'tipo_base'               => ['required', Rule::in(self::tiposBase())],
            'es_remunerada'           => 'sometimes|boolean',
            'afecta_nomina'           => 'sometimes|boolean',
            'porcentaje_pago_default' => 'sometimes|numeric|min:0|max:100',
            'requiere_soporte'        => 'sometimes|boolean',
            'estado'                  => 'sometimes|boolean',
            'color'                   => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'condicion'               => 'nullable|string|max:100',
            'norma_legal'             => 'nullable|string|max:50',
            'formula_calculo'         => 'nullable|string|max:200',
            'afecta_seguridad_social' => 'sometimes|boolean',
            'afecta_parafiscales'     => 'sometimes|boolean',
            'afecta_prestaciones'     => 'sometimes|boolean',
        ];
    }

    private static function tiposBase(): array
    {
        return [
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
        ];
    }
}
