<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class LiquidarEmpleadoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.liquidar') ?? false;
    }

    public function rules(): array
    {
        return [
            'dias_trabajados' => ['sometimes', 'integer', 'min:0', 'max:31'],

            'bonificaciones'                   => ['sometimes', 'array'],
            'bonificaciones.*.nombre'          => ['required_with:bonificaciones', 'string', 'max:100'],
            'bonificaciones.*.valor'           => ['required_with:bonificaciones', 'numeric', 'min:0'],
            'bonificaciones.*.observacion'     => ['nullable', 'string', 'max:255'],

            'deducciones_voluntarias'                          => ['sometimes', 'array'],
            'deducciones_voluntarias.*.concepto_id'            => ['nullable', 'integer', 'exists:nomina_concepto,id'],
            'deducciones_voluntarias.*.valor'                  => ['required_with:deducciones_voluntarias', 'numeric', 'min:0'],
            'deducciones_voluntarias.*.observacion'            => ['nullable', 'string', 'max:255'],
            'deducciones_voluntarias.*.prestamo_cuota_id'      => ['sometimes', 'nullable', 'integer', 'exists:prestamo_cuotas,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $ne = $this->route('nominaEmpleado');
            if (! ($ne instanceof \App\Models\NominaEmpleado) || ! $ne->esDeOperario()) {
                return;
            }
            if (! empty($this->input('bonificaciones'))) {
                $v->errors()->add('bonificaciones', 'Los operarios de terceros no admiten bonificaciones en la nómina de empleados.');
            }
            if (! empty($this->input('deducciones_voluntarias'))) {
                $v->errors()->add('deducciones_voluntarias', 'Los operarios de terceros no admiten deducciones voluntarias en la nómina de empleados.');
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para liquidar empleados',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
