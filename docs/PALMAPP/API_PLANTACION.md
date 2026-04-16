# API Plantación — Predios, Lotes, Sublotes y Palmas

> **Base URL:** `{{host}}/api/v1/tenant`
>
> **Headers requeridos en todas las peticiones:**
> ```
> Authorization: Bearer {jwt_token}
> X-Tenant-Id: {tenant_id}
> ```

---

## 1. Predios

### 1.1 Listar predios

```
GET /predios
```

**Query params:**

| Param      | Tipo    | Requerido | Descripción                          |
|------------|---------|-----------|--------------------------------------|
| `search`   | string  | No        | Busca por nombre (parcial)           |
| `estado`   | boolean | No        | Filtra por estado (`true` / `false`) |
| `per_page` | integer | No        | Registros por página (default: 15)   |
| `page`     | integer | No        | Número de página                     |

**Permiso:** `lotes.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "nombre": "Finca La Esperanza",
      "ubicacion": "Acacías, Meta",
      "latitud": "4.0000000",
      "longitud": "-73.7500000",
      "hectareas_totales": "150.00",
      "estado": true,
      "created_at": "2026-03-24T...",
      "updated_at": "2026-03-24T...",
      "lotes_count": 5,
      "palmas_count": 1850
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

**Campos agregados:**

| Campo | Descripción |
|-------|-------------|
| `lotes_count` | Total de lotes del predio |
| `palmas_count` | Total de palmas del predio (suma de `cantidad_palmas` de todos sus sublotes). Es `0` si el predio no tiene sublotes |

> Estos tres datos (`hectareas_totales`, `lotes_count`, `palmas_count`) son los que alimentan las tarjetas de resumen en el listado del frontend.

---

### 1.2 Ver predio

```
GET /predios/{id}
```

**Permiso:** `lotes.ver`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "tenant_id": 1,
    "nombre": "Finca La Esperanza",
    "ubicacion": "Acacías, Meta",
    "latitud": "4.0000000",
    "longitud": "-73.7500000",
    "hectareas_totales": "150.00",
    "estado": true,
    "created_at": "2026-03-24T...",
    "updated_at": "2026-03-24T...",
    "lotes": [
      {
        "id": 1,
        "nombre": "Lote A",
        "fecha_siembra": "2020-01-15",
        "hectareas_sembradas": "25.00",
        "estado": true,
        "sublotes_count": 3
      }
    ]
  }
}
```

---

### 1.3 Crear predio

```
POST /predios
```

**Permiso:** `lotes.crear`

**Body:**

| Campo              | Tipo    | Requerido | Descripción                     |
|--------------------|---------|-----------|---------------------------------|
| `nombre`           | string  | **Sí**    | Máximo 50 caracteres            |
| `ubicacion`        | string  | **Sí**    | Máximo 100 caracteres           |
| `latitud`          | numeric | No        | Entre -90 y 90                  |
| `longitud`         | numeric | No        | Entre -180 y 180                |
| `hectareas_totales`| numeric | No        | Mínimo 0                        |

**Ejemplo:**
```json
{
  "nombre": "Finca La Esperanza",
  "ubicacion": "Acacías, Meta",
  "latitud": 4.0,
  "longitud": -73.75,
  "hectareas_totales": 150
}
```

**Respuesta 201:**
```json
{
  "message": "Predio creado correctamente",
  "data": {
    "id": 1,
    "tenant_id": 1,
    "nombre": "Finca La Esperanza",
    "ubicacion": "Acacías, Meta",
    "latitud": "4.0000000",
    "longitud": "-73.7500000",
    "hectareas_totales": "150.00",
    "estado": true,
    "created_at": "2026-03-24T...",
    "updated_at": "2026-03-24T..."
  }
}
```

---

### 1.4 Editar predio

```
PUT /predios/{id}
```

**Permiso:** `lotes.editar`

**Body:** Mismos campos que crear, todos opcionales. Adicionalmente:

| Campo    | Tipo    | Requerido | Descripción              |
|----------|---------|-----------|--------------------------|
| `estado` | boolean | No        | Activar/desactivar predio|

> **Validación:** Si se envía `hectareas_totales`, no puede ser menor que la suma de `hectareas_sembradas` de todos los lotes del predio. Se retorna error 422 si se viola esta regla.

**Respuesta 200:**
```json
{
  "message": "Predio actualizado correctamente",
  "data": { ... }
}
```

**Respuesta 422 (hectáreas insuficientes):**
```json
{
  "message": "Error de validación",
  "errors": {
    "hectareas_totales": [
      "Las hectáreas totales (100) no pueden ser menores a las hectáreas ya sembradas en los lotes (120.00)"
    ]
  }
}
```

---

### 1.5 Eliminar predio

```
DELETE /predios/{id}
```

**Permiso:** `lotes.eliminar`

> **Eliminación recursiva:** Se eliminan automáticamente todos los lotes, sublotes y palmas del predio.

**Respuesta 200:**
```json
{
  "message": "Predio 'Finca La Esperanza' eliminado correctamente"
}
```

---

### 1.6 Resumen del predio (jerarquía completa)

```
GET /predios/{id}/resumen
```

**Permiso:** `lotes.ver`

Devuelve la jerarquía completa del predio (`lotes → sublotes`) más los totales agregados, en una sola llamada. Pensado para alimentar el panel **"Resumen"** del wizard *"Crear Nueva Plantación"* y cualquier vista que necesite la foto completa de un predio sin hacer múltiples requests.

**Respuesta 200:**
```json
{
  "data": {
    "predio": {
      "id": 1,
      "nombre": "Finca La Esperanza",
      "ubicacion": "Acacías, Meta",
      "hectareas_totales": "150.00",
      "hectareas_sembradas": "75.00",
      "hectareas_disponibles": "75.00"
    },
    "lotes": [
      {
        "id": 1,
        "nombre": "Lote A",
        "hectareas_sembradas": "25.00",
        "sublotes": [
          { "id": 1, "nombre": "Sublote A1", "cantidad_palmas": 120 },
          { "id": 2, "nombre": "Sublote A2", "cantidad_palmas": 85 }
        ],
        "totales": {
          "sublotes": 2,
          "palmas": 205
        }
      },
      {
        "id": 2,
        "nombre": "Lote B",
        "hectareas_sembradas": "50.00",
        "sublotes": [],
        "totales": {
          "sublotes": 0,
          "palmas": 0
        }
      }
    ],
    "totales_generales": {
      "lotes": 2,
      "sublotes": 2,
      "palmas": 205
    }
  }
}
```

**Campos clave:**

| Campo | Descripción |
|-------|-------------|
| `predio.hectareas_sembradas` | Suma de `hectareas_sembradas` de todos los lotes del predio |
| `predio.hectareas_disponibles` | `hectareas_totales - hectareas_sembradas` |
| `lotes[].sublotes` | Listado de sublotes del lote (id, nombre, cantidad_palmas) |
| `lotes[].totales` | Totales agregados por lote (sublotes y palmas) |
| `totales_generales` | Totales agregados a nivel predio (lotes, sublotes, palmas) |

> **Cómo usarlo en el wizard:** Después de cada paso (crear lote, sublote, línea, palma) el frontend vuelve a llamar este endpoint para refrescar el panel "Resumen". No requiere mantener estado en el cliente.

---

## 2. Lotes

### 2.0 Listar semillas activas (para select)

```
GET /lotes/semillas
```

**Permiso:** `lotes.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo": "Híbrido",
      "nombre": "Deli x Ghana"
    },
    {
      "id": 2,
      "tipo": "Tenera",
      "nombre": "IRHO 7001"
    }
  ]
}
```

---

### 2.1 Listar lotes

```
GET /lotes
```

**Query params:**

| Param      | Tipo    | Requerido | Descripción                            |
|------------|---------|-----------|----------------------------------------|
| `search`   | string  | No        | Busca por nombre (parcial)             |
| `predio_id`| integer | No        | Filtra por predio                      |
| `estado`   | boolean | No        | Filtra por estado (`true` / `false`)   |
| `per_page` | integer | No        | Registros por página (default: 15)     |
| `page`     | integer | No        | Número de página                       |

**Permiso:** `lotes.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "predio_id": 1,
      "nombre": "Lote A",
      "fecha_siembra": "2020-01-15",
      "hectareas_sembradas": "25.00",
      "estado": true,
      "created_at": "2026-03-24T...",
      "updated_at": "2026-03-24T...",
      "predio": {
        "id": 1,
        "nombre": "Finca La Esperanza"
      },
      "sublotes_count": 3
    }
  ],
  "meta": { ... }
}
```

---

### 2.2 Ver lote

```
GET /lotes/{id}
```

**Permiso:** `lotes.ver`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "tenant_id": 1,
    "predio_id": 1,
    "nombre": "Lote A",
    "fecha_siembra": "2020-01-15",
    "hectareas_sembradas": "25.00",
    "estado": true,
    "predio": {
      "id": 1,
      "nombre": "Finca La Esperanza"
    },
    "sublotes": [
      {
        "id": 1,
        "nombre": "Sublote A1",
        "cantidad_palmas": 120,
        "estado": true,
        "palmas_count": 120
      }
    ],
    "semillas": [
      {
        "id": 1,
        "tipo": "Híbrido",
        "nombre": "Deli x Ghana"
      }
    ]
  }
}
```

---

### 2.3 Crear lote

```
POST /lotes
```

**Permiso:** `lotes.crear`

**Body:**

| Campo               | Tipo     | Requerido | Descripción                                         |
|---------------------|----------|-----------|-----------------------------------------------------|
| `predio_id`         | integer  | **Sí**    | ID del predio (debe existir)                        |
| `nombre`            | string   | **Sí**    | Máximo 100 caracteres                               |
| `fecha_siembra`     | date     | No        | Formato `YYYY-MM-DD`, no futura                     |
| `hectareas_sembradas`| numeric | No        | Mínimo 0. No puede superar las hectáreas disponibles del predio |
| `semillas_ids`      | array    | No        | Array de IDs de semillas activas a asociar          |

> **Validación de hectáreas:** Al crear un lote, se valida que `hectareas_sembradas` no supere las hectáreas disponibles del predio (`hectareas_totales` - suma de `hectareas_sembradas` de otros lotes).

**Ejemplo:**
```json
{
  "predio_id": 1,
  "nombre": "Lote A",
  "fecha_siembra": "2020-01-15",
  "hectareas_sembradas": 25,
  "semillas_ids": [1, 3]
}
```

**Respuesta 201:**
```json
{
  "message": "Lote creado correctamente",
  "data": {
    "id": 1,
    "predio_id": 1,
    "nombre": "Lote A",
    "fecha_siembra": "2020-01-15",
    "hectareas_sembradas": "25.00",
    "estado": true,
    "predio": {
      "id": 1,
      "nombre": "Finca La Esperanza"
    },
    "semillas": [
      {
        "id": 1,
        "tipo": "Híbrido",
        "nombre": "Deli x Ghana"
      }
    ]
  }
}
```

**Respuesta 422 (hectáreas excedidas):**
```json
{
  "message": "Error de validación",
  "errors": {
    "hectareas_sembradas": [
      "Las hectáreas sembradas (80) superan las disponibles en el predio (50.00 de 150.00 totales)"
    ]
  }
}
```

---

### 2.4 Editar lote

```
PUT /lotes/{id}
```

**Permiso:** `lotes.editar`

**Body:** Mismos campos que crear, todos opcionales. Adicionalmente:

| Campo    | Tipo    | Requerido | Descripción            |
|----------|---------|-----------|------------------------|
| `estado` | boolean | No        | Activar/desactivar lote|

> **Validación de hectáreas:** Misma regla que al crear, excluyendo el lote actual del cálculo.

> **Semillas:** Si se envía `semillas_ids`, se reemplazan todas las semillas del lote. Enviar `[]` elimina todas. No enviar el campo deja las semillas sin cambios.

**Respuesta 200:**
```json
{
  "message": "Lote actualizado correctamente",
  "data": { ... }
}
```

---

### 2.5 Eliminar lote

```
DELETE /lotes/{id}
```

**Permiso:** `lotes.eliminar`

> **Eliminación recursiva:** Se eliminan automáticamente todos los sublotes y palmas del lote, y se desasocia la tabla semilla_lote.

**Respuesta 200:**
```json
{
  "message": "Lote 'Lote A' eliminado correctamente"
}
```

---

## 3. Sublotes

### 3.1 Listar sublotes

```
GET /sublotes
```

**Query params:**

| Param      | Tipo    | Requerido | Descripción                            |
|------------|---------|-----------|----------------------------------------|
| `search`   | string  | No        | Busca por nombre (parcial)             |
| `lote_id`  | integer | No        | Filtra por lote                        |
| `estado`   | boolean | No        | Filtra por estado (`true` / `false`)   |
| `per_page` | integer | No        | Registros por página (default: 15)     |
| `page`     | integer | No        | Número de página                       |

**Permiso:** `sublotes.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "lote_id": 1,
      "nombre": "Sublote A1",
      "cantidad_palmas": 120,
      "estado": true,
      "created_at": "2026-03-24T...",
      "updated_at": "2026-03-24T...",
      "lote": {
        "id": 1,
        "nombre": "Lote A",
        "predio_id": 1,
        "predio": {
          "id": 1,
          "nombre": "Finca La Esperanza"
        }
      },
      "palmas_count": 120
    }
  ],
  "meta": { ... }
}
```

---

### 3.2 Ver sublote

```
GET /sublotes/{id}
```

**Permiso:** `sublotes.ver`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "tenant_id": 1,
    "lote_id": 1,
    "nombre": "Sublote A1",
    "cantidad_palmas": 120,
    "estado": true,
    "lote": {
      "id": 1,
      "nombre": "Lote A",
      "predio_id": 1,
      "predio": {
        "id": 1,
        "nombre": "Finca La Esperanza"
      }
    },
    "palmas": [
      {
        "id": 1,
        "sublote_id": 1,
        "codigo": "Sublote A1-001",
        "descripcion": null,
        "estado": true
      },
      {
        "id": 2,
        "sublote_id": 1,
        "codigo": "Sublote A1-002",
        "descripcion": null,
        "estado": true
      }
    ]
  }
}
```

---

### 3.3 Crear sublote

```
POST /sublotes
```

**Permiso:** `sublotes.crear`

**Body:**

| Campo            | Tipo    | Requerido | Descripción                                  |
|------------------|---------|-----------|----------------------------------------------|
| `lote_id`        | integer | **Sí**    | ID del lote (debe existir)                   |
| `nombre`         | string  | **Sí**    | Máximo 50 caracteres                         |
| `cantidad_palmas`| integer | No        | Cantidad de palmas a crear automáticamente (0-99999). Default: 0 |

> **Comportamiento:**
> - Si se envía `cantidad_palmas > 0`, se crean automáticamente los registros de Palma.
> - Los códigos siguen el formato: `{nombre_sublote}-{contador_3_digitos}`.
>   - Ejemplo: `Sublote A1-001`, `Sublote A1-002`, ...
> - **Creación en 2 caminos (sync / async)** — el backend decide automáticamente:
>   - `cantidad_palmas <= 5000` → **sync** (se crean dentro de la misma request, respuesta 201 estándar).
>   - `cantidad_palmas > 5000`  → **async** (el sublote se crea inmediatamente, las palmas se encolan en un Job y se crean en segundo plano). La respuesta incluye `palmas_async: true` y `batch_id`. Consulta el endpoint **[4.6 Estado de batch de palmas](#46-estado-de-batch-de-palmas-async)** para conocer el progreso.

**Ejemplo:**
```json
{
  "lote_id": 1,
  "nombre": "Sublote A1",
  "cantidad_palmas": 120
}
```

**Respuesta 201 (sync, `cantidad_palmas <= 5000`):**
```json
{
  "message": "Sublote creado correctamente",
  "data": {
    "id": 1,
    "lote_id": 1,
    "nombre": "Sublote A1",
    "cantidad_palmas": 120,
    "estado": true,
    "lote": {
      "id": 1,
      "nombre": "Lote A"
    }
  }
}
```

**Respuesta 201 (async, `cantidad_palmas > 5000`):**
```json
{
  "message": "Sublote creado. 20000 palma(s) se crearán en segundo plano.",
  "data": {
    "id": 1,
    "lote_id": 1,
    "nombre": "Sublote A1",
    "cantidad_palmas": 20000,
    "estado": true,
    "lote": { "id": 1, "nombre": "Lote A" }
  },
  "palmas_async": true,
  "batch_id": "9b8e2f34-1a0c-4f6d-9b2e-8e1b2a3c4d5e"
}
```

> **IMPORTANTE (frontend):** Cuando `palmas_async === true`, las palmas **aún no existen** en la base al retornar la respuesta. Usa `batch_id` para hacer polling a `GET /palmas/batch/{batchId}` y refrescar el listado de palmas sólo cuando `finished === true`.

---

### 3.4 Editar sublote

```
PUT /sublotes/{id}
```

**Permiso:** `sublotes.editar`

**Body:**

| Campo            | Tipo    | Requerido | Descripción                                    |
|------------------|---------|-----------|------------------------------------------------|
| `lote_id`        | integer | No        | Mover a otro lote                              |
| `nombre`         | string  | No        | Máximo 50 caracteres                           |
| `estado`         | boolean | No        | Activar/desactivar sublote                     |
| `cantidad_palmas`| integer | No        | Nuevo total de palmas deseado (0-99999)        |

> **Comportamiento de `cantidad_palmas`:**
> - Si el nuevo valor es **mayor** que el actual: se crean palmas adicionales (continuando el contador secuencial).
>   - Si la **diferencia a crear** es `> 5000`, la creación se hace **async** (Job en cola) — la respuesta incluye `palmas_async: true` y `batch_id`.
>   - Si es `<= 5000`, se crean de forma **sync**.
> - Si el nuevo valor es **menor** que el actual: se eliminan las palmas con los códigos más altos (siempre sync).
> - **Concurrencia:** Si ya hay un batch de creación de palmas en curso para este sublote, la petición se rechaza con **409 Conflict**. Espere a que finalice (consultar `GET /palmas/batch/{batchId}`) antes de reintentar.

**Ejemplo (agregar palmas):**
```json
{
  "cantidad_palmas": 150
}
```

**Respuesta 200 (sync):**
```json
{
  "message": "Sublote actualizado correctamente",
  "data": { ... }
}
```

**Respuesta 200 (async, diferencia a crear > 5000):**
```json
{
  "message": "Sublote actualizado. 8000 palma(s) adicional(es) se crearán en segundo plano.",
  "data": { ... },
  "palmas_async": true,
  "batch_id": "9b8e2f34-1a0c-4f6d-9b2e-8e1b2a3c4d5e"
}
```

**Respuesta 409 (batch en curso):**
```json
{
  "message": "Hay un proceso de creación de palmas en curso para este sublote. Espere a que finalice.",
  "code": "BATCH_EN_CURSO"
}
```

---

### 3.5 Eliminar sublote

```
DELETE /sublotes/{id}
```

**Permiso:** `sublotes.eliminar`

> **Eliminación recursiva:** Se eliminan automáticamente todas las palmas del sublote.

**Respuesta 200:**
```json
{
  "message": "Sublote 'Sublote A1' eliminado correctamente"
}
```

---

## 4. Palmas

> **Relación con líneas:** Las palmas pueden asignarse opcionalmente a una línea del sublote mediante `linea_id`. Si el sublote tiene líneas configuradas, es obligatorio especificar la línea al crear palmas. Si el sublote no tiene líneas, el flujo es el mismo de siempre (solo `sublote_id` + `cantidad_palmas`).

### 4.1 Listar palmas

```
GET /palmas
```

**Query params:**

| Param       | Tipo    | Requerido | Descripción                                    |
|-------------|---------|-----------|------------------------------------------------|
| `sublote_id`| integer | No        | Filtra por sublote                             |
| `linea_id`  | integer | No        | Filtra por línea                               |
| `sin_linea` | flag    | No        | Si está presente, muestra solo palmas sin línea asignada |
| `search`    | string  | No        | Busca por código (parcial)                     |
| `estado`    | boolean | No        | Filtra por estado (`true` / `false`)           |
| `per_page`  | integer | No        | Registros por página (default: 50)             |
| `page`      | integer | No        | Número de página                               |

**Permiso:** `palmas.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "sublote_id": 1,
      "linea_id": 1,
      "codigo": "Sublote A1-001",
      "descripcion": null,
      "estado": true,
      "created_at": "2026-03-24T...",
      "updated_at": "2026-03-24T...",
      "sublote": {
        "id": 1,
        "nombre": "Sublote A1"
      },
      "linea": {
        "id": 1,
        "numero": 1
      }
    }
  ],
  "meta": { ... }
}
```

> **Nota:** `linea` será `null` si la palma no tiene línea asignada.

---

### 4.2 Ver palma

```
GET /palmas/{id}
```

**Permiso:** `palmas.ver`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "tenant_id": 1,
    "sublote_id": 1,
    "linea_id": 1,
    "codigo": "Sublote A1-001",
    "descripcion": null,
    "estado": true,
    "sublote": {
      "id": 1,
      "nombre": "Sublote A1",
      "lote_id": 1,
      "lote": {
        "id": 1,
        "nombre": "Lote A"
      }
    },
    "linea": {
      "id": 1,
      "numero": 1
    }
  }
}
```

---

### 4.3 Crear palmas

```
POST /palmas
```

**Permiso:** `palmas.crear`

**Body:**

| Campo            | Tipo    | Requerido | Descripción                                         |
|------------------|---------|-----------|-----------------------------------------------------|
| `sublote_id`     | integer | **Sí**    | ID del sublote (debe existir)                       |
| `cantidad_palmas`| integer | **Sí**    | Cantidad de palmas a crear (1-99999)                |
| `linea_id`       | integer | Condicional | ID de la línea. **Obligatorio si el sublote tiene líneas.** Debe pertenecer al mismo sublote |

> **Comportamiento:**
> - Los códigos se generan automáticamente siguiendo el formato `{nombre_sublote}-{contador}`.
> - El contador es secuencial dentro del sublote (global, no por línea) y nunca se repite.
> - Se actualiza automáticamente `cantidad_palmas` del sublote y de la línea (si aplica).
> - Si el sublote tiene líneas y no se envía `linea_id`, se retorna error 422.
>
> **Creación en 2 caminos (sync / async)** — el backend decide automáticamente según `cantidad_palmas`:
> - `<= 5000` → **sync**. Respuesta `201 Created` con `async: false`. Las palmas ya existen al retornar.
> - `> 5000`  → **async**. Respuesta `202 Accepted` con `async: true` y `batch_id`. Las palmas se crean en segundo plano (ver [4.6](#46-estado-de-batch-de-palmas-async) para polling del estado).
>
> **Concurrencia:** No se permite encolar dos batches simultáneos para el mismo sublote (garantizado por `ShouldBeUnique`). Si un job idéntico ya está en la cola, el segundo dispatch se descarta silenciosamente.

**Ejemplo (sublote con líneas):**
```json
{
  "sublote_id": 1,
  "cantidad_palmas": 5,
  "linea_id": 3
}
```

**Ejemplo (sublote sin líneas):**
```json
{
  "sublote_id": 1,
  "cantidad_palmas": 5
}
```

**Respuesta 201 (sync, `cantidad_palmas <= 5000`):**
```json
{
  "message": "5 palma(s) creada(s) correctamente",
  "async": false,
  "cantidad_creada": 5,
  "sublote_id": 1,
  "linea_id": 3
}
```

> **Nota (breaking change):** La respuesta sync ya **NO incluye** el listado `data` con las palmas recién creadas (antes se retornaba el array completo). El frontend debe refrescar la lista llamando a `GET /palmas?sublote_id=X` después de un 201. Este cambio evita cargar en memoria hasta 99.999 registros en la respuesta.

**Respuesta 202 (async, `cantidad_palmas > 5000`):**
```json
{
  "message": "Solicitud aceptada. 20000 palma(s) se crearán en segundo plano.",
  "async": true,
  "batch_id": "9b8e2f34-1a0c-4f6d-9b2e-8e1b2a3c4d5e",
  "sublote_id": 1,
  "linea_id": null,
  "cantidad": 20000
}
```

> **Frontend:** Cuando el status HTTP sea `202` o `async === true`, hacer polling a `GET /palmas/batch/{batch_id}` (ver sección 4.6). Recargar el listado de palmas sólo cuando `finished === true`.

**Respuesta 422 (sublote tiene líneas pero no se envió `linea_id`):**
```json
{
  "message": "Error de validación",
  "errors": {
    "linea_id": ["El sublote tiene líneas configuradas. Debe especificar la línea."]
  }
}
```

---

### 4.4 Editar palma

```
PUT /palmas/{id}
```

**Permiso:** `palmas.editar`

**Body:**

| Campo        | Tipo    | Requerido | Descripción                                              |
|--------------|---------|-----------|----------------------------------------------------------|
| `descripcion`| string  | No        | Máximo 255 caracteres                                    |
| `estado`     | boolean | No        | Activar/desactivar palma                                 |
| `linea_id`   | integer | No        | Reasignar a otra línea (debe pertenecer al mismo sublote). Enviar `null` para desasignar |

> **Comportamiento de `linea_id`:** Al cambiar la línea de una palma, se sincronizan automáticamente los contadores `cantidad_palmas` de la línea anterior y la nueva.

**Ejemplo:**
```json
{
  "descripcion": "Palma enferma - requiere tratamiento",
  "linea_id": 2
}
```

**Respuesta 200:**
```json
{
  "message": "Palma actualizada correctamente",
  "data": { ... }
}
```

---

### 4.5 Eliminar palmas (masivo)

```
DELETE /palmas/masivo
```

**Permiso:** `palmas.eliminar`

**Body:**

| Campo        | Tipo   | Requerido | Descripción                         |
|--------------|--------|-----------|-------------------------------------|
| `palmas_ids` | array  | **Sí**    | Array de IDs de palmas a eliminar   |

> **Comportamiento:**
> - Se eliminan todas las palmas indicadas.
> - Se actualiza automáticamente `cantidad_palmas` de los sublotes y líneas afectados.

**Ejemplo:**
```json
{
  "palmas_ids": [1, 2, 5, 10]
}
```

**Respuesta 200:**
```json
{
  "message": "4 palma(s) eliminada(s) correctamente"
}
```

---

### 4.6 Estado de batch de palmas (async)

```
GET /palmas/batch/{batchId}
```

**Permiso:** `palmas.ver`

Consulta el estado de un batch (`batch_id`) devuelto por:
- `POST /palmas` cuando la respuesta es `202` (`cantidad_palmas > 5000`)
- `POST /sublotes` cuando la respuesta trae `palmas_async: true`
- `PUT  /sublotes/{id}` cuando la respuesta trae `palmas_async: true`

**Path params:**

| Param     | Tipo   | Descripción                                      |
|-----------|--------|--------------------------------------------------|
| `batchId` | string | UUID del batch devuelto por el endpoint original |

**Respuesta 200 (en progreso):**
```json
{
  "data": {
    "id": "9b8e2f34-1a0c-4f6d-9b2e-8e1b2a3c4d5e",
    "name": "crear-palmas-sublote-42",
    "total_jobs": 1,
    "pending_jobs": 1,
    "failed_jobs": 0,
    "processed_jobs": 0,
    "progress": 0,
    "finished": false,
    "cancelled": false,
    "has_failures": false,
    "created_at": 1744713600,
    "finished_at": null
  }
}
```

**Respuesta 200 (finalizado OK):**
```json
{
  "data": {
    "id": "9b8e2f34-1a0c-4f6d-9b2e-8e1b2a3c4d5e",
    "name": "crear-palmas-sublote-42",
    "total_jobs": 1,
    "pending_jobs": 0,
    "failed_jobs": 0,
    "processed_jobs": 1,
    "progress": 100,
    "finished": true,
    "cancelled": false,
    "has_failures": false,
    "created_at": 1744713600,
    "finished_at": 1744713618
  }
}
```

**Respuesta 200 (con fallas):**
```json
{
  "data": {
    "id": "9b8e2f34-...",
    "progress": 100,
    "finished": true,
    "has_failures": true,
    "failed_jobs": 1,
    "...": "..."
  }
}
```

**Respuesta 404 (batch no encontrado):**
```json
{
  "message": "Batch no encontrado",
  "code": "BATCH_NOT_FOUND"
}
```

> **Campos clave para el frontend:**
> - `finished: boolean` → indica si el job terminó (con éxito o fallo). Detener el polling cuando sea `true`.
> - `has_failures: boolean` → si es `true` y `finished: true`, el job falló. La transacción de BD hizo rollback (no hay palmas parciales). Se puede reintentar la petición original.
> - `progress: 0-100` → porcentaje aproximado (útil para barras de progreso).

---

## 5. Líneas

> **Relación con palmas:** Las líneas son una agrupación organizacional opcional dentro del sublote. Cuando un sublote tiene líneas, las palmas se asignan a una línea específica (`linea_id`). Al eliminar una línea, las palmas asignadas quedan sin línea (`linea_id = null`) pero **no se eliminan**. La respuesta incluye `palmas_count` (cantidad real de palmas asignadas a la línea).

### 5.1 Listar líneas

```
GET /lineas
```

**Query params:**

| Param        | Tipo    | Requerido | Descripción                            |
|--------------|---------|-----------|----------------------------------------|
| `sublote_id` | integer | No        | Filtra por sublote                     |
| `search`     | integer | No        | Busca por número exacto                |
| `estado`     | boolean | No        | Filtra por estado (`true` / `false`)   |
| `per_page`   | integer | No        | Registros por página (default: 50)     |
| `page`       | integer | No        | Número de página                       |

**Permiso:** `lineas.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "sublote_id": 1,
      "numero": 1,
      "cantidad_palmas": 30,
      "palmas_count": 28,
      "estado": true,
      "created_at": "2026-04-08T...",
      "updated_at": "2026-04-08T...",
      "sublote": {
        "id": 1,
        "nombre": "Sublote A1",
        "lote_id": 1,
        "lote": {
          "id": 1,
          "nombre": "Lote A",
          "predio_id": 1,
          "predio": { "id": 1, "nombre": "Finca La Esperanza" }
        }
      }
    }
  ],
  "meta": { ... }
}
```

---

### 5.2 Ver línea

```
GET /lineas/{id}
```

**Permiso:** `lineas.ver`

Devuelve la línea con su sublote, lote y predio cargados.

---

### 5.3 Crear línea

```
POST /lineas
```

**Permiso:** `lineas.crear`

**Body:**

| Campo            | Tipo    | Requerido | Descripción                                          |
|------------------|---------|-----------|------------------------------------------------------|
| `sublote_id`     | integer | **Sí**    | ID del sublote (debe existir en este tenant)         |
| `numero`         | integer | **Sí**    | Número de la línea (≥ 1, único por sublote)          |
| `cantidad_palmas`| integer | No        | Cantidad teórica de palmas en la línea (default: 0)  |

> **Validación:** `numero` debe ser único dentro del mismo sublote. Si se intenta crear una línea con un `numero` que ya existe, se devuelve `422`.

**Ejemplo:**
```json
{
  "sublote_id": 1,
  "numero": 1,
  "cantidad_palmas": 30
}
```

**Respuesta 201:**
```json
{
  "message": "Línea creada correctamente",
  "data": {
    "id": 1,
    "sublote_id": 1,
    "numero": 1,
    "cantidad_palmas": 30,
    "estado": true,
    "sublote": { "id": 1, "nombre": "Sublote A1" }
  }
}
```

---

### 5.4 Editar línea

```
PUT /lineas/{id}
```

**Permiso:** `lineas.editar`

**Body (todos opcionales):**

| Campo            | Tipo    | Descripción                                              |
|------------------|---------|----------------------------------------------------------|
| `numero`         | integer | Nuevo número (debe seguir siendo único por sublote)      |
| `cantidad_palmas`| integer | Nueva cantidad teórica                                   |
| `estado`         | boolean | Activar/desactivar la línea                              |

> **Nota:** No se puede cambiar el `sublote_id` al editar una línea. Si necesitas moverla a otro sublote, elimínala y crea una nueva.

**Respuesta 200:**
```json
{
  "message": "Línea actualizada correctamente",
  "data": { ... }
}
```

---

### 5.5 Eliminar línea

```
DELETE /lineas/{id}
```

**Permiso:** `lineas.eliminar`

> **Importante:** Eliminar una línea **desasocia** las palmas asignadas (`linea_id → null`). Las palmas **no se eliminan** — quedan en el sublote sin línea asignada.

**Respuesta 200:**
```json
{
  "message": "Línea 1 eliminada correctamente"
}
```

---

## Errores comunes

| Código | Situación                          | Ejemplo de respuesta                                         |
|--------|------------------------------------|--------------------------------------------------------------|
| 401    | Token inválido o expirado          | `{"message": "Token expirado", "code": "TOKEN_EXPIRED"}`    |
| 403    | Sin permiso                        | `{"message": "No tiene permiso para esta acción"}`           |
| 404    | Recurso no encontrado              | `{"message": "No query results for model [Predio]"}`        |
| 422    | Error de validación                | `{"message": "Error de validación", "errors": {...}}`        |
| 500    | Error interno                      | `{"message": "Error al ...", "error": "..."}`                |

---

## Jerarquía de la plantación

```
Predio (finca/hacienda)
  └── Lote (división del terreno)
        ├── Semillas (relación many-to-many via semilla_lote)
        └── Sublote (subdivisión del lote)
              ├── Línea (opcional, metadata por sublote — independiente de palmas)
              └── Palma (planta individual, FK directo a sublote_id)
```

> Las **líneas** no se relacionan con las palmas: son metadata informativa por sublote (numero + cantidad_palmas teóricas). Las palmas siguen colgando solo del sublote, sin importar si la finca usa líneas o no.

## Formato de código de palmas

```
{nombre_sublote}-{contador_3_digitos}

Ejemplo: Sublote A1-001
         Sublote A1-002
         Sublote A1-003
```

## Permisos requeridos

| Recurso   | Ver             | Crear             | Editar             | Eliminar             |
|-----------|-----------------|-------------------|--------------------|----------------------|
| Predios   | `lotes.ver`     | `lotes.crear`     | `lotes.editar`     | `lotes.eliminar`     |
| Lotes     | `lotes.ver`     | `lotes.crear`     | `lotes.editar`     | `lotes.eliminar`     |
| Sublotes  | `sublotes.ver`  | `sublotes.crear`  | `sublotes.editar`  | `sublotes.eliminar`  |
| Líneas    | `lineas.ver`    | `lineas.crear`    | `lineas.editar`    | `lineas.eliminar`    |
| Palmas    | `palmas.ver`    | `palmas.crear`    | `palmas.editar`    | `palmas.eliminar`    |

> Los permisos `lotes.*` cubren predios y lotes. Los permisos `sublotes.*`, `lineas.*` y `palmas.*` son independientes entre sí.

## Notas sobre eliminación

Todas las eliminaciones son **recursivas**:
- **Eliminar predio** → elimina lotes + semilla_lote + sublotes + palmas
- **Eliminar lote** → elimina semilla_lote + sublotes + palmas
- **Eliminar sublote** → elimina palmas

## Validaciones de hectáreas

- Al **crear/editar lote**: `hectareas_sembradas` no puede superar las hectáreas disponibles del predio (`hectareas_totales` - suma de `hectareas_sembradas` de otros lotes).
- Al **editar predio**: `hectareas_totales` no puede ser menor que la suma de `hectareas_sembradas` de todos sus lotes.

---

## Flujo recomendado para el wizard "Crear Nueva Plantación"

El wizard tiene 5 pasos. Cada paso usa los endpoints CRUD existentes — **no requiere endpoints nuevos**, salvo `GET /predios/{id}/resumen` para refrescar el panel lateral.

| Paso | Acción del usuario | Endpoint |
|------|---------------------|----------|
| **1. Predio** | Crea el predio (nombre, ubicación, hectáreas) | `POST /predios` |
| **2. Lotes** | Crea N lotes dentro del predio (con `hectareas_sembradas`, `fecha_siembra`, `semillas_ids`) | `POST /lotes` (uno por lote) |
| **3. Sublotes** | Crea N sublotes dentro de cada lote. Si pasa `cantidad_palmas > 0`, se crean palmas automáticamente. | `POST /sublotes` |
| **4. Líneas** *(opcional)* | Crea las líneas de cada sublote. **Este paso es 100% saltable** — si la finca no organiza por líneas, el frontend simplemente avanza al paso 5. | `POST /lineas` |
| **5. Palmas** | Ajustar/agregar palmas individuales si no se crearon automáticamente en el paso 3, o eliminar palmas en lote. | `POST /palmas` y `DELETE /palmas/masivo` |

### Refresco del panel "Resumen"

Tras completar cualquier paso, llamar:

```
GET /predios/{id}/resumen
```

Esto devuelve la jerarquía completa con totales (`lotes`, `sublotes`, `palmas`) y los datos del predio (`hectareas_totales`, `hectareas_sembradas`, `hectareas_disponibles`). El frontend renderiza el panel lateral con esa única respuesta — no necesita mantener estado local.

### Notas

- Las **líneas no afectan a las palmas**. Saltar el paso 4 no rompe nada en el paso 5.
- Eliminar líneas posteriormente tampoco afecta a las palmas existentes.
- El cálculo de `palmas` en el resumen usa siempre el campo cacheado `sublotes.cantidad_palmas`, que se mantiene sincronizado por los endpoints de sublotes y palmas.

---

## 6. Creación masiva de palmas (Bulk) — Guía para el frontend

> Esta sección documenta el comportamiento **sync/async** introducido para soportar hasta **99.999 palmas** por petición sin bloquear la BD ni hacer timeout el request HTTP.

### 6.1 Qué cambió (breaking changes)

| Cambio | Antes | Ahora |
|--------|-------|-------|
| Máximo `cantidad_palmas` en `POST /palmas` | `9.999` | **`99.999`** |
| Respuesta sync de `POST /palmas` | `{ message, data: [...palmas] }` | `{ message, async: false, cantidad_creada, sublote_id, linea_id }` — **ya NO devuelve el array `data`** |
| Respuesta async de `POST /palmas` | — (no existía) | **Nuevo:** status `202` + `{ async: true, batch_id, ... }` |
| `POST /sublotes` y `PUT /sublotes/{id}` | Siempre sync | Puede ser sync o async (si la creación de palmas asociada supera 5.000) |
| Editar sublote mientras hay batch activo | Se ejecutaba | **409 Conflict** con `code: BATCH_EN_CURSO` |

### 6.2 Umbrales y reglas

| Regla | Valor |
|-------|-------|
| Umbral sync/async | **5.000 palmas** |
| `cantidad_palmas` máximo por petición | 99.999 |
| Tamaño de chunk interno | 1.000 (transparente para el frontend) |
| Timeout de Job (backend) | 300 s (5 min) |
| Reintentos de Job | 1 (no reintenta para evitar duplicados) |

### 6.3 Flujo recomendado en el frontend

1. **Enviar request** (`POST /palmas`, `POST /sublotes` o `PUT /sublotes/{id}`) tal como antes.
2. **Inspeccionar la respuesta**:
   - Si el status es `201` y `async === false` (o el campo `palmas_async` está ausente) → flujo sync, el servidor ya creó todo. **Recargar listado** con `GET /palmas?sublote_id=X`.
   - Si el status es `202` o la respuesta trae `async === true` / `palmas_async === true` → flujo async. Guardar `batch_id` y comenzar polling.
3. **Polling del batch** (sólo si async):
   ```
   GET /palmas/batch/{batch_id}
   ```
   - **Intervalo recomendado:** cada **3 segundos**.
   - **Timeout recomendado:** 10 min (backend mata el job a los 5 min, deja un buffer).
   - **Condición de salida:** `finished === true`.
   - **Si `has_failures === true`:** mostrar error al usuario y ofrecer reintentar.
   - **Si `finished === true` y sin fallos:** recargar listado de palmas y/o resumen.
4. **UX sugerida durante polling:**
   - Mostrar barra de progreso con `progress` (0–100).
   - Bloquear el botón "Guardar" del sublote (por el 409 en update).
   - Deshabilitar el wizard paso 5 hasta que `finished === true`.

### 6.4 Pseudocódigo (TypeScript)

```ts
type BatchResponse = {
  data: {
    id: string;
    progress: number;          // 0-100
    finished: boolean;
    has_failures: boolean;
    total_jobs: number;
    processed_jobs: number;
  };
};

async function crearPalmas(subloteId: number, cantidad: number, lineaId?: number) {
  const res = await api.post('/palmas', {
    sublote_id: subloteId,
    cantidad_palmas: cantidad,
    linea_id: lineaId ?? null,
  });

  // Camino sync (201)
  if (res.status === 201 && !res.data.async) {
    await recargarPalmas(subloteId);
    return { ok: true };
  }

  // Camino async (202)
  if (res.status === 202 && res.data.async) {
    const batchId: string = res.data.batch_id;
    const result = await esperarBatch(batchId);

    if (result.has_failures) {
      return { ok: false, error: 'El proceso falló. Intente de nuevo.' };
    }

    await recargarPalmas(subloteId);
    return { ok: true };
  }

  return { ok: false, error: 'Respuesta inesperada del servidor' };
}

async function esperarBatch(batchId: string): Promise<BatchResponse['data']> {
  const DELAY = 3000;       // 3 s
  const TIMEOUT = 600_000;  // 10 min
  const start = Date.now();

  while (true) {
    const { data } = await api.get<BatchResponse>(`/palmas/batch/${batchId}`);

    if (data.data.finished) return data.data;
    if (Date.now() - start > TIMEOUT) {
      throw new Error('Timeout esperando el batch');
    }

    await new Promise(r => setTimeout(r, DELAY));
  }
}
```

### 6.5 Manejo de errores específicos

| Status | Situación | Acción del frontend |
|--------|-----------|---------------------|
| `202`  | Request aceptado, procesándose async | Iniciar polling con `batch_id` |
| `404`  | `GET /palmas/batch/{id}` con batch inexistente o muy antiguo | Informar al usuario que el batch expiró y recargar palmas para ver el estado real |
| `409`  | `PUT /sublotes/{id}` mientras un batch del mismo sublote está activo | Mostrar `"Hay palmas creándose, espere unos segundos"` y reintentar tras `finished === true` |
| `422`  | Validación (`cantidad_palmas` fuera de rango, sublote inválido, línea inválida) | Mostrar los errores de `errors` |
| `500`  | Error inesperado en servidor | Mostrar error genérico, registrar en monitoreo |

### 6.6 Consideraciones operativas (para devops / backend)

El camino async requiere un **Queue Worker** corriendo en el servidor:

```bash
# Desarrollo local
php artisan queue:work --tries=1 --timeout=300

# Producción (Linux) — recomendado vía Supervisor o systemd
php artisan queue:work database --sleep=3 --tries=1 --timeout=300 --max-jobs=1000
```

- **Driver de cola:** `database` (ver [config/queue.php](../config/queue.php)). No requiere Redis ni otro servicio.
- **Tabla de batches:** `job_batches` (ya migrada en [0001_01_01_000002_create_jobs_table.php](../database/migrations/0001_01_01_000002_create_jobs_table.php)).
- **Después de cada deploy:** ejecutar `php artisan queue:restart` para que el worker recargue el código nuevo.
- **Si NO hay worker corriendo:** los requests async devuelven `202` correctamente pero las palmas nunca se crearán (los jobs quedan pendientes en `jobs`). El polling nunca retornará `finished: true`.

> Si el entorno no tiene worker configurado, **el frontend no debería enviar `cantidad_palmas > 5.000`** hasta que devops haya puesto el worker en producción.
