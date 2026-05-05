<?php

namespace App\Http\Requests\HoraExtra;

use App\Models\TipoHoraExtra;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Payload del wizard Paso 4. La UI muestra:
 *  - select tipo_hora_extra (dropdown "Tipo de Hora")
 *  - input cantidad_horas (campo "Número de Horas")
 *  - select empleado (dropdown "Colaborador")
 *  - observación
 */
class StoreHoraExtraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empleado_id'        => 'required|exists:empleados,id',
            'tipo_hora_extra_id' => 'required|exists:tipos_hora_extra,id',
            'cantidad_horas'     => 'required|numeric|min:0.25|max:12',
            'observacion'        => 'nullable|string',

            'sync_uuid'          => 'nullable|uuid|unique:horas_extra,sync_uuid',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

            $tipo = TipoHoraExtra::find($this->input('tipo_hora_extra_id'));
            if ($tipo && ($tipo->tenant_id !== $tenantId || !$tipo->estado)) {
                $v->errors()->add('tipo_hora_extra_id', 'El tipo de hora extra no es válido o está inactivo.');
            }
        });
    }
}
