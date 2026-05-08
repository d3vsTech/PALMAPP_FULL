<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notas'             => 'nullable|string|max:500',
            'metodo_pago'       => 'nullable|string|max:100',
            'direccion_entrega' => 'nullable|string|max:300',
        ];
    }

    public function messages(): array
    {
        return [
            'notas.max'             => 'Las notas no pueden exceder 500 caracteres',
            'metodo_pago.max'       => 'El método de pago no puede exceder 100 caracteres',
            'direccion_entrega.max' => 'La dirección de entrega no puede exceder 300 caracteres',
        ];
    }
}
