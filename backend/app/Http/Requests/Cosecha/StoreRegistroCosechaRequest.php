<?php

namespace App\Http\Requests\Cosecha;

use App\Models\Sublote;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreRegistroCosechaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lote_id'          => 'required|exists:lotes,id',
            'sublote_id'       => 'required|exists:sublotes,id',
            'gajos_reportados' => 'required|integer|min:1',
            'peso_confirmado'  => 'nullable|numeric|min:0|max:99999999.99',
            'cuadrilla'        => 'required|array|min:1',
            'cuadrilla.*.empleado_id' => 'required|exists:empleados,id|distinct',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($v) {
            $loteId = $this->input('lote_id');
            $subloteId = $this->input('sublote_id');

            if ($loteId && $subloteId) {
                $ok = Sublote::where('id', $subloteId)->where('lote_id', $loteId)->exists();
                if (!$ok) {
                    $v->errors()->add('sublote_id', 'El sublote no pertenece al lote indicado.');
                }
            }
        });
    }
}
