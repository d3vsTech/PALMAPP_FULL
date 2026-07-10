<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class AjustarPromedioLoteNominaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.editar') ?? false;
    }

    public function rules(): array
    {
        return [
            'promedio' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'promedio.required' => 'El promedio es obligatorio.',
            'promedio.numeric'  => 'El promedio debe ser un número.',
            'promedio.min'      => 'El promedio debe ser mayor a 0.',
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para editar esta nómina',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
