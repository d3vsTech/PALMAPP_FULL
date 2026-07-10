<?php

namespace App\Http\Requests\Nomina;

use App\Models\TenantConfig;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ActualizarPrestamoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.editar') ?? false;
    }

    public function rules(): array
    {
        $tenantId  = (int) $this->header('X-Tenant-Id');
        $config    = TenantConfig::where('tenant_id', $tenantId)->first();
        $tipoPago  = $config?->tipo_pago_nomina ?? 'QUINCENAL';
        $quincenal = $tipoPago === 'QUINCENAL';

        return [
            'concepto'        => ['sometimes', 'string', 'max:150'],
            'valor_total'     => ['sometimes', 'numeric', 'min:1'],
            'num_cuotas'      => ['sometimes', 'integer', 'min:1', 'max:120'],
            'inicio_anio'     => ['sometimes', 'integer', 'min:2020', 'max:2099'],
            'inicio_mes'      => ['sometimes', 'integer', 'between:1,12'],
            'inicio_quincena' => ['sometimes', $quincenal ? 'nullable' : 'nullable', 'integer', 'in:1,2'],
            'observaciones'   => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para editar préstamos',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
