<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Permission;

class UserPermissionController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/usuarios/{user}/permisos
     *
     * Retorna los permisos del usuario en el tenant actual:
     * - permisos del rol (no editables)
     * - permisos directos extra (editables por el ADMIN)
     * - todos los permisos disponibles (para el UI de checkboxes)
     */
    public function show(Request $request, User $user): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            // Validar que el usuario pertenezca a este tenant
            if (!$user->hasAccessToTenant($tenantId)) {
                return response()->json([
                    'message' => 'El usuario no pertenece a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            $rol = $user->getRoleInTenant($tenantId);
            $isAdmin = $rol === 'ADMIN';

            // Todos los permisos disponibles en el sistema
            $todosPermisos = Permission::where('guard_name', 'api')
                ->pluck('name')
                ->toArray();

            if ($isAdmin) {
                // ADMIN tiene todos los permisos (no editables)
                return response()->json([
                    'user_id'              => $user->id,
                    'user_name'            => $user->name,
                    'is_admin'             => true,
                    'permisos_directos'    => [],
                    'permisos_efectivos'   => $todosPermisos,
                    'permisos_disponibles' => $todosPermisos,
                    'dependencias'         => RolesAndPermissionsSeeder::DEPENDENCIAS,
                ]);
            }

            // USUARIO: solo permisos directos
            $permisosDirectos = $user->getDirectPermissions()->pluck('name')->toArray();

            return response()->json([
                'user_id'              => $user->id,
                'user_name'            => $user->name,
                'is_admin'             => false,
                'permisos_directos'    => array_values($permisosDirectos),
                'permisos_efectivos'   => array_values($permisosDirectos),
                'permisos_disponibles' => $todosPermisos,
                'dependencias'         => RolesAndPermissionsSeeder::DEPENDENCIAS,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener permisos del usuario: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error al obtener los permisos del usuario',
                'code'    => 'PERMISSION_ERROR',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/usuarios/{user}/permisos
     *
     * Asigna permisos directos extra al usuario en el tenant actual.
     * Solo se asignan permisos que NO tiene ya por su rol (evita duplicados).
     * Reemplaza los permisos directos anteriores con los nuevos.
     *
     * Body: { "permisos": ["nomina.ver", "nomina.crear"] }
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'permisos'   => 'required|array',
            'permisos.*' => 'string|exists:permissions,name',
        ]);

        try {
            $tenantId = app('current_tenant_id');

            // Validar que el usuario pertenezca a este tenant
            if (!$user->hasAccessToTenant($tenantId)) {
                return response()->json([
                    'message' => 'El usuario no pertenece a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            // No permitir que un admin se modifique a sí mismo
            if ($user->id === $request->user()->id) {
                return response()->json([
                    'message' => 'No puede modificar sus propios permisos',
                    'code'    => 'SELF_PERMISSION_DENIED',
                ], 403);
            }

            // No permitir editar permisos de un ADMIN (ya tiene todos)
            $rol = $user->getRoleInTenant($tenantId);
            if ($rol === 'ADMIN') {
                return response()->json([
                    'message' => 'No se pueden editar los permisos de un administrador',
                    'code'    => 'ADMIN_PERMISSION_DENIED',
                ], 403);
            }

            $anteriores = $user->getDirectPermissions()->pluck('name')->toArray();

            // Expandir permisos con dependencias (ej: lotes.ver incluye sublotes.ver, lineas.ver, palmas.ver)
            $permisosExpandidos = $this->expandirDependencias($request->permisos);

            // Sincronizar permisos directos (reemplaza los anteriores)
            $user->syncPermissions($permisosExpandidos);

            // Auditar
            $this->auditoria->registrar(
                $request,
                'ACTUALIZAR_PERMISOS',
                'usuarios',
                "Permisos actualizados para {$user->name} (ID: {$user->id})",
                ['permisos_anteriores' => $anteriores],
                ['permisos_directos' => $permisosExpandidos],
            );

            return response()->json([
                'message'            => 'Permisos actualizados correctamente',
                'permisos_directos'  => array_values($permisosExpandidos),
                'permisos_efectivos' => array_values($permisosExpandidos),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar permisos del usuario: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error al actualizar los permisos',
                'code'    => 'PERMISSION_UPDATE_ERROR',
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/usuarios/{user}/permisos
     *
     * Elimina todos los permisos directos del usuario en este tenant.
     * El usuario queda solo con los permisos de su rol.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            if (!$user->hasAccessToTenant($tenantId)) {
                return response()->json([
                    'message' => 'El usuario no pertenece a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            // No permitir revocar permisos de un ADMIN
            $rol = $user->getRoleInTenant($tenantId);
            if ($rol === 'ADMIN') {
                return response()->json([
                    'message' => 'No se pueden revocar los permisos de un administrador',
                    'code'    => 'ADMIN_PERMISSION_DENIED',
                ], 403);
            }

            $anteriores = $user->getDirectPermissions()->pluck('name')->toArray();

            // Revocar todos los permisos directos
            $user->syncPermissions([]);

            $this->auditoria->registrar(
                $request,
                'REVOCAR_PERMISOS',
                'usuarios',
                "Permisos directos revocados para {$user->name} (ID: {$user->id})",
                ['permisos_revocados' => $anteriores],
                [],
            );

            return response()->json([
                'message' => 'Todos los permisos del usuario han sido revocados.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al revocar permisos del usuario: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error al revocar los permisos',
                'code'    => 'PERMISSION_REVOKE_ERROR',
            ], 500);
        }
    }

    /**
     * Expande un array de permisos con sus dependencias.
     * Ej: ['lotes.ver'] → ['lotes.ver', 'sublotes.ver', 'lineas.ver', 'palmas.ver']
     */
    protected function expandirDependencias(array $permisos): array
    {
        $expandidos = $permisos;

        foreach ($permisos as $permiso) {
            if (isset(RolesAndPermissionsSeeder::DEPENDENCIAS[$permiso])) {
                $expandidos = array_merge($expandidos, RolesAndPermissionsSeeder::DEPENDENCIAS[$permiso]);
            }
        }

        return array_values(array_unique($expandidos));
    }
}
