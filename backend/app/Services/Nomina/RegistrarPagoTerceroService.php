<?php

namespace App\Services\Nomina;

use App\Models\NominaTercero;
use Illuminate\Support\Facades\DB;

/**
 * Marca un acta `nomina_tercero` como PAGADA y persiste los datos del giro
 * (método, referencia, orden, observación, fecha, usuario).
 *
 * Permitido incluso si la nómina está CERRADA — es la única excepción
 * documentada al patrón "nómina CERRADA es inmutable" (§9 de API_NOMINA.md).
 * El motivo: el usuario puede cerrar la nómina antes de coordinar la
 * transferencia bancaria al contratista.
 */
class RegistrarPagoTerceroService
{
    /**
     * Registra el pago del acta. Idempotente si se llama con los mismos datos.
     *
     * @param array{
     *   metodo_pago:string,
     *   referencia_pago?:?string,
     *   orden_pago_numero?:?string,
     *   pagado_at?:?string,
     *   observacion?:?string,
     * } $data
     */
    public function registrar(NominaTercero $acta, array $data, int $userId): NominaTercero
    {
        if ($acta->isPagado()) {
            throw new \DomainException(
                'ACTA_TERCERO_YA_PAGADA: el acta ya fue registrada como PAGADA.'
            );
        }

        return DB::transaction(function () use ($acta, $data, $userId) {
            $acta->update([
                'estado_pago'       => NominaTercero::ESTADO_PAGADO,
                'metodo_pago'       => $data['metodo_pago'],
                'referencia_pago'   => $data['referencia_pago']  ?? null,
                'orden_pago_numero' => $data['orden_pago_numero'] ?? null,
                'pagado_at'         => $data['pagado_at'] ?? now(),
                'pagado_por'        => $userId,
                'observacion'       => $data['observacion'] ?? $acta->observacion,
            ]);

            return $acta->fresh(['tercero', 'pagadoPor']);
        });
    }
}
