<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Compara los datos auxiliares que el OCR extrajo del documento de báscula
 * (nombre del conductor y placa del vehículo impresos en la remisión)
 * contra el snapshot del viaje (`viaje.nombre_conductor`, `viaje.placa_vehiculo`).
 *
 * Las comparaciones son tolerantes para evitar falsos mismatch por diferencias
 * triviales (tildes, mayúsculas, separadores en la placa, segundo nombre/apellido
 * adicional en el documento).
 *
 * El resultado se expone en el GET de polling como una sección
 * `validaciones_cruzadas` no bloqueante: el frontend pinta una alerta visible
 * cuando `coincide = false`, pero el operador puede continuar y guardar.
 */
class ViajeOcrCrossCheckService
{
    /**
     * @return bool|null  true = coinciden, false = no coinciden, null = no se pudo verificar
     *                    (Claude no leyó la placa del documento).
     */
    public function compararPlaca(?string $extraida, string $esperada): ?bool
    {
        if ($extraida === null || trim($extraida) === '') {
            return null;
        }

        $normalizar = static fn (string $v): string =>
            strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $v));

        return $normalizar($extraida) === $normalizar($esperada);
    }

    /**
     * Match por subsecuencia de tokens: el conductor coincide si TODOS los tokens
     * relevantes (>2 caracteres) del nombre esperado aparecen como substring en
     * el nombre extraído (ya normalizados sin tildes y en lowercase). Esto cubre:
     *
     * - "Jordan Blanco" (esperado) ≡ "JORDAN MIGUEL BLANCO TOLOZA" (extraído)  → true
     * - "Carlos Pérez" (esperado) ≡ "CARLOS PEREZ"                             → true
     * - "Pedro Gómez" (esperado) ≡ "JORDAN BLANCO TOLOZA"                      → false
     *
     * @return bool|null  true / false / null si no se pudo verificar.
     */
    public function compararConductor(?string $extraido, string $esperado): ?bool
    {
        if ($extraido === null || trim($extraido) === '') {
            return null;
        }

        $normalizar = static fn (string $v): string =>
            mb_strtolower(trim(Str::ascii($v)));

        $extraidoNormalizado = $normalizar($extraido);
        $esperadoTokens      = array_values(array_filter(
            preg_split('/\s+/', $normalizar($esperado)) ?: [],
            static fn (string $t): bool => mb_strlen($t) > 2,
        ));

        if (count($esperadoTokens) === 0) {
            return null;
        }

        foreach ($esperadoTokens as $token) {
            if (!str_contains($extraidoNormalizado, $token)) {
                return false;
            }
        }

        return true;
    }
}
