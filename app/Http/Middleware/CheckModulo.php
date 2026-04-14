<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModulo
{
    /**
     * Verifica que el módulo esté habilitado en tenant_config.
     *
     * Uso en rutas: middleware('check.modulo:usa_jornales')
     * Acepta múltiples campos separados por coma:
     *   middleware('check.modulo:usa_jornales,usa_produccion') → requiere AL MENOS uno activo
     */
    public function handle(Request $request, Closure $next, string ...$campos): Response
    {
        $tenant = app('current_tenant');

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant no resuelto',
                'code' => 'TENANT_REQUIRED',
            ], 422);
        }

        $config = $tenant->config;

        if (!$config) {
            return response()->json([
                'message' => 'Configuración del tenant no encontrada',
                'code' => 'TENANT_CONFIG_MISSING',
            ], 500);
        }

        // Si se pasan múltiples campos, basta con que UNO esté activo
        $algunoActivo = false;
        foreach ($campos as $campo) {
            if ($config->{$campo}) {
                $algunoActivo = true;
                break;
            }
        }

        if (!$algunoActivo) {
            $nombresModulo = implode(', ', $campos);
            return response()->json([
                'message' => "El módulo ({$nombresModulo}) no está habilitado para esta finca",
                'code' => 'MODULE_DISABLED',
            ], 403);
        }

        return $next($request);
    }
}
