# Cosechas Partidas (Split Harvest) — Implementación

> **Estado: IMPLEMENTADO** — 2026-07-09

Soporta que una `registro_cosecha` (una cuadrilla, un lote, N gajos) viaje repartida en múltiples camiones, cada uno con su propio conteo de gajos y su propio peso de báscula.

---

## 1. Problema resuelto

El sistema antes asumía que una cosecha viajaba **completa** en un solo camión. En campo, los gajos de un lote se cargan en distintos turnos con distintos camiones. Sin este cambio, el sistema fallaba en 6 puntos:

| # | Error | Consecuencia |
|---|---|---|
| 1 | Índice único `(cosecha_id)` en `viaje_detalle` | El segundo `addDetalle` fallaba con `COSECHA_YA_ASIGNADA` — partir era imposible. |
| 2 | Promedio usaba gajos TOTALES de la cosecha | `800 kg / 100 gajos = 8` en vez de `800 kg / 50 gajos = 16` → `PromedioLote` incorrecto, nómina afectada. |
| 3 | `hidratarPesoCuadrilla` usaba `whereNull()` como guard | El Viaje 2 omitía la actualización porque el campo ya no era NULL → subpago en nómina. |
| 4 | `gajos_reconteo` vivía en la cosecha, no en el detalle | El segundo `PUT /reconteo` sobreescribía el del primero. |
| 5 | `PromedioLote` con gajos incorrectos | Promedios erróneos contaminarían el histórico de nómina. |
| 6 | Nómina no sabía si había splits pendientes | Admin validaba cosecha con datos incompletos sin advertencia. |

---

## 2. Solución implementada

**Principio:** una sola columna nueva en `viaje_detalle` + cambio de índice único + ajuste de servicios.

---

## 3. Migración

**Archivo:** `database/migrations/2026_07_09_000001_add_gajos_en_viaje_to_viaje_detalle.php`

```php
public function up(): void
{
    Schema::table('viaje_detalle', function (Blueprint $table) {
        $table->integer('gajos_en_viaje')->nullable()->after('cosecha_id');
        // NULL = modo legacy: todos los gajos de la cosecha van en este viaje.
        // Valor explícito = split: solo esa cantidad de gajos va en este camión.
    });

    // Antes: (cosecha_id)          → 1 cosecha solo en 1 viaje activo.
    // Ahora: (cosecha_id, viaje_id) → 1 cosecha en múltiples viajes, pero no 2 veces en el mismo.
    DB::statement('DROP INDEX IF EXISTS viaje_detalle_cosecha_activa_unique');
    DB::statement('
        CREATE UNIQUE INDEX viaje_detalle_cosecha_viaje_unique
        ON viaje_detalle (cosecha_id, viaje_id)
        WHERE estado = true
    ');
}

public function down(): void
{
    DB::statement('DROP INDEX IF EXISTS viaje_detalle_cosecha_viaje_unique');
    DB::statement('
        CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique
        ON viaje_detalle (cosecha_id) WHERE estado = true
    ');
    Schema::table('viaje_detalle', function (Blueprint $table) {
        $table->dropColumn('gajos_en_viaje');
    });
}
```

**Backward compatibility:** `gajos_en_viaje = NULL` → todos los gajos. La cadena de fallback en `gajosEfectivosDetalle()` garantiza que los registros existentes sin splits funcionen sin cambios.

Ejecutar:
```bash
php artisan migrate --path=database/migrations/2026_07_09_000001_add_gajos_en_viaje_to_viaje_detalle.php
```

---

## 4. Modelo ViajeDetalle

**Archivo:** `app/Models/ViajeDetalle.php`

Añadido a `$fillable`:
```php
'gajos_en_viaje',
```

Añadido a `casts()`:
```php
'gajos_en_viaje' => 'integer',
```

---

## 5. ViajeCalculationService

**Archivo:** `app/Services/ViajeCalculationService.php`

### 5.1 Nuevo método privado `gajosEfectivosDetalle`

```php
private function gajosEfectivosDetalle(ViajeDetalle $detalle): int
{
    return (int) (
        $detalle->gajos_en_viaje              // gajos específicos de este viaje (split)
        ?? $detalle->cosecha->gajos_reconteo  // fallback: total verificado (single-viaje legacy)
        ?? $detalle->cosecha->gajos_reportados
        ?? 0
    );
}
```

### 5.2 `procesarHomogeneo` — usa gajos del detalle

```php
// FIX Error 2: gajos por viaje, no de la cosecha completa
$totalGajos = $detalleslote->sum(fn($d) => $this->gajosEfectivosDetalle($d));
// promedio = peso_viaje / $totalGajos (correcto por viaje)
$this->hidratarPesoCuadrilla($detalle->cosecha, $promedio, $this->gajosEfectivosDetalle($detalle));
```

### 5.3 `hidratarPesoCuadrilla` — ACUMULA en lugar de SET

```php
// FIX Error 3: COALESCE + suma soporta N viajes por cosecha
DB::table('cosecha_cuadrilla')
    ->where('cosecha_id', $cosecha->id)
    ->where('estado', true)
    ->update([
        'peso_calculado_empleado' => DB::raw("COALESCE(peso_calculado_empleado, 0) + {$pesoPersona}")
    ]);
```

- Primer split: `COALESCE(null, 0) + X1 = X1`
- Segundo split: `COALESCE(X1, 0) + X2 = X1 + X2`

El guard `peso_confirmado !== null` protege contra sobrescribir confirmaciones directas.

---

## 6. ViajeController

**Archivo:** `app/Http/Controllers/Api/ViajeController.php`

### 6.1 `addDetalle` — validar gajos disponibles

Nuevo payload:
```json
{ "cosecha_id": 142, "gajos_en_viaje": 50 }
```

Dentro de `DB::transaction` con `lockForUpdate()`:
- Verifica que no exista un detalle con `gajos_en_viaje = NULL` para esa cosecha (`COSECHA_YA_ASIGNADA`).
- Si `gajos_en_viaje` tiene valor, calcula `gajos_restantes = total − SUM(gajos_en_viaje activos)`; si el pedido supera el disponible → `GAJOS_INSUFICIENTES` (422).
- El índice `(cosecha_id, viaje_id)` previene insertar la misma cosecha dos veces en el mismo viaje → también `COSECHA_YA_ASIGNADA`.

### 6.2 `operacionesDisponibles` — incluye splits parciales

La query incluye operaciones con cosechas que tienen gajos restantes aunque ya tengan un viaje_detalle activo (split parcial).

### 6.3 `cosechasDisponibles` — gajos pendientes por cosecha

Excluye cosechas completamente asignadas. Calcula `gajos_pendientes_enviar` (campo computado, no persiste) en cada cosecha del response:
```
gajos_pendientes_enviar = COALESCE(gajos_reconteo, gajos_reportados) − SUM(gajos_en_viaje activos)
```

### 6.4 `updateReconteo` — sincroniza cosecha

Campo renombrado: `gajos_reconteo` → `gajos_en_viaje` en el payload.

```json
{ "gajos_en_viaje": 48, "peso_confirmado": null }
```

Dentro de la transacción:
1. `UPDATE viaje_detalle SET gajos_en_viaje = 48`.
2. `gajos_reconteo(cosecha) = SUM(gajos_en_viaje WHERE activo AND NOT NULL)` → siempre refleja el total verificado acumulado de todos los splits.
3. Refresca `viaje.cantidad_gajos_total` con `COALESCE(gajos_en_viaje, gajos_reconteo, gajos_reportados)`.

> Esto garantiza que `NominaCalculationService` (línea 554: `gajos_reconteo ?? gajos_reportados`) siempre lea el total correcto **sin ningún cambio en `NominaCalculationService`**.

### 6.5 `aprobarReconteo` — valida en el detalle

```php
// Antes:
if (is_null($cosecha->gajos_reconteo)) { ... }

// Implementado:
if (is_null($detalle->gajos_en_viaje)) {
    return response()->json(['message' => '...', 'code' => 'RECONTEO_PENDIENTE'], 422);
}
```

---

## 7. ValidarCosechaService

**Archivo:** `app/Services/Nomina/ValidarCosechaService.php`

Añadido por cosecha en el loop `foreach ($cosechas as $rc)`:

```php
$splitsPendientes = ViajeDetalle::activos()
    ->where('cosecha_id', $rc->id)
    ->whereHas('viaje', fn ($q) => $q->where('estado', '!=', ViajeEstado::FINALIZADO))
    ->count();
```

Incluido en `filaDetalle` de cada cuadrillero:
```php
'splits_pendientes' => $splitsPendientes,
```

Si `splits_pendientes > 0`, el frontend muestra: _"Esta cosecha tiene partes en viajes aún no cerrados. Los valores de kg pueden ser incompletos."_

---

## 8. FormRequests

### StoreViajeDetalleRequest
```php
'gajos_en_viaje' => ['nullable', 'integer', 'min:1'],
```

### UpdateReconteoRequest
Campo renombrado de `gajos_reconteo` a `gajos_en_viaje`:
```php
'gajos_en_viaje'  => ['required', 'integer', 'min:0'],
'peso_confirmado' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
```

---

## 9. Reglas de negocio

1. `gajos_en_viaje = null` → todos los gajos restantes (modo legacy; sin cambio de comportamiento).
2. `SUM(gajos_en_viaje activos) ≤ cosecha.gajos_reportados` siempre. El backend rechaza con `GAJOS_INSUFICIENTES` (422) con lock pesimista.
3. La cuadrilla de la cosecha no cambia entre splits. Todos los miembros reciben el peso proporcional acumulado de cada viaje.
4. Si `cosecha.peso_confirmado` fue asignado directamente en la planilla de operaciones, `hidratarPesoCuadrilla` no recalcula — la confirmación directa tiene prioridad.
5. Un split no crea filas nuevas en `cosecha_cuadrilla`. El peso se acumula en las filas existentes con `COALESCE + suma`.
6. Cada viaje que finaliza con gajos de un lote crea su propio `PromedioLote`. La nómina promedia esos registros del período — correcto y deseado (refleja variabilidad real).

---

## 10. Flujo end-to-end verificado

```
Cosecha A: 100 gajos reportados. Cuadrilla de 2. peso_confirmado = null.

1. V1 — addDetalle { cosecha_id:A, gajos_en_viaje:50 }
   → viaje_detalle_V1: gajos_en_viaje=50
   → cosechasDisponibles: gajos_pendientes_enviar=50

2. V1 — updateReconteo { gajos_en_viaje:48 }
   → viaje_detalle_V1.gajos_en_viaje = 48
   → gajos_reconteo(A) = SUM(48) = 48        ← nómina lo ve
   → viaje_V1.cantidad_gajos_total = 48

3. V2 — addDetalle { cosecha_id:A, gajos_en_viaje:46 }
   → gajos_restantes = 100 - 48 = 52 ≥ 46 → OK
   → cosechasDisponibles: gajos_pendientes_enviar = 100-48-46 = 6

4. V2 — updateReconteo { gajos_en_viaje:46 }
   → viaje_detalle_V2.gajos_en_viaje = 46
   → gajos_reconteo(A) = SUM(48+46) = 94     ← nómina ve 94 (total verificado)

5. V1 — finalizar. peso_viaje=800 kg, es_homogeneo=true
   → gajosEfectivosDetalle(V1) = 48
   → promedio = 800/48 = 16.67
   → PromedioLote { lote_A, viaje_id:V1, promedio:16.67 }
   → cosecha_cuadrilla: COALESCE(null,0) + floor(48/2)×16.67 = 400.08 cada uno

6. V2 — finalizar. peso_viaje=750 kg
   → gajosEfectivosDetalle(V2) = 46
   → promedio = 750/46 = 16.30
   → PromedioLote { lote_A, viaje_id:V2, promedio:16.30 }
   → cosecha_cuadrilla: COALESCE(400.08,0) + floor(46/2)×16.30 = 774.98 cada uno

7. Nómina (NominaCalculationService sin cambios):
   → gajos_reconteo(A) = 94 → paga floor(94/2) × AVG(16.67,16.30) × precio
   → ValidarCosechaService: splits_pendientes=0, kg_extractora=774.98

8. Intento V3 { gajos_en_viaje:10 }:
   → gajos asignados=94 → restantes=6 < 10 → 422 GAJOS_INSUFICIENTES

9. Misma cosecha dos veces en V1:
   → UNIQUE(cosecha_id, viaje_id) → 422 COSECHA_YA_ASIGNADA
```

---

## 11. Archivos modificados

| Archivo | Cambio |
|---|---|
| `database/migrations/2026_07_09_000001_add_gajos_en_viaje_to_viaje_detalle.php` | Nueva migración |
| `app/Models/ViajeDetalle.php` | `gajos_en_viaje` en fillable + casts |
| `app/Services/ViajeCalculationService.php` | `gajosEfectivosDetalle` + acumulación COALESCE en cuadrilla |
| `app/Http/Controllers/Api/ViajeController.php` | 5 métodos: `addDetalle`, `operacionesDisponibles`, `cosechasDisponibles`, `updateReconteo`, `aprobarReconteo` |
| `app/Http/Requests/Viaje/StoreViajeDetalleRequest.php` | Campo `gajos_en_viaje` opcional |
| `app/Http/Requests/Viaje/UpdateReconteoRequest.php` | `gajos_reconteo` → `gajos_en_viaje` |
| `app/Services/Nomina/ValidarCosechaService.php` | `splits_pendientes` en bundle |
| `docs/API_VIAJES.md` | §5.3-5.6, §6.1, §9, §10, §12 actualizados |
| `docs/CONTEXTO.md` | §8 corregido y ampliado |
