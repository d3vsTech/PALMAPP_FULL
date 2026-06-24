# API — Módulo Terceros y Operarios

## Índice
1. [Concepto del módulo](#1-concepto-del-módulo)
2. [Esquema de tablas](#2-esquema-de-tablas)
3. [Lógica de fallback de precios](#3-lógica-de-fallback-de-precios)
4. [CRUD Terceros](#4-crud-terceros)
5. [CRUD Operarios (anidado)](#5-crud-operarios-anidado)
6. [Configuración de precios del Tercero](#6-configuración-de-precios-del-tercero)
   - 6.1 [Wizard de creación — init sin tercero](#61-wizard-de-creación--init-sin-tercero)
7. [Operarios en el Wizard de Operaciones](#7-operarios-en-el-wizard-de-operaciones)
8. [Payloads modificados: Jornales y Cosechas](#8-payloads-modificados-jornales-y-cosechas)
9. [Códigos de error nuevos](#9-códigos-de-error-nuevos)

---

## 1. Concepto del módulo

Las fincas pueden contratar **terceros** (empresas o personas naturales contratistas) cuyos **operarios** realizan las mismas labores que los colaboradores propios (cosecha, plateo, poda, fertilización, sanidad, finca), pero con **precios diferenciados por tercero**.

```
Tercero (ej. "Contratistas del Norte SAS")
 └─ Operario: Carlos Ramírez
 └─ Operario: Luis Torres
    [precios override opcionales]
    ├─ tercero_labor_precios  → precio diferente para cada Labor del catálogo
    ├─ tercero_precios_cosecha → precio por kg diferente por lote+año
    └─ tercero_precio_abono   → escalas de gramos→precio diferentes
```

Un jornal o registro de cosecha es asignado a un **empleado propio** O a un **operario de tercero** (nunca ambos).

---

## 2. Esquema de tablas

| Tabla | Descripción |
|---|---|
| `terceros` | Empresa/persona natural contratista |
| `operarios` | Trabajadores del tercero |
| `tercero_labor_precios` | Override de precio por labor (vs `labores.precio_palma`) |
| `tercero_precios_cosecha` | Override de precio de cosecha por lote+año (vs `precios_cosecha`) |
| `tercero_precio_abono` | Override de escala gramos→precio abono (vs `precio_abono`) |

**Cambios en tablas existentes:**
- `jornales`: `empleado_id` ahora es nullable, añadidos `operario_id` y `tercero_id`
- `cosecha_cuadrilla`: mismo patrón XOR — `empleado_id` nullable, añadidos `operario_id` y `tercero_id`
- `tercero_labor_precios`: añadida columna `tipo_pago` (`POR_PALMA|JORNAL_FIJO|NULL`). `NULL` hereda del tenant; con valor sobrescribe el modo de pago para ese tercero+labor.

**Regla XOR:** Exactamente uno de `empleado_id` u `operario_id` debe estar presente (nunca ambos, nunca ninguno).

---

## 3. Lógica de fallback de precios

### Labores (plateo, poda, sanidad, labores custom)
```
1. ¿Hay precio en tercero_labor_precios (tercero_id, labor_id, estado=true)? → usar ese
2. Fallback: labor.precio_palma del tenant                                   → usar ese
3. Si aún NULL → valor_total queda NULL (igual que colaboradores sin precio configurado)
```

**Override de `tipo_pago` por tercero.** `tercero_labor_precios.tipo_pago` es **nullable**:
- `NULL` → hereda el `tipo_pago` del catálogo del tenant (`labores.tipo_pago`).
- `'POR_PALMA'` / `'JORNAL_FIJO'` → override explícito; el modo de pago efectivo para jornales de operarios de ese tercero+labor es éste, **no** el del tenant.

Resolución vía `Labor::resolverTipoPago(?int $terceroId): string`. Aplica tanto a labores normales como a la labor fija COSECHA. **FINCA** rechaza override a `POR_PALMA` por invariante del modelo.

### Fertilización (POR_PALMA)
```
1. ¿Hay rango en tercero_precio_abono (tercero_id, gramos_min≤g≤gramos_max, estado=true)? → usar ese
2. Fallback: precio_abono tenant (mismo rango)                               → usar ese
3. Si no hay rango → lanza 422 CALC_ERROR
```

### Cosecha (POR_PALMA)
```
1. ¿Hay precio en tercero_precios_cosecha (tercero_id, lote_id, anio)?       → usar ese
2. Fallback: precios_cosecha tenant (lote_id, anio)                          → usar ese
3. Si NULL con peso confirmado → lanza 422 CALC_ERROR
```

---

## 4. CRUD Terceros

**Permiso:** `configuracion.editar` (todos los endpoints de terceros y operarios viven en Configuración)

Los dos endpoints `/select` también aceptan `operaciones.crear` u `operaciones.editar` para que operadores del wizard puedan poblar los dropdowns sin acceso a Configuración.

### GET `/api/v1/tenant/terceros`

Lista paginada de terceros.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `tipo_persona` | `JURIDICA\|NATURAL` | Filtrar por tipo |
| `estado` | `boolean` | Filtrar por estado |
| `search` | `string` | Busca en razón social, nombre completo, NIT, cédula |
| `per_page` | `integer` | Default 15 |

### GET `/api/v1/tenant/terceros/select`

Select para dropdowns. Devuelve solo activos.

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo_persona": "JURIDICA",
      "nombre_display": "Contratistas del Norte SAS",
      "documento": "900123456-7"
    }
  ]
}
```

### GET `/api/v1/tenant/terceros/{tercero}`

Detalle de un tercero (incluye `operarios_count`).

### POST `/api/v1/tenant/terceros`

**Campos por `tipo_persona`:**

**JURIDICA:**
```json
{
  "tipo_persona": "JURIDICA",
  "nit": "900123456-7",
  "razon_social": "Contratistas del Norte SAS",
  "representante": "Juan García",
  "nombre_comercial": "Contratistas Norte",
  "telefono": "3001234567",
  "email": "contacto@contratistas.com"
}
```

**NATURAL:**
```json
{
  "tipo_persona": "NATURAL",
  "cedula": "12345678",
  "nombre_completo": "Pedro Rodríguez López",
  "nombre_comercial": "Pedro Contratista",
  "telefono": "3009876543"
}
```

### PUT `/api/v1/tenant/terceros/{tercero}`

Mismos campos que POST, todos opcionales.

### DELETE `/api/v1/tenant/terceros/{tercero}`

Devuelve `409 TERCERO_CON_OPERARIOS` si tiene operarios asociados.

### PATCH `/api/v1/tenant/terceros/{tercero}/toggle`

Activa/desactiva el tercero.

---

## 5. CRUD Operarios (anidado)

**Permiso:** `configuracion.editar` (igual que Terceros)

### GET `/api/v1/tenant/terceros/{tercero}/operarios`

Lista todos los operarios del tercero.

### GET `/api/v1/tenant/terceros/{tercero}/operarios/select`

Select para dropdown (solo activos del tercero).

### GET `/api/v1/tenant/operarios/select`

Select **standalone** con todos los operarios activos del tenant (para el wizard de operaciones).

**Respuesta:**
```json
{
  "data": [
    {
      "id": 5,
      "tercero_id": 1,
      "nombre_completo": "Carlos Ramírez Gómez",
      "cedula": "87654321",
      "tercero_nombre": "Contratistas del Norte SAS"
    }
  ]
}
```

### POST `/api/v1/tenant/terceros/{tercero}/operarios`

```json
{
  "nombres": "Carlos",
  "apellidos": "Ramírez Gómez",
  "cedula": "87654321",
  "cargo": "Cosechero",
  "eps": "Sura",
  "arl": "Positiva"
}
```

> **Nota:** `eps` y `arl` se almacenan como texto (igual que en Empleado), no como FKs.

### PUT `/api/v1/tenant/terceros/{tercero}/operarios/{operario}`

Mismos campos que POST, todos opcionales (`sometimes`).

### DELETE `/api/v1/tenant/terceros/{tercero}/operarios/{operario}`

Devuelve `409 OPERARIO_CON_JORNALES` si el operario tiene jornales o registros de cosecha.

### PATCH `/api/v1/tenant/terceros/{tercero}/operarios/{operario}/toggle`

Activa/desactiva el operario. Invalida el caché del wizard.

---

## 6. Configuración de precios del Tercero

**Permiso:** `configuracion.editar`

### 6.1 Wizard de creación — init sin tercero

### GET `/api/v1/tenant/terceros/wizard-init`

Bundle de contexto para los **pasos 2 y 3 del wizard de creación** de un tercero. Se llama sin `tercero_id` (antes de crearlo o inmediatamente después de step 1).

**Respuesta:**
```json
{
  "data": {
    "labores_contexto": [
      { "id": 1, "nombre": "Plateo",             "categoria": "PALMA", "tipo": "PLATEO",  "tipo_pago": "POR_PALMA",   "precio_palma": "50.00",    "es_sistema": true  },
      { "id": 2, "nombre": "Poda",               "categoria": "PALMA", "tipo": "PODA",    "tipo_pago": "POR_PALMA",   "precio_palma": "45.00",    "es_sistema": true  },
      { "id": 3, "nombre": "Sanidad",            "categoria": "PALMA", "tipo": "SANIDAD", "tipo_pago": "JORNAL_FIJO", "precio_palma": "80000.00", "es_sistema": true  },
      { "id": 9, "nombre": "Aplicación foliar",  "categoria": "PALMA", "tipo": null,      "tipo_pago": "POR_PALMA",   "precio_palma": "70.00",    "es_sistema": false },
      { "id": 7, "nombre": "Reparación portón",  "categoria": "FINCA", "tipo": null,      "tipo_pago": "JORNAL_FIJO", "precio_palma": "50000.00", "es_sistema": false },
      { "id": 8, "nombre": "Transporte interno", "categoria": "FINCA", "tipo": null,      "tipo_pago": "JORNAL_FIJO", "precio_palma": "40000.00", "es_sistema": false }
    ],
    "lotes_contexto": [
      {
        "id": 1,
        "nombre": "Lote 1 – Norte",
        "sublotes": [{ "id": 1, "nombre": "Sublote A", "estado": true }]
      }
    ],
    "precios_abono_referencia": [
      { "gramos_min": "0.00", "gramos_max": "500.00", "precio_palma": "50.00", "estado": true }
    ],
    "anio_actual": 2026,
    "eps": [{ "id": 1, "nombre": "Sura" }],
    "arl": [{ "id": 1, "nombre": "Positiva" }]
  }
}
```

> - **`labores_contexto`**: labores activas de TODAS las categorías (PALMA + FINCA), **excluyendo COSECHA y FERTILIZACION** (esas tienen sus flujos dedicados: `precios-cosecha` y `precios-abono`). Cada item trae `categoria` para que el frontend agrupe en dos sub-secciones (Labores de Palma + Labores de Finca). Ordenado por `categoria, nombre`.
> - **Labores FINCA**: siempre `tipo_pago = JORNAL_FIJO` (invariante del modelo `Labor::booted()`). El admin asigna un `precio_palma` plano por labor; el frontend NO debe mostrar selector de modo de pago para FINCA.
> - `lotes_contexto`: lotes activos del tenant con sus sublotes (eager-loaded).
> - `precios_abono_referencia`: escalas globales del tenant como punto de referencia visual para el admin.
> - `anio_actual`: año corriente; usado por el frontend al guardar precios de cosecha sin año explícito.
> - `eps` / `arl`: catálogos para los dropdowns del paso 3 (Operarios). El frontend envía el `nombre` (string), no el `id`.

**Flujo del wizard:**
```
Step 1: POST /terceros                    → crea tercero, devuelve {id}
Step 2: GET  /terceros/wizard-init        → context (labores PALMA+FINCA, lotes+sublotes, abono ref, eps, arl)
        POST /terceros/{id}/precios-cosecha (sin anio → año actual)        × N lotes
        POST /terceros/{id}/precios-abono                                  × N rangos
        POST /terceros/{id}/labor-precios  (labores PALMA, opcional tipo_pago)  × N labores palma
        POST /terceros/{id}/labor-precios  (labores FINCA, sin tipo_pago)       × N labores finca
Step 3: POST /terceros/{id}/operarios     × N operarios
```

> **Sobre labores FINCA en el wizard:** son las mismas labores del catálogo del tenant — un colaborador propio las cobra a `labor.precio_palma`, pero un operario del tercero puede cobrarlas a un valor distinto si se configura el override aquí. Si el admin no asigna precio FINCA durante el wizard, no se crea fila en `tercero_labor_precios` y el cálculo cae al precio del tenant cuando opere ese tercero (comportamiento por defecto, sin "limbo").

---

### GET `/api/v1/tenant/terceros/{tercero}/configuracion/init`

Bundle completo para la **pantalla de edición** de precios de un tercero ya existente. Ahora incluye `eps` y `arl` para el panel de Operarios.

**Respuesta:**
```json
{
  "data": {
    "tercero": { ... },
    "labor_precios": [
      { "id": 1, "labor_id": 3, "tipo_pago": "POR_PALMA", "precio_palma": "60.00", "estado": true },
      { "id": 2, "labor_id": 7, "tipo_pago": null,        "precio_palma": "60000.00", "estado": true }
    ],
    "precios_cosecha": [
      { "id": 1, "lote_id": 2, "anio": 2024, "precio": "180.00" }
    ],
    "precios_abono": [
      { "id": 1, "gramos_min": "0.00", "gramos_max": "150.00", "precio_palma": "55.00", "estado": true }
    ],
    "labores_contexto": [
      { "id": 3, "nombre": "Sanidad",          "categoria": "PALMA", "tipo": "SANIDAD", "tipo_pago": "JORNAL_FIJO", "precio_palma": "80000.00" },
      { "id": 7, "nombre": "Reparación portón","categoria": "FINCA", "tipo": null,      "tipo_pago": "JORNAL_FIJO", "precio_palma": "50000.00" }
    ],
    "lotes_contexto": [
      { "id": 1, "nombre": "Lote 1 – Norte", "sublotes": [{ "id": 1, "nombre": "Sublote A" }] }
    ],
    "eps": [{ "id": 1, "nombre": "Sura" }],
    "arl": [{ "id": 1, "nombre": "Positiva" }]
  }
}
```

> - `labores_contexto` incluye labores PALMA y FINCA del tenant (excluye solo COSECHA — ese flujo es por `precios_cosecha`). Cada item trae `categoria` para que el frontend agrupe.
> - `labor_precios` lista los overrides existentes del tercero. Cada item trae `tipo_pago` que puede ser `POR_PALMA` / `JORNAL_FIJO` (override explícito) o `null` (solo override de monto, hereda el modo del catálogo).
> - La UI usa `labores_contexto` para mostrar el catálogo completo del tenant (con `precio_palma` por defecto) junto al override del tercero (`labor_precios`). Si una labor del catálogo no está en `labor_precios`, significa "sin override → usa precio y modo del tenant".

### POST `/api/v1/tenant/terceros/{tercero}/labor-precios`

Crea o actualiza el precio override de una labor para el tercero (upsert por `(tenant_id, tercero_id, labor_id)`). Aplica tanto a labores **PALMA** como **FINCA**.

**Ejemplo — labor PALMA con cambio de modo de pago:**
```json
{ "labor_id": 3, "tipo_pago": "POR_PALMA", "precio_palma": 60.00 }
```

**Ejemplo — labor FINCA (sin `tipo_pago`):**
```json
{ "labor_id": 7, "precio_palma": 60000.00 }
```

**Ejemplo — labor PALMA solo override de monto (hereda modo del tenant):**
```json
{ "labor_id": 3, "precio_palma": 55.00 }
```

**Campos:**
- `labor_id` (requerido): id de la labor — puede ser de categoría PALMA o FINCA, fija o custom.
- `precio_palma` (requerido): valor del override.
- `tipo_pago` (opcional, `POR_PALMA` | `JORNAL_FIJO` | omitir / `null`):
  - **Omitido o `null`** → el override solo cambia el monto. El modo de pago efectivo lo hereda del catálogo del tenant (`labor.tipo_pago`).
  - **`POR_PALMA` / `JORNAL_FIJO`** → override explícito del modo. Permite que un tercero pague una labor PALMA en un modo distinto al del tenant.

**Validaciones:**
- `POR_PALMA` para una labor de categoría `FINCA` → **422** (`"FINCA solo admite JORNAL_FIJO"`). FINCA siempre es JORNAL_FIJO por invariante del modelo.
- `labor_id` debe existir en el tenant.

### DELETE `/api/v1/tenant/terceros/{tercero}/labor-precios/{precio}`

Elimina el override — el sistema vuelve a usar el precio del tenant para esa labor.

### POST `/api/v1/tenant/terceros/{tercero}/precios-cosecha`

Upsert de precio de cosecha por lote y año.

```json
{ "lote_id": 2, "anio": 2024, "precio": 180.00 }
```

> `anio` es **opcional** — si se omite, el backend usa el año actual (`now()->year`). El wizard de creación lo omite siempre y trabaja con el año corriente.

### DELETE `/api/v1/tenant/terceros/{tercero}/precios-cosecha/{precio}`

### POST `/api/v1/tenant/terceros/{tercero}/precios-abono`

Crea una escala de gramos. Valida solapamiento de rangos dentro del mismo tercero.

```json
{ "gramos_min": 0, "gramos_max": 150, "precio_palma": 55.00 }
```

Devuelve `409 RANGO_SOLAPADO` si el rango se cruza con uno existente.

### PUT `/api/v1/tenant/terceros/{tercero}/precios-abono/{precio}`

Actualiza una escala. Valida solapamiento excluyendo el registro actual.

### DELETE `/api/v1/tenant/terceros/{tercero}/precios-abono/{precio}`

---

## 7. Operarios en el Wizard de Operaciones

El endpoint `GET /api/v1/tenant/operaciones/wizard-init` incluye ahora la clave `operarios` en `parametricas`:

```json
{
  "data": {
    "planilla": null,
    "resumen": null,
    "parametricas": {
      "colaboradores": [ ... ],
      "operarios": [
        {
          "id": 5,
          "tercero_id": 1,
          "nombre_completo": "Carlos Ramírez Gómez",
          "cedula": "87654321",
          "tercero_nombre": "Contratistas del Norte SAS"
        }
      ],
      "lotes": [ ... ],
      "labores_palma": [ ... ],
      ...
    }
  }
}
```

La UI muestra `colaboradores` y `operarios` en el **mismo dropdown** diferenciados visualmente por `tercero_nombre`.

---

## 8. Payloads modificados: Jornales y Cosechas

### POST/PUT `/api/v1/tenant/operaciones/{operacion}/jornales`

`empleado_id` ahora es **nullable**. Debe enviarse **exactamente uno** de `empleado_id` u `operario_id`:

**Jornal de colaborador (comportamiento anterior, sin cambios):**
```json
{
  "empleado_id": 10,
  "labor_id": 3,
  "cantidad_palmas": 100
}
```

**Jornal de operario (nuevo):**
```json
{
  "operario_id": 5,
  "labor_id": 3,
  "cantidad_palmas": 100
}
```

> El `tercero_id` se inyecta automáticamente en el backend a partir del `operario_id`. No es necesario enviarlo.

**Validación XOR:** Si se envían ambos o ninguno → `422` con error en `empleado_id`.

### POST `/api/v1/tenant/operaciones/{operacion}/cosechas`

Cada miembro de `cuadrilla` también soporta XOR:

**Cuadrilla mixta (empleados y operarios):**
```json
{
  "lote_id": 2,
  "sublote_id": 4,
  "gajos_reportados": 120,
  "peso_confirmado": 2750.5,
  "cuadrilla": [
    { "empleado_id": 10 },
    { "empleado_id": 11 },
    { "operario_id": 5 },
    { "operario_id": 6 }
  ]
}
```

> El precio de cosecha usado para el cálculo se deriva del primer `tercero_id` encontrado en la cuadrilla. Para cosechas 100% de operarios del mismo tercero, se usa el precio configurado en `tercero_precios_cosecha` (fallback al precio del tenant).

### PUT `/api/v1/tenant/cosechas/{cosecha}`

Mismo cambio en `cuadrilla`: `empleado_id` nullable, añadido `operario_id`.

---

## 9. Códigos de error nuevos

| Código | HTTP | Descripción |
|---|---|---|
| `TERCERO_CON_OPERARIOS` | 409 | Intento de eliminar tercero con operarios activos |
| `OPERARIO_CON_JORNALES` | 409 | Intento de eliminar operario con jornales o cosechas |
| `RANGO_SOLAPADO` | 409 | Rango de gramos_abono se cruza con uno existente del mismo tercero |
| `CALC_ERROR` | 422 | No se encontró precio configurado para calcular el valor del jornal/cosecha |
