# API — Dashboard Tenant

Documentación del endpoint de **Dashboard** para la app de finca (vista
principal del usuario tenant). Devuelve en una sola respuesta los cuatro
bloques que pinta la pantalla:

1. Indicadores principales (producción total + promedio kg/gajo).
2. Promedio kg por lote.
3. Viajes finalizados (gráfico de barras).
4. Lluvias (precipitaciones).

Todos los datos están aislados automáticamente por tenant (multi-tenancy
basado en `tenant_id`).

---

## `GET /api/v1/tenant/dashboard`

### Headers

| Header          | Valor                | Requerido |
|-----------------|----------------------|-----------|
| Authorization   | `Bearer {jwt}`       | Sí        |
| X-Tenant-Id     | `{tenant_id}`        | Sí        |
| Accept          | `application/json`   | Sí        |

### Permiso requerido

`dashboard.ver` — el rol **ADMIN** ya lo tiene asignado por defecto.
Para cualquier otro usuario debe asignarse explícitamente.

### Query params

| Param           | Tipo         | Default    | Descripción |
|-----------------|--------------|------------|-------------|
| `periodo`       | string       | `semanal`  | Uno de: `semanal`, `quincenal`, `mensual`, `personalizado` |
| `fecha_inicio`  | `YYYY-MM-DD` | —          | **Requerido** si `periodo=personalizado` |
| `fecha_fin`     | `YYYY-MM-DD` | —          | **Requerido** si `periodo=personalizado`. Debe ser `>= fecha_inicio` |

### Resolución de los presets

| `periodo`         | Rango calculado por el backend |
|-------------------|--------------------------------|
| `semanal`         | Semana actual (lunes a domingo) |
| `quincenal`       | Últimos 15 días terminando hoy |
| `mensual`         | Mes actual (día 1 al último día) |
| `personalizado`   | Usa los `fecha_inicio` y `fecha_fin` enviados |

### Ejemplos de request

```bash
# Tab "Semanal"
GET /api/v1/tenant/dashboard?periodo=semanal

# Tab "Quincenal"
GET /api/v1/tenant/dashboard?periodo=quincenal

# Tab "Mensual"
GET /api/v1/tenant/dashboard?periodo=mensual

# Selector personalizado
GET /api/v1/tenant/dashboard?periodo=personalizado&fecha_inicio=2026-04-01&fecha_fin=2026-04-26
```

### Respuesta `200 OK`

```json
{
  "data": {
    "periodo": {
      "fecha_inicio": "2026-04-20",
      "fecha_fin":    "2026-04-26"
    },
    "indicadores": {
      "produccion_total_kg": 17320.00,
      "promedio_kg_gajo":    0.131
    },
    "lotes": [
      { "id": 1, "codigo": "L-001", "nombre": "Lote Norte A", "kg_promedio": 194.0  },
      { "id": 2, "codigo": "L-002", "nombre": "Lote Sur B",   "kg_promedio": 174.7  },
      { "id": 3, "codigo": "L-003", "nombre": "Lote Este C",  "kg_promedio": 134.5  },
      { "id": 4, "codigo": "L-004", "nombre": "Lote Oeste D", "kg_promedio": 165.0  }
    ],
    "viajes": [
      { "id": 45, "remision": "V-001", "peso_viaje": 4500.00, "fecha_viaje": "2026-04-22" },
      { "id": 46, "remision": "V-002", "peso_viaje": 3800.00, "fecha_viaje": "2026-04-23" },
      { "id": 47, "remision": "V-003", "peso_viaje": 4150.00, "fecha_viaje": "2026-04-24" },
      { "id": 48, "remision": "V-004", "peso_viaje": 3700.00, "fecha_viaje": "2026-04-25" }
    ],
    "lluvias": {
      "semana_actual_mm":              145.0,
      "semana_anterior_mm":            182.0,
      "mes_actual_mm":                 520.0,
      "promedio_mensual_historico_mm": 485.0
    }
  }
}
```

### Estructura del objeto `data`

#### `periodo`
| Campo          | Tipo         | Descripción |
|----------------|--------------|-------------|
| `fecha_inicio` | `YYYY-MM-DD` | Fecha inicial efectiva del rango (resuelta del preset o tomada del input) |
| `fecha_fin`    | `YYYY-MM-DD` | Fecha final efectiva del rango |

#### `indicadores`
| Campo                  | Tipo   | Descripción |
|------------------------|--------|-------------|
| `produccion_total_kg`  | number | Suma de `peso_confirmado` de todas las cosechas aprobadas en el rango (kg) |
| `promedio_kg_gajo`     | number | `SUM(peso_confirmado) / SUM(gajos)` global de la plantación en el rango. Toma `gajos_reconteo` si está, si no `gajos_reportados`. `0` si no hay producción |

#### `lotes` (array)
| Campo          | Tipo   | Descripción |
|----------------|--------|-------------|
| `id`           | int    | Identificador real del lote |
| `codigo`       | string | Código UI generado: `L-001`, `L-002`, … (padding a 3 dígitos del id) |
| `nombre`       | string | Nombre del lote (ej. "Lote Norte A") |
| `kg_promedio`  | number | Promedio kg/gajo del lote en el rango. `0` si no hubo producción aprobada |

> Se devuelven **todos los lotes activos** del tenant. Los lotes sin
> producción en el rango aparecen con `kg_promedio: 0`.

#### `viajes` (array)
| Campo          | Tipo         | Descripción |
|----------------|--------------|-------------|
| `id`           | int          | Identificador del viaje |
| `remision`     | string       | Número de remisión (ej. "V-001") |
| `peso_viaje`   | number       | Peso registrado en planta (kg) |
| `fecha_viaje`  | `YYYY-MM-DD` | Fecha del viaje |

> Solo se incluyen viajes con `estado = FINALIZADO` dentro del rango.

#### `lluvias`
| Campo                            | Tipo   | Descripción |
|----------------------------------|--------|-------------|
| `semana_actual_mm`               | number | mm acumulados en la semana actual (lunes a domingo) |
| `semana_anterior_mm`             | number | mm acumulados en la semana inmediatamente anterior |
| `mes_actual_mm`                  | number | mm acumulados en el mes actual (día 1 al último día) |
| `promedio_mensual_historico_mm`  | number | Promedio mensual histórico (`AVG` de la sumatoria por mes), excluyendo el mes actual |

> El bloque `lluvias` **NO** depende del filtro de fechas. Siempre devuelve
> los 4 valores tal cual.

### Códigos de error

| Código | Cuándo |
|--------|--------|
| `401`  | JWT inválido o ausente |
| `403`  | Usuario sin permiso `dashboard.ver` o sin acceso al tenant |
| `422`  | Validación: fechas inválidas, formato incorrecto, falta `fecha_inicio`/`fecha_fin` cuando `periodo=personalizado`, `fecha_fin < fecha_inicio` |
| `500`  | Error interno (incluye campo `error` con detalle) |

#### Ejemplos de respuesta de error

**422 — falta de fechas:**
```json
{
  "message": "The fecha inicio field is required when periodo is personalizado.",
  "errors": {
    "fecha_inicio": ["La fecha de inicio es obligatoria cuando el periodo es personalizado."],
    "fecha_fin":    ["La fecha de fin es obligatoria cuando el periodo es personalizado."]
  }
}
```

**500 — error interno:**
```json
{
  "message": "Error al cargar el dashboard",
  "error":   "SQLSTATE[...]"
}
```

### Reglas de negocio aplicadas

1. **Producción y promedios** cuentan únicamente cosechas activas
   (`registro_cosecha.estado = true`) cuya operación está en estado
   `APROBADA`. Las operaciones en `BORRADOR` se excluyen del cálculo.
2. **Viajes** se filtran por `estado = FINALIZADO`. Otros estados
   (`CREADO`, `EN_CAMINO`, `EN_PLANTA`) no aparecen.
3. **Lotes sin producción** en el rango aparecen igualmente con
   `kg_promedio: 0`.
4. **Lluvias** son fijas (semana / mes / histórico) — no responden al
   filtro del frontend.
5. El campo `lotes[].codigo` se genera dinámicamente a partir del `id`
   (`L-001`, `L-002`, …). Es **solo para UI**: usá `id` como clave o
   identificador real.

### Notas para el frontend

- Los tabs **Semanal / Quincenal / Mensual** envían
  `?periodo=semanal|quincenal|mensual` SIN fechas.
- El selector custom envía
  `?periodo=personalizado&fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`.
- El default cuando no se envía `periodo` es `semanal`.
- El campo `produccion_total_kg` ya viene en kg con 2 decimales —
  formatear con separador de miles en UI.
- `promedio_kg_gajo` viene con 3 decimales para no perder precisión en
  cifras pequeñas (ej. `0.131`).
- El gráfico de barras de **Viajes** debe usar `remision` como label en X
  y `peso_viaje` como valor.
