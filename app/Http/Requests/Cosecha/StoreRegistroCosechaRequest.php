<?php

namespace App\Http\Requests\Cosecha;

use App\Models\Operario;
use App\Models\Sublote;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreRegistroCosechaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_id'          => 'required|exists:lotes,id',
            'sublote_id'       => 'required|exists:sublotes,id',
            'gajos_reportados' => 'required|integer|min:1',
            'peso_confirmado'  => 'nullable|numeric|min:0|max:99999999.99',
            'cuadrilla'        => 'required|array|min:1',
            'cuadrilla.*.empleado_id' => 'nullable|exists:empleados,id',
            'cuadrilla.*.operario_id' => 'nullable|exists:operarios,id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            $loteId    = $this->input('lote_id');
            $subloteId = $this->input('sublote_id');

            if ($loteId && $subloteId) {
                $ok = Sublote::where('id', $subloteId)->where('lote_id', $loteId)->exists();
                if (!$ok) {
                    $v->errors()->add('sublote_id', 'El sublote no pertenece al lote indicado.');
                }
            }

            // XOR per cuadrilla member + inject tercero_id for operarios
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

                // Verificar duplicados (evitar dos veces el mismo empleado/operario)
                $key = $tieneEmpleado ? "E_{$miembro['empleado_id']}" : "O_{$miembro['operario_id']}";
                if (in_array($key, $seenKeys, true)) {
                    $v->errors()->add("cuadrilla.{$idx}.empleado_id", 'Miembro duplicado en la cuadrilla.');
                } else {
                    $seenKeys[] = $key;
                }
            }

            // Inyectar tercero_id en cada miembro de operario para uso posterior
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
