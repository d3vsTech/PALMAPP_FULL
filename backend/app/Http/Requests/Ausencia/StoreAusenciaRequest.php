<?php

namespace App\Http\Requests\Ausencia;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Payload del wizard Paso 4. La UI muestra solo:
 *  - select empleado
 *  - select motivo_ausencia
 *  - observación (→ `motivo`)
 *
 * Los campos "ricos" (fecha_fin, entidad, radicado, porcentaje_pago)
 * son opcionales y se usan desde el módulo admin o vía PUT.
 */
class StoreAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empleado_id'        => 'required|exists:empleados,id',
            'motivo_ausencia_id' => 'required|exists:motivos_ausencia,id',
            'motivo'             => 'nullable|string',

            // Campos avanzados (opcionales desde el wizard):
            'fecha_fin'          => 'nullable|date',
            'entidad'            => 'nullable|string|max:100',
            'numero_radicado'    => 'nullable|string|max:50',
            'porcentaje_pago'    => 'nullable|numeric|min:0|max:100',

            // Offline:
            'sync_uuid'          => 'nullable|uuid|unique:ausencias,sync_uuid',
        ];
    }
}
