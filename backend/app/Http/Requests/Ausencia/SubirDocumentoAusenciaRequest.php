<?php

namespace App\Http\Requests\Ausencia;

use Illuminate\Foundation\Http\FormRequest;

class SubirDocumentoAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'documento' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ];
    }
}
