<?php

namespace App\Http\Requests\Nomina;

use App\Models\NominaConcepto;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Cambios editables desde la pantalla "Liquidación de Terceros" en una línea
 * de operario: días, tarifa/día, ajuste (positivo o negativo), observación,
 * más descuento (concepto + valor + observación).
 *
 * Todos son opcionales — el servicio conserva el valor previo si no viene.
 *
 * Reglas cruzadas:
 *  - Si `descuento_valor > 0` → `descuento_concepto_id` requerido.
 *  - Si `descuento_concepto_id` viene con valor → el concepto debe existir en
 *    el tenant actual, tener `tipo=DEDUCCION_VOLUNTARIA` y `activo=true`.
 */
class ActualizarOperarioActaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.liquidar') ?? false;
    }

    public function rules(): array
    {
        return [
            'dias'                  => ['sometimes', 'integer', 'min:0', 'max:365'],
            'tarifa_dia'            => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'ajuste'                => ['sometimes', 'numeric', 'min:-99999999.99', 'max:99999999.99'],
            'observacion'           => ['sometimes', 'nullable', 'string', 'max:1000'],
            'descuento_concepto_id' => ['sometimes', 'nullable', 'integer', 'exists:nomina_concepto,id'],
            'descuento_valor'       => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'descuento_observacion' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $valor      = $this->input('descuento_valor');
            $conceptoId = $this->input('descuento_concepto_id');

            if ($valor !== null && (float) $valor > 0 && empty($conceptoId)) {
                $v->errors()->add(
                    'descuento_concepto_id',
                    'Debes seleccionar un concepto cuando el valor del descuento es mayor a 0.'
                );
                return;
            }

            if (! empty($conceptoId)) {
                $tenantId = app()->bound('current_tenant_id') ? (int) app('current_tenant_id') : null;

                $concepto = NominaConcepto::withoutGlobalScope('tenant')
                    ->where('id', $conceptoId)
                    ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                    ->first();

                $tipoValido = $concepto && $concepto->tipo === 'DEDUCCION_VOLUNTARIA';
                $estaActivo = (bool) ($concepto->activo ?? false);

                if (! $concepto || ! $tipoValido || ! $estaActivo) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'El concepto de descuento no es válido, no es de tipo DEDUCCION_VOLUNTARIA o está inactivo.',
                        'code'    => 'DESCUENTO_CONCEPTO_INVALIDO',
                        'errors'  => ['descuento_concepto_id' => ['Concepto inválido para descuento de operario.']],
                    ], 422));
                }
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para editar el acta del tercero',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
