# API de Colaboradores

> Base URL: `/api/v1/tenant`
> Requiere: `Authorization: Bearer {token}` + `X-Tenant-Id: {id}`

---

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/colaboradores` | `colaboradores.ver` | Listar colaboradores (paginado) |
| GET | `/colaboradores/{id}` | `colaboradores.ver` | Detalle de un colaborador |
| POST | `/colaboradores` | `colaboradores.crear` | Crear colaborador |
| PUT | `/colaboradores/{id}` | `colaboradores.editar` | Editar colaborador |
| DELETE | `/colaboradores/{id}` | `colaboradores.eliminar` | Eliminar colaborador |
| PATCH | `/colaboradores/{id}/toggle` | `colaboradores.editar` | Activar/Desactivar |

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
      "modalidad_pago": "PRODUCCION",
      "correo_electronico": "juan@email.com",
      "telefono": "3001234567",
      "direccion": "Calle 45 #12-30",
      "municipio": "Barrancabermeja",
      "departamento": "Santander",
      "eps": "Sura",
      "fondo_pension": "Porvenir",
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
    "modalidad_pago": "PRODUCCION",
    "correo_electronico": "juan@email.com",
    "telefono": "3001234567",
    "direccion": "Calle 45 #12-30",
    "municipio": "Barrancabermeja",
    "departamento": "Santander",
    "eps": "Sura",
    "fondo_pension": "Porvenir",
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
  "modalidad_pago": "PRODUCCION",
  "predio_id": 1,
  "fecha_ingreso": "2025-01-15",
  "fecha_retiro": null,
  "eps": "Sura",
  "fondo_pension": "Porvenir",
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
| `salario_base` | decimal | Mín. 0 |
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
| `arl` | string | Máx. 50 |
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

> **Restricciones:** No se puede eliminar si tiene jornales o registros de nómina asociados.

### Response 200

```json
{
  "message": "Colaborador 'Juan Carlos Pérez López' eliminado correctamente"
}
```

### Response 409 (conflicto)

```json
{
  "message": "No se puede eliminar el colaborador porque tiene jornales registrados",
  "code": "EMPLEADO_CON_JORNALES"
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
- `cargo` (texto libre), `salario_base` (decimal), `modalidad_pago` (`FIJO` / `VARIABLE`), `predio_id` (select de predios)

### Sección 4: Fechas Laborales
- `fecha_ingreso`, `fecha_retiro`

### Sección 5: Seguridad Social
- `eps`, `arl`, `fondo_pension`, `caja_compensacion`

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

## Documentos del Colaborador

### Endpoints de Documentos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/colaboradores/documento-categorias` | `colaboradores.ver` | Categorías y tipos de documento |
| GET | `/colaboradores/{id}/documentos` | `colaboradores.ver` | Listar documentos del colaborador |
| POST | `/colaboradores/{id}/documentos` | `colaboradores.editar` | Subir documento |
| GET | `/colaboradores/{id}/documentos/{docId}` | `colaboradores.ver` | Detalle de un documento |
| GET | `/colaboradores/{id}/documentos/{docId}/descargar` | `colaboradores.ver` | Descargar archivo |
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
      "unico_por_tipo": true,
      "tipos": {
        "CONTRATO_DE_TRABAJO": "Contrato de trabajo",
        "ACUERDO_DE_CONFIDENCIALIDAD": "Acuerdo de confidencialidad"
      }
    },
    "SST": {
      "label": "SST",
      "unico_por_tipo": true,
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

> **Comportamiento con documentos únicos:** Si la categoría tiene `unico_por_tipo: true` (ej: `DATOS_BASE`, `CONTRATACION_LABORAL`, `SST`) y ya existe un documento del mismo tipo para ese colaborador, el archivo anterior se elimina automáticamente y se reemplaza por el nuevo.

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

Retorna el archivo binario con headers `Content-Disposition: attachment` y el `Content-Type` correspondiente.

> **Nota:** Los archivos se almacenan en disco privado (no accesibles por URL directa). Solo se pueden descargar a través de este endpoint autenticado.

### Response 200

Archivo binario (descarga directa).

### Response 404

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

## Códigos de Error

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `EMPLEADO_CON_JORNALES` | Tiene jornales registrados, no se puede eliminar |
| 409 | `EMPLEADO_CON_NOMINA` | Tiene registros de nómina, no se puede eliminar |
| 422 | — | Error de validación (ver campo `errors`) |
| 500 | — | Error interno del servidor |
