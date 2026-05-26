<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use App\Models\User;
use App\Notifications\ResetPasswordProveedorNotification;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class ProveedorAuthController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * POST /api/v1/proveedor-auth/login
     *
     * Login del portal de proveedores del Marketplace.
     * Valida usuario activo, vinculación con al menos un proveedor activo.
     * Si tiene un solo proveedor activo, lo selecciona automáticamente.
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

            $user = User::where('email', $credentials['email'])->first();

            if (!$user) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Credenciales inválidas',
                ], 401);
            }

            if (!Hash::check($credentials['password'], $user->password)) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Credenciales inválidas',
                ], 401);
            }

            if (!$user->status) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'Su cuenta está inactiva, contacte al administrador',
                    'code'    => 'USER_INACTIVE',
                ], 403);
            }

            if ($user->is_super_admin) {
                return response()->json([
                    'message' => 'Use el panel de administración para iniciar sesión',
                    'code'    => 'USE_ADMIN_LOGIN',
                ], 403);
            }

            $activeProveedores = $user->activeProveedores()->get();

            if ($activeProveedores->isEmpty()) {
                $this->auditoria->registrarLoginFallido($request, $credentials['email']);
                return response()->json([
                    'message' => 'No tiene proveedores activos asignados. Contacte al administrador.',
                    'code'    => 'NO_PROVEEDORES_ACTIVOS',
                ], 403);
            }

            $token = JWTAuth::fromUser($user);
            $this->auditoria->registrarLogin($request, $user);

            if ($activeProveedores->count() === 1) {
                $proveedor = $activeProveedores->first();
                $rol = $proveedor->pivot->rol;

                $customClaims = [
                    'proveedor_id'   => $proveedor->id,
                    'proveedor_role' => $rol,
                ];
                $token = JWTAuth::claims($customClaims)->fromUser($user);

                return response()->json([
                    'token'                        => $token,
                    'token_type'                   => 'bearer',
                    'expires_in'                   => config('jwt.ttl') * 60,
                    'requires_proveedor_selection' => false,
                    'user'                         => $this->formatUser($user),
                    'proveedor'                    => $this->formatProveedor($proveedor),
                    'rol'                          => $rol,
                ]);
            }

            return response()->json([
                'token'                        => $token,
                'token_type'                   => 'bearer',
                'expires_in'                   => config('jwt.ttl') * 60,
                'requires_proveedor_selection' => true,
                'user'                         => $this->formatUser($user),
                'proveedores'                  => $activeProveedores->map(fn ($p) => array_merge(
                    $this->formatProveedor($p),
                    ['rol' => $p->pivot->rol],
                )),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth login: ' . $e->getMessage(), [
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
     * POST /api/v1/proveedor-auth/select-proveedor
     *
     * Selección de proveedor post-login.
     * Genera nuevo token JWT con claims proveedor_id + proveedor_role.
     */
    public function selectProveedor(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'proveedor_id' => 'required|integer|exists:market_proveedores,id',
        ], [
            'proveedor_id.required' => 'El id del proveedor es obligatorio',
            'proveedor_id.exists'   => 'El proveedor no existe',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de validación inválidos',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $proveedorId = (int) $request->proveedor_id;

            if (!$user->hasAccessToProveedor($proveedorId)) {
                return response()->json([
                    'message' => 'No tiene acceso a este proveedor',
                    'code'    => 'PROVEEDOR_ACCESS_DENIED',
                ], 403);
            }

            $proveedor = MarketProveedor::find($proveedorId);

            if (!$proveedor || $proveedor->estado !== 'activo') {
                return response()->json([
                    'message' => 'El proveedor no está activo',
                    'code'    => 'PROVEEDOR_INACTIVE',
                ], 403);
            }

            $rol = $user->getRoleInProveedor($proveedorId);

            $customClaims = [
                'proveedor_id'   => $proveedorId,
                'proveedor_role' => $rol,
            ];
            $token = JWTAuth::claims($customClaims)->fromUser($user);

            return response()->json([
                'token'      => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'proveedor'  => $this->formatProveedor($proveedor),
                'rol'        => $rol,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth select-proveedor: ' . $e->getMessage(), [
                'proveedor_id' => $request->proveedor_id,
                'trace'        => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al seleccionar el proveedor. Intenta más tarde.',
                'code'    => 'SELECT_PROVEEDOR_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/proveedor-auth/me
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $activeProveedores = $user->activeProveedores()->get();

            return response()->json([
                'user'        => $this->formatUser($user),
                'proveedores' => $activeProveedores->map(fn ($p) => array_merge(
                    $this->formatProveedor($p),
                    ['rol' => $p->pivot->rol],
                )),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth me: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al obtener el perfil. Intenta más tarde.',
                'code'    => 'ME_ERROR',
            ], 500);
        }
    }

    /**
     * POST /api/v1/proveedor-auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
            $this->auditoria->registrarLogout($request);

            return response()->json([
                'message' => 'Sesión cerrada correctamente',
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth logout: ' . $e->getMessage());

            return response()->json([
                'message' => 'No se pudo cerrar la sesión. Intenta de nuevo.',
                'code'    => 'LOGOUT_ERROR',
            ], 500);
        }
    }

    /**
     * POST /api/v1/proveedor-auth/refresh
     */
    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::refresh(JWTAuth::getToken());

            return response()->json([
                'token'      => $newToken,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth refresh: ' . $e->getMessage());

            return response()->json([
                'message' => 'No se pudo refrescar el token. Vuelva a iniciar sesión.',
                'code'    => 'REFRESH_ERROR',
            ], 401);
        }
    }

    /**
     * POST /api/v1/proveedor-auth/forgot-password
     *
     * Genera token de restablecimiento y envía email al portal del proveedor.
     * Respuesta genérica anti-enumeración: siempre 200, sin revelar si el
     * email existe o si pertenece a un proveedor activo.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ], [
            'email.required' => 'El correo es obligatorio',
            'email.email'    => 'El correo debe ser válido',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $genericResponse = response()->json([
            'message' => 'Si el correo está registrado como proveedor, recibirás un enlace de restablecimiento.',
        ]);

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                Log::info('Forgot-password proveedor: email no registrado', ['email' => $request->email]);
                return $genericResponse;
            }

            if (!$user->status) {
                Log::warning('Forgot-password proveedor: user inactivo', ['email' => $request->email, 'user_id' => $user->id]);
                return $genericResponse;
            }

            $tieneProveedorActivo = MarketProveedorUser::where('user_id', $user->id)
                ->where('estado', true)
                ->whereHas('proveedor', fn ($q) => $q->where('estado', 'activo'))
                ->exists();

            if (!$tieneProveedorActivo) {
                Log::warning('Forgot-password proveedor: user sin proveedores activos', ['email' => $request->email, 'user_id' => $user->id]);
                return $genericResponse;
            }

            $token = Password::broker()->createToken($user);

            $frontendUrl = config('app.frontend_proveedor_url', 'http://localhost:3001') . '/reset-password';

            $user->notify(new ResetPasswordProveedorNotification($token, $frontendUrl));

            Log::info('Forgot-password proveedor: enlace enviado', ['email' => $request->email, 'user_id' => $user->id]);

            return $genericResponse;
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth forgot-password: ' . $e->getMessage(), [
                'email' => $request->email,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'No se pudo enviar el correo de restablecimiento. Intenta más tarde.',
                'code'    => 'MAIL_ERROR',
            ], 500);
        }
    }

    /**
     * POST /api/v1/proveedor-auth/reset-password
     *
     * Restablece la contraseña usando un token válido.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'token.required'     => 'El token es obligatorio',
            'email.required'     => 'El correo es obligatorio',
            'email.email'        => 'El correo debe ser válido',
            'password.required'  => 'La contraseña es obligatoria',
            'password.min'       => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $status = Password::broker()->reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function (User $user, string $password) {
                    $user->forceFill([
                        'password'       => Hash::make($password),
                        'remember_token' => Str::random(60),
                    ])->save();
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                $this->auditoria->registrar(
                    request: $request,
                    accion: 'CAMBIO_PASSWORD',
                    modulo: 'AUTH',
                    observaciones: "Reset password portal proveedor — email={$request->email}",
                );

                return response()->json([
                    'message' => 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
                ]);
            }

            $errorMessages = [
                Password::INVALID_TOKEN   => 'El enlace de restablecimiento es inválido o ha expirado.',
                Password::INVALID_USER    => 'No se encontró un usuario con ese correo.',
                Password::RESET_THROTTLED => 'Demasiados intentos. Por favor espera antes de intentar de nuevo.',
            ];

            return response()->json([
                'message' => $errorMessages[$status] ?? 'No se pudo restablecer la contraseña.',
                'code'    => 'PASSWORD_RESET_FAILED',
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error en proveedor-auth reset-password: ' . $e->getMessage(), [
                'email' => $request->email,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al restablecer la contraseña. Intenta más tarde.',
                'code'    => 'RESET_ERROR',
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

    protected function formatProveedor(MarketProveedor $proveedor): array
    {
        return [
            'id'             => $proveedor->id,
            'nombre_empresa' => $proveedor->nombre_empresa,
            'nit'            => $proveedor->nit,
            'email'          => $proveedor->email,
            'telefono'       => $proveedor->telefono,
            'direccion'      => $proveedor->direccion,
            'ciudad'         => $proveedor->ciudad,
            'departamento'   => $proveedor->departamento,
            'descripcion'    => $proveedor->descripcion,
            'logo_url'       => $proveedor->logo_url,
            'estado'         => $proveedor->estado,
        ];
    }
}
