<?php

namespace App\Http\Requests\Labor;

use App\Models\Labor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Actualiza una labor.
 *
 *  - Fija del sistema (es_sistema=true): solo se permite cambiar `tipo_pago`,
 *    `precio_palma`, `estado`. Los demás campos se ignoran. `tipo` y `nombre`
 *    son inmutables.
 *  - Custom: se permite cambiar `nombre`, `tipo_pago` (solo PALMA),
 *    `precio_palma`, `estado`. `categoria`, `tipo` y `es_sistema` no se permiten.
 */
class UpdateLaborRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $labor = $this->route('labor');

        if (!$labor instanceof Labor) {
            return [];
        }

        if ($labor->es_sistema) {
            return [
                'tipo_pago'    => ['sometimes', Rule::in(Labor::TIPOS_PAGO)],
                'precio_palma' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
                'estado'       => ['sometimes', 'boolean'],
            ];
        }

        $rules = [
            'nombre'       => ['sometimes', 'string', 'max:100'],
            'precio_palma' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'estado'       => ['sometimes', 'boolean'],
        ];

        // FINCA siempre paga JORNAL_FIJO: el modelo lo blinda, pero si el cliente
        // intenta cambiarlo lo rechazamos explícitamente con un mensaje claro.
        if ($labor->categoria === Labor::CATEGORIA_PALMA) {
            $rules['tipo_pago'] = ['sometimes', Rule::in(Labor::TIPOS_PAGO)];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'tipo_pago.in' => 'tipo_pago debe ser POR_PALMA o JORNAL_FIJO.',
        ];
    }

    public function validated($key = null, $default = null)
    {
        $labor = $this->route('labor');
        $data  = parent::validated();

        if (!$labor instanceof Labor) {
            return $data;
        }

        if ($labor->es_sistema) {
            // Filtrar a los 3 campos permitidos para fijas.
            return array_intersect_key($data, array_flip(['tipo_pago', 'precio_palma', 'estado']));
        }

        // Custom: descartar campos inmutables si aparecen por alguna razón.
        unset($data['categoria'], $data['tipo'], $data['es_sistema']);

        // FINCA fuerza JORNAL_FIJO incluso si el cliente envía otra cosa.
        if ($labor->categoria === Labor::CATEGORIA_FINCA) {
            $data['tipo_pago'] = Labor::TIPO_PAGO_JORNAL_FIJO;
        }

        return $data;
    }
}
