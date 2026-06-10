<?php

namespace App\Http\Requests\Transportador;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransportadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return [
            'empresa_transportadora_id' => ['required', 'integer', 'exists:empresa_transportadora,id'],
            'nombres'                   => ['required', 'string', 'max:100'],
            'apellidos'                 => ['required', 'string', 'max:100'],
            'placa_vehiculo'            => [
                'required', 'string', 'max:20',
                Rule::unique('transportadores', 'placa_vehiculo')->where('tenant_id', $tenantId),
            ],
            'tipo_documento'            => ['nullable', 'in:CC,CE,PPT,PASAPORTE'],
            'numero_documento'          => ['nullable', 'string', 'max:30'],
            'telefono'                  => ['nullable', 'string', 'max:30'],
            'licencia_conduccion'       => ['nullable', 'string', 'max:30'],
            'licencia_vencimiento'      => ['nullable', 'date'],
            'tipo_vehiculo'             => ['nullable', 'string', 'max:50'],
            'capacidad_kg'              => ['nullable', 'numeric', 'min:0'],
            'observaciones'             => ['nullable', 'string'],
            'estado'                    => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'empresa_transportadora_id.required' => 'La empresa transportadora es obligatoria.',
            'empresa_transportadora_id.exists'   => 'La empresa transportadora seleccionada no existe.',
            'nombres.required'                   => 'Los nombres son obligatorios.',
            'apellidos.required'                 => 'Los apellidos son obligatorios.',
            'placa_vehiculo.required'            => 'La placa del vehículo es obligatoria.',
            'placa_vehiculo.unique'              => 'Ya existe un conductor registrado con esta placa.',
            'tipo_documento.in'                  => 'El tipo de documento debe ser CC, CE, PPT o PASAPORTE.',
            'licencia_vencimiento.date'          => 'La fecha de vencimiento de la licencia no es válida.',
            'capacidad_kg.numeric'               => 'La capacidad debe ser un número.',
        ];
    }
}
