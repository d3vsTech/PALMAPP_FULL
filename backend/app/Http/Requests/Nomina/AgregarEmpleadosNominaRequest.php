<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AgregarEmpleadosNominaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.editar') ?? false;
    }

    public function rules(): array
    {
        return [
            'empleado_ids'   => ['nullable', 'array'],
            'empleado_ids.*' => ['integer', 'exists:empleados,id'],
            'operario_ids'   => ['nullable', 'array'],
            'operario_ids.*' => ['integer', 'exists:operarios,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $emp = $this->input('empleado_ids', []);
            $op  = $this->input('operario_ids', []);
            if (empty($emp) && empty($op)) {
                $v->errors()->add('empleado_ids', 'Debe enviar al menos un empleado_id o un operario_id.');
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para gestionar empleados de la nómina',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
