<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class TenantAuthController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * POST /api/v1/tenant-auth/login
     *
     * Login para usuarios de finca (no super_admin).
     * Valida usuario activo, tenants activos, fecha de suspensión.
     * Si tiene un solo tenant activo, lo selecciona automáticamente.
     * Si tiene varios, retorna la lista para que el frontend elija.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ], [
            'email.required'    => 'El correo es obligatorio',
            'email.email'       => 'El correo debe ser válido',
            'password.required' => 'La contraseña es obligatoria',
            'password.min'      => 'La contraseña debe tener al menos 6 caracteres',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación inválidos',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $credentials = $request->only('email', 'password');

            // ── Buscar usuario ──
            $user = User::where('email', $credentials['email'])->first();

            if (!$user) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Credenciales inválidas',
                ], 401);
            }

            // ── Validar contraseña ──
            if (!Hash::check($credentials['password'], $user->password)) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Credenciales inválidas',
                ], 401);
            }

            // ── Validar que el usuario esté activo ──
            if (!$user->status) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Su cuenta está inactiva, contacte al administrador',
                    'code'    => 'USER_INACTIVE',
                ], 403);
            }

            // ── Bloquear super_admins (deben usar el login de admin) ──
            if ($user->is_super_admin) {
                return response()->json([
                    'message' => 'Use el panel de administración para iniciar sesión',
                    'code'    => 'USE_ADMIN_LOGIN',
                ], 403);
            }

            // ── Obtener tenants activos del usuario ──
            $activeTenants = $user->tenants()
                ->wherePivot('estado', true)
                ->where('tenants.estado', 'ACTIVO')
                ->where(function ($query) {
                    $query->whereNull('tenants.fecha_suspension')
                          ->orWhere('tenants.fecha_suspension', '>=', Carbon::today());
                })
                ->get();

            if ($activeTenants->isEmpty()) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'No tiene fincas activas asignadas. Contacte al administrador.',
                    'code'    => 'NO_ACTIVE_TENANTS',
                ], 403);
            }

            // ── Generar token JWT base ──
            $token = JWTAuth::fromUser($user);
            $this->auditoria->registrarLogin($request, $user);

            // ── Si tiene un solo tenant, seleccionarlo automáticamente ──
            if ($activeTenants->count() === 1) {
                $tenant = $activeTenants->first();
                $rol = $tenant->pivot->rol;

                // Registrar tenant en el container para auditoría
                app()->instance('current_tenant_id', $tenant->id);

                $customClaims = [
                    'tenant_id'   => $tenant->id,
                    'tenant_role' => $rol,
                ];
                $token = JWTAuth::claims($customClaims)->fromUser($user);

                // Cargar permisos Spatie
                setPermissionsTeamId((int) $tenant->id);
                $permisos = $this->getPermisosUsuario($user, $rol);

                return response()->json([
                    'token'         => $token,
                    'token_type'    => 'bearer',
                    'expires_in'    => config('jwt.ttl') * 60,
                    'requires_tenant_selection' => false,
                    'user'          => $this->formatUser($user),
                    'tenant'        => $this->formatTenant($tenant),
                    'rol'           => $rol,
                    'permisos'      => $permisos,
                    'modulos'       => $tenant->modulosActivos(),
                    'config_nomina' => $tenant->configNomina(),
                ]);
            }

            // ── Múltiples tenants: el usuario debe elegir ──
            return response()->json([
                'token'         => $token,
                'token_type'    => 'bearer',
                'expires_in'    => config('jwt.ttl') * 60,
                'requires_tenant_selection' => true,
                'user'          => $this->formatUser($user),
                'tenants'       => $activeTenants->map(fn ($t) => [
                    'id'     => $t->id,
                    'nombre' => $t->nombre,
                    'nit'    => $t->nit,
                    'plan'   => $t->plan,
                    'correo_contacto'=> $t->correo_contacto,
                    'telefono'=> $t->telefono,
                    'direccion'=> $t->direccion,
                    'departamento'=> $t->departamento,
                    'municipio'=> $t->municipio,
                    'razon_social'=> $t->razon_social,
                    'tipo_persona'=> $t->tipo_persona,
                    'logo_url'=>env('APP_URL').'/'.$t->logo_url,
                    'rol'    => $t->pivot->rol,
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en tenant-auth login: ' . $e->getMessage(), [
                'email' => $request->email,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al iniciar sesión. Intenta más tarde.',
                'code'    => 'LOGIN_ERROR',
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant-auth/select-tenant
     *
     * Selección de tenant post-login.
     * Genera nuevo token con claims de tenant y carga permisos.
     */
    public function selectTenant(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => 'required|integer|exists:tenants,id',
        ]);

        try {
            $user = $request->user();
            $tenantId = $request->tenant_id;

            // ── Validar acceso al tenant ──
            if (!$user->hasAccessToTenant($tenantId)) {
                return response()->json([
                    'message' => 'No tiene acceso a esta finca',
                    'code'    => 'TENANT_ACCESS_DENIED',
                ], 403);
            }

            $tenant = Tenant::with('config')->find($tenantId);

            // Registrar tenant en el container para auditoría
            app()->instance('current_tenant_id', $tenantId);

            // ── Validar que el tenant esté activo ──
            if (!$tenant->isActivo()) {
                return response()->json([
                    'message' => 'La finca no está activa',
                    'code'    => 'TENANT_INACTIVE',
                ], 403);
            }

            // ── Validar fecha de suspensión ──
            if ($tenant->fecha_suspension && Carbon::parse($tenant->fecha_suspension)->lt(Carbon::today())) {
                return response()->json([
                    'message' => 'La suscripción de esta finca ha expirado. Contacte al administrador.',
                    'code'    => 'TENANT_SUSPENDED',
                ], 403);
            }

            $rol = $user->getRoleInTenant($tenantId);

            $customClaims = [
                'tenant_id'   => $tenantId,
                'tenant_role' => $rol,
            ];
            $token = JWTAuth::claims($customClaims)->fromUser($user);

            // ── Cargar permisos Spatie ──
            setPermissionsTeamId((int) $tenantId);
            $permisos = $this->getPermisosUsuario($user, $rol);

            return response()->json([
                'token'         => $token,
                'token_type'    => 'bearer',
                'expires_in'    => config('jwt.ttl') * 60,
                'tenant_id'     => $tenantId,
                'tenant_nombre' => $tenant->nombre,
                'rol'           => $rol,
                'permisos'      => $permisos,
                'modulos'       => $tenant->modulosActivos(),
                'config_nomina' => $tenant->configNomina(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en select-tenant: ' . $e->getMessage(), [
                'tenant_id' => $request->tenant_id,
                'trace'     => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al seleccionar la finca. Intenta más tarde.',
                'code'    => 'SELECT_TENANT_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant-auth/me
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $activeTenants = $user->tenants()
                ->wherePivot('estado', true)
                ->where('tenants.estado', 'ACTIVO')
                ->where(function ($query) {
                    $query->whereNull('tenants.fecha_suspension')
                          ->orWhere('tenants.fecha_suspension', '>=', Carbon::today());
                })
                ->get();

            return response()->json([
                'user'    => $this->formatUser($user),
                'tenants' => $activeTenants->map(fn ($t) => [
                    'id'     => $t->id,
                    'nombre' => $t->nombre,
                    'nit'    => $t->nit,
                    'plan'   => $t->plan,
                    'correo_contacto'=> $t->correo_contacto,
                    'telefono'=> $t->telefono,
                    'direccion'=> $t->direccion,
                    'departamento'=> $t->departamento,
                    'municipio'=> $t->municipio,
                    'logo_url'=>env('APP_URL').'/storage/'.$t->logo_url,
                    'razon_social'=> $t->razon_social,
                    'tipo_persona'=> $t->tipo_persona,
                    'plan'   => $t->plan,
                    'rol'    => $t->pivot->rol,
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en tenant-auth me: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al obtener el perfil. Intenta más tarde.',
                'code'    => 'ME_ERROR',
            ], 500);
        }
    }

    // ─── Helpers ────────────────────────────────────

    protected function formatUser(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];
    }

    protected function formatTenant(Tenant $tenant): array
    {
        return [
            'id'     => $tenant->id,
            'nombre' => $tenant->nombre,
            'nit'    => $tenant->nit,
            'razon_social'=> $tenant->razon_social,
            'correo_contacto'=> $tenant->correo_contacto,
            'tipo_persona'=> $tenant->tipo_persona,
            'telefono'=> $tenant->telefono,
            'direccion'=> $tenant->direccion,
            'departamento'=> $tenant->departamento,
            'municipio'=> $tenant->municipio,
            'logo_url'=>env('APP_URL').'/storage/'.$tenant->logo_url,
            'plan'   => $tenant->plan,
        ];
    }

    /**
     * Carga permisos del usuario en el tenant.
     * ADMIN tiene todos los permisos, USUARIO solo los directos.
     */
    protected function getPermisosUsuario(User $user, ?string $rol): array
    {
        // ADMIN tiene todos los permisos
        if ($rol === 'ADMIN') {
            return \Spatie\Permission\Models\Permission::where('guard_name', 'api')
                ->pluck('name')
                ->toArray();
        }

        // USUARIO: solo permisos directos
        return $user->getDirectPermissions()->pluck('name')->toArray();
    }
}
