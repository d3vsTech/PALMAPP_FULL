# API — Perfil del Usuario de Proveedor (Portal Proveedor)

Endpoints para que **cualquier usuario logueado del portal del marketplace** (rol `ADMIN` u `OPERADOR`) edite sus propios datos personales (nombre, correo) y cambie su contraseña. Es el equivalente del flujo `PUT /api/v1/tenant/perfil` / `PUT /api/v1/tenant/perfil/password` pero para el portal proveedor.

**Base URL:** `{APP_URL}/api/v1/market/proveedor`
**Auth:** JWT con claim `proveedor_id` (header `Authorization: Bearer <token>`).
**Middleware:** `auth:api` + `SetProveedor` — el proveedor activo se infiere del token, no hace falta enviar `X-Tenant-Id`.
**Content-Type:** `application/json`

> Para obtener el token con `proveedor_id`, primero llamar `POST /api/v1/proveedor-auth/login` y luego `POST /api/v1/proveedor-auth/select-proveedor`.

---

## Índice

1. [Permisos](#permisos)
2. [Editar perfil](#editar-perfil)
3. [Cambiar contraseña](#cambiar-contraseña)
4. [Códigos HTTP y de error](#códigos-http-y-de-error)
5. [Auditoría](#auditoría)
6. [Notas para el frontend](#notas-para-el-frontend)

---

## Permisos

A diferencia del resto del portal (donde escribir suele requerir rol `ADMIN`), estos endpoints son accesibles para **cualquier usuario autenticado** sin importar su rol en el pivot `market_proveedor_user`. Cada quien edita sus propios datos del modelo global `User`.

| Acción | ADMIN | OPERADOR |
|--------|-------|----------|
| `PUT /perfil` | ✅ | ✅ |
| `PUT /perfil/password` | ✅ | ✅ |

> Estos endpoints **no modifican** la tabla pivot `market_proveedor_user` ni el campo `rol` ni `estado` del usuario dentro del proveedor — esos cambios siguen siendo competencia exclusiva del superadmin (`PUT /api/v1/admin/market/proveedores/{id}/usuarios/{user_id}`).

---

## Editar perfil

```
PUT /api/v1/market/proveedor/perfil
```

Actualiza `name` y/o `email` del usuario autenticado. Ambos campos son opcionales — solo se actualiza lo que envíes. El `email` se valida como único en `users.email` excluyendo al propio usuario.

**Body (todos los campos son opcionales):**
```json
{
  "name":  "Carlos G. Gómez",
  "email": "carlos.nuevo@miproveedora.com"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `name` | sometimes, string, max:255 |
| `email` | sometimes, email, max:255, unique:users,email (excluye el user actual) |

**Respuesta 200:**
```json
{
  "message": "Perfil actualizado correctamente",
  "data": {
    "id":    7,
    "name":  "Carlos G. Gómez",
    "email": "carlos.nuevo@miproveedora.com"
  }
}
```

**Respuesta 422 — body vacío:**
```json
{
  "message": "No se enviaron datos para actualizar",
  "code":    "NO_DATA"
}
```

**Respuesta 422 — validación:**
```json
{
  "message": "Error de validación",
  "errors": {
    "email": ["Ya existe un usuario con este correo electrónico"]
  }
}
```

---

## Cambiar contraseña

```
PUT /api/v1/market/proveedor/perfil/password
```

Cambia la contraseña del usuario autenticado. Requiere la contraseña actual para validar y rechaza la nueva si coincide con la actual.

**Body:**
```json
{
  "current_password":      "passwordActualSecreto",
  "password":              "nuevoPasswordSeguro123",
  "password_confirmation": "nuevoPasswordSeguro123"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `current_password` | required, string |
| `password` | required, string, min:8, confirmed (debe coincidir con `password_confirmation`) |

**Respuesta 200:**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

**Respuesta 422 — contraseña actual incorrecta:**
```json
{
  "message": "La contraseña actual es incorrecta",
  "code":    "INVALID_CURRENT_PASSWORD"
}
```

**Respuesta 422 — nueva contraseña igual a la actual:**
```json
{
  "message": "La nueva contraseña debe ser diferente a la actual",
  "code":    "SAME_PASSWORD"
}
```

**Respuesta 422 — confirmación no coincide:**
```json
{
  "message": "Error de validación",
  "errors": {
    "password": ["La confirmación de contraseña no coincide"]
  }
}
```

> 🔒 La nueva contraseña se guarda con `Hash::make()` (bcrypt). Ni la actual ni la nueva se devuelven en la respuesta, ni quedan en el registro de auditoría.

---

## Códigos HTTP y de error

| Code | HTTP | Descripción |
|------|------|-------------|
| `PROVEEDOR_NOT_SELECTED` | 422 | Token sin claim `proveedor_id`. Llamar a `/proveedor-auth/select-proveedor` primero. |
| `PROVEEDOR_NOT_FOUND` | 404 | El proveedor del token no existe. |
| `PROVEEDOR_INACTIVE` | 403 | El proveedor está suspendido/inactivo. |
| `PROVEEDOR_ACCESS_DENIED` | 403 | El usuario no tiene acceso activo a este proveedor. |
| `NO_DATA` | 422 | Body vacío en `PUT /perfil`. |
| `INVALID_CURRENT_PASSWORD` | 422 | La `current_password` no coincide con la del usuario. |
| `SAME_PASSWORD` | 422 | La nueva contraseña es igual a la actual. |
| _(Laravel default)_ | 422 | Errores de validación (`errors.email`, `errors.password`, etc.). |
| _(sin code)_ | 500 | Error inesperado en el servidor. |

---

## Auditoría

Toda acción queda registrada en la tabla `auditorias` con `modulo = MARKET_PROVEEDOR_PERFIL`:

| Endpoint | Acción registrada |
|----------|-------------------|
| `PUT /perfil` | `EDITAR` — incluye `datos_anteriores` y `datos_nuevos` con `{ name, email }`. |
| `PUT /perfil/password` | `CAMBIO_PASSWORD` — **no** guarda hashes ni la contraseña en claro (solo `usuario`, `correo`, `ip`, `user_agent`). |

Para consultarlas desde el panel superadmin:

```
GET /api/v1/admin/auditorias?modulo=MARKET_PROVEEDOR_PERFIL
```

---

## Notas para el frontend

1. **Disponible para cualquier rol** — el botón "Mi perfil" / "Mi cuenta" se muestra siempre que haya sesión activa de proveedor, sin chequear el rol.
2. **Confirmación de contraseña** — el campo `password_confirmation` debe ir en el body del request; es el patrón estándar de la regla `confirmed` de Laravel.
3. **UX recomendada para el cambio de password:**
   - Mostrar tres inputs: `current_password`, `password`, `password_confirmation`.
   - Tras un `200`, cerrar sesión y forzar nuevo login es opcional pero recomendado por seguridad (el JWT actual sigue siendo válido hasta su expiración).
4. **Errores en línea** — mapear los `code` (`INVALID_CURRENT_PASSWORD`, `SAME_PASSWORD`, `NO_DATA`) al input correspondiente en lugar de mostrar un toast genérico.
5. **No exponer estos endpoints para editar a otros usuarios** — solo afectan al usuario del token. Para gestionar otros usuarios del proveedor sigue siendo necesario el panel superadmin.
