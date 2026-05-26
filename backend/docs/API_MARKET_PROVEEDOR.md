# API Market — Portal Proveedor

Endpoints del módulo B2B de AGRO CAMPO para la gestión de pedidos por parte del **proveedor**.

---

## 1. Autenticación y Headers requeridos

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

> A diferencia del lado tenant, **no se requiere el header `X-Tenant-Id`**.
> El proveedor se identifica a través del claim `proveedor_id` incluido en el JWT.
> Para obtener el token: `POST /api/v1/proveedor-auth/login` con `email` y `password`.

---

## 2. Base URL

```
/api/v1/market/proveedor/pedidos
```

---

## 3. Lista de pedidos

```
GET /api/v1/market/proveedor/pedidos
```

### Query params

| Param | Tipo | Descripción |
|-------|------|-------------|
| `tab` | string | `todos` \| `por_confirmar` \| `activos` \| `completados` |
| `estado` | string | Estado específico (ver tabla de estados) |
| `buscar` | string | Busca en código o nombre de la finca |
| `page` | integer | Página (15 pedidos por página) |

**Valores del param `tab`:**
- `todos` — todos los pedidos del proveedor (default si se omite)
- `por_confirmar` — solo `pendiente` (requieren acción inmediata)
- `activos` — `confirmado` + `preparando` + `en_transito`
- `completados` — solo `entregado`

### Respuesta 200

```json
{
  "stats": {
    "por_confirmar": 1,
    "activos": 3,
    "en_transito": 1,
    "completados": 1,
    "ventas_mes": 300000
  },
  "data": [
    {
      "id": 1,
      "codigo": "PED-001",
      "estado": "pendiente",
      "prioridad": "alta",
      "estado_pago": "pendiente",
      "numero_guia": null,
      "subtotal": "1840000.00",
      "costo_envio": "0.00",
      "total": "1840000.00",
      "metodo_pago": "Transferencia Bancaria",
      "fecha_pedido": "2026-04-15T08:30:00.000000Z",
      "fecha_entrega_estimada": null,
      "tenant": {
        "id": 1,
        "nombre": "Finca La Esperanza",
        "telefono": "300 1234567",
        "email": "carlos@fincalaesperanza.com"
      },
      "productos_resumen": "20 Fertilizante NPK 15-15-15 y 1 producto(s) más",
      "acciones_disponibles": ["confirmar", "rechazar"]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 5
  }
}
```

> **`acciones_disponibles`** — el frontend debe usar este campo para renderizar los botones CTA
> sin implementar la lógica de estados en el cliente.

---

## 4. Detalle de pedido

```
GET /api/v1/market/proveedor/pedidos/{codigo}
```

Ejemplo: `GET /api/v1/market/proveedor/pedidos/PED-001`

### Respuesta 200

```json
{
  "data": {
    "id": 1,
    "codigo": "PED-001",
    "estado": "pendiente",
    "prioridad": "alta",
    "estado_pago": "pendiente",
    "numero_guia": null,
    "subtotal": "1840000.00",
    "costo_envio": "0.00",
    "total": "1840000.00",
    "metodo_pago": "Transferencia Bancaria",
    "direccion_entrega": "Vereda El Carmen, km 15, Municipio de San José",
    "notas": null,
    "fecha_pedido": "2026-04-15T08:30:00.000000Z",
    "fecha_entrega_estimada": null,
    "fecha_entrega_real": null,
    "tenant": {
      "id": 1,
      "nombre": "Finca La Esperanza",
      "nit": "900111222-3",
      "correo_contacto": "carlos@fincalaesperanza.com",
      "telefono": "300 1234567",
      "direccion": "Vereda El Carmen, km 15"
    },
    "items": [
      {
        "id": 1,
        "nombre_producto": "Fertilizante NPK 15-15-15",
        "cantidad": 20,
        "precio_unitario": "92000.00",
        "subtotal": "1840000.00",
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
        "estado_anterior": null,
        "estado_nuevo": "pendiente",
        "comentario": "Pedido creado",
        "fecha_cambio": "2026-04-15T08:30:00.000000Z",
        "user": { "id": 5, "name": "Admin AgroInsumos" }
      }
    ],
    "acciones_disponibles": ["confirmar", "rechazar"]
  }
}
```

### Error 404

```json
{ "message": "Pedido no encontrado", "code": "PEDIDO_NOT_FOUND" }
```

---

## 5. Cambiar estado del pedido

```
PUT /api/v1/market/proveedor/pedidos/{codigo}/estado
```

Ejemplo: `PUT /api/v1/market/proveedor/pedidos/PED-001/estado`

Este endpoint centraliza todos los cambios de estado. Los botones CTA de la vista (Confirmar, Despachar, etc.)
deben llamar a este endpoint con el estado correspondiente.

### Body

```json
{
  "estado": "confirmado",
  "comentario": "Pedido verificado, comenzamos preparación",
  "prioridad": "normal",
  "estado_pago": "pendiente",
  "numero_guia": null,
  "fecha_entrega_estimada": "2026-04-19"
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `estado` | Sí | Nuevo estado (ver máquina de estados) |
| `comentario` | No | Comentario visible en el historial (max 500 chars) |
| `numero_guia` | No | Número de guía del transportista (recomendado con `en_transito`) |
| `fecha_entrega_estimada` | No | Fecha estimada de entrega (recomendada al confirmar) |
| `estado_pago` | No | `pendiente` \| `pagado` — actualizar cuando reciban el pago offline |
| `prioridad` | No | `normal` \| `alta` \| `urgente` |

### Máquina de estados — transiciones válidas

```
pendiente   →  confirmado  |  cancelado
confirmado  →  preparando  |  cancelado
preparando  →  en_transito |  cancelado
en_transito →  entregado   |  cancelado
entregado   →  (ninguna)
cancelado   →  (ninguna)
```

### Mapa de botones CTA → estado a enviar

| Botón UI | `estado` a enviar | Descripción |
|----------|-------------------|-------------|
| Confirmar Pedido | `confirmado` | Proveedor acepta el pedido |
| Rechazar | `cancelado` | Proveedor rechaza el pedido |
| Marcar Preparando | `preparando` | Se está alistando el pedido |
| Despachar | `en_transito` | Pedido entregado al transportista |
| Confirmar Entrega | `entregado` | Pedido recibido por el cliente |

### Respuesta 200

```json
{
  "message": "Estado actualizado a confirmado",
  "data": {
    "id": 1,
    "codigo": "PED-001",
    "estado": "confirmado",
    "prioridad": "normal",
    "estado_pago": "pendiente",
    "numero_guia": null,
    "fecha_entrega_estimada": "2026-04-19",
    "fecha_entrega_real": null,
    "acciones_disponibles": ["preparar"]
  }
}
```

### Error 409 — Transición inválida

```json
{
  "message": "No es posible pasar de 'entregado' a 'confirmado'",
  "code": "TRANSICION_INVALIDA",
  "estado_actual": "entregado",
  "transiciones_validas": []
}
```

---

## 6. Descargar factura PDF

```
GET /api/v1/market/proveedor/pedidos/{codigo}/factura
```

Ejemplo: `GET /api/v1/market/proveedor/pedidos/PED-001/factura`

**Respuesta:** archivo `Factura-PED-001.pdf` (descarga directa, Content-Type: `application/pdf`).

El PDF incluye:
- Encabezado del proveedor (nombre, NIT, dirección, teléfono, email)
- Referencia del pedido (código, fecha, estado, número de guía si aplica)
- Datos del cliente (nombre finca, contacto, teléfono, dirección de entrega)
- Tabla de productos (nombre, cantidad, precio unitario, total)
- Total del pedido
- Información de pago (método y estado)

---

## 7. Exportar a Excel

```
GET /api/v1/market/proveedor/pedidos/exportar
```

Acepta los mismos filtros que el listado (`tab`, `estado`, `buscar`). Máximo 1000 pedidos por exportación.

**Respuesta:** archivo `Pedidos-YYYY-MM-DD.xlsx` (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

**Columnas del archivo:**

| Código | Cliente | Estado | Prioridad | Estado Pago | Fecha | Total | Método Pago | Núm. Guía | Entrega Estimada |
|--------|---------|--------|-----------|-------------|-------|-------|-------------|-----------|-----------------|

---

## 8. Tabla de estados

| Estado | Label UI sugerido | Color |
|--------|------------------|-------|
| `pendiente` | Pendiente Confirmación | Naranja |
| `confirmado` | Confirmado | Azul |
| `preparando` | Listo para Envío | Morado |
| `en_transito` | En Tránsito | Azul oscuro |
| `entregado` | Entregado | Verde |
| `cancelado` | Cancelado | Rojo |

## 9. Tabla de prioridades

| Prioridad | Label UI | Color |
|-----------|----------|-------|
| `normal` | Normal | Gris |
| `alta` | Alta | Naranja |
| `urgente` | Urgente | Rojo |

## 10. Tabla de estado de pago

| Estado Pago | Label UI | Color |
|-------------|----------|-------|
| `pendiente` | Pendiente | Naranja |
| `pagado` | Pagado | Verde |

---

## 11. Tabla de códigos de error

| Code | HTTP | Descripción |
|------|------|-------------|
| `PEDIDO_NOT_FOUND` | 404 | Pedido no encontrado o no pertenece a este proveedor |
| `TRANSICION_INVALIDA` | 409 | El cambio de estado solicitado no es una transición válida |
| `PROVEEDOR_NOT_FOUND` | 404 | El proveedor del JWT no existe |
| `PROVEEDOR_INACTIVE` | 403 | El proveedor está inactivo |
| `PROVEEDOR_ACCESS_DENIED` | 403 | El usuario no tiene acceso activo al proveedor |

---

## 12. Compatibilidad con API_MARKET.md (lado tenant)

Los endpoints del comprador (`/api/v1/tenant/market/pedidos`) también exponen los nuevos campos
`prioridad`, `estado_pago` y `numero_guia` en sus respuestas, de forma transparente.
El tenant puede consultar el estado de pago y el número de guía de sus pedidos
en los endpoints de detalle y listado sin ningún cambio en la integración.

---

## 13. Notas de implementación

### Isolation por proveedor
Todos los endpoints del portal proveedor aplican automáticamente el scope `delProveedor($id)`,
por lo que un proveedor nunca puede ver ni modificar pedidos de otro proveedor.

### Campo `acciones_disponibles`
Devuelto en `index` y `show`. El frontend **no debe reimplementar la lógica de estados**.
Solo debe leer este array y renderizar los botones correspondientes.

### Factura
El PDF no incluye firma ni número de factura oficial — es un documento de referencia.
No implementa numeración secuencial de facturas (queda fuera de alcance).

### Estado de pago
El pago **no se procesa en la plataforma**. El proveedor marca manualmente `estado_pago: "pagado"`
al recibir la transferencia o efectivo fuera de la plataforma.

### Concurrencia en cambio de estado
La actualización de estado y el registro en historial ocurren en una transacción atómica.
Si la transacción falla, ninguno de los dos cambios se aplica.
