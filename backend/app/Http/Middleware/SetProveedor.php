<?php

namespace App\Http\Middleware;

use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class SetProveedor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        try {
            $payload     = JWTAuth::parseToken()->getPayload();
            $proveedorId = (int) $payload->get('proveedor_id');
            $proveedorRole = $payload->get('proveedor_role');
        } catch (\Throwable) {
            return response()->json([
                'message' => 'Token sin proveedor seleccionado. Llame a /proveedor-auth/select-proveedor primero.',
                'code'    => 'PROVEEDOR_NOT_SELECTED',
            ], 422);
        }

        if (!$proveedorId) {
            return response()->json([
                'message' => 'Token sin proveedor seleccionado. Llame a /proveedor-auth/select-proveedor primero.',
                'code'    => 'PROVEEDOR_NOT_SELECTED',
            ], 422);
        }

        $proveedor = MarketProveedor::find($proveedorId);

        if (!$proveedor) {
            return response()->json([
                'message' => 'Proveedor no encontrado.',
                'code'    => 'PROVEEDOR_NOT_FOUND',
            ], 404);
        }

        if ($proveedor->estado !== 'activo') {
            return response()->json([
                'message' => "El proveedor '{$proveedor->nombre_empresa}' no está activo.",
                'code'    => 'PROVEEDOR_INACTIVE',
            ], 403);
        }

        $pivot = MarketProveedorUser::where('proveedor_id', $proveedorId)
            ->where('user_id', $user->id)
            ->where('estado', true)
            ->first();

        if (!$pivot) {
            return response()->json([
                'message' => 'No tiene acceso activo a este proveedor.',
                'code'    => 'PROVEEDOR_ACCESS_DENIED',
            ], 403);
        }

        app()->instance('current_proveedor_id', $proveedorId);
        app()->instance('current_proveedor', $proveedor);
        app()->instance('current_proveedor_role', $proveedorRole ?? $pivot->rol);

        return $next($request);
    }
}
