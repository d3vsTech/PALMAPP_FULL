<?php

namespace App\Constants;

class ViajeEstado
{
    public const CREADO        = 'CREADO';
    public const EN_VALIDACION = 'EN_VALIDACION';
    public const FINALIZADO    = 'FINALIZADO';

    public static function cases(): array
    {
        return [self::CREADO, self::EN_VALIDACION, self::FINALIZADO];
    }

    public static function isValid(string $estado): bool
    {
        return in_array($estado, self::cases(), true);
    }

    public static function transiciones(): array
    {
        return [
            self::CREADO        => self::EN_VALIDACION,
            self::EN_VALIDACION => self::FINALIZADO,
        ];
    }

    public static function siguienteEstado(string $actual): ?string
    {
        return self::transiciones()[$actual] ?? null;
    }
}
