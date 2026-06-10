# API — Ausencias

> Documentación dedicada del módulo de **Ausencias** y su catálogo paramétrico **Motivos de Ausencia**. Las ausencias se reportan desde la planilla diaria y afectan la nómina del período.

---

## 0. Base y autenticación

**Base URL:** `{host}/api/v1/tenant`

**Headers:** mismos que el resto del API (`Authorization: Bearer …`, `X-Tenant-Id: …`, JSON). Ver [API_OPERACIONES.md §0](./API_OPERACIONES.md).

**Permisos:**
| Acción | Permiso |
|---|---|
| Catálogo de motivos (CRUD) | `configuracion.editar` |
| Catálogo de motivos (`/select`) | `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar` |
| Crear / editar / eliminar ausencia | `operaciones.crear` / `operaciones.editar` / `operaciones.eliminar` |
| Aprobar / Rechazar / Subir documento | `operaciones.editar` |

> No existen permisos `ausencias.*` dedicados — el módulo reutiliza los permisos `operaciones.*`.

**Códigos de error especiales:**
- `OPERACION_APROBADA` (409) — la planilla padre está aprobada; bloquea mutaciones de datos.
- `AUSENCIA_LIQUIDADA` (409) — la ausencia ya fue cerrada en nómina (inmutable).
- `AUSENCIA_ESTADO_INVALIDO` (409) — aprobar/rechazar solo funciona en PENDIENTE.
- `MOTIVO_CON_AUSENCIAS` (409) — no se puede eliminar un motivo con ausencias asociadas.

---

## 1. Catálogo `motivos_ausencia`

Catálogo paramétrico por tenant. Cada motivo está anclado a un `tipo_base` del enum fijo (INCAPACIDAD_EPS, ARL, LICENCIA_MATERNIDAD, etc.), que es el discriminador que usa la nómina para aplicar reglas especiales (días 1-2 EPS = 100%, días 3+ = 66.67%, etc.).

El tenant puede crear variantes custom ("Incapacidad EPS - Gripa común") todas con el mismo `tipo_base`.

### 1.1 Esquema

| Columna | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | bigint PK | No | |
| `tenant_id` | FK tenants | No | |
| `nombre` | varchar(100) | No | Ej: "Incapacidad EPS - General" |
| `tipo_base` | string(30) | No | Uno de los 11 tipos del enum (CHECK constraint BD) |
| `es_remunerada` | boolean | No | default false |
| `afecta_nomina` | boolean | No | default true |
| `porcentaje_pago_default` | decimal(5,2) | No | default 0 |
| `requiere_soporte` | boolean | No | default false (hint UI: si true, el wizard exige PDF para aprobar) |
| `estado` | boolean | No | default true |
| `color` | varchar(7) | Sí | Hex tipo `#3b82f6`. Usado por la UI para el punto de color del listado y del modal "Nuevo Tipo de Novedad". El seeder asigna un color por defecto a los 11 motivos base. |

**Constraints:** `UNIQUE (tenant_id, nombre)`, `CHECK tipo_base IN (…)`, índice `(tenant_id, estado)`.

**Validación de `color` (FormRequest):** regex `/^#[0-9a-fA-F]{6}$/`. Acepta `null` (sin color).

### 1.2 Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/motivos-ausencia/select` | Dropdown liviano. Devuelve `{id, nombre, tipo_base, es_remunerada, afecta_nomina, porcentaje_pago_default, requiere_soporte}`. |
| `GET` | `/motivos-ausencia` | Listado paginado. Filtros: `search`, `tipo_base`, `estado`. |
| `GET` | `/motivos-ausencia/{id}` | Detalle. |
| `POST` | `/motivos-ausencia` | Crear. `nombre` + `tipo_base` obligatorios. |
| `PUT` | `/motivos-ausencia/{id}` | Actualizar. Todos los campos con `sometimes`. |
| `DELETE` | `/motivos-ausencia/{id}` | 409 `MOTIVO_CON_AUSENCIAS` si tiene ausencias. |

### 1.3 Catálogo base (seeder)

El `MotivoAusenciaSeeder` crea 11 motivos por tenant (uno por `tipo_base`) con defaults razonables para Colombia:

| Nombre | `tipo_base` | Remunerado | Afecta nómina | % pago |
|---|---|---|---|---|
| Incapacidad EPS - General | INCAPACIDAD_EPS | Sí | Sí | 66.67 |
| Incapacidad ARL - Accidente laboral | INCAPACIDAD_ARL | Sí | Sí | 100 |
| Licencia de maternidad | LICENCIA_MATERNIDAD | Sí | Sí | 100 |
| Licencia de paternidad | LICENCIA_PATERNIDAD | Sí | Sí | 100 |
| Luto | LICENCIA_LUTO | Sí | Sí | 100 |
| Permiso remunerado | PERMISO_REMUNERADO | Sí | Sí | 100 |
| Permiso no remunerado | PERMISO_NO_REMUNERADO | No | Sí | 0 |
| Ausencia injustificada | AUSENCIA_INJUSTIFICADA | No | Sí | 0 |
| Calamidad doméstica | CALAMIDAD_DOMESTICA | Sí | Sí | 100 |
| Suspensión disciplinaria | SUSPENSION_DISCIPLINARIA | No | Sí | 0 |
| Otro | OTRO | No | No | 0 |

El tenant puede editar, desactivar o agregar nuevos motivos libremente.

---

## 2. Ausencias

### 2.1 Crear desde la planilla

`POST /operaciones/{operacion_id}/ausencias`

**Payload mínimo del wizard:**
```json
{
  "empleado_id": 10,
  "motivo_ausencia_id": 3,
  "motivo": "Reportó gripa fuerte. Enviará incapacidad mañana."
}
```

**Campos opcionales** (no se muestran en el wizard diario pero se pueden enviar desde un módulo admin):
- `fecha_fin` (date) — default = `fecha_inicio` (ausencia de un solo día).
- `entidad` (string, 100) — ej. "EPS SURA".
- `numero_radicado` (string, 50).
- `porcentaje_pago` (decimal) — override del default del motivo.

**Snapshot automático al crear:**
- `fecha_inicio` ← `operacion.fecha`.
- `tipo` ← `motivo.tipo_base`.
- `es_remunerada`, `afecta_nomina` ← del motivo.
- `porcentaje_pago` ← `motivo.porcentaje_pago_default` (si no se envía).
- `estado` = `PENDIENTE`.
- `creado_por` = usuario autenticado.

**Validaciones extra:**
- `fecha_fin >= operacion.fecha`. Si viene antes, 422.
- 409 `OPERACION_APROBADA` si la planilla está aprobada.

### 2.2 Editar

`PUT /ausencias/{id}`

Campos opcionales: `motivo_ausencia_id`, `motivo`, `fecha_fin`, `entidad`, `numero_radicado`, `porcentaje_pago`. Solo en `PENDIENTE` y con operación en BORRADOR.

### 2.3 Eliminar

`DELETE /ausencias/{id}` — elimina también el archivo de soporte si existe. 409 si operación aprobada o ausencia LIQUIDADA.

### 2.4 Aprobar

`POST /ausencias/{id}/aprobar`

Sin body. `PENDIENTE` → `APROBADA`. Graba `aprobado_por` y `aprobado_at`. **Funciona aunque la planilla esté APROBADA** (flujo administrativo independiente). 409 `AUSENCIA_ESTADO_INVALIDO` si el estado actual no es PENDIENTE.

### 2.5 Rechazar

`POST /ausencias/{id}/rechazar`

```json
{ "motivo_rechazo": "No llegó el PDF después de 5 días hábiles" }
```

`motivo_rechazo` obligatorio (máx. 500 chars). `PENDIENTE` → `RECHAZADA`.

### 2.6 Subir documento soporte

`POST /ausencias/{id}/documento` — multipart.

```
documento: <archivo>
```

Acepta PDF, JPG, JPEG, PNG. Máximo 5MB. Se guarda en `storage/app/tenants/{tenant}/ausencias/{id}/{uuid}.{ext}` y el path se persiste en `ausencia.documento_soporte`. Reemplaza el archivo anterior si existía. Permitido incluso con la planilla aprobada; solo se bloquea si la ausencia está `LIQUIDADA`.

### 2.7 Máquina de estados

```
PENDIENTE ──aprobar──▶ APROBADA ──(cerrar nómina)──▶ LIQUIDADA
          └─rechazar─▶ RECHAZADA
```

| Acción | PEND. | APROB. | RECH. | LIQ. |
|---|---|---|---|---|
| PUT (editar) | ✔ | ❌ | ❌ | ❌ |
| DELETE | ✔ | ❌ | ✔ | ❌ |
| Aprobar | ✔ | — | ❌ | — |
| Rechazar | ✔ | — | ❌ | — |
| Subir documento | ✔ | ✔ | ✔ | ❌ |

Todas las acciones de mutación están bloqueadas cuando la **operación padre** está `APROBADA`, excepto `aprobar`, `rechazar` y `documento` (flujo administrativo posterior al cierre).

---

## 3. Relación con nómina

`ausencias` guarda snapshots de `tipo`, `es_remunerada`, `afecta_nomina`, `porcentaje_pago` al momento de crear. El `NominaCalculationService` (pendiente de implementar) recorre las ausencias APROBADAS del rango de nómina y aplica reglas según el `tipo`:

| Tipo empleado | Tipo ausencia | Efecto en nómina |
|---|---|---|
| FIJO | PERMISO_NO_REMUNERADO, AUSENCIA_INJUSTIFICADA | Descuenta `(salario/30) × días × (1 − %/100)` |
| FIJO | INCAPACIDAD_EPS días 1-2 | Empresa paga 100%, no descuenta |
| FIJO | INCAPACIDAD_EPS días 3+ | 66.67% pagado, 33.33% descontado |
| FIJO | INCAPACIDAD_ARL | 100%, no descuenta |
| FIJO | Licencias remuneradas | Suma a `total_ausencias_remunerado` |
| VARIABLE | No remunerada | No descuenta (no cobra fijo), solo tracking |
| VARIABLE | INCAPACIDAD_EPS/ARL | Suma a `total_ausencias_remunerado` |

Al cerrar la nómina: `ausencia.nomina_id = X`, `estado = LIQUIDADA`, inmutable.

Referencia completa: [CONTEXTO.md §6.9](../CONTEXTO.md).

---

## 4. Soporte offline

La tabla `ausencias` tiene `sync_uuid` (UUID generado por el cliente para deduplicar) y `sync_estado` (LOCAL / SINCRONIZADO). La PWA puede registrar ausencias en campo sin internet y el backend deduplica al sincronizar.

---

## 5. Ejemplo cURL completo

```bash
TOKEN="eyJ..."
TENANT="1"
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json")

# 1. Listar motivos disponibles para el dropdown
curl "$BASE/motivos-ausencia/select" "${H[@]}"

# 2. Crear ausencia desde la operación 12
curl -X POST "$BASE/operaciones/12/ausencias" "${H[@]}" -d '{
  "empleado_id": 10,
  "motivo_ausencia_id": 3,
  "motivo": "Reportó gripa"
}'
# → { "data": { "id": 77, "estado": "PENDIENTE", "tipo": "INCAPACIDAD_EPS", ... } }

# 3. Subir PDF de soporte
curl -X POST "$BASE/ausencias/77/documento" "${H[@]:0:4}" \
  -F "documento=@/ruta/incapacidad.pdf"

# 4. Aprobar
curl -X POST "$BASE/ausencias/77/aprobar" "${H[@]}"

# 5. (Alternativa) Rechazar
curl -X POST "$BASE/ausencias/77/rechazar" "${H[@]}" -d '{
  "motivo_rechazo": "No hubo soporte en 5 días hábiles"
}'
```
