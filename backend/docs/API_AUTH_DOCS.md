# API de Autenticacion - Agro App

**Base URL:** `https://31.97.7.50:3000/api`

**Autenticacion:** JWT Bearer Token - enviar en header:
```
Authorization: Bearer {token}
```

---

## Endpoints

### 1. Registro

`POST /api/auth/register`

| Campo | Tipo | Requerido | Reglas |
|-------|------|-----------|--------|
| `name` | string | si | max: 255 |
| `email` | string | si | formato email, unico en BD, max: 255 |
| `password` | string | si | min: 8 caracteres |
| `password_confirmation` | string | si | debe coincidir con `password` |

**Request:**
```json
{
  "name": "Juan Perez",
  "email": "juan@example.com",
  "password": "mipassword123",
  "password_confirmation": "mipassword123"
}
```

**Response 201:**
```json
{
  "message": "Usuario registrado exitosamente",
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errores:** `422` validacion

---

### 2. Login

`POST /api/auth/login`

| Campo | Tipo | Requerido | Reglas |
|-------|------|-----------|--------|
| `email` | string | si | formato email |
| `password` | string | si | - |

**Request:**
```json
{
  "email": "juan@example.com",
  "password": "mipassword123"
}
```

**Response 200:**
```json
{
  "message": "Login exitoso",
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errores:** `401` credenciales invalidas | `422` validacion

---

### 3. Perfil (auth requerida)

`GET /api/auth/profile`

**Header:** `Authorization: Bearer {token}`

Sin body.

**Response 200:**
```json
{
  "id": 1,
  "name": "Juan Perez",
  "email": "juan@example.com",
  "email_verified_at": "2026-03-01T00:00:00.000000Z",
  "created_at": "2026-03-01T00:00:00.000000Z",
  "updated_at": "2026-03-01T00:00:00.000000Z"
}
```

**Errores:** `401` no autenticado

---

### 4. Logout (auth requerida)

`POST /api/auth/logout`

**Header:** `Authorization: Bearer {token}`

Sin body.

**Response 200:**
```json
{
  "message": "Sesion cerrada exitosamente"
}
```

**Errores:** `401` no autenticado

---

### 5. Refresh Token (auth requerida)

`POST /api/auth/refresh`

**Header:** `Authorization: Bearer {token}`

Sin body.

**Response 200:**
```json
{
  "message": "Token renovado",
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errores:** `401` no autenticado

---

### 6. Olvide mi contrasena

`POST /api/auth/forgot-password`

| Campo | Tipo | Requerido | Reglas |
|-------|------|-----------|--------|
| `email` | string | si | formato email |

**Request:**
```json
{
  "email": "juan@example.com"
}
```

**Response 200:**
```json
{
  "message": "Se ha enviado el enlace de restablecimiento de contrasena a tu correo electronico."
}
```

**Errores:** `400` email no encontrado o throttled | `422` validacion

---

### 7. Restablecer contrasena

`POST /api/auth/reset-password`

| Campo | Tipo | Requerido | Reglas |
|-------|------|-----------|--------|
| `token` | string | si | token recibido por email |
| `email` | string | si | formato email |
| `password` | string | si | min: 8 caracteres |
| `password_confirmation` | string | si | debe coincidir con `password` |

**Request:**
```json
{
  "token": "abc123tokenrecibidoporemail",
  "email": "juan@example.com",
  "password": "nuevapassword123",
  "password_confirmation": "nuevapassword123"
}
```

**Response 200:**
```json
{
  "message": "Tu contrasena ha sido restablecida exitosamente."
}
```

**Errores:** `400` token invalido/expirado o email incorrecto | `422` validacion

---

## Resumen

| # | Metodo | Ruta | Auth | Exito | Errores |
|---|--------|------|------|-------|---------|
| 1 | POST | `/api/auth/register` | No | 201 | 422 |
| 2 | POST | `/api/auth/login` | No | 200 | 401, 422 |
| 3 | GET | `/api/auth/profile` | Si | 200 | 401 |
| 4 | POST | `/api/auth/logout` | Si | 200 | 401 |
| 5 | POST | `/api/auth/refresh` | Si | 200 | 401 |
| 6 | POST | `/api/auth/forgot-password` | No | 200 | 400, 422 |
| 7 | POST | `/api/auth/reset-password` | No | 200 | 400, 422 |

## Flujo de restablecimiento de contrasena

1. Frontend llama `POST /api/auth/forgot-password` con el email
2. Backend envia email con enlace: `{FRONTEND_URL}/reset-password?token={token}&email={email}`
3. Frontend extrae `token` y `email` de la URL y muestra formulario de nueva contrasena
4. Frontend llama `POST /api/auth/reset-password` con token, email, password y password_confirmation
5. Token expira en **60 minutos**. Hay throttle de **60 segundos** entre solicitudes

## Errores de validacion (422)

Todos los errores de validacion devuelven:
```json
{
  "message": "Descripcion del error",
  "errors": {
    "campo": ["Mensaje de error especifico"]
  }
}
```
