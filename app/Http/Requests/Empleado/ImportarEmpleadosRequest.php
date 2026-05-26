<?php

namespace App\Http\Requests\Empleado;

use Illuminate\Foundation\Http\FormRequest;

class ImportarEmpleadosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'archivo' => ['required', 'file', 'max:5120', 'mimes:xlsx,xls'],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'Debe adjuntar un archivo Excel',
            'archivo.file'     => 'El campo archivo debe ser un archivo válido',
            'archivo.max'      => 'El archivo no puede superar los 5 MB',
            'archivo.mimes'    => 'El archivo debe ser formato Excel (.xlsx o .xls)',
        ];
    }
}
