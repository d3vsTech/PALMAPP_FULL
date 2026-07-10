# API — Nómina

> Guía para el frontend. Cubre el flujo completo de Nómina: crear período (quincenal/mensual), agregar empleados activos, liquidar empleado por empleado (FIJO o VARIABLE) con cálculo automático de deducciones legales colombianas, generar desprendible (PDF / WhatsApp), y cerrar la nómina como evento inmutable que liquida ausencias y horas extras del período.

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
| Ver nóminas, indicadores, desprendibles | `nomina.ver` |
| Crear nómina | `nomina.crear` |
| Editar período / agregar/quitar empleados | `nomina.editar` |
| Eliminar nómina BORRADOR | `nomina.eliminar` |
| Liquidar empleado / re-liquidar | `nomina.liquidar` |
| Cerrar nómina | `nomina.cerrar` |
| Registrar pago a tercero | `nomina.pagar-tercero` |
| Ver catálogo de conceptos | `nomina-conceptos.ver` |
| CRUD de conceptos paramétricos | `nomina-conceptos.gestionar` |

**Formato de errores:**
```json
{ "message": "Mensaje legible", "code": "CODIGO_OPCIONAL", "errors": { "campo": ["detalle"] } }
```

Códigos especiales del módulo:

| Código | HTTP | Cuándo |
|---|---|---|
| `NOMINA_DUPLICADA` | 409 | Ya existe una nómina con (tenant, año, mes, quincena). |
| `NOMINA_CERRADA` | 409 | Intento de mutar una nómina que ya está CERRADA. |
| `NOMINA_CON_LIQUIDADOS` | 409 | Intento de editar/eliminar una nómina que tiene empleados ya LIQUIDADOS. |
| `NOMINA_CON_PENDIENTES` | 409 | Intento de cerrar una nómina con empleados aún PENDIENTES. |
| `EMPLEADO_LIQUIDADO` | 409 | Intento de quitar de la nómina un empleado ya liquidado. |
| `EMPLEADO_NO_LIQUIDADO` | 409 | Intento de pedir el desprendible de un empleado aún PENDIENTE. |
| `EMPLEADO_NO_VARIABLE` | 422 | Intento de pedir resumen-trabajo a un empleado FIJO. |
| `CALC_ERROR` | 422 | Falta `tenant_config.salario_minimo_vigente` o el empleado FIJO no tiene `salario_base`. |
| `CONCEPTO_EN_USO` | 409 | Intento de eliminar un concepto referenciado por nóminas existentes. |
| `CONCEPTO_OBLIGATORIO` | 409 | Intento de eliminar SALUD/PENSIÓN u otro concepto obligatorio. |
| `NOMINA_VALIDACION_COSECHA_REQUERIDA` | 409 | Intento de cerrar nómina con cosechas en el período sin confirmar el paso 3. |
| `OPERARIO_NO_PERTENECE_A_TERCERO` | 422 | `operario_ids[]` incluye un operario cuyo `tercero_id` no está habilitado en el tenant. |
| `OPERARIO_LIQUIDADO_EN_TERCERO` | 409 | Intento de eliminar un tercero de la nómina con al menos un operario ya LIQUIDADO. |
| `TERCERO_SIN_OPERARIOS_EN_NOMINA` | 404/422 | Intento de eliminar/liquidar un tercero que no tiene operarios en esa nómina. |
| `NOMINA_TERCERO_NO_LIQUIDADO` | 409 | Intento de cerrar la nómina con al menos un contratista sin acta calculada (`nomina_tercero` ausente o con `total_a_transferir=0` y `total_dias=0`). |
| `ACTA_TERCERO_YA_PAGADA` | 409 | Intento de registrar pago sobre un acta ya en estado PAGADO. |
| `ACTA_NO_CALCULADA` | 404 | El acta no ha sido liquidada aún; ejecutar `POST /liquidar` primero. |
| `DESCUENTO_CONCEPTO_INVALIDO` | 422 | `concepto_id` no existe, no es `DEDUCCION_VOLUNTARIA` o está inactivo. |
| `DESCUENTO_NO_ENCONTRADO` | 404 | El id de descuento no existe o no pertenece al operario solicitado. |
| `PERMISSION_DENIED` | 403 | Usuario sin permiso para la acción. |

---

## 1. Ciclo de vida — Wizard (4 pasos) + post-wizard

El **wizard frontend tiene 4 pasos**: los 3 primeros son solo UI (estado local, sin llamadas al backend); el paso 4 "Confirmación" es el único que persiste, ejecutando 4 llamadas encadenadas al backend. Después del wizard, las pantallas de **liquidación individual** y **cierre** son operaciones separadas sobre la nómina ya creada.

```
═══════════════════════ WIZARD (frontend) ═══════════════════════

┌ Paso 1 — Elegir período (solo UI) ────────────────────┐
│  { mes, anio, periodicidad, quincena? }               │  → estado local
└───────────────────────────────────────────────────────┘
            │
┌ Paso 2 — Elegir colaboradores (solo UI) ──────────────┐
│  GET /nominas/select/empleados-disponibles            │  → empleados propios + operarios de terceros
│  El usuario marca; se acumula { empleado_ids, operario_ids } en estado local
└───────────────────────────────────────────────────────┘
            │
┌ Paso 3 — Validar Cosecha (solo UI) ───────────────────┐
│  Bundle calculado en cliente o via nómina temporal    │
│  Ajustes de promedio → estado local { lote_id, promedio }[]
│                                                        │
│  Paso condicional: se salta si no hay cosechas.       │
└───────────────────────────────────────────────────────┘
            │
┌ Paso 4 — Confirmación → "Crear Período de Pago" ──────┐
│  Al hacer clic, el frontend encadena EN ORDEN:        │
│                                                        │
│  (a) POST /nominas                                     │  → BORRADOR. Devuelve { id, fecha_inicio, fecha_fin }
│  (b) POST /nominas/{id}/empleados                      │  → nomina_empleado + pre-hidrata nomina_tercero(_operario)
│      ó POST /nominas/{id}/terceros                     │    (alias con 3 shapes: operario_ids | tercero_ids | terceros[])
│  (c) PUT  /nominas/{id}/promedios-lote/{lote} × N     │  → persiste ajustes en nomina_promedio_lote
│  (d) POST /nominas/{id}/validar-cosecha/confirmar     │  → persiste snapshot en nomina_validacion_cosecha
│                                                        │
│  GET /nominas/{id}/paso-4-checklist  → diagnóstico    │
└───────────────────────────────────────────────────────┘

═════════════════ POST-WIZARD (pantallas separadas) ═════════════

┌ Liquidar empleado / operario individualmente ─────────┐
│  GET /nomina-empleado/{id}/preview                    │  → cálculo propuesto (sin persistir)
│  GET /nomina-empleado/{id}/resumen-trabajo            │  → solo VARIABLE: planilla diaria agrupada
│  POST /nomina-empleado/{id}/liquidar                  │  → estado del colaborador pasa a LIQUIDADO
│  PUT  /nomina-empleado/{id}/liquidacion               │  → re-liquidar (mismo body)
└───────────────────────────────────────────────────────┘
            │
┌ Liquidación de Terceros (acta agrupada) ──────────────┐
│  GET  /nominas/{id}/terceros-actas                                          │  → resumen agrupado (una fila por contratista)
│  GET  /nominas/{id}/terceros/{tercero}                                      │  → detalle del acta + líneas por operario (solo-lectura)
│  POST /nominas/{id}/terceros/{tercero}/liquidar                             │  → calcula totales del acta (idempotente)
│  GET  /nominas/{id}/terceros/{tercero}/operarios/{op}/detalle               │  → desglose por labor/lote (acordeón)
│  POST /nominas/{id}/terceros/{tercero}/operarios/{op}/descuentos            │  → agregar descuento con concepto
│  DELETE /nominas/{id}/terceros/{tercero}/operarios/{op}/descuentos/{desc}   │  → eliminar descuento
│  POST /nominas/{id}/terceros/{tercero}/registrar-pago                       │  → marca PAGADO (permitido post-cierre)
│  GET  /nominas/{id}/terceros/{tercero}/acta/pdf                             │  → PDF del acta (DomPDF)
└───────────────────────────────────────────────────────┘
            │
┌ Cerrar nómina + desprendibles ────────────────────────┐
│  POST /nominas/{id}/cerrar                             │  → estado=CERRADA, snapshots, ausencias→LIQUIDADA
│                                                          exige nomina_tercero calculado por contratista
│                                                        │
│  GET  /nomina-empleado/{id}/desprendible               │  → JSON
│  GET  /nomina-empleado/{id}/desprendible/pdf           │  → PDF descargable (DomPDF)
│  POST /nomina-empleado/{id}/desprendible/whatsapp      │  → URL firmada (placeholder de WA Business API)
└───────────────────────────────────────────────────────┘
```

> **Nota terminológica.** Las secciones §2 a §7 de este documento están organizadas por **etapa del ciclo de vida** de la nómina (crear → agregar colaboradores → validar cosecha → liquidar → cerrar → acta de tercero), no por los 4 pasos del wizard frontend. El wizard mapea así:
>
> | Wizard frontend | Etapas backend |
> |---|---|
> | Paso 1 (elegir período)   | §2 (Crear nómina) — se dispara solo en Confirmación |
> | Paso 2 (elegir colabs)    | §3 (Agregar colaboradores) — se dispara solo en Confirmación |
> | Paso 3 (validar cosecha)  | §4 (Validar Cosecha) — se dispara solo en Confirmación |
> | Paso 4 (Confirmación)     | dispara §2 + §3 + §4 en cadena |
> | (post-wizard)             | §5 (Liquidar colaborador) |
> | (post-wizard)             | §7 (Acta de tercero — pantalla dedicada) |
> | (post-wizard)             | §6 (Cerrar) |

**Estados de la nómina:** `BORRADOR → CERRADA` (CERRADA es inmutable).

**Estados del empleado en la nómina:** `PENDIENTE → LIQUIDADO` (puede re-liquidarse mientras la nómina esté en BORRADOR).

---

## 2. Paso 1 — Crear nómina

### 2.1 Crear

`POST /nominas`

**Request (quincenal):**
```json
{
  "mes": 5,
  "anio": 2026,
  "periodicidad": "QUINCENAL",
  "quincena": 1,
  "observacion": null
}
```

**Request (mensual):**
```json
{
  "mes": 5,
  "anio": 2026,
  "periodicidad": "MENSUAL"
}
```

Reglas:
- **`periodicidad` es REQUERIDA**. Lo que envía el frontend es lo que prevalece — el endpoint **no consulta** `tenant_config.tipo_pago_nomina`. La config del tenant solo sirve como default informativo que el front puede leer (vía `GET /configuracion/nomina`) para pre-llenar el dropdown del modal "Nueva Nómina"; pero al llegar al `POST` el body es la fuente de verdad.
- `quincena` solo aplica si `periodicidad=QUINCENAL` (1 o 2).
- `quincena` debe ser `null` o ausente si `periodicidad=MENSUAL`.
- Una nómina única por (tenant, año, mes, quincena). Duplicado → 409 `NOMINA_DUPLICADA`.
- `fecha_inicio` y `fecha_fin` se calculan automáticamente a partir de `periodicidad` + `mes` + `anio` (+ `quincena` si aplica):
  - Mensual: día 1 → último día del mes.
  - Quincenal Q1: día 1 → día 15.
  - Quincenal Q2: día 16 → último día del mes.
- `tipo_pago_snapshot` se persiste con el valor de `periodicidad` que mandó el front. Esto blinda la nómina histórica: aunque el tenant cambie luego su `tipo_pago_nomina`, la nómina recordará cómo fue creada (también lo usa `PUT /nominas/{id}` al recalcular el rango de fechas).

**Respuesta 201:**
```json
{
  "message": "Nómina creada correctamente",
  "data": {
    "id": 12,
    "tenant_id": 1,
    "mes": 5, "anio": 2026, "quincena": 1,
    "tipo_pago_snapshot": "QUINCENAL",
    "fecha_inicio": "2026-05-01", "fecha_fin": "2026-05-15",
    "estado": "BORRADOR",
    "total_fijos": "0.00", "total_variables": "0.00",
    "total_bonificaciones": "0.00", "total_deducciones": "0.00",
    "total_general": "0.00"
  }
}
```

### 2.2 Listado (tabla "Nóminas Creadas")

`GET /nominas`

Query params: `estado` (`BORRADOR`/`CERRADA`), `mes`, `anio`, `per_page` (default 15), `page`.

Cada item incluye `empleados_count` y `empleados_liquidados_count` para pintar el progreso (ej. "1 liquidado, 2 pendientes" del mockup).

```json
{
  "data": [
    {
      "id": 12, "anio": 2026, "mes": 2, "quincena": 1,
      "estado": "BORRADOR",
      "fecha_inicio": "2026-02-01", "fecha_fin": "2026-02-15",
      "total_general": "15700000.00",
      "total_deducciones": "2100000.00",
      "empleados_count": 3,
      "empleados_liquidados_count": 1
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1 }
}
```

### 2.3 Indicadores (cards superiores)

`GET /nominas/indicadores`

Requiere permiso `nomina.ver`. Devuelve un bundle con 4 cards principales (Pagado a Colaboradores, Pagado a Terceros, Neto pagado, Pendiente por pagar) más los conteos legados de períodos y estados.

**Query params (todos opcionales, combinables):**

| Param | Ejemplo | Efecto |
|---|---|---|
| `anio` | `?anio=2026` | Restringe todos los agregados a nóminas de ese año. |
| `mes` | `?mes=7` | Restringe a nóminas del mes indicado (1-12). |
| `estado` | `?estado=CERRADA` | Restringe a nóminas en ese estado (`BORRADOR` o `CERRADA`). |

**Response 200:**
```json
{
  "data": {
    "total_periodos": 3,
    "borradores": 1,
    "cerradas": 2,
    "total_devengado": 55500000,
    "total_colaboradores": 33150000,
    "total_terceros": 7870000,
    "neto_pagar": 41020000,
    "pendiente_pagar": 19550000
  },
  "meta": {
    "filtros": { "anio": 2026, "mes": 7 }
  }
}
```

| Campo | Descripción |
|---|---|
| `total_periodos` | `borradores + cerradas` sobre las nóminas que pasan los filtros. |
| `borradores` | Conteo de nóminas en estado `BORRADOR`. |
| `cerradas` | Conteo de nóminas en estado `CERRADA`. |
| `total_colaboradores` | SUM(`nomina_empleado.total_neto`) solo de filas con `empleado_id IS NOT NULL` en nóminas **CERRADAS** que pasan los filtros. Es lo pagado a colaboradores propios. |
| `total_terceros` | SUM(`nomina_tercero.total_a_transferir`) donde `estado_pago=PAGADO` en nóminas **CERRADAS** que pasan los filtros. Es lo efectivamente girado a contratistas. |
| `neto_pagar` | `total_colaboradores + total_terceros`. Representa el "neto pagado" del período filtrado. |
| `pendiente_pagar` | SUM(`nomina_tercero.total_a_transferir`) donde `estado_pago=PENDIENTE` y `total_a_transferir > 0` sobre las nóminas que pasan los filtros. Excluye las actas pre-hidratadas por §3.4 (totales 0) y considera tanto BORRADOR (acta ya liquidada, aún sin cerrar) como CERRADA (giro post-cierre pendiente — excepción documentada en §6). |
| `total_devengado` | **Deprecated** — SUM(`nominas.total_general`) de las CERRADAS. Se mantiene por compatibilidad con el frontend legado; migrar a `total_colaboradores` (empleados propios) o `neto_pagar` (total efectivamente pagado). |
| `meta.filtros` | Eco de los filtros aplicados (útil para debug y para pintar chips en la UI). Solo incluye los que vinieron con valor. |

**Notas de implementación:**
- Los agregados se calculan con queries agregadas (`SUM(CASE WHEN ...)`), no con N+1.
- Si el resultado filtrado no tiene nóminas CERRADAS, todos los totales quedan en `0` (no falla).
- El campo `pendiente_pagar` filtra `total_a_transferir > 0` para no contar las filas de `nomina_tercero` pre-hidratadas por §3.4 (que arrancan en 0 al agregar operarios y solo se llenan al ejecutar §7.3 `POST /liquidar`).

### 2.4 Detalle

`GET /nominas/{id}` — incluye empleados con datos del empleado, modalidad, salario, estado y `liquidado_por`.

### 2.5 Editar / Eliminar

`PUT /nominas/{id}` — todos los campos opcionales. Bloqueado si CERRADA o si ya hay empleados LIQUIDADOS (recalcular el período corrompería los snapshots).

`DELETE /nominas/{id}` — solo si BORRADOR sin liquidados. Borra en cascada (en una sola transacción) todas las tablas dependientes:

- `nomina_empleado_concepto`, `nomina_jornal_ref`, `nomina_cosecha_ref`, `nomina_hora_extra_ref` (vía `nomina_empleado`)
- `nomina_tercero_operario` → `nomina_tercero` (acta y detalle del contratista)
- `nomina_validacion_cosecha` (snapshot del Paso 3)
- `nomina_promedio_lote` (overrides manuales de promedio por lote)
- `nomina_empleado` (empleados + operarios PENDIENTES)
- `nomina` (fila raíz)

Además desvincula defensivamente `ausencias.nomina_id` y `horas_extra.nomina_id` en `NULL` (en BORRADOR no deberían estar seteados, pero se blindan por seguridad). `vacaciones.nomina_id` queda en `NULL` por el `ON DELETE SET NULL` del FK.

---

## 3. Paso 2 — Agregar colaboradores (empleados + operarios de terceros)

### 3.1 Colaboradores disponibles

`GET /nominas/{id}/empleados-disponibles`

Devuelve **dos bloques** separados: empleados propios de nómina y operarios de empresas contratistas que aún no están en esta nómina.

```json
{
  "data": {
    "empleados": [
      {
        "id": 10,
        "nombre_completo": "Carlos Rodríguez García",
        "documento": "1098765432",
        "cargo": "Operario de palma",
        "modalidad_pago": "PRODUCCION",
        "salario_base": 1300000,
        "predio": { "id": 1, "nombre": "Puerto Arturo" }
      }
    ],
    "operarios": [
      {
        "id": 3,
        "nombre_completo": "Pedro Ramírez",
        "cedula": "1234567890",
        "cargo": "Cosechero",
        "tercero": { "id": 2, "razon_social": "Contratistas del Sur SAS" }
      }
    ]
  }
}
```

### 3.2 Agregar empleados y/o operarios

`POST /nominas/{id}/empleados`

Acepta cualquier combinación de los dos arrays. Al menos uno debe tener elementos.

```json
{
  "empleado_ids": [10, 11],
  "operario_ids": [3, 4]
}
```

Comportamiento por tipo:

| Tipo | `salario_tipo` | `tercero_id` | Deducciones legales |
|---|---|---|---|
| Empleado | `FIJO` o `VARIABLE` según `modalidad_pago` | `null` | Sí (SALUD, PENSION, FSP) |
| Operario | `null` | Snapshotteado de `operario.tercero_id` | No |

Idempotente por tipo: si el empleado/operario ya estaba en la nómina, se omite. Bloqueado si `NOMINA_CERRADA`.

**Respuesta 201:**
```json
{
  "message": "2 empleado(s) y 2 operario(s) agregado(s) a la nómina",
  "data": [
    { "id": 45, "empleado_id": 10, "operario_id": null, "salario_tipo": "VARIABLE", "estado": "PENDIENTE" },
    { "id": 46, "empleado_id": null, "operario_id": 3, "tercero_id": 2, "salario_tipo": null, "estado": "PENDIENTE" }
  ]
}
```

### 3.3 Quitar un colaborador

`DELETE /nomina-empleado/{id}` — solo si está PENDIENTE y la nómina BORRADOR. Aplica igual para filas de empleado y de operario. Errores: 409 `NOMINA_CERRADA` / `EMPLEADO_LIQUIDADO`.

Cuando la fila eliminada es de un operario, el backend también borra su línea en `nomina_tercero_operario` y, si el acta queda sin operarios, elimina también la fila de `nomina_tercero`. Esta limpieza es atómica dentro de una transacción y no requiere llamadas adicionales del frontend.

### 3.4 Alias — `POST /nominas/{id}/terceros` (agregar solo operarios)

`POST /nominas/{id}/terceros` — fachada equivalente a `POST /empleados` cuando el frontend quiere agregar **solo** operarios de terceros sin mezclarlos con empleados propios. Acepta 3 shapes de body y el backend los normaliza a una lista plana de `operario_ids`:

```jsonc
// A — lista plana de operarios individuales
{ "operario_ids": [3, 4, 5] }

// B — lista de contratistas (expande a TODOS sus operarios activos)
{ "tercero_ids": [1, 2] }

// C — anidado por contratista (validación XOR de pertenencia)
{ "terceros": [
    { "tercero_id": 1, "operario_ids": [3, 4] },
    { "tercero_id": 2, "operario_ids": [5] }
] }
```

Comportamiento (además de crear filas `nomina_empleado`):

- **Pre-hidrata `nomina_tercero`** (una fila por contratista incluido) con `estado_pago=PENDIENTE` y totales en 0. La liquidación real del acta llega en PR-4 vía `POST /nominas/{id}/terceros/{tercero}/liquidar` que hace `updateOrCreate` sobre la misma fila.
- **Pre-hidrata `nomina_tercero_operario`** (una fila por operario incluido) con `dias=0`, `subtotal=0`, y `tarifa_dia` resuelta desde la primera fila `tercero_labor_precios` con `tipo_pago=JORNAL_FIJO` del contratista (o `0` si no hay ninguna).
- Es idempotente: llamar dos veces no duplica filas ni pisa datos ya calculados por PR-4.

**Response 201:**
```jsonc
{
  "message": "5 operario(s) agregado(s) a la nómina",
  "data": [
    { "id": 46, "nomina_id": 12, "empleado_id": null, "operario_id": 3, "tercero_id": 1, "salario_tipo": null, "estado": "PENDIENTE" },
    ...
  ]
}
```

**Errores:**
- `409 NOMINA_CERRADA`
- `422 OPERARIO_NO_PERTENECE_A_TERCERO` (variante C)
- `422` — al menos uno de los 3 arrays debe venir con elementos

**Nota:** este endpoint es un alias de compatibilidad para el contrato del frontend. El endpoint canónico sigue siendo `POST /empleados` con `{ empleado_ids, operario_ids }`. Ambos comparten la misma lógica de inserción (métodos privados `insertarEmpleados()` e `insertarOperarios()`) y comportamiento de pre-hidratación.

### 3.5 Eliminar TODOS los operarios de un contratista — `DELETE /nominas/{id}/terceros/{tercero}`

Borra en una única transacción: todas las filas `nomina_empleado` con `nomina_id={id}` AND `tercero_id={tercero}` PENDIENTES, sus líneas `nomina_tercero_operario` y el acta `nomina_tercero`.

**Errores:**
- `409 NOMINA_CERRADA` — nómina en CERRADA.
- `409 OPERARIO_LIQUIDADO_EN_TERCERO` — al menos un operario del contratista ya fue liquidado.
- `404 TERCERO_SIN_OPERARIOS_EN_NOMINA` — no hay filas de ese tercero en esa nómina.

**Response 200:**
```jsonc
{ "message": "Tercero #1 eliminado de la nómina (3 operario(s))" }
```

### 3.6 Checklist del paso 4 del wizard — `GET /nominas/{id}/paso-4-checklist`

Devuelve el estado de hidratación de las 4 tablas que el paso "Confirmación" del wizard frontend debe dejar consistentes antes de que el usuario pueda cerrar la nómina. Útil para mostrar un banner "Acciones pendientes antes de cerrar".

**Response 200:**
```jsonc
{
  "data": {
    "nomina_empleado_empleados": 3,
    "nomina_empleado_operarios": 5,
    "nomina_tercero_creados": 2,
    "nomina_tercero_operario_creados": 5,
    "nomina_promedio_lote_ajustados": 2,
    "nomina_validacion_cosecha_confirmada": false,
    "requiere_validacion_cosecha": true,
    "listo_para_cerrar": false
  }
}
```

`listo_para_cerrar = true` cuando hay al menos un colaborador y (`requiere_validacion_cosecha=false` OR `nomina_validacion_cosecha_confirmada=true`). El frontend puede usar este flag para habilitar/deshabilitar el botón "Cerrar" del paso 5.

### 3.7 Secuencia obligatoria del paso "Confirmación" del wizard

Cuando el usuario hace clic en "Crear Período de Pago" (paso 4 del wizard frontend, equivalente al paso 2 + paso 3 del backend), el frontend **debe** ejecutar esta secuencia — cada llamada depende de la anterior:

```
1. POST   /nominas                                → id
2. POST   /nominas/{id}/empleados  (o /terceros)  → hidrata nomina_empleado + nomina_tercero + nomina_tercero_operario
3. PUT    /nominas/{id}/promedios-lote/{lote_id}  × N  → hidrata nomina_promedio_lote
4. POST   /nominas/{id}/validar-cosecha/confirmar  → hidrata nomina_validacion_cosecha
```

**Warning:** si el frontend salta 3 o 4, la nómina no podrá cerrarse. `POST /nominas/{id}/cerrar` devolverá `409 NOMINA_VALIDACION_COSECHA_REQUERIDA`. Usa `GET /paso-4-checklist` para diagnosticar cuáles llamadas faltan.

Las llamadas 3 y 4 son idempotentes (upsert), así que reintentos son seguros.

---

## 4. Paso 3 — Validar Cosecha

Paso opcional pero requerido al cerrar si hay cosechas registradas en el período. Compara los kg reportados por los colaboradores contra los kg recibidos en la extractora (viajes FINALIZADOS). Permite ajustar el promedio efectivo de un lote **por nómina** antes de confirmar.

### 4.1 Bundle de comparación

`GET /nominas/{id}/validar-cosecha`

Requiere permiso `nomina.editar`. Calcula sin persistir.

```json
{
  "data": {
    "total_kg_colaboradores": 3330.00,
    "total_kg_extractora": 3330.00,
    "diferencia_kg": 0.00,
    "promedios_por_lote": [
      {
        "lote_id": 1,
        "lote_nombre": "Lote 1 - Norte",
        "promedio_auto": 14.53,
        "promedio_manual": null,
        "promedio_efectivo": 14.53
      }
    ],
    "detalle_por_colaborador": [
      {
        "tipo": "EMPLEADO",
        "colaborador_id": 5,
        "nombre_completo": "María González López",
        "cargo": "Operaria de Campo",
        "kg": 1200.00,
        "cosechas": [
          {
            "fecha": "2026-05-03",
            "lote": "Lote 1 - Norte",
            "sublote": "Sublote A",
            "remision": "GE-001",
            "gajos_trabajados": 86,
            "gajos_verificados": 86,
            "diferencia_gajos": 0,
            "kg_trabajado": 1200.00,
            "kg_extractora": 1200.00,
            "diferencia_kg": 0.00
          }
        ]
      },
      {
        "tipo": "OPERARIO",
        "colaborador_id": 3,
        "nombre_completo": "Pedro Ramírez",
        "cargo": "Cosechero",
        "kg": 2130.00,
        "cosechas": [...]
      }
    ],
    "validado_at": "2026-06-10T14:32:00+00:00",
    "validado_por": "Carlos Rodríguez"
  }
}
```

- `validado_at` y `validado_por` son `null` si el paso aún no fue confirmado.
- `diferencia_kg = total_kg_colaboradores − total_kg_extractora`. Objetivo: tender a 0.
- El peso por colaborador se reparte equitativamente entre los miembros activos de la cuadrilla (`floor(gajos_efectivos / N)`).

**Cómo se calcula `kg_trabajado` por cuadrillero:**

```
kg_trabajado = floor(gajos_efectivos / N) × promedio_efectivo_del_lote
```

`promedio_efectivo_del_lote` se resuelve en este orden de prioridad:

| Prioridad | Fuente | Descripción |
|---|---|---|
| 1 | `nomina_promedio_lote.promedio_efectivo` | Ajuste manual del admin para esta nómina × lote (si existe). |
| 2 | `AVG(promedio_lote.promedio)` en el período | Promedio de promedios auto-generados por `ViajeCalculationService` para el lote en el rango `[fecha_inicio, fecha_fin]`. |
| 3 | Baseline del año (`viaje_id IS NULL`) | El promedio baseline más reciente del lote para el año, con `viaje_id IS NULL`. Solo si no hay registros en el período. |

**Cómo se calcula `kg_extractora` por cuadrillero** — prioridad:

| Prioridad | Condición | Valor |
|---|---|---|
| 1 | `cosecha_cuadrilla.peso_calculado_empleado` tiene valor | Valor directo escrito por `ViajeCalculationService` al finalizar el viaje. |
| 2 | `peso_calculado_empleado` NULL pero `promedio_kg_gajo` tiene valor | `floor(gajos_efectivos / N) × promedio_kg_gajo` — fallback legacy. |
| 3 | Ambos NULL | 0 kg. |

**Campos del detalle por cosecha (`cosechas[]`):**

| Campo | Descripción |
|---|---|
| `fecha` | Fecha de la operación (APROBADA). |
| `lote` | Nombre del lote. |
| `sublote` | Nombre del sublote (puede ser `null`). |
| `remision` | `viaje.numero_remision_extractora` del viaje vinculado a esta cosecha (puede ser `null` si no hay viaje). |
| `gajos_trabajados` | `cosecha.gajos_reportados` (lo que reportó el empleado). |
| `gajos_verificados` | `gajos_reconteo ?? gajos_reportados`. |
| `diferencia_gajos` | `gajos_verificados − gajos_trabajados`. |
| `kg_trabajado` | Calculado con `promedio_efectivo` ajustable. |
| `kg_extractora` | Peso real del viaje o fallback (ver tabla arriba). |
| `diferencia_kg` | `kg_trabajado − kg_extractora`. |

**`promedios_por_lote[]`:** array con un elemento por cada lote distinto en las cosechas del período. Muestra el promedio auto-calculado, el ajuste manual del admin (si existe) y el efectivo que se usa en los cálculos. Al llamar `PUT /promedios-lote/{lote}` y luego re-llamar este endpoint, `promedio_efectivo` reflejará el valor manual.

### 4.2 Ajustar promedio efectivo de un lote (por nómina)

`PUT /nominas/{id}/promedios-lote/{lote}`

Requiere permiso `nomina.editar`. La nómina debe estar en BORRADOR.

```json
{ "promedio": 18.50 }
```

Reglas:
- `promedio` es requerido, numérico y mayor a 0.
- Guarda el ajuste en `nomina_promedio_lote` (tabla exclusiva para overrides manuales por nómina × lote). **No escribe en `promedio_lote`**, que es de solo lectura y se genera automáticamente por `ViajeCalculationService` al finalizar viajes.
- Idempotente: llamar dos veces actualiza el registro existente, nunca duplica (UNIQUE por `nomina_id × lote_id`).
- Al ajustar, el `promedio_efectivo` cambia para esta nómina. Llamar nuevamente `GET /validar-cosecha` mostrará la diferencia actualizada. `NominaCalculationService` y `CerrarNominaService` también usan este promedio efectivo, por lo que el pago calculado de cada colaborador y el snapshot de cierre quedarán consistentes con el ajuste.

**Respuesta 200** — devuelve solo el registro actualizado. El frontend debe llamar `GET /validar-cosecha` después para refrescar la tabla de diferencias y los totales:
```json
{
  "message": "Promedio ajustado correctamente",
  "data": {
    "lote_id": 3,
    "lote_nombre": "Lote Norte",
    "promedio_auto": 14.53,
    "promedio_manual": 18.50,
    "promedio_efectivo": 18.50,
    "ajustado_at": "2026-06-30T14:32:00+00:00"
  }
}
```

**Error si CERRADA:** 409 `NOMINA_CERRADA`.

### 4.3 Confirmar validación

`POST /nominas/{id}/validar-cosecha/confirmar`

Requiere permiso `nomina.editar`. La nómina debe estar en BORRADOR.

Persiste el snapshot calculado por el bundle en `nomina_validacion_cosecha`. **Idempotente:** un segundo POST reemplaza al primero con los datos más recientes — nunca duplica (UNIQUE por `nomina_id`).

**Respuesta 200:**
```json
{
  "message": "Validación de cosecha confirmada",
  "data": {
    "id": 7,
    "nomina_id": 12,
    "total_kg_colaboradores": "4250.50",
    "total_kg_extractora": "4100.00",
    "diferencia_kg": "150.50",
    "validado_por": 3,
    "validado_at": "2026-06-10T14:32:00.000000Z"
  }
}
```

**Error si CERRADA:** 409 `NOMINA_CERRADA`.

> **Cuándo es obligatorio:** el `POST /nominas/{id}/cerrar` verifica si existen `cosecha_cuadrilla` con operación APROBADA en el rango. Si hay cosechas y no hay confirmación → 409 `NOMINA_VALIDACION_COSECHA_REQUERIDA`. Si no hay cosechas, el paso 3 se puede omitir.

---

## 5. Liquidar colaborador (empleado u operario, 1 a 1)

Pantalla dedicada post-wizard: liquidación **individual** de cada fila de `nomina_empleado` (sea empleado propio u operario de tercero). El editor abre cargando `GET /preview` y (para VARIABLE) `GET /resumen-trabajo` en paralelo, muestra los valores propuestos, permite ajustes manuales, y persiste con `POST /liquidar` (o `PUT /liquidacion` para re-liquidar mientras la nómina siga BORRADOR).

El motor ramifica automáticamente: si `nomina_empleado.operario_id !== null`, el cálculo omite conceptos legales obligatorios (SALUD/PENSION/FSP), subsidio de transporte, ausencias y horas extras — el operario cobra solo jornales + cosecha (ver §9.8).

### 5.1 Preview de cálculo

`GET /nomina-empleado/{id}/preview`

Calcula sin persistir. Es **idempotente** y no requiere permiso `nomina.liquidar` para leerlo (sí lo requiere para confirmar después). Devuelve los valores propuestos para el editor.

```json
{
  "data": {
    "dias_periodo": 15,
    "dias_trabajados": 15,
    "salario_base": 1500000,
    "total_jornales": 0,
    "total_cosecha": 0,
    "total_horas_extra": 0,
    "total_recargos": 0,
    "total_incapacidades": 0,
    "dias_ausencia_descontados": 0,
    "total_ausencias_descuento": 0,
    "total_devengado": 1500000,
    "subsidio_transporte": 162000,
    "conceptos_legales": [
      { "concepto_id": 1, "codigo": "SALUD",   "nombre": "Descuento Salud (4%)",   "porcentaje": 4, "base": 1500000, "valor": 60000 },
      { "concepto_id": 2, "codigo": "PENSION", "nombre": "Descuento Pensión (4%)", "porcentaje": 4, "base": 1500000, "valor": 60000 }
    ],
    "total_deducciones_legales": 120000,
    "total_neto_propuesto": 1542000,
    "empleado": {
      "id": 5, "nombre_completo": "María González López",
      "documento": "1098765432", "cargo": "Administradora",
      "salario_tipo": "FIJO",
      "predio": { "id": 1, "nombre": "Puerto Arturo" }
    },
    "prestamos_pendientes": [
      {
        "prestamo_cuota_id": 42,
        "prestamo_id": 7,
        "concepto": "Préstamo personal",
        "numero_cuota": 4,
        "total_cuotas": 10,
        "monto": 150000,
        "saldo_restante_prestamo": 900000
      }
    ],
    "detalle_horas_extra": [
      {
        "id": 77,
        "fecha": "2026-04-17",
        "codigo": "HED",
        "tipo_nombre": "Hora Extra Diurna",
        "es_extra": true,
        "cantidad_horas": 2.0,
        "valor_hora_base": 6250.00,
        "porcentaje_recargo": 25.00,
        "paga_hora_completa": true,
        "valor_calculado": 15625.00,
        "observacion": "Cierre de lote tras lluvia"
      }
    ],
    "detalle_ausencias": [
      {
        "id": 90,
        "tipo": "INCAPACIDAD_EPS",
        "motivo_nombre": "Incapacidad EPS - General",
        "fecha_inicio": "2026-04-15",
        "fecha_fin": "2026-04-17",
        "dias_en_rango": 3,
        "es_remunerada": true,
        "porcentaje_pago": 66.67,
        "valor_calculado": 150000.00,
        "afecta": "INCAPACIDAD"
      },
      {
        "id": 91,
        "tipo": "PERMISO_NO_REMUNERADO",
        "motivo_nombre": "Permiso personal no remunerado",
        "fecha_inicio": "2026-04-10",
        "fecha_fin": "2026-04-10",
        "dias_en_rango": 1,
        "es_remunerada": false,
        "porcentaje_pago": 0.0,
        "valor_calculado": 50000.00,
        "afecta": "DESCUENTO"
      }
    ],
    "pendientes_por_aprobar": {
      "horas_extra": 2,
      "ausencias": 1
    }
  }
}
```

> **`prestamos_pendientes`:** cuotas de préstamos VIGENTES cuyo período `(anio, mes, quincena)` coincide con el de la nómina actual. Solo aparece en el preview de **colaboradores internos** (no operarios). El liquidador decide si incluye o no cada cuota en `deducciones_voluntarias` al confirmar (ver §5.3). Si no hay cuotas pendientes para ese período el array llega vacío `[]`.

> **`detalle_horas_extra`:** array con una entrada por cada hora extra APROBADA que está siendo incluida en el cálculo. Campos: `id`, `fecha` (de la planilla), `codigo` (HED/HEN/RD…), `tipo_nombre`, `es_extra` (true = hora extra legal, false = recargo), `cantidad_horas`, `valor_hora_base`, `porcentaje_recargo`, `paga_hora_completa`, `valor_calculado`, `observacion`. Array vacío `[]` si no hay horas extras en el período. Solo aparece en colaboradores internos.

> **`detalle_ausencias`:** array con una entrada por cada ausencia APROBADA que afecta la nómina en el rango. Campos: `id`, `tipo` (constante del modelo p.ej. `INCAPACIDAD_EPS`), `motivo_nombre` (nombre del catálogo), `fecha_inicio`, `fecha_fin`, `dias_en_rango` (días que caen dentro del período), `es_remunerada`, `porcentaje_pago`, `valor_calculado` (monto que suma o descuenta), `afecta` (`"INCAPACIDAD"` si es remunerada y suma al devengado, `"DESCUENTO"` si es no remunerada y descuenta del salario). Array vacío `[]` si no hay ausencias. Solo aparece en colaboradores internos.

> **`pendientes_por_aprobar`:** indica cuántas horas extras y ausencias del empleado están en estado `PENDIENTE` dentro del período y **no están siendo incluidas** en el cálculo actual. El cálculo solo toma registros con `estado = APROBADA`; los `PENDIENTE` quedan fuera hasta que alguien los apruebe vía `POST /horas-extra/{id}/aprobar` o `POST /ausencias/{id}/aprobar` (ver §4.4 y §5.4 de API_OPERACIONES.md). **Si alguno de estos conteos es > 0, el frontend debe mostrar una advertencia** al liquidador antes de confirmar, por ejemplo: *"Hay 2 horas extras y 1 ausencia pendientes de aprobación — no se incluirán en el pago hasta que se aprueben. Ve a la planilla correspondiente y apruébalas."* Solo aparece en colaboradores internos (los operarios no reportan horas extras ni ausencias). Si ambos valores son `0` el objeto igual llega (no es null).

> **El `total_neto_propuesto` ya cuadra con el mockup de la UI:** $1.500.000 + $162.000 − ($60.000 + $60.000) = **$1.542.000**.

#### Preview para operario (estructura reducida)

Si `empleado.salario_tipo === null` la fila pertenece a un **operario de tercero**. La respuesta omite los campos `conceptos_legales`, `subsidio_transporte`, `dias_ausencia_descontados`, `total_ausencias_descuento`, `total_incapacidades`, `total_horas_extra`, `total_recargos` y `total_deducciones_legales`. `total_neto_propuesto === total_devengado` (sin deducciones). El campo `empleado.tercero` estará presente con `{id, razon_social}`.

```json
{
  "data": {
    "dias_periodo": 15,
    "dias_trabajados": 8,
    "salario_base": 0,
    "total_jornales": 350000,
    "total_cosecha": 120000,
    "total_devengado": 470000,
    "total_neto_propuesto": 470000,
    "empleado": {
      "id": 3,
      "nombre_completo": "Pedro Ramírez",
      "documento": "1234567890",
      "cargo": "Cosechero",
      "salario_tipo": null,
      "predio": null,
      "tercero": { "id": 2, "razon_social": "Contratistas del Sur SAS" }
    }
  }
}
```

### 5.2 Resumen de trabajo (solo VARIABLE)

`GET /nomina-empleado/{id}/resumen-trabajo`

Devuelve los jornales y cosechas del empleado en el rango de la nómina, agrupados por categoría/tipo (idéntico a la sección "Resumen de Trabajo - Planilla Diaria" del mockup).

```json
{
  "data": {
    "cosecha": {
      "filas": [
        {
          "fecha": "31/03/2026", "lote": "PISCINAS", "sublote": "PS-01",
          "cosecha": "C-2026-001", "racimos": 40, "promedio_kg": 15.0,
          "peso_kg": 600, "precio_kg": 45,
          "total_cosecha": 27000, "jornal": 80000
        }
      ],
      "subtotal_valor": 159930, "subtotal_jornal": 488000,
      "subtotal_racimos": 248, "subtotal_peso": 3720
    },
    "plateo": { "filas": [], "subtotal_valor": 0, "subtotal_jornal": 0, "subtotal_palmas": 0 },
    "poda":   { "filas": [...], "subtotal_jornal": 53000, "subtotal_palmas": 56 },
    "fertilizacion": { "filas": [...] },
    "sanidad": {
      "filas": [
        { "fecha": "08/04/2026", "lote": "SEMBRIO A", "sublote": "SA-02",
          "descripcion": "Control de plagas con insecticida", "jornal": 50000 }
      ],
      "subtotal_jornal": 50000
    },
    "otros": { "filas": [], "subtotal_jornal": 0 },
    "finca": { "filas": [], "subtotal_jornal": 0 },
    "total_general": 641000
  }
}
```

Solo incluye operaciones con `estado=APROBADA`. Si el empleado es FIJO → 422 `EMPLEADO_NO_VARIABLE`.

### 5.3 Confirmar liquidación

`POST /nomina-empleado/{id}/liquidar`

```json
{
  "dias_trabajados": 15,
  "bonificaciones": [
    { "nombre": "Productividad mes",   "valor": 200000 }
  ],
  "deducciones_voluntarias": [
    { "concepto_id": 17, "valor": 50000, "observacion": "Adelanto del 1 de mayo" },
    { "concepto_id": 17, "valor": 150000, "observacion": "Cuota 4/10 - Préstamo personal", "prestamo_cuota_id": 42 },
    { "concepto_id": 18, "valor": 30000 }
  ]
}
```

Reglas:
- `dias_trabajados` es opcional; si no llega, el backend usa el calculado en el preview.
- Para **operarios** (`salario_tipo === null`): `bonificaciones` y `deducciones_voluntarias` son rechazadas con **422**. Solo se acepta `dias_trabajados` opcional.
- `bonificaciones[]` libre: cada fila se persiste como `nomina_empleado_concepto` con el concepto `BONIFICACION` (genérico, sembrado por defecto). El campo `nombre`/`observacion` se guarda en `observacion` de la fila para mostrarlo en el desprendible.
- `deducciones_voluntarias[]` debe referenciar conceptos del catálogo (subtipo `PRESTAMO`, `AHORRO_VOLUNTARIO`, `LIBRANZA`, etc.). El frontend obtiene el dropdown desde `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA`.
- **`prestamo_cuota_id`** (opcional por ítem): si la deducción corresponde a una cuota de préstamo del módulo de Préstamos (ver §15), incluir el ID de la cuota. El backend marcará la cuota como `APLICADA` y actualizará el saldo del préstamo. Si la cuota no existe, no pertenece al empleado o ya está aplicada, el backend devuelve **422 `PRESTAMO_CUOTA_NO_PENDIENTE`**.
- Las **deducciones legales** (SALUD, PENSIÓN, FSP) **no llegan en el body**: el motor las calcula y persiste automáticamente.
- El subsidio de transporte **no es concepto**: se persiste como columna `subsidio_transporte` en `nomina_empleado` (mismo motivo: el desprendible lo muestra como ítem propio en "Devengado").
- Re-liquidación (`PUT /nomina-empleado/{id}/liquidacion`): borra los `nomina_empleado_concepto` previos y reescribe. Permitido solo si la nómina está BORRADOR.

**Respuesta 200:**
```json
{
  "message": "Empleado liquidado correctamente",
  "data": {
    "id": 45,
    "estado": "LIQUIDADO",
    "dias_trabajados": 15,
    "salario_base": "1500000.00",
    "total_jornales": "0.00",
    "total_cosecha": "0.00",
    "total_devengado": "1500000.00",
    "subsidio_transporte": "162000.00",
    "total_bonificaciones": "200000.00",
    "total_deducciones": "200000.00",
    "total_neto": "1662000.00",
    "cargo_snapshot": "Administradora",
    "predio_snapshot": "Puerto Arturo",
    "salario_minimo_snapshot": "1423500.00",
    "liquidado_por": 3,
    "liquidado_at": "2026-05-06T11:32:10Z",
    "empleado": { "id": 5, "primer_nombre": "María", "primer_apellido": "González" },
    "conceptos": [
      { "id": 100, "concepto_id": 1, "operacion": "RESTA", "valor_calculado": "60000.00", "porcentaje_aplicado": "4.00", "base_aplicada": "1500000.00", "es_manual": false, "concepto": { "codigo": "SALUD", "nombre": "Descuento Salud (4%)" } }
    ]
  }
}
```

---

## 6. Paso 5 — Cerrar nómina + desprendible

### 6.1 Cerrar nómina

`POST /nominas/{id}/cerrar`

Cierre transaccional. Requiere permiso `nomina.cerrar`. Acciones realizadas (todas en una sola transacción):

1. Valida que **todos los empleados y operarios** estén LIQUIDADOS. Si hay PENDIENTES → 409 `NOMINA_CON_PENDIENTES`.
2. Valida que la validación de cosecha esté confirmada si hay `cosecha_cuadrilla` APROBADAS en el rango (→ 409 `NOMINA_VALIDACION_COSECHA_REQUERIDA`).
3. Valida que **cada contratista con operarios en la nómina tenga su `nomina_tercero` liquidada** (`total_a_transferir > 0` o `total_dias > 0`). Si falta → 409 `NOMINA_TERCERO_NO_LIQUIDADO` con la lista de `tercero_ids` faltantes. Estados aceptados: `PENDIENTE` o `PAGADO` — no se exige que el acta esté PAGADA para poder cerrar.
4. Crea snapshots de los jornales en `nomina_jornal_ref` (`valor_snapshot = jornales.valor_total` actual). Para filas de operario, filtra por `operario_id` en vez de `empleado_id`.
5. Crea snapshots de la cuadrilla de cosecha en `nomina_cosecha_ref` (usa `NominaPromedioLote.promedio_efectivo` con prioridad; ver §10). Para operarios, filtra por `operario_id`.
6. Marca cada `HoraExtra` APROBADA del rango como **LIQUIDADA** (estado + `nomina_id`) y crea snapshot en `nomina_hora_extra_ref` — **solo aplica a empleados propios** (operarios no reportan horas extras).
7. Marca cada `Ausencia` APROBADA del rango como **LIQUIDADA** (estado + `nomina_id`) — **solo aplica a empleados propios**.
8. Recalcula los totales globales de la nómina sumando empleados + operarios.
9. Cambia `nomina.estado=CERRADA`, setea `cerrada_por` y `cerrada_at`.

**Respuesta 200:**
```json
{
  "message": "Nómina cerrada correctamente",
  "data": {
    "id": 12, "estado": "CERRADA",
    "cerrada_por": 3, "cerrada_at": "2026-05-06T11:32:10Z",
    "total_fijos": "1500000.00", "total_variables": "1300000.00",
    "total_bonificaciones": "200000.00", "total_deducciones": "200000.00",
    "total_general": "2800000.00",
    "cerrada_por_rel": { "id": 3, "name": "Carlos Rodríguez" }
  }
}
```

Tras cerrar:
- `PUT /nominas/{id}` → 409 `NOMINA_CERRADA`.
- `PUT /nomina-empleado/{id}/liquidacion` → 409 `NOMINA_CERRADA`.
- `DELETE` de la nómina o sus empleados → 409.
- Las ausencias/horas extras ya no se pueden editar (entran en su propia regla `AUSENCIA_LIQUIDADA` / `HORA_EXTRA_LIQUIDADA`).
- **Excepción documentada:** `POST /nominas/{id}/terceros/{tercero}/registrar-pago` sigue habilitado incluso con la nómina CERRADA — permite coordinar la transferencia bancaria al contratista después del cierre contable. Ver §7 "Acta de Tercero".

### 6.2 Desprendible — datos JSON

`GET /nomina-empleado/{id}/desprendible`

Solo permitido si el empleado está LIQUIDADO. Devuelve la estructura completa para renderizar el desprendible en la UI:

```json
{
  "data": {
    "finca": "PUERTO ARTURO",
    "empleado": {
      "id": 10, "nombre_completo": "Luis Martínez Pérez",
      "documento": "1098765432", "cargo": "Operario de palma",
      "salario_tipo": "VARIABLE", "salario_base": 1300000
    },
    "nomina": {
      "id": 12, "periodo_label": "Febrero 2026 – Primera quincena",
      "mes": 2, "anio": 2026, "quincena": 1, "tipo_pago": "QUINCENAL",
      "fecha_inicio": "2026-02-01", "fecha_fin": "2026-02-15", "estado": "CERRADA"
    },
    "liquidacion": {
      "fecha": "2026-05-06", "fecha_humana": "miércoles, 6 de mayo de 2026",
      "liquidado_por": "Carlos Rodríguez",
      "dias_trabajados": 8,
      "total_jornales": 641000, "total_cosecha": 11000,
      "total_horas_extra": 0, "total_recargos": 0, "total_incapacidades": 0,
      "subsidio_transporte": 162000,
      "total_devengado": 652000,
      "total_bonificaciones": 0,
      "total_deducciones": 52160,
      "total_neto": 761840,
      "bonificaciones": [],
      "deducciones": [
        { "codigo": "SALUD",   "nombre": "Descuento Salud (4%)",   "porcentaje": 4, "base": 652000, "valor": 26080, "es_manual": false },
        { "codigo": "PENSION", "nombre": "Descuento Pensión (4%)", "porcentaje": 4, "base": 652000, "valor": 26080, "es_manual": false }
      ],
      "detalle_horas_extra": [
        {
          "id": 77, "fecha": "2026-02-03", "codigo": "HED", "tipo_nombre": "Hora Extra Diurna",
          "es_extra": true, "cantidad_horas": 2.0, "valor_hora_base": 5416.67,
          "porcentaje_recargo": 25.00, "paga_hora_completa": true,
          "valor_calculado": 13541.68, "observacion": "Cierre de lote"
        }
      ],
      "detalle_ausencias": [
        {
          "id": 90, "tipo": "INCAPACIDAD_EPS", "motivo_nombre": "Incapacidad EPS - General",
          "fecha_inicio": "2026-02-10", "fecha_fin": "2026-02-12",
          "dias_calendario": 3, "es_remunerada": true, "porcentaje_pago": 66.67,
          "afecta": "INCAPACIDAD"
        }
      ]
    },
    "resumen_trabajo": { "cosecha": { ... }, "poda": { ... }, ... }
  }
}
```

`resumen_trabajo` solo viene poblado para empleados VARIABLE (es null para FIJO).

**`detalle_horas_extra` y `detalle_ausencias` en el desprendible:** mismo contrato de campos que en el preview (§5.1), pero la fuente es la BD (registros con `nomina_id` ya seteado porque la nómina está CERRADA). El campo `dias_calendario` en ausencias es el del modelo (días totales de la ausencia), no los días en rango. Ambos arrays llegan vacíos `[]` si el empleado no tuvo horas extras / ausencias en el período.

### 6.3 Desprendible — PDF

`GET /nomina-empleado/{id}/desprendible/pdf`

Devuelve el PDF binario con `Content-Disposition: attachment; filename="desprendible_{cedula}_{anio}_{mes}_Q{n}.pdf"`. Generado con DomPDF a partir del template `resources/views/desprendible/nomina.blade.php`.

El PDF incluye, en orden:
1. Cabecera con FINCA, NOMBRE, CÉDULA, FECHA, PERÍODO, BASE (FIJO/VARIABLE), DÍAS CANCELADOS.
2. Para VARIABLE: tablas agrupadas de Cosecha, Plateo, Poda, Fertilización, Sanidad, Otros, Finca.
3. Sección **Devengado**:
   - FIJO: `SUELDO BÁSICO` (salario_base mensual).
   - VARIABLE: `BASE JORNALES (DESTAJO)` y/o `BASE COSECHA` — se imprimen solo las líneas con total > 0.
   - Luego: horas extras, recargos, incapacidades, bonificaciones (si aplican).
   - `TOTAL BRUTO` = total_devengado + total_bonificaciones.
   - Subsidio transporte (si > 0) por debajo del total bruto.
4. Sección **Deducciones** (salud, pensión, FSP si aplica, deducciones voluntarias manuales).
5. **TOTAL NETO** destacado.
6. Líneas de firma (Recibido / Huella).

### 6.4 Desprendible — WhatsApp (placeholder)

`POST /nomina-empleado/{id}/desprendible/whatsapp`

```json
{
  "message": "URL del desprendible generada. Abre wa.me con el texto que contenga la URL.",
  "data": {
    "url": "https://app.example.com/api/v1/tenant/nomina-empleado/45/desprendible/pdf?expires=1747836000&signature=abc123",
    "filename": "desprendible_1098765432_2026_05_Q1.pdf",
    "expires_at": "2026-05-13T11:32:10+00:00"
  }
}
```

Genera el PDF y lo guarda en `storage/app/public/tenants/{tenant_id}/desprendibles/{filename}.pdf`. Devuelve una URL temporal firmada (válida 7 días). El frontend abre `wa.me/?text=URL` con esa URL para que el supervisor la envíe por WhatsApp manualmente.

> **No es integración real con WhatsApp Business API** — eso queda para una iteración posterior. La firma cambiará a `provider: 'twilio'|'meta-cloud-api'` cuando se implemente el envío automático.

---

## 7. Acta de Tercero (Liquidación de Contratistas)

Vista y flujo dedicados a pagar a las empresas contratistas cuyos operarios trabajaron en el período. El acta agrega **por contratista** los jornales y cosechas de sus operarios y persiste en:

- `nomina_tercero` — cabecera con totales y estado de pago
- `nomina_tercero_operario` — una línea por operario con `total_jornales`, `total_cosecha`, `subtotal`, `labores_realizadas` (JSON)
- `nomina_tercero_operario_descuento` — N descuentos con concepto identificado por línea de operario

Las filas se pre-hidratan al agregar operarios en el paso 4 del wizard (ver §3.4) con totales en 0 — el usuario luego llega a la pantalla "Liquidación de Terceros" y ejecuta `POST /liquidar` para calcular los totales reales.

**Vista solo-lectura:** las líneas por operario NO son editables directamente. El usuario puede agregar/eliminar descuentos con concepto (§7.5 y §7.6) y expandir el acordeón para ver el desglose de labores (§7.4).

**Fórmula (PR-4.2):**
```
subtotal_operario     = total_jornales + total_cosecha − SUM(descuentos.valor)
total_a_transferir    = SUM(subtotal_operario)          ← sin suma separada de cosecha
```

### 7.1 Resumen agrupado — `GET /nominas/{id}/terceros-actas`

Devuelve una fila por cada `nomina_tercero` de la nómina con totales y estado. Requiere `nomina.ver`.

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": 42,
      "tercero_id": 1,
      "tercero_nombre": "Servicios Agro S.A.S",
      "total_dias": 12,
      "total_jornales": 720000.00,
      "total_cosecha": 155000.00,
      "total_bruto": 875000.00,
      "total_a_transferir": 875000.00,
      "estado_pago": "PENDIENTE",
      "orden_pago_numero": null,
      "metodo_pago": null,
      "pagado_at": null
    }
  ],
  "resumen": {
    "total_a_transferir_global": 875000.00,
    "pendiente": 875000.00,
    "pagado": 0.00,
    "contratistas": 1
  }
}
```

> **Nota de ruta:** este endpoint es `/terceros-actas` (no `/terceros`) porque `POST /nominas/{id}/terceros` (§3.4) sirve para AGREGAR operarios al paso 4 del wizard. Separarlos evita colisión de rutas y clarifica la semántica.

### 7.2 Detalle del acta — `GET /nominas/{id}/terceros/{tercero}`

Devuelve el acta completa: datos del contratista (incluyendo bancarios si aplica), datos de la nómina, totales del acta y las líneas por operario. Requiere `nomina.ver`.

**Response 200:**
```jsonc
{
  "data": {
    "tercero": {
      "id": 1, "tipo_persona": "JURIDICA",
      "nombre": "Servicios Agro S.A.S",
      "nit": "900123456", "cedula": null,
      "representante": "Juan Pérez",
      "telefono": "3001234567", "email": "contacto@serviciosagro.co",
      "banco": "Bancolombia", "tipo_cuenta": "AHORROS",
      "numero_cuenta": "12345678901", "titular_cuenta": "Servicios Agro S.A.S"
    },
    "nomina": {
      "id": 12, "periodo_label": "Julio 2026 – Primera quincena",
      "mes": 7, "anio": 2026, "quincena": 1,
      "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-15",
      "estado": "BORRADOR"
    },
    "acta": {
      "id": 42,
      "total_dias": 12,
      "total_jornales": 720000.00,
      "total_cosecha": 155000.00,
      "total_bruto": 875000.00,
      "total_a_transferir": 875000.00,
      "estado_pago": "PENDIENTE",
      "orden_pago_numero": null,
      "metodo_pago": null,
      "referencia_pago": null,
      "pagado_at": null,
      "pagado_por": null,
      "observacion": null
    },
    "operarios": [
      {
        "id": 501,
        "operario_id": 3,
        "nombre_completo": "Andrés Morales Ruiz",
        "cedula": "1023456789",
        "cargo": "Cosechero",
        "labores_realizadas": ["Cosecha", "Plateo"],
        "total_jornales": 360000.00,
        "total_cosecha": 48690.00,
        "total_descuentos": 50000.00,
        "descuentos": [
          {
            "id": 88,
            "concepto_id": 17,
            "concepto_codigo": "DCTO_ADELANTO",
            "concepto_nombre": "Descuento Adelantos / Préstamo",
            "valor": 50000.00,
            "observacion": "Herramienta extraviada"
          }
        ],
        "subtotal": 358690.00,
        "observacion": null
      }
    ]
  }
}
```

Errores:
- `404 ACTA_NO_CALCULADA` — el tercero tiene operarios en la nómina pero el acta aún no se ha liquidado. Ejecutar `POST /liquidar` primero.
- `404 TERCERO_SIN_OPERARIOS_EN_NOMINA` — el tercero no está en la nómina.

### 7.3 Liquidar acta — `POST /nominas/{id}/terceros/{tercero}/liquidar`

Calcula y persiste el acta. Body vacío (`{}` o sin body). Requiere `nomina.liquidar`.

Comportamiento (`LiquidarTerceroService::liquidar()`):
- Lee las filas `nomina_empleado` con `tercero_id={tercero}` en la nómina. Auto-liquida operarios PENDIENTES si los encuentra.
- Para cada operario, toma `total_jornales` y `total_cosecha` de la fila `nomina_empleado` (ya calculados en §5).
- Preserva los descuentos existentes en `nomina_tercero_operario_descuento` al recalcular.
- `subtotal = total_jornales + total_cosecha − SUM(descuentos.valor)`.
- `total_a_transferir = SUM(subtotales)` (sin suma separada de cosecha).
- Escanea `jornales` del operario en el rango y snapshotea etiquetas distintas de labores en `labores_realizadas`.
- Hace `updateOrCreate` con `UNIQUE(nomina_id, tercero_id)` / `UNIQUE(nomina_tercero_id, operario_id)` → idempotente.
- **Preserva** `observacion` de la línea y `estado_pago` + datos de pago de la cabecera si ya existían.

Errores:
- `409 NOMINA_CERRADA`
- `422 TERCERO_SIN_OPERARIOS_EN_NOMINA`

### 7.4 Desglose de labores — `GET /nominas/{id}/terceros/{tercero}/operarios/{op}/detalle`

Endpoint de solo-lectura. Devuelve el desglose de lo que hizo el operario durante el período, organizado por cosecha y jornales. Lo usa el frontend para mostrar el acordeón de detalle al expandir la fila de un operario. Requiere `nomina.ver`.

**Response 200:**
```jsonc
{
  "data": {
    "cosecha": [
      {
        "lote_id": 1, "lote": "PISCINAS",
        "sublote_id": 2, "sublote": "PS-01",
        "gajos": 36,
        "promedio_kg_gajo": 14.5,
        "peso_kg": 522.0,
        "precio_unit_kg": 45.0,
        "total": 23490.0
      }
    ],
    "jornales": [
      {
        "labor_id": 5, "labor_nombre": "Poda", "categoria": "PALMA",
        "tipo_pago": "POR_PALMA",
        "lote": "PISCINAS", "sublote": "PS-01",
        "unidades": 850, "unidad": "palmas",
        "precio_unit": 1900.0, "total": 1615000.0
      },
      {
        "labor_id": 8, "labor_nombre": "Pintura instalaciones", "categoria": "FINCA",
        "tipo_pago": "JORNAL_FIJO",
        "lote": null, "sublote": null,
        "unidades": 1, "unidad": "jornal",
        "precio_unit": 150000.0, "total": 150000.0
      }
    ]
  }
}
```

Errores:
- `422 OPERARIO_NO_PERTENECE_A_TERCERO`
- `404 ACTA_NO_CALCULADA` — el acta no existe; ejecutar `POST /liquidar` primero.

### 7.5 Agregar descuento — `POST /nominas/{id}/terceros/{tercero}/operarios/{op}/descuentos`

Agrega un descuento con concepto identificado a la línea del operario dentro del acta. Recalcula `subtotal` del operario y `total_a_transferir` del acta. Requiere `nomina.liquidar`.

**Request:**
```jsonc
{
  "concepto_id": 17,
  "valor": 50000.00,
  "observacion": "Herramienta extraviada"  // opcional
}
```

Reglas del request (`AgregarDescuentoOperarioActaRequest`):
- `concepto_id`: debe existir en el catálogo del tenant con `tipo=DEDUCCION_VOLUNTARIA` y `activo=true` → usa `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA` para el dropdown.
- `valor`: `> 0`. No hay límite por debajo del subtotal — el subtotal puede quedar negativo.
- Un operario puede tener **N descuentos** del mismo o distinto concepto.

**Response 201:** acta completa (mismo shape que `GET /nominas/{id}/terceros/{tercero}`).

Errores:
- `409 NOMINA_CERRADA`
- `422 OPERARIO_NO_PERTENECE_A_TERCERO`
- `422 DESCUENTO_CONCEPTO_INVALIDO` — concepto no existe, no es `DEDUCCION_VOLUNTARIA` o está inactivo.
- `404 ACTA_NO_CALCULADA`

### 7.6 Eliminar descuento — `DELETE /nominas/{id}/terceros/{tercero}/operarios/{op}/descuentos/{descuento}`

Elimina un descuento de la línea del operario. Recalcula `subtotal` y `total_a_transferir`. Requiere `nomina.liquidar`.

Sin body. `{descuento}` es el `id` de la fila en `nomina_tercero_operario_descuento`.

**Response 200:** acta completa actualizada.

Errores:
- `409 NOMINA_CERRADA`
- `422 OPERARIO_NO_PERTENECE_A_TERCERO`
- `404 DESCUENTO_NO_ENCONTRADO` — el descuento no existe o no pertenece a este operario.
- `404 ACTA_NO_CALCULADA`

### 7.7 Registrar pago — `POST /nominas/{id}/terceros/{tercero}/registrar-pago`

Marca el acta como `PAGADO` y persiste los datos del giro. Requiere permiso **`nomina.pagar-tercero`** (nuevo en PR-4).

**Request (todos los campos son opcionales — body vacío `{}` es válido):**
```jsonc
{
  "metodo_pago": "TRANSFERENCIA",       // opcional: TRANSFERENCIA | EFECTIVO | CHEQUE; null si omitido
  "referencia_pago": "TX20260731-0042", // opcional
  "orden_pago_numero": "OP-2026-155",   // opcional
  "pagado_at": "2026-07-31T14:30:00Z",  // opcional, default = now()
  "observacion": "Transferencia confirmada por banco"
}
```

**Excepción documentada — cierre inmutable:** este endpoint sigue habilitado incluso cuando `nomina.estado=CERRADA`. Es la única mutación permitida sobre una nómina cerrada. Motivo: el usuario cierra el período contablemente antes de coordinar la transferencia bancaria; el pago se registra en cuanto el tesorero confirme.

**Sin validación de datos bancarios:** el endpoint NUNCA revisa los datos bancarios del tercero. Cualquier combinación de body es aceptada — incluido `metodo_pago=TRANSFERENCIA` con el tercero sin bancarios cargados. La responsabilidad de confirmar que la transferencia sea viable queda en el operador que registra el pago.

Errores adicionales:
- `409 ACTA_TERCERO_YA_PAGADA` — el acta ya está en `PAGADO`.
- `403 PERMISSION_DENIED` — falta `nomina.pagar-tercero`.

### 7.8 PDF del acta — `GET /nominas/{id}/terceros/{tercero}/acta/pdf`

PDF descargable con el detalle del acta. Requiere `nomina.ver`. Template: `resources/views/desprendible/acta_tercero.blade.php`. Contiene:

- Cabecera: contratista (nombre + identificación + representante + contacto) y período.
- Tabla de operarios: nombre, cédula, cargo, labores realizadas, **Jornales**, **Cosecha**, **Subtotal**.
- Filas de descuentos en resalte bajo cada operario cuando `descuentos` no está vacío (concepto + valor).
- Total a transferir destacado.
- Líneas de firma "Recibí conforme (Contratista)" y "Autoriza (Finca)".

Filename: `acta_tercero_{nit|cedula|id}_{anio}_{mes}[_Q{n}].pdf`.

### 7.9 Diagrama de estados

```
       ┌── agregar operarios (§3.4) ──▶ PENDIENTE (totales 0)
START ─┘                                     │
                                             │ ─── liquidar (§7.3) ──▶ PENDIENTE (totales calculados)
                                             │                                │
                                             │                                │ ─── registrar-pago (§7.5) ──▶ PAGADO
                                             │                                │
                                             │ ◀── ajustar operario (§7.4) ───┘  (permitido en PENDIENTE)
                                             │
                                        (post-cierre)
                                             │
                                             └── registrar-pago (§7.5) ──▶ PAGADO
                                                 (única excepción a "CERRADA = inmutable")
```

| Acción | PENDIENTE + nómina BORRADOR | PENDIENTE + nómina CERRADA | PAGADO |
|---|---|---|---|
| `POST /liquidar` | ✅ (recalcula) | ❌ `NOMINA_CERRADA` | ❌ `NOMINA_CERRADA` |
| `GET /operarios/{op}/detalle` (§7.4) | ✅ | ✅ | ✅ |
| `POST /operarios/{op}/descuentos` (§7.5) | ✅ | ❌ `NOMINA_CERRADA` | ❌ `NOMINA_CERRADA` |
| `DELETE /operarios/{op}/descuentos/{d}` (§7.6) | ✅ | ❌ `NOMINA_CERRADA` | ❌ `NOMINA_CERRADA` |
| `POST /registrar-pago` (§7.7) | ✅ | ✅ (excepción) | ❌ `ACTA_TERCERO_YA_PAGADA` |
| `GET /acta/pdf` (§7.8) | ✅ | ✅ | ✅ |
| `DELETE /nominas/{id}/terceros/{tercero}` (§3.5) | ✅ (si operarios PENDIENTES) | ❌ `NOMINA_CERRADA` | ❌ `NOMINA_CERRADA` |

---

## 8. Catálogo de Conceptos

### 8.1 Listar

`GET /nomina-conceptos` — query params: `tipo` (filtrar por APORTE_LEGAL, DEDUCCION_LEGAL, DEDUCCION_VOLUNTARIA, BONIFICACION_FIJA, BONIFICACION_VARIABLE), `activo` (true/false).

Cada concepto incluye los porcentajes y la vigencia directamente:

```json
{
  "data": [
    {
      "id": 1, "codigo": "SALUD", "nombre": "Salud",
      "tipo": "APORTE_LEGAL", "subtipo": "SALUD",
      "operacion": "RESTA", "calculo": "PORCENTAJE",
      "valor_referencia": "4.0000", "base_calculo": "TOTAL_DEVENGADO",
      "aplica_a": "AMBOS", "es_obligatorio": true, "activo": true,
      "porcentaje_empleado": "4.00", "porcentaje_empresa": "8.50",
      "vigente_desde": "2022-12-31", "vigente_hasta": null,
      "afecta_salario_minimo": false, "tipo_remuneracion": "REMUNERADO"
    }
  ]
}
```

> **Tipo `APORTE_LEGAL`** (nuevo) representa conceptos con aporte de empleado **y** empresa: SALUD, PENSION, ARL. Usa los dos porcentajes. `DEDUCCION_LEGAL` queda reservado para descuentos solo al empleado (FSP, RETEFUENTE, EMBARGO).

### 8.2 Select para el editor de liquidación

`GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA&aplica_a=FIJO`

Devuelve solo conceptos `activo=true`, livianos para dropdown (incluye `porcentaje_empleado`/`porcentaje_empresa` para que la UI pueda mostrar el porcentaje aplicable como hint):

```json
{
  "data": [
    { "id": 17, "codigo": "DCTO_ADELANTO", "nombre": "Descuento Adelantos / Préstamo",
      "tipo": "DEDUCCION_VOLUNTARIA", "subtipo": "PRESTAMO", "operacion": "RESTA",
      "calculo": "VALOR_FIJO", "aplica_a": "AMBOS",
      "porcentaje_empleado": null, "porcentaje_empresa": null },
    { "id": 18, "codigo": "AHORRO", "nombre": "Ahorro Voluntario",
      "tipo": "DEDUCCION_VOLUNTARIA", "subtipo": "AHORRO_VOLUNTARIO", "operacion": "RESTA",
      "calculo": "VALOR_FIJO", "aplica_a": "AMBOS",
      "porcentaje_empleado": null, "porcentaje_empresa": null }
  ]
}
```

`aplica_a` filtra por modalidad (FIJO/VARIABLE) e incluye automáticamente los AMBOS.

### 8.3 CRUD admin

`POST /nomina-conceptos`, `PUT /nomina-conceptos/{id}`, `DELETE /nomina-conceptos/{id}` — requieren `nomina-conceptos.gestionar`. La eliminación se bloquea si el concepto está en uso (`CONCEPTO_EN_USO`) o es obligatorio (`CONCEPTO_OBLIGATORIO`).

**Request (`POST` — ejemplo de un nuevo aporte legal):**
```json
{
  "codigo": "PARAFISCAL",
  "nombre": "Parafiscal SENA/ICBF",
  "tipo": "APORTE_LEGAL",
  "subtipo": "OTRO",
  "operacion": "RESTA",
  "calculo": "PORCENTAJE",
  "base_calculo": "TOTAL_DEVENGADO",
  "aplica_a": "AMBOS",
  "porcentaje_empleado": 0,
  "porcentaje_empresa": 9,
  "vigente_desde": "01/01/2026",
  "vigente_hasta": null,
  "afecta_salario_minimo": false,
  "tipo_remuneracion": "REMUNERADO"
}
```

> `vigente_desde` / `vigente_hasta` aceptan tanto `dd/mm/yyyy` como `yyyy-mm-dd`. El FormRequest normaliza el formato `d/m/Y` a `Y-m-d` en `prepareForValidation()`.

**Reglas condicionales:**
- Si `tipo ∈ {APORTE_LEGAL, DEDUCCION_LEGAL}` **y** `calculo = PORCENTAJE`, entonces `porcentaje_empleado` y `vigente_desde` son requeridos.
- `porcentaje_empleado` y `porcentaje_empresa` aceptan rango 0–100.
- `vigente_hasta` debe ser ≥ `vigente_desde` cuando se envía.

> La validación vive en `StoreNominaConceptoRequest` y `UpdateNominaConceptoRequest` (FormRequests). El `authorize()` valida el permiso `nomina-conceptos.gestionar` — un usuario sin él recibe 403 antes de cualquier consulta.
>
> **Campos editables vía PUT** (los demás son inmutables tras crear): `nombre`, `valor_referencia`, `base_calculo`, `aplica_a`, `es_obligatorio`, `activo`, `porcentaje_empleado`, `porcentaje_empresa`, `vigente_desde`, `vigente_hasta`, `afecta_salario_minimo`, `tipo_remuneracion`. `codigo`, `tipo`, `subtipo`, `operacion` y `calculo` solo se pueden definir al crear — para cambiarlos hay que eliminar el concepto y crear uno nuevo.

### 8.4 Catálogo sembrado por defecto

`NominaConceptoSeeder` crea **24 conceptos por tenant**, idempotente con `updateOrCreate(tenant_id, codigo)`.

Cuando se crea un tenant nuevo vía `POST /api/admin/tenants`, el controlador llama a `NominaConceptoSeeder::sembrarParaTenant($tenant, soloActivos: true)` — eso siembra **solo los 9 conceptos activos** (SALUD, PENSION, ARL, FSP_1..FSP_6). El resto del catálogo (plantilla inactiva) se aprovisiona vía `migrate:fresh --seed` para tenants existentes, o el admin los crea bajo demanda.

**Activos automáticos (9)** — los aplica el motor sin intervención y se siembran al crear cada tenant:

| Código | Nombre | Tipo | % empleado | % empresa | Notas |
|---|---|---|---|---|---|
| `SALUD` | Salud | APORTE_LEGAL | 4% | 8.5% | Obligatorio |
| `PENSION` | Pensión | APORTE_LEGAL | 4% | 12% | Obligatorio |
| `ARL` | ARL | APORTE_LEGAL | 0% | 0.522% | Riesgo I (típico — el tenant ajusta según clasificación) |
| `FSP_1` | FSP (>4 SMLV) | DEDUCCION_LEGAL | 1.0% | 0% | Solo si IBC > 4 SMLV |
| `FSP_2` | FSP (>16 SMLV) | DEDUCCION_LEGAL | 1.2% | 0% | Solo si IBC > 16 SMLV |
| `FSP_3` | FSP (>17 SMLV) | DEDUCCION_LEGAL | 1.4% | 0% | Solo si IBC > 17 SMLV |
| `FSP_4` | FSP (>18 SMLV) | DEDUCCION_LEGAL | 1.6% | 0% | Solo si IBC > 18 SMLV |
| `FSP_5` | FSP (>19 SMLV) | DEDUCCION_LEGAL | 1.8% | 0% | Solo si IBC > 19 SMLV |
| `FSP_6` | FSP (>20 SMLV) | DEDUCCION_LEGAL | 2.0% | 0% | Solo si IBC > 20 SMLV |

> Los 6 niveles del Fondo de Solidaridad Pensional (Ley 100/1993 art. 27, modif. Ley 797/2003) se siembran activos pero el motor aplica **uno solo**, según el tramo del IBC mensualizado.

**Plantilla precargada (15)** — `activo=false` por defecto, sin porcentajes/vigencia cargados; el admin las activa y configura desde Configuración → Nómina. Tres de ellas (`DCTO_ADELANTO`, `AHORRO`, `BONIFICACION`) vienen `activo=true` porque la UI las usa directamente.

| Código | Tipo | Subtipo |
|---|---|---|
| `RETEFUENTE` | DEDUCCION_LEGAL | OTRO |
| `EMBARGO` | DEDUCCION_LEGAL | EMBARGO |
| `LIBRANZA` | DEDUCCION_VOLUNTARIA | LIBRANZA |
| `CUOTA_SINDICAL` | DEDUCCION_VOLUNTARIA | OTRO |
| `AFC` | DEDUCCION_VOLUNTARIA | OTRO |
| `PENSION_VOL` | DEDUCCION_VOLUNTARIA | OTRO |
| `DCTO_ADELANTO` ★ | DEDUCCION_VOLUNTARIA | PRESTAMO |
| `AHORRO` ★ | DEDUCCION_VOLUNTARIA | AHORRO_VOLUNTARIO |
| `AUX_ALIMENTACION` | BONIFICACION_FIJA | ALIMENTACION |
| `BON_PRODUCTIVIDAD` | BONIFICACION_VARIABLE | PRODUCTIVIDAD |
| `BON_ANTIGUEDAD` | BONIFICACION_FIJA | ANTIGUEDAD |
| `COMISIONES` | BONIFICACION_VARIABLE | OTRO |
| `PRIMA_EXTRALEGAL` | BONIFICACION_VARIABLE | OTRO |
| `AUX_EDUCATIVO` | BONIFICACION_FIJA | OTRO |
| `BONIFICACION` ★ | BONIFICACION_VARIABLE | OTRO |

★ = activo por defecto (lo usa la UI).

---

## 9. Reglas de cálculo (normatividad colombiana)

Todas implementadas en `App\Services\Nomina\NominaCalculationService`. Configurables por tenant en `tenant_config` (ver [API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md)).

### 9.1 Días trabajados

| Modalidad | Cálculo |
|---|---|
| **FIJO** | `dias_periodo - dias_ausencia_no_remunerada` |
| **VARIABLE** | `count(distinct DATE(operacion.fecha))` con jornales del empleado en el rango |

`dias_periodo` = 15 (quincenal) o 30 (mensual).

### 9.2 Devengado

**FIJO:**
```
devengado = salario_base × (dias_trabajados / dias_periodo)
          + total_incapacidades_remuneradas
          + total_horas_extra
          + total_recargos
```

**VARIABLE:**
```
devengado = Σ jornales.valor_total
          + Σ cosecha_cuadrilla.valor_calculado
          + total_incapacidades_remuneradas
          + total_horas_extra
          + total_recargos
```

> Solo se incluyen jornales/cosechas de operaciones con `estado=APROBADA`.

### 9.3 Subsidio de transporte

Aplica si `salario_base ≤ 2 × salario_minimo_vigente`. Monto:
```
subsidio = tenant_config.auxilio_transporte × (dias_trabajados / dias_periodo)
```
Persiste como columna directa `nomina_empleado.subsidio_transporte`. **No** es concepto y **no** suma al IBC.

### 9.4 Salud y Pensión

**Base de cálculo (IBC):** `total_devengado` excluyendo subsidio de transporte (no es salario).

**Topes:** mínimo 1 SMLV proporcional al período, máximo 25 SMLV proporcional.

```
ibc = clamp(total_devengado, 1 × smlv_periodo, 25 × smlv_periodo)
salud   = ibc × (porcentaje_salud   / 100)
pension = ibc × (porcentaje_pension / 100)
```

**Origen del porcentaje:** el motor lee `nomina_concepto.porcentaje_empleado` directamente. Si la columna está NULL (concepto recién creado sin porcentaje, o de tipo VALOR_FIJO), cae a `nomina_concepto.valor_referencia` como fallback (típicamente 4% para SALUD/PENSION sembrado por `NominaConceptoSeeder`).

> **Configura los porcentajes y la vigencia** vía `PUT /nomina-conceptos/{id}` (campos `porcentaje_empleado`, `porcentaje_empresa`, `vigente_desde`, `vigente_hasta` — ver §7 de este doc). Mientras el porcentaje esté NULL el cálculo cae al `valor_referencia` sembrado y la nómina sigue funcionando.

### 9.5 Fondo de Solidaridad Pensional (FSP)

Solo si `IBC mensualizado > 4 SMLV`. Tramos según IBC en SMLV mensualizado:

| IBC mensual | % | Concepto |
|---|---|---|
| 4–16 SMLV | 1.0% | `FSP_1` |
| 16–17 SMLV | 1.2% | `FSP_2` |
| 17–18 SMLV | 1.4% | `FSP_3` |
| 18–19 SMLV | 1.6% | `FSP_4` |
| 19–20 SMLV | 1.8% | `FSP_5` |
| > 20 SMLV | 2.0% | `FSP_6` |

El motor aplica **un único tramo** (el más alto que cumpla la condición).

### 9.6 Ausencias (ya documentadas en CONTEXTO §6.9)

| Tipo | Modalidad | Efecto |
|---|---|---|
| `PERMISO_NO_REMUNERADO`, `AUSENCIA_INJUSTIFICADA`, `SUSPENSION_DISCIPLINARIA` | FIJO | Descuenta `(salario/30) × días × (1 − %pago/100)` |
| `INCAPACIDAD_EPS` días 1–2 | FIJO | 100% del salario diario × días |
| `INCAPACIDAD_EPS` días 3+ | FIJO | 66.67% del salario diario × días (la EPS reembolsa el resto) |
| `INCAPACIDAD_ARL`, licencias remuneradas, calamidad | FIJO | `valor_dia × días × %pago/100` (típicamente 100%) |
| Cualquier no remunerada | VARIABLE | No descuenta (no había salario fijo); solo tracking |
| `INCAPACIDAD_*` / licencias | VARIABLE | Suma a `total_incapacidades` |

### 9.7 Horas extras y recargos

Ya snapshotteados en `horas_extra.valor_calculado` (boot logic de `App\Models\HoraExtra`). El service de nómina solo agrega los registros APROBADOS del rango, separándolos en dos columnas:

- `total_horas_extra` ← horas con `tipo_hora_extra.es_extra = true` (HED, HEN, HEDF, HENF).
- `total_recargos` ← recargos con `es_extra = false` (RN, HRD, RND).

La separación es necesaria para reportes legales (UGPP/DIAN): solo las horas extras suman a la base de prestaciones sociales (cesantías, prima, vacaciones).

### 9.8 Operarios de terceros — conceptos NO aplicables

Los operarios de terceros incluidos en una nómina **no** son sujeto de:
- §8.3 Subsidio de transporte
- §8.4 Salud y Pensión
- §8.5 Fondo de Solidaridad Pensional (FSP)

Su devengado = Σ jornales APROBADOS + valor cosecha (gajos × promedio × precio). `total_neto = total_devengado` (sin ninguna deducción legal).

Su liquidación completa con tarifa por labor, acta y registro de pago al contratista se realiza en el flujo de PR-4 (`POST /nominas/{id}/terceros/{tercero}/liquidar`).

---

## 10. Estados y transiciones

### 10.1 Nómina

```
       ┌──── crear ────▶ BORRADOR ──── cerrar ────▶ CERRADA (inmutable)
START ─┘
```

| Acción | BORRADOR | CERRADA |
|---|---|---|
| `PUT /nominas/{id}` | ✅ (si sin liquidados) | ❌ `NOMINA_CERRADA` |
| `DELETE /nominas/{id}` | ✅ (si sin liquidados) | ❌ |
| `POST /nominas/{id}/empleados` | ✅ | ❌ |
| `POST /nominas/{id}/cerrar` | ✅ (si todos LIQUIDADOS) | ❌ |
| `GET .../desprendible/*` | ✅ (si empleado LIQUIDADO) | ✅ |

### 10.2 NominaEmpleado

```
       ┌──── agregar ──▶ PENDIENTE ──── liquidar ────▶ LIQUIDADO
START ─┘                      │
                              └── re-liquidar ◀──── (si nómina BORRADOR)
```

| Acción | PENDIENTE | LIQUIDADO |
|---|---|---|
| `POST /liquidar` | ✅ | ❌ (usar `PUT /liquidacion` para re-liquidar) |
| `PUT /liquidacion` | ✅ | ✅ (solo si nómina BORRADOR) |
| `DELETE /nomina-empleado/{id}` | ✅ | ❌ `EMPLEADO_LIQUIDADO` |
| `GET /desprendible` | ❌ `EMPLEADO_NO_LIQUIDADO` | ✅ |

---

## 11. Snapshots (al cerrar la nómina)

Una nómina CERRADA debe ser reproducible años después aunque la BD cambie. Por eso al cerrar se persisten las siguientes referencias:

| Tabla | Qué guarda | Por qué |
|---|---|---|
| `nomina_jornal_ref` | (jornal_id, valor_snapshot) | Si alguien edita el jornal después, la nómina vieja conserva el valor. |
| `nomina_cosecha_ref` | (cosecha_cuadrilla_id, valor_snapshot, promedio_promedios_snapshot) | Idem para la cuadrilla de cosecha. `promedio_promedios_snapshot` usa `nomina_promedio_lote.promedio_efectivo` si existe, o el AVG de `promedio_lote` en el período. |
| `nomina_hora_extra_ref` | (hora_extra_id, valor_snapshot) | Idem para horas extras. |
| `nomina_promedio_lote` | (nomina_id, lote_id, promedio_auto, promedio_manual, promedio_efectivo) | Override manual del admin para el promedio de un lote, discriminado por nómina. Tiene prioridad sobre el AVG de `promedio_lote` en todos los cálculos de pago y de cierre. |
| `nomina_empleado.cargo_snapshot` | string | Si el empleado cambia de cargo, el desprendible histórico sigue diciendo el cargo correcto. |
| `nomina_empleado.predio_snapshot` | string | Idem para la "FINCA" del desprendible. |
| `nomina_empleado.salario_minimo_snapshot` | decimal | Permite recalcular topes legales con el SMLV vigente al momento. |
| `ausencias.nomina_id` + `ausencias.estado=LIQUIDADA` | FK + flag | Bloquea la edición de ausencias ya liquidadas. |
| `horas_extra.nomina_id` + `horas_extra.estado=LIQUIDADA` | FK + flag | Idem para horas extras. |

Estas tablas nunca se rellenan durante el editor de liquidación: se crean **solo al cerrar la nómina**, en una sola transacción dentro de `CerrarNominaService`.

---

## 12. Flujo de ejemplo completo (cURL)

```bash
TOKEN="eyJ..."
TENANT="1"
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json")

# 1. Crear nómina QUINCENAL (1ª quincena de mayo 2026)
curl -X POST "$BASE/nominas" "${H[@]}" -d '{
  "mes": 5, "anio": 2026, "periodicidad": "QUINCENAL", "quincena": 1
}'
# → 201 { "data": { "id": 12, "fecha_inicio": "2026-05-01", "fecha_fin": "2026-05-15", "estado": "BORRADOR" } }

# 2. Listar empleados disponibles
curl "$BASE/nominas/12/empleados-disponibles" "${H[@]}"
# → { "data": [ { "id": 5, "nombre_completo": "...", "modalidad_pago": "FIJO", "salario_base": 1500000 } ] }

# 3. Agregar 3 empleados
curl -X POST "$BASE/nominas/12/empleados" "${H[@]}" -d '{
  "empleado_ids": [5, 10, 11]
}'

# 4. (Paso 3) Verificar cosechas vs extractora
curl "$BASE/nominas/12/validar-cosecha" "${H[@]}"
# → { "data": { "total_kg_colaboradores": 3330, "total_kg_extractora": 3330, "diferencia_kg": 0,
#               "promedios_por_lote": [...], "detalle_por_colaborador": [{..., "cosechas": [...]}] } }

# 4a. Ajustar promedio de un lote y refrescar bundle
curl -X PUT "$BASE/nominas/12/promedios-lote/3" "${H[@]}" -d '{ "promedio": 18.50 }'
# → { "data": { "lote_id": 3, "promedio_auto": 14.53, "promedio_manual": 18.50, "promedio_efectivo": 18.50 } }
curl "$BASE/nominas/12/validar-cosecha" "${H[@]}"
# → diferencia_kg actualizada con el nuevo promedio_efectivo

# 4b. Confirmar validación de cosecha (requerido antes de cerrar si hay cosechas)
curl -X POST "$BASE/nominas/12/validar-cosecha/confirmar" "${H[@]}"

# 5. Preview del cálculo del empleado #5 (FIJO)
curl "$BASE/nomina-empleado/45/preview" "${H[@]}"
# → muestra devengado, deducciones legales propuestas, neto

# 6. Liquidar empleado #5
curl -X POST "$BASE/nomina-empleado/45/liquidar" "${H[@]}" -d '{
  "dias_trabajados": 15,
  "bonificaciones": [],
  "deducciones_voluntarias": []
}'

# 6a. Para empleado VARIABLE: ver resumen de trabajo antes de liquidar
curl "$BASE/nomina-empleado/46/resumen-trabajo" "${H[@]}"
# → tablas de cosecha/plateo/poda/sanidad agrupadas

# 6b. Liquidar empleado VARIABLE con un descuento de adelanto
curl -X POST "$BASE/nomina-empleado/46/liquidar" "${H[@]}" -d '{
  "deducciones_voluntarias": [
    { "concepto_id": 17, "valor": 50000, "observacion": "Adelanto del 1 de mayo" }
  ]
}'

# 7. Cerrar nómina (todos los empleados liquidados)
curl -X POST "$BASE/nominas/12/cerrar" "${H[@]}"
# → 200 { "data": { "estado": "CERRADA", "cerrada_at": "..." } }

# 8. Descargar desprendible PDF del empleado #5
curl "$BASE/nomina-empleado/45/desprendible/pdf" "${H[@]}" -o desprendible_maria.pdf

# 9. Generar URL para WhatsApp
curl -X POST "$BASE/nomina-empleado/45/desprendible/whatsapp" "${H[@]}"
# → { "data": { "url": "https://...", "expires_at": "..." } }

# 10. Ver indicadores (opcionalmente filtrados)
curl "$BASE/nominas/indicadores" "${H[@]}"
curl "$BASE/nominas/indicadores?anio=2026&mes=7" "${H[@]}"
# → { "data": { "total_periodos": 1, "borradores": 0, "cerradas": 1,
#              "total_colaboradores": 3300000, "total_terceros": 875000,
#              "neto_pagar": 4175000, "pendiente_pagar": 0,
#              "total_devengado": 4175000 }, "meta": { "filtros": {"anio":2026,"mes":7} } }
```

---

## 13. Recomendaciones de implementación frontend

- **Re-fetch del preview**: cuando el operador edita "Días trabajados" en el editor de liquidación, vuelve a llamar `GET /preview` (o re-calcula localmente con la fórmula). Esto mantiene el "Total Neto" actualizado en vivo.
- **Re-liquidación**: si el operador cierra el modal de liquidación sin guardar y luego vuelve a abrirlo de un empleado ya LIQUIDADO, carga `GET /desprendible` (no `/preview`) para mostrar lo que se guardó. Si quiere modificar, usa `PUT /liquidacion`.
- **Cards superiores del detalle de nómina**: tras cada `POST /liquidar`, recarga `GET /nominas/{id}` para que los totales sumen lo recién liquidado.
- **Bloqueo de UI por estado**:
  - Si `nomina.estado=CERRADA`: oculta botones de editar/liquidar/eliminar; deja solo "Ver" y "Descargar PDF".
  - Si `empleado.estado=LIQUIDADO` y nómina BORRADOR: muestra "Re-liquidar" + "Ver desprendible".
- **Subsidio de transporte**: no es editable. El editor lo muestra como readonly en "Devengado" cuando aplica.
- **Concepto BONIFICACION genérico**: la UI permite múltiples bonificaciones libres. Backend las consolida bajo el código `BONIFICACION` con `observacion` distinta por fila.
- **Errores 409 con `code`**: usa el campo `code` (no `message`) para discriminar el caso y mostrar mensaje contextual al usuario.
- **Ajuste de promedio en Paso 3**: después de `PUT /promedios-lote/{lote}`, el frontend debe hacer una segunda llamada a `GET /validar-cosecha` para refrescar la tabla de diferencias, los totales y el array `promedios_por_lote`. El PUT solo devuelve el registro guardado; la vista actualizada requiere el GET. Este patrón de dos llamadas mantiene la respuesta del PUT liviana y evita recalcular el bundle completo en cada escritura.
- **`promedio_lote` es de solo lectura**: la tabla `promedio_lote` ya no es escribible desde el wizard de nómina. Solo `ViajeCalculationService` escribe en ella al finalizar viajes. Los ajustes manuales del admin van exclusivamente a `nomina_promedio_lote` (una por nómina × lote). Esto garantiza que los promedios históricos de viajes no se contaminen con overrides puntuales de nóminas.

---

## 14. Referencias cruzadas

- Configuración del tenant relevante a nómina (SMLV, auxilio de transporte, divisor de jornada, y `tipo_pago_nomina` como **default informativo del front**): [docs/API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md). El endpoint `POST /nominas` ya no lee `tipo_pago_nomina` — el frontend envía `periodicidad` explícitamente en el body.
- Ausencias (estados, snapshot al motivo, `nomina_id` al liquidar): [docs/API_AUSENCIAS.md](./API_AUSENCIAS.md).
- Horas extras (los 7 códigos legales colombianos, fórmula de `valor_calculado` con snapshot): [docs/API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).
- Cómo se generan los jornales y cosechas que alimentan la base VARIABLE: [docs/API_OPERACIONES.md](./API_OPERACIONES.md).
- Modelo de datos del módulo (qué tablas, qué FKs, snapshots): [docs/CONTEXTO.md §6.6, §6.9, §6.13](./CONTEXTO.md).

---

## 14. Pantalla "Configuración → Nómina" (índice cruzado)

El frontend agrupa **7 sub-secciones** bajo una sola pantalla `Configuración → Nómina`. Todas reutilizan endpoints ya existentes — no hay un endpoint "raíz" propio del sub-módulo.

| # | Sección del mockup | Endpoint(s) | Doc |
|---|---|---|---|
| 1 | Periodicidad de la Nómina + Fechas de Corte | `GET/PUT /configuracion/nomina` (`tipo_pago_nomina`) | [API_PARAMETRICAS §8](./API_PARAMETRICAS.md) |
| 2 | Jornada Laboral Semanal (48h derivado de `divisor_jornada_mensual / 5`) | `GET/PUT /configuracion/nomina` (`divisor_jornada_mensual`) | [API_PARAMETRICAS §8](./API_PARAMETRICAS.md) |
| 3 | Precios de Cosecha (lote × año × $/kg) | `GET/POST/PUT/DELETE /precios-cosecha` | [API_PARAMETRICAS §9](./API_PARAMETRICAS.md) |
| 4 | Rangos de Abonada (gramos × $/palma) | `GET/POST/PUT/DELETE /precios-abono` | [API_PARAMETRICAS §3](./API_PARAMETRICAS.md) |
| 5 | Labores de Palma (Cosecha / Plateo / Poda / Fertilización / Sanidad fijas + custom) y Labores de Finca (custom). Cada labor con `tipo_pago` y `precio_palma` | `GET/POST/PUT/DELETE /labores`, `GET /labores/select?categoria=...` | [API_PARAMETRICAS §4](./API_PARAMETRICAS.md) |
| 6 | Conceptos de Nómina (deducciones + bonificaciones) | `GET/POST/PUT/DELETE /nomina-conceptos` | §7 de este doc |
| 7 | Tipos de Horas Extras | `GET/POST/PUT/DELETE /tipos-hora-extra` | [API_PARAMETRICAS §11](./API_PARAMETRICAS.md) |
| 8 | Tipos de Novedades (motivos de ausencia, con `color`) | `GET/POST/PUT/DELETE /motivos-ausencia` | [API_AUSENCIAS §1](./API_AUSENCIAS.md) |
| 9 | Préstamos a colaboradores | `GET/POST/PUT/DELETE /prestamos` | §15 de este doc / [API_PRESTAMOS.md](./API_PRESTAMOS.md) |

### Notas para el frontend

- **"Control de Plagas" = `SANIDAD`** — es solo el label que el mockup pone sobre el `tipo` del backend. Las 5 labores fijas (COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD) son inmutables en estructura: solo se editan `tipo_pago`, `precio_palma` y `estado` vía `PUT /labores/{id}`. No se borran ni se renombran. Las labores **custom de palma o de finca** sí se crean / editan / eliminan libremente con el mismo endpoint `/labores`.
- **Jornada Laboral Semanal**: input del mockup = `divisor / 5`. Al guardar, frontend envía `divisor_jornada_mensual` (48h → 240, 42h → 210).
- **Fechas de Corte de quincena**: configurables vía `PUT /configuracion/nomina` (campos `dia_inicio_q1`, `dia_fin_q1`, `dia_inicio_q2`, `dia_fin_q2`). Defaults `1/15/16/31`. El motor `Nomina::calcularRangoFechas` los lee al crear cada nómina nueva. **Las nóminas ya creadas conservan su rango original** (no se recalculan). Si los días se solapan, el endpoint devuelve `422 CORTE_QUINCENA_INVALIDO`.
- **Permisos**: todos los endpoints del sub-módulo requieren `configuracion.editar`, excepto el CRUD de Conceptos de Nómina que requiere `nomina-conceptos.gestionar`.

---

## 15. Préstamos a colaboradores

> Documento completo: [API_PRESTAMOS.md](./API_PRESTAMOS.md)

Módulo independiente accesible desde el botón **"Préstamos"** de la pantalla de Pagos/Nómina. Registra adelantos y préstamos a colaboradores internos (solo `Empleado`, nunca operarios de terceros). Los préstamos generan un calendario de cuotas quincenales que aparecen en el **preview de liquidación** del colaborador (§5.1 `prestamos_pendientes[]`). El liquidador decide en cada quincena si aplica o no el descuento.

### Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/prestamos/indicadores` | `nomina.ver` | 2 cards: préstamos vigentes + saldo total |
| `GET` | `/prestamos` | `nomina.ver` | Listado con filtros `?empleado_id`, `?estado`, `?anio` |
| `POST` | `/prestamos` | `nomina.editar` | Crear préstamo + generar cuotas |
| `GET` | `/prestamos/{id}` | `nomina.ver` | Detalle con calendario de cuotas |
| `PUT` | `/prestamos/{id}` | `nomina.editar` | Editar (limitado si hay cuotas aplicadas) |
| `DELETE` | `/prestamos/{id}` | `nomina.editar` | Cancelar (soft-delete) |

### Request `POST /prestamos`

```json
{
  "empleado_id": 5,
  "concepto": "Préstamo personal",
  "valor_total": 1500000,
  "num_cuotas": 10,
  "inicio_anio": 2026,
  "inicio_mes": 1,
  "inicio_quincena": 1,
  "observaciones": "Aprobado por gerencia"
}
```

- `cuota_valor` se calcula automáticamente: `floor(valor_total / num_cuotas)`. La última cuota absorbe el residuo del redondeo.
- Si `cuotas_pagadas > 0`, solo se pueden editar `concepto` y `observaciones` (422 `PRESTAMO_NO_EDITABLE` si intenta cambiar campos financieros).

### Errores específicos

| Código | HTTP | Cuándo |
|--------|------|--------|
| `PRESTAMO_NO_EDITABLE` | 422 | Intento de cambiar `valor_total`/`num_cuotas` con cuotas ya aplicadas |
| `PRESTAMO_CUOTA_NO_PENDIENTE` | 422 | `prestamo_cuota_id` en liquidación referencia cuota ya APLICADA |
| `PRESTAMO_CUOTA_EMPLEADO_MISMATCH` | 422 | La cuota no pertenece al empleado que se liquida |

### Flujo integrado con liquidación

1. `GET /nomina-empleado/{id}/preview` devuelve `prestamos_pendientes[]` si hay cuotas para ese período
2. El liquidador incluye la cuota como deducción en `POST /liquidar`:
   ```json
   { "deducciones_voluntarias": [{ "concepto_id": 17, "valor": 150000, "prestamo_cuota_id": 42 }] }
   ```
3. El backend marca la cuota `APLICADA`, actualiza `saldo_pendiente` y `cuotas_pagadas` del préstamo
4. Cuando `cuotas_pagadas == num_cuotas`, el préstamo pasa a `estado=PAGADO` automáticamente
