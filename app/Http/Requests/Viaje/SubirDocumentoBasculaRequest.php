<?php

namespace App\Http\Requests\Viaje;

use Illuminate\Foundation\Http\FormRequest;

class SubirDocumentoBasculaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'documento' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ];
    }

    public function messages(): array
    {
        return [
            'documento.required' => 'Debes adjuntar el documento del ticket de báscula.',
            'documento.mimes'    => 'Solo se aceptan archivos PDF, JPG o PNG.',
            'documento.max'      => 'El archivo no puede superar 10 MB.',
        ];
    }
}
