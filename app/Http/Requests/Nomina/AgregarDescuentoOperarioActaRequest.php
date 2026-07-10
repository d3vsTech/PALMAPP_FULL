<?php

namespace App\Http\Requests\Nomina;

use App\Models\NominaConcepto;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Agrega un descuento con concepto identificado a una línea de operario dentro
 * del acta de pago al contratista.
 *
 * Reglas:
 *  - `concepto_id`: debe existir en el tenant, tipo DEDUCCION_VOLUNTARIA y activo.
 *  - `valor`: mayor a 0.
 *  - `observacion`: opcional.
 */
class AgregarDescuentoOperarioActaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.liquidar') ?? false;
    }

    public function rules(): array
    {
        return [
            'concepto_id'  => ['required', 'integer'],
            'valor'        => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'observacion'  => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $conceptoId = (int) $this->input('concepto_id');
            $tenantId   = app()->bound('current_tenant_id') ? (int) app('current_tenant_id') : null;

            $concepto = NominaConcepto::withoutGlobalScope('tenant')
                ->where('id', $conceptoId)
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->first();

            $tipoValido = $concepto && $concepto->tipo === 'DEDUCCION_VOLUNTARIA';
            $estaActivo = (bool) ($concepto?->activo ?? false);

            if (! $concepto || ! $tipoValido || ! $estaActivo) {
                throw new HttpResponseException(response()->json([
                    'message' => 'El concepto de descuento no es válido, no es de tipo DEDUCCION_VOLUNTARIA o está inactivo.',
                    'code'    => 'DESCUENTO_CONCEPTO_INVALIDO',
                    'errors'  => ['concepto_id' => ['Concepto inválido para descuento de operario.']],
                ], 422));
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para modificar el acta del tercero',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
