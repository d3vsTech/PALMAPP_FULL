# API — Operaciones (Planilla del Día)

> Guía para el frontend. Cubre el wizard de 5 pasos para crear una Planilla del Día. **Alcance actual:** Paso 1 (Información General) + Paso 2 (Labores de Palma) + Paso 3 (Labores de Finca) + Paso 4 (Horas Extras) + Paso 5 (Finalización — con Ausencias integradas).

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
- `OPERACION_CON_HIJOS` (409) — intento de eliminar planilla con jornales/cosechas/ausencias/horas extras.
- `COSECHA_EN_VIAJE` (409) — cosecha está asignada a un viaje.
- `CALC_ERROR` (422) — error de cálculo (falta precio configurado, insumo sin rango en precio_abono, `precios_cosecha` sin registro para el lote+año cuando se envía `peso_confirmado`, o empleado sin `salario_base` y tenant sin SMLV al registrar hora extra).
- `AUSENCIA_LIQUIDADA` (409) — intento de editar/eliminar una ausencia ya liquidada en nómina.
- `AUSENCIA_ESTADO_INVALIDO` (409) — intento de aprobar/rechazar una ausencia que no está en PENDIENTE.
- `MOTIVO_CON_AUSENCIAS` (409) — intento de eliminar un motivo de ausencia que tiene ausencias asociadas.
- `HORA_EXTRA_LIQUIDADA` (409) — intento de editar/eliminar una hora extra ya liquidada en nómina.
- `HORA_EXTRA_ESTADO_INVALIDO` (409) — intento de aprobar/rechazar una hora extra que no está en PENDIENTE.
- `TIPO_HORA_EXTRA_CON_REGISTROS` (409) — intento de eliminar un tipo paramétrico de hora extra con registros asociados.
- `INSUMO_DUPLICADO` (409) — al crear un insumo desde el wizard ya existe uno con el mismo `nombre` en el tenant. El front debe pedir al usuario que lo seleccione del dropdown en lugar de crearlo.
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
┌ Paso 3 — Labores de Finca ────────────────────────────┐
│  POST /operaciones/{id}/jornales (categoria=FINCA)    │
│  Eliminar/Editar: DELETE|PUT /jornales/{id}           │
└───────────────────────────────────────────────────────┘
            │
┌ Paso 4 — Horas Extras ────────────────────────────────┐
│  POST /operaciones/{id}/horas-extra                   │
│  Eliminar/Editar: DELETE|PUT /horas-extra/{id}        │
│  Aprobar/Rechazar: POST /horas-extra/{id}/aprobar|rechazar│
└───────────────────────────────────────────────────────┘
            │
┌ Paso 5 — Finalización (con Ausencias) ────────────────┐
│  Ausencias:                                           │
│  POST /operaciones/{id}/ausencias                     │
│  Eliminar/Editar: DELETE|PUT /ausencias/{id}          │
│  Aprobar/Rechazar: POST /ausencias/{id}/aprobar|rechazar│
│  Subir soporte:   POST /ausencias/{id}/documento       │
│                                                        │
│  Cerrar planilla:                                     │
│  POST /operaciones/{id}/aprobar → estado APROBADA, inmutable │
└────────────────────────────────────────────────────────┘
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

- El **peso confirmado** son los kilos reales pesados. Es **opcional al crear la tarjeta** desde la planilla diaria. Si el supervisor ya tiene los kilos (ej. pesó en báscula interna), puede enviarlos al crear y el cálculo se hace inmediatamente — no hay que esperar al viaje.
- `valor_total = peso_confirmado × precios_cosecha.precio`. El cálculo se dispara tanto al crear (POST con `peso_confirmado`) como al editar (PUT agregando/cambiando `peso_confirmado`).
- Si la tarjeta se crea únicamente con gajos, `valor_total = null` y se hidrata más adelante (cuando el peso se confirme vía edición o desde el módulo de Viajes).
- **Validación estricta:** si envías `peso_confirmado` y no existe registro en `precios_cosecha` para el lote+año de la operación, la respuesta es **422 `CALC_ERROR`**. Configura el precio primero, o crea la tarjeta solo con gajos.
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

> **Tip de UI — autofill de palmas:** al seleccionar `sublote_id` en el dropdown, pre-rellenar el input "Número de Palmas" con `sublote.cantidad_palmas`. Ese campo viene en el payload de `GET /operaciones/sublotes/select` (`{id, nombre, lote_id, cantidad_palmas}`). El input sigue siendo **editable** — el operador puede ajustarlo a la baja si solo trabajó una franja parcial del sublote. Al cambiar el "Lote" (que limpia el "Sublote"), también se debe limpiar "Número de Palmas". Aplica también a **PODA** y **FERTILIZACION**; no aplica a SANIDAD ni OTROS (esos jornales no usan `cantidad_palmas`).

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
- `insumo_id` (dropdown "Tipo de Fertilizante", de `GET /insumos/select` — ver §8). El catálogo vive en la tabla `insumos` (modelo `App\Models\Insumo`); cada registro tiene `nombre`, `unidad_medida` y `estado`. El select solo devuelve los activos.
- `gramos_por_palma` corresponde al campo UI "Cantidad (gramos)".
- El precio se busca **server-side** en `precio_abono` por rango que contenga `gramos_por_palma` (no hay endpoint expuesto para `precio_abono` — el frontend nunca consulta los rangos). Si no hay rango configurado devuelve **422 `CALC_ERROR`**; el front puede manejarlo mostrando un mensaje "Configura el precio del abono para ese rango de gramos".

> **Crear fertilizante "on-the-fly" (opción "Otro" del dropdown):** cuando el operador elige **"Otro"** en el dropdown "Tipo de Fertilizante", el front muestra un input de texto y al guardar dispara `POST /operaciones/insumos` con `{ "nombre": "..." }`. La respuesta `201` trae `{id, nombre, unidad_medida}` (con `unidad_medida = "GRAMOS"` por default — el admin puede ajustarla luego desde el módulo de configuración). El front usa el `id` recién creado como `insumo_id` en el siguiente `POST /operaciones/{id}/jornales`. Si el nombre ya existe en el tenant, la respuesta es **409 `INSUMO_DUPLICADO`** y el front debe pedir al usuario que lo seleccione del dropdown.
>
> ```bash
> curl -X POST "$BASE/operaciones/insumos" "${H[@]}" -d '{"nombre": "Urea 46%"}'
> # → 201 { "data": { "id": 8, "nombre": "Urea 46%", "unidad_medida": "GRAMOS" } }
> ```
>
> Permisos del endpoint: `operaciones.crear` u `operaciones.editar` (igual que el resto de selects auxiliares del wizard). El `POST /insumos` admin sigue siendo otro endpoint separado bajo `configuracion.editar`, que requiere también `unidad_medida`.

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
- **No enviar `cantidad_palmas`** — SANIDAD se paga como monto fijo por jornal. Si llega, el backend responde 422.
- `valor_total = precios_palma.precio_palma` (valor plano, sin multiplicar). `valor_unitario` es el mismo precio.
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
- **No enviar `cantidad_palmas`** — OTROS se paga como monto fijo por jornal. Si llega, el backend responde 422.
- `valor_total = precios_palma.precio_palma` (valor plano, sin multiplicar). Se maneja igual que SANIDAD: por defecto NULL hasta que se configure `precios_palma.OTROS`.

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

### 3.3 Labores de Finca (Paso 3)

Corresponde al Paso 3 del wizard ("Labores de Finca" — reparaciones, mantenimiento, pintura, transporte interno, etc.). Usa el **mismo endpoint unificado** de jornales con `categoria=FINCA` y `labor_id` apuntando al catálogo editable por el tenant.

**Crear:** `POST /operaciones/{id}/jornales`

```json
{
  "categoria": "FINCA",
  "labor_id": 7,
  "empleado_id": 10,
  "ubicacion": "Portería norte",
  "observacion": null
}
```

Reglas:
- `labor_id` es **obligatorio** (viene de `GET /labores/select`).
- `empleado_id` viene de `GET /colaboradores/select`.
- `ubicacion` (texto libre, máx. 255) corresponde al campo UI "Lugar".
- **Prohibidos** en FINCA: `tipo`, `lote_id`, `sublote_id`, `cantidad_palmas`, `insumo_id`, `gramos_por_palma`, `descripcion`, `nombre_trabajo`, `horas_extra` (validación 422 si llegan).

Cálculo (centralizado en `JornalCalculationService::calcularFinca()`):
- `valor_unitario = labor.valor_base`
- `valor_total   = labor.valor_base`

**Respuesta 201:**
```json
{
  "message": "Jornal creado correctamente",
  "data": {
    "id": 342,
    "operacion_id": 12,
    "empleado_id": 10,
    "categoria": "FINCA",
    "tipo": null,
    "labor_id": 7,
    "ubicacion": "Portería norte",
    "valor_unitario": "50000.00",
    "valor_total": "50000.00",
    "estado": true,
    "empleado": { "id": 10, "primer_nombre": "...", "primer_apellido": "..." },
    "labor":    { "id": 7, "nombre": "Reparación portón" }
  }
}
```

**Editar:** `PUT /jornales/{id}` — mismo payload. Si cambia `labor_id`, el backend recalcula `valor_total` con el `valor_base` de la nueva labor.

**Eliminar:** `DELETE /jornales/{id}` — bloquea con 409 `OPERACION_APROBADA` si la planilla ya fue aprobada.

**Mapeo UI ↔ API (ver tarjeta del wizard "Labores de Finca"):**

| Campo UI | Origen | Campo en el jornal |
|---|---|---|
| Nombre (colaborador) | `GET /colaboradores/select` | `empleado_id` |
| Labor | `GET /labores/select` | `labor_id` |
| Lugar | input texto libre | `ubicacion` |
| Total | front lo precalcula con `valor_base` del select; el backend lo confirma en la respuesta | `valor_total` |

---

## 4. Paso 4 — Horas Extras

El wizard registra horas extras del día con una UI de 4 campos: tipo de hora, número de horas, colaborador y observación. Los 7 tipos legales colombianos vienen precargados en el catálogo paramétrico `tipos_hora_extra` (ver [API_HORAS_EXTRA.md §1](./API_HORAS_EXTRA.md)).

### 4.1 Crear hora extra

`POST /operaciones/{id}/horas-extra`

**Request (payload del wizard):**
```json
{
  "empleado_id": 10,
  "tipo_hora_extra_id": 1,
  "cantidad_horas": 2,
  "observacion": "Cierre de lote tras lluvia"
}
```

Reglas:
- `empleado_id`, `tipo_hora_extra_id`, `cantidad_horas` son obligatorios.
- `cantidad_horas` rango 0.25–12.
- `tipo_hora_extra_id` viene de `GET /tipos-hora-extra/select`.
- El backend **snapshottea** `codigo`, `porcentaje_recargo`, `paga_hora_completa` del tipo al crear; cambios posteriores al tipo paramétrico no afectan registros históricos.
- `valor_hora_base = empleado.salario_base / tenant_config.divisor_jornada_mensual` (240 por default, configurable por tenant a 210 — ver [API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md)). Fallback a `tenant_config.salario_minimo_vigente` si el empleado no tiene salario_base. Si ambos son null → 422 `CALC_ERROR`.
- `valor_calculado = cantidad_horas × valor_hora_base × (1 + porcentaje_recargo/100)` si `paga_hora_completa=true`; si es `false` (RN, RND) solo se paga el recargo: `cantidad_horas × valor_hora_base × (porcentaje_recargo/100)`.
- Estado inicial: `PENDIENTE`.

**Respuesta 201:**
```json
{
  "message": "Hora extra registrada correctamente",
  "data": {
    "id": 77,
    "operacion_id": 12,
    "empleado_id": 10,
    "tipo_hora_extra_id": 1,
    "codigo": "HED",
    "porcentaje_recargo": "25.00",
    "paga_hora_completa": true,
    "cantidad_horas": "2.00",
    "valor_hora_base": "6250.00",
    "valor_calculado": "15625.00",
    "estado": "PENDIENTE",
    "empleado": { "id": 10, "primer_nombre": "…", "primer_apellido": "…" },
    "tipoHoraExtra": { "id": 1, "codigo": "HED", "nombre": "Hora Extra Diurna (6am-9pm)", "porcentaje_recargo": "25.00" }
  }
}
```

### 4.2 Editar hora extra

`PUT /horas-extra/{id}` — campos opcionales (`sometimes`). Si cambia `empleado_id`, `tipo_hora_extra_id` o `cantidad_horas`, el backend re-snapshotea y recalcula `valor_calculado`.

- 409 `OPERACION_APROBADA` si la planilla está APROBADA.
- 409 `HORA_EXTRA_LIQUIDADA` si el registro ya fue liquidado en nómina.

### 4.3 Eliminar hora extra

`DELETE /horas-extra/{id}` — falla con 409 si la planilla está APROBADA o si la hora extra está LIQUIDADA.

### 4.4 Aprobar / Rechazar

Endpoints administrativos que funcionan **incluso con la planilla APROBADA** (flujo de decisión independiente del cierre de planilla).

`POST /horas-extra/{id}/aprobar` — sin body. Pasa de `PENDIENTE` → `APROBADA`. Graba `aprobado_por` y `aprobado_at`.

`POST /horas-extra/{id}/rechazar`
```json
{ "motivo_rechazo": "No fue autorizada previamente por el supervisor" }
```
Pasa de `PENDIENTE` → `RECHAZADA`. `motivo_rechazo` requerido (máx. 500 chars).

Ambos devuelven 409 `HORA_EXTRA_ESTADO_INVALIDO` si no están en `PENDIENTE`.

### 4.5 Mapeo UI ↔ API (tarjeta del wizard "Horas Extras")

| Campo UI | Origen | Campo en el registro |
|---|---|---|
| Tipo de Hora | `GET /tipos-hora-extra/select` | `tipo_hora_extra_id` |
| Número de Horas | input numeric | `cantidad_horas` |
| Colaborador | `GET /colaboradores/select` | `empleado_id` |
| Observación | input texto libre | `observacion` |

La documentación completa del módulo (catálogo, máquina de estados, integración con nómina, fórmulas legales) está en [API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).

---

## 5. Paso 5 — Finalización (con Ausencias integradas)

El Paso 5 del wizard combina la gestión de ausencias del día con el botón de cierre de planilla. El sub-panel de Ausencias usa los mismos endpoints documentados abajo.

### 5.1 Crear ausencia

`POST /operaciones/{id}/ausencias`

**Request (payload del wizard):**
```json
{
  "empleado_id": 10,
  "motivo_ausencia_id": 3,
  "motivo": "Reportó gripa fuerte. Enviará incapacidad mañana."
}
```

Reglas:
- `empleado_id` obligatorio. Viene de `GET /colaboradores/select`.
- `motivo_ausencia_id` obligatorio. Viene de `GET /motivos-ausencia/select`.
- `motivo` (texto libre) se mapea a la columna `motivo` — equivalente a "observación" en la UI.
- `fecha_inicio` **no se envía**: el backend la sincroniza con `operacion.fecha` automáticamente.
- `fecha_fin` opcional (default = `fecha_inicio`, ausencia de un solo día).
- Campos avanzados opcionales: `fecha_fin`, `entidad`, `numero_radicado`, `porcentaje_pago` — normalmente no los llena el wizard, los completa el admin desde otro módulo o vía PUT.
- Estado inicial: `PENDIENTE`.
- **Snapshot automático desde el motivo**: `tipo` (= `motivo.tipo_base`), `es_remunerada`, `afecta_nomina`, `porcentaje_pago` (= `motivo.porcentaje_pago_default`) se copian a la ausencia al crear. Si luego se edita el motivo del catálogo, las ausencias ya creadas **no cambian**.

**Respuesta 201:**
```json
{
  "message": "Ausencia registrada correctamente",
  "data": {
    "id": 77,
    "operacion_id": 12,
    "empleado_id": 10,
    "motivo_ausencia_id": 3,
    "tipo": "INCAPACIDAD_EPS",
    "fecha_inicio": "2026-04-17",
    "fecha_fin": "2026-04-17",
    "dias_calendario": 1,
    "es_remunerada": true,
    "afecta_nomina": true,
    "porcentaje_pago": "66.67",
    "estado": "PENDIENTE",
    "motivo": "Reportó gripa fuerte. Enviará incapacidad mañana.",
    "documento_soporte": null,
    "empleado":         { "id": 10, "primer_nombre": "...", "primer_apellido": "..." },
    "motivo_ausencia":  { "id": 3,  "nombre": "Incapacidad EPS - General", "tipo_base": "INCAPACIDAD_EPS" }
  }
}
```

### 5.2 Editar ausencia

`PUT /ausencias/{id}`

Acepta los mismos campos opcionales (`sometimes`). Solo válido si la ausencia está en `PENDIENTE` y la planilla no está aprobada.

- 409 `OPERACION_APROBADA` si la planilla está APROBADA.
- 409 `AUSENCIA_LIQUIDADA` si la ausencia ya se cerró en nómina.

### 5.3 Eliminar ausencia

`DELETE /ausencias/{id}` — falla con 409 si la planilla está APROBADA o si la ausencia está LIQUIDADA. Elimina también el archivo de soporte si existe.

### 5.4 Aprobar / Rechazar

Endpoints administrativos que funcionan **incluso con la planilla APROBADA** (flujo de decisión independiente del cierre de planilla).

`POST /ausencias/{id}/aprobar`

Sin body. Pasa de `PENDIENTE` → `APROBADA`. Graba `aprobado_por` y `aprobado_at`.

`POST /ausencias/{id}/rechazar`
```json
{
  "motivo_rechazo": "No llegó la incapacidad después de 5 días hábiles"
}
```
Pasa de `PENDIENTE` → `RECHAZADA`. `motivo_rechazo` requerido (máx. 500 chars).

Ambos devuelven 409 `AUSENCIA_ESTADO_INVALIDO` si la ausencia no está en `PENDIENTE`.

### 5.5 Subir documento soporte (PDF/imagen)

`POST /ausencias/{id}/documento` — multipart.

**Request (multipart form-data):**
```
documento: [archivo PDF/JPG/PNG, máx 5MB]
```

Guarda el archivo en `storage/app/tenants/{tenant_id}/ausencias/{ausencia_id}/{uuid}.{ext}` y persiste el path en `ausencia.documento_soporte`. Si ya había un soporte previo, se reemplaza.

**Permitido incluso con la planilla APROBADA** — útil para cuando el PDF de la EPS llega días después de aprobada la planilla. Solo se bloquea si la ausencia está `LIQUIDADA` (409 `AUSENCIA_LIQUIDADA`).

### 5.6 Estados y transiciones

```
        ┌───────── aprobar ────────▶ APROBADA ──(al cerrar nómina)──▶ LIQUIDADA
PENDIENTE
        └───────── rechazar ───────▶ RECHAZADA
```

| Acción | PENDIENTE | APROBADA | RECHAZADA | LIQUIDADA |
|---|---|---|---|---|
| PUT (editar datos) | ✔ | ❌ | ❌ | ❌ |
| DELETE | ✔ | ❌ | ✔ | ❌ |
| Aprobar | ✔ | — | ❌ | — |
| Rechazar | ✔ | — | ❌ | — |
| Subir documento | ✔ | ✔ | ✔ | ❌ |

Adicionalmente, cualquier mutación está bloqueada si `operacion.estado = APROBADA`, **salvo** aprobar/rechazar/documento.

### 5.7 Mapeo UI ↔ API (tarjeta del wizard "Ausencias")

| Campo UI | Origen | Campo en el jornal |
|---|---|---|
| Nombre (colaborador) | `GET /colaboradores/select` | `empleado_id` |
| Ausencia (motivo) | `GET /motivos-ausencia/select` | `motivo_ausencia_id` |
| Observación | input texto libre | `motivo` |

---

## 6. Resumen (panel derecho del wizard)

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
    },
    "ausencias": {
      "pendientes": 2,
      "aprobadas": 1,
      "rechazadas": 0,
      "liquidadas": 0,
      "total": 3
    },
    "horas_extra": {
      "pendientes": 1,
      "aprobadas": 2,
      "rechazadas": 0,
      "liquidadas": 0,
      "total": 3,
      "horas_totales": "8.50",
      "valor_total": "75000.00"
    }
  }
}
```

- Se recomienda llamar este endpoint **después de cada POST/DELETE** de tarjeta para refrescar el panel derecho.
- `auxiliares` representa la cantidad de Labores de Finca (jornales con `categoria=FINCA`) registradas en la planilla.
- El bloque `ausencias` se agrega por estado; `total` ya viene precalculado.
- El bloque `horas_extra` incluye además `horas_totales` (suma de `cantidad_horas`) y `valor_total` (suma de `valor_calculado`).

---

## 7. Aprobar planilla

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

## 8. Datos auxiliares para el wizard

Los dropdowns del wizard usan **endpoints `/select` dedicados** — livianos (solo campos necesarios), sin paginación y con permisos compatibles con un operador de campo (no requieren `*.ver` del módulo específico; basta con `operaciones.crear` u `operaciones.editar`).

> **No confundir con `predios/wizard-init`:** el endpoint bundle del wizard de Plantación (`GET /predios/{id}/wizard-init`) devuelve la jerarquía completa de un predio (lotes → sublotes → líneas) para el wizard de creación/edición de predios. El wizard de Operaciones **no debe usarlo** — los endpoints `/operaciones/lotes/select` y `/operaciones/sublotes/select` abajo son los correctos para el contexto de planillas, tienen permisos distintos y devuelven solo los campos necesarios para el dropdown.

| Dropdown | Endpoint | Filtros útiles |
|---|---|---|
| Colaboradores | `GET /colaboradores/select` | `?modalidad_pago=PRODUCCION`, `?predio_id={id}` |
| Lotes (wizard) | `GET /operaciones/lotes/select` | `?predio_id={id}`. Payload `{id, nombre, predio_id}`. **Endpoint dedicado al wizard** — solo requiere `operaciones.crear|editar` (no toca los permisos del módulo de Plantación). |
| Sublotes — tras elegir lote (wizard) | `GET /operaciones/sublotes/select?lote_id={id}` | Payload `{id, nombre, lote_id, cantidad_palmas}`. **`cantidad_palmas` se usa para autofill** del input "Número de Palmas" en las tarjetas PLATEO/PODA/FERTILIZACION del Paso 2. **Endpoint dedicado al wizard** — solo requiere `operaciones.crear|editar`. |
| Insumos (Tipo de Fertilizante) | `GET /insumos/select` | |
| **Crear insumo (opción "Otro")** | `POST /operaciones/insumos` | Body `{ "nombre": "..." }`. Para el flujo "Otro" del dropdown de FERTILIZACION. Devuelve `{id, nombre, unidad_medida}` (con `unidad_medida = "GRAMOS"` por default). **409 `INSUMO_DUPLICADO`** si el nombre ya existe en el tenant. |
| Labores de Finca | `GET /labores/select` | `?estado=false` para inactivas. Incluye `valor_base` en el payload. |
| Motivos de ausencia | `GET /motivos-ausencia/select` | `?estado=false` para inactivos. Incluye `tipo_base`, flags de nómina y `requiere_soporte`. |
| Tipos de hora extra | `GET /tipos-hora-extra/select` | `?estado=false` para inactivos. Incluye `codigo`, `porcentaje_recargo`, `franja_horaria`, `es_extra`, `paga_hora_completa`. |

Todos devuelven `{ "data": [...] }` sin `meta`. Todos filtran `estado=true` por default; pasar `estado=false` para inactivos si se requiere (normalmente no en el wizard).

> **Nota sobre Lotes / Sublotes:** existen dos endpoints separados a propósito.
> - `GET /lotes/select` y `GET /sublotes/select` siguen siendo los del módulo de **Plantación** (CRUD admin) y conservan sus permisos originales (`lotes.ver` / `sublotes.ver` + operaciones).
> - `GET /operaciones/lotes/select` y `GET /operaciones/sublotes/select` son **nuevos**, dedicados al wizard de Operaciones; solo requieren `operaciones.crear` u `operaciones.editar`. Devuelven el mismo payload que los anteriores. **El frontend del wizard debe consumir estos.**

Detalles completos:
- [API_COLABORADORES.md §0](./API_COLABORADORES.md)
- [API_PLANTACION.md §2.0 y §3.0](./API_PLANTACION.md)

---

## 9. Flujo de ejemplo completo (cURL)

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

# 4b. Agregar labor de finca (Paso 3) — valor_total = labor.valor_base
curl -X POST "$BASE/operaciones/12/jornales" "${H[@]}" -d '{
  "categoria": "FINCA", "labor_id": 7,
  "empleado_id": 10, "ubicacion": "Portería norte"
}'

# 5. Registrar una hora extra (Paso 4)
curl -X POST "$BASE/operaciones/12/horas-extra" "${H[@]}" -d '{
  "empleado_id": 10, "tipo_hora_extra_id": 1,
  "cantidad_horas": 2,
  "observacion": "Cierre de lote tras lluvia"
}'
# → { "data": { "id": 77, "codigo": "HED", "valor_calculado": "15625.00", "estado": "PENDIENTE", ... } }

# 5b. Aprobar la hora extra
curl -X POST "$BASE/horas-extra/77/aprobar" "${H[@]}"

# 6. Registrar una ausencia (Paso 5, Finalización)
curl -X POST "$BASE/operaciones/12/ausencias" "${H[@]}" -d '{
  "empleado_id": 10, "motivo_ausencia_id": 3,
  "motivo": "Reportó gripa; enviará incapacidad"
}'
# → { "data": { "id": 90, "estado": "PENDIENTE", ... } }

# 6b. Subir PDF de soporte de la EPS
curl -X POST "$BASE/ausencias/90/documento" "${H[@]}" \
  -F "documento=@/ruta/local/incapacidad.pdf"

# 6c. Aprobar la ausencia
curl -X POST "$BASE/ausencias/90/aprobar" "${H[@]}"

# 7. Ver resumen (panel derecho)
curl "$BASE/operaciones/12/resumen" "${H[@]}"

# 8. Aprobar planilla
curl -X POST "$BASE/operaciones/12/aprobar" "${H[@]}"
```

---

## 10. Recomendaciones de implementación frontend

- **Estado local del wizard:** mantén los ids de cada tarjeta creada (cosechas, jornales) para soportar edición/eliminación inline.
- **Re-fetch del resumen:** llama `GET /resumen` después de cada mutación exitosa. Es un endpoint barato (solo COUNT).
- **Validación previa en UI:** pre-valida los campos condicionales (ej. ocultar `insumo_id` fuera de Fertilización, exigir `nombre_trabajo` solo en Otros) para reducir 422 del backend.
- **Manejo de 409 `OPERACION_APROBADA`:** si aparece, desactiva todos los botones de edición y muestra un banner "Planilla aprobada (solo lectura)".
- **Fecha única por tenant:** si `fecha.unique` devuelve 422, el usuario está intentando crear una planilla que ya existe — redirígelo a abrir la existente.
- **Offline / PWA (futuro):** los modelos ya tienen `sync_uuid` + `sync_estado`; cuando se habilite la PWA, el cliente podrá generar el UUID localmente y enviarlo.

---

## 11. Referencias cruzadas

- Modelo de datos y discriminador `categoria/tipo`: [LABORES_JORNALES.md](./LABORES_JORNALES.md).
- Razón de la tabla `precios_palma`: [PRECIOS_PALMA.md](./PRECIOS_PALMA.md).
- Documentación dedicada de Ausencias (catálogo + endpoints): [API_AUSENCIAS.md](./API_AUSENCIAS.md).
- Documentación dedicada de Horas Extras (catálogo + endpoints + marco legal colombiano): [API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).
- Reglas de nómina afectadas por las ausencias (paso 5): ver `CONTEXTO.md` §6.9.
