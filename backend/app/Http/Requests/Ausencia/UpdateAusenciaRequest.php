<?php

namespace App\Http\Requests\Ausencia;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'motivo_ausencia_id' => 'sometimes|exists:motivos_ausencia,id',
            'motivo'             => 'sometimes|nullable|string',
            'fecha_fin'          => 'sometimes|nullable|date',
            'entidad'            => 'sometimes|nullable|string|max:100',
            'numero_radicado'    => 'sometimes|nullable|string|max:50',
            'porcentaje_pago'    => 'sometimes|nullable|numeric|min:0|max:100',
        ];
    }
}
