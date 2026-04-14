# Registro de Cambios e Implementaciones - AGRO CAMPO

> Documento detallado de todos los cambios, ajustes y nuevas funcionalidades implementadas en el sistema.

---

## Tabla de Contenidos

1. [Sistema de Autenticacion por Tenant](#1-sistema-de-autenticacion-por-tenant)
2. [Recuperacion de Contrasena](#2-recuperacion-de-contrasena)
3. [Sistema de Permisos por Tenant (Spatie Teams)](#3-sistema-de-permisos-por-tenant-spatie-teams)
4. [Controlador de Permisos de Usuario](#4-controlador-de-permisos-de-usuario)
5. [Tabla Operaciones y Reestructuracion de Jornales/Cosecha](#5-tabla-operaciones-y-reestructuracion-de-jornalescosecha)
6. [Reestructuracion de Modulos en Tenant Config](#6-reestructuracion-de-modulos-en-tenant-config)
7. [Nuevo Esquema de Roles y Permisos](#7-nuevo-esquema-de-roles-y-permisos)
8. [Middleware de Proteccion por Permisos](#8-middleware-de-proteccion-por-permisos)
9. [Proteccion de Rutas por Permisos](#9-proteccion-de-rutas-por-permisos)
10. [Correcciones y Bugs Resueltos](#10-correcciones-y-bugs-resueltos)
11. [Archivos Creados y Modificados](#11-archivos-creados-y-modificados)
12. [Pasos Pendientes](#12-pasos-pendientes)

---

## 1. Sistema de Autenticacion por Tenant

### Problema
Los usuarios normales (no super_admin) no tenian un flujo de login separado. Necesitaban poder autenticarse, seleccionar una finca (tenant) si pertenecen a varias, y recibir sus permisos correspondientes a esa finca.

### Solucion
Se creo `TenantAuthController` con endpoints dedicados para usuarios de finca.

### Archivo: `app/Http/Controllers/Api/TenantAuthController.php` (NUEVO)

#### Endpoints implementados:

**POST `/api/v1/tenant-auth/login`**
- Valida credenciales del usuario (email + password)
- Verifica que el usuario este activo (`is_active = true`)
- Rechaza super_admins (deben usar `/api/v1/auth/login`)
- Obtiene la lista de tenants activos del usuario
- **Si tiene 1 solo tenant**: auto-selecciona y devuelve JWT con claims del tenant, permisos, modulos y configuracion
- **Si tiene multiples tenants**: devuelve lista de tenants para que el frontend permita seleccionar
- **Si no tiene tenants activos**: devuelve error 403

**POST `/api/v1/tenant-auth/select-tenant`**
- Recibe `tenant_id` y el JWT temporal del login
- Valida que el usuario pertenezca al tenant
- Valida que el tenant este activo y no suspendido
- Establece el contexto de equipo Spatie (`setPermissionsTeamId`)
- Genera nuevo JWT con claims: `tenant_id`, `rol`, `tenant_nombre`
- Devuelve: usuario, tenant, permisos (rol + directos), modulos activos, config de nomina

**GET `/api/v1/tenant-auth/me`**
- Devuelve la informacion del usuario autenticado
- Incluye lista de tenants activos del usuario
- Util para refrescar datos del usuario en el frontend

#### Metodo clave - `getPermisosUsuario()`:
```php
protected function getPermisosUsuario(User $user, ?string $rol): array
{
    // 1. Carga permisos del ROL (globales, definidos en el seeder)
    $permisos = [];
    if ($rol) {
        $spatieRole = Role::where('name', $rol)->where('guard_name', 'api')->first();
        if ($spatieRole) {
            $permisos = $spatieRole->permissions->pluck('name')->toArray();
        }
    }
    // 2. Carga permisos DIRECTOS del usuario (asignados por el admin del tenant)
    $directos = $user->getDirectPermissions()->pluck('name')->toArray();
    // 3. Combina ambos sin duplicados
    return array_values(array_unique(array_merge($permisos, $directos)));
}
```

Este metodo implementa el **sistema de dos capas de permisos**: permisos globales del rol + permisos directos por tenant.

---

## 2. Recuperacion de Contrasena

### Problema
No existian endpoints para que los usuarios pudieran recuperar su contrasena de forma autonoma.

### Solucion
Se creo `PasswordResetController` y se ajusto la notificacion de email.

### Archivo: `app/Http/Controllers/Api/PasswordResetController.php` (NUEVO)

#### Endpoints implementados:

**POST `/api/v1/auth/forgot-password`**
- Recibe `email` del usuario
- Valida que el usuario exista en la base de datos
- **Valida que el usuario este activo** (`is_active = true`), si no lo esta devuelve 403
- Genera token de restablecimiento via `Password::broker()`
- Envia notificacion `ResetPasswordNotification` con URL del frontend
- Envuelto en `try-catch` para capturar errores de envio de email
- Devuelve mensaje de exito o error detallado

**POST `/api/v1/auth/reset-password`**
- Recibe: `token`, `email`, `password`, `password_confirmation`
- Valida el token contra el broker de Laravel
- Restablece la contrasena y elimina el token usado
- Envuelto en `try-catch` para manejo robusto de errores
- Devuelve mensaje de exito o error con codigo apropiado

### Archivo: `app/Notifications/ResetPasswordNotification.php` (MODIFICADO)

#### Cambio critico: Se elimino `ShouldQueue`
```php
// ANTES (no funcionaba - los emails no se enviaban):
class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;
    ...
}

// DESPUES (funciona correctamente):
class ResetPasswordNotification extends Notification
{
    ...
}
```

**Razon**: La notificacion implementaba `ShouldQueue` lo que requiere un worker de colas ejecutandose (`php artisan queue:work`). Al no tener worker, los emails se encolaban pero nunca se procesaban. Al remover `ShouldQueue`, los emails se envian de forma **sincrona** (inmediata) durante la peticion HTTP.

---

## 3. Sistema de Permisos por Tenant (Spatie Teams)

### Problema
Se necesitaba que un administrador de una finca pudiera asignar permisos adicionales a sus usuarios sin afectar los permisos de ese mismo usuario en otras fincas.

### Solucion
Se aprovecho la funcionalidad de **Teams** de Spatie Permission, configurada con `team_foreign_key = tenant_id`.

### Como funciona el sistema de dos capas:

```
CAPA 1 - Permisos del Rol (Globales)
=====================================
Definidos en RolesAndPermissionsSeeder
Son los mismos para TODOS los tenants
Ejemplo: Un LIDER DE CAMPO siempre tiene operaciones.crear

CAPA 2 - Permisos Directos (Por Tenant)
=========================================
Asignados por el ADMIN del tenant via UserPermissionController
Solo existen en el contexto de ESE tenant (Spatie los guarda con tenant_id)
Ejemplo: Un LIDER DE CAMPO en Finca A tiene nomina.ver (asignado directo)
         El mismo usuario en Finca B NO tiene nomina.ver

PERMISOS EFECTIVOS = Rol + Directos (union sin duplicados)
```

### Archivo: `app/Http/Controllers/Api/AuthController.php` (MODIFICADO)

Se actualizo el metodo `selectTenant()` para usar `getPermisosUsuario()` (carga rol + directos) en lugar de solo cargar permisos del rol. Se agrego el metodo helper `getPermisosUsuario()` identico al de TenantAuthController.

---

## 4. Controlador de Permisos de Usuario

### Archivo: `app/Http/Controllers/Api/UserPermissionController.php` (NUEVO)

Permite a los administradores de un tenant gestionar permisos adicionales para sus usuarios.

#### Endpoints:

**GET `/api/v1/usuarios/{user}/permisos`**
- Protegido por `check.permission:usuarios.ver_permisos`
- Devuelve:
  - `permisos_rol`: permisos heredados del rol (no modificables)
  - `permisos_directos`: permisos asignados manualmente al usuario en este tenant
  - `permisos_efectivos`: union de ambos (lo que el usuario realmente puede hacer)
  - `permisos_disponibles`: TODOS los permisos del sistema (para que el frontend muestre checkboxes)
  - `dependencias`: mapa de dependencias jerararquicas (para auto-seleccion en frontend)

**PUT `/api/v1/usuarios/{user}/permisos`**
- Protegido por `check.permission:usuarios.editar_permisos`
- Recibe array de nombres de permisos a asignar
- **Expande dependencias automaticamente** (si asignas `lotes.ver`, automaticamente agrega `sublotes.ver`, `lineas.ver`, `palmas.ver`)
- Filtra los permisos que ya vienen del rol (no duplica)
- Sincroniza permisos directos del usuario (agrega nuevos, remueve los no incluidos)
- Registra auditoria

**DELETE `/api/v1/usuarios/{user}/permisos`**
- Protegido por `check.permission:usuarios.editar_permisos`
- Revoca TODOS los permisos directos del usuario en este tenant
- El usuario conserva los permisos de su rol
- Registra auditoria

#### Expansion de dependencias:
```php
protected function expandirDependencias(array $permisos): array
{
    $dependencias = RolesAndPermissionsSeeder::DEPENDENCIAS;
    $expandidos = $permisos;
    foreach ($permisos as $permiso) {
        $base = explode('.', $permiso)[0]; // ej: "lotes"
        $accion = explode('.', $permiso)[1] ?? null; // ej: "ver"
        if (isset($dependencias[$base]) && $accion) {
            foreach ($dependencias[$base] as $dependiente) {
                $expandidos[] = "{$dependiente}.{$accion}";
            }
        }
    }
    return array_values(array_unique($expandidos));
}
```

---

## 5. Tabla Operaciones y Reestructuracion de Jornales/Cosecha

### Problema
Las tablas `jornales` y `registro_cosecha` existian de forma independiente. Se necesitaba una tabla padre `operaciones` que representara la **planilla diaria** de trabajo, agrupando jornales y cosechas de un mismo dia.

### Solucion

### Archivo: `database/migrations/2026_03_19_000001_create_operaciones_and_update_jornales_cosecha.php` (NUEVO)

#### Tabla `operaciones` creada:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | bigIncrements | PK |
| tenant_id | FK -> tenants | Finca a la que pertenece |
| fecha | date | Fecha de la planilla |
| hora_inicio | time (nullable) | Hora inicio de la jornada |
| hora_fin | time (nullable) | Hora fin de la jornada |
| estado | enum | BORRADOR o APROBADA |
| hubo_lluvia | boolean (default false) | Si hubo lluvia ese dia |
| hora_inicio_lluvia | time (nullable) | Inicio de la lluvia |
| hora_fin_lluvia | time (nullable) | Fin de la lluvia |
| observaciones | text (nullable) | Notas del dia |
| creado_por | FK -> users (nullable) | Usuario que creo la planilla |
| aprobado_por | FK -> users (nullable) | Usuario que aprobo |
| aprobado_at | timestamp (nullable) | Fecha/hora de aprobacion |
| timestamps | | created_at, updated_at |

**Restriccion unica**: `(tenant_id, fecha)` - Solo puede existir UNA planilla por finca por dia.

**Indices**: `(tenant_id, fecha)` y `(tenant_id, estado)` para consultas frecuentes.

#### Modificaciones a tablas existentes:
- `jornales`: Se agrego columna `operacion_id` (FK nullable -> operaciones, nullOnDelete)
- `registro_cosecha`: Se agrego columna `operacion_id` (FK nullable -> operaciones, nullOnDelete)

### Archivo: `app/Models/Operacion.php` (NUEVO)

```php
class Operacion extends Model
{
    use HasFactory, BelongsToTenant;

    // Relaciones
    public function jornales(): HasMany     // Jornales de esta planilla
    public function cosechas(): HasMany     // Cosechas de esta planilla
    public function creadoPor(): BelongsTo  // Usuario creador
    public function aprobadoPor(): BelongsTo // Usuario aprobador

    // Scopes
    public function scopeBorradores($query)          // Filtrar borradores
    public function scopeAprobadas($query)            // Filtrar aprobadas
    public function scopeEnRango($query, $inicio, $fin) // Filtrar por rango de fechas

    // Helpers
    public function isAprobada(): bool                // Verificar estado
    public function aprobar(int $userId): void        // Cambiar a aprobada
}
```

### Archivos modificados:

**`app/Models/Jornal.php`**:
- Se agrego `operacion_id` a `$fillable`
- Se agrego relacion `operacion(): BelongsTo`

**`app/Models/RegistroCosecha.php`**:
- Se agrego `operacion_id` a `$fillable`
- Se agrego relacion `operacion(): BelongsTo`

**`app/Models/Tenant.php`**:
- Se agrego relacion `operaciones(): HasMany`

---

## 6. Reestructuracion de Modulos en Tenant Config

### Problema
La tabla `tenant_config` tenia campos de modulos antiguos (`usa_jornales`, `usa_produccion`, `modulo_vacaciones`, `modulo_liquidacion`, `modulo_insumos`) que no correspondian con la nueva estructura de modulos del sistema.

### Solucion

### Archivo: `database/migrations/2026_03_19_000002_update_tenant_config_modules.php` (NUEVO)

#### Columnas eliminadas:
- `usa_jornales`
- `usa_produccion`
- `metodo_cosecha_default`
- `modulo_vacaciones`
- `modulo_liquidacion`
- `modulo_insumos`

#### Columnas nuevas (todas boolean, default true):
| Columna | Modulo que controla |
|---------|-------------------|
| `modulo_dashboard` | Panel principal |
| `modulo_plantacion` | Lotes, sublotes, lineas, palmas |
| `modulo_colaboradores` | Empleados y contratos |
| `modulo_nomina` | Calculo y cierre de nomina |
| `modulo_operaciones` | Planillas diarias, jornales, cosecha |
| `modulo_viajes` | Registro de viajes |
| `modulo_usuarios` | Gestion de usuarios del tenant |
| `modulo_configuracion` | Configuracion del tenant |

### Archivo: `app/Models/TenantConfig.php` (REESCRITO)

Se actualizo el modelo completo:
- Nuevos campos en `$fillable`
- Casts de boolean para todos los campos `modulo_*`
- Casts de `decimal:2` para campos financieros
- Cast de `array` para `configuracion_extra`

### Archivo: `app/Models/Tenant.php` - metodo `modulosActivos()` (MODIFICADO)

```php
public function modulosActivos(): array
{
    $config = $this->config;
    if (!$config) return [];
    $modulos = [];
    // Mapeo: campo de BD -> nombre del modulo
    $mapa = [
        'modulo_dashboard'     => 'dashboard',
        'modulo_plantacion'    => 'plantacion',
        'modulo_colaboradores' => 'colaboradores',
        'modulo_nomina'        => 'nomina',
        'modulo_operaciones'   => 'operaciones',
        'modulo_viajes'        => 'viajes',
        'modulo_usuarios'      => 'usuarios',
        'modulo_configuracion' => 'configuracion',
    ];
    foreach ($mapa as $campo => $nombre) {
        if ($config->{$campo}) $modulos[] = $nombre;
    }
    return $modulos;
}
```

### Archivos relacionados actualizados:
- **`database/seeders/DatabaseSeeder.php`**: Creacion de TenantConfig con nuevos campos
- **`app/Http/Requests/Admin/StoreTenantRequest.php`**: Metodo `configDefaults()` actualizado

---

## 7. Nuevo Esquema de Roles y Permisos

### Archivo: `database/seeders/RolesAndPermissionsSeeder.php` (REESCRITO)

#### Permisos del sistema (38 total):

```
MODULO          | PERMISOS
================|==========================================
Dashboard       | dashboard.ver
Plantacion      | lotes.ver, lotes.crear, lotes.editar, lotes.eliminar
                | sublotes.ver, sublotes.crear, sublotes.editar, sublotes.eliminar
                | lineas.ver, lineas.crear, lineas.editar, lineas.eliminar
                | palmas.ver, palmas.crear, palmas.editar, palmas.eliminar
Colaboradores   | colaboradores.ver, colaboradores.crear, colaboradores.editar, colaboradores.eliminar
                | contratos.ver, contratos.crear, contratos.editar, contratos.eliminar
Operaciones     | operaciones.ver, operaciones.crear, operaciones.editar, operaciones.eliminar
                | cosecha.ver, cosecha.crear, cosecha.editar, cosecha.eliminar
                | jornales.ver, jornales.crear, jornales.editar, jornales.eliminar
                | auxiliares.ver, auxiliares.crear, auxiliares.editar, auxiliares.eliminar
Viajes          | viajes.ver, viajes.crear, viajes.editar, viajes.eliminar
Nomina          | nomina.ver, nomina.crear, nomina.editar, nomina.calcular, nomina.cerrar
Usuarios        | usuarios.ver, usuarios.crear, usuarios.editar, usuarios.eliminar
                | usuarios.ver_permisos, usuarios.editar_permisos, usuarios.desactivar
Configuracion   | configuracion.editar
```

#### Mapa de dependencias jerarquicas (`DEPENDENCIAS`):

```php
public const DEPENDENCIAS = [
    'lotes'         => ['sublotes', 'lineas', 'palmas'],
    'sublotes'      => ['lineas', 'palmas'],
    'lineas'        => ['palmas'],
    'colaboradores' => ['contratos'],
];
```

**Ejemplo**: Si asignas `lotes.ver` a un usuario, automaticamente recibe `sublotes.ver`, `lineas.ver` y `palmas.ver` (no tiene sentido ver lotes sin poder ver sus subdivisiones).

#### Roles definidos:

| Rol | Permisos |
|-----|----------|
| **ADMIN** | TODOS los permisos del sistema |
| **LIDER DE CAMPO** | dashboard.ver + operaciones completo + cosecha completo + jornales completo + auxiliares completo + viajes completo + colaboradores.ver |
| **PROPIETARIO** | Solo permisos `.ver` de todos los modulos (lectura total) |

---

## 8. Middleware de Proteccion por Permisos

### Problema
Las rutas de negocio estaban protegidas por `check.modulo` (basado en configuracion del tenant) en lugar de por permisos del usuario.

### Solucion

### Archivo: `app/Http/Middleware/CheckPermission.php` (NUEVO)

```php
public function handle(Request $request, Closure $next, string ...$permisos): Response
{
    $user = $request->user();

    // Sin autenticacion
    if (!$user) {
        return response()->json(['message' => 'No autenticado.'], 401);
    }

    // Super admin bypasea todas las validaciones
    if ($user->is_super_admin) {
        return $next($request);
    }

    // Verifica si tiene AL MENOS UNO de los permisos (logica OR)
    foreach ($permisos as $permiso) {
        if ($user->can($permiso)) {
            return $next($request);
        }
    }

    // Ninguno de los permisos requeridos
    return response()->json([
        'message' => 'No tienes permiso para realizar esta accion.',
        'permisos_requeridos' => $permisos,
    ], 403);
}
```

**Comportamiento clave**:
- `$user->can()` de Spatie respeta el contexto de equipo (tenant_id), por lo que valida permisos del rol + directos del tenant actual
- Acepta multiples permisos con logica **OR** (basta con tener uno)
- Super admins siempre pasan

### Archivo: `bootstrap/app.php` (MODIFICADO)

Se registro el alias del middleware:
```php
'check.permission' => \App\Http\Middleware\CheckPermission::class,
```

---

## 9. Proteccion de Rutas por Permisos

### Archivo: `routes/api.php` (MODIFICADO)

#### Cambio principal: De `check.modulo` a `check.permission`

```php
// ANTES (proteccion por modulo de configuracion):
Route::middleware(['check.modulo:campo'])->group(function () {
    Route::apiResource('lotes', LoteController::class);
});

// DESPUES (proteccion por permiso del usuario):
Route::middleware(['check.permission:lotes.ver'])->group(function () {
    Route::get('lotes', [LoteController::class, 'index']);
    Route::get('lotes/{lote}', [LoteController::class, 'show']);
});
Route::middleware(['check.permission:lotes.crear'])->group(function () {
    Route::post('lotes', [LoteController::class, 'store']);
});
// ... etc
```

#### Rutas de gestion de permisos:
```php
Route::middleware(['check.permission:usuarios.ver_permisos'])->group(function () {
    Route::get('usuarios/{user}/permisos', [UserPermissionController::class, 'show']);
});
Route::middleware(['check.permission:usuarios.editar_permisos'])->group(function () {
    Route::put('usuarios/{user}/permisos', [UserPermissionController::class, 'update']);
    Route::delete('usuarios/{user}/permisos', [UserPermissionController::class, 'destroy']);
});
```

#### Nota sobre `check.modulo`
El middleware `check.modulo` NO fue eliminado. Sigue disponible para casos donde se necesite validar si un modulo esta habilitado en la configuracion del tenant (ej: `sync_habilitado`). Pero las rutas de negocio ahora usan `check.permission`.

---

## 10. Correcciones y Bugs Resueltos

### Bug 1: Emails de recuperacion no se enviaban
- **Sintoma**: El endpoint `forgot-password` respondia 200 (exito) pero el email nunca llegaba
- **Causa**: `ResetPasswordNotification` implementaba `ShouldQueue` pero no habia un queue worker ejecutandose
- **Solucion**: Se removio `ShouldQueue` y `Queueable` de la notificacion para envio sincrono
- **Archivo**: `app/Notifications/ResetPasswordNotification.php`

### Bug 2: Error de firma en AuditoriaService
- **Sintoma**: Error al registrar auditoria en UserPermissionController
- **Causa**: El metodo `AuditoriaService::registrar()` requiere `Request` como primer parametro
- **Solucion**: Se agrego `$request` como primer argumento en ambas llamadas a `registrar()`
- **Archivo**: `app/Http/Controllers/Api/UserPermissionController.php`

### Bug 3: Relacion faltante Tenant -> Operaciones
- **Sintoma**: No se podia acceder a `$tenant->operaciones`
- **Causa**: Se creo el modelo `Operacion` con `BelongsToTenant` pero no se agrego la relacion inversa en `Tenant`
- **Solucion**: Se agrego `operaciones(): HasMany` en el modelo Tenant
- **Archivo**: `app/Models/Tenant.php`

---

## 11. Archivos Creados y Modificados

### Archivos NUEVOS (creados desde cero):

| Archivo | Proposito |
|---------|-----------|
| `app/Http/Controllers/Api/TenantAuthController.php` | Login y seleccion de tenant para usuarios de finca |
| `app/Http/Controllers/Api/PasswordResetController.php` | Forgot password y reset password |
| `app/Http/Controllers/Api/UserPermissionController.php` | CRUD de permisos directos por usuario/tenant |
| `app/Http/Middleware/CheckPermission.php` | Middleware de validacion de permisos Spatie |
| `app/Models/Operacion.php` | Modelo de planilla diaria de operaciones |
| `database/migrations/2026_03_19_000001_create_operaciones_and_update_jornales_cosecha.php` | Tabla operaciones + FK en jornales/cosecha |
| `database/migrations/2026_03_19_000002_update_tenant_config_modules.php` | Nuevos modulos en tenant_config |
| `docs/API_AUTH_FINCA.md` | Documentacion del flujo de autenticacion para frontend |

### Archivos MODIFICADOS:

| Archivo | Cambios realizados |
|---------|-------------------|
| `app/Http/Controllers/Api/AuthController.php` | Agregado `getPermisosUsuario()`, actualizado `selectTenant()` |
| `app/Notifications/ResetPasswordNotification.php` | Removido `ShouldQueue` para envio sincrono |
| `app/Models/Jornal.php` | Agregado `operacion_id` a fillable + relacion `operacion()` |
| `app/Models/RegistroCosecha.php` | Agregado `operacion_id` a fillable + relacion `operacion()` |
| `app/Models/Tenant.php` | Agregada relacion `operaciones()`, actualizado `modulosActivos()` y `configNomina()` |
| `app/Models/TenantConfig.php` | Reescrito con nuevos campos de modulos |
| `database/seeders/RolesAndPermissionsSeeder.php` | Reescrito con 38 permisos, 3 roles, dependencias |
| `database/seeders/DatabaseSeeder.php` | Actualizado con nuevos campos de TenantConfig |
| `app/Http/Requests/Admin/StoreTenantRequest.php` | Actualizado `configDefaults()` |
| `routes/api.php` | Rutas protegidas por `check.permission` en vez de `check.modulo` |
| `bootstrap/app.php` | Registrado alias `check.permission` |

---

## 12. Pasos Pendientes

### Para aplicar todos los cambios:
```bash
php artisan migrate:fresh --seed
```
> **IMPORTANTE**: Esto eliminara TODOS los datos existentes. Usar solo en desarrollo.

### Funcionalidades por implementar:
- [ ] Modelo y migracion para `lineas` (nuevo nivel jerarquico entre sublotes y palmas)
- [ ] Modelo y migracion para `auxiliares` (mencionado en permisos pero sin tabla aun)
- [ ] Modelo y migracion para `contratos` (si es diferente a `modalidad_contrato` existente)
- [ ] Controladores CRUD para operaciones, cosecha, jornales
- [ ] Actualizar `API_AUTH_FINCA.md` con los cambios de permisos y modulos
- [ ] Implementar controladores de las rutas comentadas como placeholder en `api.php`
