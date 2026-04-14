<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_super_admin === true;
    }

    public function rules(): array
    {
        return [
            'nombre'           => 'required|string|max:100',
            'tipo_persona'     => 'required|in:NATURAL,JURIDICA',
            'nit'              => 'required|string|max:20|unique:tenants,nit',
            'razon_social'     => 'required|string|max:200',
            'correo_contacto'  => 'required|email|max:100',
            'telefono'         => 'required|string|max:20',
            'direccion'        => 'nullable|string|max:200',
            'departamento'     => 'required|string|max:100',
            'municipio'        => 'required|string|max:100',
            'fecha_activacion' => 'required|date_format:d/m/Y',
            'fecha_suspension' => 'required|date_format:d/m/Y',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'              => 'El nombre de la finca es obligatorio',
            'nombre.max'                   => 'El nombre no puede exceder 100 caracteres',
            'tipo_persona.required'        => 'El tipo de persona es obligatorio',
            'tipo_persona.in'              => 'El tipo de persona debe ser NATURAL o JURIDICA',
            'nit.required'                 => 'El NIT es obligatorio',
            'nit.unique'                   => 'Ya existe una finca con este NIT, por favor revise',
            'razon_social.required'        => 'La razón social es obligatoria',
            'correo_contacto.required'     => 'El correo de contacto es obligatorio',
            'correo_contacto.email'        => 'El correo de contacto debe ser válido',
            'telefono.required'            => 'El teléfono es obligatorio',
            'departamento.required'        => 'El departamento es obligatorio',
            'municipio.required'           => 'El municipio es obligatorio',
            'fecha_activacion.required'    => 'La fecha de activación es obligatoria',
            'fecha_activacion.date_format' => 'La fecha de activación debe tener formato dd/mm/yyyy',
            'fecha_suspension.required'    => 'La fecha de suspensión es obligatoria',
            'fecha_suspension.date_format' => 'La fecha de suspensión debe tener formato dd/mm/yyyy',
        ];
    }

    /**
     * Datos del tenant (tabla tenants).
     */
    public function tenantData(): array
    {
        $data = $this->only([
            'nombre', 'tipo_persona', 'nit', 'razon_social', 'correo_contacto',
            'telefono', 'direccion', 'departamento', 'municipio',
        ]);

        if ($this->filled('fecha_activacion')) {
            $data['fecha_activacion'] = \Carbon\Carbon::createFromFormat('d/m/Y', $this->fecha_activacion);
        }

        if ($this->filled('fecha_suspension')) {
            $data['fecha_suspension'] = \Carbon\Carbon::createFromFormat('d/m/Y', $this->fecha_suspension);
        }

        return $data;
    }

    /**
     * Configuración por defecto para el tenant_config.
     */
    public function configDefaults(): array
    {
        return [
            'modulo_dashboard'      => true,
            'modulo_plantacion'     => true,
            'modulo_colaboradores'  => true,
            'modulo_nomina'         => true,
            'modulo_operaciones'    => true,
            'modulo_viajes'         => true,
            'modulo_usuarios'       => true,
            'modulo_configuracion'  => true,
            'tipo_pago_nomina'      => 'QUINCENAL',
            'moneda'                => 'COP',
            'zona_horaria'          => 'America/Bogota',
            'pais'                  => 'CO',
            'salario_minimo_vigente' => 1750905.00,
            'auxilio_transporte'    => 249095.00,
            'sync_habilitado'       => false,
        ];
    }
}
