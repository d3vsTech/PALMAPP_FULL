# API — Horas Extras

> Documentación dedicada del módulo de **Horas Extras** y su catálogo paramétrico **Tipos de Hora Extra**. Las horas extras se registran desde la planilla diaria (Paso 4 del wizard) y afectan la nómina del período. Los porcentajes siguen el **Código Sustantivo del Trabajo colombiano** (arts. 168, 179), la **Ley 789 de 2002** (art. 26) y la **Ley 2466 de 2025** (recargo dominical 75% → 90%, vigente desde su promulgación).

---

## 0. Base y autenticación

**Base URL:** `{host}/api/v1/tenant`

**Headers:** mismos que el resto del API (`Authorization: Bearer …`, `X-Tenant-Id: …`, JSON). Ver [API_OPERACIONES.md §0](./API_OPERACIONES.md).

**Permisos:**
| Acción | Permiso |
|---|---|
| Catálogo de tipos (CRUD) | `configuracion.editar` |
| Catálogo de tipos (`/select`) | `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar` |
| Crear / editar / eliminar hora extra | `operaciones.crear` / `operaciones.editar` / `operaciones.eliminar` |
| Aprobar / Rechazar | `configuracion.editar` |

> No existen permisos `horas_extra.*` dedicados — el módulo reutiliza los permisos `operaciones.*` y `configuracion.editar`.

**Códigos de error especiales:**
- `OPERACION_APROBADA` (409) — la planilla padre está aprobada; bloquea mutaciones de datos.
- `HORA_EXTRA_LIQUIDADA` (409) — el registro ya fue cerrado en nómina (inmutable).
- `HORA_EXTRA_ESTADO_INVALIDO` (409) — aprobar/rechazar solo funciona en PENDIENTE.
- `TIPO_HORA_EXTRA_CON_REGISTROS` (409) — no se puede eliminar un tipo con horas extras asociadas.
- `CALC_ERROR` (422) — empleado sin `salario_base` y tenant sin `salario_minimo_vigente` configurado.

---

## 1. Catálogo `tipos_hora_extra`

Catálogo paramétrico por tenant. Contiene los 7 tipos de hora extra reconocidos por la legislación laboral colombiana.

### 1.1 Esquema

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint PK | |
| `tenant_id` | FK `tenants` | |
| `codigo` | string(10) | Uno de `HED`, `HEN`, `RN`, `HRD`, `HEDF`, `HENF`, `RND` (CHECK constraint). |
| `nombre` | string(100) | Legible. |
| `porcentaje_recargo` | decimal(5,2) | Porcentaje adicional sobre la hora ordinaria. |
| `franja_horaria` | string(20) | `DIURNO`, `NOCTURNO` o `MIXTO` (CHECK constraint). |
| `aplica_festivo` | boolean | `true` para HRD/HEDF/HENF/RND. |
| `es_extra` | boolean | `true` para las 5 de "Hora Extra"; `false` para `RN` y `RND` (solo recargos). |
| `paga_hora_completa` | boolean | `true`: paga `valor_hora × (1 + %)`. `false`: paga `valor_hora × %`. |
| `estado` | boolean | Activo/inactivo. |

**Constraints:** `UNIQUE(tenant_id, codigo)`, `INDEX(tenant_id, estado)`.

### 1.2 Marco legal colombiano

| Código | Nombre | % recargo | Base legal |
|---|---|---|---|
| `HED`  | Hora Extra Diurna (6am-9pm) | **25%** | CST art. 168 |
| `HEN`  | Hora Extra Nocturna (9pm-6am) | **75%** | CST art. 168 |
| `RN`   | Recargo Nocturno (solo recargo) | **35%** | CST art. 168 |
| `HRD`  | Hora Ordinaria Dominical/Festivo | **90%** ¹ | Ley 2466/2025 |
| `HEDF` | Hora Extra Diurna Dominical/Festivo | **115%** ¹ | combinación (90+25) |
| `HENF` | Hora Extra Nocturna Dominical/Festivo | **165%** ¹ | combinación (90+75) |
| `RND`  | Recargo Nocturno Dominical/Festivo | **125%** ¹ | combinación (90+35) |

> ¹ **Ley 2466 de 2025** elevó el recargo dominical/festivo del 75% al **90%**. Los tipos compuestos se recalculan sobre la nueva base. HED, HEN y RN no cambian.

`es_extra = false` en `RN` y `RND` porque son **recargos sobre jornada ordinaria**, no horas trabajadas por encima de la jornada. Por eso también tienen `paga_hora_completa = false`: el recargo se suma al salario base, pero la hora ordinaria ya está cubierta por el sueldo.

### 1.3 Endpoints del catálogo

`GET /tipos-hora-extra/codigos` — lista estática de los 7 códigos legales (sin DB). Usado para poblar el selector de `codigo` en el modal "Nuevo Tipo de Hora Extra". Incluye `es_extra`, `paga_hora_completa` y `porcentaje_recargo` (porcentaje legal vigente según Ley 2466/2025) para pre-llenar automáticamente el formulario. Ver respuesta completa en [API_PARAMETRICAS.md §11](./API_PARAMETRICAS.md).

`GET /tipos-hora-extra/select` — listado liviano para el dropdown del wizard.

Query params:
- `estado` (boolean, opcional) — default `true` (solo activos). Pasar `false` para inactivos.

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "codigo": "HED",
      "nombre": "Hora Extra Diurna (6am-9pm)",
      "porcentaje_recargo": "25.00",
      "franja_horaria": "DIURNO",
      "aplica_festivo": false,
      "es_extra": true,
      "paga_hora_completa": true
    }
  ]
}
```

`GET /tipos-hora-extra` — listado paginado. Filtros: `search` (ilike sobre nombre), `codigo`, `estado`, `per_page`.

`GET /tipos-hora-extra/{id}` — detalle.

`POST /tipos-hora-extra` — crear.

```json
{
  "codigo": "HED",
  "nombre": "Hora Extra Diurna",
  "porcentaje_recargo": 25.00,
  "franja_horaria": "DIURNO",
  "aplica_festivo": false,
  "es_extra": true,
  "paga_hora_completa": true,
  "estado": true
}
```

`PUT /tipos-hora-extra/{id}` — editar (todos los campos `sometimes`).

`DELETE /tipos-hora-extra/{id}` — eliminar. Falla con 409 `TIPO_HORA_EXTRA_CON_REGISTROS` si tiene horas extras asociadas.

---

## 2. Tabla `horas_extra`

Registro anidado a una Operación (planilla del día). Cada fila = 1 empleado + 1 tipo + N horas.

### 2.1 Esquema

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint PK | |
| `tenant_id` | FK | |
| `operacion_id` | FK `operaciones` restrictOnDelete | |
| `empleado_id` | FK `empleados` restrictOnDelete | |
| `tipo_hora_extra_id` | FK `tipos_hora_extra` restrictOnDelete | |
| `codigo` | string(10) | **Snapshot** del tipo al crear. |
| `porcentaje_recargo` | decimal(5,2) | **Snapshot**. |
| `paga_hora_completa` | boolean | **Snapshot**. |
| `cantidad_horas` | decimal(5,2) | Horas registradas (0.25 a 12). |
| `valor_hora_base` | decimal(12,2) | **Snapshot** de `salario_base / tenant_config.divisor_jornada_mensual` al crear. |
| `valor_calculado` | decimal(12,2) | Total a pagar (ver §2.3). |
| `observacion` | text | |
| `estado` | enum | `PENDIENTE`, `APROBADA`, `RECHAZADA`, `LIQUIDADA`. |
| `motivo_rechazo` | text | Solo si `estado = RECHAZADA`. |
| `aprobado_por`, `aprobado_at` | FK users, timestamp | |
| `nomina_id` | FK `nominas` | Se llena al cerrar nómina → estado `LIQUIDADA`. |
| `creado_por` | FK users | |
| `sync_uuid`, `sync_estado` | uuid, enum | Para PWA offline. |

### 2.2 Máquina de estados

```
PENDIENTE ──aprobar──▶ APROBADA ──(al cerrar nómina)──▶ LIQUIDADA
          └rechazar─▶ RECHAZADA
```

| Acción | PENDIENTE | APROBADA | RECHAZADA | LIQUIDADA |
|---|---|---|---|---|
| PUT (editar) | ✔ | ❌ OPERACION_APROBADA | ❌ OPERACION_APROBADA | ❌ HORA_EXTRA_LIQUIDADA |
| DELETE | ✔ | ❌ | ❌ | ❌ HORA_EXTRA_LIQUIDADA |
| Aprobar | ✔ | — | ❌ HORA_EXTRA_ESTADO_INVALIDO | — |
| Rechazar | ✔ | — | ❌ HORA_EXTRA_ESTADO_INVALIDO | — |

Toda mutación está adicionalmente bloqueada si `operacion.estado = APROBADA` (409 `OPERACION_APROBADA`), **salvo aprobar/rechazar**, que funcionan con la planilla cerrada.

### 2.3 Fórmula de cálculo

```
valor_hora_base = empleado.salario_base / tenant_config.divisor_jornada_mensual  // 240 por default

si paga_hora_completa = true:
  valor_calculado = cantidad_horas × valor_hora_base × (1 + porcentaje_recargo / 100)

si paga_hora_completa = false:
  valor_calculado = cantidad_horas × valor_hora_base × (porcentaje_recargo / 100)
```

Si el empleado no tiene `salario_base` (empleados de modalidad PRODUCCION), se usa `tenant_config.salario_minimo_vigente` como fallback. Si ambos son null, se devuelve 422 `CALC_ERROR`.

**Divisor por defecto: 240** (48h/sem × ~5 semanas — CST tradicional). Cada tenant puede cambiarlo a **210** (42h/sem, Ley 2101/2021) desde `PUT /api/v1/tenant/configuracion/nomina` — ver §6.

**Ejemplo:** Empleado con `salario_base = 1_500_000`, 2 horas de HED con `paga_hora_completa=true`:
- `valor_hora_base = 1_500_000 / 240 = 6_250.00`
- `valor_calculado = 2 × 6_250 × 1.25 = 15_625.00`

Para el mismo empleado, 2 horas de RN (`paga_hora_completa=false`):
- `valor_calculado = 2 × 6_250 × 0.35 = 4_375.00`

### 2.4 Endpoints

`POST /operaciones/{id}/horas-extra` — crear (Paso 4 del wizard).

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
- `cantidad_horas` en rango 0.25 a 12.
- `tipo_hora_extra_id` debe pertenecer al mismo tenant y estar activo.

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
    "observacion": "Cierre de lote tras lluvia",
    "estado": "PENDIENTE",
    "empleado":       { "id": 10, "primer_nombre": "…", "primer_apellido": "…" },
    "tipoHoraExtra":  { "id": 1, "codigo": "HED", "nombre": "Hora Extra Diurna (6am-9pm)", "porcentaje_recargo": "25.00" }
  }
}
```

`PUT /horas-extra/{id}` — editar. Campos opcionales (`sometimes`). Si cambian `empleado_id`, `tipo_hora_extra_id` o `cantidad_horas`, el backend recalcula los snapshots y `valor_calculado`.

`DELETE /horas-extra/{id}` — eliminar. Bloquea con 409 `OPERACION_APROBADA` o `HORA_EXTRA_LIQUIDADA`.

`POST /horas-extra/{id}/aprobar` — pasa de `PENDIENTE` a `APROBADA`. Graba `aprobado_por` y `aprobado_at`. Funciona incluso con planilla APROBADA.

`POST /horas-extra/{id}/rechazar` — pasa de `PENDIENTE` a `RECHAZADA`.

```json
{ "motivo_rechazo": "No fue autorizada previamente por el supervisor" }
```

### 2.5 Mapeo UI ↔ API (tarjeta del wizard "Horas Extras")

| Campo UI | Origen | Campo en el registro |
|---|---|---|
| Tipo de Hora | `GET /tipos-hora-extra/select` | `tipo_hora_extra_id` |
| Número de Horas | input numeric | `cantidad_horas` |
| Colaborador | `GET /colaboradores/select` | `empleado_id` |
| Observación | input texto libre | `observacion` |

El front puede pre-visualizar `valor_calculado` usando `porcentaje_recargo` y `paga_hora_completa` del tipo seleccionado junto con el `salario_base` del empleado; el backend confirma en la respuesta 201.

---

## 3. Relación con Nómina

Cuando se cierra una nómina que cubre el período `[fecha_inicio, fecha_fin]`:

1. Se suman los `valor_calculado` de las horas extras **aprobadas y no liquidadas** del período.
2. El resultado se distribuye en dos totales de `nomina_empleado`:
   - `total_horas_extra` — suma de registros con `tipoHoraExtra.es_extra = true` (HED, HEN, HEDF, HENF, y también HRD que se trata como hora ordinaria recargada).
   - `total_recargos` — suma de registros con `tipoHoraExtra.es_extra = false` (RN, RND).
3. Cada registro se marca como `LIQUIDADA` y se graba un snapshot en `nomina_hora_extra_ref(nomina_empleado_id, hora_extra_id, valor_snapshot)`.

La separación en dos totales es importante para reportes legales: las prestaciones sociales (cesantías, prima, vacaciones) se calculan distinto sobre horas extras vs. recargos puros.

**Agregador de nómina (pseudocódigo):**
```sql
SELECT he.empleado_id,
       SUM(CASE WHEN t.es_extra THEN he.valor_calculado ELSE 0 END) AS total_horas_extra,
       SUM(CASE WHEN NOT t.es_extra THEN he.valor_calculado ELSE 0 END) AS total_recargos
FROM horas_extra he
JOIN tipos_hora_extra t ON t.id = he.tipo_hora_extra_id
JOIN operaciones o ON o.id = he.operacion_id
WHERE o.tenant_id = :tenant
  AND o.fecha BETWEEN :inicio AND :fin
  AND he.estado = 'APROBADA'
  AND he.nomina_id IS NULL
GROUP BY he.empleado_id;
```

---

## 4. Resumen de operación

`GET /operaciones/{id}/resumen` incluye un bloque `horas_extra`:

```json
"horas_extra": {
  "pendientes": 2,
  "aprobadas":  1,
  "rechazadas": 0,
  "liquidadas": 0,
  "total":      3,
  "horas_totales": "8.50",
  "valor_total":   "75000.00"
}
```

Se recomienda llamar a `GET /resumen` después de cada mutación (POST/PUT/DELETE/aprobar/rechazar) para refrescar el panel derecho del wizard.

---

## 5. Flujo de ejemplo completo (cURL)

```bash
TOKEN="eyJ..."
TENANT="1"
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json")

# 1. Select de tipos (para poblar el dropdown "Tipo de Hora")
curl "$BASE/tipos-hora-extra/select" "${H[@]}"

# 2. Registrar una hora extra en la planilla 12
curl -X POST "$BASE/operaciones/12/horas-extra" "${H[@]}" -d '{
  "empleado_id": 10,
  "tipo_hora_extra_id": 1,
  "cantidad_horas": 2,
  "observacion": "Cierre de lote tras lluvia"
}'
# → { "data": { "id": 77, "codigo": "HED", "valor_calculado": "15625.00", "estado": "PENDIENTE", ... } }

# 3. Aprobar
curl -X POST "$BASE/horas-extra/77/aprobar" "${H[@]}"

# 4. (Alternativa) Rechazar
curl -X POST "$BASE/horas-extra/77/rechazar" "${H[@]}" -d '{
  "motivo_rechazo": "No fue autorizada previamente por el supervisor"
}'

# 5. Ver resumen de la planilla (incluye bloque horas_extra)
curl "$BASE/operaciones/12/resumen" "${H[@]}"
```

---

## 6. Configuración

El divisor de jornada mensual vive **per-tenant** en `tenant_config.divisor_jornada_mensual` (columna `smallint NOT NULL default 240`). No se configura desde código; cada finca lo administra por sí misma.

**Valores permitidos:** `240` (CST tradicional, 48h/sem) o `210` (Ley 2101/2021, 42h/sem). Cualquier otro valor es rechazado con 422.

**Inicialización:**
- Al crear una finca desde `POST /api/admin/tenants`, se inserta automáticamente `divisor_jornada_mensual = 240` (ver `StoreTenantRequest::configDefaults()`).
- El seeder demo (`DatabaseSeeder`) hace lo mismo para desarrollo.
- Los tenants existentes al momento de la migración heredan `240` por el `default` de la columna.

**Endpoints:**

`GET /api/v1/tenant/configuracion/nomina` — devuelve `divisor_jornada_mensual` junto con el resto de la config de nómina. Permiso: `configuracion.editar`.

`PUT /api/v1/tenant/configuracion/nomina` — permite cambiar el divisor:
```json
{ "divisor_jornada_mensual": 210 }
```
Validación: `integer|in:210,240`. Si llega otro valor → 422. Se audita como `EDITAR` en módulo `CONFIGURACION_NOMINA`.

Detalles completos del endpoint: [API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md).

**Impacto del cambio:** solo afecta **nuevas** horas extras. Los registros ya creados tienen `valor_hora_base` snapshotteado al momento del POST, así que el historial queda congelado aunque luego el admin cambie el divisor.

---

## 7. Referencias cruzadas

- Marco del wizard y paso 4: [API_OPERACIONES.md](./API_OPERACIONES.md)
- Modelo de datos de jornales (el Paso 4 usa su propia tabla, no `jornales`): [LABORES_JORNALES.md](./LABORES_JORNALES.md)
- Fundamento legal: Código Sustantivo del Trabajo colombiano (arts. 168, 179) y Ley 789 de 2002, art. 26.
