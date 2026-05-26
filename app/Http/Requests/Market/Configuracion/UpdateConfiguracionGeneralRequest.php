<?php

namespace App\Http\Requests\Market\Configuracion;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfiguracionGeneralRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app()->bound('current_proveedor_role')
            && app('current_proveedor_role') === 'ADMIN';
    }

    public function rules(): array
    {
        $proveedorId = app()->bound('current_proveedor_id')
            ? (int) app('current_proveedor_id')
            : null;

        return [
            'nombre_empresa' => 'sometimes|required|string|max:150',
            'nit'            => "sometimes|nullable|string|max:20|unique:market_proveedores,nit,{$proveedorId}",
            'telefono'       => 'sometimes|required|string|max:20',
            'email'          => "sometimes|required|email|max:150|unique:market_proveedores,email,{$proveedorId}",
            'direccion'      => 'sometimes|required|string|max:255',
            'ciudad'         => 'sometimes|required|string|max:80',
            'departamento'   => 'sometimes|required|string|max:80',
            'descripcion'    => 'sometimes|nullable|string',
            'logo_url'       => 'sometimes|nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'nit.unique'   => 'Ya existe un proveedor con este NIT',
            'email.email'  => 'El correo electrónico debe ser válido',
            'email.unique' => 'Ya existe un proveedor con este correo electrónico',
        ];
    }

    /**
     * Solo los campos que vinieron en el request (excluye `estado`, `calificacion_promedio`, `total_ventas`).
     */
    public function configData(): array
    {
        return $this->only([
            'nombre_empresa', 'nit', 'telefono', 'email',
            'direccion', 'ciudad', 'departamento', 'descripcion', 'logo_url',
        ]);
    }
}
