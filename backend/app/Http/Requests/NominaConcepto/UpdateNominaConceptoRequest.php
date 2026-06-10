<?php

namespace App\Http\Requests\NominaConcepto;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class UpdateNominaConceptoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('nomina-conceptos.gestionar');
    }

    protected function prepareForValidation(): void
    {
        foreach (['vigente_desde', 'vigente_hasta'] as $campo) {
            $valor = $this->input($campo);
            if (is_string($valor) && preg_match('#^\d{2}/\d{2}/\d{4}$#', $valor)) {
                $this->merge([$campo => Carbon::createFromFormat('d/m/Y', $valor)->toDateString()]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'nombre'                => ['sometimes', 'string', 'max:100'],
            'valor_referencia'      => ['sometimes', 'nullable', 'numeric'],
            'base_calculo'          => ['sometimes', 'in:SALARIO_BASE,TOTAL_DEVENGADO,SALARIO_MINIMO,MANUAL'],
            'aplica_a'              => ['sometimes', 'in:FIJO,VARIABLE,AMBOS'],
            'es_obligatorio'        => ['sometimes', 'boolean'],
            'activo'                => ['sometimes', 'boolean'],
            'porcentaje_empleado'   => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'porcentaje_empresa'    => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'vigente_desde'         => ['sometimes', 'nullable', 'date'],
            'vigente_hasta'         => ['sometimes', 'nullable', 'date', 'after_or_equal:vigente_desde'],
            'afecta_salario_minimo' => ['sometimes', 'boolean'],
            'tipo_remuneracion'     => ['sometimes', 'in:REMUNERADO,NO_REMUNERADO'],
        ];
    }
}
