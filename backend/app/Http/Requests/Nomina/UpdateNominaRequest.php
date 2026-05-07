<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateNominaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.editar') ?? false;
    }

    public function rules(): array
    {
        return [
            'mes'         => ['sometimes', 'integer', 'min:1', 'max:12'],
            'anio'        => ['sometimes', 'integer', 'min:2020', 'max:2099'],
            'quincena'    => ['sometimes', 'nullable', 'integer', 'in:1,2'],
            'observacion' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para editar nóminas',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
