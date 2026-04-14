<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Models\TenantUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        if ($user->is_super_admin && $request->is('api/admin/*')) {
            return $next($request);
        }

        $tenantId = $request->header('X-Tenant-Id')
            ?? $request->query('tenant_id');

        if (!$tenantId) {
            return response()->json([
                'message' => 'Debe seleccionar un tenant (finca). Envíe X-Tenant-Id en el header.',
                'code' => 'TENANT_REQUIRED',
            ], 422);
        }

        $tenant = Tenant::find($tenantId);

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant no encontrado',
                'code' => 'TENANT_NOT_FOUND',
            ], 404);
        }

        if ($tenant->estado !== 'ACTIVO') {
            return response()->json([
                'message' => "El cliente '{$tenant->nombre}' está {$tenant->estado}. Contacte al administrador.",
                'code' => 'TENANT_INACTIVE',
            ], 403);
        }

        if (!$user->is_super_admin) {
            $pivot = TenantUser::where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->where('estado', true)
                ->first();

            if (!$pivot) {
                return response()->json([
                    'message' => 'No tiene acceso a este tenant',
                    'code' => 'TENANT_ACCESS_DENIED',
                ], 403);
            }

            app()->instance('current_tenant_role', $pivot->rol);
        } else {
            app()->instance('current_tenant_role', 'ADMIN');
        }

        app()->instance('current_tenant_id', (int) $tenantId);
        app()->instance('current_tenant', $tenant);

        // Configurar Spatie Permission para este tenant (team)
        setPermissionsTeamId((int) $tenantId);

        return $next($request);
    }
}
