# Plan: Bundle endpoint para "Precios de Labores" (6 requests → 1)

## Contexto

La pantalla **Configuración → Precios de Labores** dispara 6 requests en paralelo al cargar y tarda ~6 segundos:

| # | Endpoint | Controller | Volumen |
|---|---|---|---|
| 1 | `GET /precios-cosecha?per_page=100` | `PrecioCosechaController@index` ([app/Http/Controllers/Api/PrecioCosechaController.php:18](../app/Http/Controllers/Api/PrecioCosechaController.php#L18)) | Paginado 100 |
| 2 | `GET /precios-abono` | `PrecioAbonoController@index` ([app/Http/Controllers/Api/PrecioAbonoController.php:22](../app/Http/Controllers/Api/PrecioAbonoController.php#L22)) | Todos (~rangos) |
| 3 | `GET /labores?categoria=PALMA&es_sistema=true&per_page=10` | `LaborController@index` ([app/Http/Controllers/Api/LaborController.php:61](../app/Http/Controllers/Api/LaborController.php#L61)) | 5 fijas |
| 4 | `GET /labores?categoria=PALMA&es_sistema=false&per_page=100` | mismo | custom palma |
| 5 | `GET /labores?categoria=FINCA&per_page=100` | mismo | custom finca |
| 6 | `GET /lotes/select` | `LoteController@select` ([app/Http/Controllers/Api/LoteController.php:87](../app/Http/Controllers/Api/LoteController.php#L87)) | todos activos |

**Diagnóstico:**
- Las queries SQL son baratas: hay `with()` correcto en `precios-cosecha` (lote) y `lotes/select` (predio), no hay N+1 (`Labor::requiereFlujoCosecha()` es cálculo en memoria, [app/Models/Labor.php:174](../app/Models/Labor.php#L174)).
- El costo dominante es **6 roundtrips × (handshake + JWT decode + `SetTenant` + Spatie permission + boot Eloquent)**. En un servidor lento esto pesa ~1s por request.
- **Ningún** endpoint usa cache. Sí existe la infraestructura: [app/Support/WizardCache.php](../app/Support/WizardCache.php) con constantes TTL y helpers `forget*`.
- Ya hay un precedente exacto a imitar: `PredioController@wizardInit` ([app/Http/Controllers/Api/PredioController.php:32](../app/Http/Controllers/Api/PredioController.php#L32)) y `EmpleadoController@wizardInit`.

**Solución elegida:** Opción A — endpoint bundle **+** cache TTL 60s con invalidación en mutaciones (mismo patrón que `predioBundle`). Los 6 endpoints individuales se mantienen para mutaciones y CRUD; el bundle solo sirve la carga inicial.

---

## Backend

### 1. Extender `WizardCache` con keys del nuevo bundle

Archivo: [app/Support/WizardCache.php](../app/Support/WizardCache.php)

Añadir:
```php
public const TTL_PRECIOS_LABORES_BUNDLE = 60;

public static function preciosLaboresBundle(int $tenantId): string
{
    return "wizard:precios_labores_bundle:t:{$tenantId}";
}

public static function forgetPreciosLaboresBundle(int $tenantId): void
{
    Cache::forget(static::preciosLaboresBundle($tenantId));
}
```

### 2. Crear el método `bundleInit` en un controlador nuevo

Archivo nuevo: `app/Http/Controllers/Api/ConfiguracionPreciosLaboresController.php`

Razón de un controlador nuevo (en vez de pegarlo en alguno de los 4 existentes): el bundle cruza 4 recursos. Mantenerlo aparte hace explícito su rol de "compositor" y evita acoplar `LaborController` a precios/lotes.

Estructura (resumida — la implementación replica el patrón de `PredioController@wizardInit`):

```php
public function bundleInit(Request $request): JsonResponse
{
    $tenantId = (int) app('current_tenant_id');

    $bundle = Cache::remember(
        WizardCache::preciosLaboresBundle($tenantId),
        WizardCache::TTL_PRECIOS_LABORES_BUNDLE,
        function () use ($request) {
            // 1 query por dataset, sin paginación (volúmenes acotados).
            $laboresPalmaFijas = Labor::query()
                ->where('categoria', 'PALMA')->where('es_sistema', true)->where('estado', true)
                ->orderBy('nombre')
                ->get(['id','nombre','categoria','tipo','tipo_pago','precio_palma','es_sistema']);

            $laboresPalmaCustom = Labor::query()
                ->where('categoria', 'PALMA')->where('es_sistema', false)->where('estado', true)
                ->orderBy('nombre')
                ->get(['id','nombre','categoria','tipo','tipo_pago','precio_palma','es_sistema']);

            $laboresFinca = Labor::query()
                ->where('categoria', 'FINCA')->where('estado', true)
                ->orderBy('nombre')
                ->get(['id','nombre','categoria','tipo','tipo_pago','precio_palma','es_sistema']);

            $preciosCosecha = PrecioCosecha::query()
                ->with('lote:id,nombre')
                ->orderByDesc('anio')
                ->limit($request->per_page_cosecha ?? 100)
                ->get();

            $preciosAbono = PrecioAbono::query()
                ->orderBy('gramos_min')
                ->get();

            $lotes = Lote::query()
                ->where('estado', true)
                ->with('predio:id,nombre')
                ->orderBy('nombre')
                ->get(['id','nombre','predio_id']);

            return compact(
                'laboresPalmaFijas','laboresPalmaCustom','laboresFinca',
                'preciosCosecha','preciosAbono','lotes',
            );
        },
    );

    return response()->json(['data' => [
        'precios_cosecha'      => $bundle['preciosCosecha'],
        'precios_abono'        => $bundle['preciosAbono'],
        'labores_palma_fijas'  => $bundle['laboresPalmaFijas'],
        'labores_palma_custom' => $bundle['laboresPalmaCustom'],
        'labores_finca'        => $bundle['laboresFinca'],
        'lotes'                => $bundle['lotes'],
    ]]);
}
```

Try/catch + `Log::error` igual que los demás controladores.

### 3. Registrar la ruta

Archivo: [routes/api.php](../routes/api.php) — junto a los demás endpoints de configuración (~línea 580–670, bajo el grupo con permiso `configuracion.editar`):

```php
Route::get('configuracion/precios-labores/init',
    [ConfiguracionPreciosLaboresController::class, 'bundleInit']
)->middleware('check.permission:configuracion.editar');
```

### 4. Invalidación de cache en mutaciones

Llamar `WizardCache::forgetPreciosLaboresBundle((int) app('current_tenant_id'))` en:

- [app/Http/Controllers/Api/LaborController.php](../app/Http/Controllers/Api/LaborController.php) — `store` (l.104), `update` (l.136), `destroy` (l.195)
- [app/Http/Controllers/Api/PrecioCosechaController.php](../app/Http/Controllers/Api/PrecioCosechaController.php) — `store` (l.74), `update` (l.114), `destroy` (l.134)
- [app/Http/Controllers/Api/PrecioAbonoController.php](../app/Http/Controllers/Api/PrecioAbonoController.php) — `store` (l.68), `update` (l.131), `destroy` (l.154)
- [app/Http/Controllers/Api/LoteController.php](../app/Http/Controllers/Api/LoteController.php) — `store`/`update`/`destroy` (l.161/217/273; ya existen llamadas a `forgetPredioBundle` — añadir la nueva línea al lado)

Patrón a seguir: igual que las llamadas existentes a `WizardCache::forgetPredioBundle(...)` ya presentes en `LoteController`, `SubloteController`, `LineaController`.

### 5. Respuesta esperada (contrato)

```json
{
  "data": {
    "precios_cosecha":      [{ "id":1,"lote_id":1,"anio":2025,"precio":"4500.00","lote":{"id":1,"nombre":"Lote 1"} }, ...],
    "precios_abono":        [{ "id":1,"gramos_min":0,"gramos_max":200,"precio_palma":"100.00","estado":true }, ...],
    "labores_palma_fijas":  [...],
    "labores_palma_custom": [...],
    "labores_finca":        [...],
    "lotes":                [{ "id":1,"nombre":"Lote 1","predio_id":1,"predio":{"id":1,"nombre":"Predio A"} }, ...]
  }
}
```

### 6. (Opcional, fuera de scope) Caché HTTP `Cache-Control`

No se incluye en esta entrega — el cache servidor con TTL 60s + bundle ya elimina ~85% del tiempo. Si en el futuro se quiere ahorrar incluso el roundtrip en navegaciones repetidas, añadir `Cache-Control: private, max-age=30` en el response del bundle. Decisión separada para no mezclar.

---

## Frontend (guía — repo separado)

El frontend según [CONTEXTO.md](../CONTEXTO.md) está en otro repo. Esta sección es contrato + recomendación, no implementación.

### Reemplazar las 6 llamadas

Donde hoy hay `Promise.all([...6 fetches...])`, cambiar por una sola llamada:

```ts
// composables/usePreciosLaboresBundle.ts
import { useQuery } from '@tanstack/vue-query'; // o @tanstack/react-query

export function usePreciosLaboresBundle() {
  return useQuery({
    queryKey: ['precios-labores-bundle'],
    queryFn: () => api.get('/configuracion/precios-labores/init').then(r => r.data.data),
    staleTime: 60_000,   // alineado con TTL del backend
    gcTime:    5 * 60_000,
  });
}
```

La pantalla consume `data.precios_cosecha`, `data.labores_palma_fijas`, etc.

### Invalidación tras mutaciones

Después de cada `POST/PUT/DELETE` a `/labores`, `/precios-cosecha`, `/precios-abono`, `/lotes`, invalidar la query:

```ts
queryClient.invalidateQueries({ queryKey: ['precios-labores-bundle'] });
```

Esto se alinea con el `forget` del backend: el siguiente refetch trae datos frescos en una sola request.

### Endpoints individuales que se mantienen

Los 6 endpoints originales **siguen existiendo y funcionando** — se usan para:
- Edición/búsqueda en tablas con filtros server-side (`/labores?search=...`).
- Paginación profunda de `precios-cosecha` cuando hay muchos años.
- Wizards de otras pantallas que ya consumen `/lotes/select`.

Solo la carga inicial de "Precios de Labores" cambia.

---

## Verificación

1. **Antes:** abrir DevTools → Network en la pantalla. Confirmar 6 requests, sumar tiempos.
2. **Después de implementar:** debe verse **1 request** a `/configuracion/precios-labores/init`. Tiempo esperado < 1s en cold cache, < 200 ms en warm cache.
3. **Permisos:** probar con usuario sin `configuracion.editar` → debe responder 403.
4. **Invalidación:**
   - Cargar pantalla (warm cache).
   - Editar una labor (`PUT /labores/{id}`).
   - Recargar pantalla → la labor editada debe aparecer con el valor nuevo, no el viejo.
   - Repetir para `precios-cosecha`, `precios-abono`, `lotes`.
5. **Multitenant:** desde 2 tenants distintos, verificar que el cache key es por tenant (`wizard:precios_labores_bundle:t:{id}`) y no hay leakage.
6. **Test rápido en `tinker`:**
   ```php
   Cache::get('wizard:precios_labores_bundle:t:1'); // antes: null
   // hacer un GET al endpoint
   Cache::get('wizard:precios_labores_bundle:t:1'); // después: array con 6 keys
   ```

---

## Archivos a modificar/crear

**Crear:**
- `app/Http/Controllers/Api/ConfiguracionPreciosLaboresController.php`

**Modificar:**
- [app/Support/WizardCache.php](../app/Support/WizardCache.php) — añadir TTL, key, `forget`
- [routes/api.php](../routes/api.php) — registrar ruta
- [app/Http/Controllers/Api/LaborController.php](../app/Http/Controllers/Api/LaborController.php) — invalidar en store/update/destroy
- [app/Http/Controllers/Api/PrecioCosechaController.php](../app/Http/Controllers/Api/PrecioCosechaController.php) — invalidar en store/update/destroy
- [app/Http/Controllers/Api/PrecioAbonoController.php](../app/Http/Controllers/Api/PrecioAbonoController.php) — invalidar en store/update/destroy
- [app/Http/Controllers/Api/LoteController.php](../app/Http/Controllers/Api/LoteController.php) — invalidar en store/update/destroy (junto a `forgetPredioBundle`)

**No modificar:** los métodos `index/select` de los 4 controladores existentes — siguen sirviendo a otros consumidores.
