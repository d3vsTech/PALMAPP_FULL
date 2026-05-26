# API Market — Estadísticas y Reportes del Proveedor

Endpoints del portal B2B de AGRO CAMPO para alimentar la pantalla
**"Estadísticas y Reportes"** del lado proveedor.

En **una sola llamada** entrega todos los datos para renderizar la pantalla:
KPIs comparados, evolución de ventas, productos más vendidos, mejores
clientes y métricas adicionales. Además, expone 3 endpoints adicionales
para descargar reportes en formato Excel.

---

## 1. Autenticación y Headers requeridos

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

> **No se requiere `X-Tenant-Id`.**
> El proveedor se infiere de los claims `proveedor_id` y `proveedor_role`
> del JWT (inyectados por el middleware `SetProveedor`).
>
> El flujo de obtención del token es el mismo del dashboard
> (ver [`API_MARKET_PROVEEDOR_DASHBOARD.md`](API_MARKET_PROVEEDOR_DASHBOARD.md) §1).

---

## 2. Endpoints

| Método | URL | Propósito |
|--------|-----|-----------|
| `GET` | `/api/v1/market/proveedor/estadisticas` | Payload completo de estadísticas |
| `GET` | `/api/v1/market/proveedor/reportes/ventas` | Descarga Excel: detalle de pedidos |
| `GET` | `/api/v1/market/proveedor/reportes/productos` | Descarga Excel: productos con métricas |
| `GET` | `/api/v1/market/proveedor/reportes/clientes` | Descarga Excel: clientes con métricas |

---

## 3. Filtros de periodo (compartidos por los 4 endpoints)

| Query param | Valores | Default |
|-------------|---------|---------|
| `periodo` | `ultimos_7_dias`, `ultimos_30_dias`, `ultimos_3_meses`, `ultimos_6_meses`, `este_anio`, `personalizado` | `ultimos_30_dias` |
| `fecha_desde` | `Y-m-d` | **requerido si** `periodo=personalizado` |
| `fecha_hasta` | `Y-m-d` (≥ `fecha_desde`) | **requerido si** `periodo=personalizado` |
| `formato` (solo reportes) | `excel` | `excel` |

### Cómputo del rango "anterior" (para comparativas)

El periodo anterior siempre tiene la **misma duración** que el actual y
termina el día **previo** al inicio del rango actual.

| Preset | Rango actual | Rango anterior |
|--------|--------------|----------------|
| `ultimos_7_dias`   | `[hoy-6, hoy]`     | `[hoy-13, hoy-7]`   |
| `ultimos_30_dias`  | `[hoy-29, hoy]`    | `[hoy-59, hoy-30]`  |
| `ultimos_3_meses`  | `[hoy-89, hoy]`    | `[hoy-179, hoy-90]` |
| `ultimos_6_meses`  | `[hoy-179, hoy]`   | `[hoy-359, hoy-180]`|
| `este_anio`        | `[1-ene-año, hoy]` | misma cantidad de días, terminando el día previo a `1-ene-año` |
| `personalizado`    | `[fecha_desde, fecha_hasta]` | misma cantidad de días, terminando el día previo a `fecha_desde` |

---

## 4. `GET /api/v1/market/proveedor/estadisticas`

### Respuesta 200

```json
{
  "data": {
    "periodo": {
      "preset": "ultimos_30_dias",
      "fecha_desde": "2026-04-21",
      "fecha_hasta": "2026-05-20",
      "fecha_desde_comparacion": "2026-03-22",
      "fecha_hasta_comparacion": "2026-04-20",
      "dias": 30
    },
    "kpis": {
      "ventas_totales":      { "actual": 12450000.00, "anterior": 11066667.00, "variacion_porcentaje": 12.5 },
      "pedidos_completados": { "actual": 47,          "anterior": 43,          "variacion_porcentaje": 8.2 },
      "productos_vendidos":  { "actual": 156,         "anterior": 161,         "variacion_porcentaje": -3.1 },
      "clientes_activos":    { "actual": 23,          "anterior": 20,          "variacion_porcentaje": 15.0 }
    },
    "evolucion_ventas": {
      "puntos": [
        { "mes": "2025-12", "label": "Dic", "total": 5200000.00 },
        { "mes": "2026-01", "label": "Ene", "total": 6800000.00 },
        { "mes": "2026-02", "label": "Feb", "total": 7100000.00 },
        { "mes": "2026-03", "label": "Mar", "total": 9300000.00 },
        { "mes": "2026-04", "label": "Abr", "total": 10800000.00 },
        { "mes": "2026-05", "label": "May", "total": 11900000.00 }
      ],
      "variacion_porcentaje_vs_6_meses": 128.8
    },
    "productos_mas_vendidos": [
      {
        "rank": 1,
        "producto_id": 42,
        "nombre": "Fertilizante NPK 15-15-15",
        "categoria": "Fertilizantes",
        "unidades_vendidas": 450,
        "ingresos": 4140000.00,
        "tendencia": "up"
      }
    ],
    "mejores_clientes": [
      {
        "rank": 1,
        "tenant_id": 7,
        "nombre": "Hacienda San Pedro",
        "total_pedidos": 12,
        "total_gastado": 5890000.00,
        "ultimo_pedido": "2026-04-11"
      }
    ],
    "metricas_adicionales": {
      "tasa_conversion_porcentaje": 78.5,
      "ticket_promedio": 264900.00,
      "productos_activos": 42
    }
  }
}
```

---

## 5. Descripción de cada sección

### 5.1 `periodo`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `preset` | string | Preset usado (incluye `ultimos_30_dias` por default si no se envió) |
| `fecha_desde` / `fecha_hasta` | string `Y-m-d` | Rango del periodo actual |
| `fecha_desde_comparacion` / `fecha_hasta_comparacion` | string `Y-m-d` | Rango usado para la comparativa |
| `dias` | integer | Cantidad de días que abarca el rango |

> Útil para mostrar el rango efectivo bajo el selector del UI
> (ej. "21 abr 2026 – 20 may 2026 · 30 días").

### 5.2 `kpis`

Cada KPI sigue el mismo shape:

```jsonc
{
  "actual": 12450000.00,
  "anterior": 11066667.00,
  "variacion_porcentaje": 12.5   // null si anterior == 0
}
```

| KPI | Definición |
|-----|-----------|
| `ventas_totales` | `SUM(market_pedidos.total)` de pedidos **no cancelados** en el rango |
| `pedidos_completados` | `COUNT(*)` de pedidos en estado `entregado` |
| `productos_vendidos` | `SUM(market_pedido_items.cantidad)` para pedidos no cancelados |
| `clientes_activos` | `COUNT(DISTINCT tenant_id)` de pedidos no cancelados |

**`variacion_porcentaje`** = `((actual - anterior) / anterior) × 100`, redondeado a 1 decimal.
**`null` cuando `anterior == 0`** (evita división por cero) → el frontend muestra "—" o "Sin datos previos".

**Reglas de color en UI (recomendación):**
- `variacion_porcentaje > 0` → verde + flecha ascendente
- `variacion_porcentaje < 0` → rojo + flecha descendente
- `variacion_porcentaje == 0` → gris neutro
- `variacion_porcentaje == null` → gris claro + texto "—"

### 5.3 `evolucion_ventas`

Datos para el gráfico de área "Evolución de Ventas".

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `puntos` | array | **Siempre 6 elementos** (meses vacíos rellenados con `total: 0`) |
| `puntos[].mes` | string `YYYY-MM` | Clave para sorting / cómputo |
| `puntos[].label` | string | Etiqueta corta en español: `Dic`, `Ene`, `Feb`, ... |
| `puntos[].total` | float | Suma de ventas no canceladas de ese mes |
| `variacion_porcentaje_vs_6_meses` | float \| null | `((último - primero) / primero) × 100`; `null` si el primer mes = 0 |

> Esta sección **NO depende del filtro `periodo`** — siempre devuelve los
> últimos 6 meses calendario (incluyendo el actual).

### 5.4 `productos_mas_vendidos`

Top **5 productos** del periodo actual, ordenados por `unidades_vendidas DESC`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rank` | integer | 1 a 5 |
| `producto_id` | integer | ID del producto |
| `nombre` | string | Nombre del producto |
| `categoria` | string \| null | Nombre de la categoría (puede ser null si el producto no tiene categoría asignada) |
| `unidades_vendidas` | integer | Total de unidades del periodo |
| `ingresos` | float | Suma de `subtotal` de ítems en el periodo |
| `tendencia` | string | `"up"` \| `"down"` \| `"flat"` — comparando unidades vs periodo anterior |

**Mapeo recomendado del icono de tendencia:**
- `up` → flecha ↗ verde
- `down` → flecha ↘ rojo
- `flat` → línea — gris

### 5.5 `mejores_clientes`

Top **4 clientes** del periodo actual, ordenados por `total_gastado DESC`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rank` | integer | 1 a 4 |
| `tenant_id` | integer | ID de la finca |
| `nombre` | string | Nombre de la finca |
| `total_pedidos` | integer | Cantidad de pedidos no cancelados en el rango |
| `total_gastado` | float | Suma de `total` de esos pedidos |
| `ultimo_pedido` | string `Y-m-d` \| null | Fecha del último pedido en el rango |

### 5.6 `metricas_adicionales`

| Campo | Tipo | Definición |
|-------|------|-----------|
| `tasa_conversion_porcentaje` | float \| null | `(pedidos_entregados / pedidos_creados) × 100` en el periodo. `null` si no hubo pedidos creados. |
| `ticket_promedio` | float | `AVG(market_pedidos.total)` de pedidos no cancelados en el periodo |
| `productos_activos` | integer | Count absoluto de productos con `estado = 'activo'` (no varía con el filtro de periodo) |

---

## 6. Reportes Excel

Los 3 endpoints `/reportes/*` aceptan los **mismos filtros** que
`/estadisticas` (`periodo`, `fecha_desde`, `fecha_hasta`) y responden con
un archivo binario `.xlsx`.

### Headers de respuesta

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Reporte-Ventas-2026-05-20.xlsx"
Cache-Control: no-cache, no-store, must-revalidate
```

### 6.1 `GET /api/v1/market/proveedor/reportes/ventas`

Detalle de pedidos del periodo: **una fila por item**.

| Columna | Descripción |
|---------|-------------|
| Código | Código del pedido (`PED-001`) |
| Cliente | Nombre del tenant comprador |
| Fecha | `dd/mm/yyyy` |
| Estado | Etiqueta human-friendly (`Entregado`, `En Preparación`, ...) |
| Producto | Nombre del producto (snapshot al momento del pedido) |
| Cantidad | Unidades del item |
| Precio Unit. | Precio aplicado al item |
| Subtotal Item | Subtotal de la línea |
| Total Pedido | Total del pedido completo (se repite por cada item) |

### 6.2 `GET /api/v1/market/proveedor/reportes/productos`

Productos del proveedor con métricas del periodo.

| Columna | Descripción |
|---------|-------------|
| SKU | SKU del producto (o `—`) |
| Nombre | Nombre del producto |
| Categoría | Categoría (o `—`) |
| Estado | `Activo` / `Inactivo` / `Agotado` |
| Stock | `stock_disponible` actual |
| Precio Unitario | Precio base actual |
| Unidades Vendidas | Suma de unidades en el periodo |
| Ingresos | Suma de subtotales de items en el periodo |

### 6.3 `GET /api/v1/market/proveedor/reportes/clientes`

Tenants compradores con métricas del periodo.

| Columna | Descripción |
|---------|-------------|
| Cliente | Nombre del tenant |
| NIT | NIT del tenant (o `—`) |
| Total Pedidos | Count de pedidos no cancelados en el rango |
| Total Gastado | Suma de `total` |
| Ticket Promedio | `AVG(total)` |
| Último Pedido | `dd/mm/yyyy` o `—` |

---

## 7. Errores posibles

| HTTP | Causa |
|------|-------|
| `401` | Token ausente o expirado |
| `403` | Proveedor inactivo (`market_proveedores.estado ≠ 'activo'`) o usuario sin acceso al proveedor (`market_proveedor_user.estado = false`) |
| `422` | Validación: `periodo` inválido, o `periodo=personalizado` sin `fecha_desde`/`fecha_hasta`, o `fecha_hasta < fecha_desde`. También `422` si el JWT no tiene claim `proveedor_id` (llamar a `/proveedor-auth/select-proveedor`) |
| `500` | Error interno; reintentar |

### Shape de error 422 (validación)

```json
{
  "message": "The given data was invalid",
  "errors": {
    "fecha_hasta": ["La fecha hasta debe ser igual o posterior a la fecha desde."]
  }
}
```

### Shape de error 500

```json
{
  "message": "Error al cargar las estadísticas"
}
```

Los reportes Excel devuelven adicionalmente un campo `error` con el mensaje técnico:

```json
{
  "message": "Error al exportar el reporte de ventas",
  "error": "..."
}
```

---

## 8. Ejemplos de consumo (JavaScript / Axios)

### Cargar estadísticas

```js
const { data } = await axios.get('/api/v1/market/proveedor/estadisticas', {
  params: { periodo: 'ultimos_30_dias' },
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
})

const { periodo, kpis, evolucion_ventas, productos_mas_vendidos,
        mejores_clientes, metricas_adicionales } = data.data

// Helpers de UI
const formatVariacion = (v) => v === null ? '—' : `${v > 0 ? '+' : ''}${v}%`
const colorVariacion  = (v) => v === null ? 'gris' : v > 0 ? 'verde' : v < 0 ? 'rojo' : 'gris'
```

### Rango personalizado

```js
const { data } = await axios.get('/api/v1/market/proveedor/estadisticas', {
  params: {
    periodo: 'personalizado',
    fecha_desde: '2026-01-01',
    fecha_hasta: '2026-03-31',
  },
  headers: { Authorization: `Bearer ${token}` },
})
```

### Descargar reporte Excel

```js
const res = await axios.get('/api/v1/market/proveedor/reportes/ventas', {
  params: { formato: 'excel', periodo: 'ultimos_30_dias' },
  headers: { Authorization: `Bearer ${token}` },
  responseType: 'blob',
})

const url = URL.createObjectURL(res.data)
const a = document.createElement('a')
a.href = url
a.download = `Reporte-Ventas-${new Date().toISOString().slice(0,10)}.xlsx`
a.click()
URL.revokeObjectURL(url)
```

---

## 9. Notas de implementación

- Todas las queries se calculan **en tiempo real** sin caché. Si en
  producción la latencia supera 500 ms, considerar cache-aside con TTL
  de 5 minutos y key `estadisticas:{proveedor_id}:{periodo}:{desde}:{hasta}`.
- Los KPIs y métricas adicionales **excluyen** pedidos en estado
  `cancelado` (excepto la tasa de conversión, que sí incluye creados
  totales en el denominador).
- `evolucion_ventas` siempre devuelve **exactamente 6 puntos**: los meses
  sin ventas se rellenan con `total: 0`.
- `productos_mas_vendidos.tendencia` se calcula comparando las unidades
  vendidas del producto en el periodo actual vs el anterior.
- `productos_activos` no varía con el filtro de periodo — es un count
  absoluto del catálogo.
