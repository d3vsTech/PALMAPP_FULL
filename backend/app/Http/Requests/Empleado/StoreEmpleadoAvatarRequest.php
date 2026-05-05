<?php

namespace App\Http\Requests\Empleado;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmpleadoAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:3072',
        ];
    }

    public function messages(): array
    {
        return [
            'avatar.required' => 'La imagen del avatar es obligatoria',
            'avatar.image'    => 'El archivo debe ser una imagen',
            'avatar.mimes'    => 'El avatar debe ser jpg, jpeg, png o webp',
            'avatar.max'      => 'El avatar no puede superar los 3 MB',
        ];
    }
}
