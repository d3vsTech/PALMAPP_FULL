<?php

namespace App\Http\Requests\Market\Configuracion;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfiguracionBancarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app()->bound('current_proveedor_role')
            && app('current_proveedor_role') === 'ADMIN';
    }

    public function rules(): array
    {
        return [
            'banco_id'       => 'required|integer|exists:market_bancos,id',
            'tipo_cuenta'    => 'required|in:ahorros,corriente',
            'numero_cuenta'  => 'required|string|max:30',
            'titular_cuenta' => 'required|string|max:150',
        ];
    }

    public function messages(): array
    {
        return [
            'banco_id.exists'  => 'El banco seleccionado no es válido',
            'tipo_cuenta.in'   => 'El tipo de cuenta debe ser ahorros o corriente',
        ];
    }
}
