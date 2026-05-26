# API — Portal del Proveedor: Gestión de Productos

Base URL: `{APP_URL}/api/v1/market/proveedor`

---

## Autenticación

Todas las rutas requieren un JWT obtenido del **portal de proveedores** (no el de la finca).

> **Sin `X-Tenant-Id`** — este portal no usa el header de tenant.

### Flujo de autenticación

```
1. POST /api/v1/proveedor-auth/login
   → Retorna token (si tiene 1 proveedor, ya incluye proveedor_id en claims)
   → Si tiene varios, retorna lista de proveedores + flag requires_proveedor_selection: true

2. POST /api/v1/proveedor-auth/select-proveedor   { proveedor_id: 1 }
   → Retorna nuevo token con proveedor_id y proveedor_role en claims

3. Usar el token en cada request:
   Authorization: Bearer {token}
```

---

## Errores de autenticación comunes

| Código HTTP | `code` | Causa |
|-------------|--------|-------|
| 422 | `PROVEEDOR_NOT_SELECTED` | El token no tiene `proveedor_id`. Hay que hacer select-proveedor. |
| 404 | `PROVEEDOR_NOT_FOUND` | El proveedor fue eliminado. |
| 403 | `PROVEEDOR_INACTIVE` | El proveedor está suspendido. |
| 403 | `PROVEEDOR_ACCESS_DENIED` | El usuario fue removido del proveedor. |

---

## 1. Wizard Init

Retorna las opciones para los selects del formulario de crear/editar producto.

```
GET /api/v1/market/proveedor/wizard-init
```

**Respuesta 200:**
```json
{
  "data": {
    "categorias": [
      { "id": 1, "nombre": "Fertilizantes", "slug": "fertilizantes", "icono": "🌱" }
    ],
    "unidades_medida": [
      { "id": 1, "codigo": "BLT", "nombre": "Bulto 50kg", "abreviatura": "BLT" },
      { "id": 2, "codigo": "LT",  "nombre": "Litro",      "abreviatura": "lt" }
    ]
  }
}
```

---

## 2. Listar Productos

```
GET /api/v1/market/proveedor/productos
```

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `estado` | `activo` \| `inactivo` | Filtrar por estado |
| `categoria_id` | integer | Filtrar por categoría |
| `destacados` | `true` | Solo productos destacados |
| `buscar` | string | Búsqueda por nombre o SKU (insensible a mayúsculas) |
| `ordenar` | `recientes` \| `nombre` \| `precio_asc` \| `precio_desc` | Orden de resultados (default: `recientes`) |
| `per_page` | integer | Registros por página (default: 15) |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "sku": "PROV1-1746600000",
      "nombre": "Fertilizante NPK 15-15-15",
      "descripcion": "Fertilizante completo para palma de aceite",
      "precio_unitario": "95000.00",
      "stock_disponible": 250,
      "stock_minimo": 10,
      "estado": "activo",
      "destacado": true,
      "imagen_principal": "http://localhost/storage/market/productos/1/uuid.jpg",
      "categoria": { "id": 1, "nombre": "Fertilizantes", "slug": "fertilizantes" },
      "unidad_medida": { "id": 1, "codigo": "BLT", "nombre": "Bulto 50kg", "abreviatura": "BLT" },
      "precios_volumen": [
        { "id": 1, "cantidad_minima": 10, "precio_unidad": "92000.00", "activo": true }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  },
  "stats": {
    "total_activos": 35,
    "total_inactivos": 7,
    "total_sin_stock": 2
  }
}
```

---

## 3. Ver Producto

```
GET /api/v1/market/proveedor/productos/{id}
```

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "sku": "PROV1-1746600000",
    "nombre": "Fertilizante NPK 15-15-15",
    "descripcion": "Fertilizante completo para palma de aceite",
    "especificaciones": { "peso": "50kg", "presentacion": "Bulto" },
    "precio_unitario": "95000.00",
    "stock_disponible": 250,
    "stock_minimo": 10,
    "estado": "activo",
    "destacado": true,
    "imagen_principal": "http://localhost/storage/market/productos/1/uuid.jpg",
    "unidades_vendidas": 156,
    "ingresos_acumulados": "14820000.00",
    "categoria": { "id": 1, "nombre": "Fertilizantes", "slug": "fertilizantes", "descripcion": "...", "icono": "🌱", "orden": 1, "activa": true },
    "unidad_medida": { "id": 1, "codigo": "BLT", "nombre": "Bulto 50kg", "abreviatura": "BLT", "activa": true },
    "imagenes": [
      { "id": 3, "url": "http://localhost/storage/market/productos/1/img2.jpg", "orden": 0, "alt_text": "Vista frontal" }
    ],
    "precios_volumen": [
      { "id": 1, "cantidad_minima": 10, "precio_unidad": "92000.00", "activo": true },
      { "id": 2, "cantidad_minima": 50, "precio_unidad": "89000.00", "activo": true }
    ]
  }
}
```

> El `show` retorna **todos** los precios por volumen incluyendo los inactivos (a diferencia del catálogo de la finca que solo muestra los activos).

---

## 4. Crear Producto

```
POST /api/v1/market/proveedor/productos
Content-Type: multipart/form-data
```

### Campos

| Campo | Tipo | Req. | Descripción |
|-------|------|------|-------------|
| `nombre` | string (max 150) | ✅ | Nombre del producto |
| `descripcion` | string | ✅ | Descripción del producto |
| `categoria_id` | integer | ✅ | ID de la categoría |
| `unidad_medida_id` | integer | ✅ | ID de la unidad de medida |
| `precio_unitario` | numeric (min 0.01) | ✅ | Precio base por unidad |
| `stock_disponible` | integer (min 0) | ✅ | Unidades disponibles |
| `sku` | string (max 50) | — | SKU único (autogenerado si no se envía) |
| `descripcion` | string | ✅ | |
| `especificaciones` | JSON object | — | Datos técnicos adicionales |
| `stock_minimo` | integer (min 0) | — | Alerta de stock bajo |
| `estado` | `activo` \| `inactivo` | — | Default: `activo` |
| `destacado` | boolean | — | Default: `false` |
| `imagen_principal` | file (jpg/jpeg/png/webp, max 3MB) | — | Imagen principal del producto |
| `precios_volumen` | JSON array | — | Escalas de descuento por volumen |

### Precios por volumen (array)

```json
[
  { "cantidad_minima": 10, "precio_unidad": 92000 },
  { "cantidad_minima": 50, "precio_unidad": 89000 },
  { "cantidad_minima": 100, "precio_unidad": 85000 }
]
```

> `cantidad_minima` mínima permitida: **2** (el precio base ya cubre la cantidad 1).

### Cómo enviar desde el frontend (JS/FormData)

```js
const formData = new FormData();
formData.append('nombre', 'Fertilizante NPK 15-15-15');
formData.append('descripcion', 'Fertilizante completo');
formData.append('categoria_id', 1);
formData.append('unidad_medida_id', 1);
formData.append('precio_unitario', 95000);
formData.append('stock_disponible', 250);
formData.append('imagen_principal', imageFile); // File object
// Precios por volumen como JSON string
formData.append('precios_volumen', JSON.stringify([
  { cantidad_minima: 10, precio_unidad: 92000 }
]));

await fetch('/api/v1/market/proveedor/productos', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Respuesta 201:**
```json
{
  "data": { /* producto completo con relaciones */ }
}
```

---

## 5. Actualizar Producto

```
PUT /api/v1/market/proveedor/productos/{id}
Content-Type: multipart/form-data
```

Todos los campos son opcionales (`sometimes`). Solo se actualizan los que se envíen.

### Sincronización de precios por volumen

| Qué se envía | Efecto |
|-------------|--------|
| Se omite la key `precios_volumen` | No se modifica nada |
| `precios_volumen: []` | Se borran todos los precios por volumen |
| `precios_volumen: [{...}]` | Reemplaza TODOS los precios (delete + recreate) |

> El frontend debe enviar siempre el array completo actualizado, no solo los cambios.

### Actualizar imagen principal

Incluir el campo `imagen_principal` con el nuevo archivo. La imagen anterior se elimina automáticamente.

**Respuesta 200:**
```json
{
  "data": { /* producto actualizado con relaciones */ }
}
```

**Errores:**

| HTTP | `code` | Causa |
|------|--------|-------|
| 404 | `PRODUCTO_NOT_FOUND` | El producto no existe o pertenece a otro proveedor |
| 422 | — | Errores de validación |

---

## 6. Activar / Desactivar Producto

```
PATCH /api/v1/market/proveedor/productos/{id}/toggle
```

No requiere body. Alterna el estado entre `activo` e `inactivo`.

**Respuesta 200:**
```json
{
  "data": { /* producto con nuevo estado */ },
  "message": "Producto desactivado correctamente."
}
```

---

## 7. Eliminar Producto

```
DELETE /api/v1/market/proveedor/productos/{id}
```

> **No se puede eliminar** si el producto tiene órdenes en estado activo (`pendiente`, `confirmado`, `preparando`, `en_transito`). En ese caso retorna **409**.

**Respuesta 200:**
```json
{ "message": "Producto eliminado correctamente." }
```

**Errores:**

| HTTP | `code` | Causa |
|------|--------|-------|
| 404 | `PRODUCTO_NOT_FOUND` | El producto no existe o pertenece a otro proveedor |
| 409 | `PRODUCTO_CON_ORDENES_ACTIVAS` | Tiene órdenes activas |

---

## 8. Añadir Imagen a la Galería

```
POST /api/v1/market/proveedor/productos/{id}/imagenes
Content-Type: multipart/form-data
```

| Campo | Tipo | Req. | Descripción |
|-------|------|------|-------------|
| `imagen` | file (jpg/jpeg/png/webp, max 3MB) | ✅ | Imagen a subir |
| `alt_text` | string (max 150) | — | Texto alternativo para accesibilidad |
| `orden` | integer (0-99) | — | Posición en la galería (autocalculado si no se envía) |

**Respuesta 201:**
```json
{
  "data": {
    "id": 5,
    "producto_id": 1,
    "url": "http://localhost/storage/market/productos/1/abc123.jpg",
    "orden": 2,
    "alt_text": "Vista lateral",
    "created_at": "2026-05-18T12:00:00.000000Z"
  }
}
```

---

## 9. Eliminar Imagen de la Galería

```
DELETE /api/v1/market/proveedor/productos/{id}/imagenes/{imgId}
```

**Respuesta 200:**
```json
{ "message": "Imagen eliminada correctamente." }
```

**Errores:**

| HTTP | `code` | Causa |
|------|--------|-------|
| 404 | `PRODUCTO_NOT_FOUND` | Producto no encontrado |
| 404 | `IMAGEN_NOT_FOUND` | Imagen no encontrada |

---

## Resumen de endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/wizard-init` | Datos para selects del formulario |
| `GET` | `/productos` | Listar productos del proveedor |
| `POST` | `/productos` | Crear producto |
| `GET` | `/productos/{id}` | Ver detalle del producto |
| `PUT` | `/productos/{id}` | Actualizar producto |
| `DELETE` | `/productos/{id}` | Eliminar producto |
| `PATCH` | `/productos/{id}/toggle` | Activar / desactivar |
| `POST` | `/productos/{id}/imagenes` | Añadir imagen a la galería |
| `DELETE` | `/productos/{id}/imagenes/{imgId}` | Eliminar imagen de la galería |

---

## Notas de implementación

- **Scope de seguridad:** Un proveedor nunca puede ver ni modificar productos de otro proveedor. Intentarlo retorna `404`, no `403`, para no revelar si el recurso existe.
- **Imagen principal vs galería:** Son dos conceptos separados. `imagen_principal` es un campo de texto en el producto (URL). La galería se gestiona en la tabla `market_producto_imagenes` con los endpoints de `/imagenes`.
- **SKU global único:** El SKU es único en todo el marketplace (entre todos los proveedores). Si el proveedor no envía uno, se autogenera con el formato `PROV{id}-{timestamp}`.
- **Precios por volumen:** El frontend debe mostrar siempre el array completo en el formulario de edición y enviarlo completo al actualizar.
