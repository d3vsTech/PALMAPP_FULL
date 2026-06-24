<?php

namespace App\Http\Requests\Cosecha;

use App\Models\Operario;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRegistroCosechaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gajos_reportados'        => 'sometimes|integer|min:1',
            'gajos_reconteo'          => 'sometimes|nullable|integer|min:0',
            'peso_confirmado'         => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'cuadrilla'               => 'sometimes|array|min:1',
            'cuadrilla.*.empleado_id' => 'nullable|exists:empleados,id',
            'cuadrilla.*.operario_id' => 'nullable|exists:operarios,id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            if (!$this->has('cuadrilla')) {
                return;
            }

            $cuadrilla = $this->input('cuadrilla', []);
            $seenKeys  = [];

            foreach ($cuadrilla as $idx => $miembro) {
                $tieneEmpleado = !empty($miembro['empleado_id']);
                $tieneOperario = !empty($miembro['operario_id']);

                if (!$tieneEmpleado && !$tieneOperario) {
                    $v->errors()->add("cuadrilla.{$idx}.empleado_id", 'Debe proveer empleado_id o operario_id.');
                    continue;
                }
                if ($tieneEmpleado && $tieneOperario) {
                    $v->errors()->add("cuadrilla.{$idx}.empleado_id", 'Solo puede proveer empleado_id o operario_id, no ambos.');
                    continue;
                }

                $key = $tieneEmpleado ? "E_{$miembro['empleado_id']}" : "O_{$miembro['operario_id']}";
                if (in_array($key, $seenKeys, true)) {
                    $v->errors()->add("cuadrilla.{$idx}.empleado_id", 'Miembro duplicado en la cuadrilla.');
                } else {
                    $seenKeys[] = $key;
                }
            }

            // Inyectar tercero_id en miembros de operario
            if (!$v->errors()->any()) {
                $cuadrillaMerged = collect($cuadrilla)->map(function ($miembro) {
                    if (!empty($miembro['operario_id'])) {
                        $operario = Operario::find($miembro['operario_id']);
                        if ($operario) {
                            $miembro['tercero_id'] = $operario->tercero_id;
                        }
                    }
                    return $miembro;
                })->all();

                $this->merge(['cuadrilla' => $cuadrillaMerged]);
            }
        });
    }
}
