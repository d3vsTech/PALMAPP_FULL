# API — Portal Proveedor (Auth)

> Endpoints de autenticación del **Portal Proveedor del Marketplace**. Permiten que un usuario vinculado a una o más empresas proveedoras (tabla `market_proveedor_user`) inicie sesión, seleccione el proveedor con el que va a trabajar, refresque su sesión y recupere su contraseña.
>
> Este portal es **independiente** del panel super-admin (`/api/v1/auth`) y del panel finca/tenant (`/api/v1/tenant-auth`). Los super-admins no pueden iniciar sesión aquí.

**Base URL:** `{APP_URL}/api/v1/proveedor-auth`
**Auth:** JWT (en endpoints autenticados, header `Authorization: Bearer <token>`)
**Content-Type:** `application/json`

---

## Índice

1. [Códigos HTTP](#códigos-http)
2. [Flujo desde el frontend](#flujo-desde-el-frontend)
3. [Login](#login)
4. [Select Proveedor](#select-proveedor)
5. [Me](#me)
6. [Logout](#logout)
7. [Refresh](#refresh)
8. [Recuperar contraseña](#recuperar-contraseña)
9. [Estructura del JWT](#estructura-del-jwt)
10. [Reglas de elegibilidad](#reglas-de-elegibilidad)

---

## Códigos HTTP

| Código | Significado |
|--------|-------------|
| `200`  | OK — operación exitosa |
| `401`  | Credenciales inválidas o token inválido/expirado |
| `403`  | Cuenta inactiva (`USER_INACTIVE`), super-admin usando portal proveedor (`USE_ADMIN_LOGIN`), sin proveedores activos (`NO_PROVEEDORES_ACTIVOS`), proveedor sin acceso (`PROVEEDOR_ACCESS_DENIED`), proveedor inactivo (`PROVEEDOR_INACTIVE`) |
| `422`  | Validación fallida o token de reset inválido (`PASSWORD_RESET_FAILED`) |
| `500`  | Error del servidor |

---

## Flujo desde el frontend

```
1. POST /proveedor-auth/login (email + password)
   ├─ requires_proveedor_selection: false → guardar token, ir al dashboard
   └─ requires_proveedor_selection: true  → mostrar selector de proveedor

2. POST /proveedor-auth/select-proveedor (proveedor_id)
   └─ guardar nuevo token con claims proveedor_id + proveedor_role

3. Todas las requests subsecuentes al portal proveedor llevan:
   Authorization: Bearer {token}

4. Token cerca de expirar → POST /proveedor-auth/refresh

5. Cerrar sesión → POST /proveedor-auth/logout
```

> Si el backend responde `401`, el frontend debe intentar `refresh`; si falla, mandar a login.

---

## Login

```
POST /api/v1/proveedor-auth/login
```

**Body:**
```json
{
  "email": "admin@miproveedora.com",
  "password": "secreto123"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `email`    | required, email |
| `password` | required, string, min:6 |

### Caso A — Un solo proveedor activo (auto-select)

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "requires_proveedor_selection": false,
  "user": {
    "id": 5,
    "name": "Admin AgroInsumos",
    "email": "admin@agroinsumosdelvalle.com"
  },
  "proveedor": {
    "id": 1,
    "nombre_empresa": "AgroInsumos del Valle",
    "nit": "900123456-7",
    "email": "ventas@agroinsumosdelvalle.com",
    "telefono": "3157890123",
    "direccion": "Calle 15 #23-45",
    "ciudad": "Villavicencio",
    "departamento": "Meta",
    "descripcion": "Proveedor líder...",
    "logo_url": null,
    "estado": "activo"
  },
  "rol": "ADMIN"
}
```

El `token` ya incluye los claims `proveedor_id` y `proveedor_role`. El frontend puede usarlo inmediatamente.

### Caso B — Múltiples proveedores activos (debe elegir)

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "requires_proveedor_selection": true,
  "user": {
    "id": 5,
    "name": "Carlos Gómez",
    "email": "carlos@multiproveedor.com"
  },
  "proveedores": [
    {
      "id": 1,
      "nombre_empresa": "AgroInsumos del Valle",
      "nit": "900123456-7",
      "ciudad": "Villavicencio",
      "departamento": "Meta",
      "logo_url": null,
      "estado": "activo",
      "rol": "ADMIN"
    },
    {
      "id": 2,
      "nombre_empresa": "Fertilizantes del Llano",
      "nit": "900222333-9",
      "ciudad": "Acacías",
      "departamento": "Meta",
      "logo_url": null,
      "estado": "activo",
      "rol": "OPERADOR"
    }
  ]
}
```

El frontend muestra los proveedores y llama a [`POST /select-proveedor`](#select-proveedor) con la elección del usuario. Mientras tanto el `token` retornado **no incluye claims de proveedor** — sirve únicamente para llamar a `select-proveedor`.

### Errores

**401 — Credenciales inválidas:**
```json
{ "message": "Credenciales inválidas" }
```
> Se devuelve el mismo mensaje tanto si el email no existe como si el password está mal (anti-enumeración).

**403 — Cuenta inactiva:**
```json
{
  "message": "Su cuenta está inactiva, contacte al administrador",
  "code": "USER_INACTIVE"
}
```

**403 — Super-admin usando el portal proveedor:**
```json
{
  "message": "Use el panel de administración para iniciar sesión",
  "code": "USE_ADMIN_LOGIN"
}
```

**403 — Sin proveedores activos:**
```json
{
  "message": "No tiene proveedores activos asignados. Contacte al administrador.",
  "code": "NO_PROVEEDORES_ACTIVOS"
}
```

---

## Select Proveedor

```
POST /api/v1/proveedor-auth/select-proveedor
```

> Requiere `Authorization: Bearer <token>` con el token devuelto por `login` en el caso B.

**Body:**
```json
{ "proveedor_id": 2 }
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `proveedor_id` | required, integer, exists:market_proveedores,id |

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "proveedor": {
    "id": 2,
    "nombre_empresa": "Fertilizantes del Llano",
    "...": "..."
  },
  "rol": "OPERADOR"
}
```

El nuevo `token` incluye los claims `proveedor_id` y `proveedor_role`.

### Errores

**403 — Sin acceso a este proveedor:**
```json
{
  "message": "No tiene acceso a este proveedor",
  "code": "PROVEEDOR_ACCESS_DENIED"
}
```

**403 — Proveedor inactivo:**
```json
{
  "message": "El proveedor no está activo",
  "code": "PROVEEDOR_INACTIVE"
}
```

**422 — Validación:**
```json
{
  "message": "Datos de validación inválidos",
  "errors": { "proveedor_id": ["El proveedor no existe"] }
}
```

---

## Me

```
GET /api/v1/proveedor-auth/me
```

> Requiere JWT. Devuelve el usuario actual y la lista de proveedores activos a los que tiene acceso (útil para refrescar el selector si el usuario quiere cambiar de proveedor sin cerrar sesión).

**Respuesta 200:**
```json
{
  "user": {
    "id": 5,
    "name": "Admin AgroInsumos",
    "email": "admin@agroinsumosdelvalle.com"
  },
  "proveedores": [
    {
      "id": 1,
      "nombre_empresa": "AgroInsumos del Valle",
      "nit": "900123456-7",
      "ciudad": "Villavicencio",
      "departamento": "Meta",
      "logo_url": null,
      "estado": "activo",
      "rol": "ADMIN"
    }
  ]
}
```

---

## Logout

```
POST /api/v1/proveedor-auth/logout
```

> Requiere JWT. Invalida el token actual en el blacklist de JWT.

**Respuesta 200:**
```json
{ "message": "Sesión cerrada correctamente" }
```

---

## Refresh

```
POST /api/v1/proveedor-auth/refresh
```

> Requiere JWT (incluso si está expirado pero dentro del `refresh_ttl`). Devuelve un nuevo token; el viejo queda invalidado.

**Respuesta 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

> ⚠️ El refresh **no preserva** los claims personalizados `proveedor_id` y `proveedor_role`. Si el frontend necesita seguir trabajando con el mismo proveedor, debe volver a llamar a `select-proveedor` después del refresh. Esta es la misma limitación que el flujo de tenant-auth.

---

## Recuperar contraseña

El flujo es estándar: el usuario pide un enlace por email (`forgot-password`) y luego usa el token recibido para fijar una contraseña nueva (`reset-password`). El enlace del email apunta al portal del proveedor (`FRONTEND_PROVEEDOR_URL/reset-password?token=...&email=...`).

### Forgot Password

```
POST /api/v1/proveedor-auth/forgot-password
```

**Body:**
```json
{ "email": "admin@miproveedora.com" }
```

**Respuesta 200 (siempre, sin importar si el email existe):**
```json
{
  "message": "Si el correo está registrado como proveedor, recibirás un enlace de restablecimiento."
}
```

> 🛡️ **Anti-enumeración**: el endpoint nunca revela si el email existe, si está inactivo o si pertenece a un proveedor. Internamente solo envía el correo cuando se cumplen todas las condiciones:
> - el `email` existe en `users`,
> - `users.status = true`,
> - el user tiene al menos una fila `market_proveedor_user.estado = true` con `market_proveedores.estado = 'activo'`.
>
> En todos los otros casos no se envía nada, pero la respuesta al cliente es idéntica.

**Errores:**

- `422` — `email` ausente o con formato inválido.
- `500` — fallo en el mailer (`MAIL_ERROR`).

### Reset Password

```
POST /api/v1/proveedor-auth/reset-password
```

**Body:**
```json
{
  "token": "f4e8c2a1...",
  "email": "admin@miproveedora.com",
  "password": "nuevoSecreto2026",
  "password_confirmation": "nuevoSecreto2026"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `token`    | required, string |
| `email`    | required, email |
| `password` | required, string, min:8, confirmed |

**Respuesta 200:**
```json
{ "message": "Contraseña restablecida correctamente. Ya puedes iniciar sesión." }
```

**Respuesta 422 (token inválido/expirado o throttle):**
```json
{
  "message": "El enlace de restablecimiento es inválido o ha expirado.",
  "code": "PASSWORD_RESET_FAILED"
}
```

Mensajes según el motivo:

| Estado broker Laravel | Mensaje |
|---|---|
| `INVALID_TOKEN` | "El enlace de restablecimiento es inválido o ha expirado." |
| `INVALID_USER` | "No se encontró un usuario con ese correo." |
| `RESET_THROTTLED` | "Demasiados intentos. Por favor espera antes de intentar de nuevo." |

> El token expira a los **60 minutos** (`config('auth.passwords.users.expire')`) y solo puede usarse una vez. La cuenta queda con la nueva contraseña inmediatamente; el usuario puede entrar con `POST /proveedor-auth/login`.

---

## Estructura del JWT

Después de `login` (caso A) o `select-proveedor`, el JWT incluye los siguientes claims personalizados (además de los de Laravel/JWT-auth):

```json
{
  "sub": 5,
  "name": "Admin AgroInsumos",
  "is_super_admin": false,
  "proveedor_id": 1,
  "proveedor_role": "ADMIN",
  "iat": 1747000000,
  "exp": 1747003600
}
```

| Claim | Tipo | Significado |
|---|---|---|
| `proveedor_id`   | int    | ID del proveedor que el usuario seleccionó |
| `proveedor_role` | string | `ADMIN` o `OPERADOR` según la fila `market_proveedor_user.rol` |

> Estos claims **solo aparecen** en tokens que pasaron por `select-proveedor` o por `login` cuando hubo auto-selección.

---

## Reglas de elegibilidad

Para que un usuario pueda autenticarse en el portal proveedor, deben cumplirse simultáneamente:

1. `users.email` coincide con lo enviado.
2. `users.password` coincide con lo enviado (bcrypt).
3. `users.status = true`.
4. `users.is_super_admin = false`.
5. Existe al menos una fila en `market_proveedor_user` con:
   - `user_id = users.id`
   - `estado = true`
   - El proveedor relacionado (`market_proveedores`):
     - `estado = 'activo'`
     - `deleted_at IS NULL`

Si cualquiera de estas condiciones falla, la respuesta del login es `401` (credenciales) o `403` (USER_INACTIVE / USE_ADMIN_LOGIN / NO_PROVEEDORES_ACTIVOS) según corresponda.

---

## Notas para el frontend

1. **Persistencia del token**: guardarlo en `localStorage` o `sessionStorage` (no en cookies) — el backend valida exclusivamente el header `Authorization: Bearer`.
2. **Auto-selección vs selector visual**: si el response del login trae `requires_proveedor_selection: false`, ir directo al dashboard del proveedor. Si trae `true`, mostrar una pantalla de selección con `logo_url`, `nombre_empresa` y `rol` por tarjeta.
3. **Cambio de proveedor sin cerrar sesión**: el usuario puede volver al selector y llamar nuevamente a `select-proveedor` con otro `proveedor_id` de los listados en `/me`; eso genera un token nuevo con los claims del nuevo proveedor.
4. **Logo URL**: si `logo_url` no es null y no es absoluta, el frontend debe prefijarla con `${APP_URL}` (mismo patrón que el resto del marketplace).
5. **Sin `X-Tenant-Id`**: los endpoints del portal proveedor **no usan** el header `X-Tenant-Id` (que es del flujo de finca). Solo el `Authorization`.
6. **`is_super_admin = true`**: si el usuario es super-admin, el login rebota con `USE_ADMIN_LOGIN` — el frontend debe redirigirlo al panel de administración (`/api/v1/auth/login`).

---

## Auditoría

Las acciones del portal proveedor se registran en la tabla `auditorias` con `tenant_id = null`, módulo `AUTH`:

| Acción | Cuándo |
|---|---|
| `LOGIN_EXITOSO` | Login válido |
| `LOGIN_FALLIDO` | Email no existe, password incorrecto, user inactivo o sin proveedores activos |
| `LOGOUT` | Llamada a `/logout` |
| `CAMBIO_PASSWORD` | Reset password exitoso (observación menciona "portal proveedor") |
