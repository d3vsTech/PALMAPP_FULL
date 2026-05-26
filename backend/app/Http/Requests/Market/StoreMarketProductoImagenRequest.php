<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class StoreMarketProductoImagenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'imagen'   => 'required|image|mimes:jpg,jpeg,png,webp|max:3072',
            'alt_text' => 'nullable|string|max:150',
            'orden'    => 'nullable|integer|min:0|max:99',
        ];
    }

    public function messages(): array
    {
        return [
            'imagen.required' => 'La imagen es obligatoria.',
            'imagen.image'    => 'El archivo debe ser una imagen.',
            'imagen.mimes'    => 'La imagen debe ser jpg, jpeg, png o webp.',
            'imagen.max'      => 'La imagen no puede superar 3 MB.',
            'alt_text.max'    => 'El texto alternativo no puede exceder 150 caracteres.',
            'orden.min'       => 'El orden debe ser 0 o mayor.',
            'orden.max'       => 'El orden no puede exceder 99.',
        ];
    }
}
