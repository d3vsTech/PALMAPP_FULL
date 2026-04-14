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

**Ejemplo:**
```json
{
  "lote_id": 1,
  "nombre": "Sublote A1",
  "cantidad_palmas": 120
}
```

**Respuesta 201:**
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
> - Si el nuevo valor es **menor** que el actual: se eliminan las palmas con los códigos más altos.

**Ejemplo (agregar palmas):**
```json
{
  "cantidad_palmas": 150
}
```

**Respuesta 200:**
```json
{
  "message": "Sublote actualizado correctamente",
  "data": { ... }
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
| `cantidad_palmas`| integer | **Sí**    | Cantidad de palmas a crear (1-9999)                 |
| `linea_id`       | integer | Condicional | ID de la línea. **Obligatorio si el sublote tiene líneas.** Debe pertenecer al mismo sublote |

> **Comportamiento:**
> - Los códigos se generan automáticamente siguiendo el formato `{nombre_sublote}-{contador}`.
> - El contador es secuencial dentro del sublote (global, no por línea) y nunca se repite.
> - Se actualiza automáticamente `cantidad_palmas` del sublote y de la línea (si aplica).
> - Si el sublote tiene líneas y no se envía `linea_id`, se retorna error 422.

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

**Respuesta 201:**
```json
{
  "message": "5 palma(s) creada(s) correctamente",
  "data": [
    {
      "id": 121,
      "sublote_id": 1,
      "linea_id": 3,
      "codigo": "Sublote A1-121",
      "descripcion": null,
      "estado": true,
      "linea": { "id": 3, "numero": 3 }
    }
  ]
}
```

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
