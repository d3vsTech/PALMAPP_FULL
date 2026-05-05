<?php

namespace App\Http\Requests\Ausencia;

use Illuminate\Foundation\Http\FormRequest;

class RechazarAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'motivo_rechazo' => 'required|string|max:500',
        ];
    }
}
