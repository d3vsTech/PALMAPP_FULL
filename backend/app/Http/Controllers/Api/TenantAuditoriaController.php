<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantAuditoriaController extends Controller
{
    /**
     * GET /api/v1/tenant/auditorias
     *
     * Lista el historial de auditoría del tenant actual.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $query = Auditoria::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->with('user:id,name,email');

            // ── Filtros ──
            if ($request->filled('accion')) {
                $query->where('accion', $request->accion);
            }

            if ($request->filled('modulo')) {
                $query->where('modulo', $request->modulo);
            }

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('usuario', 'ilike', "%{$search}%")
                      ->orWhere('correo', 'ilike', "%{$search}%")
                      ->orWhere('observaciones', 'ilike', "%{$search}%")
                      ->orWhere('modulo', 'ilike', "%{$search}%");
                });
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('created_at', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('created_at', '<=', $request->fecha_hasta);
            }

            // ── Ordenamiento y paginación ──
            $sortBy = $request->sort_by ?? 'created_at';
            $sortDir = $request->sort_dir ?? 'desc';
            $allowedSorts = ['created_at', 'accion', 'modulo', 'usuario'];

            if (!in_array($sortBy, $allowedSorts)) {
                $sortBy = 'created_at';
            }

            $auditorias = $query
                ->orderBy($sortBy, $sortDir)
                ->paginate($request->per_page ?? 15);

            $auditorias->getCollection()->transform(function ($auditoria) {
                return [
                    'id'               => $auditoria->id,
                    'accion'           => $auditoria->accion,
                    'fecha'            => $auditoria->created_at->format('d/m/Y H:i:s'),
                    'usuario'          => $auditoria->user?->name ?? $auditoria->usuario,
                    'correo'           => $auditoria->user?->email ?? $auditoria->correo,
                    'modulo'           => $auditoria->modulo,
                    'observaciones'    => $auditoria->observaciones,
                    'direccion_ip'     => $auditoria->direccion_ip,
                    'user_agent'       => $auditoria->user_agent,
                    'datos_anteriores' => $auditoria->datos_anteriores,
                    'datos_nuevos'     => $auditoria->datos_nuevos,
                ];
            });

            return response()->json($auditorias);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al listar el historial de auditoría',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/auditorias/{id}
     *
     * Detalle de un registro de auditoría del tenant actual.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $auditoria = Auditoria::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->with('user:id,name,email')
                ->findOrFail($id);

            return response()->json([
                'data' => [
                    'id'               => $auditoria->id,
                    'accion'           => $auditoria->accion,
                    'fecha'            => $auditoria->created_at->format('d/m/Y H:i:s'),
                    'usuario'          => $auditoria->user?->name ?? $auditoria->usuario,
                    'correo'           => $auditoria->user?->email ?? $auditoria->correo,
                    'modulo'           => $auditoria->modulo,
                    'observaciones'    => $auditoria->observaciones,
                    'direccion_ip'     => $auditoria->direccion_ip,
                    'user_agent'       => $auditoria->user_agent,
                    'datos_anteriores' => $auditoria->datos_anteriores,
                    'datos_nuevos'     => $auditoria->datos_nuevos,
                    'created_at'       => $auditoria->created_at,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Registro de auditoría no encontrado',
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al obtener el registro de auditoría',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
