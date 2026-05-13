<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreMarketProveedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_super_admin === true;
    }

    public function rules(): array
    {
        return [
            'nombre_empresa' => 'required|string|max:150',
            'nit'            => 'nullable|string|max:20|unique:market_proveedores,nit',
            'telefono'       => 'required|string|max:20',
            'email'          => 'required|email|max:150|unique:market_proveedores,email',
            'direccion'      => 'required|string|max:255',
            'ciudad'         => 'required|string|max:80',
            'departamento'   => 'required|string|max:80',
            'descripcion'    => 'nullable|string',
            'logo_url'       => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_empresa.required' => 'El nombre de la empresa es obligatorio',
            'nombre_empresa.max'      => 'El nombre de la empresa no puede exceder 150 caracteres',
            'nit.unique'              => 'Ya existe un proveedor con este NIT',
            'telefono.required'       => 'El teléfono es obligatorio',
            'email.required'          => 'El correo electrónico es obligatorio',
            'email.email'             => 'El correo electrónico debe ser válido',
            'email.unique'            => 'Ya existe un proveedor con este correo electrónico',
            'direccion.required'      => 'La dirección es obligatoria',
            'ciudad.required'         => 'La ciudad es obligatoria',
            'departamento.required'   => 'El departamento es obligatorio',
        ];
    }

    /**
     * Datos del proveedor para mass assignment (tabla market_proveedores).
     */
    public function proveedorData(): array
    {
        return $this->only([
            'nombre_empresa', 'nit', 'telefono', 'email',
            'direccion', 'ciudad', 'departamento', 'descripcion', 'logo_url',
        ]);
    }
}
