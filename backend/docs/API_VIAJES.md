# API Viajes — Contrato y Reglas de Negocio

Documento de referencia para implementar los endpoints del módulo de Viajes. Cubre las 3 tablas paramétricas (`empresa_transportadora`, `transportadores`, `extractoras`), la tabla `viajes` refactorizada, su máquina de estados y el dashboard de indicadores.

---

## 1. Visión general

Un **viaje** representa un despacho de fruto de palma desde el predio hacia una **extractora**. El viaje lo realiza un **transportador** (persona natural, asociada a una **empresa transportadora**) en un vehículo con una placa específica.

El ciclo de vida del viaje pasa por **tres estados secuenciales**:

```
CREADO ──▶ EN_VALIDACION ──▶ FINALIZADO
```

- **CREADO**: planilla abierta. Se enlazan las cosechas (`viaje_detalle`) que van en el camión y se hace el **reconteo de gajos** (se corrigen los gajos reportados contra los realmente cargados); también se puede capturar `peso_confirmado` opcional. Es el único estado donde el viaje es editable. Hay **dos rutas de salida**:
  1. **Aprobar reconteo de todos los detalles** → auto-transición a `EN_VALIDACION` (fincas que pagan por producción).
  2. **Saltar a validación** vía `POST /viajes/{id}/saltar-validacion` → no requiere detalles ni reconteos aprobados (fincas que pagan por jornal y no llevan control de cosechas).
- **EN_VALIDACION**: el camión llegó a la extractora y se está validando lo que reportaron. Aquí se hidratan los datos del **formulario de extractora** (peso recibido, número de remisión interna de la extractora, fecha/hora de llegada, observaciones, y los 5 porcentajes de calificación de fruto: verde, sobre maduro, podrido, pedúnculo largo, mal formado). La hidratación puede ocurrir vía OCR del documento (`POST /viajes/{id}/documento-bascula`) o vía captura manual (`PATCH /viajes/{id}/validar`).
- **FINALIZADO**: el viaje está cerrado. Solo lectura. Al entrar a este estado se dispara el cálculo final del promedio kg/gajo en los `registro_cosecha` asociados **solo si hay detalles + peso + gajos**; los viajes "paga por jornal" sin detalles cierran sin recalcular nada.

El campo `remision` (formato `REM-{YYYY}-{NNN}`) se autogenera al crear el viaje y es el identificador visible para el usuario.

---

## 2. Entidades

### 2.1 `empresa_transportadora`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tenant_id` | FK tenants | sí | Multi-tenant |
| `razon_social` | string(150) | sí | |
| `nit` | string(30) | sí | `unique(tenant_id, nit)` |
| `telefono` | string(30) | no | |
| `direccion` | string(200) | no | |
| `ciudad` | string(100) | no | |
| `email` | string(150) | no | |
| `contacto_nombre` | string(150) | no | |
| `observaciones` | text | no | |
| `estado` | boolean | no | default `true` |

### 2.2 `transportadores`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tenant_id` | FK tenants | sí | |
| `empresa_transportadora_id` | FK | sí | `restrictOnDelete` |
| `nombres` | string(100) | sí | |
| `apellidos` | string(100) | sí | |
| `placa_vehiculo` | string(20) | sí | `unique(tenant_id, placa_vehiculo)` |
| `tipo_documento` | string(15) | no | CC, CE, PPT, PASAPORTE |
| `numero_documento` | string(30) | no | |
| `telefono` | string(30) | no | |
| `licencia_conduccion` | string(30) | no | |
| `licencia_vencimiento` | date | no | |
| `tipo_vehiculo` | string(50) | no | "Camión NHR", "Turbo", etc. |
| `capacidad_kg` | decimal(10,2) | no | |
| `observaciones` | text | no | |
| `estado` | boolean | no | default `true` |

### 2.3 `extractoras`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tenant_id` | FK tenants | sí | |
| `razon_social` | string(150) | sí | |
| `nit` | string(30) | sí | `unique(tenant_id, nit)` |
| `ubicacion` | string(200) | sí | Dirección / punto físico |
| `departamento_codigo` | FK departamentos | no | `nullOnDelete` |
| `municipio_codigo` | FK municipios | no | `nullOnDelete` |
| `ciudad` | string(100) | no | |
| `telefono` | string(30) | no | |
| `email` | string(150) | no | |
| `contacto_nombre` | string(150) | no | |
| `distancia_km` | decimal(6,2) | no | Para costeo logístico futuro |
| `observaciones` | text | no | |
| `estado` | boolean | no | default `true` |

### 2.4 `viajes` (refactorizada)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tenant_id` | FK tenants | sí | |
| `empresa_transportadora_id` | FK | sí | Snapshot derivado del transportador |
| `transportador_id` | FK | sí | Seleccionado en el form |
| `extractora_id` | FK | sí | Seleccionado en el form |
| `remision` | string(30) | sí | Auto `REM-{YYYY}-{NNN}` · `unique(tenant_id, remision)` |
| `placa_vehiculo` | string(20) | sí | **Snapshot** del transportador |
| `nombre_conductor` | string(100) | sí | **Snapshot** del transportador |
| `fecha_viaje` | date | sí | |
| `hora_salida` | time | sí | Hora planeada, form de creación |
| `peso_viaje` | decimal(10,2) | no | Peso recibido por la extractora. Se hidrata en EN_VALIDACION (OCR o manual). |
| `cantidad_gajos_total` | integer | no | Se llena con el reconteo (queda NULL en viajes "paga por jornal") |
| `numero_remision_extractora` | string(50) | no | Número interno que asigna la extractora al recibir el camión (etiqueta "N° Remisión" / "No. Documento" en la remisión impresa) |
| `fecha_llegada` | date | no | Reportada por la extractora |
| `hora_llegada` | time | no | Reportada por la extractora |
| `fruto_verde` | decimal(5,2) | no | % de fruto verde según la calificación impresa en la remisión (0–100) |
| `sobre_maduro` | decimal(5,2) | no | % de fruto sobre maduro (0–100) |
| `podrido` | decimal(5,2) | no | % de fruto podrido (0–100) |
| `pedunculo_largo` | decimal(5,2) | no | % de fruto con pedúnculo largo (0–100) |
| `mal_formado` | decimal(5,2) | no | % de fruto mal formado (0–100) |
| `observaciones_extractora` | string(500) | no | Notas que reporta la extractora |
| `observaciones` | string(255) | no | Notas internas del operador |
| `es_homogeneo` | boolean | no | **Solo lectura — calculado por el sistema.** `true` si todas las cosechas activas del viaje son del mismo lote; `false` si hay lotes distintos. Se recalcula en cada `addDetalle`/`removeDetalle`. |
| `estado` | varchar(20) | sí | CHECK: CREADO, EN_VALIDACION, FINALIZADO |
| `estado_activo` | boolean | no | Borrado lógico (renombrado del antiguo `estado`) |
| `despachado_at` | timestamp | no | **Legacy/deprecated** (read-only desde refactor a 3 estados) |
| `llegada_planta_at` | timestamp | no | **Legacy/deprecated** (read-only desde refactor a 3 estados) |
| `validacion_at` | timestamp | no | Audit de transición CREADO → EN_VALIDACION |
| `finalizado_at` | timestamp | no | Audit de transición EN_VALIDACION → FINALIZADO |
| `creado_por` | FK users | no | Auditoría |
| `sync_uuid` | uuid | no | Offline — unique |
| `sync_estado` | enum | no | `LOCAL` \| `SINCRONIZADO` |

> **Columna eliminada:** `numero_viaje` — reemplazado por `remision`.

### 2.5 `viaje_detalle` (pivot — ampliado)

Conecta `viajes` con `registro_cosecha` (N:M). Soporta **cosechas partidas**: una misma cosecha puede repartirse en múltiples viajes (camiones distintos), cada uno con su propio `gajos_en_viaje`.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tenant_id` | FK | sí | |
| `viaje_id` | FK viajes | sí | |
| `cosecha_id` | FK registro_cosecha | sí | |
| `gajos_en_viaje` | integer | no | Gajos de esta cosecha que van en **este** viaje. `NULL` = todos los gajos (modo legacy / sin split). Se usa como reconteo por viaje; al guardar, `registro_cosecha.gajos_reconteo` se actualiza al `SUM` acumulado de todos los splits. |
| `reconteo_aprobado` | boolean | no | default `false` · marca que el supervisor aceptó el conteo |
| `reconteo_aprobado_at` | timestamp | no | |
| `reconteo_aprobado_por` | FK users | no | `nullOnDelete` |
| `estado` | boolean | no | default `true` (soft delete interno) |

**Índice único parcial (Postgres):**

```sql
-- Una cosecha NO puede estar dos veces en el mismo viaje activo,
-- pero SÍ puede estar en varios viajes distintos (split).
CREATE UNIQUE INDEX viaje_detalle_cosecha_viaje_unique
ON viaje_detalle (cosecha_id, viaje_id)
WHERE estado = true;
```

Si el viaje se soft-deletea (`estado_activo = false`) y sus detalles se marcan `estado = false`, los gajos del split quedan liberados para otros viajes.

**Gajos pendientes por enviar (campo computado — no persiste):**
El endpoint `GET /viajes/operaciones/{id}/cosechas` devuelve `gajos_pendientes_enviar`:
```
gajos_pendientes = COALESCE(gajos_reconteo, gajos_reportados) − SUM(gajos_en_viaje de detalles activos con valor explícito)
```

---

## 3. Máquina de estados

| Transición | Endpoint | Requiere estado | Efecto |
|---|---|---|---|
| Crear viaje | `POST /viajes` | — | Crea en `CREADO`. Autogenera `remision`. Snapshot de placa/conductor desde `transportador_id`. |
| Aprobar reconteo de detalle | `POST /viajes/{id}/detalles/{detalleId}/aprobar-reconteo` | `CREADO` | Marca `reconteo_aprobado=true`. **Si todos los detalles del viaje quedan aprobados, el viaje auto-transiciona a `EN_VALIDACION`** (set `validacion_at = now()`). Acción de auditoría: `TRANSICIONAR_VALIDACION` cuando dispara el salto, `APROBAR_RECONTEO` en otro caso. |
| Saltar a validación | `POST /viajes/{id}/saltar-validacion` | `CREADO` | → `EN_VALIDACION`. **No exige** detalles enlazados ni reconteos aprobados. Para fincas que pagan por jornal y no llevan control de cosechas. Set `validacion_at = now()`. Body opcional: `{ observaciones?: string }` se concatena al campo `observaciones` del viaje. Acción auditoría: `SALTAR_VALIDACION`. |
| Validar (captura manual) | `PATCH /viajes/{id}/validar` | `EN_VALIDACION` | Hidrata los datos del formulario de extractora (peso, número de remisión extractora, fecha/hora de llegada, observaciones, y los 5 porcentajes de calificación: fruto_verde, sobre_maduro, podrido, pedunculo_largo, mal_formado). **No transiciona** estado. Todos los campos del payload son opcionales. Acción auditoría: `VALIDAR`. |
| Finalizar | `POST /viajes/{id}/finalizar` | `EN_VALIDACION` | → `FINALIZADO`. Set `finalizado_at = now()`. Dispara cálculo HOMOGENEO/NO_HOMOGENEO solo si el viaje tiene detalles enlazados con peso y gajos; si no hay detalles (paga por jornal), cierra sin recalcular. |
| **OCR formulario extractora** (asistencia) | `POST /viajes/{id}/documento-bascula` | `EN_VALIDACION` | Sube foto/PDF y dispara `ProcesarFormularioExtractoraJob`. El Job extrae los 10 campos con Claude Vision y los guarda en `viaje_documento_bascula.datos_extraidos`; **NO toca la tabla `viajes`**. El frontend hace polling al GET, rellena el form con los datos extraídos y el operador revisa/edita. Al darle "Finalizar y guardar", el frontend dispara `PATCH /validar` + `POST /finalizar` con los datos editados. Si Claude tiene baja confianza o no lee los 3 críticos, el documento queda en `REVISION_MANUAL` (los datos se guardan igual; es solo una alerta visual). Ver [API_VIAJES_OCR_BASCULA.md](./API_VIAJES_OCR_BASCULA.md). |

Reglas cruzadas:

- `PUT /viajes/{id}` solo funciona en `CREADO`.
- Agregar detalles (`POST /viajes/{id}/detalles`), editar reconteo (`PUT /viajes/{id}/detalles/{detalleId}/reconteo`) y eliminar detalles (`DELETE /viajes/{id}/detalles/{detalleId}`) **solo** funcionan con `viaje.estado = CREADO` **y** `detalle.reconteo_aprobado = false`.
- `DELETE /viajes/{id}` es soft (marca `estado_activo = false`); bloqueado si `estado = FINALIZADO`. Al soft-deletear el viaje también se marcan sus detalles `estado = false` (libera las cosechas para otro viaje).
- Intentar una transición desde un estado incorrecto retorna **409** `VIAJE_ESTADO_INVALIDO`.
- Si un detalle tiene `reconteo_aprobado = true` y se intenta editar/eliminar → **409** `DETALLE_APROBADO`.

---

## 4. Endpoints

Todos los endpoints de viajes viven bajo `/api/v1/tenant/`. Requieren JWT + `X-Tenant-Id`.

### 4.1 Paramétricas (permiso `configuracion.editar` para CRUD; `viajes.crear` para los `/select`)

**Selects para el form "Nuevo Viaje"** (ya implementados):

```
GET    /empresas-transportadoras/select                                 Lista empresas activas
GET    /empresas-transportadoras/{empresa}/transportadores              Lista conductores activos de la empresa seleccionada
GET    /extractoras/select                                              Lista extractoras activas
```

**CRUD completo** (pendiente de implementar):

```
GET    /empresas-transportadoras              Listado paginado
POST   /empresas-transportadoras              Crear
GET    /empresas-transportadoras/{id}         Detalle
PUT    /empresas-transportadoras/{id}         Editar
DELETE /empresas-transportadoras/{id}         Soft delete (estado=false)

GET    /transportadores                       Listado paginado · filtro por empresa
POST   /transportadores                       Crear
GET    /transportadores/{id}                  Detalle
PUT    /transportadores/{id}                  Editar
DELETE /transportadores/{id}                  Soft delete

GET    /extractoras                           Listado paginado
POST   /extractoras                           Crear
GET    /extractoras/{id}                      Detalle
PUT    /extractoras/{id}                      Editar
DELETE /extractoras/{id}                      Soft delete
```

**Flujo del form "Nuevo Viaje" (3 selects encadenados):**

1. Al abrir el form, el frontend llama en paralelo:
   - `GET /empresas-transportadoras/select` → pobla dropdown "Transportador" (razón social de la empresa).
   - `GET /extractoras/select` → pobla dropdown "Extractora Destino".
2. Cuando el usuario elige una empresa, el frontend llama:
   - `GET /empresas-transportadoras/{empresa}/transportadores` → pobla dropdown "Conductor" con la lista de conductores de esa empresa (cada item incluye `id`, `nombres`, `apellidos`, `placa_vehiculo`).
3. Al elegir un conductor, el frontend auto-rellena el campo "Placa del Vehículo" con `transportador.placa_vehiculo` (deshabilitado, solo visual).
4. El submit envía `transportador_id` + `extractora_id` + `fecha_viaje` + `hora_salida`. El backend snapshoteá `empresa_transportadora_id`, `placa_vehiculo` y `nombre_conductor` automáticamente.

**Ejemplo de respuestas:**

`GET /empresas-transportadoras/select`
```json
{
  "data": [
    { "id": 1, "razon_social": "Transportes del Llano S.A.S.", "nit": "900123456-1" },
    { "id": 2, "razon_social": "Logística Palmera del Sur S.A.S.", "nit": "901234567-2" }
  ]
}
```

`GET /empresas-transportadoras/1/transportadores`
```json
{
  "data": [
    {
      "id": 12,
      "empresa_transportadora_id": 1,
      "nombres": "Carlos",
      "apellidos": "Rodríguez Pérez",
      "placa_vehiculo": "ABC-123",
      "tipo_vehiculo": "Camión NHR",
      "capacidad_kg": "8500.00"
    }
  ]
}
```

`GET /extractoras/select`
```json
{
  "data": [
    {
      "id": 1,
      "razon_social": "Extractora San Miguel S.A.",
      "nit": "830111222-1",
      "ubicacion": "Km 12 Vía San Martín - Puerto López",
      "ciudad": "San Martín",
      "distancia_km": "45.50"
    }
  ]
}
```

### 4.2 Viajes (permiso `viajes.*`)

```
GET    /viajes                                          Listado + filtros
GET    /viajes/indicadores                              KPIs del dashboard
GET    /viajes/operaciones-disponibles                  Operaciones APROBADAS con cosechas con gajos pendientes de enviar
GET    /viajes/operaciones/{operacionId}/cosechas       Cosechas de una operación con gajos pendientes (sin viaje o con split parcial)

POST   /viajes                                          Crear (estado=CREADO)
GET    /viajes/{id}                                     Detalle con detalles + transportador + extractora
PUT    /viajes/{id}                                     Editar (solo CREADO)
DELETE /viajes/{id}                                     Soft delete

POST   /viajes/{id}/detalles                            Agregar cosecha al viaje (solo CREADO)
DELETE /viajes/{id}/detalles/{detalleId}                Quitar cosecha (solo CREADO, detalle no aprobado)

PUT    /viajes/{id}/detalles/{detalleId}/reconteo       Hidratar gajos_en_viaje + peso_confirmado (solo CREADO, detalle no aprobado)
POST   /viajes/{id}/detalles/{detalleId}/aprobar-reconteo  Aprueba el reconteo de ese detalle (auto-transiciona a EN_VALIDACION si es el último)

POST   /viajes/{id}/saltar-validacion                   CREADO → EN_VALIDACION (sin reconteo, fincas paga-por-jornal)
PATCH  /viajes/{id}/validar                             Hidrata datos del formulario de extractora (no transiciona)
POST   /viajes/{id}/finalizar                           EN_VALIDACION → FINALIZADO

POST   /viajes/{id}/documento-bascula                   Sube formulario de extractora (foto/PDF). 202 + procesamiento async (pendiente OCR).
GET    /viajes/{id}/documento-bascula/{docId}           Polling del estado OCR + estado del viaje.
```

> **Nota:** se eliminó el endpoint `POST /viajes/{id}/despachar` del contrato anterior. El despacho se dispara automáticamente cuando se aprueba el reconteo del último detalle.

**Pattern de implementación (obligatorio):** todos los métodos del controller envuelven la lógica en `try/catch`, usan `DB::transaction()` para operaciones multi-tabla, y registran la acción con `AuditoriaService` (módulo `VIAJES`). Se sigue el mismo patrón que [OperacionController](../app/Http/Controllers/Api/OperacionController.php).

---

## 5. Payloads y ejemplos

### 5.1 `POST /viajes` — Crear viaje

**Request:**
```json
{
  "fecha_viaje": "2026-04-22",
  "hora_salida": "08:30",
  "transportador_id": 12,
  "extractora_id": 3,
  "observaciones": null,
  "sync_uuid": "a3c1..."
}
```

> `es_homogeneo` **no se envía** — el backend lo calcula automáticamente según los lotes de las cosechas asignadas.

**Backend hace (transaccional):**
1. `SELECT ... FOR UPDATE` del transportador → extrae `empresa_transportadora_id`, `placa_vehiculo`, `nombres`, `apellidos`.
2. Calcula `remision` como `REM-{YYYY}-{NNN}` donde `NNN` es `MAX(numero) + 1` para `(tenant_id, YEAR(fecha_viaje))`, con lock pesimista.
3. Inserta el viaje con `estado = 'CREADO'`, `placa_vehiculo` y `nombre_conductor` como snapshot, `empresa_transportadora_id` copiado.

**Response 201:**
```json
{
  "data": {
    "id": 87,
    "remision": "REM-2026-015",
    "fecha_viaje": "2026-04-22",
    "hora_salida": "08:30:00",
    "estado": "CREADO",
    "transportador": {"id": 12, "nombre_completo": "Carlos Rodríguez", "placa_vehiculo": "ABC-123"},
    "empresa": {"id": 4, "razon_social": "Transportes del Llano"},
    "extractora": {"id": 3, "razon_social": "Extractora San Miguel"},
    "placa_vehiculo": "ABC-123",
    "nombre_conductor": "Carlos Rodríguez",
    "peso_viaje": null,
    "cantidad_gajos_total": null,
    "detalles": []
  }
}
```

### 5.2 `GET /viajes/operaciones-disponibles` — Operaciones con cosechas libres

Alimenta el primer dropdown del form "Asignar cosecha al viaje". Lista operaciones `APROBADAS` del tenant que tengan **al menos una** cosecha (`registro_cosecha`) con gajos pendientes de asignar (sin viaje activo, o con split parcial donde aún quedan gajos por enviar).

**Query params:** `search` (parcial sobre `observaciones`/`fecha`), `fecha_desde`, `fecha_hasta`.

**Response:**
```json
{
  "data": [
    {
      "id": 54,
      "fecha": "2026-04-20",
      "estado": "APROBADA",
      "cosechas_disponibles_count": 3
    }
  ]
}
```

### 5.3 `GET /viajes/operaciones/{operacionId}/cosechas` — Cosechas disponibles de una operación

Alimenta el segundo dropdown. Lista `registro_cosecha` de esa operación que tengan **gajos pendientes de enviar**: cosechas sin ningún `viaje_detalle` activo, o con splits parciales donde `gajos_pendientes_enviar > 0`. Cosechas completamente asignadas no aparecen.

`gajos_pendientes_enviar` es un campo computado (no persiste):
```
gajos_pendientes_enviar = COALESCE(gajos_reconteo, gajos_reportados) − SUM(gajos_en_viaje de detalles activos con valor explícito)
```

**Response:**
```json
{
  "data": [
    {
      "id": 142,
      "lote": {"id": 7, "nombre": "Lote 3"},
      "sublote": {"id": 14, "nombre": "S-14"},
      "gajos_reportados": 250,
      "gajos_reconteo": null,
      "gajos_pendientes_enviar": 250,
      "peso_confirmado": null,
      "cuadrilla_count": 4
    }
  ]
}
```

### 5.4 `POST /viajes/{id}/detalles` — Enlazar cosecha

**Request:**
```json
{ "cosecha_id": 142, "gajos_en_viaje": 50 }
```

`gajos_en_viaje` es **opcional**. `null` (o ausente) = todos los gajos restantes van en este viaje (modo legacy). Valor explícito = split parcial: solo esa cantidad de gajos va en este camión.

**Validación (dentro de `DB::transaction` con lock pesimista):**
- `viaje.estado = CREADO` → si no, 409 `VIAJE_NO_EDITABLE`.
- `cosecha_id` pertenece al tenant.
- Operación padre de la cosecha está `APROBADA`.
- Si ya existe un `viaje_detalle` activo con `gajos_en_viaje = NULL` para esa cosecha → 422 `COSECHA_YA_ASIGNADA` (la cosecha completa ya fue asignada en modo legacy).
- Si `gajos_en_viaje` tiene valor, se calcula `gajos_restantes = total − SUM(gajos_en_viaje activos)` con `lockForUpdate()`; si `gajos_en_viaje > gajos_restantes` → 422 `GAJOS_INSUFICIENTES`.
- El índice único `(cosecha_id, viaje_id) WHERE estado = true` previene insertar la misma cosecha dos veces en el mismo viaje → 422 `COSECHA_YA_ASIGNADA`.
- `es_homogeneo` se recalcula automáticamente tras cada operación en detalles (ver §6).

### 5.5 `PUT /viajes/{id}/detalles/{detalleId}/reconteo` — Hidratar gajos en viaje

**Request:**
```json
{
  "gajos_en_viaje": 245,
  "peso_confirmado": 4120.50
}
```

`peso_confirmado` es opcional; `gajos_en_viaje` es obligatorio. Representa el conteo verificado de gajos de **esta cosecha en este camión específico** (equivalente al antiguo `gajos_reconteo` pero a nivel de viaje_detalle para soportar splits).

**Backend hace (transaccional):**
1. Verifica `viaje.estado = CREADO` y `detalle.reconteo_aprobado = false` → si no, 409.
2. Verifica que `detalleId` pertenezca al `viaje_id` → si no, 404.
3. `UPDATE viaje_detalle SET gajos_en_viaje = ? WHERE id = ?`.
4. Recalcula `registro_cosecha.gajos_reconteo = SUM(viaje_detalle.gajos_en_viaje WHERE cosecha_id = X AND estado = true AND gajos_en_viaje IS NOT NULL)`. Esto garantiza que la nómina siempre lea el total verificado acumulado de todos los splits.
5. Si llega `peso_confirmado`, actualiza `registro_cosecha.peso_confirmado`.
6. Refresca `viajes.cantidad_gajos_total = SUM(COALESCE(viaje_detalle.gajos_en_viaje, registro_cosecha.gajos_reconteo, registro_cosecha.gajos_reportados))` sobre los detalles activos del viaje.
7. Auditoría `EDITAR` módulo `VIAJES`.

### 5.6 `POST /viajes/{id}/detalles/{detalleId}/aprobar-reconteo` — Aprobar y auto-despacho

**Request:** sin body.

**Backend hace (transaccional):**
1. Verifica `viaje.estado = CREADO`.
2. Verifica que el **detalle** tenga `gajos_en_viaje IS NOT NULL` → si no, 422 `RECONTEO_PENDIENTE`. El reconteo ahora vive en `viaje_detalle.gajos_en_viaje`, no en `registro_cosecha.gajos_reconteo`.
3. `UPDATE viaje_detalle SET reconteo_aprobado = true, reconteo_aprobado_at = NOW(), reconteo_aprobado_por = userId WHERE id = ?`.
4. Si **todos** los detalles activos del viaje tienen `reconteo_aprobado = true`, se dispara auto-transición:
   - `UPDATE viajes SET estado = 'EN_VALIDACION', validacion_at = NOW() WHERE id = ?`.
5. Auditoría `APROBAR_RECONTEO` (o `TRANSICIONAR_VALIDACION` si corresponde).

**Response:**
```json
{
  "data": {
    "detalle_id": 310,
    "reconteo_aprobado": true,
    "viaje_estado": "EN_VALIDACION",
    "auto_en_validacion": true
  }
}
```

### 5.7 `POST /viajes/{id}/saltar-validacion` — Transición CREADO → EN_VALIDACION (sin reconteo)

Para fincas que pagan por jornal y no llevan control de cosechas. No requiere detalles enlazados ni reconteos aprobados.

**Request (body opcional):**
```json
{ "observaciones": "Finca paga por jornal, no se hace reconteo." }
```

**Backend hace:**
- Valida estado actual = `CREADO` → si no, 409 `VIAJE_ESTADO_INVALIDO`.
- `UPDATE viajes SET estado='EN_VALIDACION', validacion_at=NOW() WHERE id = ?`.
- Si llega `observaciones`, lo concatena al campo `observaciones` del viaje (no al `observaciones_extractora`).
- Auditoría: acción `SALTAR_VALIDACION`, módulo `VIAJES`.

### 5.8 `PATCH /viajes/{id}/validar` — Hidratar datos del formulario de extractora (manual)

Captura manual de los datos que reportó la extractora. **No transiciona** el estado: el cierre lo hace `POST /finalizar` aparte.

**Request (todos los campos opcionales):**
```json
{
  "peso_viaje": 12500.50,
  "numero_remision_extractora": "0042",
  "fecha_llegada": "2026-04-22",
  "hora_llegada": "10:45",
  "fruto_verde": 0,
  "sobre_maduro": 17.5,
  "podrido": 2.5,
  "pedunculo_largo": 0,
  "mal_formado": 5,
  "observaciones_extractora": "Llegada sin novedad."
}
```

**Validación:**
- `viaje.estado = EN_VALIDACION` → si no, 409 `VIAJE_ESTADO_INVALIDO`.
- Cada porcentaje (`fruto_verde`, `sobre_maduro`, `podrido`, `pedunculo_largo`, `mal_formado`) debe estar entre 0 y 100.
- `hora_llegada` debe seguir formato `HH:MM` (24 h).
- Auditoría: acción `VALIDAR`, módulo `VIAJES`.

### 5.8 `GET /viajes` — Listado

**Query params aceptados:**

| Param | Tipo | Notas |
|---|---|---|
| `remision` | string | Búsqueda parcial |
| `fecha` | date | Filtra `fecha_viaje = ?` |
| `fecha_desde` | date | Rango |
| `fecha_hasta` | date | Rango |
| `estado` | CREADO\|EN_VALIDACION\|FINALIZADO | |
| `vehiculo` | string | Búsqueda parcial sobre `placa_vehiculo` (snapshot) |
| `conductor` | string | Búsqueda parcial sobre `nombre_conductor` (snapshot) |
| `extractora_id` | int | |
| `transportador_id` | int | |
| `empresa_transportadora_id` | int | |
| `page` / `per_page` | int | Paginación |

Solo devuelve viajes con `estado_activo = true`.

### 5.9 `GET /viajes/indicadores` — KPIs

**Query params:**

| Param | Tipo | Notas |
|---|---|---|
| `periodo` | MENSUAL\|SEMANAL\|ANUAL\|CUSTOM | Default: MENSUAL |
| `desde` | date | Requerido si `periodo=CUSTOM` |
| `hasta` | date | Requerido si `periodo=CUSTOM` |

**Resolución del rango:**
- `MENSUAL`: desde el día 1 del mes actual hasta hoy.
- `SEMANAL`: últimos 7 días calendario (hoy - 6 → hoy).
- `ANUAL`: desde el 1 de enero del año actual hasta hoy.
- `CUSTOM`: desde / hasta tal cual llegan.

**Response:**
```json
{
  "data": {
    "periodo": "MENSUAL",
    "desde": "2026-04-01",
    "hasta": "2026-04-22",
    "total_viajes": 42,
    "en_validacion": 3,
    "finalizados": 35,
    "kilogramos_totales": "482150.75",
    "gajos_totales": 31200
  }
}
```

> Todos los conteos/sumas filtran por `estado_activo = true` y por el rango `fecha_viaje BETWEEN desde AND hasta`.

---

## 6. Cálculo HOMOGENEO vs NO_HOMOGENEO (al finalizar)

Al pasar a `FINALIZADO`, `ViajeCalculationService::calcularAlFinalizar()` se ejecuta si el viaje tiene detalles enlazados con peso.

### 6.1 HOMOGENEO (`es_homogeneo = true`)

`es_homogeneo` **no lo envía el frontend** — el sistema lo calcula automáticamente cada vez que se agrega o quita una cosecha del viaje:

```
lotes_distintos = COUNT(DISTINCT lote_id de cosechas activas del viaje)
es_homogeneo    = (lotes_distintos <= 1)
```

Cuando un viaje finaliza con `es_homogeneo = true` se crea un registro en `promedio_lote` **por cada lote** involucrado:

```
gajos_efectivos_detalle      = detalle.gajos_en_viaje ?? cosecha.gajos_reconteo ?? cosecha.gajos_reportados
total_gajos_lote             = SUM(gajos_efectivos_detalle) de detalles del mismo lote en el viaje
promedio                     = peso_viaje / total_gajos_lote

→ PromedioLote::create { tenant_id, lote_id, viaje_id, promedio, fecha, anio }
→ UPDATE registro_cosecha SET promedio_kg_gajo = promedio  (snapshot visual)
→ cosecha_cuadrilla.peso_calculado_empleado += floor(gajos_detalle / N) × promedio  (COALESCE acumulado para splits)
```

Estos registros en `promedio_lote` son los que usa `NominaCalculationService` para calcular el pago de cosecha en el período (`AVG(promedio WHERE lote_id=X AND fecha BETWEEN inicio AND fin)`).

> **Cosechas partidas:** cuando la misma cosecha viaja en múltiples camiones, cada viaje crea su propio `PromedioLote` y acumula `peso_calculado_empleado` con `COALESCE(existente, 0) + nuevo`. La nómina promedia los registros de `promedio_lote` del período y obtiene el promedio ponderado real.

### 6.2 NO_HOMOGENEO (`es_homogeneo = false`)

No se crea ningún registro en `promedio_lote`. El viaje finaliza sin registrar promedios históricos; las cosechas del viaje no afectan el cálculo de nómina por la vía del promedio de promedios.

### 6.3 Sin detalles (viaje "paga por jornal")

Si el viaje no tiene detalles enlazados, cierra sin ejecutar ningún cálculo. La validación de `peso_viaje` y `cantidad_gajos_total` se omite.

Si el viaje **tiene detalles enlazados** y `peso_viaje` es `NULL` al finalizar, el controller retorna **422** `VIAJE_INCOMPLETO`.

> **Nota:** `registro_cosecha.valor_total` no se modifica al finalizar el viaje — ese valor ya se calculó al registrar `peso_confirmado` en la operación (capa operativa). Solo `promedio_kg_gajo` se actualiza como snapshot visual para la planilla.

---

## 7. Soporte offline

La tabla `viajes` conserva `sync_uuid` (uuid único) y `sync_estado` (`LOCAL`|`SINCRONIZADO`). La PWA puede crear viajes offline **solo en estado `CREADO`** y con `sync_estado = LOCAL`. El backend detecta duplicados por `sync_uuid` y no los re-inserta al recibirlos tras reconectar. Las transiciones de estado (saltar-validación, validar, finalizar) requieren conectividad.

---

## 8. Permisos

- **Paramétricas** (`empresa_transportadora`, `transportadores`, `extractoras`): CRUD bajo `configuracion.editar`. El endpoint `/select` está abierto a cualquier usuario con `viajes.crear` o `viajes.editar`.
- **Viajes**: `viajes.ver`, `viajes.crear`, `viajes.editar`, `viajes.eliminar` (ya existen en el sistema).
- `GET /viajes/indicadores` requiere `viajes.ver`.

Cuando `tenant_config.modulo_viajes = false`, todos los endpoints retornan **403** `MODULO_DESHABILITADO`.

---

## 9. Códigos de error

| Código HTTP | Error code | Cuándo |
|---|---|---|
| 404 | `VIAJE_NOT_FOUND` | |
| 404 | `DETALLE_NOT_FOUND` | El `detalleId` no pertenece al viaje |
| 409 | `VIAJE_ESTADO_INVALIDO` | Transición desde estado incorrecto |
| 409 | `VIAJE_NO_EDITABLE` | PUT/DELETE/reconteo con estado ≠ CREADO |
| 409 | `DETALLE_APROBADO` | Intento de editar/eliminar un detalle con `reconteo_aprobado = true` |
| 422 | `VIAJE_INCOMPLETO` | Finalizar viaje **con detalles** sin `peso_viaje` o sin `cantidad_gajos_total` |
| 422 | `RECONTEO_PENDIENTE` | Aprobar reconteo sin haber hidratado `gajos_en_viaje` del detalle |
| 422 | `REMISION_DUPLICADA` | Colisión de remisión (muy raro, fallback por concurrencia) |
| 422 | `COSECHA_FUERA_DE_VIAJE` | `reconteo` con una `cosecha_id` que no está en el `viaje_detalle` |
| 422 | `COSECHA_YA_ASIGNADA` | La cosecha ya está asignada completa (modo legacy) o dos veces en el mismo viaje |
| 422 | `GAJOS_INSUFICIENTES` | `gajos_en_viaje` supera los gajos disponibles restantes de la cosecha |
| 422 | `OPERACION_NO_APROBADA` | La operación padre de la cosecha no está `APROBADA` |
| 422 | `TRANSPORTADOR_INACTIVO` | `transportador.estado = false` al crear viaje |
| 422 | `EXTRACTORA_INACTIVA` | `extractora.estado = false` al crear viaje |
| 409 | `VIAJE_ESTADO_INVALIDO` (OCR) | Subir documento de báscula con viaje en estado ≠ EN_VALIDACION |
| 404 | `DOCUMENTO_VIAJE_MISMATCH` | Polling con `documento_id` que no pertenece al `viaje_id` de la URL |
| 503 | `ANTHROPIC_SIN_CONFIGURAR` | Falta `ANTHROPIC_API_KEY` en el env (defensa temprana del POST) |

---

## 10. Modelos y servicios previstos

- `App\Models\EmpresaTransportadora`
- `App\Models\Transportador`
- `App\Models\Extractora`
- `App\Models\Viaje` (actualizado)
- `App\Models\ViajeDetalle` — añadido `gajos_en_viaje` (integer nullable) en `$fillable` y `casts`
- `App\Models\ViajeDocumentoBascula` — tickets/remisiones de báscula adjuntos + estado del OCR
- `App\Constants\ViajeEstado` — constantes + `transiciones()` + `siguienteEstado()`
- `App\Services\ViajeCalculationService` — cálculo HOMOGENEO/NO_HOMOGENEO al finalizar; soporta splits con acumulación COALESCE en cuadrilla
- `App\Services\RemisionGeneratorService` — generación atómica de `REM-{YYYY}-{NNN}`
- `App\Services\ClaudeVisionService` — cliente HTTP contra `api.anthropic.com` para OCR del formulario de extractora (10 campos)
- `App\Jobs\ProcesarFormularioExtractoraJob` — extrae los 10 campos del formulario y los guarda en `viaje_documento_bascula.datos_extraidos`. **No toca la tabla `viajes`**: la hidratación y el cierre los hace el operador con `PATCH /validar` + `POST /finalizar` después de revisar los datos en el frontend.

---

## 11. Controllers sugeridos

- `EmpresaTransportadoraController` — CRUD paramétrico + `/select`.
- `TransportadorController` — CRUD paramétrico + `/select` (filtro por empresa).
- `ExtractoraController` — CRUD paramétrico + `/select`.
- `ViajeController` — CRUD + acciones de estado + `/indicadores` + `/operaciones-disponibles` + `/operaciones/{id}/cosechas`.
- Métodos de detalle anidados en `ViajeController` (o `ViajeDetalleController` dedicado): `addDetalle`, `removeDetalle`, `updateReconteo`, `aprobarReconteo`.
- `ViajeDocumentoBasculaController` — endpoint `POST /viajes/{id}/documento-bascula` (multipart) + `GET /viajes/{id}/documento-bascula/{docId}` (polling del OCR).

---

## 12. Plan de implementación (backend)

### 12.1 Migración: `2026_04_22_000003_add_reconteo_to_viaje_detalle.php`

```php
Schema::table('viaje_detalle', function (Blueprint $table) {
    $table->boolean('reconteo_aprobado')->default(false)->after('cosecha_id');
    $table->timestamp('reconteo_aprobado_at')->nullable()->after('reconteo_aprobado');
    $table->foreignId('reconteo_aprobado_por')->nullable()
        ->constrained('users')->nullOnDelete()->after('reconteo_aprobado_at');
});

DB::statement('CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique
               ON viaje_detalle (cosecha_id) WHERE estado = true');
```

### 12.1.2 Migración (cosechas partidas): `2026_07_09_000001_add_gajos_en_viaje_to_viaje_detalle.php`

Permite que una misma cosecha se reparta entre múltiples viajes (camiones distintos).

```php
public function up(): void
{
    Schema::table('viaje_detalle', function (Blueprint $table) {
        $table->integer('gajos_en_viaje')->nullable()->after('cosecha_id');
        // NULL = todos los gajos (modo legacy). Valor explícito = split parcial.
    });

    // Una cosecha puede estar en múltiples viajes, pero NO dos veces en el mismo.
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

Ejecutar con:

```bash
php artisan migrate --path=database/migrations/2026_07_09_000001_add_gajos_en_viaje_to_viaje_detalle.php
```

### 12.1.1 Migración: `2026_04_22_000004_make_cantidad_gajos_total_nullable_on_viajes.php`

La migración original (`2026_01_01_000003_create_jornales_cosecha_tables.php`) creó `viajes.cantidad_gajos_total` como `NOT NULL`, lo que impide crear un viaje en estado `CREADO` (donde todavía no se conoce el total — se hidrata al aprobar el reconteo de cada detalle). Esta migración elimina esa restricción:

```php
public function up(): void
{
    DB::statement('ALTER TABLE viajes ALTER COLUMN cantidad_gajos_total DROP NOT NULL');
}

public function down(): void
{
    DB::statement('UPDATE viajes SET cantidad_gajos_total = 0 WHERE cantidad_gajos_total IS NULL');
    DB::statement('ALTER TABLE viajes ALTER COLUMN cantidad_gajos_total SET NOT NULL');
}
```

Ejecutar con:

```bash
php artisan migrate --path=database/migrations/2026_04_22_000004_make_cantidad_gajos_total_nullable_on_viajes.php
```

### 12.2 Modelos a ajustar

**[app/Models/ViajeDetalle.php](../app/Models/ViajeDetalle.php):**
- `$fillable`: sumar `reconteo_aprobado`, `reconteo_aprobado_at`, `reconteo_aprobado_por`.
- Casts: `reconteo_aprobado => boolean`, `reconteo_aprobado_at => datetime`.
- Relación `aprobadoPor(): BelongsTo → User`.
- Scope `scopeAprobados($query)`, `scopePendientes($query)`.

### 12.3 FormRequests a crear (en `app/Http/Requests/Viaje/`)

| FormRequest | Reglas principales |
|---|---|
| `StoreViajeRequest` | `fecha_viaje` date required, `hora_salida` time required, `transportador_id` exists required, `extractora_id` exists required, `observaciones` nullable, `sync_uuid` uuid nullable unique. `es_homogeneo` **no se acepta** — el sistema lo calcula. |
| `UpdateViajeRequest` | Mismos campos pero todos `sometimes`. `es_homogeneo` excluido también. Bloqueo por estado se valida en controller. |
| `StoreViajeDetalleRequest` | `cosecha_id` exists required; `gajos_en_viaje` integer min:1 nullable (opcional — split parcial) |
| `UpdateReconteoRequest` | `gajos_en_viaje` integer min:0 required (reconteo verificado de esta cosecha en este viaje); `peso_confirmado` decimal nullable |

### 12.4 Services a crear (en `app/Services/`)

- **`RemisionGeneratorService::generar(int $tenantId, Carbon $fecha): string`**
  Atómico: `SELECT COUNT(...) FOR UPDATE` sobre `viajes` filtrando por `tenant_id` y `YEAR(fecha_viaje) = $fecha->year`. Retorna `REM-{YYYY}-{NNN}` con 3+ dígitos zero-padded.

- **`ViajeCalculationService::calcularAlFinalizar(Viaje $viaje): void`**
  Al finalizar el viaje, si `es_homogeneo = true` y hay detalles con peso:
  Agrupa detalles por lote. Por cada lote: `promedio = peso_viaje / SUM(gajosEfectivosDetalle)` donde `gajosEfectivosDetalle = detalle.gajos_en_viaje ?? cosecha.gajos_reconteo ?? cosecha.gajos_reportados`.
  Crea un registro en `promedio_lote` (`viaje_id`, `fecha`, `anio`) para trazabilidad de nómina.
  Update masivo de `registro_cosecha.promedio_kg_gajo` (snapshot visual).
  Acumula `cosecha_cuadrilla.peso_calculado_empleado` con `COALESCE(existente, 0) + pesoPersona` para soportar splits correctamente.
  Si `es_homogeneo = false`, usa baseline del `promedio_lote` del año pero también acumula en cuadrilla.

### 12.5 Patrón obligatorio en cada método del controller

```php
public function store(StoreViajeRequest $request): JsonResponse
{
    try {
        $viaje = DB::transaction(function () use ($request) {
            $transportador = Transportador::activos()->findOrFail($request->transportador_id);
            $extractora   = Extractora::activas()->findOrFail($request->extractora_id);

            $remision = app(RemisionGeneratorService::class)
                ->generar($request->user()->currentTenantId(), Carbon::parse($request->fecha_viaje));

            return Viaje::create([
                'transportador_id'          => $transportador->id,
                'empresa_transportadora_id' => $transportador->empresa_transportadora_id,
                'extractora_id'             => $extractora->id,
                'remision'                  => $remision,
                'placa_vehiculo'            => $transportador->placa_vehiculo,
                'nombre_conductor'          => $transportador->nombre_completo,
                'fecha_viaje'               => $request->fecha_viaje,
                'hora_salida'               => $request->hora_salida,
                'es_homogeneo'              => true, // calculado por el sistema; se actualiza en addDetalle/removeDetalle
                'observaciones'             => $request->observaciones,
                'sync_uuid'                 => $request->sync_uuid,
                'estado'                    => ViajeEstado::CREADO,
                'estado_activo'             => true,
                'creado_por'                => $request->user()->id,
            ]);
        });

        $this->auditoria->registrarCreacion($request, 'VIAJES', $viaje, "Se creó viaje {$viaje->remision}");

        return response()->json(['data' => $viaje->load(['transportador', 'empresa', 'extractora'])], 201);
    } catch (\Throwable $e) {
        Log::error('Error al crear viaje: ' . $e->getMessage());
        return response()->json(['message' => 'Error al crear viaje', 'error' => $e->getMessage()], 500);
    }
}
```

**Convenciones:**
- Siempre `try/catch` de raíz con `Log::error` + respuesta 500 con mensaje genérico.
- `DB::transaction()` alrededor de cualquier mutación multi-tabla.
- Inyectar `AuditoriaService` en el constructor: `public function __construct(protected AuditoriaService $auditoria) {}`.
- Módulo de auditoría consistente: `'VIAJES'`.
- Registrar `registrarCreacion` / `registrarEdicion` / `registrarEliminacion` después de cada mutación exitosa. Para transiciones de estado usar el método genérico `registrar()` con acción `DESPACHAR`, `LLEGADA_PLANTA`, `FINALIZAR`, `APROBAR_RECONTEO`.

### 12.6 Rutas a agregar en [routes/api.php](../routes/api.php)

Reemplazar el bloque comentado `// ── Viajes ──` (líneas 267-271) por:

```php
// ── Viajes ──
Route::get('viajes', [ViajeController::class, 'index'])
    ->middleware('check.permission:viajes.ver');
Route::get('viajes/indicadores', [ViajeController::class, 'indicadores'])
    ->middleware('check.permission:viajes.ver');
Route::get('viajes/operaciones-disponibles', [ViajeController::class, 'operacionesDisponibles'])
    ->middleware('check.permission:viajes.crear');
Route::get('viajes/operaciones/{operacion}/cosechas', [ViajeController::class, 'cosechasDisponibles'])
    ->middleware('check.permission:viajes.crear');

Route::post('viajes', [ViajeController::class, 'store'])
    ->middleware('check.permission:viajes.crear');
Route::get('viajes/{viaje}', [ViajeController::class, 'show'])
    ->middleware('check.permission:viajes.ver');
Route::put('viajes/{viaje}', [ViajeController::class, 'update'])
    ->middleware('check.permission:viajes.editar');
Route::delete('viajes/{viaje}', [ViajeController::class, 'destroy'])
    ->middleware('check.permission:viajes.eliminar');

Route::post('viajes/{viaje}/detalles', [ViajeController::class, 'addDetalle'])
    ->middleware('check.permission:viajes.editar');
Route::delete('viajes/{viaje}/detalles/{detalle}', [ViajeController::class, 'removeDetalle'])
    ->middleware('check.permission:viajes.editar');
Route::put('viajes/{viaje}/detalles/{detalle}/reconteo', [ViajeController::class, 'updateReconteo'])
    ->middleware('check.permission:viajes.editar');
Route::post('viajes/{viaje}/detalles/{detalle}/aprobar-reconteo', [ViajeController::class, 'aprobarReconteo'])
    ->middleware('check.permission:viajes.editar');

Route::post('viajes/{viaje}/saltar-validacion', [ViajeController::class, 'saltarValidacion'])
    ->middleware('check.permission:viajes.editar');
Route::patch('viajes/{viaje}/validar', [ViajeController::class, 'validar'])
    ->middleware('check.permission:viajes.editar');
Route::post('viajes/{viaje}/finalizar', [ViajeController::class, 'finalizar'])
    ->middleware('check.permission:viajes.editar');
```

### 12.7 Secuencia de implementación recomendada

1. Migración `add_reconteo_to_viaje_detalle` + unique parcial.
2. Actualizar modelo `ViajeDetalle`.
3. Crear FormRequests.
4. Crear `RemisionGeneratorService` y probar en tinker.
5. Crear `ViajeController` con `index`, `store`, `show`, `destroy` (CRUD base).
6. Agregar `operacionesDisponibles` y `cosechasDisponibles`.
7. Agregar `addDetalle` / `removeDetalle`.
8. Agregar `updateReconteo` y `aprobarReconteo` (con auto-transición a EN_VALIDACION).
9. Agregar `saltarValidacion`, `validar` y `finalizar`.
10. Agregar `indicadores`.
11. Registrar rutas y probar flujo end-to-end.
12. Crear `ViajeCalculationService` y engancharlo en `finalizar`.
