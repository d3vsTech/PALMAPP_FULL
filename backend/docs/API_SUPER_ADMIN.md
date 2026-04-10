# AGRO CAMPO — Guia de consumo API (Super Admin)

**Base URL:** `http://agro-campo.test/api`

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

---

## Usuarios de prueba (Seeders)

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | `devs@d3vs.tech` | `password123` |
| Admin Finca | `juan@laesperanza.com` | `password` |
| Lider de Campo | `carlos@laesperanza.com` | `password` |
| Propietario | `maria@laesperanza.com` | `password` |

**Tenant demo:** Finca La Esperanza (ID: 1)

---

## 1. Autenticacion (`/api/v1/auth`)

### 1.1 Login

```
POST /api/v1/auth/login
```

**Body:**
```json
{
  "email": "devs@d3vs.tech",
  "password": "password123"
}
```

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "Super Admin D3VS",
    "email": "devs@d3vs.tech",
    "is_super_admin": true
  }
}
```

**Errores:**
- `401` — Credenciales invalidas o usuario inactivo
- `422` — Validacion fallida

---


### 1.3 Me (perfil del usuario autenticado)

```
GET /api/v1/auth/me
```

> Requiere: `Authorization: Bearer {token}`

**Respuesta 200:**
```json
{
  "user": {
    "id": 1,
    "name": "Super Admin D3VS",
    "email": "devs@d3vs.tech",
    "is_super_admin": true,
    "status": true,
    "active_tenants": [...]
  },
  "tenants": [
    {
      "id": 1,
      "nombre": "Finca La Esperanza",
      "nit": "900123456-1",
      "plan": "PROFESIONAL",
      "rol": "ADMIN"
    }
  ]
}
```

---

### 1.4 Select Tenant

```
POST /api/v1/auth/select-tenant
```

> Requiere: `Authorization: Bearer {token}`

**Body:**
```json
{
  "tenant_id": 1
}
```

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "tenant_id": 1,
  "tenant_nombre": "Finca La Esperanza",
  "rol": "ADMIN",
  "permisos": ["cultivo.ver", "cultivo.crear", "..."],
  "modulos": { "usa_jornales": true, "usa_produccion": true, "..." },
  "config_nomina": { "tipo_pago_nomina": "QUINCENAL", "..." }
}
```

> **Importante:** El token retornado incluye `tenant_id` en los claims JWT. Usalo para las rutas de negocio (`/api/v1/*`).

**Errores:**
- `403` — No tiene acceso al tenant

---

### 1.5 Refresh Token

```
POST /api/v1/auth/refresh
```

> Requiere: `Authorization: Bearer {token}`

**Respuesta 200:** Misma estructura que login con un nuevo token.

---

### 1.6 Logout

```
POST /api/v1/auth/logout
```

> Requiere: `Authorization: Bearer {token}`

**Respuesta 200:**
```json
{
  "message": "Sesion cerrada correctamente"
}
```

---

## 2. Super Admin — Dashboard (`/api/admin`)

> Todas las rutas de esta seccion requieren: `auth:api` + `super_admin`

### 2.1 Dashboard

```
GET /api/admin/dashboard
```

**Respuesta 200:**
```json
{
  "data": {
    "tenants": {
      "total": 1,
      "activos": 1,
      "suspendidos": 0,
      "inactivos": 0
    },
    "usuarios": {
      "total": 4,
      "activos": 4,
      "super_admins": 1
    },
    "asignaciones": {
      "total": 3,
      "por_rol": {
        "ADMIN": 1,
        "LIDER DE CAMPO": 1,
        "PROPIETARIO": 1
      }
    },
    "tenants_recientes": [
      {
        "id": 1,
        "nombre": "Finca La Esperanza",
        "nit": "900123456-1",
        "estado": "ACTIVO",
        "plan": "PROFESIONAL",
        "created_at": "2026-03-05T..."
      }
    ]
  }
}
```

---

## 3. Super Admin — Tenants (Fincas)

### 3.1 Listar Tenants

```
GET /api/admin/tenants
```

**Query params (opcionales):**

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `search` | string | Busca en nombre, NIT, razon social |
| `estado` | string | `ACTIVO`, `INACTIVO`, `SUSPENDIDO` |
| `plan` | string | `BASICO`, `PROFESIONAL`, `ENTERPRISE` |
| `sort_by` | string | Campo de orden (default: `nombre`) |
| `sort_dir` | string | `asc` o `desc` (default: `asc`) |
| `per_page` | integer | Items por pagina (default: 15) |

**Ejemplo:**
```
GET /api/admin/tenants?search=esperanza&estado=ACTIVO&per_page=10
```

**Respuesta 200:** Paginacion estandar de Laravel con `data`, `links`, `meta`.

---

### 3.2 Crear Tenant

```
POST /api/admin/tenants
```

**Body:**
```json
{
  "nombre": "Finca Nueva",
  "nit": "800999888-1",
  "razon_social": "Agricola Nueva S.A.S",
  "correo_contacto": "contacto@nueva.com",
  "telefono": "3009876543",
  "direccion": "Vereda La Nueva, Km 3",
  "departamento": "Casanare",
  "municipio": "Yopal",
  "plan": "BASICO",
  "max_empleados": 50,
  "max_usuarios": 5,
  "usa_jornales": true,
  "usa_produccion": false,
  "tipo_pago_nomina": "MENSUAL",
  "moneda": "COP",
  "zona_horaria": "America/Bogota",
  "pais": "CO",
  "metodo_cosecha_default": "HOMOGENEO",
  "salario_minimo_vigente": 1423500.00,
  "auxilio_transporte": 200000.00,
  "modulo_vacaciones": true,
  "modulo_liquidacion": false,
  "modulo_insumos": true,
  "sync_habilitado": false
}
```

| Campo | Requerido | Notas |
|-------|-----------|-------|
| `nombre` | **Si** | Max 100 chars |
| `nit` | No | Unico, max 20 |
| `plan` | No | `BASICO`, `PROFESIONAL`, `ENTERPRISE` |
| Campos de config | No | Tienen valores por defecto |

**Respuesta 201:**
```json
{
  "message": "Finca 'Finca Nueva' creada exitosamente",
  "data": { "id": 2, "nombre": "Finca Nueva", "config": { "..." } }
}
```

---

### 3.3 Ver Detalle de Tenant

```
GET /api/admin/tenants/{id}
```

**Ejemplo:** `GET /api/admin/tenants/1`

**Respuesta 200:**
```json
{
  "data": {
    "id": 1,
    "nombre": "Finca La Esperanza",
    "nit": "900123456-1",
    "config": { "..." },
    "tenant_users": [
      { "user": { "id": 2, "name": "Juan Perez" }, "rol": "ADMIN" }
    ],
    "total_usuarios": 3,
    "total_empleados": 0
  },
  "modulos": { "usa_jornales": true, "..." },
  "config_nomina": { "tipo_pago_nomina": "QUINCENAL", "..." }
}
```

---

### 3.4 Actualizar Tenant

```
PUT /api/admin/tenants/{id}
```

**Body (solo campos a modificar):**
```json
{
  "nombre": "Finca La Esperanza Actualizada",
  "plan": "ENTERPRISE",
  "max_empleados": 200,
  "modulo_vacaciones": false
}
```

**Respuesta 200:**
```json
{
  "message": "Finca actualizada correctamente",
  "data": { "..." }
}
```

---

### 3.5 Eliminar Tenant (soft delete)

```
DELETE /api/admin/tenants/{id}
```

> Solo se puede eliminar si el tenant NO esta ACTIVO. Primero suspenderlo.

**Respuesta 200:**
```json
{
  "message": "Finca 'Finca X' eliminada correctamente"
}
```

**Error 422:**
```json
{
  "message": "No se puede eliminar un tenant activo. Suspendalo primero.",
  "code": "TENANT_ACTIVE"
}
```

---

### 3.6 Toggle Activar/Suspender Tenant

```
PATCH /api/admin/tenants/{id}/toggle
```

Alterna entre `ACTIVO` y `SUSPENDIDO`.

**Respuesta 200:**
```json
{
  "message": "Finca 'Finca La Esperanza' ahora esta SUSPENDIDO",
  "data": { "..." }
}
```

---

## 4. Super Admin — Usuarios de un Tenant

### 4.1 Listar Usuarios del Tenant

```
GET /api/admin/tenants/{tenant_id}/users
```

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 2,
      "name": "Juan Perez",
      "email": "juan@laesperanza.com",
      "status": true,
      "rol": "ADMIN",
      "estado": true,
      "asignado_at": "2026-03-05T..."
    }
  ]
}
```

---

### 4.2 Agregar Usuario a un Tenant

```
POST /api/admin/tenants/{tenant_id}/users
```

**Flujo interno del endpoint:**

```
Request llega con email o user_id
        |
        v
  ¿Envio user_id? ──SI──> Usa ese usuario directamente
        |
       NO
        |
        v
  Busca usuario por email
        |
        v
  ¿Existe? ──SI──> Usa el usuario encontrado
        |
       NO
        |
        v
  Crea usuario nuevo (name, email, password)
        |
        v
  ¿Ya esta asignado al tenant?
        |              |
       SI             NO
        |              |
        v              v
  ¿Esta inactivo?   Crea TenantUser
   SI → Reactiva     (tenant_id, user_id, rol)
   NO → Error 409    → 201 Created
```

**Opcion A — Asignar usuario existente por ID:**
```json
{
  "user_id": 3,
  "rol": "LIDER DE CAMPO"
}
```

**Opcion B — Asignar por email (lo crea si no existe):**
```json
{
  "email": "nuevo@finca.com",
  "name": "Pedro Lopez",
  "password": "secreto123",
  "rol": "ADMIN"
}
```

> Si el email ya existe en la tabla `users`, no crea un usuario nuevo, solo lo asigna al tenant.
> Si el email no existe, primero crea el usuario y luego lo asigna.

| Campo | Requerido | Notas |
|-------|-----------|-------|
| `user_id` | Si (sin email) | ID de usuario existente |
| `email` | Si (sin user_id) | Email — si no existe, crea el usuario |
| `name` | Si (con email) | Nombre del nuevo usuario |
| `password` | Si (con email) | Min 8 chars |
| `rol` | **Si** | `ADMIN`, `LIDER DE CAMPO`, `PROPIETARIO` |

**Respuesta 201:**
```json
{
  "message": "Usuario asignado a la finca correctamente"
}
```

**Respuesta 200 (reactivacion):**
```json
{
  "message": "Usuario reactivado en el tenant"
}
```

> Si el usuario estaba asignado pero inactivo (`estado: false`), se reactiva con el nuevo rol enviado.

**Errores:**
- `409` — Usuario ya asignado y activo (`USER_ALREADY_ASSIGNED`)
- `422` — Limite de usuarios del plan alcanzado (`MAX_USERS_REACHED`)
- `422` — Error de validacion (campos faltantes o invalidos)

---

### 4.3 Actualizar Rol/Estado de Usuario en Tenant

```
PUT /api/admin/tenants/{tenant_id}/users/{user_id}
```

**Body:**
```json
{
  "rol": "ADMIN",
  "estado": false
}
```

---

### 4.4 Remover Usuario de un Tenant

```
DELETE /api/admin/tenants/{tenant_id}/users/{user_id}
```

**Respuesta 200:**
```json
{
  "message": "Usuario removido de la finca"
}
```

---

## 5. Super Admin — Usuarios Globales

### 5.1 Listar Usuarios

```
GET /api/admin/users
```

**Query params (opcionales):**

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `search` | string | Busca en nombre y email |
| `status` | boolean | `true` o `false` |
| `is_super_admin` | boolean | `true` o `false` |
| `per_page` | integer | Items por pagina (default: 15) |

**Ejemplo:**
```
GET /api/admin/users?search=juan&status=true&per_page=10
```

---

### 5.2 Ver Detalle de Usuario

```
GET /api/admin/users/{id}
```

**Respuesta 200:**
```json
{
  "data": {
    "id": 2,
    "name": "Juan Perez",
    "email": "juan@laesperanza.com",
    "is_super_admin": false,
    "status": true,
    "created_at": "2026-03-05T...",
    "tenants": [
      {
        "tenant_id": 1,
        "nombre": "Finca La Esperanza",
        "nit": "900123456-1",
        "estado_tenant": "ACTIVO",
        "plan": "PROFESIONAL",
        "rol": "ADMIN",
        "estado": true
      }
    ]
  }
}
```

---

### 5.3 Crear Usuario

```
POST /api/admin/users
```

**Body:**
```json
{
  "name": "Nuevo Admin",
  "email": "admin2@d3vs.tech",
  "password": "password123",
  "is_super_admin": true,
  "status": true
}
```

| Campo | Requerido | Notas |
|-------|-----------|-------|
| `name` | **Si** | Max 255 |
| `email` | **Si** | Unico |
| `password` | **Si** | Min 8 |
| `is_super_admin` | No | Default: `false` |
| `status` | No | Default: `true` |

---

### 5.4 Actualizar Usuario

```
PUT /api/admin/users/{id}
```

**Body (solo campos a modificar):**
```json
{
  "name": "Nombre Actualizado",
  "email": "nuevo@email.com",
  "password": "nuevapass123",
  "is_super_admin": false,
  "status": true
}
```

---

### 5.5 Toggle Activar/Desactivar Usuario

```
PATCH /api/admin/users/{id}/toggle
```

Alterna el campo `status` entre `true` y `false`.

> No se puede desactivar la propia cuenta del usuario autenticado.

**Respuesta 200:**
```json
{
  "message": "Usuario desactivado",
  "data": { "..." }
}
```

---

## Flujo completo de ejemplo (cURL)

### Paso 1: Login como Super Admin

```bash
curl -X POST http://agro-campo.test/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "devs@d3vs.tech", "password": "password123"}'
```

### Paso 2: Usar el token para consultar el dashboard

```bash
curl -X GET http://agro-campo.test/api/admin/dashboard \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

### Paso 3: Listar tenants

```bash
curl -X GET http://agro-campo.test/api/admin/tenants \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

### Paso 4: Crear un nuevo tenant

```bash
curl -X POST http://agro-campo.test/api/admin/tenants \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Finca El Progreso",
    "nit": "800111222-3",
    "plan": "BASICO",
    "max_empleados": 30,
    "max_usuarios": 3
  }'
```

### Paso 5: Agregar un usuario al tenant

```bash
curl -X POST http://agro-campo.test/api/admin/tenants/2/users \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pedro@elprogreso.com",
    "name": "Pedro Ramirez",
    "password": "secreto123",
    "rol": "ADMIN"
  }'
```

---

## Codigos de error comunes

| Codigo | Significado |
|--------|-------------|
| `401` | Token ausente, expirado o invalido |
| `403` | No tiene permisos (no es super_admin o no tiene acceso al tenant) |
| `404` | Recurso no encontrado |
| `409` | Conflicto (ej: usuario ya asignado) |
| `422` | Error de validacion |

### Respuestas JWT especificas

```json
{ "message": "Token expirado", "code": "TOKEN_EXPIRED" }
{ "message": "Token invalido", "code": "TOKEN_INVALID" }
{ "message": "Token no proporcionado", "code": "TOKEN_ABSENT" }
```
