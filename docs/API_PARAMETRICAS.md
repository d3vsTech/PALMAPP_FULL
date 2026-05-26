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

| Método   | URL                      | Permiso | Descripción |
|----------|--------------------------|---------|-------------|
| `GET`    | `/semillas/select`       | `configuracion.editar` **o** `lotes.{ver\|crear\|editar}` | Dropdown sin paginación (solo activas) |
| `GET`    | `/semillas`              | `configuracion.editar` | Listar semillas (paginado) |
| `GET`    | `/semillas/{id}`         | `configuracion.editar` | Ver detalle |
| `POST`   | `/semillas`              | `configuracion.editar` | Crear semilla |
| `PUT`    | `/semillas/{id}`         | `configuracion.editar` | Editar semilla |
| `DELETE` | `/semillas/{id}`         | `configuracion.editar` | Eliminar semilla |

### Tipos válidos

| Valor | Descripción |
|-------|-------------|
| `Africana` | Elaeis guineensis africana |
| `Híbrido` | Híbrido interespecífico OxG |
| `Compacta` | Variedad compacta |
| `Americana` | Elaeis oleifera americana |

### Crear / Editar

```json
// POST /semillas
{
  "tipo": "Africana",
  "nombre": "Elaeis Guineensis"
}

// PUT /semillas/{id}
{
  "tipo": "Híbrido",
  "nombre": "Híbrido OxG",
  "estado": false
}
```

### Respuesta del select

```json
{
  "data": [
    { "id": 1, "tipo": "Africana", "nombre": "Elaeis Guineensis" },
    { "id": 2, "tipo": "Híbrido", "nombre": "Híbrido OxG" }
  ]
}
```

> Sin paginación. Devuelve solo activas. Ordenado alfabéticamente por `nombre`.

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `SEMILLA_CON_LOTES` | No se puede eliminar porque está asignada a uno o más lotes |

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

## 4. Labores de Finca

Catálogo editable de trabajos manuales de mantenimiento de la finca (reparaciones, transporte interno, etc.). **No confundir con las Labores de Palma** (PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS) — estas son tipos fijos cuyos precios se configuran en la sección §4b de este documento.

### Endpoints

| Método   | URL                      | Permiso | Descripción |
|----------|--------------------------|---------|-------------|
| `GET`    | `/labores/select`        | `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar` | Dropdown sin paginación para el wizard (incluye `valor_base`). Filtros: `?estado=false` para inactivas. |
| `GET`    | `/labores`               | `configuracion.editar` | Listar labores (paginado, filtrable por `search`, `estado`) |
| `GET`    | `/labores/{id}`          | `configuracion.editar` | Ver detalle |
| `POST`   | `/labores`               | `configuracion.editar` | Crear labor |
| `PUT`    | `/labores/{id}`          | `configuracion.editar` | Editar labor |
| `DELETE` | `/labores/{id}`          | `configuracion.editar` | Eliminar labor |

### Crear / Editar

```json
// POST /labores
{
  "nombre": "Reparación de portón",
  "valor_base": 45000.00
}

// PUT /labores/{id}
{
  "nombre": "Mantenimiento portón norte",
  "valor_base": 50000.00,
  "estado": false
}
```

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `nombre` | string(100) | ✔ | Único por tenant. |
| `valor_base` | decimal | ✔ | Precio fijo que gana el empleado por esta labor. |
| `estado` | boolean | — | Default `true`. |

### Respuesta del select

```json
{
  "data": [
    { "id": 7, "nombre": "Reparación de portón", "valor_base": "45000.00" },
    { "id": 8, "nombre": "Transporte interno", "valor_base": "50000.00" }
  ]
}
```

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `LABOR_CON_JORNALES` | No se puede eliminar porque tiene jornales de Finca asociados |

---

## 4b. Precios de Palma (PLATEO, PODA, SANIDAD, OTROS)

Precios configurables por tenant para las 4 labores de palma de precio fijo. Los registros se crean automáticamente con `precio_palma = 0` al provisionar un nuevo tenant — el admin solo los **actualiza** desde Configuración.

> COSECHA usa `precios_cosecha` (§9). FERTILIZACION usa `precios-abono` (§3). Solo PLATEO, PODA, SANIDAD y OTROS usan esta tabla.

### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/precios-palma` | `configuracion.editar` | Listar los 4 tipos con sus precios actuales (sin paginación). |
| `GET` | `/precios-palma/{id}` | `configuracion.editar` | Ver detalle de un tipo. |
| `PUT` | `/precios-palma/{id}` | `configuracion.editar` | Actualizar el precio de un tipo. |

No hay `POST` ni `DELETE` — los 4 registros son inmutables en estructura (solo cambia `precio_palma`).

### Respuesta (GET index)

```json
{
  "data": [
    { "id": 1, "tipo": "OTROS",   "precio_palma": null,    "estado": true },
    { "id": 2, "tipo": "PLATEO",  "precio_palma": "50.00", "estado": true },
    { "id": 3, "tipo": "PODA",    "precio_palma": "80.00", "estado": true },
    { "id": 4, "tipo": "SANIDAD", "precio_palma": null,    "estado": true }
  ]
}
```

### Editar (PUT)

```json
// PUT /precios-palma/{id}
{ "precio_palma": 60.00 }

// Respuesta 200
{
  "message": "Precio actualizado correctamente",
  "data": { "id": 2, "tipo": "PLATEO", "precio_palma": "60.00", "estado": true }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `precio_palma` | decimal \| null | Precio por palma (PLATEO/PODA) o valor plano (SANIDAD/OTROS). `null` = no configurado. |
| `estado` | boolean | Activar/desactivar el tipo. |

### Comportamiento de `precio_palma = null`

Para SANIDAD y OTROS, `precio_palma` puede ser `null` (no configurado). En ese caso:
- El jornal se registra normalmente en la planilla.
- `valor_total` se guarda como `null` — pendiente de precio.
- Al configurar el precio luego, los jornales históricos con `valor_total = null` **no se recalculan** automáticamente.

### Errores específicos

| Código HTTP | Descripción |
|---|---|
| 422 | `precio_palma` fuera de rango o tipo de dato inválido. |

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

> Al editar, si se envía `anio`, se valida que no exista otro registro con el mismo `lote_id` + `anio` (excluyendo el registro actual). Si existe, retorna 409 `PROMEDIO_DUPLICADO`.

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `PROMEDIO_DUPLICADO` | Ya existe un promedio para ese lote en ese año (aplica en POST y en PUT al cambiar `anio`) |

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
    "divisor_jornada_mensual": 240,
    "moneda": "COP",
    "zona_horaria": "America/Bogota",
    "pais": "CO"
  }
}
```

### Editar (PUT)

Solo se pueden editar estos 4 campos. Los demás (`moneda`, `zona_horaria`, `pais`) son de solo lectura.

```json
// PUT /configuracion/nomina
{
  "tipo_pago_nomina": "MENSUAL",
  "salario_minimo_vigente": 1300000.00,
  "auxilio_transporte": 162000.00,
  "divisor_jornada_mensual": 240
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `tipo_pago_nomina` | string | `QUINCENAL` o `MENSUAL` |
| `salario_minimo_vigente` | decimal | Salario mínimo legal vigente |
| `auxilio_transporte` | decimal | Auxilio de transporte vigente |
| `divisor_jornada_mensual` | integer | `240` (CST tradicional, 48h/sem) o `210` (Ley 2101/2021, 42h/sem). Usado para calcular `valor_hora = salario_base / divisor` en el módulo de Horas Extras. |

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

## 11. Tipos de Hora Extra

Catálogo paramétrico por tenant con los 7 tipos de hora extra reconocidos por la legislación laboral colombiana (Código Sustantivo del Trabajo arts. 168, 179 y Ley 789/2002 art. 26). Usado por el Paso 4 del wizard de Planilla del Día.

### Endpoints

| Método   | URL                                | Descripción |
|----------|------------------------------------|-------------|
| `GET`    | `/tipos-hora-extra/select`         | Dropdown del wizard (sin paginación). Permiso especial: `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar`. |
| `GET`    | `/tipos-hora-extra`                | Listar (paginado). |
| `GET`    | `/tipos-hora-extra/{id}`           | Ver detalle. |
| `POST`   | `/tipos-hora-extra`                | Crear. |
| `PUT`    | `/tipos-hora-extra/{id}`           | Actualizar. |
| `DELETE` | `/tipos-hora-extra/{id}`           | Eliminar. Falla con 409 `TIPO_HORA_EXTRA_CON_REGISTROS` si hay horas extras asociadas. |

### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `codigo` | string(10) | ✔ | Uno de `HED`, `HEN`, `RN`, `HRD`, `HEDF`, `HENF`, `RND`. Único por tenant. |
| `nombre` | string(100) | ✔ | Nombre legible. |
| `porcentaje_recargo` | decimal(5,2) | ✔ | Porcentaje adicional sobre la hora ordinaria (0-200). |
| `franja_horaria` | enum | ✔ | `DIURNO`, `NOCTURNO` o `MIXTO`. |
| `aplica_festivo` | boolean | — | Default `false`. |
| `es_extra` | boolean | — | Default `true`. `false` para RN/RND (solo recargos). |
| `paga_hora_completa` | boolean | — | Default `true`. Si `false`, se paga solo el recargo (no la hora ordinaria). |
| `estado` | boolean | — | Default `true`. |

### Valores sembrados por default

| codigo | nombre | % | franja | festivo | es_extra | paga_hora_completa |
|---|---|---|---|---|---|---|
| HED  | Hora Extra Diurna (6am-9pm)             | 25.00  | DIURNO   | false | true  | true  |
| HEN  | Hora Extra Nocturna (9pm-6am)           | 75.00  | NOCTURNO | false | true  | true  |
| RN   | Recargo Nocturno                        | 35.00  | NOCTURNO | false | false | false |
| HRD  | Hora Ordinaria Dominical/Festivo        | 75.00  | DIURNO   | true  | false | true  |
| HEDF | Hora Extra Diurna Dominical/Festivo     | 100.00 | DIURNO   | true  | true  | true  |
| HENF | Hora Extra Nocturna Dominical/Festivo   | 150.00 | NOCTURNO | true  | true  | true  |
| RND  | Recargo Nocturno Dominical/Festivo      | 110.00 | NOCTURNO | true  | false | false |

Documentación completa del módulo (registros, máquina de estados, integración con nómina, fórmulas): [API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).

---

## 12. Paramétricas del Colaborador (EPS, Fondos de Pensión, ARL, Entidades Bancarias)

Cuatro catálogos paramétricos por tenant que alimentan los selectores del formulario de creación/edición de colaboradores. El **empleado guarda el `nombre`** seleccionado (no el `id`), por lo que renombrar o eliminar una entrada del catálogo NO afecta los empleados ya creados — preservando el histórico.

Las cuatro paramétricas comparten exactamente el mismo schema y comportamiento; varían solo en los nombres de tabla y URLs.

### Endpoints

Cada paramétrica expone 6 endpoints (5 CRUD + 1 select):

| Recurso | URL base | Modelo | Tabla |
|---------|----------|--------|-------|
| EPS | `/eps` | `Eps` | `eps` |
| Fondos de Pensión | `/fondos-pension` | `FondoPension` | `fondos_pension` |
| ARL | `/arl` | `Arl` | `arl` |
| Entidades Bancarias | `/entidades-bancarias` | `EntidadBancaria` | `entidades_bancarias` |

| Método | URL | Permiso | Descripción |
|--------|-----|---------|-------------|
| `GET` | `/{recurso}/select` | `configuracion.editar` **o** `colaboradores.{ver|crear|editar}` | Dropdown sin paginación (solo activos). |
| `GET` | `/{recurso}` | `configuracion.editar` | Listar paginado. |
| `GET` | `/{recurso}/{id}` | `configuracion.editar` | Ver detalle. |
| `POST` | `/{recurso}` | `configuracion.editar` | Crear. |
| `PUT` | `/{recurso}/{id}` | `configuracion.editar` | Actualizar. |
| `DELETE` | `/{recurso}/{id}` | `configuracion.editar` | Eliminar. |

### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|-------|------|--------------------|-------------|
| `nombre` | string(100) | ✔ | Único por tenant. |
| `estado` | boolean | — | Default `true`. |

### Crear / Editar

```json
// POST /eps
{ "nombre": "Sura" }

// PUT /eps/{id}
{ "nombre": "Sura EPS", "estado": false }
```

### Respuesta del select

```json
{
  "data": [
    { "id": 1, "nombre": "Sura" },
    { "id": 2, "nombre": "Sanitas" }
  ]
}
```

> Sin paginación. Devuelve solo activos. Ordenado alfabéticamente por `nombre`. El frontend toma el `nombre` y lo envía en el campo correspondiente del payload de `POST /colaboradores` (`eps`, `fondo_pension`, `arl`, `entidad_bancaria`).

### Provisionamiento al crear tenant

Al crear un tenant nuevo desde `POST /api/admin/tenants`, el backend siembra automáticamente las cuatro paramétricas con un catálogo inicial vigente para Colombia (EPS, fondos, ARLs, bancos). El admin del tenant puede editarlo libremente desde Configuración.

Las listas iniciales viven en constantes del modelo:
- `App\Models\Eps::INICIALES` (17 EPS)
- `App\Models\FondoPension::INICIALES` (5 fondos)
- `App\Models\Arl::INICIALES` (9 ARLs)
- `App\Models\EntidadBancaria::INICIALES` (23 entidades)

Para sembrarlas en fincas existentes (idempotente):
```bash
php artisan db:seed --class=ParametricasColaboradorSeeder
```

### Nota documental

El consumo desde el formulario del colaborador (qué select va con qué campo del payload) está documentado en [API_COLABORADORES.md § Paramétricas del Colaborador](./API_COLABORADORES.md).

---

## 13. Info Empresa

Datos de identificación de la empresa, representante legal y ubicación/contacto. Corresponde a la sección **Configuración → Info Empresa** del frontend.

### Endpoints

| Método | URL | Descripción |
|--------|-----|-------------|
| `GET`  | `/configuracion/info-empresa` | Ver datos actuales de la empresa |
| `PUT`  | `/configuracion/info-empresa` | Editar datos de la empresa |

> El endpoint legacy `PUT /configuracion/finca` sigue activo como alias.

### Respuesta (GET)

```json
{
  "data": {
    "id": 1,
    "nombre": "AGRO CAMPO S.A.S.",
    "tipo_persona": "JURIDICA",
    "nit": "900.123.456-7",
    "razon_social": "AGRO CAMPO S.A.S.",
    "actividad_economica": "Cultivo de palma para aceite",
    "representante_nombre": "Juan Carlos Pérez Gómez",
    "representante_cedula": "16.123.456",
    "representante_cargo": "Gerente General",
    "direccion": "Km 5 Vía Palmira - Candelaria",
    "departamento": "Valle del Cauca",
    "municipio": "Palmira",
    "correo_contacto": "contacto@agrocampo.com",
    "telefono": "+57 300 123 4567",
    "telefono_fijo": "+57 (2) 123 4567",
    "sitio_web": "www.agrocampo.com",
    "logo_url": "https://..."
  }
}
```

### Editar (PUT)

Todos los campos son opcionales (`sometimes`). Logo se envía como `multipart/form-data`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | string(100) | Nombre de la empresa |
| `tipo_persona` | string | `NATURAL` o `JURIDICA` |
| `nit` | string(20) | NIT único por tenant |
| `razon_social` | string(200) | Razón social |
| `actividad_economica` | string(200) | Actividad económica principal |
| `representante_nombre` | string(200) | Nombre completo del representante legal |
| `representante_cedula` | string(20) | Cédula del representante legal |
| `representante_cargo` | string(100) | Cargo del representante legal |
| `direccion` | string(200) | Dirección física |
| `departamento` | string(100) | Departamento |
| `municipio` | string(100) | Municipio |
| `correo_contacto` | email(100) | Correo electrónico de contacto |
| `telefono` | string(20) | Celular |
| `telefono_fijo` | string(20) | Teléfono fijo |
| `sitio_web` | string(200) | Sitio web |
| `logo` | file | Imagen del logo (jpeg/jpg/png/webp, máx 2MB) |

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 422 | `NIT_DUPLICATED` | Ya existe otra finca con el mismo NIT |

---

## 14. Constantes Legales

Parámetros legales colombianos por tenant: año fiscal, SMMLV, auxilio de transporte, cesantías, primas de servicio, vacaciones y días comerciales. Corresponde a la sub-sección **Configuración → Legal → Constantes Legales**.

### Endpoints

| Método | URL | Descripción |
|--------|-----|-------------|
| `GET`  | `/configuracion/constantes-legales` | Ver constantes actuales |
| `PUT`  | `/configuracion/constantes-legales` | Editar constantes |

### Respuesta (GET)

```json
{
  "data": {
    "anio_vigente": 2026,
    "salario_minimo_vigente": "1750905.00",
    "auxilio_transporte": "249095.00",
    "tasa_interes_cesantias": "12.00",
    "fecha_limite_consignacion_cesantias": "14 de febrero",
    "fecha_limite_pago_intereses_cesantias": "31 de enero",
    "fecha_limite_prima_primer_semestre": "30 de junio",
    "fecha_limite_prima_segundo_semestre": "20 de diciembre",
    "dias_vacaciones_anuales": 15,
    "dias_anio_comercial": 360,
    "dias_mes_comercial": 30
  }
}
```

### Editar (PUT)

Todos los campos son opcionales (`sometimes`).

| Campo | Tipo | Valores / Rango | Descripción |
|-------|------|-----------------|-------------|
| `anio_vigente` | integer | 2020–2100 | Año fiscal activo del tenant |
| `salario_minimo_vigente` | decimal | min:0 | SMMLV vigente (COP) |
| `auxilio_transporte` | decimal | min:0 | Auxilio de transporte mensual (COP) |
| `tasa_interes_cesantias` | decimal | 0–100 | Tasa de interés anual sobre cesantías (%) |
| `fecha_limite_consignacion_cesantias` | string(50) | — | Fecha límite de consignación de cesantías (ej: "14 de febrero") |
| `fecha_limite_pago_intereses_cesantias` | string(50) | — | Fecha límite de pago de intereses de cesantías (ej: "31 de enero") |
| `fecha_limite_prima_primer_semestre` | string(50) | — | Fecha límite prima 1er semestre (ej: "30 de junio") |
| `fecha_limite_prima_segundo_semestre` | string(50) | — | Fecha límite prima 2do semestre (ej: "20 de diciembre") |
| `dias_vacaciones_anuales` | integer | 1–365 | Días de vacaciones remuneradas anuales (CST: 15) |
| `dias_anio_comercial` | integer | 1–999 | Días del año comercial para cálculos (estándar: 360) |
| `dias_mes_comercial` | integer | 1–99 | Días del mes comercial para cálculos (estándar: 30) |

> **Valores default al crear un tenant:** `anio_vigente = año_actual`, `tasa_interes_cesantias = 12`, fechas con los valores legales colombianos estándar, `dias_vacaciones_anuales = 15`, `dias_anio_comercial = 360`, `dias_mes_comercial = 30`.

---

## 15. Tablas Legales

Historial de porcentajes de aportes a seguridad social (Salud, Pensión, ARL) por vigencia. Corresponde a la sub-sección **Configuración → Legal → Tablas Legales**.

### Endpoints

| Método   | URL | Descripción |
|----------|-----|-------------|
| `GET`    | `/configuracion/tablas-legales` | Listar registros (sin paginación) |
| `GET`    | `/configuracion/tablas-legales/conceptos-select` | Dropdown de conceptos disponibles (Salud, Pensión, ARL) |
| `POST`   | `/configuracion/tablas-legales` | Crear nuevo registro |
| `PUT`    | `/configuracion/tablas-legales/{id}` | Editar registro |
| `DELETE` | `/configuracion/tablas-legales/{id}` | Eliminar registro |

### Respuesta del listado (GET)

```json
{
  "data": [
    {
      "id": 1,
      "concepto_id": 3,
      "concepto": {
        "id": 3,
        "nombre": "Salud",
        "subtipo": "SALUD"
      },
      "porcentaje_empleado": "4.00",
      "porcentaje_empresa": "8.50",
      "vigente_desde": "31/12/2022",
      "vigente_hasta": null
    }
  ]
}
```

> `vigente_hasta: null` significa que el registro está actualmente vigente.

### Respuesta del select de conceptos

```json
{
  "data": [
    { "id": 1, "nombre": "ARL", "subtipo": "ARL" },
    { "id": 2, "nombre": "Pensión", "subtipo": "PENSION" },
    { "id": 3, "nombre": "Salud", "subtipo": "SALUD" }
  ]
}
```

### Crear (POST)

```json
{
  "concepto_id": 3,
  "porcentaje_empleado": 4.00,
  "porcentaje_empresa": 8.50,
  "vigente_desde": "01/01/2026",
  "vigente_hasta": null
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `concepto_id` | integer | **Sí** | Debe existir en `nomina_concepto` del tenant con `subtipo` en SALUD/PENSION/ARL |
| `porcentaje_empleado` | decimal | **Sí** | 0–100 |
| `porcentaje_empresa` | decimal | **Sí** | 0–100 |
| `vigente_desde` | date | **Sí** | Formato `dd/mm/yyyy` |
| `vigente_hasta` | date | No | Formato `dd/mm/yyyy`. `null` = vigente indefinidamente |

### Editar (PUT)

Todos los campos son opcionales (`sometimes`). Mismas validaciones que el POST.

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
