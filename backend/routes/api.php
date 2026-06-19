<?php

use App\Http\Controllers\Api\Admin\AuditoriaController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DiagnosticController;
use App\Http\Controllers\Api\Admin\MarketProveedorController;
use App\Http\Controllers\Api\Admin\TenantController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardTenantController;
use App\Http\Controllers\Api\AusenciaController;
use App\Http\Controllers\Api\BotTestController;
use App\Http\Controllers\Api\CargoController;
use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\EmpleadoDocumentoController;
use App\Http\Controllers\Api\EmpleadoImportacionController;
use App\Http\Controllers\Api\ConfiguracionNominaController;
use App\Http\Controllers\Api\ConfiguracionConstantesLegalesController;
use App\Http\Controllers\Api\ConfiguracionPreciosLaboresController;
use App\Http\Controllers\Api\TenantAuditoriaController;
use App\Http\Controllers\Api\InsumoController;
use App\Http\Controllers\Api\JornalController;
use App\Http\Controllers\Api\LaborController;
use App\Http\Controllers\Api\OperacionController;
use App\Http\Controllers\Api\RegistroCosechaController;
use App\Http\Controllers\Api\LineaController;
use App\Http\Controllers\Api\PrecioAbonoController;
use App\Http\Controllers\Api\LoteController;
use App\Http\Controllers\Api\ModalidadContratoController;
use App\Http\Controllers\Api\MotivoAusenciaController;
use App\Http\Controllers\Api\PalmaController;
use App\Http\Controllers\Api\PrecioCosechaController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PredioController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PromedioLoteController;
use App\Http\Controllers\Api\SemillaController;
use App\Http\Controllers\Api\SubloteController;
use App\Http\Controllers\Api\ProveedorAuthController;
use App\Http\Controllers\Api\TenantAuthController;
use App\Http\Controllers\Api\TenantSettingsController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\UbicacionController;
use App\Http\Controllers\Api\UserPermissionController;
use App\Http\Controllers\Api\EmpresaTransportadoraController;
use App\Http\Controllers\Api\EntidadBancariaController;
use App\Http\Controllers\Api\EpsController;
use App\Http\Controllers\Api\ExtractoraController;
use App\Http\Controllers\Api\FondoCesantiasController;
use App\Http\Controllers\Api\FondoPensionController;
use App\Http\Controllers\Api\ArlController;
use App\Http\Controllers\Api\HoraExtraController;
use App\Http\Controllers\Api\Nomina\NominaConceptoController;
use App\Http\Controllers\Api\Nomina\NominaController;
use App\Http\Controllers\Api\Nomina\NominaEmpleadoController;
use App\Http\Controllers\Api\TipoHoraExtraController;
use App\Http\Controllers\Api\TransportadorController;
use App\Http\Controllers\Api\ViajeController;
use App\Http\Controllers\Api\ViajeDocumentoBasculaController;
use App\Http\Controllers\Api\Market\MarketCatalogoController;
use App\Http\Controllers\Api\Market\MarketCarritoController;
use App\Http\Controllers\Api\Market\MarketPedidoController;
use App\Http\Controllers\Api\Market\MarketProveedorCatalogoController;
use App\Http\Controllers\Api\Market\MarketProveedorConfiguracionController;
use App\Http\Controllers\Api\Market\MarketProveedorDashboardController;
use App\Http\Controllers\Api\Market\MarketProveedorEstadisticasController;
use App\Http\Controllers\Api\Market\MarketProveedorProductoController;
use App\Http\Controllers\Api\Market\MarketProveedorProductoImportController;
use App\Http\Controllers\Api\Market\MarketProveedorPedidoController;
use App\Http\Controllers\Api\Market\MarketProveedorPerfilController;
use App\Http\Controllers\Api\Market\MarketProveedorReportesController;
use App\Http\Middleware\SetProveedor;
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
// AUTH PORTAL PROVEEDOR (Marketplace)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/proveedor-auth')->group(function () {
    Route::post('login',           [ProveedorAuthController::class, 'login']);
    Route::post('forgot-password', [ProveedorAuthController::class, 'forgotPassword']);
    Route::post('reset-password',  [ProveedorAuthController::class, 'resetPassword']);

    Route::middleware('auth:api')->group(function () {
        Route::post('select-proveedor', [ProveedorAuthController::class, 'selectProveedor']);
        Route::get ('me',               [ProveedorAuthController::class, 'me']);
        Route::post('logout',           [ProveedorAuthController::class, 'logout']);
        Route::post('refresh',          [ProveedorAuthController::class, 'refresh']);
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

    // ── Market: Proveedores (empresas vendedoras del marketplace) ──
    Route::prefix('market')->group(function () {
        Route::apiResource('proveedores', MarketProveedorController::class)
            ->parameters(['proveedores' => 'proveedor']);
        Route::patch('proveedores/{proveedor}/toggle', [MarketProveedorController::class, 'toggle']);

        // Usuarios vinculados a un proveedor
        Route::get   ('proveedores/{proveedor}/usuarios',        [MarketProveedorController::class, 'listUsers']);
        Route::post  ('proveedores/{proveedor}/usuarios',        [MarketProveedorController::class, 'addUser']);
        Route::put   ('proveedores/{proveedor}/usuarios/{user}', [MarketProveedorController::class, 'updateUser']);
        Route::delete('proveedores/{proveedor}/usuarios/{user}', [MarketProveedorController::class, 'removeUser']);
    });
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
        Route::get('dashboard', [DashboardTenantController::class, 'index']);
    });

    // ── Predios ──
    Route::get('predios/wizard-init', [PredioController::class, 'wizardInit'])->middleware('check.permission:lotes.crear');
    Route::get('predios/totales', [PredioController::class, 'totales'])->middleware('check.permission:lotes.ver');
    Route::get('predios/{predio}/wizard-init', [PredioController::class, 'wizardInit'])->middleware('check.permission:lotes.ver');
    Route::get('predios', [PredioController::class, 'index'])->middleware('check.permission:lotes.ver');
    Route::get('predios/{predio}/resumen', [PredioController::class, 'resumen'])->middleware('check.permission:lotes.ver');
    Route::get('predios/{predio}', [PredioController::class, 'show'])->middleware('check.permission:lotes.ver');
    Route::post('predios', [PredioController::class, 'store'])->middleware('check.permission:lotes.crear');
    Route::put('predios/{predio}', [PredioController::class, 'update'])->middleware('check.permission:lotes.editar');
    Route::delete('predios/{predio}', [PredioController::class, 'destroy'])->middleware('check.permission:lotes.eliminar');

    // ── Lotes ──
    Route::get('lotes/semillas', [LoteController::class, 'semillas'])->middleware('check.permission:lotes.ver');
    Route::get('lotes/select', [LoteController::class, 'select'])
        ->middleware('check.permission:lotes.ver,operaciones.crear,operaciones.editar');
    Route::get('lotes', [LoteController::class, 'index'])->middleware('check.permission:lotes.ver');
    Route::get('lotes/{lote}', [LoteController::class, 'show'])->middleware('check.permission:lotes.ver');
    Route::post('lotes', [LoteController::class, 'store'])->middleware('check.permission:lotes.crear');
    Route::put('lotes/{lote}', [LoteController::class, 'update'])->middleware('check.permission:lotes.editar');
    Route::delete('lotes/{lote}', [LoteController::class, 'destroy'])->middleware('check.permission:lotes.eliminar');

    // ── Sublotes ──
    Route::get('sublotes/select', [SubloteController::class, 'select'])
        ->middleware('check.permission:sublotes.ver,operaciones.crear,operaciones.editar');
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
    Route::put('palmas/masivo/asignar-linea', [PalmaController::class, 'asignarLineaMasivo'])->middleware('check.permission:palmas.editar');
    Route::get('palmas', [PalmaController::class, 'index'])->middleware('check.permission:palmas.ver');
    Route::get('palmas/{palma}', [PalmaController::class, 'show'])->middleware('check.permission:palmas.ver');
    Route::post('palmas', [PalmaController::class, 'store'])->middleware('check.permission:palmas.crear');
    Route::put('palmas/{palma}', [PalmaController::class, 'update'])->middleware('check.permission:palmas.editar');

    // ── Colaboradores ──
    Route::get('colaboradores/select', [EmpleadoController::class, 'select'])
        ->middleware('check.permission:colaboradores.ver,operaciones.crear,operaciones.editar');
    Route::get('colaboradores', [EmpleadoController::class, 'index'])
        ->middleware('check.permission:colaboradores.ver');
    // ── Importación Masiva de Colaboradores ──
    Route::post('colaboradores/importar', [EmpleadoImportacionController::class, 'importar'])
        ->middleware('check.permission:colaboradores.crear');
    Route::get('colaboradores/importaciones/{importacion}', [EmpleadoImportacionController::class, 'estado'])
        ->middleware('check.permission:colaboradores.ver');

    // ── Wizard init bundle (consolida 8 endpoints en 1) ──
    Route::get('colaboradores/wizard-init', [EmpleadoController::class, 'wizardInit'])
        ->middleware('check.permission:colaboradores.crear');
    Route::get('colaboradores/{empleado}/wizard-init', [EmpleadoController::class, 'wizardInit'])
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
    Route::post('colaboradores/{empleado}/restaurar', [EmpleadoController::class, 'restaurar'])
        ->middleware('check.permission:colaboradores.crear')
        ->withTrashed();

    // ── Avatar del Colaborador ──
    Route::post('colaboradores/{empleado}/avatar', [EmpleadoController::class, 'uploadAvatar'])
        ->middleware('check.permission:colaboradores.editar');
    Route::delete('colaboradores/{empleado}/avatar', [EmpleadoController::class, 'deleteAvatar'])
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
    Route::get('colaboradores/{empleado}/documentos/{documento}/visualizar', [EmpleadoDocumentoController::class, 'visualizar'])
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

    // ── Operaciones: Planilla del Día ──
    Route::get('operaciones/indicadores', [OperacionController::class, 'indicadores'])
        ->middleware('check.permission:operaciones.ver');
    Route::get('operaciones', [OperacionController::class, 'index'])
        ->middleware('check.permission:operaciones.ver');
    Route::post('operaciones', [OperacionController::class, 'store'])
        ->middleware('check.permission:operaciones.crear');
    Route::get('operaciones/{operacion}/resumen', [OperacionController::class, 'resumen'])
        ->middleware('check.permission:operaciones.ver');
    Route::post('operaciones/{operacion}/aprobar', [OperacionController::class, 'aprobar'])
        ->middleware('check.permission:operaciones.aprobar');
    Route::get('operaciones/{operacion}', [OperacionController::class, 'show'])
        ->middleware('check.permission:operaciones.ver');
    Route::put('operaciones/{operacion}', [OperacionController::class, 'update'])
        ->middleware('check.permission:operaciones.editar');
    Route::delete('operaciones/{operacion}', [OperacionController::class, 'destroy'])
        ->middleware('check.permission:operaciones.eliminar');

    // ── Cosechas (anidadas a Operación) ──
    Route::post('operaciones/{operacion}/cosechas', [RegistroCosechaController::class, 'store'])
        ->middleware('check.permission:operaciones.crear');
    Route::put('cosechas/{cosecha}', [RegistroCosechaController::class, 'update'])
        ->middleware('check.permission:operaciones.editar');
    Route::delete('cosechas/{cosecha}', [RegistroCosechaController::class, 'destroy'])
        ->middleware('check.permission:operaciones.eliminar');

    // ── Jornales (anidados a Operación) ──
    Route::post('operaciones/{operacion}/jornales', [JornalController::class, 'store'])
        ->middleware('check.permission:operaciones.crear');
    Route::put('jornales/{jornal}', [JornalController::class, 'update'])
        ->middleware('check.permission:operaciones.editar');
    Route::delete('jornales/{jornal}', [JornalController::class, 'destroy'])
        ->middleware('check.permission:operaciones.eliminar');

    // ── Ausencias (anidadas a Operación) ──
    Route::post('operaciones/{operacion}/ausencias', [AusenciaController::class, 'store'])
        ->middleware('check.permission:operaciones.crear');
    Route::put('ausencias/{ausencia}', [AusenciaController::class, 'update'])
        ->middleware('check.permission:operaciones.editar');
    Route::delete('ausencias/{ausencia}', [AusenciaController::class, 'destroy'])
        ->middleware('check.permission:operaciones.eliminar');
    Route::post('ausencias/{ausencia}/aprobar', [AusenciaController::class, 'aprobar'])
        ->middleware('check.permission:configuracion.editar');
    Route::post('ausencias/{ausencia}/rechazar', [AusenciaController::class, 'rechazar'])
        ->middleware('check.permission:configuracion.editar');
    Route::post('ausencias/{ausencia}/documento', [AusenciaController::class, 'subirDocumento'])
        ->middleware('check.permission:configuracion.editar');

    // ── Horas Extra (anidadas a Operación) ──
    Route::post('operaciones/{operacion}/horas-extra', [HoraExtraController::class, 'store'])
        ->middleware('check.permission:operaciones.crear');
    Route::put('horas-extra/{horaExtra}', [HoraExtraController::class, 'update'])
        ->middleware('check.permission:operaciones.editar');
    Route::delete('horas-extra/{horaExtra}', [HoraExtraController::class, 'destroy'])
        ->middleware('check.permission:operaciones.eliminar');
    Route::post('horas-extra/{horaExtra}/aprobar', [HoraExtraController::class, 'aprobar'])
        ->middleware('check.permission:configuracion.editar');
    Route::post('horas-extra/{horaExtra}/rechazar', [HoraExtraController::class, 'rechazar'])
        ->middleware('check.permission:configuracion.editar');

    // ── Viajes: Paramétricas (selects para el form) ──
    // Aceptan `viajes.crear` (form de viajes) o `configuracion.editar` (pantalla de Configuraciones).
    Route::get('empresas-transportadoras/select', [EmpresaTransportadoraController::class, 'select'])
        ->middleware('check.permission:viajes.crear,configuracion.editar');
    Route::get('empresas-transportadoras/{empresa}/transportadores', [EmpresaTransportadoraController::class, 'transportadores'])
        ->middleware('check.permission:viajes.crear,configuracion.editar');
    Route::get('extractoras/select', [ExtractoraController::class, 'select'])
        ->middleware('check.permission:viajes.crear,configuracion.editar');

    // ── Viajes ──
    Route::get('viajes', [ViajeController::class, 'index'])
        ->middleware('check.permission:viajes.ver');
    Route::get('viajes/indicadores', [ViajeController::class, 'indicadores'])
        ->middleware('check.permission:viajes.ver');
    Route::get('viajes/operaciones-disponibles', [ViajeController::class, 'operacionesDisponibles'])
        ->middleware('check.permission:viajes.crear');
    Route::get('viajes/operaciones/{operacion}/cosechas', [ViajeController::class, 'cosechasDisponibles'])
        ->middleware('check.permission:viajes.crear');

    Route::post('viajes', [ViajeController::class, 'store'])
        ->middleware('check.permission:viajes.crear');
    Route::get('viajes/{viaje}', [ViajeController::class, 'show'])
        ->middleware('check.permission:viajes.ver');
    Route::put('viajes/{viaje}', [ViajeController::class, 'update'])
        ->middleware('check.permission:viajes.editar');
    Route::delete('viajes/{viaje}', [ViajeController::class, 'destroy'])
        ->middleware('check.permission:viajes.eliminar');

    Route::post('viajes/{viaje}/detalles', [ViajeController::class, 'addDetalle'])
        ->middleware('check.permission:viajes.editar');
    Route::delete('viajes/{viaje}/detalles/{detalle}', [ViajeController::class, 'removeDetalle'])
        ->middleware('check.permission:viajes.editar');
    Route::put('viajes/{viaje}/detalles/{detalle}/reconteo', [ViajeController::class, 'updateReconteo'])
        ->middleware('check.permission:viajes.editar');
    Route::post('viajes/{viaje}/detalles/{detalle}/aprobar-reconteo', [ViajeController::class, 'aprobarReconteo'])
        ->middleware('check.permission:viajes.editar');

    Route::post('viajes/{viaje}/saltar-validacion', [ViajeController::class, 'saltarValidacion'])
        ->middleware('check.permission:viajes.editar');
    Route::patch('viajes/{viaje}/validar', [ViajeController::class, 'validar'])
        ->middleware('check.permission:viajes.editar');
    Route::post('viajes/{viaje}/finalizar', [ViajeController::class, 'finalizar'])
        ->middleware('check.permission:viajes.editar');

    // ── Viajes: documento de báscula (OCR asíncrono con Claude Vision) ──
    Route::post('viajes/{viaje}/documento-bascula', [ViajeDocumentoBasculaController::class, 'store'])
        ->middleware('check.permission:viajes.editar');
    Route::get('viajes/{viaje}/documento-bascula/{documento}', [ViajeDocumentoBasculaController::class, 'show'])
        ->middleware('check.permission:viajes.ver');

    // ── Nómina: CRUD del período ──
    Route::get('nominas/indicadores', [NominaController::class, 'indicadores'])
        ->middleware('check.permission:nomina.ver');
    Route::get('nominas', [NominaController::class, 'index'])
        ->middleware('check.permission:nomina.ver');
    Route::get('nominas/{nomina}', [NominaController::class, 'show'])
        ->middleware('check.permission:nomina.ver');
    Route::post('nominas', [NominaController::class, 'store'])
        ->middleware('check.permission:nomina.crear');
    Route::put('nominas/{nomina}', [NominaController::class, 'update'])
        ->middleware('check.permission:nomina.editar');
    Route::delete('nominas/{nomina}', [NominaController::class, 'destroy'])
        ->middleware('check.permission:nomina.eliminar');
    Route::post('nominas/{nomina}/cerrar', [NominaController::class, 'cerrar'])
        ->middleware('check.permission:nomina.cerrar');

    // ── Nómina: empleados de la nómina ──
    Route::get('nominas/{nomina}/empleados-disponibles', [NominaEmpleadoController::class, 'empleadosDisponibles'])
        ->middleware('check.permission:nomina.editar');
    Route::post('nominas/{nomina}/empleados', [NominaEmpleadoController::class, 'agregar'])
        ->middleware('check.permission:nomina.editar');
    Route::delete('nomina-empleado/{nominaEmpleado}', [NominaEmpleadoController::class, 'eliminar'])
        ->middleware('check.permission:nomina.editar');

    // ── Nómina: liquidación de empleado ──
    Route::get('nomina-empleado/{nominaEmpleado}/preview', [NominaEmpleadoController::class, 'preview'])
        ->middleware('check.permission:nomina.liquidar');
    Route::get('nomina-empleado/{nominaEmpleado}/resumen-trabajo', [NominaEmpleadoController::class, 'resumenTrabajo'])
        ->middleware('check.permission:nomina.liquidar');
    Route::post('nomina-empleado/{nominaEmpleado}/liquidar', [NominaEmpleadoController::class, 'liquidar'])
        ->middleware('check.permission:nomina.liquidar');
    Route::put('nomina-empleado/{nominaEmpleado}/liquidacion', [NominaEmpleadoController::class, 'liquidar'])
        ->middleware('check.permission:nomina.liquidar');

    // ── Nómina: desprendible ──
    Route::get('nomina-empleado/{nominaEmpleado}/desprendible', [NominaEmpleadoController::class, 'desprendible'])
        ->middleware('check.permission:nomina.ver');
    Route::get('nomina-empleado/{nominaEmpleado}/desprendible/pdf', [NominaEmpleadoController::class, 'desprendiblePdf'])
        ->middleware('check.permission:nomina.ver')
        ->name('nomina.desprendible.descarga');
    Route::post('nomina-empleado/{nominaEmpleado}/desprendible/whatsapp', [NominaEmpleadoController::class, 'desprendibleWhatsapp'])
        ->middleware('check.permission:nomina.ver');

    // ── Nómina: catálogo de conceptos ──
    Route::get('nomina-conceptos', [NominaConceptoController::class, 'index'])
        ->middleware('check.permission:nomina-conceptos.ver');
    Route::get('nomina-conceptos/select', [NominaConceptoController::class, 'select'])
        ->middleware('check.permission:nomina.liquidar');
    Route::post('nomina-conceptos', [NominaConceptoController::class, 'store'])
        ->middleware('check.permission:nomina-conceptos.gestionar');
    Route::put('nomina-conceptos/{nominaConcepto}', [NominaConceptoController::class, 'update'])
        ->middleware('check.permission:nomina-conceptos.gestionar');
    Route::delete('nomina-conceptos/{nominaConcepto}', [NominaConceptoController::class, 'destroy'])
        ->middleware('check.permission:nomina-conceptos.gestionar');

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

    // ── Configuración — Info Empresa ──
    Route::get('configuracion/info-empresa', [TenantSettingsController::class, 'showInfoEmpresa'])
        ->middleware('check.permission:configuracion.editar');
    Route::put('configuracion/info-empresa', [TenantSettingsController::class, 'updateFinca'])
        ->middleware('check.permission:configuracion.editar');
    // Alias legacy
    Route::put('configuracion/finca', [TenantSettingsController::class, 'updateFinca'])
        ->middleware('check.permission:configuracion.editar');

    // ── Semillas select (dropdown del formulario de Lotes) ──
    Route::get('semillas/select', [SemillaController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,lotes.ver,lotes.crear,lotes.editar');

    // ── Insumos select (dropdown del wizard de Operaciones) ──
    // Fuera del grupo configuracion.editar para que operadores con permiso de
    // operaciones también puedan poblar el select "Tipo de Fertilizante".
    Route::get('insumos/select', [InsumoController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,operaciones.crear,operaciones.editar');

    // ── Lotes / Sublotes select del wizard de Operaciones ──
    // Endpoints dedicados al Paso 2 (Labores de Palma). No tocan los permisos
    // del módulo de Plantación: /lotes/select y /sublotes/select siguen
    // existiendo con sus permisos originales para el CRUD admin de plantación.
    // Estos solo requieren permisos de operaciones, igual que los demás
    // selects del wizard. El payload de sublotes incluye `cantidad_palmas`
    // para que el frontend autocomplete el campo "Número de Palmas".
    Route::get('operaciones/lotes/select', [LoteController::class, 'select'])
        ->middleware('check.permission:operaciones.crear,operaciones.editar');
    Route::get('operaciones/sublotes/select', [SubloteController::class, 'select'])
        ->middleware('check.permission:operaciones.crear,operaciones.editar');

    // ── Crear insumo desde el wizard de Fertilización ("Otro" en el dropdown) ──
    // Endpoint dedicado al Paso 2. No toca el POST /insumos del módulo de
    // configuración (que sigue requiriendo `unidad_medida` y permiso
    // `configuracion.editar`). Aquí solo se envía `nombre`; el backend setea
    // `unidad_medida = 'GRAMOS'` por default. UNIQUE (tenant_id, nombre) en DB.
    Route::post('operaciones/insumos', [InsumoController::class, 'storeFromWizard'])
        ->middleware('check.permission:operaciones.crear,operaciones.editar');

    // ── Labores select (dropdown del wizard de Operaciones) ──
    // Endpoint unificado: ?categoria=PALMA|FINCA filtra el dropdown.
    // Fuera del grupo configuracion.editar para que operadores con permiso de
    // operaciones también puedan poblar el select "Labor".
    Route::get('labores/select', [LaborController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,operaciones.crear,operaciones.editar');

    // ── Motivos de ausencia select (dropdown del wizard Paso 4) ──
    Route::get('motivos-ausencia/select', [MotivoAusenciaController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,operaciones.crear,operaciones.editar');

    // ── Tipos de hora extra select (dropdown del wizard Paso 4) ──
    Route::get('tipos-hora-extra/select', [TipoHoraExtraController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,operaciones.crear,operaciones.editar');

    // ── Tipos de hora extra codigos (lista estática de los 7 códigos legales colombianos) ──
    Route::get('tipos-hora-extra/codigos', [TipoHoraExtraController::class, 'codigos'])
        ->middleware('check.permission:configuracion.editar');

    // ── Paramétricas del colaborador (dropdowns del form de creación/edición) ──
    Route::get('eps/select', [EpsController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('fondos-pension/select', [FondoPensionController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('fondos-cesantias/select', [FondoCesantiasController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('arl/select', [ArlController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
    Route::get('entidades-bancarias/select', [EntidadBancariaController::class, 'select'])
        ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');

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

        // ── Labores (catálogo unificado: palma + finca, fijas + custom) ──
        // Las 5 fijas del sistema (COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD)
        // se siembran al provisionar el tenant y no se crean por API. POST crea
        // labores custom (categoria=PALMA|FINCA). PUT a fijas solo permite tipo_pago,
        // precio_palma y estado. DELETE de fijas devuelve 403.
        Route::get('labores', [LaborController::class, 'index']);
        Route::get('labores/{labor}', [LaborController::class, 'show']);
        Route::post('labores', [LaborController::class, 'store']);
        Route::put('labores/{labor}', [LaborController::class, 'update']);
        Route::delete('labores/{labor}', [LaborController::class, 'destroy']);

        // ── Motivos de Ausencia ──
        Route::get('motivos-ausencia', [MotivoAusenciaController::class, 'index']);
        Route::get('motivos-ausencia/{motivoAusencia}', [MotivoAusenciaController::class, 'show']);
        Route::post('motivos-ausencia', [MotivoAusenciaController::class, 'store']);
        Route::put('motivos-ausencia/{motivoAusencia}', [MotivoAusenciaController::class, 'update']);
        Route::delete('motivos-ausencia/{motivoAusencia}', [MotivoAusenciaController::class, 'destroy']);

        // ── Tipos de Hora Extra ──
        Route::get('tipos-hora-extra', [TipoHoraExtraController::class, 'index']);
        Route::get('tipos-hora-extra/{tipoHoraExtra}', [TipoHoraExtraController::class, 'show']);
        Route::post('tipos-hora-extra', [TipoHoraExtraController::class, 'store']);
        Route::put('tipos-hora-extra/{tipoHoraExtra}', [TipoHoraExtraController::class, 'update']);
        Route::delete('tipos-hora-extra/{tipoHoraExtra}', [TipoHoraExtraController::class, 'destroy']);

        // ── EPS ──
        Route::get('eps', [EpsController::class, 'index']);
        Route::get('eps/{ep}', [EpsController::class, 'show']);
        Route::post('eps', [EpsController::class, 'store']);
        Route::put('eps/{ep}', [EpsController::class, 'update']);
        Route::delete('eps/{ep}', [EpsController::class, 'destroy']);

        // ── Fondos de Pensión ──
        Route::get('fondos-pension', [FondoPensionController::class, 'index']);
        Route::get('fondos-pension/{fondoPension}', [FondoPensionController::class, 'show']);
        Route::post('fondos-pension', [FondoPensionController::class, 'store']);
        Route::put('fondos-pension/{fondoPension}', [FondoPensionController::class, 'update']);
        Route::delete('fondos-pension/{fondoPension}', [FondoPensionController::class, 'destroy']);

        // ── Fondos de Cesantías ──
        Route::get('fondos-cesantias', [FondoCesantiasController::class, 'index']);
        Route::get('fondos-cesantias/{fondoCesantias}', [FondoCesantiasController::class, 'show']);
        Route::post('fondos-cesantias', [FondoCesantiasController::class, 'store']);
        Route::put('fondos-cesantias/{fondoCesantias}', [FondoCesantiasController::class, 'update']);
        Route::delete('fondos-cesantias/{fondoCesantias}', [FondoCesantiasController::class, 'destroy']);

        // ── ARL ──
        Route::get('arl', [ArlController::class, 'index']);
        Route::get('arl/{arl}', [ArlController::class, 'show']);
        Route::post('arl', [ArlController::class, 'store']);
        Route::put('arl/{arl}', [ArlController::class, 'update']);
        Route::delete('arl/{arl}', [ArlController::class, 'destroy']);

        // ── Entidades Bancarias ──
        Route::get('entidades-bancarias', [EntidadBancariaController::class, 'index']);
        Route::get('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'show']);
        Route::post('entidades-bancarias', [EntidadBancariaController::class, 'store']);
        Route::put('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'update']);
        Route::delete('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'destroy']);

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

        // ── Bundle inicial — Pantalla "Precios de Labores" ──
        Route::get('configuracion/precios-labores/init', [ConfiguracionPreciosLaboresController::class, 'bundleInit']);

        // ── Precios de Cosecha ──
        Route::get('precios-cosecha', [PrecioCosechaController::class, 'index']);
        Route::get('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'show']);
        Route::post('precios-cosecha', [PrecioCosechaController::class, 'store']);
        Route::put('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'update']);
        Route::delete('precios-cosecha/{precioCosecha}', [PrecioCosechaController::class, 'destroy']);

        // ── Configuración de Nómina ──
        Route::get('configuracion/nomina', [ConfiguracionNominaController::class, 'show']);
        Route::put('configuracion/nomina', [ConfiguracionNominaController::class, 'update']);

        // ── Configuración — Constantes Legales ──
        Route::get('configuracion/constantes-legales', [ConfiguracionConstantesLegalesController::class, 'show']);
        Route::put('configuracion/constantes-legales', [ConfiguracionConstantesLegalesController::class, 'update']);

        // ── Viajes — Paramétricas (CRUD) ──
        // Empresas Transportadoras
        Route::get('empresas-transportadoras', [EmpresaTransportadoraController::class, 'index']);
        Route::get('empresas-transportadoras/{empresa}', [EmpresaTransportadoraController::class, 'show']);
        Route::post('empresas-transportadoras', [EmpresaTransportadoraController::class, 'store']);
        Route::put('empresas-transportadoras/{empresa}', [EmpresaTransportadoraController::class, 'update']);
        Route::delete('empresas-transportadoras/{empresa}', [EmpresaTransportadoraController::class, 'destroy']);

        // Transportadores (Conductores)
        Route::get('transportadores', [TransportadorController::class, 'index']);
        Route::get('transportadores/{transportador}', [TransportadorController::class, 'show']);
        Route::post('transportadores', [TransportadorController::class, 'store']);
        Route::put('transportadores/{transportador}', [TransportadorController::class, 'update']);
        Route::delete('transportadores/{transportador}', [TransportadorController::class, 'destroy']);

        // Extractoras
        Route::get('extractoras', [ExtractoraController::class, 'index']);
        Route::get('extractoras/{extractora}', [ExtractoraController::class, 'show']);
        Route::post('extractoras', [ExtractoraController::class, 'store']);
        Route::put('extractoras/{extractora}', [ExtractoraController::class, 'update']);
        Route::delete('extractoras/{extractora}', [ExtractoraController::class, 'destroy']);

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

    // ══════════════════════════════════════════════════════
    // MARKET — Módulo B2B (requiere modulo_market habilitado)
    // ══════════════════════════════════════════════════════
    Route::prefix('market')->middleware('check.modulo:modulo_market')->group(function () {

        // ── Catálogo ──────────────────────────────────────
        Route::get('categorias', [MarketCatalogoController::class, 'categorias'])
            ->middleware('check.permission:market.catalogo');
        Route::get('productos', [MarketCatalogoController::class, 'index'])
            ->middleware('check.permission:market.catalogo');
        Route::get('productos/{id}', [MarketCatalogoController::class, 'show'])
            ->middleware('check.permission:market.catalogo');

        // ── Carrito ───────────────────────────────────────
        Route::get('carrito', [MarketCarritoController::class, 'show'])
            ->middleware('check.permission:market.carrito');
        Route::post('carrito/items', [MarketCarritoController::class, 'addItem'])
            ->middleware('check.permission:market.carrito');
        Route::put('carrito/items/{itemId}', [MarketCarritoController::class, 'updateItem'])
            ->middleware('check.permission:market.carrito');
        Route::delete('carrito/items/{itemId}', [MarketCarritoController::class, 'removeItem'])
            ->middleware('check.permission:market.carrito');
        Route::delete('carrito', [MarketCarritoController::class, 'clear'])
            ->middleware('check.permission:market.carrito');

        // ── Pedidos ───────────────────────────────────────
        Route::get('pedidos', [MarketPedidoController::class, 'index'])
            ->middleware('check.permission:market.pedidos');
        Route::post('pedidos', [MarketPedidoController::class, 'store'])
            ->middleware('check.permission:market.pedidos');
        Route::get('pedidos/{codigo}', [MarketPedidoController::class, 'show'])
            ->middleware('check.permission:market.pedidos');
    });
});

// ═══════════════════════════════════════════════════════════
// PORTAL PROVEEDOR — Gestión de productos del marketplace
// JWT con claims proveedor_id + proveedor_role (SetProveedor)
// ═══════════════════════════════════════════════════════════
Route::prefix('v1/market/proveedor')->middleware(['auth:api', SetProveedor::class])->group(function () {

    // Dashboard — KPIs, pedidos recientes y productos más vendidos
    Route::get('dashboard', [MarketProveedorDashboardController::class, 'index']);

    // Datos para los selects del formulario de producto
    Route::get('wizard-init', [MarketProveedorProductoController::class, 'wizardInit']);

    // Importación masiva de productos (rutas estáticas ANTES de productos/{id} para evitar colisión con el parámetro)
    Route::get ('productos/importar/plantilla',          [MarketProveedorProductoImportController::class, 'descargarPlantilla']);
    Route::post('productos/importar',                    [MarketProveedorProductoImportController::class, 'importar']);
    Route::get ('productos/importaciones/{importacion}', [MarketProveedorProductoImportController::class, 'estado']);

    // CRUD de productos
    Route::get   ('productos',               [MarketProveedorProductoController::class, 'index']);
    Route::post  ('productos',               [MarketProveedorProductoController::class, 'store']);
    Route::get   ('productos/{id}',          [MarketProveedorProductoController::class, 'show']);
    Route::put   ('productos/{id}',          [MarketProveedorProductoController::class, 'update']);
    Route::delete('productos/{id}',          [MarketProveedorProductoController::class, 'destroy']);
    Route::patch ('productos/{id}/toggle',   [MarketProveedorProductoController::class, 'toggle']);

    // Gestión de imágenes de galería
    Route::post  ('productos/{id}/imagenes',          [MarketProveedorProductoController::class, 'storeImagen']);
    Route::delete('productos/{id}/imagenes/{imgId}',  [MarketProveedorProductoController::class, 'destroyImagen']);

    // Gestión de pedidos del proveedor
    // exportar ANTES que {codigo} para evitar que Laravel capture "exportar" como código
    Route::get('pedidos/exportar',         [MarketProveedorPedidoController::class, 'exportar']);
    Route::get('pedidos',                  [MarketProveedorPedidoController::class, 'index']);
    Route::get('pedidos/{codigo}',         [MarketProveedorPedidoController::class, 'show']);
    Route::put('pedidos/{codigo}/estado',  [MarketProveedorPedidoController::class, 'updateEstado']);
    Route::get('pedidos/{codigo}/factura', [MarketProveedorPedidoController::class, 'factura']);

    // Estadísticas — KPIs + evolución + top productos/clientes + métricas adicionales
    Route::get('estadisticas', [MarketProveedorEstadisticasController::class, 'index']);

    // Reportes descargables (Excel)
    Route::get('reportes/ventas',    [MarketProveedorReportesController::class, 'ventas']);
    Route::get('reportes/productos', [MarketProveedorReportesController::class, 'productos']);
    Route::get('reportes/clientes',  [MarketProveedorReportesController::class, 'clientes']);

    // Catálogos (read-only) — alimentan los selects de la pantalla de configuración
    Route::get('catalogos/bancos',          [MarketProveedorCatalogoController::class, 'bancos']);
    Route::get('catalogos/transportadoras', [MarketProveedorCatalogoController::class, 'transportadoras']);

    // Configuración del proveedor (4 tabs + resumen)
    // Lectura: ADMIN u OPERADOR | Escritura: solo ADMIN (autorización en cada FormRequest)
    Route::get('configuracion',                [MarketProveedorConfiguracionController::class, 'index']);
    Route::get('configuracion/resumen',        [MarketProveedorConfiguracionController::class, 'resumen']);
    Route::put('configuracion/general',        [MarketProveedorConfiguracionController::class, 'updateGeneral']);
    Route::put('configuracion/bancario',       [MarketProveedorConfiguracionController::class, 'updateBancario']);
    Route::put('configuracion/envios',         [MarketProveedorConfiguracionController::class, 'updateEnvios']);
    Route::put('configuracion/notificaciones', [MarketProveedorConfiguracionController::class, 'updateNotificaciones']);

    // Perfil del usuario de proveedor (cualquier rol, solo autenticado en el portal)
    Route::put('perfil',          [MarketProveedorPerfilController::class, 'update']);
    Route::put('perfil/password', [MarketProveedorPerfilController::class, 'changePassword']);
});
