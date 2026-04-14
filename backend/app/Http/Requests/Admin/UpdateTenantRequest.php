<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_super_admin === true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenant')?->id ?? $this->route('tenant');

        return [
            'nombre'           => 'sometimes|string|max:100',
            'tipo_persona'     => 'sometimes|in:NATURAL,JURIDICA',
            'nit'              => "sometimes|string|max:20|unique:tenants,nit,{$tenantId}",
            'razon_social'     => 'sometimes|string|max:200',
            'correo_contacto'  => 'sometimes|email|max:100',
            'telefono'         => 'sometimes|string|max:20',
            'direccion'        => 'nullable|string|max:200',
            'departamento'     => 'sometimes|string|max:100',
            'municipio'        => 'sometimes|string|max:100',
            'fecha_activacion' => 'sometimes|date_format:d/m/Y',
            'fecha_suspension' => 'sometimes|date_format:d/m/Y',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max'                   => 'El nombre no puede exceder 100 caracteres',
            'tipo_persona.in'              => 'El tipo de persona debe ser NATURAL o JURIDICA',
            'nit.unique'                   => 'Ya existe una finca con este NIT, por favor revise',
            'correo_contacto.email'        => 'El correo de contacto debe ser válido',
            'fecha_activacion.date_format' => 'La fecha de activación debe tener formato dd/mm/yyyy',
            'fecha_suspension.date_format' => 'La fecha de suspensión debe tener formato dd/mm/yyyy',
        ];
    }

    /**
     * Datos del tenant que se enviaron en el request.
     */
    public function tenantData(): array
    {
        $data = collect($this->only([
            'nombre', 'tipo_persona', 'nit', 'razon_social', 'correo_contacto',
            'telefono', 'direccion', 'departamento', 'municipio',
        ]))->filter(fn($v) => $v !== null)->toArray();

        if ($this->filled('fecha_activacion')) {
            $data['fecha_activacion'] = \Carbon\Carbon::createFromFormat('d/m/Y', $this->fecha_activacion);
        }

        if ($this->filled('fecha_suspension')) {
            $data['fecha_suspension'] = \Carbon\Carbon::createFromFormat('d/m/Y', $this->fecha_suspension);
        }

        return $data;
    }
}
