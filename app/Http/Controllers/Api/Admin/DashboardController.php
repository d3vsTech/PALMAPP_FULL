<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard
     * Estadísticas generales para el panel del super admin.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'tenants' => [
                    'total'      => Tenant::count(),
                    'activos'    => Tenant::where('estado', 'ACTIVO')->count(),
                    'suspendidos' => Tenant::where('estado', 'SUSPENDIDO')->count(),
                    'inactivos'  => Tenant::where('estado', 'INACTIVO')->count(),
                ],
                'usuarios' => [
                    'total'       => User::count(),
                    'activos'     => User::where('status', true)->count(),
                    'super_admins' => User::where('is_super_admin', true)->count(),
                ],
                'asignaciones' => [
                    'total'       => TenantUser::count(),
                    'por_rol' => [
                        'ADMIN'          => TenantUser::where('rol', 'ADMIN')->where('estado', true)->count(),
                        'LIDER DE CAMPO' => TenantUser::where('rol', 'LIDER DE CAMPO')->where('estado', true)->count(),
                        'PROPIETARIO'    => TenantUser::where('rol', 'PROPIETARIO')->where('estado', true)->count(),
                    ],
                ],
                'tenants_recientes' => Tenant::with('config')
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get(['id', 'nombre', 'nit', 'estado', 'plan', 'created_at']),
            ],
        ]);
    }
}
