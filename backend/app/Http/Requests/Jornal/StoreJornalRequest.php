<?php

namespace App\Http\Requests\Jornal;

use App\Models\Labor;
use App\Models\Operario;
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
 *   - labor.tipo=PLATEO/PODA + JORNAL_FIJO → cantidad_palmas opcional (tracking); insumo/gramos prohibidos.
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
            'empleado_id'      => 'nullable|exists:empleados,id',
            'operario_id'      => 'nullable|exists:operarios,id',
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
            // XOR: exactamente uno de empleado_id u operario_id
            $tieneEmpleado = $this->filled('empleado_id');
            $tieneOperario = $this->filled('operario_id');

            if (!$tieneEmpleado && !$tieneOperario) {
                $validator->errors()->add('empleado_id', 'Debe proveer empleado_id o operario_id.');
                return;
            }
            if ($tieneEmpleado && $tieneOperario) {
                $validator->errors()->add('empleado_id', 'Solo puede proveer empleado_id o operario_id, no ambos.');
                return;
            }

            // Si es operario, inyectar tercero_id automáticamente
            if ($tieneOperario) {
                $operario = Operario::find($this->input('operario_id'));
                if ($operario) {
                    $this->merge(['tercero_id' => $operario->tercero_id]);
                }
            }

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

        // tipo_pago efectivo: si el jornal es de un operario y su tercero tiene
        // override en `tercero_labor_precios.tipo_pago`, ese gana. Si no, hereda
        // del catálogo del tenant (labor.tipo_pago).
        $terceroId = $this->input('tercero_id');
        $tipoPagoEfectivo = $labor->resolverTipoPago($terceroId ? (int) $terceroId : null);
        $esPorPalmaEfectivo  = $tipoPagoEfectivo === Labor::TIPO_PAGO_POR_PALMA;
        $sufijoTercero       = $terceroId ? ' para este tercero' : '';

        if ($labor->esFertilizacion()) {
            if ($esPorPalmaEfectivo) {
                foreach (['cantidad_palmas', 'insumo_id', 'gramos_por_palma'] as $campo) {
                    if (!$this->filled($campo)) {
                        $validator->errors()->add(
                            $campo,
                            "FERTILIZACION en POR_PALMA{$sufijoTercero} requiere {$campo}."
                        );
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

        // Resto de PALMA (PLATEO, PODA, SANIDAD, custom): cantidad_palmas + tipo_pago efectivo.
        if ($esPorPalmaEfectivo) {
            if (!$this->filled('cantidad_palmas')) {
                $validator->errors()->add(
                    'cantidad_palmas',
                    "La labor '{$labor->nombre}' está configurada como POR_PALMA{$sufijoTercero}: cantidad_palmas es obligatoria."
                );
            }
        }
        // JORNAL_FIJO: cantidad_palmas es opcional (tracking agronómico, no afecta el cálculo).

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
     * Inyecta snapshots de categoria/tipo y tercero_id si aplica.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        if ($this->labor) {
            $data['categoria'] = $this->labor->categoria;
            $data['tipo']      = $this->labor->tipo; // NULL para custom
        }

        // tercero_id fue inyectado por withValidator si el jornal es de un operario
        if ($this->has('tercero_id')) {
            $data['tercero_id'] = $this->input('tercero_id');
        }

        return $data;
    }

    public function getLabor(): ?Labor
    {
        return $this->labor;
    }
}
