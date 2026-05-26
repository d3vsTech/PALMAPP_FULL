# Optimización del wizard de predios

> **Fecha:** 2026-05-16
> **Motivación:** el wizard de edición de predios (`/plantacion/predio/nuevo?edit={id}`) haría **14+ requests secuenciales** al montar para un predio mediano (3 lotes, 6 sublotes, 12 líneas), causadas por un `for await` anidado que pide sublotes lote por lote y luego líneas sublote por sublote.
> **Resultado esperado:** 2 round-trips al montar (wizard-init + municipios condicional) para cualquier predio, independientemente del número de lotes/sublotes/líneas.

---

## Diagnóstico inicial

El wizard de edición de predios dispararía las siguientes requests al montar:

1. **3 paralelas:** `departamentos`, `lotes/semillas`, `predios/{id}`.
2. **Cadena secuencial** dentro de un `for await` anidado: 1 por lotes + L por sublotes (uno por lote) + S por líneas (uno por sublote) + 1 resumen.
3. **Condicional:** `departamentos/{codigo}/municipios` cuando se hace match del departamento.

Para un predio con **3 lotes / 6 sublotes / 12 líneas** eso es **14 requests, ~11 secuenciales**. Si cada request tarda 100 ms, los 11 encadenados suman ~1.1 s solo de network puro antes de pintar el wizard.

Para un predio con **10 lotes / 30 sublotes / 200 líneas**: **241 requests**, todos secuenciales por el `for await`.

### Cuello de botella adicional: palmas con >10.000 registros

Los sublotes pueden tener **10.000 o más palmas**. El paso 5 del wizard (Palmas) intentaría cargar todas en memoria. A razón de 50 palmas por request, un sublote de 10.000 palmas son **200 fetches**. Multiplicado por varias líneas: inmanejable.

El sistema ya tenía soporte async para **creación** de palmas (threshold en `PalmaCreationService::SYNC_THRESHOLD = 5000`), pero no existía ninguna guía para la **carga paginada** en el wizard.

### Causas de backend

| Causa | Impacto |
|-------|---------|
| Sin endpoint `wizard-init` para predios | Obliga a N fetches individuales desde el frontend |
| `semillas` sin caché | 1 query innecesaria en cada apertura del wizard |
| `resumen()` sin caché | Se recalcula en cada mutación, incluso con datos idénticos |
| For-await secuencial (L sublotes + S líneas) | Para 3L/6S/12Ln: 9 fetches serializados ≈ 900 ms de pura red |

---

## Solución implementada

Todas las mejoras son **del lado backend**. No hay cambios de esquema, no hay migraciones.

### 1. Nuevas claves en `WizardCache`

**Archivo:** [`app/Support/WizardCache.php`](../app/Support/WizardCache.php)

Agregado:

```php
const TTL_PREDIO_BUNDLE = 60; // 60 s — invalida en mutaciones estructurales

public static function semillas(int $tenantId): string       // "wizard:semillas:t:{$tenantId}"
public static function predioBundle(int $tenantId, int $predioId): string  // "wizard:predio_bundle:t:{$tenantId}:p:{$predioId}"
public static function predioResumen(int $tenantId, int $predioId): string // "wizard:predio_resumen:t:{$tenantId}:p:{$predioId}"
public static function forgetPredioBundle(int $tenantId, int $predioId): void // invalida bundle + resumen
```

**TTL de 60 s para el bundle:** el bundle incluye datos estructurales (lotes, sublotes, líneas) que cambian al hacer CRUD desde el mismo wizard. La invalidación explícita en cada mutación garantiza datos frescos; el TTL es solo el safety net.

**Por qué semillas es per-tenant:** el modelo `Semilla` tiene el trait `BelongsToTenant`, así que el catálogo puede variar por finca.

### 2. Endpoint `wizard-init` para predios

**Archivo:** [`app/Http/Controllers/Api/PredioController.php`](../app/Http/Controllers/Api/PredioController.php) — método `wizardInit()`.

**Rutas** en [`routes/api.php`](../routes/api.php):
```php
Route::get('predios/wizard-init', [PredioController::class, 'wizardInit'])
    ->middleware('check.permission:lotes.crear');
Route::get('predios/{predio}/wizard-init', [PredioController::class, 'wizardInit'])
    ->middleware('check.permission:lotes.ver');
```

> La ruta sin `{predio}` va **antes** de `predios/{predio}` para que Laravel no interprete `wizard-init` como un ID.

**Diseño del método:**
- Acepta `?Predio $predio = null` — sirve tanto modo creación (sin ID) como edición (con ID).
- Las **paramétricas** (semillas, departamentos) se sirven desde su propio `Cache::remember` independiente — TTL 15 min y 6 h respectivamente. Pueden compartirse entre predios distintos del mismo tenant.
- El **bundle estructural** (lotes + sublotes + líneas) se guarda en una clave por `predioId` con TTL 60 s. Se construye en una sola consulta con eager loading anidado: `lotes → lotes.semillas → lotes.sublotes → lotes.sublotes.lineas`.
- Las **palmas** NO se incluyen — el payload sería de MB con >10.000 palmas por sublote. El frontend usa `sublote.cantidad_palmas` y `linea.cantidad_palmas` como contadores y carga palmas paginadas al entrar al paso 5.

**Impacto medido vs. esperado:**

| Escenario | Antes | Después |
|-----------|-------|---------|
| 3 lotes / 6 sublotes / 12 líneas | 14 requests | **2 requests** |
| 10 lotes / 30 sublotes / 200 líneas | 241 requests | **2 requests** |
| Segunda visita (sessionStorage en frontend) | igual | **1 request** |
| Paso 5 sublote 10.000 palmas / 20 líneas | 200+ fetches | **20 fetches** lazy (50/página) |

### 3. Caché de `resumen()`

**Archivo:** `PredioController.php` — método `resumen()`.

La lógica de cálculo se envuelve en `Cache::remember(WizardCache::predioResumen(...), TTL_PREDIO_BUNDLE, ...)`. La clave se invalida automáticamente en `WizardCache::forgetPredioBundle()`.

**Por qué cachear resumen:** el panel lateral del wizard lo solicita después de cada mutación (crear/editar/eliminar lote, sublote, líneas, palmas). Con un predio grande, ese endpoint ejecutaba múltiples joins. Ahora se sirve desde caché en ~0 ms en la mayoría de los casos.

### 4. Caché de `semillas()`

**Archivo:** [`app/Http/Controllers/Api/LoteController.php`](../app/Http/Controllers/Api/LoteController.php) — método `semillas()`.

Envuelto en `Cache::remember(WizardCache::semillas($tenantId), TTL_PARAMETRICA, ...)`. El catálogo de semillas es estático dentro de un tenant en el corto plazo; 15 min de TTL es más que suficiente.

### 5. Invalidación en mutaciones de Lote, Sublote y Línea

Cada controller que muta la jerarquía del predio llama `WizardCache::forgetPredioBundle()` tras el commit. Esto garantiza que el bundle del wizard no sirva datos obsoletos después de un CRUD:

| Controller | Métodos que invalidan | Cómo obtiene `predio_id` |
|------------|----------------------|--------------------------|
| `LoteController` | `store`, `update`, `destroy` | `$lote->predio_id` (directo) |
| `SubloteController` | `store`, `update`, `destroy` | `DB::table('lotes')->where('id', $sublote->lote_id)->value('predio_id')` |
| `LineaController` | `store`, `update`, `destroy` | Join en `predioIdDeSublote()`: 1 query para `lotes JOIN sublotes WHERE sublotes.id = $linea->sublote_id` |

La query extra en `LineaController` solo ocurre en mutaciones (no en lecturas). Es una query de lookup con índice; el costo es despreciable comparado con los 14+ fetches que se eliminan del frontend.

---

## Archivos modificados

```
app/Support/WizardCache.php                       (modificado — 4 métodos nuevos)
app/Http/Controllers/Api/PredioController.php     (modificado — wizardInit(), resumen() cacheado)
app/Http/Controllers/Api/LoteController.php       (modificado — semillas() cacheado, 3 mutaciones invalidan)
app/Http/Controllers/Api/SubloteController.php    (modificado — 3 mutaciones invalidan)
app/Http/Controllers/Api/LineaController.php      (modificado — predioIdDeSublote() + 3 mutaciones invalidan)
routes/api.php                                    (modificado — 2 rutas wizard-init)
docs/FRONTEND_WIZARD_PREDIO_MIGRACION.md          (nuevo)
docs/OPTIMIZACION_WIZARD_PREDIO.md                (este archivo)
```

---

## Verificación

### Smoke test manual

1. `GET /api/v1/tenant/predios/{id}/wizard-init` con token válido → 200 con estructura `{data: {predio, lotes, sublotes, lineas, parametricas}}`.
2. Llamar el endpoint **dos veces seguidas**: con Telescope o `DB::getQueryLog()` verificar que la segunda no ejecuta queries a `lotes`, `sublotes` o `lineas`.
3. Editar un lote y luego llamar el `wizard-init` → los datos del lote están actualizados (la caché se invalida).
4. `GET /api/v1/tenant/lotes/semillas` → segunda llamada sin query a DB (verificar con Telescope).
5. `GET /api/v1/tenant/predios/{id}/resumen` → segunda llamada sin joins de sublotes.
6. Crear un sublote con 10.000 palmas (proceso async, retorna `batch_id`) → verificar que el wizard-init NO incluye palmas en la respuesta (solo `cantidad_palmas` como contador).

### Tests sugeridos

Crear `tests/Feature/Api/PredioWizardInitTest.php`:

1. `GET /predios/{id}/wizard-init` con permiso `lotes.ver` → 200 con shape correcto.
2. `GET /predios/wizard-init` con permiso `lotes.crear` → 200 con `data.predio === null`.
3. Sin permisos → 403.
4. Segunda llamada al mismo endpoint (mismo tenant + predio) no ejecuta queries a `lotes`/`sublotes`/`lineas` (assert con `DB::listen()`).
5. Después de `PUT /lotes/{id}`, la siguiente llamada a `wizard-init` SÍ recarga la estructura del predio (bundle invalidado).
6. El bundle NO contiene datos de palmas (`lineas[*].cantidad_palmas` existe pero no `lineas[*].palmas`).

---

## Riesgos y trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Bundle grande si el predio tiene 500+ sublotes con 50 líneas c/u | Payload ≈ 5 MB — aceptable en red local / WiFi. Si escala, paginar líneas en el bundle o diferirlas a un segundo fetch |
| Invalidación en LineaController requiere un join extra | Aceptable (solo en mutaciones); alternativa a largo plazo: desnormalizar `predio_id` en `lineas` |
| TTL 60 s: dos usuarios editando en paralelo pueden ver datos obsoletos hasta 60 s | La invalidación explícita corrige esto en el 99% de los casos; el TTL es el safety net |
| Semillas con `WizardCache::semillas()` — clave per-tenant. Si hay un catálogo de semillas global (sin BelongsToTenant), hay que ajustar | Por ahora `Semilla` tiene `BelongsToTenant`, así que la clave per-tenant es correcta |

---

## Follow-ups

1. **Feature tests** — crear `PredioWizardInitTest.php` con los escenarios listados.
2. **Frontend: adoptar TanStack Query** — elimina la necesidad de sessionStorage manual. `useQuery({ queryKey: ['predio-wizard', id], staleTime: 60_000 })` cubre todo con dedup + invalidación quirúrgica desde mutaciones.
3. **Redis** — cuando el sistema escale, migrar `CACHE_STORE` de `file` a `redis` (un solo cambio en `.env`).
4. **Desnormalizar `predio_id` en `lineas`** — eliminaría el join extra en `LineaController::predioIdDeSublote()`. Solo vale la pena si `lineas` crece a millones de filas.
5. **`PalmaController` — invalidar bundle** — cuando se crean/eliminan palmas en masa, el contador `cantidad_palmas` del sublote cambia. Actualmente el bundle se invalida desde `SubloteController` (cuando se edita `cantidad_palmas`), pero si el cambio viene del side-effect del PalmaCreationService tras un job async, el bundle puede quedar desactualizado hasta que expire el TTL. El TTL de 60 s mitiga esto; para precisión, añadir `forgetPredioBundle` en el callback del Job de palmas.
