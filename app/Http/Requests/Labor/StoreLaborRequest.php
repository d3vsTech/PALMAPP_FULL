<?php

namespace App\Http\Requests\Labor;

use Illuminate\Foundation\Http\FormRequest;

class StoreLaborRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'     => 'required|string|max:100',
            'valor_base' => 'required|numeric|min:0|max:99999999.99',
        ];
    }
}
