<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Verifica que el usuario tenga AL MENOS uno de los permisos indicados.
     *
     * Uso en rutas:
     *   middleware('check.permission:lotes.ver')
     *   middleware('check.permission:lotes.crear,lotes.editar')  → requiere AL MENOS uno
     */
    public function handle(Request $request, Closure $next, string ...$permisos): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado',
                'code'    => 'UNAUTHENTICATED',
            ], 401);
        }

        // Super admin tiene acceso total
        if ($user->is_super_admin) {
            return $next($request);
        }

        foreach ($permisos as $permiso) {
            if ($user->can($permiso)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'No tiene permisos para realizar esta acción',
            'code'    => 'PERMISSION_DENIED',
            'required' => $permisos,
        ], 403);
    }
}
