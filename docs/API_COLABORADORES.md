# API de Colaboradores

> Base URL: `/api/v1/tenant`
> Requiere: `Authorization: Bearer {token}` + `X-Tenant-Id: {id}`

---

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/colaboradores/wizard-init` | `colaboradores.crear` | Bundle para el wizard de **creación** (paramétricas) |
| GET | `/colaboradores/{id}/wizard-init` | `colaboradores.ver` | Bundle para el wizard de **edición** (colaborador + paramétricas) |
| GET | `/colaboradores/select` | `colaboradores.ver` o `operaciones.crear` u `operaciones.editar` | Listado liviano para dropdowns (wizard) |
| GET | `/colaboradores` | `colaboradores.ver` | Listar colaboradores (paginado) |
| GET | `/colaboradores/{id}` | `colaboradores.ver` | Detalle de un colaborador |
| POST | `/colaboradores` | `colaboradores.crear` | Crear colaborador |
| PUT | `/colaboradores/{id}` | `colaboradores.editar` | Editar colaborador |
| DELETE | `/colaboradores/{id}` | `colaboradores.eliminar` | Eliminar colaborador (soft delete) |
| POST | `/colaboradores/{id}/restaurar` | `colaboradores.crear` | Restaurar colaborador eliminado |
| PATCH | `/colaboradores/{id}/toggle` | `colaboradores.editar` | Activar/Desactivar |
| POST | `/colaboradores/{id}/avatar` | `colaboradores.editar` | Subir avatar del colaborador |
| DELETE | `/colaboradores/{id}/avatar` | `colaboradores.editar` | Eliminar avatar del colaborador |

---

## 0. Wizard Init — Bundle de inicialización

Endpoint diseñado para **reemplazar las 8 peticiones paralelas** que el frontend hace al montar el wizard de creación/edición de colaboradores. Devuelve en una sola respuesta el colaborador (si aplica) más todas las paramétricas necesarias. Internamente cada paramétrica está cacheada en el servidor (TTL 15 min las del tenant, 6 h las ubicaciones); por lo general la respuesta es prácticamente instantánea después del primer hit.

### Modo edición

```
GET /api/v1/tenant/colaboradores/{id}/wizard-init
```

**Permiso:** `colaboradores.ver`

### Modo creación

```
GET /api/v1/tenant/colaboradores/wizard-init
```

**Permiso:** `colaboradores.crear`

En modo creación no hay colaborador que cargar; `data.colaborador` viene `null`.

### Response 200

```json
{
  "data": {
    "colaborador": {
      "id": 18,
      "primer_nombre": "Juan",
      "segundo_nombre": "Carlos",
      "primer_apellido": "Pérez",
      "segundo_apellido": "López",
      "tipo_documento": "CC",
      "documento": "1098765432",
      "...": "... resto del colaborador igual que GET /colaboradores/{id} ...",
      "predio": { "id": 1, "nombre": "Finca El Palmar" },
      "contrato_vigente": { "...": "..." }
    },
    "parametricas": {
      "predios": [
        { "id": 1, "nombre": "Finca El Palmar", "estado": true }
      ],
      "eps":                  [ { "id": 1, "nombre": "Sura" } ],
      "arl":                  [ { "id": 1, "nombre": "Positiva" } ],
      "fondos_pension":       [ { "id": 1, "nombre": "Porvenir" } ],
      "fondos_cesantias":     [ { "id": 1, "nombre": "Porvenir" } ],
      "entidades_bancarias":  [ { "id": 1, "nombre": "Bancolombia" } ],
      "departamentos":        [ { "codigo": "68", "nombre": "Santander" } ],
      "documento_categorias": {
        "DATOS_BASE":          { "label": "Datos base", "unico_por_tipo": true, "tipos": { "...": "..." } },
        "CONTRATACION_LABORAL":{ "label": "Contratación laboral", "...": "..." },
        "...": "..."
      }
    }
  }
}
```

### Notas para el frontend

- **Reemplaza estas 9 peticiones individuales** (ver `consultas-editar-colaborador.md`): `predios?per_page=100`, `documento-categorias`, `eps/select`, `arl/select`, `fondos-pension/select`, `fondos-cesantias/select`, `entidades-bancarias/select`, `auth/departamentos` y `colaboradores/{id}`.
- **NO incluye** municipios (se cargan condicionalmente cuando cambia el departamento) ni documentos del colaborador (se cargan al llegar al paso 7). Esos endpoints siguen igual.
- Los selects de paramétricas pueden recibir valores legacy que ya no existen en el catálogo (ej. una EPS retirada). El frontend debe seguir el patrón actual: mostrar el valor pre-cargado aunque no esté en la lista.
- El header `Cache-Control: private, max-age=0, must-revalidate` indica al navegador que NO cachee la respuesta — el caché vive en el servidor a nivel de paramétricas, no en el cliente, para no servir datos del colaborador desactualizados.
- Endpoints legacy individuales (`/predios`, `/eps/select`, etc.) siguen funcionando y soportados — otros consumidores (paneles de configuración, dashboards) los siguen usando.

---

## 0. Listado liviano para Dropdowns (`/select`)

Endpoint pensado para poblar el componente "Agregar colaborador" del wizard de Operaciones y cualquier otro select. **Sin paginación**, devuelve todos los empleados que coincidan con los filtros, con solo los campos imprescindibles.

```
GET /api/v1/tenant/colaboradores/select
```

**Permiso:** acepta cualquiera de: `colaboradores.ver`, `operaciones.crear`, `operaciones.editar` — así un operador que solo tenga permisos de Operaciones también puede usar el dropdown.

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `estado` | boolean | `true` | Por defecto devuelve solo **activos**. Enviar `false` para inactivos. |
| `modalidad_pago` | string | — | Filtra por `FIJO` o `PRODUCCION` (útil para wizards de nómina) |
| `predio_id` | integer | — | Solo los asignados a un predio |

### Response 200

```json
{
  "data": [
    { "id": 10, "nombre_completo": "Juan Carlos Pérez López", "documento": "1098765432", "modalidad_pago": "PRODUCCION" },
    { "id": 11, "nombre_completo": "María García Rojas",     "documento": "1110000111", "modalidad_pago": "FIJO" }
  ]
}
```

**Importante:**
- Sin `meta` (no es paginado).
- Se recomienda cachear la respuesta en el cliente y refrescar solo cuando cambie el formulario de colaboradores.
- Para vistas administrativas con paginación, filtros avanzados y todos los campos del empleado, usa `GET /colaboradores` (sección 1).

---

## 1. Listar Colaboradores

```
GET /api/v1/tenant/colaboradores
```

### Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Busca por primer nombre, segundo nombre, primer apellido, segundo apellido o documento |
| `cargo` | string | Filtra por cargo (búsqueda parcial) |
| `modalidad_pago` | string | Enum: `FIJO` o `PRODUCCION` |
| `predio_id` | integer | Filtra por predio asignado |
| `estado` | boolean | `true` = activos, `false` = inactivos |
| `incluir_eliminados` | boolean | `true` incluye colaboradores soft-deleted en el resultado (junto con los vigentes) |
| `solo_eliminados` | boolean | `true` retorna **únicamente** los colaboradores eliminados (soft delete) |
| `per_page` | integer | Registros por página (default: 15) |

### Response 200

```json
{
  "data": [
    {
      "id": 1,
      "primer_nombre": "Juan",
      "segundo_nombre": "Carlos",
      "primer_apellido": "Pérez",
      "segundo_apellido": "López",
      "tipo_documento": "CC",
      "documento": "1098765432",
      "fecha_nacimiento": "1990-05-15",
      "fecha_expedicion_documento": "2008-06-01",
      "lugar_expedicion": "Bucaramanga",
      "cargo": "Jornalero",
      "salario_base": "1423500.00",
      "subsidio_transporte": true,
      "modalidad_pago": "PRODUCCION",
      "correo_electronico": "juan@email.com",
      "telefono": "3001234567",
      "direccion": "Calle 45 #12-30",
      "municipio": "Barrancabermeja",
      "departamento": "Santander",
      "eps": "Sura",
      "fondo_pension": "Porvenir",
      "fondo_cesantias": "Porvenir",
      "arl": "Sura",
      "caja_compensacion": "Cafam",
      "talla_camisa": "M",
      "talla_pantalon": "32",
      "talla_calzado": "42",
      "tipo_cuenta": "AHORROS",
      "entidad_bancaria": "Bancolombia",
      "numero_cuenta": "04512345678",
      "contacto_emergencia_nombre": "María López",
      "contacto_emergencia_telefono": "3109876543",
      "fecha_ingreso": "2025-01-15",
      "fecha_retiro": null,
      "estado": true,
      "created_at": "2026-04-06T10:00:00.000000Z",
      "updated_at": "2026-04-06T10:00:00.000000Z",
      "predio": {
        "id": 1,
        "nombre": "Finca El Palmar"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

> **Nota para el frontend:** La tarjeta de colaborador obtiene:
> - **Iniciales**: primera letra de `primer_nombre` + primera letra de `primer_apellido`
> - **Nombre completo**: `primer_nombre` + `segundo_nombre` (si existe) + `primer_apellido` + `segundo_apellido` (si existe)
> - **Cédula**: `documento`
> - **Cargo**: `cargo`
> - **Modalidad de pago**: `modalidad_pago` (`FIJO` = "Fijo", `PRODUCCION` = "Producción")
> - **Salario base**: `salario_base`
> - **Predio**: `predio.nombre` (puede ser null)
> - **Estado**: `estado`

---

## 2. Detalle de Colaborador

```
GET /api/v1/tenant/colaboradores/{id}
```

### Response 200

```json
{
  "data": {
    "id": 1,
    "primer_nombre": "Juan",
    "segundo_nombre": "Carlos",
    "primer_apellido": "Pérez",
    "segundo_apellido": "López",
    "tipo_documento": "CC",
    "documento": "1098765432",
    "fecha_nacimiento": "1990-05-15",
    "fecha_expedicion_documento": "2008-06-01",
    "lugar_expedicion": "Bucaramanga",
    "cargo": "Jornalero",
    "salario_base": "1423500.00",
    "subsidio_transporte": true,
    "modalidad_pago": "PRODUCCION",
    "correo_electronico": "juan@email.com",
    "telefono": "3001234567",
    "direccion": "Calle 45 #12-30",
    "municipio": "Barrancabermeja",
    "departamento": "Santander",
    "eps": "Sura",
    "fondo_pension": "Porvenir",
    "fondo_cesantias": "Porvenir",
    "arl": "Sura",
    "caja_compensacion": "Cafam",
    "talla_camisa": "M",
    "talla_pantalon": "32",
    "talla_calzado": "42",
    "tipo_cuenta": "AHORROS",
    "entidad_bancaria": "Bancolombia",
    "numero_cuenta": "04512345678",
    "contacto_emergencia_nombre": "María López",
    "contacto_emergencia_telefono": "3109876543",
    "fecha_ingreso": "2025-01-15",
    "fecha_retiro": null,
    "estado": true,
    "created_at": "2026-04-06T10:00:00.000000Z",
    "updated_at": "2026-04-06T10:00:00.000000Z",
    "predio": {
      "id": 1,
      "nombre": "Finca El Palmar"
    },
    "contrato_vigente": {
      "id": 5,
      "empleado_id": 1,
      "fecha_inicio": "2025-01-15",
      "fecha_terminacion": null,
      "salario": "1423500.00",
      "estado_contrato": "VIGENTE",
      "adjunto_path": "tenants/1/empleados/1/contratos/abc123.pdf",
      "adjunto_nombre_original": "contrato_juan_2025.pdf",
      "observacion": null,
      "estado": true
    }
  }
}
```

---

## 3. Crear Colaborador

```
POST /api/v1/tenant/colaboradores
```

### Body (JSON)

```json
{
  "primer_nombre": "Juan",
  "segundo_nombre": "Carlos",
  "primer_apellido": "Pérez",
  "segundo_apellido": "López",
  "tipo_documento": "CC",
  "documento": "1098765432",
  "fecha_nacimiento": "1990-05-15",
  "fecha_expedicion_documento": "2008-06-01",
  "lugar_expedicion": "Bucaramanga",
  "cargo": "Jornalero",
  "salario_base": 1423500,
  "subsidio_transporte": true,
  "modalidad_pago": "PRODUCCION",
  "predio_id": 1,
  "fecha_ingreso": "2025-01-15",
  "fecha_retiro": null,
  "eps": "Sura",
  "fondo_pension": "Porvenir",
  "fondo_cesantias": "Porvenir",
  "arl": "Sura",
  "caja_compensacion": "Cafam",
  "talla_camisa": "M",
  "talla_pantalon": "32",
  "talla_calzado": "42",
  "tipo_cuenta": "AHORROS",
  "entidad_bancaria": "Bancolombia",
  "numero_cuenta": "04512345678",
  "correo_electronico": "juan@email.com",
  "telefono": "3001234567",
  "direccion": "Calle 45 #12-30",
  "municipio": "Barrancabermeja",
  "departamento": "Santander",
  "contacto_emergencia_nombre": "María López",
  "contacto_emergencia_telefono": "3109876543"
}
```

### Campos obligatorios

| Campo | Tipo | Reglas |
|-------|------|--------|
| `primer_nombre` | string | Máx. 50 caracteres |
| `primer_apellido` | string | Máx. 50 caracteres |
| `tipo_documento` | string | `CC`, `TI`, `PASAPORTE`, `CE`, `PPT` |
| `documento` | string | Máx. 50, único por tenant |
| `fecha_nacimiento` | date | Mínimo 14 años de edad |
| `fecha_expedicion_documento` | date | No puede ser futura |
| `cargo` | string | Máx. 100 caracteres |
| `salario_base` | decimal | **Obligatorio solo si `modalidad_pago=FIJO`**. Mín. 0. Para `PRODUCCION` es opcional — ver nota abajo. |
| `modalidad_pago` | string | Enum: `FIJO` o `PRODUCCION` |
| `fecha_ingreso` | date | No puede ser futura |

### Campos opcionales

| Campo | Tipo | Reglas |
|-------|------|--------|
| `segundo_nombre` | string | Máx. 50 |
| `segundo_apellido` | string | Máx. 50 |
| `lugar_expedicion` | string | Máx. 100 |
| `predio_id` | integer | ID de predio existente (nullable) |
| `fecha_retiro` | date | Debe ser >= fecha_ingreso |
| `eps` | string | Máx. 50 |
| `fondo_pension` | string | Máx. 50 |
| `fondo_cesantias` | string | Máx. 50 |
| `arl` | string | Máx. 50 |
| `subsidio_transporte` | boolean | Default `true`. Indica si el colaborador recibe subsidio de transporte. |
| `caja_compensacion` | string | Máx. 50 |
| `talla_camisa` | string | Máx. 10 |
| `talla_pantalon` | string | Máx. 10 |
| `talla_calzado` | string | Máx. 5 |
| `tipo_cuenta` | string | `AHORROS`, `CORRIENTE`, `EFECTIVO` |
| `entidad_bancaria` | string | Máx. 50 |
| `numero_cuenta` | string | Máx. 30 |
| `correo_electronico` | string | Email válido, máx. 100 |
| `telefono` | string | Máx. 50 |
| `direccion` | string | Máx. 200 |
| `municipio` | string | Máx. 100 |
| `departamento` | string | Máx. 100 |
| `contacto_emergencia_nombre` | string | Máx. 100 |
| `contacto_emergencia_telefono` | string | Máx. 50 |

### Regla especial: `salario_base` por modalidad

- `modalidad_pago = FIJO` → `salario_base` **obligatorio**. Si falta, responde 422 con `errors.salario_base = ["El salario base es obligatorio para modalidad FIJO"]`.
- `modalidad_pago = PRODUCCION` → `salario_base` **opcional**. Si se omite, el backend lo auto-completa con `tenant_config.salario_minimo_vigente` (SMLV configurado a nivel de tenant). El contrato vigente que se genera al crear el colaborador también usa ese mismo salario.
- `modalidad_pago = PRODUCCION` sin `salario_base` **y** el tenant no tiene `salario_minimo_vigente` configurado → responde 422 con `errors.salario_base = ["No hay salario mínimo vigente configurado en el tenant. Configúralo en Ajustes o envía salario_base explícito."]`.

Aplica igual en `PUT /colaboradores/{id}`: si se cambia la modalidad a `PRODUCCION` sin enviar `salario_base`, se defaultea al SMLV del tenant; si se cambia a `FIJO`, `salario_base` pasa a ser obligatorio en ese update.

### Response 201

```json
{
  "message": "Colaborador creado correctamente",
  "data": { "...colaborador con predio cargado..." }
}
```

### Response 422 (validación)

```json
{
  "message": "Error de validación",
  "errors": {
    "documento": ["Ya existe un colaborador con este número de documento"],
    "fecha_nacimiento": ["El colaborador debe tener al menos 14 años"]
  }
}
```

---

## 4. Editar Colaborador

```
PUT /api/v1/tenant/colaboradores/{id}
```

### Body (JSON)

Enviar solo los campos que se desean actualizar. Las mismas reglas que crear, pero todos los campos son opcionales (usan `sometimes`).

Se puede incluir `estado` (boolean) para activar/desactivar.

```json
{
  "primer_nombre": "Juan",
  "cargo": "Supervisor",
  "salario_base": 1800000,
  "predio_id": 2
}
```

### Response 200

```json
{
  "message": "Colaborador actualizado correctamente",
  "data": { "...colaborador actualizado con predio..." }
}
```

---

## 5. Eliminar Colaborador

```
DELETE /api/v1/tenant/colaboradores/{id}
```

> **Comportamiento:** El colaborador se elimina de manera **lógica (soft delete)**.
> Esto preserva todo el historial asociado: jornales, nómina, cosechas, contratos,
> documentos y archivos físicos quedan intactos. El colaborador deja de aparecer en
> listados, dropdowns y reportes operativos. Se puede restaurar con
> `POST /colaboradores/{id}/restaurar`.
>
> Para reportes históricos donde se necesite seguir mostrando el nombre del colaborador
> eliminado, los controladores correspondientes pueden cargar la relación con
> `withTrashed()`.

### Confirmación obligatoria desde el frontend

Antes de invocar este endpoint, el frontend **debe** mostrar un diálogo de
confirmación al usuario advirtiendo del impacto de la acción. Sugerencia de copy:

> ⚠️ **¿Eliminar al colaborador "{nombre_completo}"?**
>
> Esta acción **es irreversible** desde la interfaz operativa: el colaborador
> dejará de aparecer en listados, dropdowns y reportes activos, y se podría
> perder el acceso rápido a su historial (jornales, nómina, cosechas, contratos,
> documentos).
>
> Si tienes dudas, considera **desactivarlo** en su lugar (`PATCH /toggle`) — eso
> lo oculta de las vistas operativas pero lo mantiene en el listado de inactivos.
>
> [Cancelar]   [Sí, eliminar]

> **Nota técnica:** aunque el copy habla en términos de "irreversible" para que
> el usuario lo piense dos veces, internamente es soft delete y un administrador
> puede restaurarlo vía `POST /colaboradores/{id}/restaurar` (visible solo en la
> vista de "Eliminados" usando `?solo_eliminados=true`). El frontend puede
> elegir mostrar este detalle o no según el rol del usuario.

El diálogo debe ser **bloqueante** (modal) y la acción destructiva debe estar
visualmente diferenciada (botón rojo, no-default).

### Response 200

```json
{
  "message": "Colaborador 'Juan Carlos Pérez López' eliminado correctamente"
}
```

---

## 5.5. Restaurar Colaborador

```
POST /api/v1/tenant/colaboradores/{id}/restaurar
```

> **Permiso:** `colaboradores.crear`. Quien pueda crear colaboradores también puede
> restaurarlos (es conceptualmente "volver a darle de alta").

Restaura un colaborador previamente eliminado (soft delete). Mantiene su historial
intacto y vuelve a aparecer en los listados.

### Response 200

```json
{
  "message": "Colaborador 'Juan Carlos Pérez López' restaurado correctamente",
  "data": { "...colaborador con predio y contrato vigente..." }
}
```

### Response 409 — colaborador no eliminado

```json
{
  "message": "El colaborador no está eliminado",
  "code": "EMPLEADO_NO_ELIMINADO"
}
```

### Response 409 — documento duplicado

Cuando, mientras el colaborador estaba eliminado, se creó otro colaborador activo
con el mismo `documento`. No se puede restaurar porque rompería la unicidad.

```json
{
  "message": "No se puede restaurar: ya existe un colaborador activo con este documento",
  "code": "DOCUMENTO_DUPLICADO"
}
```

---

## 6. Activar / Desactivar Colaborador

```
PATCH /api/v1/tenant/colaboradores/{id}/toggle
```

Invierte el estado actual del colaborador (activo ↔ inactivo).

### Response 200

```json
{
  "message": "Colaborador desactivó correctamente",
  "data": {
    "id": 1,
    "estado": false,
    "..."
  }
}
```

---

## Mapeo del Formulario a Secciones

### Sección 1: Datos Personales
- `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`

### Sección 2: Identificación
- `tipo_documento`, `documento`, `fecha_nacimiento`, `fecha_expedicion_documento`, `lugar_expedicion`

### Sección 3: Contratación
- `cargo` (texto libre), `salario_base` (decimal), `subsidio_transporte` (boolean), `modalidad_pago` (`FIJO` / `PRODUCCION`), `predio_id` (select de predios)

### Sección 4: Fechas Laborales
- `fecha_ingreso`, `fecha_retiro`

### Sección 5: Seguridad Social
- `eps`, `arl`, `fondo_pension`, `fondo_cesantias`, `caja_compensacion`

### Sección 6: Dotación
- `talla_camisa`, `talla_pantalon`, `talla_calzado`

### Sección 7: Bancario
- `entidad_bancaria`, `tipo_cuenta`, `numero_cuenta`

### Sección 8: Contacto
- `correo_electronico`, `telefono`, `direccion`, `municipio`, `departamento`
- `contacto_emergencia_nombre`, `contacto_emergencia_telefono`

---

## Tipos de Documento

| Código | Nombre |
|--------|--------|
| `CC` | Cédula de Ciudadanía |
| `TI` | Tarjeta de Identidad |
| `PASAPORTE` | Pasaporte |
| `CE` | Cédula de Extranjería |
| `PPT` | Permiso por Protección Temporal |

---

## Avatar del Colaborador

El colaborador tiene un campo opcional `avatar_url` (URL pública generada a partir de
`avatar_path` interno) que puede usarse para mostrar su foto en listados y vistas de
detalle. La imagen se almacena en el disco `public` (URL accesible directamente, sin
endpoint autenticado).

> Si el colaborador no tiene avatar, `avatar_url` viene `null`. El frontend debe caer
> en las iniciales (primer_nombre + primer_apellido) como fallback.

### Endpoints

| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/colaboradores/{id}/avatar` | `colaboradores.editar` |
| DELETE | `/colaboradores/{id}/avatar` | `colaboradores.editar` |

### Subir / reemplazar avatar

```
POST /api/v1/tenant/colaboradores/{id}/avatar
Content-Type: multipart/form-data
```

#### Body (form-data)

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `avatar` | file (image) | Sí | Solo `jpg`, `jpeg`, `png`, `webp`. Máx. **3 MB**. |

> Si el colaborador ya tenía un avatar previo, el archivo anterior se elimina del disco
> automáticamente y se reemplaza por el nuevo.

#### Response 200

```json
{
  "message": "Avatar actualizado correctamente",
  "data": {
    "id": 1,
    "primer_nombre": "Juan",
    "...": "...",
    "avatar_url": "https://api.tu-dominio.com/storage/tenants/3/empleados/1/avatar/abc123.png"
  }
}
```

#### Response 422

```json
{
  "message": "Error de validación",
  "errors": {
    "avatar": ["El avatar no puede superar los 3 MB"]
  }
}
```

### Eliminar avatar

```
DELETE /api/v1/tenant/colaboradores/{id}/avatar
```

Borra el archivo del disco y deja `avatar_url` en `null`.

#### Response 200

```json
{
  "message": "Avatar eliminado correctamente",
  "data": { "...colaborador con avatar_url: null..." }
}
```

#### Response 409

```json
{
  "message": "El colaborador no tiene avatar asignado",
  "code": "AVATAR_NOT_FOUND"
}
```

---

## Documentos del Colaborador

### Endpoints de Documentos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/colaboradores/documento-categorias` | `colaboradores.ver` | Categorías y tipos de documento |
| GET | `/colaboradores/{id}/documentos` | `colaboradores.ver` | Listar documentos del colaborador |
| POST | `/colaboradores/{id}/documentos` | `colaboradores.editar` | Subir documento |
| GET | `/colaboradores/{id}/documentos/{docId}` | `colaboradores.ver` | Detalle de un documento |
| GET | `/colaboradores/{id}/documentos/{docId}/descargar` | `colaboradores.ver` | Descargar archivo (Content-Disposition: attachment) |
| GET | `/colaboradores/{id}/documentos/{docId}/visualizar` | `colaboradores.ver` | Visualizar archivo inline (preview en navegador) |
| DELETE | `/colaboradores/{id}/documentos/{docId}` | `colaboradores.editar` | Eliminar documento |

---

### 7. Categorías de Documentos

```
GET /api/v1/tenant/colaboradores/documento-categorias
```

Retorna la estructura de categorías y tipos disponibles. El frontend usa esto para renderizar las pestañas y tipos de documento por cada sección.

### Response 200

```json
{
  "data": {
    "DATOS_BASE": {
      "label": "Datos base",
      "unico_por_tipo": true,
      "tipos": {
        "DOCUMENTO_DE_IDENTIDAD": "Documento de identidad",
        "HOJA_DE_VIDA": "Hoja de vida",
        "ANTECEDENTES": "Antecedentes",
        "AUTORIZACION_DATOS_PERSONALES": "Autorización de datos personales"
      }
    },
    "CONTRATACION_LABORAL": {
      "label": "Contratación laboral",
      "unico_por_tipo": false,
      "tipos": {
        "CONTRATO_DE_TRABAJO": "Contrato de trabajo",
        "ACUERDO_DE_CONFIDENCIALIDAD": "Acuerdo de confidencialidad"
      }
    },
    "SST": {
      "label": "SST",
      "unico_por_tipo": false,
      "tipos": {
        "EXAMEN_DE_INGRESO": "Examen de ingreso"
      }
    },
    "PERMISOS_LICENCIAS": {
      "label": "Permisos, Licencias e Incapacidades",
      "unico_por_tipo": false,
      "permite_tipo_personalizado": true,
      "tipos": {}
    },
    "FINALIZACION_CONTRATO": {
      "label": "Finalización de contrato",
      "unico_por_tipo": false,
      "tipos": {
        "FINALIZACION_CONTRATO": "Finalización de contrato"
      }
    },
    "DESPRENDIBLES": {
      "label": "Desprendibles",
      "unico_por_tipo": false,
      "tipos": {
        "DESPRENDIBLES": "Desprendibles"
      }
    },
    "OTROS": {
      "label": "Otros",
      "unico_por_tipo": false,
      "permite_tipo_personalizado": true,
      "tipos": {}
    }
  }
}
```

> **Nota para el frontend:**
> - `unico_por_tipo: true` → Solo puede existir un documento por tipo. Al subir uno nuevo, el backend reemplaza el anterior automáticamente.
> - `unico_por_tipo: false` → Se pueden subir múltiples documentos del mismo tipo.
> - `permite_tipo_personalizado: true` → El usuario puede escribir un tipo libre (categorías "Permisos/Licencias" y "Otros").
> - **PERMISOS_LICENCIAS**: El `tipo_documento` viene del frontend (texto libre).
> - **FINALIZACION_CONTRATO**: El `tipo_documento` siempre es `FINALIZACION_CONTRATO`.
> - **DESPRENDIBLES**: El `tipo_documento` siempre es `DESPRENDIBLES`.

---

### 8. Listar Documentos del Colaborador

```
GET /api/v1/tenant/colaboradores/{id}/documentos
```

### Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `categoria` | string | Filtra por categoría (ej: `DATOS_BASE`, `SST`, `CONTRATACION_LABORAL`) |

### Response 200

```json
{
  "data": [
    {
      "id": 1,
      "categoria": "DATOS_BASE",
      "tipo_documento": "DOCUMENTO_DE_IDENTIDAD",
      "nombre_archivo": "Documento de identidad",
      "archivo_nombre_original": "cedula_scan.pdf",
      "mime_type": "application/pdf",
      "archivo_tamano": 245760,
      "fecha_documento": "2024-03-15",
      "observacion": null,
      "subido_por": {
        "id": 5,
        "name": "Admin"
      },
      "estado": true,
      "created_at": "2026-04-06T10:30:00.000000Z",
      "updated_at": "2026-04-06T10:30:00.000000Z"
    }
  ]
}
```

---

### 9. Subir Documento

```
POST /api/v1/tenant/colaboradores/{id}/documentos
```

> **Content-Type:** `multipart/form-data`

### Body (form-data)

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `archivo` | file | Sí | Máx. 10 MB. Tipos: pdf, jpg, jpeg, png, webp, doc, docx, xls, xlsx |
| `categoria` | string | Sí | Categoría válida de `DocumentoCategoria` |
| `tipo_documento` | string | Sí | Tipo válido para la categoría, máx. 80 caracteres |
| `nombre_archivo` | string | No | Nombre descriptivo (default: nombre original del archivo) |
| `fecha_documento` | date | No | Fecha del documento, no puede ser futura |
| `observacion` | string | No | Máx. 500 caracteres |

> **Comportamiento con documentos únicos:** Si la categoría tiene `unico_por_tipo: true` (actualmente solo `DATOS_BASE`) y ya existe un documento del mismo tipo para ese colaborador, el archivo anterior se elimina automáticamente y se reemplaza por el nuevo. El resto de las categorías (`CONTRATACION_LABORAL`, `SST`, `PERMISOS_LICENCIAS`, `FINALIZACION_CONTRATO`, `DESPRENDIBLES`, `OTROS`) permiten acumular varios documentos del mismo tipo.

### Response 201

```json
{
  "message": "Documento subido correctamente",
  "data": {
    "id": 2,
    "categoria": "DATOS_BASE",
    "tipo_documento": "DOCUMENTO_DE_IDENTIDAD",
    "nombre_archivo": "Documento de identidad",
    "archivo_nombre_original": "cedula_scan.pdf",
    "mime_type": "application/pdf",
    "archivo_tamano": 245760,
    "fecha_documento": "2024-03-15",
    "observacion": null,
    "subido_por": {
      "id": 5,
      "name": "Admin"
    },
    "estado": true,
    "created_at": "2026-04-06T11:00:00.000000Z",
    "updated_at": "2026-04-06T11:00:00.000000Z"
  }
}
```

### Response 422 (validación)

```json
{
  "message": "Error de validación",
  "errors": {
    "archivo": ["El archivo no puede superar los 10 MB"],
    "categoria": ["La categoría seleccionada no es válida"]
  }
}
```

---

### 10. Detalle de Documento

```
GET /api/v1/tenant/colaboradores/{id}/documentos/{docId}
```

### Response 200

```json
{
  "data": {
    "id": 1,
    "categoria": "DATOS_BASE",
    "tipo_documento": "DOCUMENTO_DE_IDENTIDAD",
    "nombre_archivo": "Documento de identidad",
    "archivo_nombre_original": "cedula_scan.pdf",
    "mime_type": "application/pdf",
    "archivo_tamano": 245760,
    "fecha_documento": "2024-03-15",
    "observacion": null,
    "subido_por": {
      "id": 5,
      "name": "Admin"
    },
    "estado": true,
    "created_at": "2026-04-06T10:30:00.000000Z",
    "updated_at": "2026-04-06T10:30:00.000000Z"
  }
}
```

---

### 11. Descargar Documento

```
GET /api/v1/tenant/colaboradores/{id}/documentos/{docId}/descargar
```

Retorna una respuesta **binaria** (`BinaryFileResponse`), **no JSON**, con los siguientes headers:

| Header | Valor |
|--------|-------|
| `Content-Type` | El mime original del archivo (ej. `application/pdf`, `image/png`) |
| `Content-Disposition` | `attachment; filename="<archivo_nombre_original>"` (fuerza descarga) |
| `Content-Length` | Tamaño del archivo en bytes |

### Almacenamiento privado

Los archivos se guardan en `storage/app/private/tenants/{tenantId}/empleados/{empleadoId}/documentos/` usando el disco `local` de Laravel, que apunta a esa carpeta privada.

**¿Por qué privado?** Los documentos contienen datos sensibles (cédulas, contratos, exámenes médicos, desprendibles). La carpeta `private` **no está expuesta** por el servidor web (a diferencia de `storage/app/public/`), por lo que no existe una URL pública directa al archivo. El único acceso es a través de este endpoint, que valida:

1. Autenticación (`Authorization: Bearer {token}`).
2. Tenant correcto (`X-Tenant-Id`).
3. Que el documento pertenezca al colaborador solicitado.
4. Permiso `colaboradores.ver`.

### Uso desde el frontend

> **Importante:** No abrir la URL en una nueva pestaña con `window.open()` ni `<a href>` directo. El navegador **no enviará** los headers `Authorization` ni `X-Tenant-Id`, y la respuesta será `401 Unauthorized`.

Debe hacerse la petición por JS solicitando la respuesta como `blob` y luego disparar la descarga manualmente.

**Ejemplo con Axios:**

```js
const { data, headers } = await axios.get(
  `/api/v1/tenant/colaboradores/${empleadoId}/documentos/${docId}/descargar`,
  {
    responseType: 'blob',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
    },
  }
);

// Extraer el nombre del archivo del header Content-Disposition
const match = /filename="(.+)"/.exec(headers['content-disposition'] || '');
const filename = match ? match[1] : 'documento';

// Disparar descarga
const url = window.URL.createObjectURL(new Blob([data]));
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
window.URL.revokeObjectURL(url);
```

**Ejemplo con Fetch:**

```js
const res = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  },
});
const blob = await res.blob();
// ... mismo patrón con createObjectURL
```

> **Errores comunes en el frontend:**
> - **"Unexpected token in JSON"** → El cliente intentó parsear el binario como JSON. Solución: usar `responseType: 'blob'`.
> - **401 Unauthorized** → Se abrió por URL directa sin headers. Solución: descargar por JS.
> - **404 `Archivo no encontrado en el servidor`** → El registro existe en BD pero el archivo físico se borró del disco.

### Response 200

Archivo binario (descarga directa).

### Response 404

```json
{
  "message": "Archivo no encontrado en el servidor"
}
```

---

### 11.5. Visualizar Documento (preview inline)

```
GET /api/v1/tenant/colaboradores/{id}/documentos/{docId}/visualizar
```

A diferencia de `descargar` (que envía `Content-Disposition: attachment` y fuerza el
diálogo "Guardar como"), este endpoint retorna `Content-Disposition: inline`, lo que
permite renderizar el archivo directamente en el navegador (PDF en `<iframe>`, imagen
en `<img>`).

### Mime types soportados

Solo se permite la previsualización para los siguientes tipos:

| Mime type | Render típico |
|-----------|----------------|
| `application/pdf` | `<iframe>` |
| `image/jpeg` / `image/png` / `image/webp` | `<img>` |

Para otros mime types (docx, xlsx, doc, xls, etc.) responde `415` con código
`MIME_NOT_PREVIEWABLE` y el frontend debe redirigir al endpoint `/descargar`.

### Headers de respuesta (200)

| Header | Valor |
|--------|-------|
| `Content-Type` | El mime original del documento |
| `Content-Disposition` | `inline; filename="<archivo_nombre_original>"` |
| `Content-Length` | Tamaño del archivo en bytes |

### Uso desde el frontend

> **Importante:** Igual que `descargar`, este endpoint requiere `Authorization` y
> `X-Tenant-Id`. **No se puede usar la URL directamente en `<iframe src=...>` ni
> `<embed>`** porque el navegador no envía esos headers en una navegación de iframe
> y la respuesta sería `401 Unauthorized`.

El front debe pedir el archivo como `blob`, generar un `objectURL` con
`URL.createObjectURL` y asignarlo al elemento de UI.

```js
const { data } = await axios.get(
  `/api/v1/tenant/colaboradores/${empleadoId}/documentos/${docId}/visualizar`,
  {
    responseType: 'blob',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
    },
  }
);

const objectUrl = URL.createObjectURL(data);

// PDF:    <iframe :src="objectUrl" />
// Imagen: <img    :src="objectUrl" />

// Acuérdate de revocarlo al desmontar la vista para liberar memoria:
// URL.revokeObjectURL(objectUrl);
```

### Manejo de 415 (mime no previsualizable)

```js
try {
  const res = await axios.get(visualizarUrl, { responseType: 'blob', headers });
  // ... preview
} catch (err) {
  if (err.response?.status === 415) {
    // Caer al endpoint de descarga
    window.location.href = descargarUrl;  // o axios + blob + a.click()
  }
}
```

> **Tip:** como axios devuelve el body 415 como `Blob`, para leer el `code` hay que
> parsearlo: `const text = await err.response.data.text(); JSON.parse(text)`.
> Una alternativa más simple es chequear `mime_type` antes de pedir `/visualizar` y
> elegir el endpoint adecuado en el cliente.

### Response 200

Archivo binario (renderizado inline en navegador).

### Response 415 — mime no previsualizable

```json
{
  "message": "Este tipo de archivo no se puede visualizar inline. Use el endpoint de descarga.",
  "code": "MIME_NOT_PREVIEWABLE",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
```

### Response 404 — archivo no encontrado

```json
{
  "message": "Archivo no encontrado en el servidor"
}
```

---

### 12. Eliminar Documento

```
DELETE /api/v1/tenant/colaboradores/{id}/documentos/{docId}
```

Elimina el registro y el archivo físico del servidor.

### Response 200

```json
{
  "message": "Documento 'DOCUMENTO_DE_IDENTIDAD' eliminado correctamente"
}
```

---

## Paramétricas del Colaborador (dropdowns del formulario)

Estos endpoints alimentan los selectores de **EPS**, **fondo de pensión**, **fondo de cesantías**, **ARL** y **entidad bancaria** del formulario de creación/edición de colaboradores. No forman parte del módulo de colaboradores en sí: la edición del catálogo se hace desde Configuración (permiso `configuracion.editar`). El colaborador guarda el **nombre** seleccionado, no el `id` — esto preserva el histórico aunque el catálogo cambie en el futuro.

### Selects (lectura para dropdowns)

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/eps/select` | `configuracion.editar` o `colaboradores.{ver|crear|editar}` |
| GET | `/fondos-pension/select` | idem |
| GET | `/fondos-cesantias/select` | idem |
| GET | `/arl/select` | idem |
| GET | `/entidades-bancarias/select` | idem |

#### Response 200

Todos los selects devuelven el mismo formato:

```json
{
  "data": [
    { "id": 1, "nombre": "Sura" },
    { "id": 2, "nombre": "Sanitas" },
    { "id": 3, "nombre": "Compensar" }
  ]
}
```

**Comportamiento:**
- Devuelven **solo activos** (`estado = true`).
- Sin paginación.
- Ordenados alfabéticamente por `nombre`.
- El frontend toma el `nombre` del item seleccionado y lo envía en el campo correspondiente del payload de `POST /colaboradores`:
  - `eps/select` → campo `eps`
  - `fondos-pension/select` → campo `fondo_pension`
  - `fondos-cesantias/select` → campo `fondo_cesantias`
  - `arl/select` → campo `arl`
  - `entidades-bancarias/select` → campo `entidad_bancaria`

> Nota: empleados creados antes de existir el catálogo pueden tener un valor que ya no esté en el dropdown. El frontend debe permitir mostrarlo (input pre-cargado con el valor legacy).

### CRUD de las paramétricas

Para administrar el catálogo (crear/editar/eliminar EPS, fondos, ARL o entidades bancarias) hay endpoints CRUD bajo permiso `configuracion.editar`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/eps`, `/fondos-pension`, `/arl`, `/entidades-bancarias` | Listar paginado (acepta `?search=` y `?estado=true|false`) |
| GET | `/eps/{id}` (idem otros) | Detalle |
| POST | `/eps` (idem otros) | Crear (`{ "nombre": "...", "estado": true }`) |
| PUT | `/eps/{id}` (idem otros) | Editar |
| DELETE | `/eps/{id}` (idem otros) | Eliminar |

#### Reglas de validación
- `nombre`: requerido, máx. 100, único por tenant.
- `estado`: opcional, boolean (default `true` al crear).

#### Auditoría
Toda creación, edición y eliminación queda registrada en `auditorias` con módulo `EPS`, `FONDOS_PENSION`, `FONDOS_CESANTIAS`, `ARL` o `ENTIDADES_BANCARIAS`.

---

## Códigos de Error

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `EMPLEADO_NO_ELIMINADO` | Se intentó restaurar un colaborador que no está eliminado |
| 409 | `DOCUMENTO_DUPLICADO` | Al restaurar, ya existe otro colaborador activo con el mismo documento |
| 409 | `AVATAR_NOT_FOUND` | Se intentó borrar el avatar de un colaborador que no tiene avatar asignado |
| 415 | `MIME_NOT_PREVIEWABLE` | El documento no es visualizable inline (use el endpoint de descarga) |
| 422 | — | Error de validación (ver campo `errors`) |
| 500 | — | Error interno del servidor |
