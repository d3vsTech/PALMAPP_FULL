<?php

namespace App\Http\Requests\Market\Configuracion;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfiguracionEnviosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app()->bound('current_proveedor_role')
            && app('current_proveedor_role') === 'ADMIN';
    }

    public function rules(): array
    {
        return [
            'transportadora_id'        => 'nullable|integer|exists:market_transportadoras,id',
            'tiempo_preparacion_horas' => 'required|integer|min:1|max:720',
            'monto_envio_gratis'       => 'nullable|numeric|min:0|max:99999999.99',
            'permitir_recoger_tienda'  => 'required|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'transportadora_id.exists'    => 'La transportadora seleccionada no es válida',
            'tiempo_preparacion_horas.min' => 'El tiempo de preparación debe ser mínimo 1 hora',
            'tiempo_preparacion_horas.max' => 'El tiempo de preparación no puede exceder 720 horas (30 días)',
        ];
    }
}
