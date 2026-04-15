<?php

use App\Http\Controllers\Api\Admin\AuditoriaController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DiagnosticController;
use App\Http\Controllers\Api\Admin\TenantController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BotTestController;
use App\Http\Controllers\Api\CargoController;
use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\EmpleadoDocumentoController;
use App\Http\Controllers\Api\ConfiguracionNominaController;
use App\Http\Controllers\Api\TenantAuditoriaController;
use App\Http\Controllers\Api\InsumoController;
use App\Http\Controllers\Api\LaborController;
use App\Http\Controllers\Api\LineaController;
use App\Http\Controllers\Api\PrecioAbonoController;
use App\Http\Controllers\Api\LoteController;
use App\Http\Controllers\Api\ModalidadContratoController;
use App\Http\Controllers\Api\PalmaController;
use App\Http\Controllers\Api\PrecioCosechaController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PredioController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PromedioLoteController;
use App\Http\Controllers\Api\SemillaController;
use App\Http\Controllers\Api\SubloteController;
use App\Http\Controllers\Api\TenantAuthController;
use App\Http\Controllers\Api\TenantSettingsController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\UbicacionController;
use App\Http\Controllers\Api\UserPermissionController;
use App\Http\Middleware\SetTenant;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AGRO CAMPO — API Routes
|--------------------------------------------------------------------------
|
|   /api/v1/auth/*    → Autenticación JWT (público + autenticado)
|   /api/admin/*      → Super Admin (requiere is_super_admin)
|   /api/v1/*         → Rutas de negocio (requiere JWT + tenant)
|
*/

// ═══════════════════════════════════════════════════════════
// AUTH (Público)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('select-tenant', [AuthController::class, 'selectTenant']);

        // ── Ubicación (Departamentos y Municipios) ──
        Route::get('departamentos', [UbicacionController::class, 'departamentos']);
        Route::get('departamentos/{codigo}/municipios', [UbicacionController::class, 'municipios']);
    });
});

// ═══════════════════════════════════════════════════════════
// AUTH FINCA (Login para usuarios de tenant)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/tenant-auth')->group(function () {
    Route::post('login', [TenantAuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::post('select-tenant', [TenantAuthController::class, 'selectTenant']);
        Route::get('me', [TenantAuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

// ═══════════════════════════════════════════════════════════
// PASSWORD RESET (Público — sin JWT)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/auth')->group(function () {
    Route::post('forgot-password', [PasswordResetController::class, 'forgotPassword']);
    Route::post('reset-password', [PasswordResetController::class, 'resetPassword']);
});

// ═══════════════════════════════════════════════════════════
// SUPER ADMIN (JWT + is_super_admin)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/admin')->middleware(['auth:api', 'super_admin'])->group(function () {

    // ── Dashboard ──
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── Diagnóstico del sistema ──
    Route::get('diagnostics', [DiagnosticController::class, 'index']);

    // ── Tenants (Fincas) ──
    Route::apiResource('tenants', TenantController::class);
    Route::patch('tenants/{tenant}/toggle', [TenantController::class, 'toggle']);

    // ── Usuarios de un tenant ──
    Route::get('tenants/{tenant}/users', [TenantController::class, 'listUsers']);
    Route::post('tenants/{tenant}/users', [TenantController::class, 'addUser']);
    Route::put('tenants/{tenant}/users/{user}', [TenantController::class, 'updateUser']);
    Route::delete('tenants/{tenant}/users/{user}', [TenantController::class, 'removeUser']);

    // ── Usuarios globales ──
    Route::apiResource('users', UserController::class)->except(['destroy']);
    Route::patch('users/{user}/toggle', [UserController::class, 'toggle']);

    // ── Auditorías ──
    Route::get('auditorias', [AuditoriaController::class, 'index']);
    Route::get('auditorias/{auditoria}', [AuditoriaController::class, 'show']);
});

// ═══════════════════════════════════════════════════════════
// RUTAS DE NEGOCIO (JWT + Tenant)
// Aquí se registrarán todos los controllers de negocio.
// Por ahora se dejan como placeholder; cada controller se
// creará por módulo según la lista de tareas.
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/tenant')->middleware(['auth:api', SetTenant::class])->group(function () {

    // ── Dashboard ──
    Route::middleware('check.permission:dashboard.ver')->group(function () {
        // Route::get('dashboard', [DashboardTenantController::class, 'index']);
    });

    // ── Predios ──
    Route::get('predios', [PredioController::class, 'index'])->middleware('check.permission:lotes.ver');
    Route::get('predios/{predio}/resumen', [PredioController::class, 'resumen'])->middleware('check.permission:lotes.ver');
    Route::get('predios/{predio}', [PredioController::class, 'show'])->middleware('check.permission:lotes.ver');
    Route::post('predios', [PredioController::class, 'store'])->middleware('check.permission:lotes.crear');
    Route::put('predios/{predio}', [PredioController::class, 'update'])->middleware('check.permission:lotes.editar');
    Route::delete('predios/{predio}', [PredioController::class, 'destroy'])->middleware('check.permission:lotes.eliminar');

    // ── Lotes ──
    Route::get('lotes/semillas', [LoteController::class, 'semillas'])->middleware('check.permission:lotes.ver');
    Route::get('lotes', [LoteController::class, 'index'])->middleware('check.permission:lotes.ver');
    Route::get('lotes/{lote}', [LoteController::class, 'show'])->middleware('check.permission:lotes.ver');
    Route::post('lotes', [LoteController::class, 'store'])->middleware('check.permission:lotes.crear');
    Route::put('lotes/{lote}', [LoteController::class, 'update'])->middleware('check.permission:lotes.editar');
    Route::delete('lotes/{lote}', [LoteController::class, 'destroy'])->middleware('check.permission:lotes.eliminar');

    // ── Sublotes ──
    Route::get('sublotes', [SubloteController::class, 'index'])->middleware('check.permission:sublotes.ver');
    Route::get('sublotes/{sublote}', [SubloteController::class, 'show'])->middleware('check.permission:sublotes.ver');
    Route::post('sublotes', [SubloteController::class, 'store'])->middleware('check.permission:sublotes.crear');
    Route::put('sublotes/{sublote}', [SubloteController::class, 'update'])->middleware('check.permission:sublotes.editar');
    Route::delete('sublotes/{sublote}', [SubloteController::class, 'destroy'])->middleware('check.permission:sublotes.eliminar');

    // ── Líneas (metadata opcional por sublote) ──
    Route::get('lineas', [LineaController::class, 'index'])->middleware('check.permission:lineas.ver');
    Route::get('lineas/{linea}', [LineaController::class, 'show'])->middleware('check.permission:lineas.ver');
    Route::post('lineas', [LineaController::class, 'store'])->middleware('check.permission:lineas.crear');
    Route::put('lineas/{linea}', [LineaController::class, 'update'])->middleware('check.permission:lineas.editar');
    Route::delete('lineas/{linea}', [LineaController::class, 'destroy'])->middleware('check.permission:lineas.eliminar');

    // ── Palmas ──
    Route::get('palmas/batch/{batchId}', [PalmaController::class, 'batchStatus'])->middleware('check.permission:palmas.ver');
    Route::delete('palmas/masivo', [PalmaController::class, 'destroyMasivo'])->middleware('check.permission:palmas.eliminar');
    Route::get('palmas', [PalmaController::class, 'index'])->middleware('check.permission:palmas.ver');
    Route::get('palmas/{palma}', [PalmaController::class, 'show'])->middleware('check.permission:palmas.ver');
    Route::post('palmas', [PalmaController::class, 'store'])->middleware('check.permission:palmas.crear');
    Route::put('palmas/{palma}', [PalmaController::class, 'update'])->middleware('check.permission:palmas.editar');

    // ── Colaboradores ──
    Route::get('colaboradores', [EmpleadoController::class, 'index'])
        ->middleware('check.permission:colaboradores.ver');
    Route::get('colaboradores/{empleado}', [EmpleadoController::class, 'show'])
        ->middleware('check.permission:colaboradores.ver');
    Route::post('colaboradores', [EmpleadoController::class, 'store'])
        ->middleware('check.permission:colaboradores.crear');
    Route::put('colaboradores/{empleado}', [EmpleadoController::class, 'update'])
        ->middleware('check.permission:colaboradores.editar');
    Route::delete('colaboradores/{empleado}', [EmpleadoController::class, 'destroy'])
        ->middleware('check.permission:colaboradores.eliminar');
    Route::patch('colaboradores/{empleado}/toggle', [EmpleadoController::class, 'toggle'])
        ->middleware('check.permission:colaboradores.editar');

    // ── Documentos del Colaborador ──
    Route::get('colaboradores/documento-categorias', [EmpleadoDocumentoController::class, 'categorias'])
        ->middleware('check.permission:colaboradores.ver');
    Route::get('colaboradores/{empleado}/documentos', [EmpleadoDocumentoController::class, 'index'])
        ->middleware('check.permission:colaboradores.ver');
    Route::post('colaboradores/{empleado}/documentos', [EmpleadoDocumentoController::class, 'store'])
        ->middleware('check.permission:colaboradores.editar');
    Route::get('colaboradores/{empleado}/documentos/{documento}', [EmpleadoDocumentoController::class, 'show'])
        ->middleware('check.permission:colaboradores.ver');
    Route::get('colaboradores/{empleado}/documentos/{documento}/descargar', [EmpleadoDocumentoController::class, 'download'])
        ->middleware('check.permission:colaboradores.ver');
    Route::delete('colaboradores/{empleado}/documentos/{documento}', [EmpleadoDocumentoController::class, 'destroy'])
        ->middleware('check.permission:colaboradores.editar');

    // ── Cargos y Modalidades (lectura: configuracion O colaboradores) ──
    Route::get('cargos', [CargoController::class, 'index'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('cargos/{cargo}', [CargoController::class, 'show'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('modalidades', [ModalidadContratoController::class, 'index'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('modalidades/{modalidad}', [ModalidadContratoController::class, 'show'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');

    // ── Operaciones: Planilla (cosecha, jornales, auxiliares) ──
    // Route::apiResource('operaciones', OperacionController::class)->middleware('check.permission:operaciones.ver');
    // Route::post('operaciones/{operacion}/aprobar', [OperacionController::class, 'aprobar'])->middleware('check.permission:operaciones.editar');

    // Cosecha
    // Route::get('cosechas', ...)->middleware('check.permission:cosecha.ver');
    // Route::post('cosechas', ...)->middleware('check.permission:cosecha.crear');

    // Jornales
    // Route::get('jornales', ...)->middleware('check.permission:jornales.ver');
    // Route::post('jornales', ...)->middleware('check.permission:jornales.crear');

    // Auxiliares
    // Route::get('auxiliares', ...)->middleware('check.permission:auxiliares.ver');
    // Route::post('auxiliares', ...)->middleware('check.permission:auxiliares.crear');

    // ── Viajes ──
    // Route::get('viajes', ...)->middleware('check.permission:viajes.ver');
    // Route::post('viajes', ...)->middleware('check.permission:viajes.crear');
    // Route::put('viajes/{viaje}', ...)->middleware('check.permission:viajes.editar');
    // Route::delete('viajes/{viaje}', ...)->middleware('check.permission:viajes.eliminar');

    // ── Nómina ──
    // Route::get('nominas', ...)->middleware('check.permission:nomina.ver');
    // Route::post('nominas', ...)->middleware('check.permission:nomina.crear');
    // Route::put('nominas/{nomina}', ...)->middleware('check.permission:nomina.editar');
    // Route::post('nominas/{nomina}/calcular', ...)->middleware('check.permission:nomina.calcular');
    // Route::post('nominas/{nomina}/cerrar', ...)->middleware('check.permission:nomina.cerrar');

    // ── Gestión de Usuarios del Tenant ──
    Route::get('usuarios', [TenantUserController::class, 'index'])
        ->middleware('check.permission:usuarios.ver');
    Route::post('usuarios', [TenantUserController::class, 'store'])
        ->middleware('check.permission:usuarios.crear');
    Route::put('usuarios/{user}', [TenantUserController::class, 'update'])
        ->middleware('check.permission:usuarios.editar');
    Route::delete('usuarios/{user}', [TenantUserController::class, 'destroy'])
        ->middleware('check.permission:usuarios.eliminar');
    Route::patch('usuarios/{user}/toggle', [TenantUserController::class, 'toggle'])
        ->middleware('check.permission:usuarios.desactivar');

    // ── Permisos de Usuarios ──
    Route::get('usuarios/{user}/permisos', [UserPermissionController::class, 'show'])
        ->middleware('check.permission:usuarios.ver_permisos');
    Route::put('usuarios/{user}/permisos', [UserPermissionController::class, 'update'])
        ->middleware('check.permission:usuarios.editar_permisos');
    Route::delete('usuarios/{user}/permisos', [UserPermissionController::class, 'destroy'])
        ->middleware('check.permission:usuarios.editar_permisos');

    // ── Configuración de la Finca ──
    Route::put('configuracion/finca', [TenantSettingsController::class, 'updateFinca'])
        ->middleware('check.permission:configuracion.editar');

    // ══════════════════════════════════════════════════════
    // TABLAS PARAMÉTRICAS (permiso: configuracion.editar)
    // ══════════════════════════════════════════════════════
    Route::middleware('check.permission:configuracion.editar')->group(function () {

        // ── Semillas ──
        Route::get('semillas', [SemillaController::class, 'index']);
        Route::get('semillas/{semilla}', [SemillaController::class, 'show']);
        Route::post('semillas', [SemillaController::class, 'store']);
        Route::put('semillas/{semilla}', [SemillaController::class, 'update']);
        Route::delete('semillas/{semilla}', [SemillaController::class, 'destroy']);

        // ── Insumos ──
        Route::get('insumos', [InsumoController::class, 'index']);
        Route::get('insumos/{insumo}', [InsumoController::class, 'show']);
        Route::post('insumos', [InsumoController::class, 'store']);
        Route::put('insumos/{insumo}', [InsumoController::class, 'update']);
        Route::delete('insumos/{insumo}', [InsumoController::class, 'destroy']);

        // ── Precios de Abono (escalas genéricas por tenant) ──
        Route::get('precios-abono', [PrecioAbonoController::class, 'index']);
        Route::post('precios-abono', [PrecioAbonoController::class, 'store']);
        Route::put('precios-abono/{precioAbono}', [PrecioAbonoController::class, 'update']);
        Route::delete('precios-abono/{precioAbono}', [PrecioAbonoController::class, 'destroy']);

        // ── Labores ──
        Route::get('labores', [LaborController::class, 'index']);
        Route::get('labores/{labor}', [LaborController::class, 'show']);
        Route::post('labores', [LaborController::class, 'store']);
        Route::put('labores/{labor}', [LaborController::class, 'update']);
        Route::delete('labores/{labor}', [LaborController::class, 'destroy']);

        // ── Promedios por Lote ──
        Route::get('promedios-lote', [PromedioLoteController::class, 'index']);
        Route::get('promedios-lote/{promedioLote}', [PromedioLoteController::class, 'show']);
        Route::post('promedios-lote', [PromedioLoteController::class, 'store']);
        Route::put('promedios-lote/{promedioLote}', [PromedioLoteController::class, 'update']);
        Route::delete('promedios-lote/{promedioLote}', [PromedioLoteController::class, 'destroy']);

        // ── Cargos (escritura) ──
        Route::post('cargos', [CargoController::class, 'store']);
        Route::put('cargos/{cargo}', [CargoController::class, 'update']);
        Route::delete('cargos/{cargo}', [CargoController::class, 'destroy']);

        // ── Modalidades de Contrato (escritura) ──
        Route::post('modalidades', [ModalidadContratoController::class, 'store']);
        Route::put('modalidades/{modalidad}', [ModalidadContratoController::class, 'update']);
        Route::delete('modalidades/{modalidad}', [ModalidadContratoController::class, 'destroy']);

        // ── Precios de Cosecha ──
        Route::get('precios-cosecha', [PrecioCosechaController::class, 'index']);
        Route::get('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'show']);
        Route::post('precios-cosecha', [PrecioCosechaController::class, 'store']);
        Route::put('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'update']);
        Route::delete('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'destroy']);

        // ── Configuración de Nómina ──
        Route::get('configuracion/nomina', [ConfiguracionNominaController::class, 'show']);
        Route::put('configuracion/nomina', [ConfiguracionNominaController::class, 'update']);

        // ── Auditoría del Tenant ──
        Route::get('auditorias', [TenantAuditoriaController::class, 'index']);
        Route::get('auditorias/{auditoria}', [TenantAuditoriaController::class, 'show']);
    });

    // ── Perfil de Usuario (sin permiso especial, solo autenticado) ──
    Route::put('perfil', [ProfileController::class, 'update']);
    Route::put('perfil/password', [ProfileController::class, 'changePassword']);

    // ── BOT (integraciones externas) ──
    Route::post('bot/test', [BotTestController::class, 'ping']);

    // ── Sync Offline (requiere sync_habilitado en config) ──
    Route::middleware('check.modulo:sync_habilitado')->group(function () {
        // Route::post('sync/jornales', [SyncController::class, 'jornales']);
        // Route::post('sync/cosechas', [SyncController::class, 'cosechas']);
        // Route::get('sync/catalogs', [SyncController::class, 'catalogs']);
    });
});
