<?php

namespace App\Http\Requests\HoraExtra;

use Illuminate\Foundation\Http\FormRequest;

class RechazarHoraExtraRequest extends FormRequest
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
