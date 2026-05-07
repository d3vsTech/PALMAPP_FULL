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
            'empleado_ids'   => ['required', 'array', 'min:1'],
            'empleado_ids.*' => ['integer', 'exists:empleados,id'],
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para gestionar empleados de la nómina',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
