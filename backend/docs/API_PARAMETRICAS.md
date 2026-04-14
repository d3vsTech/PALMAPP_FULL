# API — Tablas Paramétricas

**Base URL:** `{host}/api/v1/tenant`
**Headers requeridos en TODAS las peticiones:**
```
Authorization: Bearer {jwt_token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
```
**Permiso requerido:** `configuracion.editar` (aplica a todos los endpoints de este módulo)

---

## Parámetros comunes de listado (GET index)

Todos los endpoints de listado soportan:

| Parámetro  | Tipo    | Descripción |
|------------|---------|-------------|
| `search`   | string  | Filtra por nombre (búsqueda parcial) |
| `estado`   | boolean | Filtra por estado (`true` / `false`) |
| `per_page` | integer | Registros por página (default: 15) |
| `page`     | integer | Página actual |

La respuesta de listado siempre incluye:
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

---

## 1. Semillas

Catálogo de variedades de palma (híbrido, ténera, dura).

### Endpoints

| Método   | URL                      | Descripción |
|----------|--------------------------|-------------|
| `GET`    | `/semillas`              | Listar semillas |
| `GET`    | `/semillas/{id}`         | Ver detalle |
| `POST`   | `/semillas`              | Crear semilla |
| `PUT`    | `/semillas/{id}`         | Editar semilla |
| `DELETE` | `/semillas/{id}`         | Eliminar semilla |

### Crear / Editar

```json
// POST /semillas
{
  "tipo": "HIBRIDO",
  "nombre": "Deli x Ghana"
}

// PUT /semillas/{id}
{
  "tipo": "TENERA",
  "nombre": "Deli x Ghana v2",
  "estado": false
}
```

---

## 2. Insumos

Catálogo de fertilizantes, herbicidas y productos agrícolas. Solo registra **qué producto es** (nombre + unidad de medida). El precio de la labor de abono NO depende del insumo — se calcula con las **escalas genéricas de Precios de Abono** (ver sección 3).

### Endpoints

| Método   | URL                      | Descripción |
|----------|--------------------------|-------------|
| `GET`    | `/insumos`               | Listar insumos |
| `GET`    | `/insumos/{id}`          | Ver detalle (incluye labores asociadas) |
| `POST`   | `/insumos`               | Crear insumo |
| `PUT`    | `/insumos/{id}`          | Editar insumo |
| `DELETE` | `/insumos/{id}`          | Eliminar insumo (falla si tiene labores activas) |

### Crear / Editar

```json
// POST /insumos
{
  "nombre": "Urea 46%",
  "unidad_medida": "gramos"
}

// PUT /insumos/{id}
{
  "nombre": "Urea granulada",
  "estado": false
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `INSUMO_CON_LABORES` | No se puede eliminar porque tiene labores activas asociadas |

---

## 3. Precios de Abono (escalas genéricas)

Tabla de escalas de precio por palma según gramos aplicados. Es **genérica por tenant** — aplica a **todas** las labores de tipo `POR_PALMA_INSUMO` sin importar qué insumo se entregue. Cuando un trabajador abona, se busca en esta tabla cuántos gramos aplicó por palma y se obtiene el precio correspondiente.

```
Ejemplo de escalas:
  100g - 200g → $50 por palma
  201g - 400g → $85 por palma
  401g - 600g → $110 por palma

Trabajador abona 150 palmas a 200g/palma:
  → Rango 100-200g → $50/palma
  → 150 × $50 = $7,500
```

### Endpoints

| Método   | URL                          | Descripción |
|----------|------------------------------|-------------|
| `GET`    | `/precios-abono`             | Listar todas las escalas (ordenadas por gramos_min) |
| `POST`   | `/precios-abono`             | Crear nuevo rango |
| `PUT`    | `/precios-abono/{id}`        | Editar rango |
| `DELETE` | `/precios-abono/{id}`        | Eliminar rango |

> **Nota:** No tiene paginación — retorna todos los rangos del tenant (típicamente son pocos, 3-6 registros).

### Crear / Editar

```json
// POST /precios-abono
{
  "gramos_min": 100,
  "gramos_max": 200,
  "precio_palma": 50.00
}

// PUT /precios-abono/{id}
{
  "precio_palma": 55.00,
  "estado": false
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `RANGO_SOLAPADO` | El rango de gramos se solapa con un rango existente |

---

## 4. Labores

Tipos de trabajo en campo con 3 formas de pago.

### Endpoints

| Método   | URL                      | Descripción |
|----------|--------------------------|-------------|
| `GET`    | `/labores`               | Listar labores (filtrable por `tipo_pago`) |
| `GET`    | `/labores/{id}`          | Ver detalle (incluye insumo asociado) |
| `POST`   | `/labores`               | Crear labor |
| `PUT`    | `/labores/{id}`          | Editar labor |
| `DELETE` | `/labores/{id}`          | Eliminar labor (falla si tiene jornales) |

### Filtros adicionales

| Parámetro   | Valores posibles |
|-------------|-----------------|
| `tipo_pago` | `JORNAL_FIJO`, `POR_PALMA_INSUMO`, `POR_PALMA_SIMPLE` |

### Tipos de pago y campos requeridos

#### JORNAL_FIJO — Pago fijo por día
```json
{
  "nombre": "Guadaña",
  "tipo_pago": "JORNAL_FIJO",
  "valor_base": 55000.00,
  "unidad_medida": "JORNAL"
}
```
- `valor_base`: tarifa diaria (obligatorio)
- `insumo_id`: **NO** debe enviarse

#### POR_PALMA_INSUMO — Pago por palma según escalas de abono
```json
{
  "nombre": "Fertilización con Urea",
  "tipo_pago": "POR_PALMA_INSUMO",
  "insumo_id": 1,
  "unidad_medida": "PALMAS"
}
```
- `insumo_id`: obligatorio (indica qué producto se entrega, pero **NO determina el precio**)
- `valor_base`: no se usa — el precio viene de la tabla genérica `precios-abono` según los gramos aplicados
- Al registrar un jornal de esta labor, el sistema busca en `precios-abono` el rango de gramos y multiplica × palmas

#### POR_PALMA_SIMPLE — Pago fijo por palma, sin insumo
```json
{
  "nombre": "Plateo",
  "tipo_pago": "POR_PALMA_SIMPLE",
  "valor_base": 120.00,
  "unidad_medida": "PALMAS"
}
```
- `valor_base`: precio por palma (obligatorio)
- `insumo_id`: **NO** debe enviarse

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `LABOR_CON_JORNALES` | No se puede eliminar porque tiene jornales asociados |

---

## 5. Promedios por Lote

Promedio de kg/gajo por lote por año. Usado en el cálculo de cosecha.

### Endpoints

| Método   | URL                              | Descripción |
|----------|----------------------------------|-------------|
| `GET`    | `/promedios-lote`                | Listar promedios |
| `GET`    | `/promedios-lote/{id}`           | Ver detalle |
| `POST`   | `/promedios-lote`                | Crear promedio |
| `PUT`    | `/promedios-lote/{id}`           | Editar promedio |
| `DELETE` | `/promedios-lote/{id}`           | Eliminar promedio |

### Filtros adicionales

| Parámetro | Tipo    | Descripción |
|-----------|---------|-------------|
| `lote_id` | integer | Filtrar por lote |
| `anio`    | integer | Filtrar por año |

### Crear / Editar

```json
// POST /promedios-lote
{
  "lote_id": 5,
  "promedio": 12.50,
  "anio": 2026
}

// PUT /promedios-lote/{id}
{
  "promedio": 13.20
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `PROMEDIO_DUPLICADO` | Ya existe un promedio para ese lote en ese año |

---

## 6. Cargos

Puestos de trabajo con tipo de salario (FIJO o VARIABLE).

### Endpoints

| Método   | URL                      | Descripción |
|----------|--------------------------|-------------|
| `GET`    | `/cargos`                | Listar cargos (incluye conteo de empleados) |
| `GET`    | `/cargos/{id}`           | Ver detalle |
| `POST`   | `/cargos`                | Crear cargo |
| `PUT`    | `/cargos/{id}`           | Editar cargo |
| `DELETE` | `/cargos/{id}`           | Eliminar cargo (falla si tiene empleados activos) |

### Filtros adicionales

| Parámetro      | Valores posibles |
|----------------|-----------------|
| `salario_tipo` | `FIJO`, `VARIABLE` |

### Crear / Editar

```json
// POST /cargos
{
  "modalidad_id": 1,
  "nombre": "Jornalero",
  "salario_tipo": "VARIABLE",
  "salario": null
}

// POST /cargos
{
  "modalidad_id": 2,
  "nombre": "Administrador de campo",
  "salario_tipo": "FIJO",
  "salario": 2500000.00
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `CARGO_CON_EMPLEADOS` | No se puede eliminar porque tiene empleados activos |

---

## 7. Modalidades de Contrato

Tipos de contrato laboral (indefinido, obra/labor, fijo, prestación de servicios).

### Endpoints

| Método   | URL                          | Descripción |
|----------|------------------------------|-------------|
| `GET`    | `/modalidades`               | Listar modalidades (incluye conteo de cargos) |
| `GET`    | `/modalidades/{id}`          | Ver detalle |
| `POST`   | `/modalidades`               | Crear modalidad |
| `PUT`    | `/modalidades/{id}`          | Editar modalidad |
| `DELETE` | `/modalidades/{id}`          | Eliminar modalidad (falla si tiene cargos activos) |

### Crear / Editar

```json
// POST /modalidades
{
  "nombre": "Contrato a término indefinido",
  "descripcion": "Contrato sin fecha de finalización"
}

// PUT /modalidades/{id}
{
  "nombre": "Indefinido",
  "estado": false
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `MODALIDAD_CON_CARGOS` | No se puede eliminar porque tiene cargos activos |

---

## 8. Configuración de Nómina

Configuración del tenant para el módulo de nómina. Solo 2 endpoints (ver y editar).

### Endpoints

| Método | URL                        | Descripción |
|--------|----------------------------|-------------|
| `GET`  | `/configuracion/nomina`    | Ver configuración actual |
| `PUT`  | `/configuracion/nomina`    | Editar campos permitidos |

### Respuesta (GET)

```json
{
  "data": {
    "tipo_pago_nomina": "QUINCENAL",
    "salario_minimo_vigente": 1300000.00,
    "auxilio_transporte": 162000.00,
    "moneda": "COP",
    "zona_horaria": "America/Bogota",
    "pais": "CO"
  }
}
```

### Editar (PUT)

Solo se pueden editar estos 3 campos. Los demás (`moneda`, `zona_horaria`, `pais`) son de solo lectura.

```json
// PUT /configuracion/nomina
{
  "tipo_pago_nomina": "MENSUAL",
  "salario_minimo_vigente": 1300000.00,
  "auxilio_transporte": 162000.00
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `tipo_pago_nomina` | string | `QUINCENAL` o `MENSUAL` |
| `salario_minimo_vigente` | decimal | Salario mínimo legal vigente |
| `auxilio_transporte` | decimal | Auxilio de transporte vigente |

---

## 9. Precios de Cosecha

Precio por kilogramo de fruto cosechado, por lote y año. Un lote solo puede tener un precio por año.

### Endpoints

| Método   | URL                              | Descripción |
|----------|----------------------------------|-------------|
| `GET`    | `/precios-cosecha`               | Listar precios de cosecha |
| `GET`    | `/precios-cosecha/{id}`          | Ver detalle |
| `POST`   | `/precios-cosecha`               | Crear precio de cosecha |
| `PUT`    | `/precios-cosecha/{id}`          | Editar precio de cosecha |
| `DELETE` | `/precios-cosecha/{id}`          | Eliminar precio de cosecha |

### Filtros (GET index)

| Parámetro | Tipo    | Descripción |
|-----------|---------|-------------|
| `lote_id` | integer | Filtra por lote |
| `anio`    | integer | Filtra por año |
| `per_page`| integer | Registros por página (default: 15) |

### Crear (POST)

```json
{
  "lote_id": 1,
  "precio": 450.50,
  "anio": 2026
}
```

| Campo     | Tipo    | Requerido | Validación |
|-----------|---------|-----------|------------|
| `lote_id` | integer | **Sí**    | Debe existir en `lotes` |
| `precio`  | decimal | **Sí**    | min: 0, max: 99999999.99 |
| `anio`    | integer | **Sí**    | min: 2000, max: 2100 |

### Editar (PUT)

```json
{
  "precio": 500.00,
  "anio": 2026
}
```

Ambos campos son opcionales (`sometimes`). Si cambia el año, se valida unicidad lote+año.

### Respuesta 201 (crear) / 200 (editar)

```json
{
  "message": "Precio de cosecha creado correctamente",
  "data": {
    "id": 1,
    "lote_id": 1,
    "precio": "450.50",
    "anio": 2026,
    "lote": {
      "id": 1,
      "nombre": "Lote Norte"
    }
  }
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `PRECIO_COSECHA_DUPLICADO` | Ya existe un precio para este lote en el año indicado |

---

## 10. Auditoría del Tenant

Historial de acciones realizadas dentro de la finca. Solo lectura — los registros se generan automáticamente al crear, editar o eliminar recursos.

### Endpoints

| Método | URL                      | Descripción |
|--------|--------------------------|-------------|
| `GET`  | `/auditorias`            | Listar historial de auditoría |
| `GET`  | `/auditorias/{id}`       | Ver detalle de un registro |

### Filtros (GET index)

| Parámetro     | Tipo    | Descripción |
|---------------|---------|-------------|
| `search`      | string  | Busca en usuario, correo, observaciones y módulo |
| `accion`      | string  | Filtra por tipo de acción (`CREAR`, `EDITAR`, `ELIMINAR`, etc.) |
| `modulo`      | string  | Filtra por módulo (`LINEAS`, `PALMAS`, `USERS`, etc.) |
| `user_id`     | integer | Filtra por ID del usuario que realizó la acción |
| `fecha_desde` | date    | Fecha inicio (formato `YYYY-MM-DD`) |
| `fecha_hasta` | date    | Fecha fin (formato `YYYY-MM-DD`) |
| `sort_by`     | string  | Ordenar por: `created_at`, `accion`, `modulo`, `usuario` (default: `created_at`) |
| `sort_dir`    | string  | Dirección: `asc` o `desc` (default: `desc`) |
| `per_page`    | integer | Registros por página (default: 15) |
| `page`        | integer | Página actual |

### Respuesta del listado (200)

```json
{
  "data": [
    {
      "id": 45,
      "accion": "CREAR",
      "fecha": "30/03/2026 14:30:00",
      "usuario": "Juan Pérez",
      "correo": "juan@finca.com",
      "modulo": "LINEAS",
      "observaciones": "Se crearon 3 línea(s) con 95 palmas en sublote 'Sublote A1'",
      "direccion_ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0 ...",
      "datos_anteriores": null,
      "datos_nuevos": { "..." }
    }
  ],
  "current_page": 1,
  "last_page": 5,
  "per_page": 15,
  "total": 72
}
```

### Respuesta del detalle (200)

```json
{
  "data": {
    "id": 45,
    "accion": "CREAR",
    "fecha": "30/03/2026 14:30:00",
    "usuario": "Juan Pérez",
    "correo": "juan@finca.com",
    "modulo": "LINEAS",
    "observaciones": "Se crearon 3 línea(s) con 95 palmas en sublote 'Sublote A1'",
    "direccion_ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0 ...",
    "datos_anteriores": null,
    "datos_nuevos": { "..." },
    "created_at": "2026-03-30T14:30:00.000000Z"
  }
}
```

### Tipos de acción

| Acción                  | Descripción |
|-------------------------|-------------|
| `CREAR`                 | Creación de un registro |
| `EDITAR`                | Edición de un registro |
| `ELIMINAR`              | Eliminación de un registro |
| `ACTUALIZAR_PERMISOS`   | Cambio de permisos de usuario |
| `REVOCAR_PERMISOS`      | Revocación de permisos |

---

## Códigos de error comunes

| HTTP | Significado |
|------|-------------|
| 401  | Token JWT inválido o expirado |
| 403  | Sin permiso `configuracion.editar` |
| 404  | Recurso no encontrado |
| 409  | Conflicto (no se puede eliminar por dependencias) |
| 422  | Error de validación (ver campo `errors`) |
| 500  | Error interno del servidor |
