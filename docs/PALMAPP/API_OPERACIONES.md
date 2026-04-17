# API — Operaciones (Planilla del Día)

> Guía para el frontend. Cubre el wizard de 4 pasos para crear una Planilla del Día. **Alcance actual:** Paso 1 (Información General) + Paso 2 (Labores de Palma). Paso 3 (Labores de Finca) y Paso 4 (Finalización con ausencias) quedan para siguiente iteración.

---

## 0. Base y autenticación

**Base URL:** `{host}/api/v1/tenant`

**Headers requeridos en TODAS las peticiones:**
```
Authorization: Bearer {jwt_token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
Accept: application/json
```

**Permisos (Spatie, por tenant):**
| Acción | Permiso |
|---|---|
| Ver planillas y resumen | `operaciones.ver` |
| Crear planilla / agregar jornal o cosecha | `operaciones.crear` |
| Editar info general / jornal / cosecha | `operaciones.editar` |
| Eliminar planilla / jornal / cosecha | `operaciones.eliminar` |
| Aprobar planilla | `operaciones.aprobar` |

**Formato de errores:**
```json
{ "message": "Mensaje legible", "code": "CODIGO_OPCIONAL", "errors": { "campo": ["detalle"] } }
```
Códigos especiales del módulo:
- `OPERACION_APROBADA` (409) — intento de mutar una planilla ya aprobada.
- `OPERACION_CON_HIJOS` (409) — intento de eliminar planilla con jornales/cosechas/ausencias.
- `COSECHA_EN_VIAJE` (409) — cosecha está asignada a un viaje.
- `CALC_ERROR` (422) — error de cálculo (falta precio configurado, insumo sin rango en precio_abono, etc.).
- `PERMISSION_DENIED` (403) — usuario sin permiso para la acción.

---

## 1. Flujo del wizard (persistencia incremental)

Cada "Agregar X" del UI dispara un POST inmediato. El backend devuelve el id creado que el front debe guardar para posibles ediciones o eliminaciones. El panel derecho "Resumen" se obtiene de `GET /operaciones/{id}/resumen`.

```
┌ Paso 1 — Info General ┐
│  POST /operaciones    │  → crea planilla BORRADOR. Devuelve { id }
└───────────────────────┘
            │
┌ Paso 2 — Labores de Palma ────────────────────────────┐
│  Tab Cosecha:    POST /operaciones/{id}/cosechas       │
│  Tab Plateo:     POST /operaciones/{id}/jornales       │
│  Tab Poda:       POST /operaciones/{id}/jornales       │
│  Tab Fertiliz.:  POST /operaciones/{id}/jornales       │
│  Tab Sanidad:    POST /operaciones/{id}/jornales       │
│  Tab Otros:      POST /operaciones/{id}/jornales       │
│                                                        │
│  Eliminar tarjeta: DELETE /jornales/{id} o /cosechas/{id} │
│  Editar tarjeta:   PUT /jornales/{id} o /cosechas/{id}    │
│                                                        │
│  Resumen (panel derecho): GET /operaciones/{id}/resumen│
└────────────────────────────────────────────────────────┘
            │
  [Paso 3 + Paso 4 aún no expuestos]
            │
┌ Finalizar ────────────────────────────┐
│  POST /operaciones/{id}/aprobar       │ → estado APROBADA, inmutable
└───────────────────────────────────────┘
```

---

## 2. Paso 1 — Información General

### 2.1 Crear planilla

`POST /operaciones`

**Request:**
```json
{
  "fecha": "2026-04-17",
  "hora_inicio": "06:00",
  "hora_fin": null,
  "hubo_lluvia": true,
  "cantidad_lluvia": 12.50,
  "observaciones": null
}
```

Reglas:
- `fecha` es obligatoria y **única por tenant** (no puede haber dos planillas en el mismo día).
- `hora_inicio` / `hora_fin` formato `HH:mm` (24h).
- Si `hubo_lluvia = true`, `cantidad_lluvia` es obligatoria (en milímetros, decimal).
- Si `hubo_lluvia = false`, `cantidad_lluvia` debe venir vacía.

**Respuesta 201:**
```json
{
  "message": "Planilla creada correctamente",
  "data": {
    "id": 12,
    "fecha": "2026-04-17",
    "hora_inicio": "06:00:00",
    "hubo_lluvia": true,
    "cantidad_lluvia": "12.50",
    "estado": "BORRADOR",
    "creado_por": 3,
    "creado_por_rel": { "id": 3, "name": "Carlos Rodríguez" }
  }
}
```

### 2.2 Editar info general

`PUT /operaciones/{id}`

Todos los campos son opcionales (`sometimes`). Misma regla de consistencia `hubo_lluvia` ↔ `cantidad_lluvia`. Falla con 409 `OPERACION_APROBADA` si la planilla ya fue aprobada.

### 2.2.1 Indicadores Principales (cards superiores)

Los tres cards de la parte superior ("Planillas en Borrador", "Planillas Aprobadas", "Total Planillas") con el selector de período (Mensual por default) se alimentan de un endpoint dedicado — no uses el listado para eso.

`GET /operaciones/indicadores?periodo={tipo}`

**Parámetro `periodo`** (string, default `mensual`) — 4 opciones que matchean el dropdown del UI:

| Valor | Rango calculado |
|---|---|
| `semanal` | Lunes 00:00 a domingo 23:59 de la **semana en curso** |
| `quincenal` | Quincena actual: si hoy ≤ día 15 → `día 1 — día 15`; si hoy ≥ día 16 → `día 16 — último día del mes` |
| `mensual` (default) | Del día 1 al último día del **mes en curso** |
| `personalizado` | Requiere `fecha_desde` + `fecha_hasta` (formato `YYYY-MM-DD`) |

**Respuesta:**
```json
{
  "data": {
    "periodo": {
      "tipo": "mensual",
      "fecha_desde": "2026-03-01",
      "fecha_hasta": "2026-03-31"
    },
    "planillas_borrador":  3,
    "planillas_aprobadas": 18,
    "total_planillas":     21
  }
}
```

**Mapeo a la UI:**
| Card | Campo API |
|---|---|
| "Planillas en Borrador — X pendientes" | `planillas_borrador` |
| "Planillas Aprobadas — X completadas" | `planillas_aprobadas` |
| "Total Planillas — X registros" | `total_planillas` (ya viene precalculado = borrador + aprobadas del período) |

**Ejemplo cURL:**
```bash
# Mensual (default)
curl "$BASE/operaciones/indicadores" "${H[@]}"

# Semanal
curl "$BASE/operaciones/indicadores?periodo=semanal" "${H[@]}"

# Quincenal (Q1 o Q2 según el día de hoy)
curl "$BASE/operaciones/indicadores?periodo=quincenal" "${H[@]}"

# Personalizado
curl "$BASE/operaciones/indicadores?periodo=personalizado&fecha_desde=2026-03-01&fecha_hasta=2026-03-15" "${H[@]}"
```

Errores:
- 422 — periodo inválido, o `personalizado` sin `fecha_desde`/`fecha_hasta`.

**Tip de UI:** cuando el usuario cambia el dropdown "Período", refresca solo los cards (no el listado — el listado usa sus propios filtros `fecha_desde`/`fecha_hasta`).

---

### 2.3 Listar planillas

`GET /operaciones`

Query params:
| Parámetro | Tipo | Descripción |
|---|---|---|
| `estado` | string | `BORRADOR` o `APROBADA` |
| `fecha_desde` | date | Filtro `fecha >= fecha_desde` |
| `fecha_hasta` | date | Filtro `fecha <= fecha_hasta` |
| `per_page` | int | Default 15 |
| `page` | int | Default 1 |

Cada item del listado trae los agregados necesarios para pintar la tabla "Planillas Recientes" sin llamar al detalle:

```json
{
  "data": [
    {
      "id": 12,
      "fecha": "2026-03-08",
      "estado": "BORRADOR",
      "hubo_lluvia": false,
      "cantidad_lluvia": null,
      "creado_por_rel": { "id": 3, "name": "Carlos Rodríguez" },

      "jornales_count": 15,
      "cosechas_count": 2,
      "ausencias_count": 0,

      "colaboradores_count": 8,

      "total_jornales_sum": "450000.00",
      "total_cosechas_sum": "243328.00",
      "total_general":     693328.00
    }
  ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 15, "total": 42 }
}
```

**Mapeo a la UI:**
| Columna UI | Campo API |
|---|---|
| Fecha | `fecha` |
| Estado | `estado` (formatear: BORRADOR → "Borrador", APROBADA → "Aprobado") |
| Colaboradores | `colaboradores_count` — empleados únicos en esta planilla entre jornales y cuadrilla de cosecha |
| Total Jornales | `total_general` — suma de `total_jornales_sum + total_cosechas_sum` |

**Sobre los sumatorios:**
- `total_jornales_sum` suma `jornales.valor_total` de PLATEO, PODA, FERTILIZACION y FINCA. SANIDAD y OTROS suelen tener `valor_total = null` mientras no se configure su precio en `precios_palma`, por lo que no aportan al total.
- `total_cosechas_sum` suma `registro_cosecha.valor_total` — solo las cosechas con `peso_confirmado` contribuyen (las que solo tienen gajos aportan `null`, es decir 0).
- `total_general` es el número que debe pintarse en verde en la columna "Total Jornales" (`$693.328` en la captura).
- Si los tres totales son 0, la UI puede mostrar `—` o `$0` según convención.

### 2.4 Ver detalle

`GET /operaciones/{id}` — devuelve la planilla con `cosechas.cuadrilla.empleado`, `jornales.empleado`, `jornales.labor`, `jornales.lote`, `jornales.sublote`, `jornales.insumo`, `ausencias.empleado`, `creado_por_rel`, `aprobado_por_rel`.

### 2.5 Eliminar

`DELETE /operaciones/{id}` — solo permite si está en BORRADOR **y sin hijos**. En otros casos devuelve 409 con `code: OPERACION_APROBADA` o `code: OPERACION_CON_HIJOS`.

---

## 3. Paso 2 — Labores de Palma

El paso 2 tiene 6 tabs. **Cosecha** usa su propio endpoint (cabecera + cuadrilla). **Plateo, Poda, Fertilización, Sanidad, Otros** comparten el endpoint unificado de jornales.

### 3.1 Cosecha

Una tarjeta de cosecha = un sublote + varios colaboradores (cuadrilla).

**Reglas de cálculo (importante):**

- El **peso confirmado** son los kilos reales pesados (ej: cuando el viaje llega a báscula). Es **opcional al crear la tarjeta** desde la planilla diaria — normalmente el supervisor solo tiene los gajos en ese momento.
- `valor_total` **solo se calcula cuando hay `peso_confirmado` real**: `valor_total = peso_confirmado × precios_cosecha.precio`. Cuando la tarjeta se crea únicamente con gajos, `valor_total` queda en `null` y se hidratará más adelante (cuando el peso se confirme vía edición o desde el módulo de Viajes).
- **No hay estimación provisional con `promedio_lote`** — ese promedio se guarda como snapshot histórico (`promedio_kg_gajo`) pero no se usa para pre-calcular dinero.
- `valor_calculado` de cada fila en `cosecha_cuadrilla` es `valor_total / N` (partes iguales). Si `valor_total` es `null`, `valor_calculado` también es `null`. El `peso_calculado_empleado` sigue la misma lógica con `peso_confirmado / N`.

**Crear:** `POST /operaciones/{id}/cosechas`

Caso A — solo gajos (lo más común en campo):
```json
{
  "lote_id": 1,
  "sublote_id": 3,
  "gajos_reportados": 120,
  "cuadrilla": [
    { "empleado_id": 10 },
    { "empleado_id": 11 }
  ]
}
```
→ `valor_total = null`, `cuadrilla[*].valor_calculado = null`. Queda pendiente de hidratar cuando se pese el viaje.

Caso B — gajos + kilos confirmados:
```json
{
  "lote_id": 1,
  "sublote_id": 3,
  "gajos_reportados": 120,
  "peso_confirmado": 1800.50,
  "cuadrilla": [
    { "empleado_id": 10 },
    { "empleado_id": 11 }
  ]
}
```
→ `valor_total = 1800.50 × 800 = 1440400.00`, `cuadrilla[*].valor_calculado = 720200.00`.

Reglas:
- `peso_confirmado` corresponde al campo UI "Kilos (opcional)".
- `cuadrilla` debe tener al menos 1 empleado; no admite empleados duplicados.
- `sublote_id` debe pertenecer al `lote_id` (el backend valida).

**Respuesta 201 (caso B con peso):**
```json
{
  "message": "Cosecha registrada correctamente",
  "data": {
    "id": 55,
    "operacion_id": 12,
    "lote_id": 1,
    "sublote_id": 3,
    "gajos_reportados": 120,
    "peso_confirmado": "1800.50",
    "precio_cosecha": "800.00",
    "promedio_kg_gajo": "12.50",
    "valor_total": "1440400.00",
    "cuadrilla": [
      { "id": 91, "empleado_id": 10, "peso_calculado_empleado": "900.25", "valor_calculado": "720200.00" },
      { "id": 92, "empleado_id": 11, "peso_calculado_empleado": "900.25", "valor_calculado": "720200.00" }
    ]
  }
}
```

**Respuesta 201 (caso A sin peso):**
```json
{
  "data": {
    "id": 55,
    "gajos_reportados": 120,
    "peso_confirmado": null,
    "precio_cosecha": "800.00",
    "promedio_kg_gajo": "12.50",
    "valor_total": null,
    "cuadrilla": [
      { "id": 91, "empleado_id": 10, "peso_calculado_empleado": null, "valor_calculado": null },
      { "id": 92, "empleado_id": 11, "peso_calculado_empleado": null, "valor_calculado": null }
    ]
  }
}
```

**Editar:** `PUT /cosechas/{id}` — campos opcionales (`gajos_reportados`, `gajos_reconteo`, `peso_confirmado`, `cuadrilla`). Cuando se envía `peso_confirmado` (ej. al llegar el viaje a báscula) el backend recalcula `valor_total` y re-distribuye en la cuadrilla. Si `peso_confirmado` sigue `null`, `valor_total` permanece `null`. Si llega `cuadrilla`, se **reemplaza** completa; si no llega, solo se recalculan valores sobre la cuadrilla existente.

**Eliminar:** `DELETE /cosechas/{id}` — falla con 409 `COSECHA_EN_VIAJE` si la cosecha ya está asignada a un viaje.

### 3.2 Jornal de Palma (Plateo / Poda / Fertilización / Sanidad / Otros)

Endpoint unificado. El discriminador es `categoria + tipo`:

**Crear:** `POST /operaciones/{id}/jornales`

#### PLATEO
```json
{
  "categoria": "PALMA",
  "tipo": "PLATEO",
  "empleado_id": 10,
  "lote_id": 1,
  "sublote_id": 3,
  "cantidad_palmas": 200
}
```
- Precio por palma = `precios_palma.precio_palma` donde `tipo='PLATEO'`.
- `valor_total = cantidad_palmas × precio_palma`.

#### PODA
Idéntico a PLATEO pero con `tipo: "PODA"`.

#### FERTILIZACION
```json
{
  "categoria": "PALMA",
  "tipo": "FERTILIZACION",
  "empleado_id": 12,
  "lote_id": 2,
  "sublote_id": null,
  "cantidad_palmas": 300,
  "insumo_id": 5,
  "gramos_por_palma": 200
}
```
- `insumo_id` (dropdown "Tipo de Fertilizante", de `GET /insumos?estado=true`).
- `gramos_por_palma` corresponde al campo UI "Cantidad (gramos)".
- El precio se busca en `precio_abono` por rango que contenga `gramos_por_palma`. Si no hay rango configurado devuelve 422 `CALC_ERROR`.

#### SANIDAD
```json
{
  "categoria": "PALMA",
  "tipo": "SANIDAD",
  "empleado_id": 13,
  "lote_id": 1,
  "sublote_id": 3,
  "descripcion": "Aplicación preventiva de fungicida foliar"
}
```
- `descripcion` obligatoria (UI: "Trabajo Realizado").
- Si el tenant no tiene `precios_palma.precio_palma` configurado para SANIDAD (por defecto NULL), `valor_total` se guarda como `null`. Se activará cuando el admin configure el precio.

#### OTROS
```json
{
  "categoria": "PALMA",
  "tipo": "OTROS",
  "empleado_id": 14,
  "lote_id": 1,
  "sublote_id": 3,
  "nombre_trabajo": "Pintura de postes",
  "descripcion": "Pintura anticorrosiva en portería norte"
}
```
- `nombre_trabajo` obligatorio (UI: "Nombre").
- `descripcion` obligatoria (UI: "Labor Realizada").
- `valor_total` se maneja igual que SANIDAD (por defecto NULL hasta que se configure `precios_palma.OTROS`).

**Respuesta 201:**
```json
{
  "message": "Jornal creado correctamente",
  "data": {
    "id": 201,
    "operacion_id": 12,
    "empleado_id": 10,
    "categoria": "PALMA",
    "tipo": "PLATEO",
    "lote_id": 1,
    "sublote_id": 3,
    "cantidad_palmas": 200,
    "valor_unitario": "50.00",
    "valor_total": "10000.00",
    "estado": true,
    "empleado": { "id": 10, "primer_nombre": "...", "primer_apellido": "..." },
    "lote":     { "id": 1, "nombre": "Lote 1" },
    "sublote":  { "id": 3, "nombre": "Lote 1.1" }
  }
}
```

**Editar:** `PUT /jornales/{id}` — mismo payload que store. El backend recalcula `valor_unitario`/`valor_total`.

**Eliminar:** `DELETE /jornales/{id}` — bloquea con 409 si la operación está APROBADA.

---

## 4. Resumen (panel derecho del wizard)

`GET /operaciones/{id}/resumen`

**Respuesta:**
```json
{
  "data": {
    "fecha": "2026-04-17",
    "elaborado_por": "Carlos Rodríguez",
    "hubo_lluvia": true,
    "cantidad_lluvia": "12.50",
    "inicio_labores": "06:00:00",
    "estado": "BORRADOR",
    "labores": {
      "cosecha": 3,
      "plateo": 2,
      "poda": 1,
      "fertilizacion": 0,
      "sanidad": 0,
      "otros": 0,
      "auxiliares": 0
    }
  }
}
```

- Se recomienda llamar este endpoint **después de cada POST/DELETE** de tarjeta para refrescar el panel derecho.
- `auxiliares` representa Labores de Finca (paso 3, aún no expuesto); por ahora siempre es 0.

---

## 5. Aprobar planilla

`POST /operaciones/{id}/aprobar`

Sin body. Requiere permiso `operaciones.aprobar`.

**Respuesta:**
```json
{
  "message": "Planilla aprobada correctamente",
  "data": {
    "id": 12,
    "estado": "APROBADA",
    "aprobado_por": 3,
    "aprobado_at": "2026-04-17T18:32:10.000000Z",
    "aprobado_por_rel": { "id": 3, "name": "Carlos Rodríguez" }
  }
}
```

Tras aprobar:
- `PUT /operaciones/{id}`, `PUT /cosechas/{id}`, `PUT /jornales/{id}` → 409 `OPERACION_APROBADA`.
- `DELETE` de hijos → 409 `OPERACION_APROBADA`.
- `DELETE /operaciones/{id}` → 409 `OPERACION_APROBADA`.

---

## 6. Datos auxiliares para el wizard

Los dropdowns del wizard usan **endpoints `/select` dedicados** — livianos (solo campos necesarios), sin paginación y con permisos compatibles con un operador de campo (no requieren `*.ver` del módulo específico; basta con `operaciones.crear` u `operaciones.editar`).

| Dropdown | Endpoint | Filtros útiles |
|---|---|---|
| Colaboradores | `GET /colaboradores/select` | `?modalidad_pago=PRODUCCION`, `?predio_id={id}` |
| Lotes | `GET /lotes/select` | `?predio_id={id}` |
| Sublotes (tras elegir lote) | `GET /sublotes/select?lote_id={id}` | |
| Insumos (Tipo de Fertilizante) | `GET /insumos/select` | |

Todos devuelven `{ "data": [...] }` sin `meta`. Todos filtran `estado=true` por default; pasar `estado=false` para inactivos si se requiere (normalmente no en el wizard).

Detalles completos:
- [API_COLABORADORES.md §0](./API_COLABORADORES.md)
- [API_PLANTACION.md §2.0 y §3.0](./API_PLANTACION.md)

---

## 7. Flujo de ejemplo completo (cURL)

```bash
TOKEN="eyJ..."
TENANT="1"
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json")

# 1. Crear planilla
curl -X POST "$BASE/operaciones" "${H[@]}" -d '{
  "fecha": "2026-04-17",
  "hora_inicio": "06:00",
  "hubo_lluvia": true,
  "cantidad_lluvia": 12.5
}'
# → { "data": { "id": 12, ... } }

# 2. Agregar cosecha con cuadrilla (solo gajos — valor_total queda NULL)
curl -X POST "$BASE/operaciones/12/cosechas" "${H[@]}" -d '{
  "lote_id": 1, "sublote_id": 3, "gajos_reportados": 120,
  "cuadrilla": [{"empleado_id": 10}, {"empleado_id": 11}]
}'

# 2b. Luego, cuando llegan los kilos de báscula, actualizar peso_confirmado
#     → backend recalcula valor_total y re-distribuye en la cuadrilla.
curl -X PUT "$BASE/cosechas/55" "${H[@]}" -d '{"peso_confirmado": 1800.5}'

# 3. Agregar plateo
curl -X POST "$BASE/operaciones/12/jornales" "${H[@]}" -d '{
  "categoria": "PALMA", "tipo": "PLATEO",
  "empleado_id": 10, "lote_id": 1, "sublote_id": 3, "cantidad_palmas": 200
}'

# 4. Agregar fertilización
curl -X POST "$BASE/operaciones/12/jornales" "${H[@]}" -d '{
  "categoria": "PALMA", "tipo": "FERTILIZACION",
  "empleado_id": 12, "lote_id": 2, "cantidad_palmas": 300,
  "insumo_id": 5, "gramos_por_palma": 200
}'

# 5. Ver resumen (panel derecho)
curl "$BASE/operaciones/12/resumen" "${H[@]}"

# 6. Aprobar
curl -X POST "$BASE/operaciones/12/aprobar" "${H[@]}"
```

---

## 8. Recomendaciones de implementación frontend

- **Estado local del wizard:** mantén los ids de cada tarjeta creada (cosechas, jornales) para soportar edición/eliminación inline.
- **Re-fetch del resumen:** llama `GET /resumen` después de cada mutación exitosa. Es un endpoint barato (solo COUNT).
- **Validación previa en UI:** pre-valida los campos condicionales (ej. ocultar `insumo_id` fuera de Fertilización, exigir `nombre_trabajo` solo en Otros) para reducir 422 del backend.
- **Manejo de 409 `OPERACION_APROBADA`:** si aparece, desactiva todos los botones de edición y muestra un banner "Planilla aprobada (solo lectura)".
- **Fecha única por tenant:** si `fecha.unique` devuelve 422, el usuario está intentando crear una planilla que ya existe — redirígelo a abrir la existente.
- **Offline / PWA (futuro):** los modelos ya tienen `sync_uuid` + `sync_estado`; cuando se habilite la PWA, el cliente podrá generar el UUID localmente y enviarlo.

---

## 9. Referencias cruzadas

- Modelo de datos y discriminador `categoria/tipo`: [LABORES_JORNALES.md](./LABORES_JORNALES.md).
- Razón de la tabla `precios_palma`: [PRECIOS_PALMA.md](./PRECIOS_PALMA.md).
- Reglas de nómina afectadas por las ausencias (paso 4): ver `CONTEXTO.md` §6.9.
