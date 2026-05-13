<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMarketProveedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_super_admin === true;
    }

    public function rules(): array
    {
        $proveedorId = $this->route('proveedor')?->id ?? $this->route('proveedor');

        return [
            'nombre_empresa' => 'sometimes|required|string|max:150',
            'nit'            => "sometimes|nullable|string|max:20|unique:market_proveedores,nit,{$proveedorId}",
            'telefono'       => 'sometimes|required|string|max:20',
            'email'          => "sometimes|required|email|max:150|unique:market_proveedores,email,{$proveedorId}",
            'direccion'      => 'sometimes|required|string|max:255',
            'ciudad'         => 'sometimes|required|string|max:80',
            'departamento'   => 'sometimes|required|string|max:80',
            'descripcion'    => 'nullable|string',
            'logo_url'       => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_empresa.max' => 'El nombre de la empresa no puede exceder 150 caracteres',
            'nit.unique'         => 'Ya existe un proveedor con este NIT',
            'email.email'        => 'El correo electrónico debe ser válido',
            'email.unique'       => 'Ya existe un proveedor con este correo electrónico',
        ];
    }

    /**
     * Datos del proveedor que vinieron en el request (filtra nulls).
     */
    public function proveedorData(): array
    {
        return collect($this->only([
            'nombre_empresa', 'nit', 'telefono', 'email',
            'direccion', 'ciudad', 'departamento', 'descripcion', 'logo_url',
        ]))->filter(fn($v) => $v !== null)->toArray();
    }
}
