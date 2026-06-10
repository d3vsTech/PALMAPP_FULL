<?php

namespace App\Http\Requests\Labor;

use App\Models\Labor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Crea una labor CUSTOM (es_sistema=false). Las 5 fijas del sistema se
 * provisionan al crear el tenant — el cliente nunca las crea por aquí.
 *
 * Reglas por categoría:
 *   - PALMA: `tipo_pago` requerido (POR_PALMA o JORNAL_FIJO).
 *   - FINCA: `tipo_pago` se fuerza a JORNAL_FIJO en prepareForValidation.
 *
 * `tipo` y `es_sistema` se ignoran si llegan en el body — son discriminadores
 * internos del esquema.
 */
class StoreLaborRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // FINCA siempre paga JORNAL_FIJO; ignoramos lo que mande el cliente.
        if ($this->input('categoria') === Labor::CATEGORIA_FINCA) {
            $this->merge(['tipo_pago' => Labor::TIPO_PAGO_JORNAL_FIJO]);
        }
    }

    public function rules(): array
    {
        return [
            'categoria'    => ['required', Rule::in(Labor::CATEGORIAS)],
            'nombre'       => ['required', 'string', 'max:100'],
            'tipo_pago'    => ['required', Rule::in(Labor::TIPOS_PAGO)],
            'precio_palma' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'estado'       => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Solo entrega los campos permitidos al controller (descartando tipo y
     * es_sistema si vinieran en el payload).
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();
        return [
            'categoria'    => $data['categoria'],
            'nombre'       => $data['nombre'],
            'tipo_pago'    => $data['tipo_pago'],
            'precio_palma' => $data['precio_palma'] ?? null,
            'estado'       => $data['estado'] ?? true,
        ];
    }
}
