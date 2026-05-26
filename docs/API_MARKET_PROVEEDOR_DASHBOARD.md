# API Market — Dashboard del Proveedor

Endpoint del portal B2B de AGRO CAMPO para el lado **proveedor**.
Entrega en una sola llamada todos los datos necesarios para renderizar la pantalla principal
del proveedor: KPIs, pedidos recientes y productos más vendidos.

---

## 1. Autenticación y Headers requeridos

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

> **No se requiere `X-Tenant-Id`.**
> El proveedor se infiere automáticamente de los claims `proveedor_id` y `proveedor_role`
> del JWT (inyectados por el middleware `SetProveedor`).

### Flujo de obtención del token de proveedor

```
POST /api/v1/proveedor-auth/login
  → si el usuario pertenece a 1 proveedor: retorna token listo con claims
  → si pertenece a varios: retorna lista y el cliente debe llamar a:

POST /api/v1/proveedor-auth/select-proveedor   { "proveedor_id": 1 }
  → retorna token con claims proveedor_id + proveedor_role
```

---

## 2. Endpoint

```
GET /api/v1/market/proveedor/dashboard
```

---

## 3. Respuesta 200

```json
{
  "data": {
    "indicadores": {
      "productos_activos": 22,
      "productos_total": 24,
      "pedidos_pendientes": 8,
      "pedidos_en_proceso": 5,
      "pedidos_completados_mes": 47,
      "ventas_mes_actual": 4800000.00,
      "ventas_mes_anterior": 4158000.00,
      "variacion_ventas_porcentaje": 15.5
    },
    "pedidos_recientes": [
      {
        "id": 1,
        "codigo": "PED-001",
        "estado": "pendiente",
        "total": "1185000.00",
        "fecha_pedido": "2026-04-15T08:30:00.000000Z",
        "tenant": {
          "id": 1,
          "nombre": "Finca La Esperanza"
        },
        "primer_producto": {
          "nombre": "Fertilizante NPK 15-15-15",
          "cantidad": 20,
          "unidad": "BLT"
        }
      }
    ],
    "productos_mas_vendidos": [
      {
        "id": 1,
        "nombre": "Fertilizante NPK 15-15-15",
        "imagen_principal": "/assets/images/products/FERT-001.jpg",
        "unidades_vendidas": 156,
        "ingresos_acumulados": 14800000.00
      }
    ]
  }
}
```

---

## 4. Descripción de cada sección

### 4.1 `indicadores`

KPIs calculados en tiempo real para el proveedor autenticado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `productos_activos` | integer | Productos con `estado = 'activo'` |
| `productos_total` | integer | Total de productos (activos + inactivos) |
| `pedidos_pendientes` | integer | Pedidos en estado `pendiente` |
| `pedidos_en_proceso` | integer | Pedidos en `confirmado` + `preparando` + `en_transito` |
| `pedidos_completados_mes` | integer | Pedidos `entregado` en el mes calendario actual |
| `ventas_mes_actual` | float | Suma de `total` de pedidos no cancelados en el mes actual |
| `ventas_mes_anterior` | float | Suma de `total` de pedidos no cancelados en el mes anterior |
| `variacion_ventas_porcentaje` | float \| null | `((actual - anterior) / anterior) × 100` redondeado a 1 decimal. `null` si mes anterior = 0 |

**Cómo construir las cards del UI:**

```
Card "Productos Activos"
  → título:    indicadores.productos_activos
  → subtítulo: "de {indicadores.productos_total} totales"

Card "Pedidos Pendientes"
  → título:    indicadores.pedidos_pendientes
  → subtítulo: "{indicadores.pedidos_en_proceso} en proceso"

Card "Pedidos Completados"
  → título:    indicadores.pedidos_completados_mes
  → subtítulo: "este mes"

Card "Ventas del Mes"
  → título:    formatCurrency(indicadores.ventas_mes_actual)
  → subtítulo: "+{indicadores.variacion_ventas_porcentaje}% vs mes anterior"
               (usar color rojo si es negativo, verde si es positivo, gris si es null)
```

---

### 4.2 `pedidos_recientes`

Array de hasta **5 pedidos** más recientes ordenados por `fecha_pedido DESC`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID interno del pedido |
| `codigo` | string | Código legible, ej. `"PED-001"` |
| `estado` | string | Ver tabla de estados §6 |
| `total` | string | Total del pedido como decimal string, ej. `"1185000.00"` |
| `fecha_pedido` | string (ISO 8601) | Fecha y hora de creación del pedido |
| `tenant.id` | integer | ID de la finca compradora |
| `tenant.nombre` | string | Nombre de la finca, ej. `"Finca La Esperanza"` |
| `primer_producto.nombre` | string | Nombre del primer ítem del pedido (snapshot) |
| `primer_producto.cantidad` | integer | Cantidad pedida de ese ítem |
| `primer_producto.unidad` | string \| null | Abreviatura de la unidad de medida, ej. `"BLT"`, `"LT"` |

> Solo se incluye el **primer ítem** de cada pedido para la vista de lista.
> Para ver todos los ítems, llamar a `GET /api/v1/market/proveedor/pedidos/{id}` (endpoint de detalle).

---

### 4.3 `productos_mas_vendidos`

Array de hasta **5 productos** ordenados por `unidades_vendidas DESC`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID del producto |
| `nombre` | string | Nombre del producto |
| `imagen_principal` | string \| null | Ruta relativa, ej. `"/assets/images/products/FERT-001.jpg"`. `null` → mostrar placeholder |
| `unidades_vendidas` | integer | Total de unidades vendidas históricamente |
| `ingresos_acumulados` | float | Ingresos totales históricos en pesos colombianos |

**URL completa de imagen:**
```js
const url = producto.imagen_principal
  ? `${APP_URL}${producto.imagen_principal}`
  : null // mostrar placeholder SVG
```

---

## 5. Errores posibles

| HTTP | Descripción | Causa |
|------|-------------|-------|
| `401` | No autenticado | Token ausente o expirado |
| `403` | Proveedor inactivo | `market_proveedores.estado ≠ 'activo'` |
| `403` | Usuario inactivo en proveedor | `market_proveedor_user.estado = false` |
| `422` | Claims faltantes en el JWT | El token no tiene `proveedor_id`; llamar a `/select-proveedor` primero |
| `500` | Error interno | Error inesperado; reintentar |

---

## 6. Estados del pedido

| Estado | Label UI sugerido | Color |
|--------|------------------|-------|
| `pendiente` | Pendiente | Naranja |
| `confirmado` | Confirmado | Azul |
| `preparando` | En Preparación | Morado |
| `en_transito` | En Camino | Azul oscuro |
| `entregado` | Entregado / Completado | Verde |
| `cancelado` | Cancelado | Rojo |

> La card de UI "Pedidos Pendientes" agrupa `pedidos_pendientes` + `pedidos_en_proceso`.
> Mostrarlos por separado o juntos depende del diseño; el API los entrega desglosados.

---

## 7. Ejemplo de consumo (JavaScript / Axios)

```js
const response = await axios.get('/api/v1/market/proveedor/dashboard', {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
})

const { indicadores, pedidos_recientes, productos_mas_vendidos } = response.data.data

// Variación de ventas con signo
const variacion = indicadores.variacion_ventas_porcentaje
const variacionLabel = variacion === null
  ? 'Sin datos mes anterior'
  : `${variacion > 0 ? '+' : ''}${variacion}% vs mes anterior`
```

---

## 8. Notas de implementación

- Todos los KPIs se calculan en **una sola consulta SQL** al momento de la petición (sin caché).
  Si el volumen de datos crece mucho, considerar caché de 5 minutos con invalidación al actualizar pedidos.
- `ventas_mes_actual` / `ventas_mes_anterior` excluyen pedidos `cancelado`.
- `pedidos_completados_mes` usa `date_trunc('month', NOW())` en PostgreSQL para el corte mensual.
- `productos_mas_vendidos` se basa en el campo `unidades_vendidas` de `market_productos`,
  que se incrementa en el checkout al crear cada pedido.
