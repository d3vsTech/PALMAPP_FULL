<?php

namespace App\Http\Requests\Lote;

use App\Models\Lote;
use App\Models\Predio;
use Illuminate\Foundation\Http\FormRequest;

class StoreLoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'predio_id'           => 'required|exists:predios,id',
            'nombre'              => 'required|string|max:100',
            'fecha_siembra'       => 'nullable|date|before_or_equal:today',
            'hectareas_sembradas' => 'nullable|numeric|min:0|max:99999999.99',
            'semillas_ids'        => 'nullable|array',
            'semillas_ids.*'      => 'integer|exists:semillas,id',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->hectareas_sembradas && $this->predio_id) {
                $predio = Predio::find($this->predio_id);
                if ($predio && $predio->hectareas_totales) {
                    $hectareasUsadas = Lote::where('predio_id', $this->predio_id)
                        ->sum('hectareas_sembradas');

                    $disponibles = (float) $predio->hectareas_totales - (float) $hectareasUsadas;

                    if ((float) $this->hectareas_sembradas > $disponibles) {
                        $validator->errors()->add(
                            'hectareas_sembradas',
                            "Las hectáreas sembradas ({$this->hectareas_sembradas}) superan las disponibles en el predio ({$disponibles} de {$predio->hectareas_totales} totales)"
                        );
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'predio_id.required'            => 'El predio es obligatorio',
            'predio_id.exists'              => 'El predio seleccionado no existe',
            'nombre.required'               => 'El nombre del lote es obligatorio',
            'nombre.max'                    => 'El nombre no puede exceder 100 caracteres',
            'fecha_siembra.date'            => 'La fecha de siembra debe ser una fecha válida',
            'fecha_siembra.before_or_equal' => 'La fecha de siembra no puede ser futura',
            'hectareas_sembradas.min'       => 'Las hectáreas no pueden ser negativas',
            'semillas_ids.array'            => 'Las semillas deben ser un arreglo',
            'semillas_ids.*.exists'         => 'Una de las semillas seleccionadas no existe',
        ];
    }
}
