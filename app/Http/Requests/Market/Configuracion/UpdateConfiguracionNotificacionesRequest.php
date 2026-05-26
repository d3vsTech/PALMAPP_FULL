<?php

namespace App\Http\Requests\Market\Configuracion;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConfiguracionNotificacionesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app()->bound('current_proveedor_role')
            && app('current_proveedor_role') === 'ADMIN';
    }

    public function rules(): array
    {
        return [
            'nuevos_pedidos'     => 'required|boolean',
            'cambios_estado'     => 'required|boolean',
            'mensajes_clientes'  => 'required|boolean',
            'reportes_diarios'   => 'required|boolean',
            'reportes_semanales' => 'required|boolean',
        ];
    }

    /**
     * Estructura final del jsonb que se guardará en `notificaciones_config`.
     */
    public function notificacionesData(): array
    {
        return [
            'nuevos_pedidos'     => $this->boolean('nuevos_pedidos'),
            'cambios_estado'     => $this->boolean('cambios_estado'),
            'mensajes_clientes'  => $this->boolean('mensajes_clientes'),
            'reportes_diarios'   => $this->boolean('reportes_diarios'),
            'reportes_semanales' => $this->boolean('reportes_semanales'),
        ];
    }
}
