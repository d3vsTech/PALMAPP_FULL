<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMarketProveedorRequest;
use App\Http\Requests\Admin\UpdateMarketProveedorRequest;
use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MarketProveedorController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/admin/market/proveedores
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $proveedores = MarketProveedor::query()
                ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
                ->when($request->ciudad, fn($q, $c) => $q->where('ciudad', $c))
                ->when($request->departamento, fn($q, $d) => $q->where('departamento', $d))
                ->when($request->buscar, fn($q, $s) => $q->where(function ($q) use ($s) {
                    $q->where('nombre_empresa', 'ilike', "%{$s}%")
                      ->orWhere('nit', 'ilike', "%{$s}%")
                      ->orWhere('email', 'ilike', "%{$s}%");
                }))
                ->withCount([
                    'proveedorUsers as total_usuarios',
                    'productos as total_productos',
                    'pedidos as total_pedidos',
                ])
                ->orderBy($request->sort_by ?? 'nombre_empresa', $request->sort_dir ?? 'asc')
                ->paginate($request->per_page ?? 15);

            return response()->json($proveedores);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al listar los proveedores',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/admin/market/proveedores
     */
    public function store(StoreMarketProveedorRequest $request): JsonResponse
    {
        try {
            $proveedor = MarketProveedor::create([
                ...$request->proveedorData(),
                'estado' => 'activo',
            ]);

            $this->auditoria->registrarCreacion(
                $request, 'MARKET_PROVEEDORES', $proveedor,
                "Se creó el proveedor '{$proveedor->nombre_empresa}'"
            );

            return response()->json([
                'message' => "Proveedor '{$proveedor->nombre_empresa}' creado exitosamente",
                'data'    => $proveedor,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al crear el proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/admin/market/proveedores/{proveedor}
     */
    public function show(MarketProveedor $proveedor): JsonResponse
    {
        try {
            $proveedor->load(['proveedorUsers.user:id,name,email,status']);
            $proveedor->loadCount([
                'proveedorUsers as total_usuarios',
                'productos as total_productos',
                'pedidos as total_pedidos',
            ]);

            return response()->json(['data' => $proveedor]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al obtener el detalle del proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/admin/market/proveedores/{proveedor}
     */
    public function update(UpdateMarketProveedorRequest $request, MarketProveedor $proveedor): JsonResponse
    {
        try {
            $datosAnteriores = $proveedor->toArray();

            $proveedorData = $request->proveedorData();
            if (!empty($proveedorData)) {
                $proveedor->update($proveedorData);
            }

            $this->auditoria->registrarEdicion(
                $request, 'MARKET_PROVEEDORES', $proveedor, $datosAnteriores,
                "Se editó el proveedor '{$proveedor->nombre_empresa}'"
            );

            return response()->json([
                'message' => 'Proveedor actualizado correctamente',
                'data'    => $proveedor->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al actualizar el proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/admin/market/proveedores/{proveedor}
     */
    public function destroy(Request $request, MarketProveedor $proveedor): JsonResponse
    {
        try {
            if ($proveedor->estado === 'activo') {
                return response()->json([
                    'message' => 'No se puede eliminar un proveedor activo. Suspéndalo primero.',
                    'code'    => 'PROVIDER_ACTIVE',
                ], 422);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'MARKET_PROVEEDORES', $proveedor,
                "Se eliminó el proveedor '{$proveedor->nombre_empresa}'"
            );

            $proveedor->delete();

            return response()->json([
                'message' => "Proveedor '{$proveedor->nombre_empresa}' eliminado correctamente",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al eliminar el proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/v1/admin/market/proveedores/{proveedor}/toggle
     */
    public function toggle(Request $request, MarketProveedor $proveedor): JsonResponse
    {
        try {
            $datosAnteriores = $proveedor->toArray();

            $nuevoEstado = match ($proveedor->estado) {
                'activo'                   => 'suspendido',
                'suspendido', 'inactivo'   => 'activo',
                default                    => 'activo',
            };

            $proveedor->update(['estado' => $nuevoEstado]);

            $this->auditoria->registrarEdicion(
                $request, 'MARKET_PROVEEDORES', $proveedor, $datosAnteriores,
                "Proveedor '{$proveedor->nombre_empresa}' cambió a {$proveedor->estado}"
            );

            return response()->json([
                'message' => "Proveedor '{$proveedor->nombre_empresa}' ahora está {$proveedor->estado}",
                'data'    => $proveedor,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al cambiar el estado del proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─── Gestión de usuarios del proveedor ─────────────────

    /**
     * GET /api/v1/admin/market/proveedores/{proveedor}/usuarios
     */
    public function listUsers(MarketProveedor $proveedor): JsonResponse
    {
        try {
            $usuarios = MarketProveedorUser::where('proveedor_id', $proveedor->id)
                ->with('user:id,name,email,status')
                ->get()
                ->map(fn($pu) => [
                    'id'          => $pu->user->id,
                    'name'        => $pu->user->name,
                    'email'       => $pu->user->email,
                    'status'      => $pu->user->status,
                    'rol'         => $pu->rol,
                    'estado'      => $pu->estado,
                    'asignado_at' => $pu->created_at,
                ]);

            return response()->json(['data' => $usuarios]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al listar los usuarios del proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/admin/market/proveedores/{proveedor}/usuarios
     */
    public function addUser(Request $request, MarketProveedor $proveedor): JsonResponse
    {
        try {
            $request->validate([
                'user_id'  => 'required_without:email|exists:users,id',
                'email'    => 'required_without:user_id|email',
                'name'     => 'required_with:email|string|max:255',
                'password' => 'required_with:email|string|min:8',
                'rol'      => 'sometimes|in:ADMIN,OPERADOR',
            ]);

            $rol = $request->input('rol', 'ADMIN');

            // Resolver el user (existente o nuevo)
            $userId = DB::transaction(function () use ($request) {
                if ($request->filled('email') && !$request->filled('user_id')) {
                    $existingUser = User::where('email', $request->email)->first();
                    if ($existingUser) {
                        return $existingUser->id;
                    }
                    $newUser = User::create([
                        'name'              => $request->name,
                        'email'             => $request->email,
                        'password'          => Hash::make($request->password),
                        'is_super_admin'    => false,
                        'status'            => true,
                        'email_verified_at' => now(),
                    ]);
                    return $newUser->id;
                }
                return (int) $request->user_id;
            });

            // Verificar si ya está vinculado
            $exists = MarketProveedorUser::where('proveedor_id', $proveedor->id)
                ->where('user_id', $userId)
                ->first();

            if ($exists) {
                if (!$exists->estado) {
                    $exists->update(['estado' => true, 'rol' => $rol]);

                    $this->auditoria->registrar(
                        $request, 'CREAR', 'MARKET_PROVEEDOR_USERS',
                        "Usuario #{$userId} reactivado en proveedor '{$proveedor->nombre_empresa}' con rol {$rol}",
                        null,
                        ['proveedor_id' => $proveedor->id, 'user_id' => $userId, 'rol' => $rol]
                    );

                    return response()->json([
                        'message' => 'Usuario reactivado en el proveedor',
                    ]);
                }
                return response()->json([
                    'message' => 'El usuario ya está asignado a este proveedor',
                    'code'    => 'USER_ALREADY_ASSIGNED',
                ], 409);
            }

            MarketProveedorUser::create([
                'proveedor_id' => $proveedor->id,
                'user_id'      => $userId,
                'rol'          => $rol,
                'estado'       => true,
            ]);

            $this->auditoria->registrar(
                $request, 'CREAR', 'MARKET_PROVEEDOR_USERS',
                "Usuario #{$userId} asignado a proveedor '{$proveedor->nombre_empresa}' con rol {$rol}",
                null,
                ['proveedor_id' => $proveedor->id, 'user_id' => $userId, 'rol' => $rol]
            );

            return response()->json([
                'message' => 'Usuario asignado al proveedor correctamente',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al asignar el usuario al proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/admin/market/proveedores/{proveedor}/usuarios/{user}
     */
    public function updateUser(Request $request, MarketProveedor $proveedor, User $user): JsonResponse
    {
        try {
            $request->validate([
                'name'     => 'sometimes|string|max:255',
                'email'    => "sometimes|email|max:255|unique:users,email,{$user->id}",
                'password' => 'sometimes|nullable|string|min:8',
                'rol'      => 'sometimes|in:ADMIN,OPERADOR',
                'estado'   => 'sometimes|boolean',
            ], [
                'name.max'       => 'El nombre no puede exceder 255 caracteres',
                'email.email'    => 'El correo electrónico debe ser válido',
                'email.unique'   => 'Ya existe un usuario con este correo electrónico',
                'password.min'   => 'La contraseña debe tener mínimo 8 caracteres',
                'rol.in'         => 'El rol debe ser ADMIN o OPERADOR',
                'estado.boolean' => 'El estado debe ser verdadero o falso',
            ]);

            $pivot = MarketProveedorUser::where('proveedor_id', $proveedor->id)
                ->where('user_id', $user->id)
                ->first();

            if (!$pivot) {
                return response()->json([
                    'message' => 'El usuario no está asignado a este proveedor',
                ], 404);
            }

            // Actualizar datos del usuario global
            $userData = $request->only(['name', 'email']);
            if ($request->filled('password')) {
                $userData['password'] = Hash::make($request->password);
            }
            if (!empty($userData)) {
                $user->update($userData);
            }

            // Actualizar datos del pivot
            $pivotData = $request->only(['rol', 'estado']);
            if (!empty($pivotData)) {
                $pivot->update($pivotData);
            }

            $this->auditoria->registrar(
                $request, 'EDITAR', 'MARKET_PROVEEDOR_USERS',
                "Usuario '{$user->name}' actualizado en proveedor '{$proveedor->nombre_empresa}'",
                null,
                ['user_id' => $user->id, 'cambios' => array_merge($userData, $pivotData)]
            );

            return response()->json([
                'message' => 'Usuario actualizado en el proveedor',
                'data'    => [
                    'user_id' => $user->id,
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'rol'     => $pivot->fresh()->rol,
                    'estado'  => $pivot->fresh()->estado,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al actualizar el usuario en el proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/admin/market/proveedores/{proveedor}/usuarios/{user}
     */
    public function removeUser(Request $request, MarketProveedor $proveedor, User $user): JsonResponse
    {
        try {
            $deleted = MarketProveedorUser::where('proveedor_id', $proveedor->id)
                ->where('user_id', $user->id)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'El usuario no está asignado a este proveedor',
                ], 404);
            }

            $this->auditoria->registrar(
                $request, 'ELIMINAR', 'MARKET_PROVEEDOR_USERS',
                "Usuario '{$user->name}' removido de proveedor '{$proveedor->nombre_empresa}'",
                ['proveedor_id' => $proveedor->id, 'user_id' => $user->id]
            );

            return response()->json([
                'message' => 'Usuario removido del proveedor',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al remover el usuario del proveedor',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
