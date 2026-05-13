# API — Market Proveedores (Superadmin)

> Endpoints para el **superadmin** que permiten gestionar las empresas proveedoras del marketplace y los usuarios vinculados a cada proveedor. Sigue el mismo patrón que la gestión de tenants.

**Base URL:** `{APP_URL}/api/v1/admin/market`
**Auth:** JWT (header `Authorization: Bearer <token>`) + `is_super_admin = true`
**Content-Type:** `application/json`

---

## Índice

1. [Códigos HTTP](#códigos-http)
2. [Proveedores](#proveedores)
   - [Listar](#listar-proveedores)
   - [Crear](#crear-proveedor)
   - [Detalle](#detalle-proveedor)
   - [Actualizar](#actualizar-proveedor)
   - [Eliminar (soft delete)](#eliminar-proveedor)
   - [Cambiar estado (toggle)](#toggle-estado)
3. [Usuarios del proveedor](#usuarios-del-proveedor)
   - [Listar usuarios](#listar-usuarios-del-proveedor)
   - [Asignar/crear usuario](#asignar-o-crear-usuario)
   - [Actualizar usuario](#actualizar-usuario-del-proveedor)
   - [Desvincular usuario](#desvincular-usuario)
4. [Paramétricas: Departamentos y Municipios](#paramétricas-departamentos-y-municipios)
5. [Modelos de datos](#modelos-de-datos)

---

## Códigos HTTP

| Código | Significado |
|--------|-------------|
| `200`  | OK — operación exitosa |
| `201`  | Creado |
| `401`  | No autenticado (JWT inválido o ausente) |
| `403`  | Acceso denegado — el usuario no es super admin (`SUPER_ADMIN_REQUIRED`) |
| `404`  | Recurso no encontrado |
| `409`  | Conflicto — ej: usuario ya asignado al proveedor (`USER_ALREADY_ASSIGNED`) |
| `422`  | Validación fallida o regla de negocio (`PROVIDER_ACTIVE`) |
| `500`  | Error del servidor |

---

## Proveedores

### Listar Proveedores

```
GET /api/v1/admin/market/proveedores
```

**Query params (todos opcionales):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `estado` | `string` | Filtra por estado: `activo` \| `inactivo` \| `suspendido` |
| `ciudad` | `string` | Filtra por ciudad exacta |
| `departamento` | `string` | Filtra por departamento exacto |
| `buscar` | `string` | Busca en `nombre_empresa`, `nit`, `email` (ilike) |
| `sort_by` | `string` | Campo para ordenar (default: `nombre_empresa`) |
| `sort_dir` | `string` | `asc` \| `desc` (default: `asc`) |
| `per_page` | `int` | Resultados por página (default: `15`) |
| `page` | `int` | Página actual |

**Respuesta 200** (paginada estándar de Laravel):
```json
{
  "current_page": 1,
  "data": [
    {
      "id": 1,
      "nombre_empresa": "AgroInsumos del Valle",
      "nit": "900123456-7",
      "telefono": "3157890123",
      "email": "ventas@agroinsumosdelvalle.com",
      "direccion": "Calle 15 #23-45",
      "ciudad": "Villavicencio",
      "departamento": "Meta",
      "descripcion": "Proveedor líder ...",
      "logo_url": null,
      "estado": "activo",
      "calificacion_promedio": "4.70",
      "total_ventas": 1250,
      "created_at": "2026-05-13T10:30:00.000000Z",
      "updated_at": "2026-05-13T10:30:00.000000Z",
      "deleted_at": null,
      "total_usuarios": 1,
      "total_productos": 6,
      "total_pedidos": 3
    }
  ],
  "first_page_url": "...",
  "last_page": 1,
  "per_page": 15,
  "total": 1
}
```

---

### Crear Proveedor

```
POST /api/v1/admin/market/proveedores
```

> ℹ️ El POST **solo crea el proveedor**. Para crear el usuario admin del proveedor, después usa [`POST /proveedores/{id}/usuarios`](#asignar-o-crear-usuario).

**Body:**
```json
{
  "nombre_empresa": "Mi Proveedora S.A.S",
  "nit": "900000001-1",
  "telefono": "3001234567",
  "email": "ventas@miproveedora.com",
  "direccion": "Calle 1 #2-3",
  "ciudad": "Bogotá",
  "departamento": "Cundinamarca",
  "descripcion": "Distribuidor de fertilizantes",
  "logo_url": null
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `nombre_empresa` | required, string, max:150 |
| `nit` | nullable, string, max:20, unique en `market_proveedores.nit` |
| `telefono` | required, string, max:20 |
| `email` | required, email, max:150, unique en `market_proveedores.email` |
| `direccion` | required, string, max:255 |
| `ciudad` | required, string, max:80 |
| `departamento` | required, string, max:80 |
| `descripcion` | nullable, string |
| `logo_url` | nullable, string, max:500 |

> ℹ️ **`departamento` y `ciudad`** se envían como **strings** (el nombre del departamento/municipio). El frontend debe poblar los selects con los endpoints de la sección [Paramétricas: Departamentos y Municipios](#paramétricas-departamentos-y-municipios) y enviar el campo `nombre` que retornan (no el `codigo`).

El campo `estado` se setea automáticamente a `'activo'` al crear.

**Respuesta 201:**
```json
{
  "message": "Proveedor 'Mi Proveedora S.A.S' creado exitosamente",
  "data": {
    "id": 2,
    "nombre_empresa": "Mi Proveedora S.A.S",
    "estado": "activo",
    "calificacion_promedio": "0.00",
    "total_ventas": 0,
    "...": "..."
  }
}
```

**Errores comunes:**
- `422` con `errors.email` → email duplicado.
- `422` con `errors.nit` → NIT duplicado.

---

### Detalle Proveedor

```
GET /api/v1/admin/market/proveedores/{id}
```

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "nombre_empresa": "AgroInsumos del Valle",
    "...": "...",
    "total_usuarios": 1,
    "total_productos": 6,
    "total_pedidos": 3,
    "proveedor_users": [
      {
        "id": 1,
        "proveedor_id": 1,
        "user_id": 5,
        "rol": "ADMIN",
        "estado": true,
        "user": {
          "id": 5,
          "name": "Admin AgroInsumos",
          "email": "admin@agroinsumosdelvalle.com",
          "status": true
        }
      }
    ]
  }
}
```

---

### Actualizar Proveedor

```
PUT /api/v1/admin/market/proveedores/{id}
```

**Body** (todos los campos son opcionales — solo se actualiza lo que envíes):
```json
{
  "telefono": "3009876543",
  "direccion": "Nueva dirección #100"
}
```

Las reglas de validación son las mismas que en `Crear`, pero usan `sometimes` y los `unique` excluyen el ID actual del proveedor.

**Respuesta 200:**
```json
{
  "message": "Proveedor actualizado correctamente",
  "data": { "...": "..." }
}
```

---

### Eliminar Proveedor

```
DELETE /api/v1/admin/market/proveedores/{id}
```

> 🛡️ Es un **soft delete** (se marca `deleted_at`, no se borra físicamente).
> Para borrar primero hay que cambiar el estado a `suspendido` o `inactivo` con el endpoint `toggle`.

**Respuesta 200:**
```json
{ "message": "Proveedor 'X' eliminado correctamente" }
```

**Respuesta 422** (si está activo):
```json
{
  "message": "No se puede eliminar un proveedor activo. Suspéndalo primero.",
  "code": "PROVIDER_ACTIVE"
}
```

---

### Toggle Estado

```
PATCH /api/v1/admin/market/proveedores/{id}/toggle
```

Cambia el estado del proveedor:
- `activo` → `suspendido`
- `suspendido` o `inactivo` → `activo`

**Respuesta 200:**
```json
{
  "message": "Proveedor 'X' ahora está suspendido",
  "data": { "...": "..." }
}
```

---

## Usuarios del Proveedor

> Los usuarios de un proveedor viven en la tabla global `users` y se vinculan al proveedor mediante el pivot `market_proveedor_user`. Un mismo `user_id` puede pertenecer a un solo proveedor (índice único `(proveedor_id, user_id)`).

### Listar Usuarios del Proveedor

```
GET /api/v1/admin/market/proveedores/{id}/usuarios
```

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 5,
      "name": "Admin AgroInsumos",
      "email": "admin@agroinsumosdelvalle.com",
      "status": true,
      "rol": "ADMIN",
      "estado": true,
      "asignado_at": "2026-05-13T10:30:00.000000Z"
    }
  ]
}
```

---

### Asignar o Crear Usuario

```
POST /api/v1/admin/market/proveedores/{id}/usuarios
```

Tiene **dos modos de uso** (excluyentes):

#### Modo A — Crear un usuario nuevo

```json
{
  "name": "Carlos Gómez",
  "email": "carlos@miproveedora.com",
  "password": "secreto123",
  "rol": "ADMIN"
}
```

Si el `email` ya existe en `users`, se **reutiliza** el usuario existente y se le vincula con el proveedor (no se sobreescriben sus datos).

#### Modo B — Asignar un usuario existente

```json
{
  "user_id": 7,
  "rol": "OPERADOR"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `user_id` | required_without:email, exists:users,id |
| `email` | required_without:user_id, email |
| `name` | required_with:email, string, max:255 |
| `password` | required_with:email, string, min:8 |
| `rol` | sometimes, in:`ADMIN`,`OPERADOR` (default: `ADMIN`) |

**Respuestas:**
- `201` — usuario asignado correctamente
- `200` con mensaje `"Usuario reactivado en el proveedor"` — el pivot ya existía pero estaba en `estado=false` y se reactivó
- `409` con código `USER_ALREADY_ASSIGNED` — el usuario ya está activo en ese proveedor
- `422` — fallo de validación

---

### Actualizar Usuario del Proveedor

```
PUT /api/v1/admin/market/proveedores/{id}/usuarios/{user_id}
```

Permite actualizar tanto los datos del `User` global (name, email, password) como los del pivot (`rol`, `estado`). Todos opcionales.

**Body:**
```json
{
  "name": "Carlos G.",
  "email": "carlos.nuevo@miproveedora.com",
  "password": "nuevoSecreto123",
  "rol": "OPERADOR",
  "estado": false
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `name` | sometimes, string, max:255 |
| `email` | sometimes, email, max:255, unique en `users.email` (excluye el user actual) |
| `password` | sometimes, nullable, string, min:8 |
| `rol` | sometimes, in:`ADMIN`,`OPERADOR` |
| `estado` | sometimes, boolean |

**Respuesta 200:**
```json
{
  "message": "Usuario actualizado en el proveedor",
  "data": {
    "user_id": 7,
    "name": "Carlos G.",
    "email": "carlos.nuevo@miproveedora.com",
    "rol": "OPERADOR",
    "estado": false
  }
}
```

**Errores:**
- `404` — el user no está vinculado al proveedor.

---

### Desvincular Usuario

```
DELETE /api/v1/admin/market/proveedores/{id}/usuarios/{user_id}
```

Elimina la fila del pivot `market_proveedor_user`. **No elimina** al `User` de la tabla global — el user sigue existiendo y podría asignarse a otro proveedor en el futuro.

**Respuesta 200:**
```json
{ "message": "Usuario removido del proveedor" }
```

**Respuesta 404:**
```json
{ "message": "El usuario no está asignado a este proveedor" }
```

---

## Paramétricas: Departamentos y Municipios

Para poblar los selects de **departamento** y **ciudad** del formulario de proveedor, usa los endpoints compartidos de ubicación. Están bajo `/api/v1/auth/*` y solo requieren `auth:api` (no piden `is_super_admin` ni `X-Tenant-Id`).

### Listar departamentos

```
GET /api/v1/auth/departamentos
```

**Respuesta 200:**
```json
{
  "data": [
    { "codigo": "05", "nombre": "Antioquia" },
    { "codigo": "11", "nombre": "Bogotá D.C." },
    { "codigo": "25", "nombre": "Cundinamarca" },
    { "codigo": "50", "nombre": "Meta" }
  ]
}
```

Datos ordenados alfabéticamente por `nombre`.

### Listar municipios de un departamento

```
GET /api/v1/auth/departamentos/{codigo}/municipios
```

Reemplaza `{codigo}` con el código DANE del departamento (ej: `50` para Meta).

**Respuesta 200:**
```json
{
  "data": [
    { "codigo": "50001", "nombre": "Villavicencio" },
    { "codigo": "50006", "nombre": "Acacías" },
    { "codigo": "50124", "nombre": "Cabuyaro" }
  ],
  "departamento": "Meta"
}
```

**Respuesta 404** (departamento inexistente):
```json
{ "message": "Departamento no encontrado" }
```

### Guía de uso en el form de proveedor

1. Al montar el form: hacer `GET /auth/departamentos` y poblar el select de departamento con `nombre` como opción visible.
2. Al cambiar la selección de departamento: hacer `GET /auth/departamentos/{codigo}/municipios` y poblar el select de ciudad/municipio.
3. Al enviar el form de proveedor (`POST` o `PUT`): mandar el **`nombre`** del departamento y del municipio en los campos `departamento` y `ciudad` respectivamente — **no el código DANE**. La BD almacena el nombre como string.

> 💡 **Cache recomendado** — los departamentos son estáticos (32 entradas). Cárgalos una sola vez al iniciar sesión y guárdalos en memoria/store del frontend. Los municipios pueden cachearse por departamento conforme el usuario los va seleccionando.

---

## Modelos de datos

### `MarketProveedor`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | int | PK |
| `nombre_empresa` | string(150) | Obligatorio |
| `nit` | string(20) \| null | Único cuando no es null |
| `telefono` | string(20) | Obligatorio |
| `email` | string(150) | Único, obligatorio |
| `direccion` | string(255) | Obligatorio |
| `ciudad` | string(80) | Obligatorio |
| `departamento` | string(80) | Obligatorio |
| `descripcion` | text \| null | Opcional |
| `logo_url` | string(500) \| null | Opcional |
| `estado` | enum | `activo` \| `inactivo` \| `suspendido` |
| `calificacion_promedio` | decimal(3,2) | Default `0.00` (read-only desde el panel) |
| `total_ventas` | unsigned int | Default `0` (read-only desde el panel) |
| `created_at`, `updated_at`, `deleted_at` | timestamps | `deleted_at` para soft delete |

### `MarketProveedorUser` (pivot)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | int | PK |
| `proveedor_id` | FK | → `market_proveedores.id` (cascadeOnDelete) |
| `user_id` | FK | → `users.id` (cascadeOnDelete) |
| `rol` | enum | `ADMIN` \| `OPERADOR` |
| `estado` | boolean | `true` activo, `false` desactivado |
| `created_at`, `updated_at` | timestamps | |

> Índice único `(proveedor_id, user_id)` — un user solo puede estar una vez en cada proveedor.

---

## Notas para el frontend

1. **Estados visuales** — usa colores claros para los 3 estados:
   - `activo` → verde
   - `suspendido` → naranja
   - `inactivo` → gris

2. **Flujo recomendado de creación**:
   1. POST `/proveedores` con los datos de la empresa.
   2. Una vez creado (recibes el `id`), abrir modal para crear/asignar el primer usuario admin via POST `/proveedores/{id}/usuarios` (Modo A).

3. **Toggle vs Delete**:
   - El botón "Suspender/Activar" llama `PATCH /proveedores/{id}/toggle`.
   - El botón "Eliminar" llama `DELETE /proveedores/{id}` — el backend devuelve `422` si está activo. Conviene desactivar el botón "Eliminar" en la UI cuando `estado === 'activo'` y mostrar tooltip "Suspéndalo primero".

4. **Buscador unificado** — el query param `buscar` busca simultáneamente en `nombre_empresa`, `nit` y `email`. No necesitas tres inputs distintos.

5. **Auditoría** — toda acción CRUD queda registrada en la tabla `auditorias` bajo los módulos `MARKET_PROVEEDORES` y `MARKET_PROVEEDOR_USERS`. Las puedes ver desde `GET /api/v1/admin/auditorias?modulo=MARKET_PROVEEDORES`.
