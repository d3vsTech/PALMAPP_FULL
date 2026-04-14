<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}
    /**
     * GET /api/admin/users
     * Listar todos los usuarios del sistema con sus tenants.
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%");
            }))
            ->when($request->has('status'), fn($q) => $q->where('status', $request->boolean('status')))
            ->when($request->has('is_super_admin'), fn($q) => $q->where('is_super_admin', $request->boolean('is_super_admin')))
            ->with(['tenantUsers.tenant:id,nombre,estado'])
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    /**
     * GET /api/admin/users/{user}
     * Detalle de un usuario con todos sus tenants y roles.
     */
    public function show(User $user): JsonResponse
    {
        $user->load(['tenantUsers.tenant:id,nombre,nit,estado,plan']);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->is_super_admin,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'tenants' => $user->tenantUsers->map(fn($tu) => [
                    'tenant_id' => $tu->tenant->id,
                    'nombre' => $tu->tenant->nombre,
                    'nit' => $tu->tenant->nit,
                    'estado_tenant' => $tu->tenant->estado,
                    'plan' => $tu->tenant->plan,
                    'rol' => $tu->rol,
                    'estado' => $tu->estado,
                ]),
            ],
        ]);
    }

    /**
     * POST /api/admin/users
     * Crear un nuevo usuario (opcionalmente asignarlo a un tenant).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'is_super_admin' => 'nullable|boolean',
            'status'   => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'is_super_admin' => $request->boolean('is_super_admin', false),
            'status' => $request->boolean('status', true),
        ]);

        $this->auditoria->registrarCreacion($request, 'USUARIOS', $user, "Se creó el usuario '{$user->name}'");

        return response()->json([
            'message' => "Usuario '{$user->name}' creado exitosamente",
            'data' => $user,
        ], 201);
    }

    /**
     * PUT /api/admin/users/{user}
     * Actualizar datos de un usuario.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => "sometimes|email|unique:users,email,{$user->id}",
            'password' => 'nullable|string|min:8',
            'is_super_admin' => 'nullable|boolean',
            'status'   => 'nullable|boolean',
        ]);

        $datosAnteriores = $user->toArray();
        $data = $request->only(['name', 'email', 'is_super_admin', 'status']);

        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->password);
        }

        $user->update($data);

        $this->auditoria->registrarEdicion($request, 'USUARIOS', $user, $datosAnteriores, "Se editó el usuario '{$user->name}'");

        return response()->json([
            'message' => 'Usuario actualizado',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * PATCH /api/admin/users/{user}/toggle
     * Activar/desactivar un usuario.
     */
    public function toggle(Request $request, User $user): JsonResponse
    {
        // No permitir desactivarse a sí mismo
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'No puede desactivar su propia cuenta',
            ], 422);
        }

        $datosAnteriores = $user->toArray();
        $user->update(['status' => !$user->status]);

        $estado = $user->status ? 'activado' : 'desactivado';

        $this->auditoria->registrarEdicion($request, 'USUARIOS', $user, $datosAnteriores, "Se {$estado} el usuario '{$user->name}'");

        return response()->json([
            'message' => "Usuario {$estado}",
            'data' => $user,
        ]);
    }
}
