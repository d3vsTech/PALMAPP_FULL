<?php

namespace App\Http\Requests\Labor;

use App\Models\Labor;
use Illuminate\Foundation\Http\FormRequest;

class StoreLaborRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => 'required|string|max:100',
            'tipo_pago' => 'required|in:JORNAL_FIJO,POR_PALMA_INSUMO,POR_PALMA_SIMPLE',
            'valor_base' => 'nullable|numeric|min:0|max:99999999.99',
            'unidad_medida' => 'nullable|in:PALMAS,JORNAL',
            'insumo_id' => 'nullable|exists:insumos,id',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $tipoPago = $this->input('tipo_pago');

            match ($tipoPago) {
                Labor::TIPO_JORNAL_FIJO => $this->validarJornalFijo($validator),
                Labor::TIPO_POR_PALMA_INSUMO => $this->validarPorPalmaInsumo($validator),
                Labor::TIPO_POR_PALMA_SIMPLE => $this->validarPorPalmaSimple($validator),
                default => null,
            };
        });
    }

    private function validarJornalFijo($validator): void
    {
        if (empty($this->input('valor_base'))) {
            $validator->errors()->add('valor_base', 'JORNAL_FIJO requiere valor_base (valor diario).');
        }
        if ($this->filled('insumo_id')) {
            $validator->errors()->add('insumo_id', 'JORNAL_FIJO no debe tener insumo asociado.');
        }
    }

    private function validarPorPalmaInsumo($validator): void
    {
        if (empty($this->input('insumo_id'))) {
            $validator->errors()->add('insumo_id', 'POR_PALMA_INSUMO requiere un insumo asociado.');
        }
    }

    private function validarPorPalmaSimple($validator): void
    {
        if (empty($this->input('valor_base'))) {
            $validator->errors()->add('valor_base', 'POR_PALMA_SIMPLE requiere valor_base (precio por palma).');
        }
        if ($this->filled('insumo_id')) {
            $validator->errors()->add('insumo_id', 'POR_PALMA_SIMPLE no debe tener insumo asociado.');
        }
    }
}
