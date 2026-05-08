# Módulo Market — Documentación Técnica

## 1. ¿Qué es el Módulo Market?

El módulo Market es un marketplace B2B integrado en AGRO CAMPO que permite:

- **Proveedores** cargar y gestionar su catálogo de productos agrícolas (fertilizantes, agroquímicos, herramientas, maquinaria, semillas).
- **Fincas (tenants)** navegar el catálogo, agregar al carrito y realizar pedidos directamente desde la app.
- Seguimiento completo del estado del pedido con timeline histórico.

---

## 2. Arquitectura General

```
FINCA (tenant)                      PROVEEDOR
────────────────                    ────────────────────
Navega catálogo  →  API tenant      Gestiona productos
Agrega al carrito   /market/*       Gestiona pedidos
Hace checkout    →  market_pedidos  Ve estadísticas
Ve mis pedidos   ←  market_pedidos
```

### Entidades globales (sin tenant_id)
`market_proveedores`, `market_proveedor_user`, `market_categorias`,
`market_unidades_medida`, `market_productos`, `market_producto_imagenes`,
`market_precios_volumen`

### Entidades del comprador (con tenant_id)
`market_carritos`, `market_carrito_items`, `market_pedidos`,
`market_pedido_items`, `market_pedido_estados_historial`

---

## 3. Diagrama de Tablas y Relaciones

```
market_proveedores (1) ──── (N) market_proveedor_user ──── (1) users
        │
        └── (N) market_productos
                    │── (N) market_producto_imagenes
                    │── (N) market_precios_volumen
                    │── (1) market_categorias
                    └── (1) market_unidades_medida

tenants (1) ──── (1) market_carritos ──── (N) market_carrito_items ──── (1) market_productos
        │
        └── (N) market_pedidos
                    │── (1) market_proveedores
                    │── (N) market_pedido_items ──── (1) market_productos
                    └── (N) market_pedido_estados_historial ──── (N) users
```

---

## 4. Módulo habilitado por tenant

El campo `modulo_market` en `tenant_config` controla si la finca tiene acceso al marketplace.
- `true`: finca puede ver el catálogo, agregar al carrito y hacer pedidos
- `false` (default): módulo oculto para esa finca

---

## 5. Autenticación y Creación de Proveedores

### Cómo funciona la identidad de un proveedor

El proveedor usa la **misma tabla `users`** que todos los usuarios del sistema. Lo que lo diferencia es el pivot `market_proveedor_user`:

```
users (tabla global)
  id | name              | email                         | is_super_admin
  5  | Admin AgroInsumos | admin@agroinsumosdelvalle.com | false

market_proveedores
  id | nombre_empresa
  1  | AgroInsumos del Valle

market_proveedor_user  (pivot que los vincula)
  user_id | proveedor_id | rol   | estado
  5       | 1            | ADMIN | true
```

### Flujo de login de un proveedor (a implementar)

1. Llama al mismo `POST /api/v1/auth/login` con su email/password → obtiene JWT
2. Llama a rutas `/api/v1/market/proveedor/*` con ese JWT
3. El middleware `SetProveedor` (pendiente) busca al usuario en `market_proveedor_user`
4. Si existe y está activo → inyecta el proveedor en el contexto de la request
   (igual a como `SetTenant` inyecta el tenant vía el header `X-Tenant-Id`)

### Diferencia vs usuario de finca

| Aspecto | Usuario finca | Usuario proveedor |
|---------|--------------|-------------------|
| Tabla | `users` | `users` (misma) |
| Pivot | `tenant_user` | `market_proveedor_user` |
| Header req. | `X-Tenant-Id` | ninguno (proveedor se infiere del pivot) |
| Rutas | `/api/v1/tenant/*` | `/api/v1/market/proveedor/*` |
| Middleware | `SetTenant` | `SetProveedor` (por implementar) |

> Un usuario puede ser proveedor **y** pertenecer a una finca como tenant — no se excluyen. En la práctica serán cuentas separadas.

### Cómo crear un proveedor y su usuario (código de referencia)

```php
// 1. Crear el usuario normal en la tabla users
$user = User::create([
    'name'     => 'Carlos Gómez',
    'email'    => 'carlos@miproveedora.com',
    'password' => Hash::make('secreto'),
    'is_super_admin' => false,
    'status'   => true,
]);

// 2. Crear la empresa proveedora
$proveedor = MarketProveedor::create([
    'nombre_empresa' => 'Mi Proveedora S.A.S',
    'nit'            => '900000001-1',
    'telefono'       => '3001234567',
    'email'          => 'ventas@miproveedora.com',
    'direccion'      => 'Calle 1 #2-3',
    'ciudad'         => 'Bogotá',
    'departamento'   => 'Cundinamarca',
    'estado'         => 'activo',
]);

// 3. Vincular usuario con proveedor
MarketProveedorUser::create([
    'proveedor_id' => $proveedor->id,
    'user_id'      => $user->id,
    'rol'          => 'ADMIN',  // ADMIN | OPERADOR
    'estado'       => true,
]);
```

---

## 6. Flujo del Carrito

```
1. GET  /api/v1/tenant/market/carrito          → Obtiene (o crea) carrito del tenant
2. POST /api/v1/tenant/market/carrito/items    → Agrega/actualiza cantidad de un producto
3. DELETE /api/v1/tenant/market/carrito/items/{id} → Elimina item
4. GET  /api/v1/tenant/market/carrito          → Muestra carrito con totales calculados

Total calculado dinámicamente:
  - Para cada item: cantidad × getPrecioParaCantidad(cantidad)
  - getPrecioParaCantidad() aplica precios por volumen de market_precios_volumen
  - NO se persiste el total en carrito; se persiste solo al crear el pedido
```

---

## 7. Flujo del Pedido

```
CHECKOUT:
POST /api/v1/tenant/market/pedidos → crea pedido desde carrito
  1. Valida stock de cada producto
  2. Aplica precios por volumen
  3. Crea market_pedido con snapshot de precios y dirección del tenant
  4. Crea market_pedido_items con nombre_producto y precio_unitario snapshoteados
  5. Registra estado inicial en market_pedido_estados_historial
  6. Vacía el carrito del tenant
  7. Retorna el pedido creado

ESTADOS DEL PEDIDO (en orden):
  pendiente → confirmado → preparando → en_transito → entregado
                                                     ↘ cancelado (desde cualquier estado)
```

---

## 8. Precios por Volumen

La tabla `market_precios_volumen` define descuentos escalonados:

| cantidad_minima | precio_unidad | efecto |
|----------------|---------------|--------|
| 1  (implícito) | 95,000        | precio base (en market_productos.precio_unitario) |
| 10             | 92,000        | 3% OFF |
| 50             | 89,000        | 6% OFF |
| 100            | 85,000        | 11% OFF |

El método `MarketProducto::getPrecioParaCantidad(int $cantidad)` devuelve el precio correcto.
El frontend debe recalcular el total del carrito en tiempo real al cambiar cantidades.

---

## 9. Imágenes de Productos

**Disco:** `public` (Laravel storage symlink)
**Ruta en disco:** `storage/app/public/market/productos/{proveedor_id}/`
**URL pública:** `{APP_URL}/storage/market/productos/{proveedor_id}/archivo.jpg`

**Tabla:** `market_producto_imagenes` para imágenes adicionales (galería).
**Campo:** `market_productos.imagen_principal` para la imagen principal (URL directa).

**Para el seeder:** `imagen_principal = null`. El frontend muestra un placeholder SVG cuando el campo es null.

---

## 10. Modelos PHP

| Modelo | Archivo | Descripción |
|--------|---------|-------------|
| MarketProveedor | `app/Models/Market/MarketProveedor.php` | Empresa vendedora |
| MarketProveedorUser | `app/Models/Market/MarketProveedorUser.php` | Pivot user↔proveedor |
| MarketCategoria | `app/Models/Market/MarketCategoria.php` | Categoría de productos |
| MarketUnidadMedida | `app/Models/Market/MarketUnidadMedida.php` | Unidad de medida |
| MarketProducto | `app/Models/Market/MarketProducto.php` | Producto del catálogo |
| MarketProductoImagen | `app/Models/Market/MarketProductoImagen.php` | Imagen de galería |
| MarketPrecioVolumen | `app/Models/Market/MarketPrecioVolumen.php` | Descuento por volumen |
| MarketCarrito | `app/Models/Market/MarketCarrito.php` | Carrito activo por finca |
| MarketCarritoItem | `app/Models/Market/MarketCarritoItem.php` | Item del carrito |
| MarketPedido | `app/Models/Market/MarketPedido.php` | Orden de compra |
| MarketPedidoItem | `app/Models/Market/MarketPedidoItem.php` | Línea del pedido |
| MarketPedidoEstadoHistorial | `app/Models/Market/MarketPedidoEstadoHistorial.php` | Timeline de estados |

---

## 11. Datos del Seeder (MarketSeeder)

**Archivo:** `database/seeders/MarketSeeder.php`

| Entidad | Valor |
|---------|-------|
| Proveedor | AgroInsumos del Valle |
| Admin proveedor | `admin@agroinsumosdelvalle.com` / `password` |
| Categorías | Fertilizantes, Agroquímicos, Herramientas, Maquinaria, Semillas |
| Unidades | BLT, LT, UND, KG, GAL |
| Productos | 6 (NPK 15-15-15, Glifosato 48% SL, Machete Palero 24", Urea 46%, Herbicida Selectivo, Insecticida Orgánico) |
| Pedidos demo | 3 (PED-001 en_transito, PED-002 entregado, PED-003 confirmado) |
| Carrito demo | 10x NPK + 5x Glifosato para Finca La Esperanza |
| Tenant habilitado | Finca La Esperanza (`modulo_market = true`) |

---

## 12. Endpoints Planeados (guía para frontend)

### Para fincas (auth + SetTenant middleware)
```
GET    /api/v1/tenant/market/categorias
GET    /api/v1/tenant/market/productos           ?categoria=&buscar=&ordenar=&page=
GET    /api/v1/tenant/market/productos/{id}
GET    /api/v1/tenant/market/carrito
POST   /api/v1/tenant/market/carrito/items       {producto_id, cantidad}
PUT    /api/v1/tenant/market/carrito/items/{id}  {cantidad}
DELETE /api/v1/tenant/market/carrito/items/{id}
DELETE /api/v1/tenant/market/carrito             (vaciar carrito)
POST   /api/v1/tenant/market/pedidos             (checkout desde carrito)
GET    /api/v1/tenant/market/pedidos             ?estado=&page=
GET    /api/v1/tenant/market/pedidos/{codigo}
```

### Para proveedores (auth + SetProveedor middleware — a implementar)
```
GET    /api/v1/market/proveedor/dashboard
GET    /api/v1/market/proveedor/productos
POST   /api/v1/market/proveedor/productos
PUT    /api/v1/market/proveedor/productos/{id}
DELETE /api/v1/market/proveedor/productos/{id}
POST   /api/v1/market/proveedor/productos/{id}/imagenes
GET    /api/v1/market/proveedor/pedidos          ?estado=&page=
PUT    /api/v1/market/proveedor/pedidos/{id}/estado  {estado, comentario}
```

---

## 13. Consideraciones de Seguridad

- Los datos de pedidos (precios, nombres de producto) se **snapshottean** al momento de crear el pedido en `market_pedido_items.precio_unitario` y `nombre_producto`. Esto garantiza que cambios futuros en el catálogo no alteran el histórico de pedidos.
- Las rutas de proveedor deben verificar que el usuario autenticado tiene registro activo en `market_proveedor_user` para el proveedor en cuestión.
- Las rutas de finca deben verificar `modulo_market = true` en `tenant_config`.

---

## 14. Migraciones

Todas con prefijo `2026_05_07_0000XX_`:

| # | Migración |
|---|-----------|
| 01 | `add_modulo_market_to_tenant_config` |
| 02 | `create_market_proveedores_table` |
| 03 | `create_market_proveedor_user_table` |
| 04 | `create_market_categorias_table` |
| 05 | `create_market_unidades_medida_table` |
| 06 | `create_market_productos_table` |
| 07 | `create_market_producto_imagenes_table` |
| 08 | `create_market_precios_volumen_table` |
| 09 | `create_market_carritos_table` |
| 10 | `create_market_carrito_items_table` |
| 11 | `create_market_pedidos_table` |
| 12 | `create_market_pedido_items_table` |
| 13 | `create_market_pedido_estados_historial_table` |
