# Labores y Jornales — Modelo de Datos y Lógica de Negocio

> Documentación interna del módulo de **Labores de Palma**, **Labores de Finca** y **Jornales** (registros por empleado dentro de la planilla diaria).

---

## 1. Visión General

```
Operacion (planilla diaria, 1 por tenant/fecha)
  ├── registro_cosecha[]  ← COSECHA (con cuadrilla)
  │     └── cosecha_cuadrilla[]  ← valor por empleado
  ├── jornales[]          ← PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS, FINCA
  ├── ausencias[]         ← incapacidades, licencias, permisos
  └── horas_extra[]       ← recargos CST (HED, HEN, RN, HRD, HEDF, HENF, RND)
```

- **Labores de Palma** son las 6 tareas fijas sobre las palmas: COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD y OTROS. COSECHA vive en `registro_cosecha` + `cosecha_cuadrilla` porque es cuadrilla. Las otras 5 viven en `jornales` con `categoria='PALMA'` y se registran una fila por empleado.
- **Labores de Finca** son tareas variables de mantenimiento de la finca (arreglos, transporte, etc.). Se definen en el catálogo paramétrico `labores` y se registran en `jornales` con `categoria='FINCA'`.
- Los jornales **no tienen fecha propia** — heredan la fecha de la **Operación** padre (`operaciones.fecha`).

---

## 2. Tabla `labores` — Catálogo de Labores de Finca

### 2.1 Esquema

| Columna      | Tipo          | Nullable | Descripción                                       |
|--------------|---------------|----------|---------------------------------------------------|
| `id`         | bigint (PK)   | No       | ID autoincremental                                |
| `tenant_id`  | bigint (FK)   | No       | Referencia a `tenants.id`                         |
| `nombre`     | varchar(100)  | No       | Nombre de la labor (ej: "Reparación portón")      |
| `valor_base` | decimal(12,2) | No       | Precio fijo que gana el empleado por esta labor   |
| `estado`     | boolean       | No       | `true` = activa (default: true)                   |
| `created_at` | timestamp     | Sí       |                                                   |
| `updated_at` | timestamp     | Sí       |                                                   |

**Constraints:** `UNIQUE (tenant_id, nombre)`, índice `(tenant_id, estado)`.

### 2.2 Modelo `Labor`

**Archivo:** `app/Models/Labor.php`

| Relación / Método | Tipo      | Descripción                                       |
|-------------------|-----------|---------------------------------------------------|
| `jornales()`      | HasMany   | Jornales que usan esta labor (`jornales.labor_id`) |
| `scopeActivos()`  | Scope     | Filtra por `estado = true`                         |

---

## 3. Precios de Labores de Palma

Cada tipo de labor de palma resuelve su precio en una tabla distinta:

| Tipo            | Tabla de precio   | Llave de búsqueda                 |
|-----------------|-------------------|-----------------------------------|
| COSECHA         | `precios_cosecha` | por `lote_id` + año              |
| PLATEO          | `precios_palma`   | `(tenant_id, tipo='PLATEO')`     |
| PODA            | `precios_palma`   | `(tenant_id, tipo='PODA')`       |
| FERTILIZACION   | `precio_abono`    | rango `gramos_por_palma`         |
| SANIDAD         | `precios_palma`   | `(tenant_id, tipo='SANIDAD')` — valor plano, no se multiplica por `cantidad_palmas`. `precio_palma` puede ser NULL |
| OTROS           | `precios_palma`   | `(tenant_id, tipo='OTROS')` — valor plano, no se multiplica por `cantidad_palmas`. `precio_palma` puede ser NULL   |

### 3.1 `precios_palma`

| Columna        | Tipo                                | Nullable | Descripción                           |
|----------------|-------------------------------------|----------|---------------------------------------|
| `id`           | bigint (PK)                         | No       |                                       |
| `tenant_id`    | bigint (FK)                         | No       |                                       |
| `tipo`         | enum(PLATEO, PODA, SANIDAD, OTROS) | No       |                                       |
| `precio_palma` | decimal(12,2)                       | **Sí**   | Precio por palma. NULL = no activado. |
| `estado`       | boolean                             | No       | default: true                          |

UNIQUE `(tenant_id, tipo)` — un registro por tenant por tipo.

### 3.2 `precio_abono` (sin cambios)

Tabla genérica por tenant con rangos `gramos_min`/`gramos_max` → `precio_palma`. Se usa exclusivamente para FERTILIZACION.

### 3.3 Catálogo `insumos` y creación desde el wizard

La tabla `insumos` (`App\Models\Insumo`) es el catálogo de fertilizantes / abonos al que apunta `jornales.insumo_id`. Tiene UNIQUE `(tenant_id, nombre)` para impedir duplicados. Hay dos formas de crear un registro:

- **CRUD admin:** `POST /insumos` (módulo configuración, requiere `configuracion.editar`). Pide `nombre` + `unidad_medida`.
- **Wizard de Operaciones:** `POST /operaciones/insumos` (requiere `operaciones.crear|editar`). Solo recibe `nombre`; `unidad_medida` se setea a `'GRAMOS'` por default. Si el nombre ya existe, devuelve **409 `INSUMO_DUPLICADO`**. Detalles en [API_OPERACIONES.md §3.2](./API_OPERACIONES.md). Lo dispara la opción "Otro" del dropdown "Tipo de Fertilizante" en la tarjeta de FERTILIZACION del Paso 2.

---

## 4. Tabla `jornales` — Unificada Palma + Finca

### 4.1 Esquema

| Columna                  | Tipo                | Nullable | Descripción                                                    |
|--------------------------|---------------------|----------|----------------------------------------------------------------|
| `id`                     | bigint (PK)         | No       |                                                                |
| `tenant_id`              | bigint (FK)         | No       |                                                                |
| `operacion_id`           | bigint (FK)         | **No**   | `restrictOnDelete`                                             |
| `empleado_id`            | bigint (FK)         | No       |                                                                |
| `categoria`              | enum(PALMA, FINCA)  | No       | Discriminador principal                                        |
| `tipo`                   | enum(PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS) | Sí | Solo cuando `categoria = PALMA`                                |
| `labor_id`               | bigint (FK)         | Sí       | Solo cuando `categoria = FINCA` (→ `labores.id`)               |
| `lote_id`                | bigint (FK)         | Sí       | Palma: obligatorio. Finca: NULL                                |
| `sublote_id`             | bigint (FK)         | Sí       |                                                                |
| `cantidad_palmas`        | integer             | Sí       | PLATEO/PODA/FERTILIZACION: obligatorio                         |
| `insumo_id`              | bigint (FK)         | Sí       | Solo FERTILIZACION                                             |
| `gramos_por_palma`       | integer             | Sí       | Solo FERTILIZACION                                             |
| `descripcion`            | text                | Sí       | SANIDAD/OTROS: obligatorio                                     |
| `nombre_trabajo`         | varchar(255)        | Sí       | Solo OTROS: obligatorio (UI: "Nombre del trabajo")             |
| `ubicacion`              | varchar(255)        | Sí       | Solo FINCA                                                     |
| `valor_unitario`         | decimal(12,2)       | Sí       | Precio por palma / valor_base de la labor                      |
| `precio_insumo_snapshot` | decimal(12,2)       | Sí       | Solo FERTILIZACION — snapshot de `precio_abono.precio_palma`   |
| `valor_total`            | decimal(12,2)       | **Sí**   | NULL permitido en SANIDAD/OTROS sin precio configurado         |
| `observacion`            | text                | Sí       |                                                                |
| `sync_uuid`              | uuid                | Sí       | unique                                                         |
| `sync_estado`            | enum(LOCAL, SINCRONIZADO) | No | default: SINCRONIZADO                                          |
| `estado`                 | boolean             | No       | default: true                                                  |

**Índices:** `(tenant_id, operacion_id, empleado_id)`, `(tenant_id, categoria, tipo)`, `(tenant_id, estado)`.

### 4.2 Matriz de campos por categoría/tipo

| Campo             | PLATEO | PODA | FERTILIZACION | SANIDAD | OTROS | FINCA |
|-------------------|--------|------|---------------|---------|-------|-------|
| `tipo`            | PLATEO | PODA | FERTILIZACION | SANIDAD | OTROS | NULL  |
| `labor_id`        | NULL   | NULL | NULL          | NULL    | NULL  | ✔     |
| `lote_id`/`sublote_id` | ✔ | ✔    | ✔             | ✔       | ✔     | NULL  |
| `cantidad_palmas` | ✔      | ✔    | ✔             | NULL    | NULL  | NULL  |
| `insumo_id`       | NULL   | NULL | ✔             | NULL    | NULL  | NULL  |
| `gramos_por_palma`| NULL   | NULL | ✔             | NULL    | NULL  | NULL  |
| `descripcion`     | NULL   | NULL | NULL          | ✔       | ✔     | NULL  |
| `nombre_trabajo`  | NULL   | NULL | NULL          | NULL    | ✔     | NULL  |
| `ubicacion`       | NULL   | NULL | NULL          | NULL    | NULL  | ✔     |

### 4.3 Fórmulas de Cálculo (`JornalCalculationService`)

```
calcularPalma(tipo=PLATEO|PODA, tenant_id, cantidad_palmas):
  precio         = precios_palma.where(tenant_id, tipo).precio_palma
  valor_unitario = precio
  valor_total    = cantidad_palmas × precio

calcularPalma(tipo=FERTILIZACION, tenant_id, cantidad_palmas, insumo_id, gramos_por_palma):
  precio         = precio_abono.buscar_rango(tenant_id, gramos_por_palma).precio_palma
  valor_unitario = precio
  precio_insumo_snapshot = precio
  valor_total    = cantidad_palmas × precio

calcularPalma(tipo=SANIDAD|OTROS, tenant_id):
  precio = precios_palma.where(tenant_id, tipo).precio_palma
  si precio IS NULL:
    valor_total = NULL   ← estructura guardada, precio pendiente
  sino:
    valor_unitario = precio
    valor_total    = precio    ← valor plano, sin multiplicar

calcularFinca(labor_id):
  valor_unitario = labor.valor_base
  valor_total    = labor.valor_base
```

### 4.4 Validación (`StoreJornalRequest`)

- `categoria='PALMA'` → requiere `tipo`; prohíbe `labor_id`, `ubicacion`, `horas_extra`.
- `categoria='FINCA'` → requiere `labor_id`; prohíbe `tipo`, `cantidad_palmas`, `insumo_id`, `gramos_por_palma`, `descripcion`, `horas_extra`.
- PLATEO/PODA → requieren `cantidad_palmas`; prohíben `insumo_id`, `gramos_por_palma`.
- FERTILIZACION → requiere `cantidad_palmas`, `insumo_id`, `gramos_por_palma`.
- SANIDAD → requiere `descripcion`; prohíbe `insumo_id`, `gramos_por_palma`, `nombre_trabajo`, `cantidad_palmas`.
- OTROS → requiere `descripcion` **y** `nombre_trabajo`; prohíbe `insumo_id`, `gramos_por_palma`, `cantidad_palmas`.

### 4.5 Modelo `Jornal` — Relaciones y Scopes

**Archivo:** `app/Models/Jornal.php`

| Relación / Método             | Tipo       | Descripción                                                    |
|-------------------------------|------------|----------------------------------------------------------------|
| `operacion()`                 | BelongsTo  | Operación padre                                                |
| `empleado()`                  | BelongsTo  | Empleado                                                       |
| `labor()`                     | BelongsTo  | Labor de finca (nullable)                                      |
| `lote()` / `sublote()`        | BelongsTo  |                                                                |
| `insumo()`                    | BelongsTo  | Insumo aplicado (solo FERTILIZACION)                           |
| `getFechaAttribute()`         | Accessor   | Retorna `operacion.fecha`                                      |
| `scopePalma()` / `scopeFinca()` | Scope    | Filtra por categoría                                           |
| `scopeDeTipo($tipo)`          | Scope      | Filtra por `tipo`                                              |
| `scopeEnRango($q, $ini, $fin)`| Scope      | Filtra por fecha de operación                                  |
| `scopeActivos()`              | Scope      | Filtra por `estado = true`                                     |
| `isPalma()` / `isFinca()`     | Helper     |                                                                |

**Constantes:** `Jornal::CATEGORIA_PALMA`, `CATEGORIA_FINCA`, `TIPO_PLATEO`, `TIPO_PODA`, `TIPO_FERTILIZACION`, `TIPO_SANIDAD`, `TIPO_OTROS`, `TIPOS_PALMA` (array).

---

## 5. Relación con Operaciones

La tabla `operaciones` es la **planilla diaria** del tenant (UNIQUE `tenant_id`, `fecha`). El wizard de 4 pasos persiste todo en una transacción:

```
operaciones (planilla del día)
  ├── registro_cosecha[] + cosecha_cuadrilla[]  ← paso 2, tab COSECHA
  ├── jornales[] (categoria=PALMA)              ← paso 2, tabs PLATEO/PODA/FERTILIZACION/SANIDAD/OTROS
  ├── jornales[] (categoria=FINCA)              ← paso 3, Labores de Finca
  └── ausencias[]                               ← paso 4, Finalización
```

Campos relevantes de `operaciones` (post-rediseño):

| Campo             | Tipo     | Descripción                                   |
|-------------------|----------|-----------------------------------------------|
| `fecha`           | date     | Fecha de la planilla                          |
| `estado`          | enum     | BORRADOR → APROBADA                           |
| `hubo_lluvia`     | boolean  | Si llovió ese día                             |
| `hora_inicio`     | time     | Hora de inicio de labores                     |
| `observaciones`   | text     |                                               |
| `creado_por`      | FK users |                                               |
| `aprobado_por`    | FK users |                                               |
| `aprobado_at`     | timestamp |                                              |

---

## 6. Relación con Nómina

| Escenario             | Empleado PRODUCCION                                       | Empleado FIJO                                |
|-----------------------|-----------------------------------------------------------|----------------------------------------------|
| Se registra jornal    | Sí                                                        | Sí                                           |
| Calcula `valor_total` | Sí                                                        | Sí                                           |
| En nómina             | Su sueldo = Σ jornales + Σ cosecha_cuadrilla del período  | Su sueldo = `empleado.salario_base` siempre  |
| Propósito del jornal  | **Calcular su remuneración**                              | **Tracking** (qué hizo ese día)              |

La tabla `nomina_jornal_ref` guarda snapshots de los jornales incluidos en cada nómina. La tabla `nomina_cosecha_ref` hace lo mismo con `cosecha_cuadrilla`.

Agregador de nómina (a implementar en `NominaCalculationService`):

```sql
-- Por empleado, en rango [nomina.fecha_inicio, nomina.fecha_fin]:
SELECT j.empleado_id, SUM(j.valor_total) AS total_jornales
FROM jornales j
JOIN operaciones o ON o.id = j.operacion_id
WHERE o.tenant_id = :tenant
  AND o.fecha BETWEEN :inicio AND :fin
  AND j.estado = true
  AND j.valor_total IS NOT NULL
GROUP BY j.empleado_id;

-- Sumar aparte cosecha_cuadrilla.valor_calculado por la misma ventana.
-- Aplicar descuentos/pagos de ausencias según reglas documentadas en CONTEXTO.md §6.9.
```

---

## 7. Soporte Offline

`sync_uuid` + `sync_estado` permiten que la PWA registre jornales en campo sin internet. El backend deduplica por `sync_uuid` (UNIQUE).

---

## 8. API REST

### 8.1 Labores de Finca (CRUD implementado)

> **Base URL:** `{{host}}/api/v1/tenant/labores`

| Método   | Endpoint          | Descripción                              |
|----------|-------------------|------------------------------------------|
| `GET`    | `/labores/select` | Listado liviano para dropdowns del wizard (sin paginación). Devuelve `{id, nombre, valor_base}`. Filtros: `?estado=false` para inactivas. |
| `GET`    | `/labores`        | Listar (paginado, filtrable por `search`, `estado`) |
| `GET`    | `/labores/{id}`   | Ver detalle                              |
| `POST`   | `/labores`        | Crear nueva labor (`nombre`, `valor_base`) |
| `PUT`    | `/labores/{id}`   | Actualizar                               |
| `DELETE` | `/labores/{id}`   | Eliminar (409 `LABOR_CON_JORNALES` si tiene jornales) |

**Permisos:**
- `/labores/select` acepta cualquiera de: `configuracion.editar`, `operaciones.crear`, `operaciones.editar` — para que un operador del wizard pueda poblar el dropdown sin tener permiso admin.
- Los demás verbos CRUD (`index`, `show`, `store`, `update`, `destroy`) requieren `configuracion.editar`.

### 8.2 Precios de Palma (CRUD implementado)

> **Base URL:** `{{host}}/api/v1/tenant/precios-palma`

Los 4 registros se crean automáticamente al provisionar el tenant (`precio_palma = 0`). El admin solo los actualiza.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/precios-palma` | Listar los 4 tipos con sus precios (sin paginación) |
| `GET` | `/precios-palma/{id}` | Ver detalle de un tipo |
| `PUT` | `/precios-palma/{id}` | Actualizar `precio_palma` y/o `estado` |

**Permisos:** `configuracion.editar`.

Documentación completa con payloads y ejemplos: [API_PARAMETRICAS.md §4b](./API_PARAMETRICAS.md).

### 8.3 Operaciones, Cosechas y Jornales (implementados)

Los jornales se gestionan como recursos anidados a una Operación. El wizard del frontend persiste tarjeta por tarjeta (POST por cada "Agregar X") y consulta `/operaciones/{id}/resumen` para refrescar el panel derecho.

| Método | Endpoint | Permiso |
|---|---|---|
| `GET` | `/operaciones` | `operaciones.ver` |
| `POST` | `/operaciones` | `operaciones.crear` |
| `GET` | `/operaciones/{id}` | `operaciones.ver` |
| `GET` | `/operaciones/{id}/resumen` | `operaciones.ver` |
| `PUT` | `/operaciones/{id}` | `operaciones.editar` |
| `DELETE` | `/operaciones/{id}` | `operaciones.eliminar` |
| `POST` | `/operaciones/{id}/aprobar` | `operaciones.aprobar` |
| `POST` | `/operaciones/{id}/cosechas` | `operaciones.crear` |
| `PUT` | `/cosechas/{id}` | `operaciones.editar` |
| `DELETE` | `/cosechas/{id}` | `operaciones.eliminar` |
| `POST` | `/operaciones/{id}/jornales` | `operaciones.crear` |
| `PUT` | `/jornales/{id}` | `operaciones.editar` |
| `DELETE` | `/jornales/{id}` | `operaciones.eliminar` |

Documentación completa con payloads, respuestas y ejemplos cURL: [API_OPERACIONES.md](./API_OPERACIONES.md).

**Puntos clave:**
- Cualquier PUT/DELETE sobre una planilla **APROBADA** devuelve 409 `OPERACION_APROBADA`.
- Una cosecha asignada a un viaje no se puede eliminar → 409 `COSECHA_EN_VIAJE`.
- Un error de cálculo (ej. precio no configurado para el `tipo`, insumo sin rango en `precio_abono`) devuelve 422 `CALC_ERROR`.

---

## 9. Diagrama de Relaciones

```
┌──────────┐     ┌──────────────┐
│  tenants │──<──│    labores   │   (catálogo Finca: nombre + valor_base)
└──────────┘     └──────┬───────┘
                        │ 1
┌────────────┐          │                    ┌───────────────┐
│ precios_   │          │ N                  │  precio_abono │
│  palma     │    ┌─────┴──────┐             │ (rangos grams)│
│ (por tipo) │    │  jornales  │             └───────┬───────┘
└────┬───────┘    │            │                     │
     │            │ categoria  │─────────────────────┘ (FERTILIZACION)
     │            │ tipo       │
     └────────────│ labor_id   │─────< empleados
                  │ lote_id    │
                  │ sublote_id │    ┌──────────────┐
                  │ valor_total│    │ operaciones  │
                  └──────┬─────┘────│              │
                         │          │ fecha        │
                         │          │ hubo_lluvia  │
                         │          │ estado       │
                         │          └──────────────┘
                         │
                         │  (COSECHA NO usa jornales)
                         └──> registro_cosecha + cosecha_cuadrilla
```
