<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class TenantUserController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/usuarios
     *
     * Lista los usuarios del tenant actual con su rol y estado.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            // Resumen global del tenant (no se ve afectado por los filtros search/estado)
            $totalUsuarios     = TenantUser::where('tenant_id', $tenantId)->count();
            $activosUsuarios   = TenantUser::where('tenant_id', $tenantId)->where('estado', true)->count();
            $inactivosUsuarios = TenantUser::where('tenant_id', $tenantId)->where('estado', false)->count();

            $usuarios = TenantUser::where('tenant_id', $tenantId)
                ->with('user:id,name,email,status')
                ->when($request->search, function ($q, $s) {
                    $q->whereHas('user', function ($q) use ($s) {
                        $q->where('name', 'ilike', "%{$s}%")
                          ->orWhere('email', 'ilike', "%{$s}%");
                    });
                })
                ->when($request->has('estado'), function ($q) use ($request) {
                    $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN));
                })
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn(TenantUser $tu) => [
                    'id'          => $tu->user->id,
                    'name'        => $tu->user->name,
                    'email'       => $tu->user->email,
                    'status'      => $tu->user->status,
                    'is_admin'    => $tu->rol === 'ADMIN',
                    'estado'      => $tu->estado,
                    'asignado_at' => $tu->created_at,
                ]);

            return response()->json([
                'data'    => $usuarios,
                'resumen' => [
                    'total'     => $totalUsuarios,
                    'activos'   => $activosUsuarios,
                    'inactivos' => $inactivosUsuarios,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar usuarios del tenant: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los usuarios',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/usuarios
     *
     * Crea un usuario nuevo o asigna uno existente al tenant actual.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'user_id'  => 'required_without:email|exists:users,id',
                'email'    => 'required_without:user_id|email',
                'name'     => 'required_with:email|string|max:255',
                'password' => 'required_with:email|string|min:8',
            ], [
                'email.email'        => 'El correo electrónico debe ser válido',
                'name.required_with' => 'El nombre es obligatorio al crear un usuario nuevo',
                'password.min'       => 'La contraseña debe tener al menos 8 caracteres',
            ]);

            $tenantId = app('current_tenant_id');
            $tenant = app('current_tenant');

            // Validar límite de usuarios del plan
            if ($tenant->max_usuarios) {
                $currentCount = TenantUser::where('tenant_id', $tenantId)
                    ->where('estado', true)
                    ->count();

                if ($currentCount >= $tenant->max_usuarios) {
                    return response()->json([
                        'message' => "Esta finca ha alcanzado el límite de {$tenant->max_usuarios} usuarios",
                        'code'    => 'MAX_USERS_REACHED',
                    ], 422);
                }
            }

            $result = DB::transaction(function () use ($request, $tenantId) {
                // Resolver o crear el usuario
                if ($request->email && !$request->user_id) {
                    $user = User::where('email', $request->email)->first();

                    if (!$user) {
                        $user = User::create([
                            'name'     => $request->name,
                            'email'    => $request->email,
                            'password' => Hash::make($request->password),
                            'status'   => true,
                        ]);
                    }
                } else {
                    $user = User::findOrFail($request->user_id);
                }

                // Verificar si ya está asignado
                $exists = TenantUser::where('tenant_id', $tenantId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($exists) {
                    if (!$exists->estado) {
                        // Reactivar usuario inactivo
                        $exists->update(['estado' => true]);

                        return ['user' => $user, 'action' => 'reactivated'];
                    }

                    return ['user' => $user, 'action' => 'already_assigned'];
                }

                // Crear la relación tenant-user (siempre como USUARIO)
                TenantUser::create([
                    'tenant_id' => $tenantId,
                    'user_id'   => $user->id,
                    'rol'       => 'USUARIO',
                    'estado'    => true,
                ]);

                return ['user' => $user, 'action' => 'created'];
            });

            if ($result['action'] === 'already_assigned') {
                return response()->json([
                    'message' => 'El usuario ya está asignado a esta finca',
                    'code'    => 'USER_ALREADY_ASSIGNED',
                ], 409);
            }

            $message = $result['action'] === 'reactivated'
                ? 'Usuario reactivado en la finca'
                : 'Usuario asignado a la finca correctamente';

            $this->auditoria->registrar(
                $request,
                'CREAR',
                'USUARIOS',
                "{$message}: {$result['user']->name}",
                null,
                [
                    'user_id' => $result['user']->id,
                    'name'    => $result['user']->name,
                    'email'   => $result['user']->email,
                ],
            );

            return response()->json([
                'message' => $message,
                'data'    => [
                    'id'    => $result['user']->id,
                    'name'  => $result['user']->name,
                    'email' => $result['user']->email,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al crear usuario en tenant: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al asignar el usuario a la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/usuarios/{user}
     *
     * Edita datos del usuario y/o su rol dentro del tenant.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        try {
            $request->validate([
                'name'     => 'sometimes|string|max:255',
                'email'    => "sometimes|email|max:255|unique:users,email,{$user->id}",
                'password' => 'sometimes|nullable|string|min:8',
                'estado'   => 'sometimes|boolean',
            ], [
                'name.max'       => 'El nombre no puede exceder 255 caracteres',
                'email.email'    => 'El correo electrónico debe ser válido',
                'email.unique'   => 'Ya existe un usuario con este correo electrónico',
                'password.min'   => 'La contraseña debe tener al menos 8 caracteres',
                'estado.boolean' => 'El estado debe ser verdadero o falso',
            ]);

            $tenantId = app('current_tenant_id');

            $pivot = TenantUser::where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->first();

            if (!$pivot) {
                return response()->json([
                    'message' => 'El usuario no está asignado a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            $datosAnteriores = [
                'user'  => $user->only(['name', 'email']),
                'pivot' => $pivot->only(['estado']),
            ];

            DB::transaction(function () use ($request, $user, $pivot) {
                // Actualizar datos del usuario (name, email, password)
                $userData = $request->only(['name', 'email']);
                if ($request->filled('password')) {
                    $userData['password'] = Hash::make($request->password);
                }
                if (!empty($userData)) {
                    $user->update($userData);
                }

                // Actualizar estado del pivot
                if ($request->has('estado')) {
                    $pivot->update(['estado' => $request->estado]);
                }
            });

            $pivotFresh = $pivot->fresh();

            $this->auditoria->registrarEdicion(
                $request,
                'USUARIOS',
                $user,
                $datosAnteriores,
                "Se editó el usuario '{$user->name}' en la finca",
            );

            return response()->json([
                'message' => 'Usuario actualizado correctamente',
                'data'    => [
                    'id'       => $user->id,
                    'name'     => $user->fresh()->name,
                    'email'    => $user->fresh()->email,
                    'status'   => $user->fresh()->status,
                    'is_admin' => $pivotFresh->rol === 'ADMIN',
                    'estado'   => $pivotFresh->estado,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al actualizar usuario en tenant: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el usuario',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/usuarios/{user}
     *
     * Remueve al usuario del tenant actual (elimina la relación, no el usuario).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            // No permitir eliminarse a sí mismo
            if ($user->id === $request->user()->id) {
                return response()->json([
                    'message' => 'No puede removerse a sí mismo de la finca',
                    'code'    => 'SELF_REMOVE_DENIED',
                ], 403);
            }

            $pivot = TenantUser::where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->first();

            if (!$pivot) {
                return response()->json([
                    'message' => 'El usuario no está asignado a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            $datosAnteriores = [
                'user_id' => $user->id,
                'name'    => $user->name,
                'email'   => $user->email,
            ];

            // Revocar permisos directos en este tenant
            setPermissionsTeamId($tenantId);
            $user->syncPermissions([]);
            $user->syncRoles([]);

            $pivot->delete();

            $this->auditoria->registrar(
                $request,
                'ELIMINAR',
                'USUARIOS',
                "Se removió al usuario '{$user->name}' de la finca",
                $datosAnteriores,
            );

            return response()->json([
                'message' => "Usuario '{$user->name}' removido de la finca",
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al remover usuario del tenant: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al remover el usuario de la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/v1/usuarios/{user}/toggle
     *
     * Activa o desactiva un usuario (campo status en users).
     */
    public function toggle(Request $request, User $user): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            // No permitir desactivarse a sí mismo
            if ($user->id === $request->user()->id) {
                return response()->json([
                    'message' => 'No puede desactivarse a sí mismo',
                    'code'    => 'SELF_TOGGLE_DENIED',
                ], 403);
            }

            // Validar que el usuario pertenezca a este tenant (sin importar estado)
            if (!$user->belongsToTenant($tenantId)) {
                return response()->json([
                    'message' => 'El usuario no pertenece a esta finca',
                    'code'    => 'USER_NOT_IN_TENANT',
                ], 404);
            }

            $estadoAnterior = $user->status;
            $nuevoEstado = !$user->status;

            $user->update(['status' => $nuevoEstado]);

            // También actualizar el estado en el pivot del tenant
            TenantUser::where('tenant_id', $tenantId)
                ->where('user_id', $user->id)
                ->update(['estado' => $nuevoEstado]);

            $accion = $nuevoEstado ? 'activado' : 'desactivado';

            $this->auditoria->registrar(
                $request,
                'TOGGLE_ESTADO',
                'USUARIOS',
                "Usuario '{$user->name}' {$accion}",
                ['status' => $estadoAnterior],
                ['status' => $nuevoEstado],
            );

            return response()->json([
                'message' => "Usuario '{$user->name}' {$accion} correctamente",
                'data'    => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'status' => $nuevoEstado,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al cambiar estado del usuario: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al cambiar el estado del usuario',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
