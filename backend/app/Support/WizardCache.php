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

    public static function prediosTotales(int $tenantId): string
    {
        return "wizard:predios_totales:t:{$tenantId}";
    }

    public static function forgetPredioBundle(int $tenantId, int $predioId): void
    {
        Cache::forget(static::predioBundle($tenantId, $predioId));
        Cache::forget(static::predioResumen($tenantId, $predioId));
    }

    /**
     * Invalida los agregados del index de /plantacion: el listado paginado
     * de predios y los totales globales del tenant.
     *
     * Llamar tras cualquier mutación que cambie lotes/sublotes/palmas/hectáreas
     * del tenant (incluye jobs async de palmas).
     */
    public static function forgetPrediosResumenes(int $tenantId): void
    {
        Cache::forget(static::prediosTotales($tenantId));
        $base = static::predios($tenantId);
        foreach ([15, 50, 100] as $perPage) {
            Cache::forget("{$base}:p:{$perPage}");
        }
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

<<<<<<< HEAD
=======
    // ── Wizard de Terceros (creación y configuración de precios) ────────────────

    public static function terceroWizardInit(int $tenantId): string
    {
        return "wizard:tercero:wizard_init:t:{$tenantId}";
    }

    public static function terceroConfigBundle(int $tenantId, int $terceroId): string
    {
        return "wizard:tercero:config_bundle:t:{$tenantId}:tr:{$terceroId}";
    }

    public static function forgetTerceroConfigBundle(int $tenantId, int $terceroId): void
    {
        Cache::forget(static::terceroConfigBundle($tenantId, $terceroId));
    }

    public static function forgetTerceroWizardInit(int $tenantId): void
    {
        Cache::forget(static::terceroWizardInit($tenantId));
    }

>>>>>>> fefeda6abfbda36a95fb7c45556b4fd25646534a
    // ── Wizard de Operaciones (planilla del día) ──────────────────────────────
    // Bundle único `GET /operaciones[/{id}]/wizard-init` reemplaza las 8
    // peticiones que el wizard hacía a /select. Cada catálogo se cachea por
    // tenant durante TTL_PARAMETRICA (15 min) y se invalida explícitamente en
    // los controladores que mutan cada catálogo.

    public static function operacionesColaboradores(int $tenantId): string
    {
        return "wizard:op:colab:t:{$tenantId}";
    }

    public static function operacionesLotes(int $tenantId): string
    {
        return "wizard:op:lotes:t:{$tenantId}";
    }

    public static function operacionesSublotes(int $tenantId): string
    {
        return "wizard:op:sublotes:t:{$tenantId}";
    }

    public static function operacionesInsumos(int $tenantId): string
    {
        return "wizard:op:insumos:t:{$tenantId}";
    }

    public static function operacionesLabores(int $tenantId, string $categoria): string
    {
        return "wizard:op:labores:t:{$tenantId}:c:{$categoria}";
    }

    public static function operacionesMotivosAusencia(int $tenantId): string
    {
        return "wizard:op:motivos:t:{$tenantId}";
    }

    public static function operacionesTiposHoraExtra(int $tenantId): string
    {
        return "wizard:op:tipos_he:t:{$tenantId}";
    }

<<<<<<< HEAD
=======
    public static function operacionesOperarios(int $tenantId): string
    {
        return "wizard:op:operarios:t:{$tenantId}";
    }

    public static function operacionesTerceroLaborOverrides(int $tenantId): string
    {
        return "wizard:op:tercero_labor_overrides:t:{$tenantId}";
    }

>>>>>>> fefeda6abfbda36a95fb7c45556b4fd25646534a
    public static function forgetOperacionesKey(string $key): void
    {
        Cache::forget($key);
    }

    public static function forgetOperacionesBundle(int $tenantId): void
    {
        foreach ([
            self::operacionesColaboradores($tenantId),
            self::operacionesLotes($tenantId),
            self::operacionesSublotes($tenantId),
            self::operacionesInsumos($tenantId),
            self::operacionesLabores($tenantId, 'PALMA'),
            self::operacionesLabores($tenantId, 'FINCA'),
            self::operacionesMotivosAusencia($tenantId),
            self::operacionesTiposHoraExtra($tenantId),
<<<<<<< HEAD
=======
            self::operacionesOperarios($tenantId),
            self::operacionesTerceroLaborOverrides($tenantId),
>>>>>>> fefeda6abfbda36a95fb7c45556b4fd25646534a
        ] as $key) {
            Cache::forget($key);
        }
    }
}
