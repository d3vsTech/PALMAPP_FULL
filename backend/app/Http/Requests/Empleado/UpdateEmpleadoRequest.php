<?php

namespace App\Http\Requests\Empleado;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmpleadoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId   = app('current_tenant_id');
        $empleadoId = $this->route('empleado')?->id;

        return [
            // Datos personales
            'primer_nombre'   => 'sometimes|string|max:50',
            'segundo_nombre'  => 'nullable|string|max:50',
            'primer_apellido' => 'sometimes|string|max:50',
            'segundo_apellido' => 'nullable|string|max:50',

            // Identificación
            'tipo_documento'            => 'sometimes|in:CC,TI,PASAPORTE,CE,PPT',
            'documento'                 => "sometimes|string|max:50|unique:empleados,documento,{$empleadoId},id,tenant_id,{$tenantId}",
            'fecha_nacimiento'          => 'sometimes|date|before_or_equal:' . now()->subYears(14)->toDateString(),
            'fecha_expedicion_documento' => 'sometimes|date|before_or_equal:today',
            'lugar_expedicion'          => 'nullable|string|max:100',

            // Contratación (directo en empleado)
            'cargo'          => 'sometimes|string|max:100',
            'salario_base'   => 'sometimes|numeric|min:0|max:999999999999.99',
            'modalidad_pago' => 'sometimes|in:FIJO,PRODUCCION',
            'predio_id'      => 'nullable|exists:predios,id',

            // Fechas laborales
            'fecha_ingreso' => 'sometimes|date|before_or_equal:today',
            'fecha_retiro'  => 'nullable|date|after_or_equal:fecha_ingreso',

            // Seguridad social
            'eps'              => 'nullable|string|max:50',
            'fondo_pension'    => 'nullable|string|max:50',
            'arl'              => 'nullable|string|max:50',
            'caja_compensacion' => 'nullable|string|max:50',

            // Dotación
            'talla_camisa'   => 'nullable|string|max:10',
            'talla_pantalon' => 'nullable|string|max:10',
            'talla_calzado'  => 'nullable|string|max:5',

            // Bancario
            'tipo_cuenta'      => 'nullable|in:AHORROS,CORRIENTE,EFECTIVO',
            'entidad_bancaria' => 'nullable|string|max:50',
            'numero_cuenta'    => 'nullable|string|max:30',

            // Opcionales
            'correo_electronico'           => 'nullable|email|max:100',
            'telefono'                     => 'nullable|string|max:50',
            'direccion'                    => 'nullable|string|max:200',
            'municipio'                    => 'nullable|string|max:100',
            'departamento'                 => 'nullable|string|max:100',
            'contacto_emergencia_nombre'   => 'nullable|string|max:100',
            'contacto_emergencia_telefono' => 'nullable|string|max:50',

            // Estado
            'estado' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_documento.in'              => 'El tipo de documento debe ser CC, TI, PASAPORTE, CE o PPT',
            'documento.unique'               => 'Ya existe un colaborador con este número de documento',
            'fecha_nacimiento.before_or_equal' => 'El colaborador debe tener al menos 14 años',
            'fecha_expedicion_documento.before_or_equal' => 'La fecha de expedición no puede ser futura',
            'cargo.max'                      => 'El cargo no puede exceder 100 caracteres',
            'salario_base.numeric'           => 'El salario base debe ser un valor numérico',
            'salario_base.min'               => 'El salario base no puede ser negativo',
            'modalidad_pago.in'              => 'La modalidad de pago debe ser FIJO o PRODUCCION',
            'predio_id.exists'               => 'El predio seleccionado no existe',
            'fecha_ingreso.before_or_equal'  => 'La fecha de ingreso no puede ser futura',
            'fecha_retiro.after_or_equal'    => 'La fecha de retiro debe ser posterior o igual a la fecha de ingreso',
            'correo_electronico.email'       => 'El correo electrónico no tiene un formato válido',
            'tipo_cuenta.in'                 => 'El tipo de cuenta debe ser AHORROS, CORRIENTE o EFECTIVO',
        ];
    }
}
