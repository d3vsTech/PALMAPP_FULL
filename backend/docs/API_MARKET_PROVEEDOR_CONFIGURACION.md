# API — Configuración del Proveedor (Portal Proveedor)

Endpoints para que el proveedor administre la configuración de su empresa desde el portal del marketplace. La UI agrupa la información en 4 tabs (General, Bancario, Envíos, Notificaciones) más un panel de Resumen.

**Base URL:** `{APP_URL}/api/v1/market/proveedor`
**Auth:** JWT con claim `proveedor_id` (header `Authorization: Bearer <token>`).
**Middleware:** `auth:api` + `SetProveedor` — el proveedor activo se infiere del token, no hace falta enviar `X-Tenant-Id`.
**Content-Type:** `application/json`

> Para obtener el token con `proveedor_id`, primero llamar `POST /api/v1/proveedor-auth/login` y luego `POST /api/v1/proveedor-auth/select-proveedor`.

---

## Índice

1. [Permisos](#permisos)
2. [Catálogos paramétricos](#catálogos-paramétricos)
   - [Bancos](#listar-bancos)
   - [Transportadoras](#listar-transportadoras)
   - [Departamentos y municipios](#departamentos-y-municipios)
3. [Configuración](#configuración)
   - [Obtener configuración completa](#obtener-configuración-completa)
   - [Obtener resumen (panel derecho)](#obtener-resumen)
   - [Actualizar tab General](#actualizar-tab-general)
   - [Actualizar tab Bancario](#actualizar-tab-bancario)
   - [Actualizar tab Envíos](#actualizar-tab-envíos)
   - [Actualizar tab Notificaciones](#actualizar-tab-notificaciones)
4. [Códigos HTTP y de error](#códigos-http-y-de-error)
5. [Estructura del JSON `notificaciones_config`](#estructura-del-json-notificaciones_config)

---

## Permisos

El pivot `market_proveedor_user` define el rol del usuario dentro del proveedor (`ADMIN` u `OPERADOR`).

| Acción | ADMIN | OPERADOR |
|--------|-------|----------|
| `GET /configuracion` y `GET /configuracion/resumen` | ✅ | ✅ |
| `GET /catalogos/*` | ✅ | ✅ |
| `PUT /configuracion/*` (cualquier tab) | ✅ | ❌ `403` |

> Si un usuario con rol `OPERADOR` intenta cualquier `PUT`, recibe `403` con `code: "PERMISSION_DENIED"`.

---

## Catálogos paramétricos

Son tablas globales del marketplace (no por tenant ni por proveedor). Sirven para alimentar los selects de la pantalla de configuración. Respuesta cacheada por 1 hora (`market:catalogo:bancos`, `market:catalogo:transportadoras`).

### Listar bancos

```
GET /api/v1/market/proveedor/catalogos/bancos
```

**Respuesta 200:**
```json
{
  "data": [
    { "id": 1, "nombre": "Bancolombia",    "codigo": "BCO" },
    { "id": 2, "nombre": "Davivienda",     "codigo": "DAV" },
    { "id": 3, "nombre": "Banco de Bogotá","codigo": "BDB" }
  ]
}
```

### Listar transportadoras

```
GET /api/v1/market/proveedor/catalogos/transportadoras
```

**Respuesta 200:**
```json
{
  "data": [
    { "id": 1, "nombre": "Servientrega",    "codigo": "SERV"  },
    { "id": 2, "nombre": "Coordinadora",    "codigo": "COOR"  },
    { "id": 3, "nombre": "Envía",           "codigo": "ENV"   },
    { "id": 4, "nombre": "Interrapidisimo", "codigo": "INTER" }
  ]
}
```

### Departamentos y municipios

**Reutilizar los endpoints existentes** del módulo de auth (no se duplican):

```
GET /api/v1/auth/departamentos
GET /api/v1/auth/departamentos/{codigo}/municipios
```

Al enviar el `PUT /configuracion/general`, los campos `ciudad` y `departamento` se mandan como **nombre** (string), no como código DANE. Ver [API_MARKET_PROVEEDORES_ADMIN.md → Paramétricas](API_MARKET_PROVEEDORES_ADMIN.md#paramétricas-departamentos-y-municipios).

---

## Configuración

### Obtener configuración completa

```
GET /api/v1/market/proveedor/configuracion
```

Retorna las 4 secciones en una sola llamada — el frontend lo usa para hidratar el formulario al montar.

**Respuesta 200:**
```json
{
  "data": {
    "general": {
      "nombre_empresa": "AgroInsumos del Valle",
      "nit":            "900.123.456-7",
      "telefono":       "(602) 555-1234",
      "email":          "info@agroinsumos.com",
      "direccion":      "Calle 12 #34-56",
      "ciudad":         "Cali",
      "departamento":   "Valle del Cauca",
      "descripcion":    "Distribuidor de insumos agrícolas",
      "logo_url":       null
    },
    "bancario": {
      "banco_id":       1,
      "banco":          { "id": 1, "nombre": "Bancolombia", "codigo": "BCO" },
      "tipo_cuenta":    "ahorros",
      "numero_cuenta":  "1234567890",
      "titular_cuenta": "AgroInsumos del Valle S.A.S"
    },
    "envios": {
      "transportadora_id":        1,
      "transportadora":           { "id": 1, "nombre": "Servientrega", "codigo": "SERV" },
      "tiempo_preparacion_horas": 24,
      "monto_envio_gratis":       "500000.00",
      "permitir_recoger_tienda":  true
    },
    "notificaciones": {
      "nuevos_pedidos":     true,
      "cambios_estado":     true,
      "mensajes_clientes":  true,
      "reportes_diarios":   false,
      "reportes_semanales": true
    }
  }
}
```

Si el proveedor no ha guardado aún su `notificaciones_config`, la sección `notificaciones` devuelve los defaults del backend.

---

### Obtener resumen

```
GET /api/v1/market/proveedor/configuracion/resumen
```

Devuelve la información que muestra el panel derecho de la UI (cabecera "Resumen") y el porcentaje de progreso del wizard.

**Respuesta 200:**
```json
{
  "data": {
    "empresa": {
      "nombre_empresa": "AgroInsumos del Valle",
      "nit":            "900.123.456-7"
    },
    "cuenta_bancaria": {
      "banco":              "Bancolombia",
      "tipo_cuenta":        "ahorros",
      "numero_cuenta_mask": "•••• 7890"
    },
    "envios": {
      "transportadora":           "Servientrega",
      "tiempo_preparacion_horas": 24,
      "monto_envio_gratis":       "500000.00",
      "permitir_recoger_tienda":  true
    },
    "notificaciones_activas": 4,
    "notificaciones_total":   5,
    "progreso": {
      "etapas_completadas": 4,
      "etapas_total":       4,
      "porcentaje":         100
    }
  }
}
```

> **Notas de seguridad y conteo:**
> - El `numero_cuenta_mask` solo expone los **últimos 4 dígitos** (`•••• 7890`). El número completo nunca se devuelve en `resumen` — solo en `GET /configuracion`.
> - `cuenta_bancaria` y `envios` son `null` si la sección aún no ha sido configurada.
> - **Cálculo de etapas completadas**:
>   1. **General**: completo si tiene `nombre_empresa + telefono + email + direccion + ciudad + departamento`.
>   2. **Bancario**: completo si tiene `banco_id + tipo_cuenta + numero_cuenta + titular_cuenta`.
>   3. **Envíos**: completo si tiene `transportadora_id + tiempo_preparacion_horas`.
>   4. **Notificaciones**: completo si `notificaciones_config` no es null (es decir, el usuario al menos guardó una vez).

---

### Actualizar tab General

```
PUT /api/v1/market/proveedor/configuracion/general
```

Solo `ADMIN`. Todos los campos son opcionales — solo se actualiza lo que se envía. No permite editar `estado`, `calificacion_promedio` ni `total_ventas` (siguen siendo gestionados solo por el superadmin).

**Body:**
```json
{
  "nombre_empresa": "AgroInsumos del Valle",
  "nit":            "900.123.456-7",
  "telefono":       "(602) 555-1234",
  "email":          "info@agroinsumos.com",
  "direccion":      "Calle 12 #34-56",
  "ciudad":         "Cali",
  "departamento":   "Valle del Cauca",
  "descripcion":    "Distribuidor de insumos agrícolas",
  "logo_url":       "https://cdn.example.com/logos/avalle.png"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `nombre_empresa` | sometimes, required, string, max:150 |
| `nit` | sometimes, nullable, string, max:20, unique:market_proveedores,nit (excluyendo el proveedor actual) |
| `telefono` | sometimes, required, string, max:20 |
| `email` | sometimes, required, email, max:150, unique:market_proveedores,email (excluyendo el proveedor actual) |
| `direccion` | sometimes, required, string, max:255 |
| `ciudad` | sometimes, required, string, max:80 |
| `departamento` | sometimes, required, string, max:80 |
| `descripcion` | sometimes, nullable, string |
| `logo_url` | sometimes, nullable, string, max:500 |

**Respuesta 200:**
```json
{
  "message": "Datos generales actualizados correctamente",
  "data":    { "nombre_empresa": "...", "nit": "...", "...": "..." }
}
```

**Auditoría:** se registra en `auditorias` con `modulo = MARKET_PROVEEDOR_CONFIG_GENERAL`.

---

### Actualizar tab Bancario

```
PUT /api/v1/market/proveedor/configuracion/bancario
```

Solo `ADMIN`. Todos los campos son obligatorios — el formulario se guarda como un bloque atómico.

**Body:**
```json
{
  "banco_id":       1,
  "tipo_cuenta":    "ahorros",
  "numero_cuenta":  "1234567890",
  "titular_cuenta": "AgroInsumos del Valle S.A.S"
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `banco_id` | required, integer, exists:market_bancos,id |
| `tipo_cuenta` | required, in:`ahorros`,`corriente` |
| `numero_cuenta` | required, string, max:30 |
| `titular_cuenta` | required, string, max:150 |

**Respuesta 200:**
```json
{
  "message": "Datos bancarios actualizados correctamente",
  "data": {
    "banco_id":       1,
    "banco":          { "id": 1, "nombre": "Bancolombia", "codigo": "BCO" },
    "tipo_cuenta":    "ahorros",
    "numero_cuenta":  "1234567890",
    "titular_cuenta": "AgroInsumos del Valle S.A.S"
  }
}
```

**Auditoría:** `modulo = MARKET_PROVEEDOR_CONFIG_BANCARIO`.

---

### Actualizar tab Envíos

```
PUT /api/v1/market/proveedor/configuracion/envios
```

Solo `ADMIN`.

**Body:**
```json
{
  "transportadora_id":        1,
  "tiempo_preparacion_horas": 24,
  "monto_envio_gratis":       500000,
  "permitir_recoger_tienda":  true
}
```

**Validaciones:**

| Campo | Reglas |
|-------|--------|
| `transportadora_id` | nullable, integer, exists:market_transportadoras,id |
| `tiempo_preparacion_horas` | required, integer, min:1, max:720 (30 días) |
| `monto_envio_gratis` | nullable, numeric, min:0, max:99999999.99 |
| `permitir_recoger_tienda` | required, boolean |

**Respuesta 200:**
```json
{
  "message": "Configuración de envíos actualizada correctamente",
  "data": {
    "transportadora_id":        1,
    "transportadora":           { "id": 1, "nombre": "Servientrega", "codigo": "SERV" },
    "tiempo_preparacion_horas": 24,
    "monto_envio_gratis":       "500000.00",
    "permitir_recoger_tienda":  true
  }
}
```

**Auditoría:** `modulo = MARKET_PROVEEDOR_CONFIG_ENVIOS`.

---

### Actualizar tab Notificaciones

```
PUT /api/v1/market/proveedor/configuracion/notificaciones
```

Solo `ADMIN`. Se guarda como un único `jsonb` en la columna `notificaciones_config`.

**Body:**
```json
{
  "nuevos_pedidos":     true,
  "cambios_estado":     true,
  "mensajes_clientes":  true,
  "reportes_diarios":   false,
  "reportes_semanales": true
}
```

**Validaciones:** todos los campos son `required, boolean`.

**Respuesta 200:**
```json
{
  "message": "Preferencias de notificaciones actualizadas correctamente",
  "data": {
    "nuevos_pedidos":     true,
    "cambios_estado":     true,
    "mensajes_clientes":  true,
    "reportes_diarios":   false,
    "reportes_semanales": true
  }
}
```

**Auditoría:** `modulo = MARKET_PROVEEDOR_CONFIG_NOTIFICACIONES`.

---

## Códigos HTTP y de error

| Code | HTTP | Descripción |
|------|------|-------------|
| `PROVEEDOR_NOT_SELECTED` | 422 | Token sin claim `proveedor_id`. Llamar a `/proveedor-auth/select-proveedor` primero. |
| `PROVEEDOR_NOT_FOUND` | 404 | El proveedor del token no existe. |
| `PROVEEDOR_INACTIVE` | 403 | El proveedor está suspendido/inactivo. |
| `PROVEEDOR_ACCESS_DENIED` | 403 | El usuario no tiene acceso activo a este proveedor. |
| `PERMISSION_DENIED` | 403 | Operador intentó hacer un `PUT` (solo ADMIN puede). |
| _(Laravel default)_ | 422 | Errores de validación (`errors.banco_id`, `errors.tipo_cuenta`, etc.). |
| `INTERNAL_ERROR` | 500 | Error inesperado en el servidor. |

---

## Estructura del JSON `notificaciones_config`

Se guarda como `jsonb` en la columna `market_proveedores.notificaciones_config`. Si la columna es `null` (proveedor recién creado), el backend devuelve estos **defaults** en `GET /configuracion`:

```json
{
  "nuevos_pedidos":     true,
  "cambios_estado":     true,
  "mensajes_clientes":  true,
  "reportes_diarios":   false,
  "reportes_semanales": false
}
```

Los defaults solo se aplican en lectura — el frontend siempre debe enviar el JSON completo en el `PUT`, no parches parciales.
