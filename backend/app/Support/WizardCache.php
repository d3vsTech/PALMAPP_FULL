<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class WizardCache
{
    public const TTL_PARAMETRICA   = 900;   // 15 min
    public const TTL_UBICACIONES   = 21600; // 6 h
    public const TTL_CATEGORIAS    = 3600;  // 1 h
    public const TTL_TENANT        = 60;    // 60 s
    public const TTL_PREDIO_BUNDLE          = 60;    // 60 s — invalida en mutaciones
    public const TTL_PRECIOS_LABORES_BUNDLE = 60;    // 60 s — invalida en mutaciones

    public static function predios(int $tenantId): string
    {
        return "wizard:predios:t:{$tenantId}";
    }

    public static function semillas(int $tenantId): string
    {
        return "wizard:semillas:t:{$tenantId}";
    }

    public static function predioBundle(int $tenantId, int $predioId): string
    {
        return "wizard:predio_bundle:t:{$tenantId}:p:{$predioId}";
    }

    public static function predioResumen(int $tenantId, int $predioId): string
    {
        return "wizard:predio_resumen:t:{$tenantId}:p:{$predioId}";
    }

    public static function forgetPredioBundle(int $tenantId, int $predioId): void
    {
        Cache::forget(static::predioBundle($tenantId, $predioId));
        Cache::forget(static::predioResumen($tenantId, $predioId));
    }

    public static function preciosLaboresBundle(int $tenantId): string
    {
        return "wizard:precios_labores_bundle:t:{$tenantId}";
    }

    public static function forgetPreciosLaboresBundle(int $tenantId): void
    {
        Cache::forget(static::preciosLaboresBundle($tenantId));
    }

    public static function eps(int $tenantId): string
    {
        return "wizard:eps:t:{$tenantId}";
    }

    public static function arl(int $tenantId): string
    {
        return "wizard:arl:t:{$tenantId}";
    }

    public static function fondosPension(int $tenantId): string
    {
        return "wizard:fondos:t:{$tenantId}";
    }

    public static function fondosCesantias(int $tenantId): string
    {
        return "wizard:fondos_cesantias:t:{$tenantId}";
    }

    public static function entidadesBancarias(int $tenantId): string
    {
        return "wizard:bancos:t:{$tenantId}";
    }

    public static function departamentos(): string
    {
        return "wizard:departamentos";
    }

    public static function municipios(string $codigoDepartamento): string
    {
        return "wizard:municipios:{$codigoDepartamento}";
    }

    public static function documentoCategorias(): string
    {
        return "wizard:doc_categorias";
    }

    public static function tenant(int $tenantId): string
    {
        return "tenant:{$tenantId}";
    }

    public static function tenantUser(int $tenantId, int $userId): string
    {
        return "tenant_user:{$tenantId}:{$userId}";
    }

    public static function forgetParametricasTenant(int $tenantId, string $modulo): void
    {
        $map = [
            'eps'                 => self::eps($tenantId),
            'arl'                 => self::arl($tenantId),
            'fondos_pension'      => self::fondosPension($tenantId),
            'fondos_cesantias'    => self::fondosCesantias($tenantId),
            'entidades_bancarias' => self::entidadesBancarias($tenantId),
            'predios'             => self::predios($tenantId),
        ];

        if (isset($map[$modulo])) {
            Cache::forget($map[$modulo]);
        }
    }

    public static function forgetTenant(int $tenantId): void
    {
        Cache::forget(self::tenant($tenantId));
    }

    public static function forgetTenantUser(int $tenantId, int $userId): void
    {
        Cache::forget(self::tenantUser($tenantId, $userId));
    }
}
