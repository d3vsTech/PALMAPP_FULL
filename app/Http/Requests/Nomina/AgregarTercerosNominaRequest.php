<?php

namespace App\Http\Requests\Nomina;

use App\Models\Operario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Alias de AgregarEmpleadosNominaRequest para el endpoint `POST /nominas/{id}/terceros`.
 * Acepta 3 variantes de body:
 *   A — { operario_ids: [3,4,5] }
 *   B — { tercero_ids: [1,2] }               (expande a TODOS los operarios activos)
 *   C — { terceros: [{ tercero_id, operario_ids }] }
 *
 * Al menos una debe venir con elementos. En la variante C, cada `operario_id`
 * debe pertenecer al `tercero_id` de su bloque.
 */
class AgregarTercerosNominaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.editar') ?? false;
    }

    public function rules(): array
    {
        return [
            'operario_ids'              => ['nullable', 'array'],
            'operario_ids.*'            => ['integer', 'exists:operarios,id'],
            'tercero_ids'               => ['nullable', 'array'],
            'tercero_ids.*'             => ['integer', 'exists:terceros,id'],
            'terceros'                  => ['nullable', 'array'],
            'terceros.*.tercero_id'     => ['required_with:terceros', 'integer', 'exists:terceros,id'],
            'terceros.*.operario_ids'   => ['required_with:terceros', 'array', 'min:1'],
            'terceros.*.operario_ids.*' => ['integer', 'exists:operarios,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $flat   = $this->input('operario_ids', []);
            $ids    = $this->input('tercero_ids', []);
            $nested = $this->input('terceros', []);

            if (empty($flat) && empty($ids) && empty($nested)) {
                $v->errors()->add(
                    'operario_ids',
                    'Debe enviar al menos operario_ids[], tercero_ids[] o terceros[].'
                );
                return;
            }

            // Variante C: verificar que cada operario pertenezca a su tercero.
            if (! empty($nested)) {
                $mapaEsperado = [];
                foreach ($nested as $bloque) {
                    $tid = (int) ($bloque['tercero_id'] ?? 0);
                    foreach ($bloque['operario_ids'] ?? [] as $opId) {
                        $mapaEsperado[(int) $opId] = $tid;
                    }
                }

                if (! empty($mapaEsperado)) {
                    $operarios = Operario::withoutGlobalScope('tenant')
                        ->whereIn('id', array_keys($mapaEsperado))
                        ->get(['id', 'tercero_id']);

                    foreach ($operarios as $op) {
                        if ($mapaEsperado[$op->id] !== (int) $op->tercero_id) {
                            $v->errors()->add(
                                'terceros',
                                "OPERARIO_NO_PERTENECE_A_TERCERO: operario #{$op->id} pertenece al tercero #{$op->tercero_id}, no al declarado."
                            );
                        }
                    }
                }
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para gestionar terceros de la nómina',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }

    /**
     * Normaliza cualquiera de las 3 variantes a una lista plana única de operario_ids.
     */
    public function resolverOperarioIds(): array
    {
        $ids = collect($this->input('operario_ids', []))
            ->merge(
                collect($this->input('terceros', []))
                    ->flatMap(fn ($b) => $b['operario_ids'] ?? [])
            );

        $porTerceros = $this->input('tercero_ids', []);
        if (! empty($porTerceros)) {
            $extra = Operario::withoutGlobalScope('tenant')
                ->whereIn('tercero_id', $porTerceros)
                ->where('estado', true)
                ->pluck('id');
            $ids = $ids->merge($extra);
        }

        return $ids->map(fn ($id) => (int) $id)->unique()->values()->all();
    }
}
