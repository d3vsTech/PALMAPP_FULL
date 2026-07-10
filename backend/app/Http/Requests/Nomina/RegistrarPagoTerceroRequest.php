<?php

namespace App\Http\Requests\Nomina;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Body para `POST /nominas/{id}/terceros/{tercero}/registrar-pago`.
 *
 * Todos los campos son opcionales. Un body vacío es válido y marca el acta
 * como PAGADO. No se valida que el tercero tenga datos bancarios completos
 * — el pago se registra siempre que se pueda cambiar el estado del acta.
 */
class RegistrarPagoTerceroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.pagar-tercero') ?? false;
    }

    public function rules(): array
    {
        return [
            'metodo_pago'       => ['nullable', 'in:TRANSFERENCIA,EFECTIVO,CHEQUE'],
            'referencia_pago'   => ['nullable', 'string', 'max:100'],
            'orden_pago_numero' => ['nullable', 'string', 'max:50'],
            'pagado_at'         => ['nullable', 'date'],
            'observacion'       => ['nullable', 'string', 'max:1000'],
        ];
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para registrar pagos a terceros',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
