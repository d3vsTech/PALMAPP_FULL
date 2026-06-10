<?php

namespace App\Http\Requests\NominaConcepto;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNominaConceptoRequest extends FormRequest
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
        $tenantId = (int) $this->header('X-Tenant-Id');

        $requiereVigenciaYPorcentaje = function () {
            return in_array($this->input('tipo'), ['APORTE_LEGAL', 'DEDUCCION_LEGAL'], true)
                && $this->input('calculo') === 'PORCENTAJE';
        };

        return [
            'codigo'                 => ['required', 'string', 'max:20', Rule::unique('nomina_concepto', 'codigo')->where('tenant_id', $tenantId)],
            'nombre'                 => ['required', 'string', 'max:100'],
            'tipo'                   => ['required', 'in:APORTE_LEGAL,DEDUCCION_LEGAL,DEDUCCION_VOLUNTARIA,BONIFICACION_FIJA,BONIFICACION_VARIABLE'],
            'subtipo'                => ['required', 'in:SALUD,PENSION,ARL,FONDO_SOLIDARIDAD,LIBRANZA,EMBARGO,PRESTAMO,AHORRO_VOLUNTARIO,PRODUCTIVIDAD,TRANSPORTE,ALIMENTACION,ANTIGUEDAD,OTRO'],
            'operacion'              => ['required', 'in:SUMA,RESTA'],
            'calculo'                => ['required', 'in:PORCENTAJE,VALOR_FIJO,FORMULA'],
            'valor_referencia'       => ['nullable', 'numeric'],
            'base_calculo'           => ['required', 'in:SALARIO_BASE,TOTAL_DEVENGADO,SALARIO_MINIMO,MANUAL'],
            'aplica_a'               => ['required', 'in:FIJO,VARIABLE,AMBOS'],
            'es_obligatorio'         => ['sometimes', 'boolean'],
            'activo'                 => ['sometimes', 'boolean'],
            'porcentaje_empleado'    => [Rule::requiredIf($requiereVigenciaYPorcentaje), 'nullable', 'numeric', 'min:0', 'max:100'],
            'porcentaje_empresa'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'vigente_desde'          => [Rule::requiredIf($requiereVigenciaYPorcentaje), 'nullable', 'date'],
            'vigente_hasta'          => ['nullable', 'date', 'after_or_equal:vigente_desde'],
            'afecta_salario_minimo'  => ['sometimes', 'boolean'],
            'tipo_remuneracion'      => ['sometimes', 'in:REMUNERADO,NO_REMUNERADO'],
        ];
    }
}
