# Labores y Jornales — Modelo de Datos y Lógica de Negocio

> Documentación interna del módulo de **Labores** (tabla unificada palma + finca) y **Jornales** (registros por empleado dentro de la planilla diaria).

---

## 1. Visión General

```
Operacion (planilla diaria, 1 por tenant/fecha)
  ├── registro_cosecha[]  ← COSECHA (labor fija) con cuadrilla
  │     └── cosecha_cuadrilla[]  ← valor por empleado
  ├── jornales[]          ← PLATEO, PODA, FERTILIZACION, SANIDAD, custom PALMA, custom FINCA
  ├── ausencias[]         ← incapacidades, licencias, permisos
  └── horas_extra[]       ← recargos CST (HED, HEN, RN, HRD, HEDF, HENF, RND)
```

- **Catálogo único `labores`** (post unificación) — contiene:
  - **5 labores fijas del sistema** (`es_sistema=true`, `categoria='PALMA'`): COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD. Una por tenant, sembradas al provisionar. No se pueden borrar ni renombrar.
  - **Labores custom de palma** (`es_sistema=false`, `categoria='PALMA'`, `tipo=NULL`): libres a crear; `tipo_pago` configurable POR_PALMA / JORNAL_FIJO.
  - **Labores custom de finca** (`es_sistema=false`, `categoria='FINCA'`, `tipo=NULL`): libres a crear; `tipo_pago` siempre `JORNAL_FIJO` (forzado por el modelo).
- **Cada labor tiene un `tipo_pago`** (`POR_PALMA` o `JORNAL_FIJO`). Aplica a todas, incluso a las fijas del core.
- **COSECHA** vive aparte en `registro_cosecha` + `cosecha_cuadrilla` (mantiene la lógica especial de cuadrilla, peso y `precios_cosecha` cuando es POR_PALMA).
- **FERTILIZACION** en POR_PALMA usa `precio_abono` por rango de gramos como precio. En JORNAL_FIJO usa `labor.precio_palma` plano.
- Los jornales **no tienen fecha propia** — heredan la fecha de la **Operación** padre (`operaciones.fecha`).

---

## 2. Tabla `labores` — Catálogo Unificado

### 2.1 Esquema

| Columna | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | bigint (PK) | No | |
| `tenant_id` | bigint (FK) | No | Referencia a `tenants.id` |
| `categoria` | enum(`PALMA`,`FINCA`) | No | Discriminador principal |
| `tipo` | enum(`COSECHA`,`PLATEO`,`PODA`,`FERTILIZACION`,`SANIDAD`) | **Sí** | NOT NULL solo para fijas del sistema; NULL para custom (palma o finca) |
| `nombre` | varchar(100) | No | Fijas: "Cosecha"/"Plateo"/"Poda"/"Fertilización"/"Sanidad" (inmutables). Custom: libre |
| `tipo_pago` | enum(`POR_PALMA`,`JORNAL_FIJO`) | No | Configurable en palma; forzado a `JORNAL_FIJO` en `categoria=FINCA` |
| `precio_palma` | decimal(12,2) | **Sí** | POR_PALMA: precio/palma. JORNAL_FIJO: valor plano. NULL = aún no configurado |
| `es_sistema` | boolean | No | `true` = labor fija inmutable; `false` = custom |
| `estado` | boolean | No | default: `true` |
| `created_at` / `updated_at` | timestamp | Sí | |

**Constraints:**
- `UNIQUE (tenant_id, nombre)` — nombre único por tenant.
- Índice parcial UNIQUE en PostgreSQL: `(tenant_id, tipo) WHERE tipo IS NOT NULL` — máximo una fija por tipo, NULL no choca con NULL.
- Índices: `(tenant_id, categoria, estado)`, `(tenant_id, es_sistema)`.

**Invariantes** (aplicadas en `Labor::booted()` con `saving`):

- `categoria='FINCA'` ⇒ `tipo_pago='JORNAL_FIJO'`, `tipo=NULL`, `es_sistema=false`.
- `categoria='PALMA'` custom ⇒ `tipo=NULL`.
- `es_sistema=true` ⇒ `categoria='PALMA'`, `tipo` no nulo, `nombre` se revierte al canónico (`Labor::NOMBRES_FIJOS[$tipo]`).
- Borrado de fijas bloqueado a nivel modelo (`DomainException` → 403 `LABOR_DEL_SISTEMA` en el controller).

### 2.2 Modelo `Labor`

**Archivo:** `app/Models/Labor.php`

| Constante | Valor |
|---|---|
| `CATEGORIA_PALMA` / `CATEGORIA_FINCA` | strings |
| `TIPO_COSECHA`, `TIPO_PLATEO`, `TIPO_PODA`, `TIPO_FERTILIZACION`, `TIPO_SANIDAD` | strings |
| `TIPOS_FIJOS` | array con los 5 tipos |
| `NOMBRES_FIJOS` | mapping tipo → nombre canónico ("Cosecha", "Plateo", ...) |
| `TIPO_PAGO_POR_PALMA` / `TIPO_PAGO_JORNAL_FIJO` | strings |
| `TIPOS_PAGO` | array con los 2 tipos de pago |

| Relación / Helper | Descripción |
|---|---|
| `jornales()` | HasMany → `Jornal` (`labor_id`) |
| `registroCosechas()` | HasMany → `RegistroCosecha` (`labor_id`, solo para COSECHA) |
| `esFija()` / `esCustom()` | Helpers booleanos |
| `esPalma()` / `esFinca()` | |
| `esPorPalma()` / `esJornalFijo()` | |
| `esCosecha()` / `esFertilizacion()` | |
| `requiereFlujoCosecha()` | `tipo === 'COSECHA'` — flag para el UI |
| `scopeActivos()` / `scopeSistema()` / `scopeCustom()` | |
| `scopePalma()` / `scopeFinca()` / `scopeDeTipo($tipo)` / `scopePorCategoria($cat)` | |

### 2.3 Provisionamiento por tenant

Al crear un tenant (`Admin\TenantController::store` → `seedLaboresFijas`) se siembran las 5 fijas con `precio_palma=NULL`:

| `tipo` | `tipo_pago` default | `precio_palma` |
|---|---|---|
| COSECHA | `POR_PALMA` | NULL |
| PLATEO | `POR_PALMA` | NULL |
| PODA | `POR_PALMA` | NULL |
| FERTILIZACION | `POR_PALMA` | NULL |
| SANIDAD | `JORNAL_FIJO` | NULL |

El admin las configura desde el módulo de Configuración (precio + tipo_pago si desea cambiarlo).

---

## 3. Precios complementarios

Algunas labores resuelven el precio en una tabla externa según su configuración:

| Labor | tipo_pago | Tabla de precio | Llave |
|---|---|---|---|
| COSECHA | `POR_PALMA` | `precios_cosecha` | `(lote_id, anio)` |
| COSECHA | `JORNAL_FIJO` | n/a — usa `labor.precio_palma` | |
| FERTILIZACION | `POR_PALMA` | `precio_abono` | rango `gramos_por_palma` |
| FERTILIZACION | `JORNAL_FIJO` | n/a — usa `labor.precio_palma` | |
| PLATEO / PODA / SANIDAD / custom PALMA | cualquiera | n/a — usa `labor.precio_palma` | |
| custom FINCA | `JORNAL_FIJO` | n/a — usa `labor.precio_palma` | |

### 3.1 `precios_cosecha`

Tabla por tenant indexada por `(lote_id, anio)` → `precio` (por kg). Solo se consulta cuando la labor COSECHA está en `tipo_pago=POR_PALMA`.

### 3.2 `precio_abono`

Tabla genérica por tenant con rangos `(gramos_min, gramos_max)` → `precio_palma`. Solo se consulta cuando la labor FERTILIZACION está en `tipo_pago=POR_PALMA`.

### 3.3 Catálogo `insumos` y creación desde el wizard

La tabla `insumos` es el catálogo de fertilizantes / abonos al que apunta `jornales.insumo_id`. Tiene UNIQUE `(tenant_id, nombre)`. Hay dos formas de crear un registro:

- **CRUD admin:** `POST /insumos` (módulo configuración, requiere `configuracion.editar`). Pide `nombre` + `unidad_medida`.
- **Wizard de Operaciones:** `POST /operaciones/insumos` (requiere `operaciones.crear|editar`). Solo recibe `nombre`; `unidad_medida` se setea a `'GRAMOS'` por default. Si el nombre ya existe, devuelve **409 `INSUMO_DUPLICADO`**. Detalles en [API_OPERACIONES.md §3.2](./API_OPERACIONES.md).

`insumo_id` y `gramos_por_palma` son **requeridos** en FERTILIZACION POR_PALMA (entran al cálculo) y **opcionales** en FERTILIZACION JORNAL_FIJO (tracking agronómico).

---

## 4. Tabla `jornales`

### 4.1 Esquema

| Columna | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | bigint (PK) | No | |
| `tenant_id` | bigint (FK) | No | |
| `operacion_id` | bigint (FK) | **No** | `restrictOnDelete` |
| `empleado_id` | bigint (FK) | No | |
| `categoria` | enum(`PALMA`,`FINCA`) | No | Snapshot de `labor.categoria` al momento del registro |
| `tipo` | enum(`PLATEO`,`PODA`,`FERTILIZACION`,`SANIDAD`) | Sí | Snapshot de `labor.tipo`. NULL para labores custom |
| `labor_id` | bigint (FK) | **No** | Apunta SIEMPRE a `labores.id`. `restrictOnDelete` |
| `lote_id` | bigint (FK) | Sí | |
| `sublote_id` | bigint (FK) | Sí | |
| `cantidad_palmas` | integer | Sí | Requerido si `labor.tipo_pago=POR_PALMA` |
| `insumo_id` | bigint (FK) | Sí | Solo FERTILIZACION |
| `gramos_por_palma` | integer | Sí | Solo FERTILIZACION |
| `descripcion` | text | Sí | SANIDAD: requerido. Otras: opcional |
| `nombre_trabajo` | varchar(255) | Sí | Opcional (legado / referencia) |
| `ubicacion` | varchar(255) | Sí | Solo FINCA |
| `valor_unitario` | decimal(12,2) | Sí | Precio por palma o valor plano |
| `precio_insumo_snapshot` | decimal(12,2) | Sí | Solo FERTILIZACION POR_PALMA — snapshot de `precio_abono.precio_palma` |
| `valor_total` | decimal(12,2) | **Sí** | NULL permitido si la labor aún no tiene precio configurado |
| `observacion` | text | Sí | |
| `sync_uuid` | uuid | Sí | unique |
| `sync_estado` | enum(`LOCAL`,`SINCRONIZADO`) | No | default: `SINCRONIZADO` |
| `estado` | boolean | No | default: `true` |

**Índices:** `(tenant_id, operacion_id, empleado_id)`, `(tenant_id, categoria, tipo)`, `(tenant_id, estado)`.

> **Snapshots `categoria` y `tipo`:** se llenan a partir de la labor cargada al crear o actualizar el jornal. Permanecen estables aunque la labor cambie luego. Sirven para el resumen de la operación y la agrupación del desprendible sin tener que hacer JOIN.

### 4.2 Matriz de campos por labor

| Campo | COSECHA POR_PALMA | COSECHA JORNAL_FIJO | PLATEO/PODA POR_PALMA | PLATEO/PODA JORNAL_FIJO | FERTILIZACION POR_PALMA | FERTILIZACION JORNAL_FIJO | SANIDAD POR_PALMA | SANIDAD JORNAL_FIJO | Custom PALMA POR_PALMA | Custom PALMA JORNAL_FIJO | Custom FINCA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `categoria` snapshot | n/a (no es jornal) | n/a | PALMA | PALMA | PALMA | PALMA | PALMA | PALMA | PALMA | PALMA | FINCA |
| `tipo` snapshot | — | — | PLATEO/PODA | PLATEO/PODA | FERTILIZACION | FERTILIZACION | SANIDAD | SANIDAD | NULL | NULL | NULL |
| `labor_id` | — | — | fija | fija | fija | fija | fija | fija | custom | custom | custom |
| `lote_id`/`sublote_id` | — | — | ✔ | opc | ✔ | opc | opc | opc | opc | opc | NULL |
| `cantidad_palmas` | — | — | ✔ | ❌ | ✔ | opc | ✔ | ❌ | ✔ | ❌ | ❌ |
| `insumo_id` | — | — | ❌ | ❌ | ✔ | opc | ❌ | ❌ | ❌ | ❌ | ❌ |
| `gramos_por_palma` | — | — | ❌ | ❌ | ✔ | opc | ❌ | ❌ | ❌ | ❌ | ❌ |
| `descripcion` | — | — | opc | opc | opc | opc | ✔ | ✔ | opc | opc | ❌ |
| `nombre_trabajo` | — | — | opc | opc | opc | opc | opc | opc | opc | opc | ❌ |
| `ubicacion` | — | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | opc |

> COSECHA NUNCA se registra como jornal. El endpoint `/operaciones/{id}/jornales` devuelve `422 CALC_ERROR` si llega `labor_id` apuntando a la fija COSECHA. Usa siempre `/operaciones/{id}/cosechas`.

### 4.3 Fórmulas de Cálculo

**`JornalCalculationService::calcular(Labor $labor, array $data)`** (`app/Services/JornalCalculationService.php`):

```
si labor.tipo === COSECHA
  → throw "usa /operaciones/{id}/cosechas"

si labor.tipo_pago === POR_PALMA:
  si labor.tipo === FERTILIZACION:
    requiere cantidad_palmas + insumo_id + gramos_por_palma
    precio = precio_abono.buscar_rango(tenant, gramos).precio_palma
    valor_unitario        = precio
    precio_insumo_snapshot = precio
    valor_total           = cantidad_palmas × precio
  sino (PLATEO/PODA/SANIDAD/custom PALMA):
    requiere cantidad_palmas
    si labor.precio_palma IS NULL → [null, null, null]
    valor_unitario = labor.precio_palma
    valor_total    = cantidad_palmas × labor.precio_palma

si labor.tipo_pago === JORNAL_FIJO:
  si labor.precio_palma IS NULL → [null, null, null]
  valor_unitario = labor.precio_palma
  valor_total    = labor.precio_palma    ← valor plano
```

**`CosechaCalculationService::calcular(Labor $laborCosecha, int $loteId, int $anio, ?float $peso)`** (`app/Services/CosechaCalculationService.php`):

```
si laborCosecha.tipo_pago === POR_PALMA  (modo histórico, sin cambios):
  precio   = precios_cosecha.where(lote_id, anio).value('precio')
  promedio = promedio_lote.where(lote_id, anio).value('promedio')   ← snapshot informativo
  si peso !== null y precio IS NULL → CALC_ERROR
  valor_total = (peso !== null y precio !== null) ? peso × precio : NULL

si laborCosecha.tipo_pago === JORNAL_FIJO:
  si laborCosecha.precio_palma IS NULL → CALC_ERROR
  valor_total           = laborCosecha.precio_palma   ← valor plano
  precio_cosecha        = NULL
  promedio_kg_gajo      = NULL
  (peso, si llega, se persiste como tracking agronómico pero NO afecta el cálculo)

distribuirCuadrilla(valor_total, peso, N):
  valor_calculado_empleado = valor_total / N
  peso_calculado_empleado  = peso / N        (peso puede ser NULL en JORNAL_FIJO)
```

### 4.4 Validación (`StoreJornalRequest`)

El cliente envía SOLO `labor_id` — `categoria` y `tipo` se derivan en `prepareForValidation`. Reglas condicionales aplicadas en `withValidator`:

- `labor.tipo=COSECHA` → rechaza con mensaje claro.
- `labor.categoria=FINCA` → prohíbe `cantidad_palmas`, `insumo_id`, `gramos_por_palma`, `descripcion`. Permite `ubicacion`.
- `labor.tipo=FERTILIZACION + POR_PALMA` → requiere `cantidad_palmas`, `insumo_id`, `gramos_por_palma`.
- `labor.tipo=FERTILIZACION + JORNAL_FIJO` → `cantidad_palmas`, `insumo_id`, `gramos_por_palma` opcionales (tracking).
- `labor.tipo=SANIDAD` → requiere `descripcion`.
- `labor.tipo_pago=POR_PALMA` (PLATEO/PODA/SANIDAD/custom PALMA) → requiere `cantidad_palmas`.
- `labor.tipo_pago=JORNAL_FIJO` (PALMA no-fertilización) → prohíbe `cantidad_palmas`.
- PALMA → prohíbe `ubicacion`.

### 4.5 Modelo `Jornal` — Relaciones y Scopes

**Archivo:** `app/Models/Jornal.php`

| Relación / Método | Tipo | Descripción |
|---|---|---|
| `operacion()` | BelongsTo | Operación padre |
| `empleado()` | BelongsTo | Empleado |
| `labor()` | BelongsTo | Labor (palma o finca, fija o custom) |
| `lote()` / `sublote()` | BelongsTo | |
| `insumo()` | BelongsTo | Solo FERTILIZACION POR_PALMA |
| `getFechaAttribute()` | Accessor | Retorna `operacion.fecha` |
| `scopePalma()` / `scopeFinca()` | Scope | |
| `scopeDeTipo($tipo)` | Scope | |
| `scopeEnRango($q, $ini, $fin)` | Scope | |
| `scopeActivos()` | Scope | |
| `isPalma()` / `isFinca()` | Helper | |

**Constantes:** `CATEGORIA_PALMA`, `CATEGORIA_FINCA`, `TIPO_PLATEO`, `TIPO_PODA`, `TIPO_FERTILIZACION`, `TIPO_SANIDAD`, `TIPOS_PALMA` (array de 4 — sin OTROS).

---

## 5. Tabla `registro_cosecha`

Sin cambios estructurales mayores. Agrega snapshot de la labor COSECHA usada:

| Columna nueva | Tipo | Notas |
|---|---|---|
| `labor_id` | bigint (FK→`labores`, NULL) | Snapshot de la labor COSECHA del tenant al momento de registrar. NULL en cosechas históricas pre-refactor (se resuelven al vuelo a la fija del tenant) |

Las cosechas nuevas (`RegistroCosechaController::store`) llenan `labor_id` automáticamente. El servicio usa esa labor para decidir POR_PALMA vs JORNAL_FIJO.

---

## 6. Relación con Operaciones

La tabla `operaciones` es la **planilla diaria** del tenant (UNIQUE `tenant_id, fecha`). El wizard de 5 pasos persiste todo en una transacción:

```
operaciones (planilla del día)
  ├── registro_cosecha[] + cosecha_cuadrilla[]  ← paso 2, tab COSECHA
  ├── jornales[] (categoria=PALMA)              ← paso 2, tabs PLATEO/PODA/FERTILIZACION/SANIDAD/OTROS
  ├── jornales[] (categoria=FINCA)              ← paso 3, Labores de Finca
  ├── horas_extra[]                             ← paso 4
  └── ausencias[]                               ← paso 5 (Finalización)
```

**Resumen** (`GET /operaciones/{id}/resumen`): cuenta por (categoria, tipo). La regla para `otros` es **"jornales de PALMA con `tipo IS NULL`"** (labores custom de palma). El bucket `cosecha` cuenta `registro_cosecha` (no jornales).

---

## 7. Relación con Nómina

| Escenario | Empleado PRODUCCION | Empleado FIJO |
|---|---|---|
| Se registra jornal | Sí | Sí |
| Calcula `valor_total` | Sí | Sí |
| En nómina | Sueldo = Σ jornales + Σ cosecha_cuadrilla del período | Sueldo = `empleado.salario_base` siempre |
| Propósito del jornal | **Calcular remuneración** | **Tracking** (qué hizo ese día) |

`nomina_jornal_ref` y `nomina_cosecha_ref` guardan snapshots de jornales y cuadrilla incluidos en cada nómina.

El **`AgrupadorJornalesService`** del desprendible agrupa jornales de PALMA por tipo. Los jornales con `tipo IS NULL` (labores custom de palma) van al bucket "otros" del desprendible. Para reportes históricos usa la heurística `cantidad_palmas IS NOT NULL ⇒ POR_PALMA` cuando inspecciona snapshots viejos.

---

## 8. Soporte Offline

`sync_uuid` + `sync_estado` permiten que la PWA registre jornales y cosechas en campo sin internet. El backend deduplica por `sync_uuid` (UNIQUE).

---

## 9. API REST

### 9.1 Labores (CRUD unificado)

> **Base URL:** `{{host}}/api/v1/tenant/labores`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/labores/select` | Listado liviano para dropdowns del wizard. Filtro `?categoria=PALMA\|FINCA`. Devuelve `{id, nombre, categoria, tipo, tipo_pago, precio_palma, es_sistema, requiere_cosecha_workflow}` |
| `GET` | `/labores` | Listar (paginado, filtros `search`, `categoria`, `tipo`, `tipo_pago`, `es_sistema`, `estado`) |
| `GET` | `/labores/{id}` | Detalle |
| `POST` | `/labores` | Crear labor **custom** (siempre `es_sistema=false`, `tipo=NULL`). Body: `categoria`, `nombre`, `tipo_pago` (FINCA fuerza `JORNAL_FIJO`), `precio_palma` opcional, `estado` opcional |
| `PUT` | `/labores/{id}` | Actualizar. **Fijas:** solo `tipo_pago`, `precio_palma`, `estado`. **Custom:** todo excepto `categoria`, `tipo`, `es_sistema` |
| `DELETE` | `/labores/{id}` | Eliminar. 403 `LABOR_DEL_SISTEMA` si es fija; 409 `LABOR_CON_JORNALES` si tiene jornales; 409 `LABOR_CON_COSECHAS` si tiene cosechas |

**Permisos:**
- `/labores/select` acepta cualquiera de: `configuracion.editar`, `operaciones.crear`, `operaciones.editar` — para que un operador del wizard pueda poblar el dropdown sin tener permiso admin.
- Los demás verbos CRUD requieren `configuracion.editar`.

**Códigos de error:**
- `409 LABOR_DUPLICADA` — al crear/editar con un nombre que ya existe en el tenant.
- `403 LABOR_DEL_SISTEMA` — al borrar una fija.
- `409 LABOR_CON_JORNALES` / `LABOR_CON_COSECHAS` — al borrar una labor con dependencias.

### 9.2 Operaciones, Cosechas y Jornales

Sin cambios estructurales respecto al doc previo. Los jornales se gestionan como recursos anidados a una Operación. El wizard del frontend persiste tarjeta por tarjeta y consulta `/operaciones/{id}/resumen` para refrescar el panel derecho.

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
- Un error de cálculo (precio no configurado, labor COSECHA pasada a `/jornales`, etc.) devuelve 422 `CALC_ERROR`.

---

## 10. Diagrama de Relaciones

```
┌──────────┐     ┌──────────────────────────┐
│  tenants │──<──│         labores          │  Catálogo único
└──────────┘     │  categoria + tipo +      │  - 5 fijas (es_sistema=true)
                 │  tipo_pago + es_sistema  │  - N custom palma
                 └────────┬─────────────────┘  - N custom finca
                          │ 1
                          │ N
                  ┌───────┴───────┐
                  │   jornales    │─< empleados
                  │ categoria/tipo│
                  │  (snapshot)   │
                  │ labor_id      │
                  │ valor_total   │
                  └──────┬────────┘
                         │
                         │   (COSECHA va aparte)
                         ▼
                ┌──────────────────────┐    ┌───────────────┐
                │   operaciones        │    │ precio_abono  │ ← FERTILIZACION POR_PALMA
                │   (planilla del día) │    │  (rangos)     │
                └──────────────────────┘    └───────────────┘
                         ▲
                         │
                ┌────────┴───────────┐    ┌──────────────────┐
                │  registro_cosecha  │───▶│  precios_cosecha │ ← COSECHA POR_PALMA
                │  + labor_id        │    │  (lote × año)    │
                │  + cuadrilla[]     │    └──────────────────┘
                └────────────────────┘
```
