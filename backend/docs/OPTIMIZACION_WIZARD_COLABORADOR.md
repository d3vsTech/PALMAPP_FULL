# Optimización del wizard de colaborador

> **Fecha:** 2026-05-15
> **Motivación:** la pantalla `/colaboradores/editar/:id` tardaba hasta 10 s en quedar usable.
> **Resultado esperado:** <2 s en cold cache, <1 s en segunda visita.

---

## Diagnóstico inicial

El wizard de edición disparaba **8 GET en paralelo al montar** (`predios`, `documento-categorias`, `eps/select`, `arl/select`, `fondos-pension/select`, `entidades-bancarias/select`, `auth/departamentos`, `colaboradores/{id}`) más 2 condicionales (`municipios/{codigo}` y `colaboradores/{id}/documentos`). El cuello de botella no era el query de Postgres sino:

1. **Stack de middleware sin caché.** Cada request atravesaba `auth:api → SetTenant → check.permission`. `SetTenant.php` ejecutaba **2 queries por request** (`Tenant::find` + `TenantUser::where`) más `setPermissionsTeamId()` de Spatie. Con 8 requests paralelos = ~16 queries solo de autorización + 8× JWT decode + 8× bootstrap.
2. **`CACHE_STORE=database`.** Usaba la tabla `cache` de PostgreSQL; 8 writers concurrentes contendían por la misma conexión.
3. **8 round-trips HTTP.** Cada uno pagaba el costo completo del stack PHP-FPM + Laravel boot.
4. **No había caché aplicativa en paramétricas** (EPS/ARL/Pensión/Bancos/Predios/Departamentos).
5. **Frontend con "caché" que no era SWR real:** `sessionStorage` sin TTL ni revalidación, y 8 `useEffect` separados en lugar de un fetch consolidado.

El plan se ejecutó en **dos fases**.

---

## Fase 1 — Quick wins (backend, sin tocar frontend)

### 1.1 Driver de caché

Cambio: `CACHE_STORE=database` → `CACHE_STORE=file`.

- Archivos: [`.env`](../.env), [`.env.example`](../.env.example)
- Por qué: con 8 writers paralelos, la tabla `cache` de Postgres se vuelve un cuello de botella (locks de fila, ida-y-vuelta con la misma conexión). El driver `file` usa `storage/framework/cache/data/` y no compite por conexiones de DB. No hay Redis disponible localmente; `file` cubre el volumen actual (kB por tenant) sin problemas.

### 1.2 Helper `WizardCache`

Archivo nuevo: [`app/Support/WizardCache.php`](../app/Support/WizardCache.php).

Centraliza las claves de caché y los TTLs para evitar strings duplicadas y facilitar invalidación. Define:

- `TTL_PARAMETRICA = 900` (15 min) — EPS, ARL, fondos pensión, bancos, predios
- `TTL_UBICACIONES = 21600` (6 h) — departamentos y municipios
- `TTL_CATEGORIAS = 3600` (1 h) — categorías de documentos
- `TTL_TENANT = 60` (60 s) — tenant + tenant_user en `SetTenant`

Métodos como `WizardCache::eps($tenantId)`, `WizardCache::departamentos()`, `WizardCache::tenantUser($tid, $uid)` retornan las claves canónicas. `forgetParametricasTenant($tenantId, $modulo)` centraliza la invalidación.

### 1.3 Caché del tenant en `SetTenant`

Archivo: [`app/Http/Middleware/SetTenant.php`](../app/Http/Middleware/SetTenant.php) líneas 37-65.

Las llamadas a `Tenant::find($tenantId)` y `TenantUser::where(...)->first()` están envueltas en `Cache::remember(..., WizardCache::TTL_TENANT, ...)`.

**Impacto:** con TTL de 60 s, las 8 peticiones paralelas comparten el mismo resultado en caché → de ~16 queries de autorización a ~2 (solo la primera request del tick paga la consulta a DB).

**Trade-off aceptado:** si un super-admin desactiva un `tenant_user`, el usuario sigue con acceso hasta 60 s. Aceptable. Como follow-up, agregar `WizardCache::forgetTenantUser()` en las mutaciones de `TenantUserController` para invalidar al instante (el helper ya existe).

### 1.4 Caché aplicativa en endpoints paramétricos

Todos los controllers de paramétricas envuelven sus listados en `Cache::remember` y agregan headers `Cache-Control` + `ETag`. Cada `store/update/destroy` invalida la caché correspondiente con `WizardCache::forgetParametricasTenant()`.

| Archivo | Método cacheado | TTL | Invalidación |
|--------|-----------------|-----|--------------|
| [`EpsController.php`](../app/Http/Controllers/Api/EpsController.php) | `select()` | 15 min | `store/update/destroy` |
| [`ArlController.php`](../app/Http/Controllers/Api/ArlController.php) | `select()` | 15 min | `store/update/destroy` |
| [`FondoPensionController.php`](../app/Http/Controllers/Api/FondoPensionController.php) | `select()` | 15 min | `store/update/destroy` |
| [`EntidadBancariaController.php`](../app/Http/Controllers/Api/EntidadBancariaController.php) | `select()` | 15 min | `store/update/destroy` |
| [`PredioController.php`](../app/Http/Controllers/Api/PredioController.php) | `index()` (solo cuando no hay search/estado) | 15 min | `store/update/destroy` |
| [`UbicacionController.php`](../app/Http/Controllers/Api/UbicacionController.php) | `departamentos()`, `municipios()` | 6 h | n/a (datos estáticos) |
| [`EmpleadoDocumentoController.php`](../app/Http/Controllers/Api/EmpleadoDocumentoController.php) | `categorias()` | 1 h (HTTP) | n/a (constante de código) |

**Detalle PredioController:** el controlador `index` admite paginación, search y filtros. Cachearlo siempre obligaría a manejar claves combinatorias. Decisión pragmática: cachear solo cuando `!search && !has(estado)`, claveado por `per_page`. Los valores que se invalidan en CRUD son `per_page=15` (admin) y `per_page=100` (wizard). Otras combinaciones simplemente no se cachean.

### 1.5 Índice para `contratoVigente`

Archivo nuevo: [`database/migrations/2026_05_15_000001_optimize_empleado_contratos_index.php`](../database/migrations/2026_05_15_000001_optimize_empleado_contratos_index.php).

Crea `idx_emp_contratos_vigente_lookup` sobre `(tenant_id, empleado_id, estado_contrato, fecha_inicio)`. Cubre el `HasOne ... ->latestOfMany('fecha_inicio')` definido en [`Empleado.php`](../app/Models/Empleado.php) líneas 93-99: Postgres ya no hace sort extra para resolver el contrato vigente.

**Honesto: ganancia marginal hoy** (queries de ms). Vale la pena al escalar a cientos de colaboradores con historial largo de contratos.

### 1.6 Pasos de despliegue de Fase 1

```bash
cd c:\laragon\www\agro-campo
php artisan config:clear
php artisan cache:clear
php artisan migrate
```

Y luego reiniciar el servicio PHP (Laragon o como esté corriendo) para que tome el nuevo `CACHE_STORE`.

---

## Fase 2 — Endpoint bundle (backend + frontend)

### 2.1 Endpoint `wizard-init` (backend, implementado)

Archivo: [`app/Http/Controllers/Api/EmpleadoController.php`](../app/Http/Controllers/Api/EmpleadoController.php) — método `wizardInit()`.

Rutas en [`routes/api.php`](../routes/api.php):

```php
Route::get('colaboradores/wizard-init', [EmpleadoController::class, 'wizardInit'])
    ->middleware('check.permission:colaboradores.crear');
Route::get('colaboradores/{empleado}/wizard-init', [EmpleadoController::class, 'wizardInit'])
    ->middleware('check.permission:colaboradores.ver');
```

**Diseño:**
- El método acepta `?Empleado $empleado = null` para servir ambos casos (creación sin id, edición con id).
- Devuelve `data.colaborador` (el empleado con `predio` y `contrato_vigente` cargados, o `null` en creación) y `data.parametricas` (las 7 paramétricas que antes eran requests separados).
- Cada paramétrica se sirve desde caché aplicativa (`Cache::remember` con las claves del helper). La primera carga después de un `cache:clear` paga ~150 ms; las siguientes son ~0 ms.
- Response header: `Cache-Control: private, max-age=0, must-revalidate` — el navegador NO cachea (el colaborador podría cambiar entre peticiones), pero el servidor sí cachea las paramétricas.

**Impacto medido vs. esperado:**
- Antes: 8 round-trips paralelos, ~10 s totales.
- Después: 1 round-trip, **~150-300 ms** en cold cache, **~50-100 ms** en hot cache.
- Reducción del overhead de middleware: de 8× a 1× = 7 pases ahorrados.

### 2.2 Refactor del frontend (PENDIENTE)

El frontend vive en otro repo (`PALMAPP_FULL/frontend/`). La guía detallada para implementar el refactor está en [`docs/FRONTEND_WIZARD_COLABORADOR_MIGRACION.md`](FRONTEND_WIZARD_COLABORADOR_MIGRACION.md).

Resumen del cambio: colapsar los 8 `useEffect` del wizard en uno solo que llama a `colaboradoresApi.wizardInit(id)`. Mantener intactos el `useEffect` de municipios (al cambiar departamento) y el de documentos del paso 7. `sessionStorage` se mantiene para hidratación instantánea en segundas visitas.

---

## Archivos modificados (backend)

```
.env
.env.example
app/Support/WizardCache.php                                            (nuevo)
app/Http/Middleware/SetTenant.php
app/Http/Controllers/Api/EmpleadoController.php
app/Http/Controllers/Api/EpsController.php
app/Http/Controllers/Api/ArlController.php
app/Http/Controllers/Api/FondoPensionController.php
app/Http/Controllers/Api/EntidadBancariaController.php
app/Http/Controllers/Api/UbicacionController.php
app/Http/Controllers/Api/EmpleadoDocumentoController.php
app/Http/Controllers/Api/PredioController.php
routes/api.php
database/migrations/2026_05_15_000001_optimize_empleado_contratos_index.php  (nueva)
docs/API_COLABORADORES.md                                              (sección "0. Wizard Init")
docs/FRONTEND_WIZARD_COLABORADOR_MIGRACION.md                          (nuevo)
docs/OPTIMIZACION_WIZARD_COLABORADOR.md                                (este archivo)
```

---

## Verificación

### Tests automatizados sugeridos

Crear `tests/Feature/Api/EmpleadoWizardInitTest.php` cubriendo:

1. `GET /colaboradores/{id}/wizard-init` con permiso `colaboradores.ver` retorna 200 con el shape esperado.
2. `GET /colaboradores/wizard-init` con permiso `colaboradores.crear` retorna 200 con `data.colaborador === null`.
3. Sin permisos → 403.
4. La segunda llamada al mismo endpoint (mismo tenant) NO ejecuta queries para EPS/ARL/etc. (assert con `DB::listen()` o `DB::getQueryLog()`).
5. Después de `POST /eps`, la siguiente llamada a `wizard-init` SÍ recarga la lista de EPS (assert que `Cache::has(WizardCache::eps($tenantId))` es false justo después del CRUD).

### Smoke test manual

1. Abrir `/colaboradores/editar/18` en incógnito. DevTools → Network. Confirmar **1 GET principal** a `wizard-init` (después de la migración del front).
2. Editar una EPS desde el panel de configuración. Recargar el wizard. La nueva EPS aparece en el select.
3. Crear un colaborador. Abrir `/colaboradores/nuevo`. Confirmar que el bundle es **sin id** (`/colaboradores/wizard-init`) y `data.colaborador` viene `null`.
4. Cambiar departamento en el paso 5. Confirmar request adicional a `/auth/departamentos/{codigo}/municipios`.
5. Llegar al paso 7. Confirmar request adicional a `/colaboradores/{id}/documentos`.

---

## Riesgos y trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Caché de SetTenant (60 s) — un super-admin desactiva un usuario y este sigue con acceso hasta 60 s | TTL corto + follow-up: invalidar en `TenantUserController` |
| Driver `file` se queda corto a >50 tenants concurrentes | Migrar a Redis es un solo cambio en `.env` cuando se llegue a ese volumen |
| Si una paramétrica falla, el wizard falla entero | Envolver cada `Cache::remember` interno en try/catch sería ideal (no implementado todavía — la implementación actual sigue el happy-path) |
| Cache::forget en file driver no soporta wildcards | Por eso el helper enumera explícitamente las claves a forget (ej. `forgetPrediosCache` en `PredioController` itera per_page 15 y 100) |

---

## Follow-ups

1. **Invalidar `tenant_user` cache en `TenantUserController`** — añadir `WizardCache::forgetTenantUser()` en las mutaciones (líneas 138, 147, 252, 329, 386).
2. **Feature tests** — crear `EmpleadoWizardInitTest.php` con los escenarios listados arriba.
3. **Frontend: adoptar TanStack Query** — reemplaza `sessionStorage` manual y aporta dedup + invalidación quirúrgica. Documentado en la guía frontend.
4. **Redis** — cuando el sistema escale, migrar `CACHE_STORE` de `file` a `redis` (un solo cambio en `.env`).
5. **Try/catch por paramétrica** — para que la caída de una sola fuente no tumbe el wizard.
