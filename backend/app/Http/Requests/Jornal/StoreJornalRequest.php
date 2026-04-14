<?php

namespace App\Http\Requests\Jornal;

use App\Models\Labor;
use Illuminate\Foundation\Http\FormRequest;

class StoreJornalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empleado_id' => 'required|exists:empleados,id',
            'labor_id' => 'required|exists:labores,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'sublote_id' => 'nullable|exists:sublotes,id',
            'dias_jornal' => 'nullable|numeric|min:0.5|max:2',
            'cantidad_palmas' => 'nullable|integer|min:1',
            'gramos_por_palma' => 'nullable|integer|min:1',
            'observacion' => 'nullable|string|max:255',
            'sync_uuid' => 'nullable|uuid|unique:jornales,sync_uuid',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $laborId = $this->input('labor_id');
            if (!$laborId) {
                return;
            }

            $labor = Labor::find($laborId);
            if (!$labor) {
                return;
            }

            match ($labor->tipo_pago) {
                Labor::TIPO_JORNAL_FIJO => $this->validarJornalFijo($validator),
                Labor::TIPO_POR_PALMA_INSUMO => $this->validarPorPalmaInsumo($validator),
                Labor::TIPO_POR_PALMA_SIMPLE => $this->validarPorPalmaSimple($validator),
                default => null,
            };
        });
    }

    private function validarJornalFijo($validator): void
    {
        if (empty($this->input('dias_jornal'))) {
            $validator->errors()->add('dias_jornal', 'JORNAL_FIJO requiere dias_jornal.');
        }
        if ($this->filled('cantidad_palmas')) {
            $validator->errors()->add('cantidad_palmas', 'JORNAL_FIJO no usa cantidad_palmas.');
        }
        if ($this->filled('gramos_por_palma')) {
            $validator->errors()->add('gramos_por_palma', 'JORNAL_FIJO no usa gramos_por_palma.');
        }
    }

    private function validarPorPalmaInsumo($validator): void
    {
        if (empty($this->input('cantidad_palmas'))) {
            $validator->errors()->add('cantidad_palmas', 'POR_PALMA_INSUMO requiere cantidad_palmas.');
        }
        if (empty($this->input('gramos_por_palma'))) {
            $validator->errors()->add('gramos_por_palma', 'POR_PALMA_INSUMO requiere gramos_por_palma.');
        }
    }

    private function validarPorPalmaSimple($validator): void
    {
        if (empty($this->input('cantidad_palmas'))) {
            $validator->errors()->add('cantidad_palmas', 'POR_PALMA_SIMPLE requiere cantidad_palmas.');
        }
        if ($this->filled('gramos_por_palma')) {
            $validator->errors()->add('gramos_por_palma', 'POR_PALMA_SIMPLE no usa gramos_por_palma.');
        }
    }
}
