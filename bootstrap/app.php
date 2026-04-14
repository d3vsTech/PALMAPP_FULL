<?php
use App\Http\Middleware\CheckModulo;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\SetTenant;
use App\Http\Middleware\SuperAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => SetTenant::class,
            'super_admin' => SuperAdmin::class,
            'check.modulo' => CheckModulo::class,
            'check.permission' => CheckPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json([
                'message' => 'Token expirado',
                'code' => 'TOKEN_EXPIRED',
            ], 401);
        });

        $exceptions->render(function (\PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json([
                'message' => 'Token inválido',
                'code' => 'TOKEN_INVALID',
            ], 401);
        });

        $exceptions->render(function (\PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException $e) {
            return response()->json([
                'message' => 'Token no proporcionado',
                'code' => 'TOKEN_ABSENT',
            ], 401);
        });
    })
    ->create();
