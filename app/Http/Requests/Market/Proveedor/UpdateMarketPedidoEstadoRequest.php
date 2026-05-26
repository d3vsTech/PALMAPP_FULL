<?php

namespace App\Http\Requests\Market\Proveedor;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMarketPedidoEstadoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado'                 => ['required', 'string', 'in:confirmado,preparando,en_transito,entregado,cancelado'],
            'comentario'             => ['nullable', 'string', 'max:500'],
            'numero_guia'            => ['nullable', 'string', 'max:100'],
            'fecha_entrega_estimada' => ['nullable', 'date', 'after:today'],
            'estado_pago'            => ['nullable', 'string', 'in:pendiente,pagado'],
            'prioridad'              => ['nullable', 'string', 'in:normal,alta,urgente'],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' => 'El nuevo estado es obligatorio.',
            'estado.in'       => 'El estado debe ser: confirmado, preparando, en_transito, entregado o cancelado.',
            'comentario.max'  => 'El comentario no puede superar 500 caracteres.',
            'numero_guia.max' => 'El número de guía no puede superar 100 caracteres.',
            'fecha_entrega_estimada.date'       => 'La fecha de entrega estimada no es válida.',
            'fecha_entrega_estimada.after'      => 'La fecha de entrega estimada debe ser posterior a hoy.',
            'estado_pago.in'  => 'El estado de pago debe ser pendiente o pagado.',
            'prioridad.in'    => 'La prioridad debe ser normal, alta o urgente.',
        ];
    }
}
