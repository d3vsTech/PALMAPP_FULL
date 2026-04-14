<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BotTestController extends Controller
{
    public function ping(Request $request): JsonResponse
    {
        $user     = $request->user();
        $tenantId = app('current_tenant_id');
        $payload  = $request->all();

        Log::channel('stack')->info('BOT_TEST consumido', [
            'user_id'    => $user?->id,
            'user_email' => $user?->email,
            'tenant_id'  => $tenantId,
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'payload'    => $payload,
            'timestamp'  => now()->toIso8601String(),
        ]);

        return response()->json([
            'message'  => 'Bot OK — servicio consumido y registrado en log',
            'received' => [
                'user_id'   => $user?->id,
                'tenant_id' => $tenantId,
                'payload'   => $payload,
            ],
        ]);
    }
}
