# API Préstamos — Módulo de Pagos/Nómina

Gestión de préstamos y adelantos otorgados **exclusivamente a colaboradores internos** (Empleados). Los operarios de terceros no pueden recibir préstamos a través de este módulo.

Los préstamos se descuentan durante la liquidación de nómina según la frecuencia configurada en el tenant (`tipo_pago_nomina`):
- **QUINCENAL**: descuento quincena a quincena; el liquidador decide en cada quincena si aplica o no la cuota.
- **MENSUAL**: descuento mes a mes; el liquidador decide en cada mes si aplica o no la cuota.

La frecuencia **no se envía en el body** del préstamo — se lee automáticamente de `TenantConfig`. El frontend obtiene `tipo_pago_nomina` y las fechas de quincena (`dia_inicio_q1`, `dia_fin_q1`, `dia_inicio_q2`, `dia_fin_q2`) desde `GET /configuracion/nomina`.

**Base URL:** `/api/v1/tenant/`

---

## 0. Tabla de errores específicos

| Código | HTTP | Cuándo |
|--------|------|--------|
| `PRESTAMO_NO_EDITABLE` | 422 | Intento de cambiar `valor_total`, `num_cuotas` o fechas de inicio cuando ya hay cuotas aplicadas |
| `PRESTAMO_CUOTA_NO_PENDIENTE` | 422 | `prestamo_cuota_id` en la liquidación referencia una cuota que ya fue APLICADA |
| `PRESTAMO_CUOTA_EMPLEADO_MISMATCH` | 422 | La cuota referenciada no pertenece al empleado que se está liquidando |
| `PRESTAMO_SOLO_COLABORADORES` | 422 | Intento de crear préstamo para un operario de tercero |
| `PERMISSION_DENIED` | 403 | Sin permiso `nomina.editar` o `nomina.ver` según el endpoint |

---

## 1. Indicadores

`GET /prestamos/indicadores`

**Permiso:** `nomina.ver`

Devuelve las 2 cards superiores de la pantalla "Préstamos".

**Respuesta 200:**
```json
{
  "data": {
    "prestamos_vigentes": 3,
    "saldo_total_pendiente": 2650000
  }
}
```

- `prestamos_vigentes`: count de préstamos con `estado=VIGENTE` del tenant.
- `saldo_total_pendiente`: suma de `saldo_pendiente` de todos los préstamos VIGENTES.

---

## 2. Listado

`GET /prestamos[?empleado_id=N][&estado=VIGENTE|CANCELADO|PAGADO][&anio=YYYY]`

**Permiso:** `nomina.ver`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "empleado": {
        "id": 5,
        "nombre_completo": "Carlos Rodríguez García",
        "documento": "1098765432",
        "cargo": "Operario de campo"
      },
      "concepto": "Préstamo personal",
      "frecuencia": "QUINCENAL",
      "valor_total": 1500000,
      "saldo_pendiente": 900000,
      "cuota_valor": 150000,
      "cuotas_pagadas": 4,
      "num_cuotas": 10,
      "avance": "4/10",
      "fecha_fin": "2026-09-30",
      "estado": "VIGENTE",
      "inicio_anio": 2026,
      "inicio_mes": 1,
      "inicio_quincena": 1,
      "observaciones": null,
      "created_at": "2026-01-05T08:30:00Z"
    }
  ]
}
```

> `frecuencia` refleja si el préstamo es `QUINCENAL` o `MENSUAL` (derivado de si `inicio_quincena` es nulo o no). `inicio_quincena` es `null` para préstamos MENSUAL.

**Estados posibles:**
- `VIGENTE` — préstamo activo con cuotas pendientes
- `CANCELADO` — cancelado manualmente (soft-delete); saldo en $0 en la UI
- `PAGADO` — todas las cuotas fueron aplicadas en liquidaciones de nómina

---

## 3. Detalle

`GET /prestamos/{id}`

**Permiso:** `nomina.ver`

Igual al listado pero incluye el calendario completo de cuotas:

```json
{
  "data": {
    "id": 1,
    "empleado": { "..." },
    "concepto": "Préstamo personal",
    "frecuencia": "QUINCENAL",
    "valor_total": 1500000,
    "saldo_pendiente": 900000,
    "cuota_valor": 150000,
    "cuotas_pagadas": 4,
    "num_cuotas": 10,
    "avance": "4/10",
    "fecha_fin": "2026-09-30",
    "estado": "VIGENTE",
    "inicio_anio": 2026,
    "inicio_mes": 1,
    "inicio_quincena": 1,
    "cuotas": [
      {
        "id": 41,
        "numero_cuota": 1,
        "anio": 2026, "mes": 1, "quincena": 1,
        "monto": 150000,
        "estado": "APLICADA",
        "aplicada_at": "2026-01-15T11:32:10Z"
      },
      {
        "id": 45,
        "numero_cuota": 5,
        "anio": 2026, "mes": 3, "quincena": 1,
        "monto": 150000,
        "estado": "PENDIENTE",
        "aplicada_at": null
      }
    ]
  }
}
```

> Para préstamos **MENSUAL**, `quincena` en cada cuota es `null`.

Las cuotas se ordenan por `numero_cuota`. El calendario se genera al crear el préstamo.

---

## 4. Crear préstamo

`POST /prestamos`

**Permiso:** `nomina.editar`

```json
{
  "empleado_id": 5,
  "concepto": "Préstamo personal",
  "valor_total": 1500000,
  "num_cuotas": 10,
  "inicio_anio": 2026,
  "inicio_mes": 1,
  "inicio_quincena": 1,
  "observaciones": "Aprobado por gerencia el 2026-01-05"
}
```

**Campos:**
| Campo | Tipo | Req | Descripción |
|-------|------|-----|-------------|
| `empleado_id` | integer | ✅ | ID de un Empleado (colaborador interno) del tenant |
| `concepto` | string(150) | ✅ | Descripción libre: "Préstamo personal", "Adelanto de nómina", etc. |
| `valor_total` | numeric | ✅ | Monto total del préstamo en COP |
| `num_cuotas` | integer 1–120 | ✅ | Número de períodos en que se descuenta |
| `inicio_anio` | integer | ✅ | Año del primer descuento (≥ 2020) |
| `inicio_mes` | integer 1–12 | ✅ | Mes del primer descuento |
| `inicio_quincena` | integer 1 ó 2 | ✅ si QUINCENAL / — si MENSUAL | Primera quincena (1–15) o segunda (16–fin). **Omitir para tenants MENSUAL.** |
| `observaciones` | string(500) | — | Notas internas |

> La frecuencia (`QUINCENAL`/`MENSUAL`) se lee de `TenantConfig.tipo_pago_nomina` — **no se envía en el body**.
> Las etiquetas de las quincenas (ej. "1ª quincena (1–15)") se obtienen de `GET /configuracion/nomina` → `dia_inicio_q1`, `dia_fin_q1`, `dia_inicio_q2`, `dia_fin_q2`.

**Lógica automática al crear:**
- `cuota_valor = floor(valor_total / num_cuotas)` (última cuota absorbe el residuo)
- Se generan `num_cuotas` filas en `prestamo_cuotas` con estado `PENDIENTE`:
  - **QUINCENAL**: fechas consecutivas por quincena; `quincena` = 1 ó 2
  - **MENSUAL**: fechas consecutivas por mes; `quincena` = `null`
- `saldo_pendiente = valor_total`, `cuotas_pagadas = 0`, `estado = VIGENTE`

**Respuesta 201:**
```json
{
  "message": "Préstamo registrado correctamente",
  "data": { "...mismo shape que listado..." }
}
```

---

## 5. Editar préstamo

`PUT /prestamos/{id}`

**Permiso:** `nomina.editar`

```json
{
  "concepto": "Préstamo personal actualizado",
  "observaciones": "Cambio aprobado"
}
```

**Restricción:** si `cuotas_pagadas > 0`, solo se permiten cambiar `concepto` y `observaciones`. Cualquier intento de cambiar `valor_total`, `num_cuotas`, `inicio_anio`, `inicio_mes` o `inicio_quincena` devuelve **422 `PRESTAMO_NO_EDITABLE`**.

Si `cuotas_pagadas === 0`, se permite editar todos los campos: el calendario se regenera borrando las cuotas anteriores y creando nuevas (respetando la frecuencia configurada en el tenant).

**Respuesta 200:**
```json
{
  "message": "Préstamo actualizado correctamente",
  "data": { "...mismo shape que listado..." }
}
```

---

## 6. Cancelar préstamo

`DELETE /prestamos/{id}`

**Permiso:** `nomina.editar`

Cambia `estado = CANCELADO` y aplica soft-delete. Las cuotas que quedaban `PENDIENTE` ya no aparecerán en los previews de liquidación futuros.

**Nota:** no se puede deshacer desde la API (solo desde base de datos). Un préstamo PAGADO no puede cancelarse (devuelve 422).

**Respuesta 200:**
```json
{ "message": "Préstamo cancelado correctamente" }
```

---

## 7. Integración con liquidación de nómina

### 7.1 Preview muestra cuotas pendientes

`GET /nomina-empleado/{id}/preview` (ver [API_NOMINA.md §5.1](./API_NOMINA.md))

Para colaboradores internos (no operarios), el response incluye:

```json
{
  "data": {
    "...campos de preview habituales...",
    "prestamos_pendientes": [
      {
        "prestamo_cuota_id": 45,
        "prestamo_id": 1,
        "concepto": "Préstamo personal",
        "numero_cuota": 5,
        "total_cuotas": 10,
        "monto": 150000,
        "saldo_restante_prestamo": 900000
      }
    ]
  }
}
```

`prestamos_pendientes` lista cuotas con `estado=PENDIENTE` cuyo período coincide con la nómina en curso:
- **QUINCENAL**: coincidencia por `(anio, mes, quincena)`
- **MENSUAL**: coincidencia por `(anio, mes)` — `quincena` es `null`

Array vacío si no hay cuotas pendientes para ese período.

### 7.2 Aplicar cuota en la liquidación

`POST /nomina-empleado/{id}/liquidar` (ver [API_NOMINA.md §5.3](./API_NOMINA.md))

Para aplicar una cuota de préstamo, incluirla en `deducciones_voluntarias` con el campo `prestamo_cuota_id`:

```json
{
  "deducciones_voluntarias": [
    {
      "concepto_id": 17,
      "valor": 150000,
      "observacion": "Cuota 5/10 - Préstamo personal",
      "prestamo_cuota_id": 45
    }
  ]
}
```

- `concepto_id: 17` corresponde al concepto `DCTO_ADELANTO` (subtipo `PRESTAMO`, sembrado por defecto)
- El backend: crea `nomina_empleado_concepto` → llama `PrestamoService::aplicarCuota()` → marca cuota APLICADA → decrementa `saldo_pendiente` → si `cuotas_pagadas == num_cuotas` → `estado = PAGADO`

**El liquidador puede omitir la cuota** simplemente no incluyendo el ítem en `deducciones_voluntarias`. La cuota permanece `PENDIENTE` y reaparecerá en el preview del siguiente período.

### 7.3 Diagrama de estados del préstamo

```
[VIGENTE] ──── cuotas_pagadas == num_cuotas ──→ [PAGADO]
    │
    └── DELETE /prestamos/{id} ──────────────→ [CANCELADO]
```

### 7.4 Diagrama de estados de prestamo_cuota

```
[PENDIENTE] ──── prestamo_cuota_id en liquidar ──→ [APLICADA]
```

> Las cuotas no tienen estado `OMITIDA`. Si el liquidador decide no descontar en un período, simplemente no envía `prestamo_cuota_id` y la cuota queda `PENDIENTE` para el siguiente período.

---

## 8. Configuración de frecuencia (frontend)

El frontend debe consultar `GET /configuracion/nomina` antes de renderizar el formulario de creación para:

1. Leer `tipo_pago_nomina` → mostrar la frecuencia como etiqueta de solo lectura (no editable)
2. Si `QUINCENAL`: mostrar selectores de año + mes + quincena. Las etiquetas de quincena se construyen con:
   - `dia_inicio_q1` / `dia_fin_q1` → "1ª quincena (1–15)"
   - `dia_inicio_q2` / `dia_fin_q2` → "2ª quincena (16–31)"
3. Si `MENSUAL`: mostrar solo selectores de año + mes (ocultar el selector de quincena)

---

## 9. CURL de ejemplo

```bash
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 1" -H "Content-Type: application/json")

# Configuración del tenant (frecuencia + fechas de quincena)
curl -s "$BASE/configuracion/nomina" "${H[@]}"

# Indicadores
curl -s "$BASE/prestamos/indicadores" "${H[@]}"

# Crear préstamo QUINCENAL (10 cuotas para empleado 5, desde Q1 enero 2026)
curl -s -X POST "$BASE/prestamos" "${H[@]}" -d '{
  "empleado_id": 5,
  "concepto": "Préstamo personal",
  "valor_total": 1500000,
  "num_cuotas": 10,
  "inicio_anio": 2026,
  "inicio_mes": 1,
  "inicio_quincena": 1
}'

# Crear préstamo MENSUAL (inicio_quincena se omite para tenants MENSUAL)
curl -s -X POST "$BASE/prestamos" "${H[@]}" -d '{
  "empleado_id": 5,
  "concepto": "Préstamo personal",
  "valor_total": 1500000,
  "num_cuotas": 10,
  "inicio_anio": 2026,
  "inicio_mes": 1
}'

# Preview del empleado (incluye prestamos_pendientes)
curl -s "$BASE/nomina-empleado/45/preview" "${H[@]}"

# Liquidar y aplicar cuota del préstamo
curl -s -X POST "$BASE/nomina-empleado/45/liquidar" "${H[@]}" -d '{
  "deducciones_voluntarias": [
    {
      "concepto_id": 17,
      "valor": 150000,
      "observacion": "Cuota 5/10",
      "prestamo_cuota_id": 45
    }
  ]
}'

# Cancelar préstamo
curl -s -X DELETE "$BASE/prestamos/1" "${H[@]}"
```
