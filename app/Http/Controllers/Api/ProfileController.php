<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class ProfileController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * PUT /api/v1/tenant/perfil
     *
     * Edita el nombre y correo del usuario autenticado.
     * No requiere permiso especial, solo estar logueado.
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $request->validate([
                'name'  => 'sometimes|string|max:255',
                'email' => "sometimes|email|max:255|unique:users,email,{$user->id}",
            ], [
                'name.max'     => 'El nombre no puede exceder 255 caracteres',
                'email.email'  => 'El correo electrónico debe ser válido',
                'email.unique' => 'Ya existe un usuario con este correo electrónico',
            ]);

            $datosAnteriores = $user->only(['name', 'email']);

            $campos = $request->only(['name', 'email']);

            if (empty($campos)) {
                return response()->json([
                    'message' => 'No se enviaron datos para actualizar',
                    'code'    => 'NO_DATA',
                ], 422);
            }

            $user->update($campos);

            $this->auditoria->registrar(
                $request,
                'EDITAR',
                'PERFIL',
                "El usuario '{$user->name}' actualizó su perfil",
                $datosAnteriores,
                $user->fresh()->only(['name', 'email']),
            );

            return response()->json([
                'message' => 'Perfil actualizado correctamente',
                'data'    => [
                    'id'    => $user->id,
                    'name'  => $user->fresh()->name,
                    'email' => $user->fresh()->email,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al actualizar perfil: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el perfil',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/perfil/password
     *
     * Cambia la contraseña del usuario autenticado.
     * Requiere la contraseña actual para validar.
     * No requiere permiso especial, solo estar logueado.
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $request->validate([
                'current_password' => 'required|string',
                'password'         => 'required|string|min:8|confirmed',
            ], [
                'current_password.required' => 'La contraseña actual es obligatoria',
                'password.required'         => 'La nueva contraseña es obligatoria',
                'password.min'              => 'La nueva contraseña debe tener al menos 8 caracteres',
                'password.confirmed'        => 'La confirmación de contraseña no coincide',
            ]);

            // Validar contraseña actual
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'La contraseña actual es incorrecta',
                    'code'    => 'INVALID_CURRENT_PASSWORD',
                ], 422);
            }

            // Validar que la nueva contraseña sea diferente
            if (Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'La nueva contraseña debe ser diferente a la actual',
                    'code'    => 'SAME_PASSWORD',
                ], 422);
            }

            $user->update([
                'password' => Hash::make($request->password),
            ]);

            $this->auditoria->registrar(
                $request,
                'CAMBIO_PASSWORD',
                'PERFIL',
                "El usuario '{$user->name}' cambió su contraseña",
            );

            return response()->json([
                'message' => 'Contraseña actualizada correctamente',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al cambiar contraseña: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al cambiar la contraseña',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
