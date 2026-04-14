<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * POST /api/v1/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación inválidos',
                'errors' => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            $this->auditoria->registrarLoginFallido($request, $credentials['email']);
            return response()->json([
                'message' => 'Credenciales inválidas',
            ], 401);
        }

        if (!$user->status) {
            $this->auditoria->registrarLoginFallido($request, $credentials['email']);
            return response()->json([
                'message' => 'Su cuenta está inactiva, contacte al administrador',
            ], 403);
        }

        if (!$user->is_super_admin) {
            $this->auditoria->registrarLoginFallido($request, $credentials['email']);
            return response()->json([
                'message' => 'No tiene permisos para acceder a este panel',
            ], 403);
        }

        if (!Hash::check($credentials['password'], $user->password)) {
            $this->auditoria->registrarLoginFallido($request, $credentials['email']);
            return response()->json([
                'message' => 'Credenciales inválidas',
            ], 401);
        }

        $token = JWTAuth::fromUser($user);

        $this->auditoria->registrarLogin($request, $user);

        return $this->respondWithToken($token, $user);
    }

    /**
     * POST /api/v1/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'tenant_id' => 'nullable|exists:tenants,id',
            'rol' => 'nullable|in:ADMIN,LIDER DE CAMPO,PROPIETARIO',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'status' => true,
        ]);

        if ($request->tenant_id) {
            $user->tenants()->attach($request->tenant_id, [
                'rol' => $request->rol ?? 'PROPIETARIO',
                'estado' => true,
            ]);
        }

        $this->auditoria->registrarCreacion($request, 'AUTH', $user, "Registro de nuevo usuario '{$user->name}'");

        $token = JWTAuth::fromUser($user);

        return $this->respondWithToken($token, $user, 201);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->auditoria->registrarLogout($request);

        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }

    /**
     * POST /api/v1/auth/refresh
     */
    public function refresh(): JsonResponse
    {
        $token = JWTAuth::refresh(JWTAuth::getToken());
        $user = JWTAuth::setToken($token)->toUser();

        return $this->respondWithToken($token, $user);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('activeTenants');

        return response()->json([
            'user' => $user,
            'tenants' => $user->activeTenants->map(fn($t) => [
                'id' => $t->id,
                'nombre' => $t->nombre,
                'nit' => $t->nit,
                'plan' => $t->plan,
                'rol' => $t->pivot->rol,
            ]),
        ]);
    }

    /**
     * POST /api/v1/auth/select-tenant
     */
    public function selectTenant(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
        ]);

        $user = $request->user();
        $tenantId = $request->tenant_id;

        if (!$user->hasAccessToTenant($tenantId)) {
            return response()->json([
                'message' => 'No tiene acceso a este tenant',
            ], 403);
        }

        $customClaims = [
            'tenant_id' => $tenantId,
            'tenant_role' => $user->getRoleInTenant($tenantId),
        ];

        $token = JWTAuth::claims($customClaims)->fromUser($user);

        $tenant = Tenant::with('config')->find($tenantId);

        // Registrar tenant en el container para auditoría
        app()->instance('current_tenant_id', $tenantId);

        // Sincronizar rol Spatie para obtener permisos
        setPermissionsTeamId((int) $tenantId);
        $rol = $user->getRoleInTenant($tenantId);

        // Permisos del rol + permisos directos del usuario en este tenant
        $permisos = $this->getPermisosUsuario($user, $rol);

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'tenant_id' => $tenantId,
            'tenant_nombre' => $tenant->nombre,
            'rol' => $rol,
            'permisos' => $permisos,
            'modulos' => $tenant->modulosActivos(),
            'config_nomina' => $tenant->configNomina(),
        ]);
    }

    // ─── Helpers ────────────────────────────────────

    protected function getPermisosUsuario(User $user, ?string $rol): array
    {
        $permisos = [];

        if ($rol) {
            $spatieRole = \Spatie\Permission\Models\Role::where('name', $rol)
                ->where('guard_name', 'api')
                ->first();

            if ($spatieRole) {
                $permisos = $spatieRole->permissions->pluck('name')->toArray();
            }
        }

        $directos = $user->getDirectPermissions()->pluck('name')->toArray();

        return array_values(array_unique(array_merge($permisos, $directos)));
    }

    protected function respondWithToken(string $token, User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->is_super_admin,
            ],
        ], $status);
    }

}
