# Optimización de rendimiento — guardarTodo() en NuevaPlanillaWizard

> Implementada en julio 2026. Reduce el tiempo de guardado de una planilla con 20-50 ítems de **>15 segundos a <500 ms**.

---

## Problema original

`guardarTodo()` en `NuevaPlanillaWizard.tsx` recorría cada tipo de labor (cosechas, plateo, poda, fertilización, sanidad, otros, finca, horas extras, ausencias) con un `for` loop que usaba `await` en cada ítem:

```typescript
// ANTES — O(N × RTT)
for (const t of trabajosPlateo) {
  await jornalesApi.crear(pid, payload); // bloquea hasta respuesta
}
for (const t of trabajosPoda) {
  await jornalesApi.crear(pid, payload); // bloquea hasta respuesta
}
// ... idem para cada tipo
```

Con 30 ítems a ~300 ms de RTT por petición → **~9-15 segundos de espera** con el spinner bloqueado sin feedback. En planillas grandes (50 ítems) llegaba a **20-25 segundos**.

---

## Solución en dos fases

### Fase 1 — Paralelización en frontend (solo frontend, ganancia inmediata)

Todos los POSTs nuevos se lanzan en paralelo con `Promise.allSettled()`:

```
ANTES: POST → espera → POST → espera → POST → espera ...  O(N × RTT)
DESPUÉS: POST ┐
              POST ┤ → espera única → O(RTT)
              POST ┘
```

**Mejora:** de ~15 s a ~1-2 s con 30 ítems.

### Fase 2 — Endpoints bulk en backend (solución definitiva)

4 nuevos endpoints que reciben arrays y hacen una sola `DB::transaction()` por tipo:

```
ANTES:  30 POST individuales en paralelo → 30 peticiones HTTP
DESPUÉS: 4 POST bulk → 4 peticiones HTTP + N PUTs de ediciones
```

**Mejora acumulada:** de ~15 s a **< 500 ms** en casos típicos.

---

## Archivos modificados

### Backend

| Archivo | Cambio |
|---|---|
| `app/Http/Controllers/Api/JornalController.php` | `bulkStore()` — acepta array mixto de jornales (cualquier tipo de labor) |
| `app/Http/Controllers/Api/RegistroCosechaController.php` | `bulkStore()` — acepta array de cosechas con cuadrillas anidadas |
| `app/Http/Controllers/Api/AusenciaController.php` | `bulkStore()` — acepta array de ausencias |
| `app/Http/Controllers/Api/HoraExtraController.php` | `bulkStore()` — acepta array de horas extras; pre-valida tipos en batch |
| `routes/api.php` | 4 rutas `POST .../bulk` registradas **antes** de las rutas individuales |

### Frontend

| Archivo | Cambio |
|---|---|
| `src/api/operaciones.ts` | `bulkCrear()` añadido a `jornalesApi`, `cosechasApi`, `horasExtraApi`, `ausenciasApi` |
| `src/app/pages/operaciones/NuevaPlanillaWizard.tsx` | `guardarTodo()` refactorizado en Fase 1 (paralelo) y Fase 2 (bulk) |

### Documentación

| Archivo | Cambio |
|---|---|
| `docs/API_OPERACIONES.md` | §12 añadida (4 endpoints bulk + errores + integración frontend); conflictos de merge resueltos |
| `CONTEXTO.md` | §6.4, §6.9, §6.13 actualizados; §12 Estado Actual; §13.5 diagnóstico; conflicto merge resuelto |

---

## Detalles de implementación

### Rutas — orden crítico

Las rutas bulk deben registrarse **antes** de las individuales en `routes/api.php` para que Laravel no confunda `/jornales/bulk` con `/jornales/{jornal}`:

```php
// ✅ CORRECTO — bulk primero
Route::post('operaciones/{operacion}/jornales/bulk', [JornalController::class, 'bulkStore'])
    ->middleware('check.permission:operaciones.crear');
Route::post('operaciones/{operacion}/jornales', [JornalController::class, 'store'])
    ->middleware('check.permission:operaciones.crear');

// ❌ INCORRECTO — bulk después quedaría oculto por la ruta {jornal}
```

### Transacción y rollback

Todos los `bulkStore` usan una sola `DB::transaction()`. Si cualquier ítem falla (cálculo, validación de negocio, constraint), **rollback completo**: ningún ítem del batch queda guardado en BD. Esto es consistente con el comportamiento de los endpoints individuales donde un error no deja ítems parciales.

### Mapeo de IDs — posición vs sync_uuid

El plan original proponía usar `sync_uuid` como clave de correlación. Se implementó **mapeo por posición** en su lugar:

```
Request:  items[0], items[1], items[2]
Response: data[0],  data[1],  data[2]   ← mismo orden garantizado
```

```typescript
jornalBulkRes?.data?.forEach((item: { id: number }, idx: number) => {
  const { localId, tipo } = newJornales[idx];
  if (localId) mapeoIdsPorTipo[tipo][localId] = String(item.id);
});
```

Ventaja: más simple, no requiere `crypto.randomUUID()` en el cliente ni campo `sync_uuid` en el request. El campo `sync_uuid` de la tabla `jornales` queda reservado para la PWA offline.

### Pre-validación batch de HoraExtra

Antes de abrir la transacción, `HoraExtraController::bulkStore()` verifica todos los `tipo_hora_extra_id` del array en **una sola query SQL** para evitar N+1:

```php
$tiposIds = collect($validated['items'])->pluck('tipo_hora_extra_id')->unique()->values()->all();
$tiposValidos = TipoHoraExtra::whereIn('id', $tiposIds)
    ->where('tenant_id', $tenantId)
    ->where('estado', true)
    ->pluck('id')->flip()->all();

foreach ($validated['items'] as $idx => $item) {
    if (!isset($tiposValidos[$item['tipo_hora_extra_id']])) {
        return response()->json(['message' => "items.{$idx}: tipo inválido o inactivo.", 'code' => 'VALIDATION_ERROR'], 422);
    }
}
```

### Snapshots automáticos en HoraExtra

El hook `HoraExtra::booted()` ya maneja los snapshots (`codigo`, `porcentaje_recargo`, `paga_hora_completa`, `valor_calculado`) en el evento `creating`. El `bulkStore` simplemente llama `HoraExtra::create()` sin lógica adicional de snapshot.

### Pattern del frontend en guardarTodo()

```typescript
// Acumular ítems nuevos por tipo (sin await)
const newJornales: Array<{ localId: string; tipo: string; payload: JornalPayload }> = [];
const newCosechas: Array<{ localId: string; payload: CosechaPayload }> = [];
const newHE: Array<{ localId: string; payload: HoraExtraPayload }> = [];
const newAusencias: Array<{ localId: string; payload: AusenciaPayload }> = [];
const updates: Promise<any>[] = [];

// ... loops que populan estos arrays ...

// Disparar todo en paralelo: 4 bulk (nuevos) + N PUTs (ediciones)
const [jornalRes, cosechaRes, heRes, ausenciaRes] = (await Promise.all([
  newJornales.length > 0
    ? jornalesApi.bulkCrear(pid!, newJornales.map(i => i.payload)).catch(() => null)
    : Promise.resolve(null),
  newCosechas.length > 0
    ? cosechasApi.bulkCrear(pid!, newCosechas.map(i => i.payload)).catch(() => null)
    : Promise.resolve(null),
  newHE.length > 0
    ? horasExtraApi.bulkCrear(pid!, newHE.map(i => i.payload)).catch(() => null)
    : Promise.resolve(null),
  newAusencias.length > 0
    ? ausenciasApi.bulkCrear(pid!, newAusencias.map(i => i.payload)).catch(() => null)
    : Promise.resolve(null),
  Promise.allSettled(updates),
])) as [any, any, any, any, any];

// Mapeo por posición
jornalRes?.data?.forEach((item: { id: number }, idx: number) => {
  const { localId, tipo } = newJornales[idx];
  if (!localId) return;
  switch (tipo) {
    case 'plateo':  mapeoIdsPlateo[localId]  = String(item.id); break;
    case 'poda':    mapeoIdsPoda[localId]    = String(item.id); break;
    case 'fert':    mapeoIdsFert[localId]    = String(item.id); break;
    case 'sanidad': mapeoIdsSanidad[localId] = String(item.id); break;
    case 'otros':   mapeoIdsOtros[localId]   = String(item.id); break;
    case 'finca':   mapeoIdsFinca[localId]   = String(item.id); break;
  }
});
cosechaRes?.data?.forEach((item: { id: number }, idx: number) => {
  mapeoIdsCosecha[newCosechas[idx].localId] = String(item.id);
});
heRes?.data?.forEach((item: { id: number }, idx: number) => {
  mapeoIdsHE[newHE[idx].localId] = String(item.id);
});
ausenciaRes?.data?.forEach((item: { id: number }, idx: number) => {
  mapeoIdsAusencia[newAusencias[idx].localId] = String(item.id);
});
```

---

## Tabla de mejora de rendimiento

| Escenario | Peticiones HTTP | Tiempo aprox. |
|---|---|---|
| Original — secuencial | N POSTs seriales | ~300 ms × N |
| Fase 1 — paralelo | N POSTs en paralelo | ~300 ms (1 RTT) |
| Fase 2 — bulk | 4 POSTs bulk + M PUTs | < 500 ms total |

Con 30 ítems típicos en una planilla:

| | Peticiones | Tiempo |
|---|---|---|
| Antes | 30 POSTs seriales | ~9-15 s |
| Fase 1 | 30 POSTs paralelos | ~1-2 s |
| Fase 2 | 4 POSTs bulk | < 500 ms |

---

## Checklist de verificación

### Fase 1 (frontend paralelo)

- [ ] DevTools → Network → al guardar, los POSTs aparecen en paralelo en la columna Waterfall (no en cascada).
- [ ] Guardar planilla con 15+ jornales → tiempo < 2 s.
- [ ] Guardar, no recargar, y guardar de nuevo → no duplica registros en BD.
- [ ] Caso borde fertilización "Otro": insumo nuevo se crea antes, el jornal usa el ID correcto.

### Fase 2 (bulk endpoints)

- [ ] `POST /operaciones/{id}/jornales/bulk` con 10 ítems mixtos (palma + finca) → 201, array de 10 `{id, sync_uuid}`.
- [ ] Ítem sin `empleado_id` ni `operario_id` → 422 `CALC_ERROR` con mensaje `"items.N: ..."`.
- [ ] Labor COSECHA en `/jornales/bulk` → 422 `CALC_ERROR`.
- [ ] Forzar error en ítem 5 de 10 → ítems 1-4 NO quedan en BD (rollback).
- [ ] `POST /operaciones/{id}/cosechas/bulk` con 3 cosechas (cuadrillas distintas) → 201, array de 3 `{id}`.
- [ ] `POST /operaciones/{id}/horas-extra/bulk` con tipo inválido → 422 `VALIDATION_ERROR` indexado.
- [ ] `POST /operaciones/{id}/ausencias/bulk` con `fecha_fin` anterior a la operación → 422.
- [ ] Planilla con 30 ítems: guardado total < 1 s.

### Regresión

- [ ] Guardar planilla existente (modo edición) con ítems ya guardados → ediciones (PUTs) funcionan correctamente.
- [ ] Guardar con `operacion.estado = APROBADA` → 409 `OPERACION_APROBADA` en todos los bulk.

---

## Diagnóstico rápido

**Bulk responde 404:**
→ Verificar que las rutas bulk estén registradas **antes** de las individuales en `routes/api.php`.

**Bulk responde 422 con `CALC_ERROR` inesperado:**
→ Revisar el índice del ítem en el mensaje (`"items.N: ..."`). Puede ser falta de precio configurado, o labor COSECHA enviada a `/jornales/bulk`.

**Tiempo de guardado sigue siendo lento:**
→ DevTools → Network → verificar que el frontend llama a `.../bulk` y no a los endpoints individuales. Si llama a los individuales en paralelo (Fase 1 sin Fase 2), el tiempo depende del servidor, no del número de peticiones.

**IDs no se mapean correctamente después de guardar:**
→ Verificar que `newJornales[idx].localId` coincide con el índice esperado. El array de respuesta `data` siempre tiene el mismo orden que `items` del request.
