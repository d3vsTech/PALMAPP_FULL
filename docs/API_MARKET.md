# API Market — Guía de Consumo para Frontend

Endpoints del módulo B2B de AGRO CAMPO para el lado **finca/tenant**.
Permite navegar el catálogo, gestionar el carrito y realizar/rastrear pedidos.

---

## 1. Autenticación y Headers requeridos

Todos los endpoints requieren:

```
Authorization: Bearer <jwt_token>
X-Tenant-Id: <tenant_id>
Content-Type: application/json
Accept: application/json
```

El módulo sólo está disponible si `tenant_config.modulo_market = true`.
Si no está habilitado la API retorna `403 MODULE_DISABLED`.

---

## 2. Base URL

```
/api/v1/tenant/market/
```

---

## 3. Catálogo

### 3.1 Listar categorías

```
GET /api/v1/tenant/market/categorias
```

Retorna categorías activas ordenadas por `orden`, con conteo de productos disponibles.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Fertilizantes",
      "slug": "fertilizantes",
      "icono": "leaf",
      "orden": 1,
      "productos_count": 4
    }
  ]
}
```

---

### 3.2 Listar productos

```
GET /api/v1/tenant/market/productos
```

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `categoria_id` | integer | Filtra por ID de categoría |
| `categoria_slug` | string | Filtra por slug de categoría (alternativo a `categoria_id`) |
| `buscar` | string | Busca en nombre y descripción |
| `ordenar` | string | `precio_asc` \| `precio_desc` |
| `destacados` | boolean | `true` muestra solo destacados |
| `page` | integer | Página (default 1) |

> **Card "Todas":** no enviar `categoria_id` ni `categoria_slug` → devuelve todos los productos.
> **Card categoría específica:** enviar `categoria_slug=fertilizantes` (o `categoria_id=1`).
> El slug de cada categoría está disponible en la respuesta de `GET /market/categorias`.

Solo aparecen productos con:
- `estado = activo`
- `stock_disponible > 0`
- `precio_unitario > 0`
- proveedor con `estado = activo`

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Fertilizante NPK 15-15-15",
      "descripcion": "Fertilizante completo para palma de aceite",
      "sku": "NPK-15-50KG",
      "imagen_principal": "/assets/images/products/FERT-001.jpg",
      "precio_unitario": "95000.00",
      "stock_disponible": 450,
      "stock_minimo": 50,
      "stock_bajo": false,
      "calificacion_promedio": "4.5",
      "total_resenas": 28,
      "destacado": true,
      "estado": "activo",
      "proveedor": { "id": 1, "nombre_empresa": "AgroInsumos del Valle" },
      "categoria": { "id": 1, "nombre": "Fertilizantes", "slug": "fertilizantes" },
      "unidad_medida": { "id": 1, "abreviatura": "BLT" },
      "precios_volumen": [
        { "cantidad_minima": 10, "precio_unidad": "92000.00", "activo": true },
        { "cantidad_minima": 50, "precio_unidad": "89000.00", "activo": true }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 2,
    "per_page": 12,
    "total": 22
  }
}
```

---

### 3.3 Detalle de producto

```
GET /api/v1/tenant/market/productos/{id}
```

Incluye galería de imágenes y especificaciones.

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "nombre": "Fertilizante NPK 15-15-15",
    "descripcion": "Fertilizante completo para palma de aceite",
    "especificaciones": null,
    "imagen_principal": "/assets/images/products/FERT-001.jpg",
    "precio_unitario": "175000.00",
    "stock_disponible": 1200,
    "stock_bajo": false,
    "calificacion_promedio": "4.70",
    "proveedor": {
      "id": 1,
      "nombre_empresa": "AgroInsumos del Valle",
      "ciudad": "Villavicencio",
      "calificacion_promedio": "4.7"
    },
    "categoria": { "id": 1, "nombre": "Fertilizantes", "slug": "fertilizantes" },
    "unidad_medida": { "id": 1, "codigo": "BLT", "nombre": "bulto", "abreviatura": "bulto" },
    "imagenes": [
      { "id": 1, "url": "/assets/images/products/FERT-001.jpg", "orden": 1, "alt_text": "KCL CLORURO DE POTASIO 0-0-60" }
    ],
    "precios_volumen": [
      { "cantidad_minima": 10, "precio_unidad": "92000.00", "activo": true },
      { "cantidad_minima": 50, "precio_unidad": "89000.00", "activo": true }
    ]
  }
}
```

**Error 404:**
```json
{ "message": "Producto no encontrado", "code": "PRODUCTO_NOT_FOUND" }
```

---

## 4. Carrito

El carrito es único por finca (creado automáticamente en el primer acceso).
El total se calcula en tiempo real aplicando precios por volumen.

### Flujo del carrito

```
GET  /carrito          → ver carrito actual (crea si no existe)
POST /carrito/items    → agregar/actualizar producto (SET cantidad)
PUT  /carrito/items/1  → cambiar cantidad de un ítem específico
DELETE /carrito/items/1→ eliminar un ítem
DELETE /carrito        → vaciar todo el carrito
```

---

### 4.1 Ver carrito

```
GET /api/v1/tenant/market/carrito
```

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "items": [
      {
        "id": 1,
        "producto": {
          "id": 1,
          "nombre": "Fertilizante NPK 15-15-15",
          "sku": "NPK-15-50KG",
          "imagen_principal": "/assets/images/products/FERT-001.jpg",
          "estado": "activo",
          "stock_disponible": 450,
          "stock_bajo": false,
          "unidad_medida": { "id": 1, "abreviatura": "BLT" },
          "proveedor": { "id": 1, "nombre_empresa": "AgroInsumos del Valle" },
          "precios_volumen": [
            { "cantidad_minima": 10, "precio_unidad": 92000 }
          ]
        },
        "cantidad": 10,
        "precio_unitario": 92000,
        "subtotal": 920000
      }
    ],
    "resumen": {
      "subtotal": 920000,
      "costo_envio": 0,
      "total": 920000,
      "cantidad_items": 1
    }
  }
}
```

> `precio_unitario` ya tiene aplicado el descuento por volumen según `cantidad`.
> El frontend puede mostrar el precio tachado comparando contra `producto.precio_unitario` base.

---

### 4.2 Agregar o actualizar ítem

```
POST /api/v1/tenant/market/carrito/items
```

**Body:**
```json
{
  "producto_id": 1,
  "cantidad": 10
}
```

> Si el producto ya está en el carrito, **reemplaza** la cantidad (no acumula).

**Respuesta 201:**
```json
{
  "message": "Producto agregado al carrito",
  "data": {
    "id": 1,
    "producto_id": 1,
    "cantidad": 10,
    "precio_unitario": 92000,
    "subtotal": 920000
  }
}
```

**Errores:**

| Code | HTTP | Descripción |
|------|------|-------------|
| `PRODUCTO_NO_ACTIVO` | 409 | El producto no está disponible |
| `PROVEEDOR_INACTIVO` | 409 | El proveedor del producto no está activo |
| `SIN_STOCK` | 409 | El producto no tiene stock disponible |
| `PRODUCTO_SIN_PRECIO` | 409 | El producto no tiene precio configurado |

---

### 4.3 Actualizar cantidad de un ítem

```
PUT /api/v1/tenant/market/carrito/items/{itemId}
```

**Body:**
```json
{ "cantidad": 5 }
```

**Respuesta 200:**
```json
{
  "message": "Cantidad actualizada",
  "data": {
    "id": 1,
    "cantidad": 5,
    "precio_unitario": 95000,
    "subtotal": 475000
  }
}
```

---

### 4.4 Eliminar ítem

```
DELETE /api/v1/tenant/market/carrito/items/{itemId}
```

**Respuesta 200:**
```json
{ "message": "Producto eliminado del carrito" }
```

---

### 4.5 Vaciar carrito

```
DELETE /api/v1/tenant/market/carrito
```

**Respuesta 200:**
```json
{ "message": "Carrito vaciado correctamente" }
```

---

## 5. Pedidos

### Flujo de checkout

```
POST /pedidos          → crear pedido(s) desde el carrito
GET  /pedidos          → listar mis pedidos (con stats)
GET  /pedidos/PED-001  → detalle de un pedido
```

---

### 5.1 Checkout — Crear pedido

```
POST /api/v1/tenant/market/pedidos
```

**Body (todos opcionales):**
```json
{
  "notas": "Entrega urgente, llamar antes",
  "metodo_pago": "Transferencia Bancaria",
  "direccion_entrega": "Finca La Esperanza, Km 5 vía Montería"
}
```

> Si `direccion_entrega` no se envía, se usa la dirección registrada de la finca.

**Comportamiento multi-proveedor:**
Si el carrito tiene productos de 2 proveedores distintos, se crean **2 pedidos** en una sola operación atómica. El `data` del response es siempre un array.

**Respuesta 201 (1 proveedor):**
```json
{
  "message": "Pedido creado correctamente",
  "total_pedidos": 1,
  "data": [
    {
      "id": 4,
      "codigo": "PED-004",
      "estado": "pendiente",
      "subtotal": "920000.00",
      "costo_envio": "0.00",
      "total": "920000.00",
      "metodo_pago": "Transferencia Bancaria",
      "fecha_pedido": "2026-05-07T20:00:00.000000Z",
      "proveedor": { "id": 1, "nombre_empresa": "AgroInsumos del Valle" },
      "items": [
        {
          "id": 1,
          "nombre_producto": "Fertilizante NPK 15-15-15",
          "cantidad": 10,
          "precio_unitario": "92000.00",
          "subtotal": "920000.00",
          "descuento": "0.00"
        }
      ]
    }
  ]
}
```

**Respuesta 201 (2 proveedores):**
```json
{
  "message": "2 pedidos creados (uno por proveedor)",
  "total_pedidos": 2,
  "data": [ { "codigo": "PED-004", ... }, { "codigo": "PED-005", ... } ]
}
```

**Errores:**

| Code | HTTP | Descripción |
|------|------|-------------|
| `CARRITO_VACIO` | 409 | El carrito no tiene ítems |
| `STOCK_INSUFICIENTE` | 409 | Uno o más productos sin stock suficiente |
| `STOCK_INSUFICIENTE_CONCURRENTE` | 409 | El stock se agotó durante el proceso (raro, reintentar) |

**Error 409 STOCK_INSUFICIENTE:**
```json
{
  "message": "Stock insuficiente para uno o más productos",
  "code": "STOCK_INSUFICIENTE",
  "errors": [
    {
      "producto": "Fertilizante NPK 15-15-15",
      "disponible": 5,
      "solicitado": 10
    }
  ]
}
```

---

### 5.2 Mis pedidos

```
GET /api/v1/tenant/market/pedidos
```

**Query params:**

| Param | Descripción |
|-------|-------------|
| `estado` | `pendiente` \| `confirmado` \| `preparando` \| `en_transito` \| `entregado` \| `cancelado` |
| `page` | Página (10 por página) |

**Respuesta 200:**
```json
{
  "stats": {
    "pedidos_activos": 2,
    "pedidos_entregados": 1,
    "total_gastado": 5635000
  },
  "data": [
    {
      "id": 1,
      "codigo": "PED-001",
      "estado": "en_transito",
      "subtotal": "1160000.00",
      "costo_envio": "25000.00",
      "total": "1185000.00",
      "fecha_pedido": "2026-04-09T00:00:00.000000Z",
      "proveedor": { "id": 1, "nombre_empresa": "AgroInsumos del Valle" },
      "items": [
        { "nombre_producto": "Fertilizante NPK 15-15-15", "cantidad": 10, "precio_unitario": "95000.00", "subtotal": "950000.00" },
        { "nombre_producto": "Glifosato 48% SL", "cantidad": 5, "precio_unitario": "42000.00", "subtotal": "210000.00" }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 3
  }
}
```

> `stats.pedidos_activos` = estados: pendiente + confirmado + preparando + en_transito
> `stats.total_gastado` = suma de todos los pedidos no cancelados

---

### 5.3 Detalle de pedido

```
GET /api/v1/tenant/market/pedidos/{codigo}
```

Ejemplo: `GET /api/v1/tenant/market/pedidos/PED-001`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "codigo": "PED-001",
    "estado": "en_transito",
    "subtotal": "1160000.00",
    "costo_envio": "25000.00",
    "total": "1185000.00",
    "metodo_pago": "Transferencia Bancaria",
    "direccion_entrega": "Finca La Esperanza, Km 5",
    "notas": null,
    "fecha_pedido": "2026-04-09T00:00:00.000000Z",
    "fecha_entrega_estimada": "2026-04-13",
    "fecha_entrega_real": null,
    "proveedor": {
      "id": 1,
      "nombre_empresa": "AgroInsumos del Valle",
      "nit": "900000001-1",
      "email": "ventas@agroinsumos.com",
      "ciudad": "Bogotá",
      "calificacion_promedio": "4.7"
    },
    "items": [
      {
        "id": 1,
        "nombre_producto": "Fertilizante NPK 15-15-15",
        "cantidad": 10,
        "precio_unitario": "95000.00",
        "subtotal": "950000.00",
        "descuento": "0.00",
        "producto": {
          "id": 1,
          "nombre": "KCL CLORURO DE POTASIO 0-0-60",
          "imagen_principal": "/assets/images/products/FERT-001.jpg"
        }
      }
    ],
    "historial": [
      {
        "id": 1,
        "estado_anterior": null,
        "estado_nuevo": "pendiente",
        "comentario": "Pedido creado",
        "fecha_cambio": "2026-04-10T08:30:00.000000Z",
        "user": { "id": 5, "name": "Admin AgroInsumos" }
      },
      {
        "id": 2,
        "estado_anterior": "pendiente",
        "estado_nuevo": "confirmado",
        "comentario": "Pedido confirmado por el proveedor",
        "fecha_cambio": "2026-04-10T10:15:00.000000Z",
        "user": { "id": 5, "name": "Admin AgroInsumos" }
      }
    ]
  }
}
```

**Error 404:**
```json
{ "message": "Pedido no encontrado", "code": "PEDIDO_NOT_FOUND" }
```

---

## 6. Tabla de códigos de error

| Code | HTTP | Descripción |
|------|------|-------------|
| `MODULE_DISABLED` | 403 | `modulo_market` deshabilitado para esta finca |
| `PERMISSION_DENIED` | 403 | El usuario no tiene el permiso requerido |
| `TENANT_REQUIRED` | 422 | Falta el header `X-Tenant-Id` |
| `PRODUCTO_NOT_FOUND` | 404 | Producto no encontrado o proveedor inactivo |
| `PRODUCTO_NO_ACTIVO` | 409 | El producto no está disponible para la venta |
| `PROVEEDOR_INACTIVO` | 409 | El proveedor del producto no está activo |
| `SIN_STOCK` | 409 | El producto no tiene stock disponible |
| `PRODUCTO_SIN_PRECIO` | 409 | El producto no tiene precio configurado |
| `CARRITO_ITEM_NOT_FOUND` | 404 | Ítem del carrito no encontrado o de otro tenant |
| `CARRITO_VACIO` | 409 | Checkout con carrito vacío |
| `STOCK_INSUFICIENTE` | 409 | Stock insuficiente (lista de productos en `errors`) |
| `STOCK_INSUFICIENTE_CONCURRENTE` | 409 | Race condition de stock durante checkout, reintentar |
| `PEDIDO_NOT_FOUND` | 404 | Pedido no encontrado para esta finca |

---

## 7. Estados del pedido

```
pendiente → confirmado → preparando → en_transito → entregado
                                                   ↘ cancelado (desde cualquier estado)
```

| Estado | Label UI sugerido | Color |
|--------|------------------|-------|
| `pendiente` | Pendiente | Naranja |
| `confirmado` | Confirmado | Azul |
| `preparando` | En Preparación | Morado |
| `en_transito` | En Camino | Azul oscuro |
| `entregado` | Entregado | Verde |
| `cancelado` | Cancelado | Rojo |

---

## 8. Permisos requeridos

Los permisos deben estar asignados al usuario en el contexto del tenant.
El rol `ADMIN` los recibe todos automáticamente.

| Permiso | Endpoints |
|---------|-----------|
| `market.catalogo` | GET categorias, GET productos, GET productos/{id} |
| `market.carrito` | Todos los endpoints de /carrito |
| `market.pedidos` | GET pedidos, POST pedidos, GET pedidos/{codigo} |

---

## 9. Notas de implementación

### Precios por volumen
`precio_unitario` en la respuesta del carrito ya refleja el descuento por volumen.
Para mostrar el precio base tachado, usar `producto.precio_unitario` del producto.

### Imágenes de productos
`imagen_principal` contiene una ruta relativa al public folder (ej. `/assets/images/products/AGRO-001.jpg`).
El frontend construye la URL completa: `${APP_URL}${imagen_principal}` → `http://dominio.com/assets/images/products/AGRO-001.jpg`.
Si `imagen_principal` es `null`, mostrar un placeholder SVG.
El array `imagenes` en el endpoint de detalle contiene la galería del producto con las mismas rutas relativas.

### Carrito y múltiples proveedores
El carrito puede tener productos de distintos proveedores simultáneamente.
En el checkout se crea un pedido por proveedor. El response siempre retorna un array en `data`.

### Recalcular total en tiempo real
Al cambiar la cantidad de un ítem, llamar `PUT /carrito/items/{id}` y actualizar el display.
Los precios por volumen cambian según tramos — el API retorna el `precio_unitario` actualizado.
