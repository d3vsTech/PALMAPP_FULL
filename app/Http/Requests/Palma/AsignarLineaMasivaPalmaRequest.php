<?php

namespace App\Http\Requests\Palma;

use Illuminate\Foundation\Http\FormRequest;

class AsignarLineaMasivaPalmaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'sublote_id' => 'required|integer|exists:sublotes,id',
            'linea_id'   => 'present|nullable|integer|exists:lineas,id',
            'palmas_ids' => 'sometimes|array|min:1',
            'palmas_ids.*' => 'integer|exists:palmas,id',
        ];
    }

    public function messages(): array
    {
        return [
            'sublote_id.required' => 'El sublote es requerido',
            'sublote_id.exists'   => 'El sublote no existe',
            'linea_id.present'    => 'El campo linea_id es requerido (puede ser null para desasignar)',
            'linea_id.exists'     => 'La línea no existe',
            'palmas_ids.array'    => 'Las palmas deben ser un arreglo',
            'palmas_ids.min'      => 'Debe incluir al menos una palma si envía el campo palmas_ids',
            'palmas_ids.*.exists' => 'Una de las palmas seleccionadas no existe',
        ];
    }
}
