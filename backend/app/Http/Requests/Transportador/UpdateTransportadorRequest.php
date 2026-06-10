<?php

namespace App\Http\Requests\Transportador;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransportadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId        = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $transportadorId = $this->route('transportador')?->id;

        return [
            'empresa_transportadora_id' => ['sometimes', 'integer', 'exists:empresa_transportadora,id'],
            'nombres'                   => ['sometimes', 'string', 'max:100'],
            'apellidos'                 => ['sometimes', 'string', 'max:100'],
            'placa_vehiculo'            => [
                'sometimes', 'string', 'max:20',
                Rule::unique('transportadores', 'placa_vehiculo')
                    ->where('tenant_id', $tenantId)
                    ->ignore($transportadorId),
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
            'empresa_transportadora_id.exists' => 'La empresa transportadora seleccionada no existe.',
            'placa_vehiculo.unique'            => 'Ya existe un conductor registrado con esta placa.',
            'tipo_documento.in'                => 'El tipo de documento debe ser CC, CE, PPT o PASAPORTE.',
            'licencia_vencimiento.date'        => 'La fecha de vencimiento de la licencia no es válida.',
            'capacidad_kg.numeric'             => 'La capacidad debe ser un número.',
        ];
    }
}
