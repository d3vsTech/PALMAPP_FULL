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
| `PERMISSION_DENIED` | 403 | Usuario sin permiso para la acción. |

---

## 1. Flujo del wizard (4 pasos)

```
┌ Paso 1 — Crear nómina ────────────────────────────────┐
│  POST /nominas { mes, anio, periodicidad, quincena? } │  → BORRADOR. Devuelve { id, fecha_inicio, fecha_fin }
└────────────────────────────────────────────────────────┘
            │
┌ Paso 2 — Agregar empleados ───────────────────────────┐
│  GET  /nominas/{id}/empleados-disponibles            │  → empleados activos no incluidos
│  POST /nominas/{id}/empleados { empleado_ids: [...] } │  → crea NominaEmpleado en estado PENDIENTE
│  DELETE /nomina-empleado/{id}                         │  → quitar (solo PENDIENTE)
└───────────────────────────────────────────────────────┘
            │
┌ Paso 3 — Liquidar empleado por empleado ──────────────┐
│  GET /nomina-empleado/{id}/preview                    │  → cálculo propuesto (sin persistir)
│  GET /nomina-empleado/{id}/resumen-trabajo            │  → solo VARIABLE: planilla diaria agrupada
│  POST /nomina-empleado/{id}/liquidar { dias_trabajados, bonificaciones[], deducciones_voluntarias[] }
│  PUT  /nomina-empleado/{id}/liquidacion               │  → re-liquidar (mismo body)
│                                                        │
│  Estado del empleado pasa a LIQUIDADO. Cards superiores
│  de la nómina suman los totales acumulados.            │
└───────────────────────────────────────────────────────┘
            │
┌ Paso 4 — Cerrar nómina + desprendibles ───────────────┐
│  POST /nominas/{id}/cerrar                             │  → estado=CERRADA, snapshots, ausencias→LIQUIDADA
│                                                        │
│  GET  /nomina-empleado/{id}/desprendible               │  → JSON
│  GET  /nomina-empleado/{id}/desprendible/pdf           │  → PDF descargable (DomPDF)
│  POST /nomina-empleado/{id}/desprendible/whatsapp      │  → URL firmada (placeholder de WA Business API)
└───────────────────────────────────────────────────────┘
```

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

```json
{
  "data": {
    "total_periodos": 3,
    "borradores": 1,
    "cerradas": 2,
    "total_devengado": 55500000
  }
}
```

`total_devengado` solo suma nóminas CERRADAS.

### 2.4 Detalle

`GET /nominas/{id}` — incluye empleados con datos del empleado, modalidad, salario, estado y `liquidado_por`.

### 2.5 Editar / Eliminar

`PUT /nominas/{id}` — todos los campos opcionales. Bloqueado si CERRADA o si ya hay empleados LIQUIDADOS (recalcular el período corrompería los snapshots).

`DELETE /nominas/{id}` — solo si BORRADOR sin liquidados. Elimina también los `nomina_empleado` PENDIENTES.

---

## 3. Paso 2 — Agregar empleados

### 3.1 Empleados disponibles

`GET /nominas/{id}/empleados-disponibles`

Lista los empleados activos del tenant que **aún no** están en esta nómina. Payload listo para la tabla del mockup ("Nombre / Cargo / Modalidad / Valor base"):

```json
{
  "data": [
    {
      "id": 10,
      "nombre_completo": "Carlos Rodríguez García",
      "documento": "1098765432",
      "cargo": "Operario de palma",
      "modalidad_pago": "PRODUCCION",
      "salario_base": 1300000,
      "predio": { "id": 1, "nombre": "Puerto Arturo" }
    }
  ]
}
```

### 3.2 Agregar uno o varios

`POST /nominas/{id}/empleados`

```json
{ "empleado_ids": [10, 11, 12] }
```

Crea un `nomina_empleado` por empleado, en estado `PENDIENTE`, con:
- `salario_tipo` = `VARIABLE` si `empleado.modalidad_pago = PRODUCCION`, sino `FIJO`.
- `salario_base` snapshotteado del empleado.

Idempotente: si un empleado ya estaba en la nómina, lo omite (no hay error). Bloqueado si `NOMINA_CERRADA`.

**Respuesta 201:**
```json
{
  "message": "3 empleado(s) agregado(s) a la nómina",
  "data": [
    { "id": 45, "empleado_id": 10, "salario_tipo": "VARIABLE", "estado": "PENDIENTE" }
  ]
}
```

### 3.3 Quitar un empleado

`DELETE /nomina-empleado/{id}` — solo si está PENDIENTE y la nómina BORRADOR. Errores: 409 `NOMINA_CERRADA` / `EMPLEADO_LIQUIDADO`.

---

## 4. Paso 3 — Liquidar empleado

El editor de liquidación se abre cargando dos endpoints en paralelo:

### 4.1 Preview de cálculo

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
    }
  }
}
```

> **El `total_neto_propuesto` ya cuadra con el mockup de la UI:** $1.500.000 + $162.000 − ($60.000 + $60.000) = **$1.542.000**.

### 4.2 Resumen de trabajo (solo VARIABLE)

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

### 4.3 Confirmar liquidación

`POST /nomina-empleado/{id}/liquidar`

```json
{
  "dias_trabajados": 15,
  "bonificaciones": [
    { "nombre": "Productividad mes",   "valor": 200000 }
  ],
  "deducciones_voluntarias": [
    { "concepto_id": 17, "valor": 50000, "observacion": "Adelanto del 1 de mayo" },
    { "concepto_id": 18, "valor": 30000 }
  ]
}
```

Reglas:
- `dias_trabajados` es opcional; si no llega, el backend usa el calculado en el preview.
- `bonificaciones[]` libre: cada fila se persiste como `nomina_empleado_concepto` con el concepto `BONIFICACION` (genérico, sembrado por defecto). El campo `nombre`/`observacion` se guarda en `observacion` de la fila para mostrarlo en el desprendible.
- `deducciones_voluntarias[]` debe referenciar conceptos del catálogo (subtipo `PRESTAMO`, `AHORRO_VOLUNTARIO`, `LIBRANZA`, etc.). El frontend obtiene el dropdown desde `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA`.
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

## 5. Paso 4 — Cerrar nómina + desprendible

### 5.1 Cerrar nómina

`POST /nominas/{id}/cerrar`

Cierre transaccional. Requiere permiso `nomina.cerrar`. Acciones realizadas (todas en una sola transacción):

1. Valida que **todos los empleados** estén LIQUIDADOS. Si hay PENDIENTES → 409 `NOMINA_CON_PENDIENTES`.
2. Crea snapshots de los jornales del empleado en la tabla `nomina_jornal_ref` (con `valor_snapshot` = `jornales.valor_total` actual).
3. Crea snapshots de la cuadrilla de cosecha en `nomina_cosecha_ref`.
4. Marca cada `HoraExtra` APROBADA del rango como **LIQUIDADA** (estado + `nomina_id`) y crea snapshot en `nomina_hora_extra_ref`.
5. Marca cada `Ausencia` APROBADA del rango como **LIQUIDADA** (estado + `nomina_id`).
6. Recalcula los totales globales de la nómina sumando los empleados.
7. Cambia `nomina.estado=CERRADA`, setea `cerrada_por` y `cerrada_at`.

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

### 5.2 Desprendible — datos JSON

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
      ]
    },
    "resumen_trabajo": { "cosecha": { ... }, "poda": { ... }, ... }
  }
}
```

`resumen_trabajo` solo viene poblado para empleados VARIABLE (es null para FIJO).

### 5.3 Desprendible — PDF

`GET /nomina-empleado/{id}/desprendible/pdf`

Devuelve el PDF binario con `Content-Disposition: attachment; filename="desprendible_{cedula}_{anio}_{mes}_Q{n}.pdf"`. Generado con DomPDF a partir del template `resources/views/desprendible/nomina.blade.php`.

El PDF incluye, en orden:
1. Cabecera con FINCA, NOMBRE, CÉDULA, FECHA, PERÍODO, BASE (FIJO/VARIABLE), DÍAS CANCELADOS.
2. Para VARIABLE: tablas agrupadas de Cosecha, Plateo, Poda, Fertilización, Sanidad, Otros, Finca.
3. Sección **Devengado** (sueldo o jornales + horas extras + recargos + incapacidades + bonificaciones + total bruto + subsidio transporte).
4. Sección **Deducciones** (salud, pensión, FSP si aplica, deducciones voluntarias manuales).
5. **TOTAL NETO** destacado.
6. Líneas de firma (Recibido / Huella).

### 5.4 Desprendible — WhatsApp (placeholder)

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

## 6. Catálogo de Conceptos

### 6.1 Listar

`GET /nomina-conceptos` — query params: `tipo` (filtrar por DEDUCCION_LEGAL, DEDUCCION_VOLUNTARIA, BONIFICACION_FIJA, BONIFICACION_VARIABLE), `activo` (true/false).

### 6.2 Select para el editor de liquidación

`GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA&aplica_a=FIJO`

Devuelve solo conceptos `activo=true`, livianos para dropdown:

```json
{
  "data": [
    { "id": 17, "codigo": "DCTO_ADELANTO", "nombre": "Descuento Adelantos / Préstamo",
      "tipo": "DEDUCCION_VOLUNTARIA", "subtipo": "PRESTAMO", "operacion": "RESTA",
      "calculo": "VALOR_FIJO", "aplica_a": "AMBOS" },
    { "id": 18, "codigo": "AHORRO", "nombre": "Ahorro Voluntario",
      "tipo": "DEDUCCION_VOLUNTARIA", "subtipo": "AHORRO_VOLUNTARIO", "operacion": "RESTA",
      "calculo": "VALOR_FIJO", "aplica_a": "AMBOS" }
  ]
}
```

`aplica_a` filtra por modalidad (FIJO/VARIABLE) e incluye automáticamente los AMBOS.

### 6.3 CRUD admin

`POST /nomina-conceptos`, `PUT /nomina-conceptos/{id}`, `DELETE /nomina-conceptos/{id}` — requieren `nomina-conceptos.gestionar`. La eliminación se bloquea si el concepto está en uso (`CONCEPTO_EN_USO`) o es obligatorio (`CONCEPTO_OBLIGATORIO`).

### 6.4 Catálogo sembrado por defecto

`NominaConceptoSeeder` crea **23 conceptos por tenant**, idempotente con `updateOrCreate(tenant_id, codigo)`.

**Activos automáticos (8)** — los aplica el motor sin intervención:

| Código | Nombre | Tipo | % | Notas |
|---|---|---|---|---|
| `SALUD` | Descuento Salud | DEDUCCION_LEGAL | 4% | Obligatorio |
| `PENSION` | Descuento Pensión | DEDUCCION_LEGAL | 4% | Obligatorio |
| `FSP_1` | FSP (>4 SMLV) | DEDUCCION_LEGAL | 1.0% | Solo si IBC > 4 SMLV |
| `FSP_2` | FSP (>16 SMLV) | DEDUCCION_LEGAL | 1.2% | Solo si IBC > 16 SMLV |
| `FSP_3` | FSP (>17 SMLV) | DEDUCCION_LEGAL | 1.4% | Solo si IBC > 17 SMLV |
| `FSP_4` | FSP (>18 SMLV) | DEDUCCION_LEGAL | 1.6% | Solo si IBC > 18 SMLV |
| `FSP_5` | FSP (>19 SMLV) | DEDUCCION_LEGAL | 1.8% | Solo si IBC > 19 SMLV |
| `FSP_6` | FSP (>20 SMLV) | DEDUCCION_LEGAL | 2.0% | Solo si IBC > 20 SMLV |

> Los 6 niveles del Fondo de Solidaridad Pensional (Ley 100/1993 art. 27, modif. Ley 797/2003) se siembran activos pero el motor aplica **uno solo**, según el tramo del IBC mensualizado.

**Plantilla precargada (15)** — `activo=false` por defecto; el admin las activa y configura el `valor_referencia`. Tres de ellas (`DCTO_ADELANTO`, `AHORRO`, `BONIFICACION`) vienen `activo=true` porque la UI las usa directamente.

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

## 7. Reglas de cálculo (normatividad colombiana)

Todas implementadas en `App\Services\Nomina\NominaCalculationService`. Configurables por tenant en `tenant_config` (ver [API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md)).

### 7.1 Días trabajados

| Modalidad | Cálculo |
|---|---|
| **FIJO** | `dias_periodo - dias_ausencia_no_remunerada` |
| **VARIABLE** | `count(distinct DATE(operacion.fecha))` con jornales del empleado en el rango |

`dias_periodo` = 15 (quincenal) o 30 (mensual).

### 7.2 Devengado

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

### 7.3 Subsidio de transporte

Aplica si `salario_base ≤ 2 × salario_minimo_vigente`. Monto:
```
subsidio = tenant_config.auxilio_transporte × (dias_trabajados / dias_periodo)
```
Persiste como columna directa `nomina_empleado.subsidio_transporte`. **No** es concepto y **no** suma al IBC.

### 7.4 Salud y Pensión

**Base de cálculo (IBC):** `total_devengado` excluyendo subsidio de transporte (no es salario).

**Topes:** mínimo 1 SMLV proporcional al período, máximo 25 SMLV proporcional.

```
ibc = clamp(total_devengado, 1 × smlv_periodo, 25 × smlv_periodo)
salud   = ibc × (porcentaje_salud   / 100)
pension = ibc × (porcentaje_pension / 100)
```

**Origen del porcentaje:** el motor consulta `NominaTablaLegal` vigente en `fecha_fin` de la nómina para cada concepto (SALUD / PENSION). Si el tenant no tiene ninguna tabla configurada para ese concepto, usa `NominaConcepto.valor_referencia` como fallback (típicamente 4% sembrado por `NominaConceptoSeeder`).

> **Configura las tablas legales en** `PUT /configuracion/tablas-legales` (ver [API_PARAMETRICAS.md §15](./API_PARAMETRICAS.md)). Mientras no haya ningún registro vigente, el fallback garantiza que el cálculo funcione con el porcentaje del seeder.

### 7.5 Fondo de Solidaridad Pensional (FSP)

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

### 7.6 Ausencias (ya documentadas en CONTEXTO §6.9)

| Tipo | Modalidad | Efecto |
|---|---|---|
| `PERMISO_NO_REMUNERADO`, `AUSENCIA_INJUSTIFICADA`, `SUSPENSION_DISCIPLINARIA` | FIJO | Descuenta `(salario/30) × días × (1 − %pago/100)` |
| `INCAPACIDAD_EPS` días 1–2 | FIJO | 100% del salario diario × días |
| `INCAPACIDAD_EPS` días 3+ | FIJO | 66.67% del salario diario × días (la EPS reembolsa el resto) |
| `INCAPACIDAD_ARL`, licencias remuneradas, calamidad | FIJO | `valor_dia × días × %pago/100` (típicamente 100%) |
| Cualquier no remunerada | VARIABLE | No descuenta (no había salario fijo); solo tracking |
| `INCAPACIDAD_*` / licencias | VARIABLE | Suma a `total_incapacidades` |

### 7.7 Horas extras y recargos

Ya snapshotteados en `horas_extra.valor_calculado` (boot logic de `App\Models\HoraExtra`). El service de nómina solo agrega los registros APROBADOS del rango, separándolos en dos columnas:

- `total_horas_extra` ← horas con `tipo_hora_extra.es_extra = true` (HED, HEN, HEDF, HENF).
- `total_recargos` ← recargos con `es_extra = false` (RN, HRD, RND).

La separación es necesaria para reportes legales (UGPP/DIAN): solo las horas extras suman a la base de prestaciones sociales (cesantías, prima, vacaciones).

---

## 8. Estados y transiciones

### 8.1 Nómina

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

### 8.2 NominaEmpleado

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

## 9. Snapshots (al cerrar la nómina)

Una nómina CERRADA debe ser reproducible años después aunque la BD cambie. Por eso al cerrar se persisten las siguientes referencias:

| Tabla | Qué guarda | Por qué |
|---|---|---|
| `nomina_jornal_ref` | (jornal_id, valor_snapshot) | Si alguien edita el jornal después, la nómina vieja conserva el valor. |
| `nomina_cosecha_ref` | (cosecha_cuadrilla_id, valor_snapshot) | Idem para la cuadrilla de cosecha. |
| `nomina_hora_extra_ref` | (hora_extra_id, valor_snapshot) | Idem para horas extras. |
| `nomina_empleado.cargo_snapshot` | string | Si el empleado cambia de cargo, el desprendible histórico sigue diciendo el cargo correcto. |
| `nomina_empleado.predio_snapshot` | string | Idem para la "FINCA" del desprendible. |
| `nomina_empleado.salario_minimo_snapshot` | decimal | Permite recalcular topes legales con el SMLV vigente al momento. |
| `ausencias.nomina_id` + `ausencias.estado=LIQUIDADA` | FK + flag | Bloquea la edición de ausencias ya liquidadas. |
| `horas_extra.nomina_id` + `horas_extra.estado=LIQUIDADA` | FK + flag | Idem para horas extras. |

Estas tablas nunca se rellenan durante el editor de liquidación: se crean **solo al cerrar la nómina**, en una sola transacción dentro de `CerrarNominaService`.

---

## 10. Flujo de ejemplo completo (cURL)

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

# 4. Preview del cálculo del empleado #5 (FIJO)
curl "$BASE/nomina-empleado/45/preview" "${H[@]}"
# → muestra devengado, deducciones legales propuestas, neto

# 5. Liquidar empleado #5
curl -X POST "$BASE/nomina-empleado/45/liquidar" "${H[@]}" -d '{
  "dias_trabajados": 15,
  "bonificaciones": [],
  "deducciones_voluntarias": []
}'

# 5b. Para empleado VARIABLE: ver resumen de trabajo antes de liquidar
curl "$BASE/nomina-empleado/46/resumen-trabajo" "${H[@]}"
# → tablas de cosecha/plateo/poda/sanidad agrupadas

# 5c. Liquidar empleado VARIABLE con un descuento de adelanto
curl -X POST "$BASE/nomina-empleado/46/liquidar" "${H[@]}" -d '{
  "deducciones_voluntarias": [
    { "concepto_id": 17, "valor": 50000, "observacion": "Adelanto del 1 de mayo" }
  ]
}'

# 6. Cerrar nómina (todos los empleados liquidados)
curl -X POST "$BASE/nominas/12/cerrar" "${H[@]}"
# → 200 { "data": { "estado": "CERRADA", "cerrada_at": "..." } }

# 7. Descargar desprendible PDF del empleado #5
curl "$BASE/nomina-empleado/45/desprendible/pdf" "${H[@]}" -o desprendible_maria.pdf

# 8. Generar URL para WhatsApp
curl -X POST "$BASE/nomina-empleado/45/desprendible/whatsapp" "${H[@]}"
# → { "data": { "url": "https://...", "expires_at": "..." } }

# 9. Ver indicadores
curl "$BASE/nominas/indicadores" "${H[@]}"
# → { "data": { "total_periodos": 1, "borradores": 0, "cerradas": 1, "total_devengado": 5500000 } }
```

---

## 11. Recomendaciones de implementación frontend

- **Re-fetch del preview**: cuando el operador edita "Días trabajados" en el editor de liquidación, vuelve a llamar `GET /preview` (o re-calcula localmente con la fórmula). Esto mantiene el "Total Neto" actualizado en vivo.
- **Re-liquidación**: si el operador cierra el modal de liquidación sin guardar y luego vuelve a abrirlo de un empleado ya LIQUIDADO, carga `GET /desprendible` (no `/preview`) para mostrar lo que se guardó. Si quiere modificar, usa `PUT /liquidacion`.
- **Cards superiores del detalle de nómina**: tras cada `POST /liquidar`, recarga `GET /nominas/{id}` para que los totales sumen lo recién liquidado.
- **Bloqueo de UI por estado**:
  - Si `nomina.estado=CERRADA`: oculta botones de editar/liquidar/eliminar; deja solo "Ver" y "Descargar PDF".
  - Si `empleado.estado=LIQUIDADO` y nómina BORRADOR: muestra "Re-liquidar" + "Ver desprendible".
- **Subsidio de transporte**: no es editable. El editor lo muestra como readonly en "Devengado" cuando aplica.
- **Concepto BONIFICACION genérico**: la UI permite múltiples bonificaciones libres. Backend las consolida bajo el código `BONIFICACION` con `observacion` distinta por fila.
- **Errores 409 con `code`**: usa el campo `code` (no `message`) para discriminar el caso y mostrar mensaje contextual al usuario.

---

## 12. Referencias cruzadas

- Configuración del tenant relevante a nómina (SMLV, auxilio de transporte, divisor de jornada, y `tipo_pago_nomina` como **default informativo del front**): [docs/API_PARAMETRICAS.md §8](./API_PARAMETRICAS.md). El endpoint `POST /nominas` ya no lee `tipo_pago_nomina` — el frontend envía `periodicidad` explícitamente en el body.
- Ausencias (estados, snapshot al motivo, `nomina_id` al liquidar): [docs/API_AUSENCIAS.md](./API_AUSENCIAS.md).
- Horas extras (los 7 códigos legales colombianos, fórmula de `valor_calculado` con snapshot): [docs/API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).
- Cómo se generan los jornales y cosechas que alimentan la base VARIABLE: [docs/API_OPERACIONES.md](./API_OPERACIONES.md).
- Modelo de datos del módulo (qué tablas, qué FKs, snapshots): [docs/CONTEXTO.md §6.6, §6.9, §6.13](./CONTEXTO.md).
