# AGRO CAMPO — API de Autenticacion para Usuarios de Finca

**Base URL:** `http://agro-campo.test/api`

Todas las rutas protegidas requieren:
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

---

## Resumen de Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/api/v1/tenant-auth/login` | No | Login de usuarios de finca |
| POST | `/api/v1/tenant-auth/select-tenant` | JWT | Seleccionar finca (si tiene varias) |
| GET | `/api/v1/tenant-auth/me` | JWT | Perfil del usuario + fincas activas |
| POST | `/api/v1/tenant-auth/logout` | JWT | Cerrar sesion |
| POST | `/api/v1/tenant-auth/refresh` | JWT | Renovar token |
| POST | `/api/v1/auth/forgot-password` | No | Solicitar restablecimiento de contrasena |
| POST | `/api/v1/auth/reset-password` | No | Restablecer contrasena con token |

> **Nota:** El login de super admin sigue siendo `POST /api/v1/auth/login`. Los usuarios de finca usan `/api/v1/tenant-auth/login`.

---

## 1. Login (`/api/v1/tenant-auth/login`)

### Request

```
POST /api/v1/tenant-auth/login
```

**Body:**
```json
{
  "email": "juan@laesperanza.com",
  "password": "password"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `email` | string | Si | Email valido |
| `password` | string | Si | Min 6 caracteres |

### Validaciones que hace el backend

1. Verifica que el usuario exista
2. Verifica que la contrasena sea correcta
3. Verifica que el usuario este activo (`status = true`)
4. Verifica que NO sea super_admin (debe usar el otro login)
5. Busca las fincas (tenants) activas del usuario donde:
   - La asignacion del usuario este activa (`tenant_user.estado = true`)
   - La finca este en estado `ACTIVO`
   - La fecha de suspension no haya pasado (o sea nula)
6. Si no tiene fincas activas, retorna error

### Respuesta: Un solo tenant (auto-seleccion)

Si el usuario pertenece a **una sola finca activa**, el backend la selecciona automaticamente y retorna todo lo necesario para empezar a trabajar.

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "requires_tenant_selection": false,
  "user": {
    "id": 2,
    "name": "Juan Perez",
    "email": "juan@laesperanza.com"
  },
  "tenant": {
    "id": 1,
    "nombre": "Finca La Esperanza",
    "nit": "900123456-1",
    "plan": "PROFESIONAL"
  },
  "rol": "ADMIN",
  "permisos": ["cultivo.ver", "cultivo.crear", "empleados.ver", "..."],
  "modulos": {
    "jornales": true,
    "produccion": true,
    "vacaciones": true,
    "liquidacion": true,
    "insumos": false,
    "sync": false
  },
  "config_nomina": {
    "tipo_pago": "QUINCENAL",
    "salario_minimo": 1423500,
    "auxilio_transporte": 200000,
    "metodo_cosecha_default": "HOMOGENEO"
  }
}
```

> **Importante:** Cuando `requires_tenant_selection` es `false`, el token ya incluye `tenant_id` y `tenant_role` en los claims JWT. Se puede usar directamente para las rutas de negocio (`/api/v1/*`) enviando tambien el header `X-Tenant-Id`.

### Respuesta: Multiples tenants (requiere seleccion)

Si el usuario pertenece a **varias fincas activas**, el backend retorna la lista para que el frontend muestre una pantalla de seleccion.

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "requires_tenant_selection": true,
  "user": {
    "id": 5,
    "name": "Carlos Rodriguez",
    "email": "carlos@ejemplo.com"
  },
  "tenants": [
    {
      "id": 1,
      "nombre": "Finca La Esperanza",
      "nit": "900123456-1",
      "plan": "PROFESIONAL",
      "rol": "ADMIN"
    },
    {
      "id": 3,
      "nombre": "Finca El Progreso",
      "nit": "800999888-1",
      "plan": "BASICO",
      "rol": "LIDER DE CAMPO"
    }
  ]
}
```

> **Importante:** Cuando `requires_tenant_selection` es `true`, el token es un token base (sin tenant). El frontend **debe** llamar a `/api/v1/tenant-auth/select-tenant` para obtener un token con la finca seleccionada.

### Errores

| Codigo | Code | Mensaje |
|--------|------|---------|
| 401 | — | Credenciales invalidas |
| 403 | `USER_INACTIVE` | Su cuenta esta inactiva, contacte al administrador |
| 403 | `USE_ADMIN_LOGIN` | Use el panel de administracion para iniciar sesion |
| 403 | `NO_ACTIVE_TENANTS` | No tiene fincas activas asignadas. Contacte al administrador. |
| 422 | — | Datos de validacion invalidos |

---

## 2. Seleccionar Finca (`/api/v1/tenant-auth/select-tenant`)

Se usa cuando el login retorna `requires_tenant_selection: true`. El usuario elige una finca de la lista.

### Request

```
POST /api/v1/tenant-auth/select-tenant
```

> Requiere: `Authorization: Bearer {token}` (el token base del login)

**Body:**
```json
{
  "tenant_id": 1
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tenant_id` | integer | Si | ID de la finca a seleccionar |

### Respuesta 200

```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "tenant_id": 1,
  "tenant_nombre": "Finca La Esperanza",
  "rol": "ADMIN",
  "permisos": ["cultivo.ver", "cultivo.crear", "..."],
  "modulos": {
    "jornales": true,
    "produccion": true,
    "vacaciones": true,
    "liquidacion": true,
    "insumos": false,
    "sync": false
  },
  "config_nomina": {
    "tipo_pago": "QUINCENAL",
    "salario_minimo": 1423500,
    "auxilio_transporte": 200000,
    "metodo_cosecha_default": "HOMOGENEO"
  }
}
```

> **Importante:** Este nuevo token reemplaza al anterior. Tiene `tenant_id` y `tenant_role` en los claims. Usarlo para todas las peticiones siguientes.

### Errores

| Codigo | Code | Mensaje |
|--------|------|---------|
| 403 | `TENANT_ACCESS_DENIED` | No tiene acceso a esta finca |
| 403 | `TENANT_INACTIVE` | La finca no esta activa |
| 403 | `TENANT_SUSPENDED` | La suscripcion de esta finca ha expirado |

---

## 3. Perfil del Usuario (`/api/v1/tenant-auth/me`)

Retorna los datos del usuario autenticado y la lista de fincas activas (filtrando las suspendidas/expiradas).

### Cuando usar este endpoint

- **Al recargar la pagina (F5):** El frontend pierde el estado en memoria (Pinia/Vuex/Redux). Si el token sigue en localStorage, llamar a `/me` para recuperar los datos del usuario y la lista de fincas sin hacer login de nuevo.
- **Al volver a la app despues de un rato:** El usuario cierra la pestana y vuelve horas despues. El frontend verifica si el token sigue valido llamando a `/me`. Si responde 200 el usuario sigue autenticado; si responde 401 redirigir al login.
- **Para verificar fincas disponibles:** Si un admin agrega o quita al usuario de una finca mientras esta logueado, al llamar `/me` obtiene la lista actualizada de tenants.

En resumen: es el endpoint que el frontend usa para **rehidratar la sesion** sin pedirle credenciales al usuario otra vez.

### Request

```
GET /api/v1/tenant-auth/me
```

> Requiere: `Authorization: Bearer {token}`

### Respuesta 200

```json
{
  "user": {
    "id": 2,
    "name": "Juan Perez",
    "email": "juan@laesperanza.com"
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

## 4. Logout (`/api/v1/tenant-auth/logout`)

Invalida el token JWT actual.

### Request

```
POST /api/v1/tenant-auth/logout
```

> Requiere: `Authorization: Bearer {token}`

### Respuesta 200

```json
{
  "message": "Sesion cerrada correctamente"
}
```

---

## 5. Refresh Token (`/api/v1/tenant-auth/refresh`)

Renueva el token JWT antes de que expire.

### Request

```
POST /api/v1/tenant-auth/refresh
```

> Requiere: `Authorization: Bearer {token}`

### Respuesta 200

```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 2,
    "name": "Juan Perez",
    "email": "juan@laesperanza.com",
    "is_super_admin": false
  }
}
```

> **Tip para el frontend:** Implementar un interceptor que detecte respuestas 401 y automaticamente llame a `/refresh`. Si el refresh tambien falla, redirigir al login.

---

## 6. Solicitar Restablecimiento de Contrasena (`/api/v1/auth/forgot-password`)

Envia un correo con un enlace para restablecer la contrasena. Este endpoint es **publico** y funciona tanto para usuarios de finca como para super admins.

### Request

```
POST /api/v1/auth/forgot-password
```

**Body:**
```json
{
  "email": "juan@laesperanza.com"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `email` | string | Si | Email valido |

### Respuesta 200

```json
{
  "message": "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena."
}
```

> **Nota de seguridad:** La respuesta es siempre la misma sin importar si el correo existe o no. Esto es intencional para no revelar que correos estan registrados en el sistema.

### El correo que recibe el usuario

El usuario recibe un email con:
- Asunto: "Restablecer contrasena — Agro Campo"
- Un boton/enlace que apunta a: `{FRONTEND_URL}/reset-password?token={token}&email={email}`
- El enlace expira en **60 minutos** (configurable en el backend)

> **Para el frontend:** Debes crear una ruta `/reset-password` que lea los query params `token` y `email` de la URL y muestre el formulario de nueva contrasena.

---

## 7. Restablecer Contrasena (`/api/v1/auth/reset-password`)

Cambia la contrasena del usuario usando el token recibido por correo.

### Request

```
POST /api/v1/auth/reset-password
```

**Body:**
```json
{
  "token": "abc123...",
  "email": "juan@laesperanza.com",
  "password": "nuevaContrasena123",
  "password_confirmation": "nuevaContrasena123"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `token` | string | Si | Token recibido por correo |
| `email` | string | Si | Email del usuario |
| `password` | string | Si | Min 8 caracteres |
| `password_confirmation` | string | Si | Debe coincidir con `password` |

### Respuesta 200 (exito)

```json
{
  "message": "Contrasena restablecida correctamente. Ya puedes iniciar sesion."
}
```

### Errores

| Codigo | Mensaje |
|--------|---------|
| 422 | El enlace de restablecimiento es invalido o ha expirado. |
| 422 | No se encontro un usuario con ese correo. |
| 422 | Demasiados intentos. Por favor espera antes de intentar de nuevo. |
| 422 | Las contrasenas no coinciden. (validacion) |
| 422 | La contrasena debe tener al menos 8 caracteres. (validacion) |

---

## Flujo Completo — Diagrama para el Frontend

### Flujo de Login

```
Usuario ingresa email + contrasena
              |
              v
    POST /tenant-auth/login
              |
              v
    ¿requires_tenant_selection?
         |              |
       false           true
         |              |
         v              v
  Guardar token    Mostrar pantalla
  + tenant info    "Seleccionar Finca"
  + permisos             |
  + modulos              v
         |        Usuario elige finca
         |              |
         |              v
         |    POST /tenant-auth/select-tenant
         |              |
         |              v
         |       Guardar nuevo token
         |       + tenant info
         |       + permisos
         |       + modulos
         |              |
         v              v
    ┌─────────────────────────┐
    │   DASHBOARD DE FINCA    │
    │                         │
    │  Headers para cada      │
    │  peticion:              │
    │  - Authorization: Bearer│
    │  - X-Tenant-Id: {id}   │
    └─────────────────────────┘
```

### Flujo de Recuperar Contrasena

```
Usuario hace clic en "Olvide mi contrasena"
              |
              v
    Formulario: pide email
              |
              v
    POST /auth/forgot-password
              |
              v
    Mostrar: "Revisa tu correo"
              |
              v
    Usuario abre email → clic en enlace
              |
              v
    Frontend: /reset-password?token=xxx&email=yyy
              |
              v
    Formulario: nueva contrasena + confirmar
              |
              v
    POST /auth/reset-password
    { token, email, password, password_confirmation }
              |
              v
    ¿Exito? → Redirigir al login
    ¿Error? → Mostrar mensaje de error
```

---

## Que guardar en el frontend (localStorage/store)

Despues de un login exitoso o select-tenant, guardar:

```javascript
// Almacenamiento sugerido
{
  token: "eyJ0eXAi...",           // JWT para Authorization header
  user: { id, name, email },      // Datos del usuario
  tenant: { id, nombre, nit },    // Finca seleccionada
  rol: "ADMIN",                   // Rol en la finca
  permisos: ["cultivo.ver", ...], // Permisos granulares (Spatie)
  modulos: { jornales: true, ...},// Modulos habilitados
  config_nomina: { ... }          // Config de nomina
}
```

### Uso de `permisos` en el frontend

```javascript
// Ejemplo: mostrar/ocultar elementos segun permisos
const puedeCrearEmpleados = permisos.includes('empleados.crear');
const puedeVerNomina = permisos.includes('nomina.ver');
```

### Uso de `modulos` en el frontend

```javascript
// Ejemplo: mostrar/ocultar secciones del menu
if (modulos.jornales) { /* mostrar menu jornales */ }
if (modulos.vacaciones) { /* mostrar menu vacaciones */ }
```

---

## Headers necesarios para rutas de negocio

Una vez autenticado y con tenant seleccionado, todas las peticiones a `/api/v1/*` deben llevar:

```
Authorization: Bearer {token_con_tenant}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
Accept: application/json
```

---

## Usuarios de prueba

| Rol | Email | Password | Finca |
|-----|-------|----------|-------|
| Admin Finca | `juan@laesperanza.com` | `password` | Finca La Esperanza |
| Lider de Campo | `carlos@laesperanza.com` | `password` | Finca La Esperanza |
| Propietario | `maria@laesperanza.com` | `password` | Finca La Esperanza |

> **Super Admin** (`devs@d3vs.tech` / `password123`) NO funciona en `/tenant-auth/login`. Debe usar `/auth/login`.

---

## Codigos de error JWT

Estos errores pueden ocurrir en **cualquier ruta protegida**:

```json
{ "message": "Token expirado", "code": "TOKEN_EXPIRED" }       // 401
{ "message": "Token invalido", "code": "TOKEN_INVALID" }       // 401
{ "message": "Token no proporcionado", "code": "TOKEN_ABSENT" } // 401
```

**Manejo sugerido:**
- `TOKEN_EXPIRED` → Intentar refresh. Si falla → logout.
- `TOKEN_INVALID` → Logout inmediato.
- `TOKEN_ABSENT` → Redirigir al login.

---

## Ejemplo cURL completo

### Paso 1: Login

```bash
curl -X POST http://agro-campo.test/api/v1/tenant-auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email": "juan@laesperanza.com", "password": "password"}'
```

### Paso 2: Si requiere seleccion de tenant

```bash
curl -X POST http://agro-campo.test/api/v1/tenant-auth/select-tenant \
  -H "Authorization: Bearer {TOKEN_DEL_LOGIN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"tenant_id": 1}'
```

### Paso 3: Consultar perfil

```bash
curl -X GET http://agro-campo.test/api/v1/tenant-auth/me \
  -H "Authorization: Bearer {TOKEN_CON_TENANT}" \
  -H "Accept: application/json"
```

### Solicitar reset de contrasena

```bash
curl -X POST http://agro-campo.test/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email": "juan@laesperanza.com"}'
```

### Restablecer contrasena

```bash
curl -X POST http://agro-campo.test/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "token": "TOKEN_DEL_CORREO",
    "email": "juan@laesperanza.com",
    "password": "nuevaContrasena123",
    "password_confirmation": "nuevaContrasena123"
  }'
```

---

## Variable de entorno requerida

El backend usa `FRONTEND_URL` para construir el enlace del correo de restablecimiento. Debe estar definida en el `.env` del backend:

```env
FRONTEND_URL=http://localhost:3000
```

El enlace del correo apuntara a: `{FRONTEND_URL}/reset-password?token=xxx&email=yyy`
