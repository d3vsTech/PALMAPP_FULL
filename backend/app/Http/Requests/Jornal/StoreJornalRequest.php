<?php

namespace App\Http\Requests\Jornal;

use App\Models\Jornal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Valida el payload de un Jornal unificado (categoría PALMA o FINCA).
 * Este FormRequest asume que `operacion_id` se resuelve por contexto
 * (ruta anidada o payload del wizard) y no viene en el body.
 */
class StoreJornalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empleado_id'      => 'required|exists:empleados,id',
            'categoria'        => ['required', Rule::in([Jornal::CATEGORIA_PALMA, Jornal::CATEGORIA_FINCA])],
            'tipo'             => ['nullable', Rule::in(Jornal::TIPOS_PALMA)],
            'labor_id'         => 'nullable|exists:labores,id',

            'lote_id'          => 'nullable|exists:lotes,id',
            'sublote_id'       => 'nullable|exists:sublotes,id',

            'cantidad_palmas'  => 'nullable|integer|min:1',
            'insumo_id'        => 'nullable|exists:insumos,id',
            'gramos_por_palma' => 'nullable|integer|min:1',

            'descripcion'      => 'nullable|string',
            'nombre_trabajo'   => 'nullable|string|max:255',
            'ubicacion'        => 'nullable|string|max:255',

            'observacion'      => 'nullable|string',
            'sync_uuid'        => 'nullable|uuid|unique:jornales,sync_uuid',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $categoria = $this->input('categoria');
            $tipo      = $this->input('tipo');

            if ($categoria === Jornal::CATEGORIA_PALMA) {
                $this->validarPalma($validator, $tipo);
            } elseif ($categoria === Jornal::CATEGORIA_FINCA) {
                $this->validarFinca($validator);
            }
        });
    }

    private function validarPalma($validator, ?string $tipo): void
    {
        if (!$tipo) {
            $validator->errors()->add('tipo', 'Categoría PALMA requiere tipo.');
            return;
        }

        if ($this->filled('labor_id')) {
            $validator->errors()->add('labor_id', 'Categoría PALMA no usa labor_id.');
        }
        if ($this->filled('ubicacion')) {
            $validator->errors()->add('ubicacion', 'Categoría PALMA no usa ubicacion.');
        }

        match ($tipo) {
            Jornal::TIPO_PLATEO, Jornal::TIPO_PODA => $this->validarPlateoPoda($validator),
            Jornal::TIPO_FERTILIZACION             => $this->validarFertilizacion($validator),
            Jornal::TIPO_SANIDAD, Jornal::TIPO_OTROS => $this->validarSanidadOtros($validator),
            default => null,
        };
    }

    private function validarPlateoPoda($validator): void
    {
        if (!$this->filled('cantidad_palmas')) {
            $validator->errors()->add('cantidad_palmas', 'PLATEO/PODA requiere cantidad_palmas.');
        }
        if ($this->filled('insumo_id') || $this->filled('gramos_por_palma')) {
            $validator->errors()->add('insumo_id', 'PLATEO/PODA no usa insumo_id / gramos_por_palma.');
        }
    }

    private function validarFertilizacion($validator): void
    {
        foreach (['cantidad_palmas', 'insumo_id', 'gramos_por_palma'] as $campo) {
            if (!$this->filled($campo)) {
                $validator->errors()->add($campo, "FERTILIZACION requiere {$campo}.");
            }
        }
    }

    private function validarSanidadOtros($validator): void
    {
        if (!$this->filled('descripcion')) {
            $validator->errors()->add('descripcion', 'SANIDAD/OTROS requiere descripcion.');
        }
        if ($this->input('tipo') === Jornal::TIPO_OTROS && !$this->filled('nombre_trabajo')) {
            $validator->errors()->add('nombre_trabajo', 'OTROS requiere nombre_trabajo.');
        }
        if ($this->input('tipo') === Jornal::TIPO_SANIDAD && $this->filled('nombre_trabajo')) {
            $validator->errors()->add('nombre_trabajo', 'SANIDAD no usa nombre_trabajo.');
        }
        if ($this->filled('insumo_id') || $this->filled('gramos_por_palma')) {
            $validator->errors()->add('insumo_id', 'SANIDAD/OTROS no usa insumo_id / gramos_por_palma.');
        }
        if ($this->filled('cantidad_palmas')) {
            $validator->errors()->add('cantidad_palmas', 'SANIDAD/OTROS no usa cantidad_palmas.');
        }
    }

    private function validarFinca($validator): void
    {
        if (!$this->filled('labor_id')) {
            $validator->errors()->add('labor_id', 'Categoría FINCA requiere labor_id.');
        }
        if ($this->filled('tipo')) {
            $validator->errors()->add('tipo', 'Categoría FINCA no usa tipo.');
        }
        foreach (['cantidad_palmas', 'insumo_id', 'gramos_por_palma', 'descripcion'] as $campo) {
            if ($this->filled($campo)) {
                $validator->errors()->add($campo, "Categoría FINCA no usa {$campo}.");
            }
        }
    }
}
