<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class ImportarProductosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'archivo' => ['required', 'file', 'mimes:zip', 'max:51200'],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'Debe adjuntar un archivo ZIP con productos.xlsx y la carpeta imagenes/.',
            'archivo.file'     => 'El campo archivo debe ser un archivo válido.',
            'archivo.mimes'    => 'El archivo debe ser un ZIP (.zip).',
            'archivo.max'      => 'El archivo no puede superar los 50 MB.',
        ];
    }
}
