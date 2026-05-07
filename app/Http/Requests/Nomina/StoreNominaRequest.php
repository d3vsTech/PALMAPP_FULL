<?php

namespace App\Http\Requests\Nomina;

use App\Models\Nomina;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreNominaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('nomina.crear') ?? false;
    }

    public function rules(): array
    {
        return [
            'mes'           => ['required', 'integer', 'min:1', 'max:12'],
            'anio'          => ['required', 'integer', 'min:2020', 'max:2099'],
            'periodicidad'  => ['required', 'in:QUINCENAL,MENSUAL'],
            'quincena'      => ['nullable', 'integer', 'in:1,2'],
            'observacion'   => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * El frontend envía siempre `periodicidad`. La validación cruzada solo
     * verifica la coherencia entre periodicidad y quincena — el config del
     * tenant ya no participa en este endpoint.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            $tipo = $this->input('periodicidad');
            $quincena = $this->input('quincena');

            if ($tipo === Nomina::TIPO_PAGO_QUINCENAL && ! in_array($quincena, [1, 2], true)) {
                $v->errors()->add('quincena', 'Para periodicidad QUINCENAL, la quincena debe ser 1 o 2.');
            }

            if ($tipo === Nomina::TIPO_PAGO_MENSUAL && $quincena !== null) {
                $v->errors()->add('quincena', 'Para periodicidad MENSUAL, no se debe enviar quincena.');
            }
        });
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'No tienes permisos para crear nóminas',
            'code'    => 'PERMISSION_DENIED',
        ], 403));
    }
}
