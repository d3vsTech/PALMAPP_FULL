<?php

namespace App\Http\Requests\Jornal;

use App\Models\Labor;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida el payload de un Jornal.
 *
 * Post-unificación: el cliente envía SOLO `labor_id` (no `categoria` ni `tipo`).
 * La matriz de campos requeridos/prohibidos se resuelve a partir de la labor
 * cargada en `prepareForValidation`:
 *
 *   - labor.tipo=COSECHA → rechaza (usa /operaciones/{op}/cosechas).
 *   - labor.tipo=FERTILIZACION + POR_PALMA → requiere cantidad_palmas + insumo_id + gramos_por_palma.
 *   - labor.tipo=FERTILIZACION + JORNAL_FIJO → cantidad_palmas/insumo_id/gramos opcionales (tracking).
 *   - labor.tipo=PLATEO/PODA + POR_PALMA → requiere cantidad_palmas.
 *   - labor.tipo=PLATEO/PODA + JORNAL_FIJO → prohíbe cantidad_palmas/insumo/gramos.
 *   - labor.tipo=SANIDAD → requiere descripcion. cantidad_palmas según tipo_pago.
 *   - custom PALMA: según tipo_pago.
 *   - custom FINCA: permite ubicacion; prohíbe campos de palma.
 *
 * `categoria` y `tipo` se inyectan al payload validado para que el controller
 * los snapshottee en el jornal.
 */
class StoreJornalRequest extends FormRequest
{
    private ?Labor $labor = null;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $laborId = $this->input('labor_id');
        if ($laborId) {
            $this->labor = Labor::find($laborId);
        }
    }

    public function rules(): array
    {
        return [
            'empleado_id'      => 'required|exists:empleados,id',
            'labor_id'         => 'required|exists:labores,id',

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
            $labor = $this->labor;
            if (!$labor) {
                return;
            }

            // COSECHA: no se permite vía jornales.
            if ($labor->esCosecha()) {
                $validator->errors()->add(
                    'labor_id',
                    'La labor COSECHA se registra vía POST /operaciones/{id}/cosechas, no como jornal.'
                );
                return;
            }

            if ($labor->esFinca()) {
                $this->validarFinca($validator);
                return;
            }

            // PALMA
            $this->validarPalma($validator, $labor);
        });
    }

    private function validarPalma($validator, Labor $labor): void
    {
        // No usar `ubicacion` en PALMA.
        if ($this->filled('ubicacion')) {
            $validator->errors()->add('ubicacion', 'PALMA no usa ubicacion.');
        }

        if ($labor->esFertilizacion()) {
            if ($labor->esPorPalma()) {
                foreach (['cantidad_palmas', 'insumo_id', 'gramos_por_palma'] as $campo) {
                    if (!$this->filled($campo)) {
                        $validator->errors()->add($campo, "FERTILIZACION en POR_PALMA requiere {$campo}.");
                    }
                }
            }
            // JORNAL_FIJO: insumo_id y gramos_por_palma quedan opcionales como tracking.
            return;
        }

        if ($labor->tipo === Labor::TIPO_SANIDAD) {
            if (!$this->filled('descripcion')) {
                $validator->errors()->add('descripcion', 'SANIDAD requiere descripcion.');
            }
        }

        // Resto de PALMA (PLATEO, PODA, SANIDAD, custom): cantidad_palmas + tipo_pago.
        if ($labor->esPorPalma()) {
            if (!$this->filled('cantidad_palmas')) {
                $validator->errors()->add(
                    'cantidad_palmas',
                    "La labor '{$labor->nombre}' está configurada como POR_PALMA: cantidad_palmas es obligatoria."
                );
            }
        } else {
            // JORNAL_FIJO
            if ($this->filled('cantidad_palmas')) {
                $validator->errors()->add(
                    'cantidad_palmas',
                    "La labor '{$labor->nombre}' está configurada como JORNAL_FIJO: cantidad_palmas no aplica."
                );
            }
        }

        // Insumo y gramos solo aplican a FERTILIZACION POR_PALMA.
        if (!$labor->esFertilizacion()) {
            if ($this->filled('insumo_id') || $this->filled('gramos_por_palma')) {
                $validator->errors()->add(
                    'insumo_id',
                    "La labor '{$labor->nombre}' no usa insumo_id / gramos_por_palma."
                );
            }
        }
    }

    private function validarFinca($validator): void
    {
        foreach (['cantidad_palmas', 'insumo_id', 'gramos_por_palma', 'descripcion'] as $campo) {
            if ($this->filled($campo)) {
                $validator->errors()->add($campo, "Categoría FINCA no usa {$campo}.");
            }
        }
    }

    /**
     * Inyecta los snapshots `categoria` y `tipo` derivados de la labor.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        if ($this->labor) {
            $data['categoria'] = $this->labor->categoria;
            $data['tipo']      = $this->labor->tipo; // NULL para custom
        }

        return $data;
    }

    public function getLabor(): ?Labor
    {
        return $this->labor;
    }
}
