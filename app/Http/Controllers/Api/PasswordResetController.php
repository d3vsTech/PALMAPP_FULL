<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}
    /**
     * POST /api/v1/auth/forgot-password
     *
     * Valida el correo y envía la notificación de restablecimiento.
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

        try {
            $user = User::where('email', $request->email)->first();

            // ── Validar que el usuario exista ──
            if (!$user) {
                return response()->json([
                    'message' => 'No se encontró un usuario con ese correo.',
                    'code'    => 'USER_NOT_FOUND',
                ], 404);
            }

            // ── Validar que el usuario esté activo ──
            if (!$user->status) {
                return response()->json([
                    'message' => 'Su cuenta está inactiva. Contacte al administrador.',
                    'code'    => 'USER_INACTIVE',
                ], 403);
            }

            // Generar token usando el broker de Laravel
            $token = Password::broker()->createToken($user);

            // Enviar notificación personalizada
            $frontendUrl = config('app.frontend_url', 'http://localhost:3000') . '/reset-password';

            $user->notify(new ResetPasswordNotification($token, $frontendUrl));

            return response()->json([
                'message' => 'Se ha enviado un enlace de restablecimiento a tu correo.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Error en forgot-password: ' . $e->getMessage(), [
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
     * POST /api/v1/auth/reset-password
     *
     * Restablece la contraseña del usuario con token válido.
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
                $this->auditoria->registrar($request, 'CAMBIO_PASSWORD', 'AUTH', "Contraseña restablecida vía token para: {$request->email}");

                return response()->json([
                    'message' => 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
                ]);
            }

            // Mapear errores del broker a mensajes en español
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
            Log::error('Error en reset-password: ' . $e->getMessage(), [
                'email' => $request->email,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Ocurrió un error al restablecer la contraseña. Intenta más tarde.',
                'code'    => 'RESET_ERROR',
            ], 500);
        }
    }
}
