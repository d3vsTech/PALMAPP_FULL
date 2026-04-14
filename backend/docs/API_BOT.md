# AGRO CAMPO — Guía de integración para el Bot

**Para:** desarrollador del bot Python que lee correos y consume la API.
**Base URL:** `http://agro-campo.test/api`
**Autenticación:** JWT (Bearer token).

---

## Resumen del flujo

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Bot lee correo → extrae tenant_id del número de remisión   │
│  2. Bot tiene token base válido?                                │
│       NO → POST /api/v1/auth/login                              │
│  3. Bot tiene token cacheado para ese tenant_id (no expirado)?  │
│       NO → POST /api/v1/auth/select-tenant                      │
│  4. Bot llama al endpoint de negocio                            │
│       POST /api/v1/tenant/<endpoint>                            │
│       con Authorization + X-Tenant-Id                           │
└─────────────────────────────────────────────────────────────────┘
```

El bot opera con **una sola credencial** (`bot@d3vs.tech`) que es `super_admin` en el sistema. Esto significa que tiene acceso técnico a **cualquier tenant** que exista (presente o futuro), sin necesidad de provisionamiento adicional.

---

## Credenciales

| Variable | Valor |
|---|---|
| Email | `bot@d3vs.tech` |
| Password | Definido en `BOT_USER_PASSWORD` del `.env` del backend |
| Tipo | Super admin (acceso a todos los tenants) |


> El password debe vivir en una variable de entorno del host del bot (`AGROCAMPO_BOT_PASSWORD`). **NUNCA** hardcodearlo en el código ni commitearlo al repo.

---

## 1. Login — `POST /api/v1/auth/login`

Llamar **una sola vez al iniciar el bot**, y de nuevo cada vez que el token base expire (cada ~60 min).

⚠️ **IMPORTANTE:** usar `/api/v1/auth/login`, **NO** `/api/v1/tenant-auth/login`. El segundo rechaza super_admins con código `USE_ADMIN_LOGIN`.

### Request

```http
POST http://agro-campo.test/api/v1/auth/login
Content-Type: application/json
Accept: application/json

{
  "email": "bot@d3vs.tech",
  "password": "bot_8sK4mQ2pX9nR7vY3zL5wT6jH1fD0cB"
}
```

### Response 200

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 5,
    "name": "Bot Integraciones",
    "email": "bot@d3vs.tech",
    "is_super_admin": true
  }
}
```

### Qué guardar en memoria

```python
self.base_token        = data["token"]
self.base_expires_at   = time.time() + data["expires_in"] - 60  # safety window de 60s
self._tenant_tokens    = {}  # limpiar el cache por tenant cuando se relogue
```

### Errores posibles

| Status | Significado | Acción del bot |
|---|---|---|
| `401` | Credenciales inválidas | Detener el bot, alertar al operador |
| `403` | Cuenta inactiva (`status=false`) o el bot perdió `is_super_admin` | Detener el bot, alertar al operador |
| `422` | Validación (email/password ausente o mal formado) | Bug del bot, revisar el código |

---

## 2. Select tenant — `POST /api/v1/auth/select-tenant`

Llamar **cada vez que el bot necesite operar sobre un tenant que no tiene token cacheado** (o cuyo token cacheado expiró). El `tenant_id` viene del número de remisión del correo.

### Request

```http
POST http://agro-campo.test/api/v1/auth/select-tenant
Authorization: Bearer <BASE_TOKEN>
Content-Type: application/json
Accept: application/json

{ "tenant_id": 1 }
```

### Response 200

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "tenant_id": 1,
  "tenant_nombre": "Finca La Esperanza",
  "rol": null,
  "permisos": [],
  "modulos": { "...": true },
  "config_nomina": { "...": "..." }
}
```

> **`rol: null` y `permisos: []` son lo esperado** para el bot — porque es super_admin desacoplado de los tenants. El JWT devuelto contiene `tenant_id` en sus claims, y eso es suficiente para que el backend lo deje pasar a `/api/v1/tenant/*`.

### Qué guardar

```python
self._tenant_tokens[tenant_id] = (
    data["token"],
    time.time() + 3600 - 60,  # safety window de 60s
)
```

### Errores posibles

| Status | Code | Significado | Acción |
|---|---|---|---|
| `403` | `TENANT_ACCESS_DENIED` | Si el bot dejó de ser super_admin | Detener bot, alertar |
| `403` | `TENANT_INACTIVE` | El tenant existe pero está SUSPENDIDO/INACTIVO | Loggear y descartar el correo |
| `404` | — | El `tenant_id` no existe | Probable error parseando el número de remisión. Loggear el correo crudo, descartar |
| `401` | `TOKEN_EXPIRED` / `TOKEN_INVALID` | El token base caducó o fue invalidado | Re-loguear (paso 1) y reintentar **una sola vez** |

---

## 3. Llamar al endpoint de negocio

Una vez que el bot tiene un `token` con `tenant_id` en sus claims, puede llamar a cualquier ruta bajo `/api/v1/tenant/*`.

### Endpoint de prueba (ya implementado)

Sirve para validar que toda la cadena funciona. Solo escribe en el log de Laravel; no toca BD.

```http
POST http://agro-campo.test/api/v1/tenant/bot/test
Authorization: Bearer <TOKEN_DEL_TENANT>
X-Tenant-Id: 1
Content-Type: application/json
Accept: application/json

{
  "fuente": "correo",
  "numero_remision": "REM-001",
  "asunto": "Alerta de prueba",
  "cuerpo": "..."
}
```

#### Response 200

```json
{
  "message": "Bot OK — servicio consumido y registrado en log",
  "received": {
    "user_id": 5,
    "tenant_id": 1,
    "payload": {
      "fuente": "correo",
      "numero_remision": "REM-001",
      "asunto": "Alerta de prueba",
      "cuerpo": "..."
    }
  }
}
```

Y en `storage/logs/laravel.log` del backend queda esta línea:

```
[2026-04-08 11:43:35] local.INFO: BOT_TEST consumido {"user_id":5,"user_email":"bot@d3vs.tech","tenant_id":1,"ip":"127.0.0.1","user_agent":"...","payload":{...},"timestamp":"..."}
```

### Headers obligatorios para CUALQUIER endpoint /tenant/*

```
Authorization: Bearer <token con tenant_id en sus claims>
X-Tenant-Id: <mismo tenant_id que se usó en select-tenant>
Content-Type: application/json
Accept: application/json
```

> El `X-Tenant-Id` es **obligatorio** aunque el JWT ya contenga `tenant_id` en los claims — el middleware `SetTenant` lo lee del header.

---

## 4. Manejo de errores y reintentos

| Status | Significado | Acción del bot |
|---|---|---|
| `200/201` | Éxito | Marcar el correo como procesado |
| `401 TOKEN_EXPIRED` | El token caducó antes del safety window | Vaciar caches, re-loguear, reintentar **una sola vez** |
| `401 TOKEN_INVALID` | Token revocado / blacklist | Igual que arriba |
| `401` sin code | Header mal formado | Bug del bot, revisar código |
| `403 USER_INACTIVE` | Bot desactivado por panel admin | Detener bot, alertar al operador |
| `403` "No tiene permisos" | El bot perdió `is_super_admin` | Detener bot, alertar al operador |
| `404 TENANT_NOT_FOUND` | `tenant_id` parseado mal del correo | Loggear el correo crudo, descartar, no reintentar |
| `403 TENANT_INACTIVE` | Tenant SUSPENDIDO/INACTIVO | Loggear, descartar, no reintentar |
| `422` | Payload inválido | Loggear el body completo de la respuesta, descartar |
| `500` | Error del servidor | Reintentar con backoff exponencial (máx 3 veces) |

### Importante: NO usar `/refresh`

El backend tiene `persistent_claims` vacío en su config JWT. Eso significa que un `POST /refresh` devolvería un token **sin** `tenant_id` en los claims, y habría que volver a llamar `select-tenant` igual. Es **más simple** re-loguearse con email/password cuando el token expira (un POST cada hora no es costoso).

---

## 5. Estructura sugerida del cliente Python

```python
import os
import time
import requests
from threading import Lock


class AgroCampoBotClient:
    """
    Cliente HTTP para consumir la API de Agro Campo desde el bot.

    Maneja:
    - Login automático y re-login al expirar el token base.
    - Cache de tokens por tenant (un select-tenant por finca, no por correo).
    - Reintento único en 401.
    """

    def __init__(self):
        self.base_url = os.environ["AGROCAMPO_BASE_URL"].rstrip("/")
        self.email    = os.environ["AGROCAMPO_BOT_EMAIL"]
        self.password = os.environ["AGROCAMPO_BOT_PASSWORD"]

        self._base_token       = None
        self._base_expires_at  = 0
        self._tenant_tokens    = {}   # { tenant_id: (token, expires_at) }
        self._lock             = Lock()
        self._safety_window    = 60   # segundos antes del exp para refrescar

    # ─────────── Auth ───────────

    def _login(self):
        r = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
            headers={"Accept": "application/json"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        self._base_token      = data["token"]
        self._base_expires_at = time.time() + data["expires_in"] - self._safety_window
        self._tenant_tokens.clear()  # los tokens viejos pierden validez al relogue

    def _ensure_base_token(self):
        if not self._base_token or time.time() >= self._base_expires_at:
            self._login()

    def _select_tenant(self, tenant_id: int) -> str:
        self._ensure_base_token()
        r = requests.post(
            f"{self.base_url}/api/v1/auth/select-tenant",
            json={"tenant_id": tenant_id},
            headers={
                "Authorization": f"Bearer {self._base_token}",
                "Accept": "application/json",
            },
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        token = data["token"]
        expires_at = time.time() + 3600 - self._safety_window
        self._tenant_tokens[tenant_id] = (token, expires_at)
        return token

    def _get_tenant_token(self, tenant_id: int) -> str:
        with self._lock:
            cached = self._tenant_tokens.get(tenant_id)
            if cached and time.time() < cached[1]:
                return cached[0]
            return self._select_tenant(tenant_id)

    # ─────────── Request HTTP genérico ───────────

    def _request(self, method: str, path: str, tenant_id: int, json_body=None):
        token = self._get_tenant_token(tenant_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-Id":   str(tenant_id),
            "Accept":        "application/json",
            "Content-Type":  "application/json",
        }
        r = requests.request(
            method,
            f"{self.base_url}{path}",
            json=json_body,
            headers=headers,
            timeout=15,
        )

        # Reintento único en 401: token pudo haber sido invalidado externamente
        if r.status_code == 401:
            with self._lock:
                self._base_token = None
                self._tenant_tokens.pop(tenant_id, None)
            token = self._get_tenant_token(tenant_id)
            headers["Authorization"] = f"Bearer {token}"
            r = requests.request(
                method,
                f"{self.base_url}{path}",
                json=json_body,
                headers=headers,
                timeout=15,
            )

        r.raise_for_status()
        return r.json()

    # ─────────── API de alto nivel ───────────

    def ping_test(self, tenant_id: int, payload: dict):
        """Endpoint de prueba — solo escribe en el log de Laravel."""
        return self._request("POST", "/api/v1/tenant/bot/test", tenant_id, payload)

    # Cuando el endpoint de alertas exista, agregar aquí:
    # def crear_alerta(self, tenant_id: int, payload: dict):
    #     return self._request("POST", "/api/v1/tenant/alertas", tenant_id, payload)
    #
    # def editar_alerta(self, tenant_id: int, alerta_id: int, payload: dict):
    #     return self._request("PUT", f"/api/v1/tenant/alertas/{alerta_id}", tenant_id, payload)
```

### Uso típico

```python
client = AgroCampoBotClient()

# Bot procesa cada correo:
for correo in correos_pendientes:
    try:
        tenant_id = parsear_tenant_id_del_remision(correo)  # función propia del bot
    except ValueError:
        loggear_error("No se pudo parsear tenant_id", correo)
        continue

    payload = {
        "fuente":          "correo",
        "numero_remision": correo.numero_remision,
        "asunto":          correo.asunto,
        "cuerpo":          correo.cuerpo,
    }

    try:
        resp = client.ping_test(tenant_id, payload)
        marcar_como_procesado(correo)
    except requests.HTTPError as e:
        manejar_error_segun_status(e.response.status_code, correo)
```

---

## 6. Variables de entorno del host del bot

```env
AGROCAMPO_BASE_URL=http://agro-campo.test
AGROCAMPO_BOT_EMAIL=bot@d3vs.tech
AGROCAMPO_BOT_PASSWORD=<el mismo valor que BOT_USER_PASSWORD del backend>
```

---

## 7. Auditoría

Toda llamada del bot al backend queda registrada automáticamente en la tabla `auditorias` con:

- `user_id` = ID del bot
- `usuario` = "Bot Integraciones"
- `correo`  = "bot@d3vs.tech"
- `tenant_id` = el tenant sobre el que actuó
- `direccion_ip` y `user_agent`
- Acción: `LOGIN_EXITOSO` para cada login, y la acción que corresponda para los endpoints de negocio

> El bot **no necesita hacer nada especial** para esto. La auditoría es transparente.

---

## 8. Verificación end-to-end (cURL)

Probar antes de implementar/desplegar el bot:

```bash
# 1. Login
curl -X POST http://agro-campo.test/api/v1/auth/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"bot@d3vs.tech","password":"<BOT_USER_PASSWORD>"}'

# Guardar el token devuelto en TOKEN_BASE

# 2. Select tenant
curl -X POST http://agro-campo.test/api/v1/auth/select-tenant \
  -H "Authorization: Bearer $TOKEN_BASE" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"tenant_id":1}'

# Guardar el nuevo token en TOKEN_TENANT

# 3. Endpoint de prueba
curl -X POST http://agro-campo.test/api/v1/tenant/bot/test \
  -H "Authorization: Bearer $TOKEN_TENANT" \
  -H "X-Tenant-Id: 1" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"prueba":"hola","numero_remision":"REM-001"}'
```

Respuesta esperada:

```json
{
  "message": "Bot OK — servicio consumido y registrado en log",
  "received": {
    "user_id": 5,
    "tenant_id": 1,
    "payload": { "prueba": "hola", "numero_remision": "REM-001" }
  }
}
```

Y en `storage/logs/laravel.log`:

```
[YYYY-MM-DD HH:MM:SS] local.INFO: BOT_TEST consumido {"user_id":5,"user_email":"bot@d3vs.tech","tenant_id":1,...}
```

---

## 9. Checklist antes de pasar a producción

- [ ] Cambiar `BOT_USER_PASSWORD` en el `.env` del backend a un valor fuerte aleatorio.
- [ ] Volver a correr `php artisan db:seed --class=BotUserSeeder` para que tome el password nuevo.
- [ ] Configurar `AGROCAMPO_BOT_PASSWORD` en el host del bot con el mismo valor.
- [ ] Asegurar que el `.env` del bot **no** esté en el repo (`.gitignore`).
- [ ] Implementar logging local en el bot para cada correo procesado (con el `numero_remision` como correlation ID).
- [ ] Implementar manejo de errores según la tabla de la sección 4.
- [ ] Probar con cURL los pasos 1–3 de la sección 8 contra el backend real.
- [ ] Probar con un correo de prueba que el bot lo procese end-to-end.
- [ ] Reemplazar la llamada `ping_test()` por la llamada al endpoint real de alertas cuando esté implementado.
