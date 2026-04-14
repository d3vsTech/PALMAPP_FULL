<?php

namespace App\Services;

use App\Models\Auditoria;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditoriaService
{
    public function registrar(
        Request $request,
        string $accion,
        string $modulo,
        string $observaciones,
        ?array $datosAnteriores = null,
        ?array $datosNuevos = null,
    ): void {
        try {
            $user = $request->user();

            Auditoria::withoutGlobalScope('tenant')->create([
                'tenant_id'        => app()->bound('current_tenant_id') ? app('current_tenant_id') : null,
                'user_id'          => $user?->id,
                'usuario'          => $user?->name ?? 'Invitado',
                'correo'           => $user?->email ?? 'N/A',
                'accion'           => $accion,
                'modulo'           => $modulo,
                'observaciones'    => $observaciones,
                'direccion_ip'     => $request->ip(),
                'user_agent'       => $request->userAgent(),
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos'     => $datosNuevos,
            ]);
        } catch (\Throwable $e) {
            logger()->error('Error en auditoría: ' . $e->getMessage());
        }
    }

    // ─── Acciones CRUD ─────────────────────────────────

    public function registrarCreacion(
        Request $request,
        string $modulo,
        Model $modelo,
        ?string $descripcion = null,
    ): void {
        $this->registrar(
            request: $request,
            accion: 'CREAR',
            modulo: $modulo,
            observaciones: $descripcion ?? "Se creó registro #{$modelo->getKey()} en {$modulo}",
            datosNuevos: $modelo->toArray(),
        );
    }

    public function registrarEdicion(
        Request $request,
        string $modulo,
        Model $modelo,
        array $datosAnteriores,
        ?string $descripcion = null,
    ): void {
        $this->registrar(
            request: $request,
            accion: 'EDITAR',
            modulo: $modulo,
            observaciones: $descripcion ?? "Se editó registro #{$modelo->getKey()} en {$modulo}",
            datosAnteriores: $datosAnteriores,
            datosNuevos: $modelo->fresh()?->toArray(),
        );
    }

    public function registrarEliminacion(
        Request $request,
        string $modulo,
        Model $modelo,
        ?string $descripcion = null,
    ): void {
        $this->registrar(
            request: $request,
            accion: 'ELIMINAR',
            modulo: $modulo,
            observaciones: $descripcion ?? "Se eliminó registro #{$modelo->getKey()} en {$modulo}",
            datosAnteriores: $modelo->toArray(),
        );
    }

    // ─── Acciones de Autenticación ─────────────────────

    public function registrarLogin(Request $request, User $user): void
    {
        $this->registrar(
            request: $request,
            accion: 'LOGIN_EXITOSO',
            modulo: 'AUTH',
            observaciones: 'Login exitoso',
        );
    }

    public function registrarLoginFallido(Request $request, string $correo): void
    {
        try {
            Auditoria::withoutGlobalScope('tenant')->create([
                'tenant_id'     => null,
                'user_id'       => null,
                'usuario'       => 'Invitado',
                'correo'        => $correo,
                'accion'        => 'LOGIN_FALLIDO',
                'modulo'        => 'AUTH',
                'observaciones' => "Intento de login fallido para: {$correo}",
                'direccion_ip'  => $request->ip(),
                'user_agent'    => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            logger()->error('Error en auditoría: ' . $e->getMessage());
        }
    }

    public function registrarLogout(Request $request): void
    {
        $this->registrar(
            request: $request,
            accion: 'LOGOUT',
            modulo: 'AUTH',
            observaciones: 'Cierre de sesión',
        );
    }
}
