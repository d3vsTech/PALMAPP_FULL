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
| `HIBRIDO_TENERA` | Híbrido Ténera DxP (*Elaeis guineensis*) — variedades Dura × Pisífera |
| `HIBRIDO_OXG` | Híbrido OxG (*Elaeis oleifera × E. guineensis*) — tolerante a Pudrición del cogollo |

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

## 4. Labores (catálogo unificado: palma + finca)

Catálogo único de labores agrupado en una sola tabla `labores` con discriminador `categoria` (`PALMA` o `FINCA`).

**Tipos de registros:**

| Tipo | `categoria` | `es_sistema` | `tipo` | Notas |
|---|---|---|---|---|
| **Fijas del sistema** (5 por tenant) | `PALMA` | `true` | `COSECHA` / `PLATEO` / `PODA` / `FERTILIZACION` / `SANIDAD` | Sembradas al provisionar el tenant. No se pueden borrar ni renombrar. Solo se editan `tipo_pago`, `precio_palma`, `estado`. |
| **Custom de palma** | `PALMA` | `false` | `null` | Labores personalizadas del tenant. `tipo_pago` configurable. Aparecen junto a las fijas en el dropdown del wizard. |
| **Custom de finca** | `FINCA` | `false` | `null` | Trabajos manuales de mantenimiento (reparaciones, transporte interno, etc.). `tipo_pago` siempre `JORNAL_FIJO` (forzado por el modelo). |

> **Reemplaza tres APIs antiguas:** este endpoint unificado sustituye a los desaparecidos `/precios-palma`, `/labores-palma` y el `/labores` (que solo cubría finca). El modelo único es `App\Models\Labor`.

### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/labores/select` | `configuracion.editar` **o** `operaciones.crear\|editar` | Dropdown sin paginación para el wizard. Filtros: `?categoria=PALMA\|FINCA` (recomendado), `?estado=false` para inactivas. Incluye `tipo_pago`, `precio_palma`, `es_sistema` y `requiere_cosecha_workflow`. |
| `GET` | `/labores` | `configuracion.editar` | Listar labores (paginado, con filtros). |
| `GET` | `/labores/{id}` | `configuracion.editar` | Ver detalle. |
| `POST` | `/labores` | `configuracion.editar` | Crear labor **custom** (palma o finca). Las 5 fijas no se crean por API. |
| `PUT` | `/labores/{id}` | `configuracion.editar` | Actualizar. Fijas: solo `tipo_pago` / `precio_palma` / `estado`. Custom: todo excepto `categoria`, `tipo`, `es_sistema`. |
| `DELETE` | `/labores/{id}` | `configuracion.editar` | Eliminar custom. Fijas devuelven 403. |

### Filtros (GET index)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca en `nombre` (parcial, ilike). |
| `categoria` | `PALMA` \| `FINCA` | Filtra por categoría. |
| `tipo` | `COSECHA` \| `PLATEO` \| `PODA` \| `FERTILIZACION` \| `SANIDAD` | Filtra por tipo (solo aplica a fijas). |
| `tipo_pago` | `POR_PALMA` \| `JORNAL_FIJO` | Filtra por tipo de pago. |
| `es_sistema` | boolean | Filtra fijas vs custom. |
| `estado` | boolean | Filtra activas vs inactivas. |
| `per_page` | integer | Default: 15. |

### Respuesta del select

```json
// GET /labores/select?categoria=PALMA
{
  "data": [
    { "id": 13, "nombre": "Cosecha",       "categoria": "PALMA", "tipo": "COSECHA",       "tipo_pago": "POR_PALMA",   "precio_palma": null,    "es_sistema": true,  "requiere_cosecha_workflow": true },
    { "id": 14, "nombre": "Plateo",        "categoria": "PALMA", "tipo": "PLATEO",        "tipo_pago": "POR_PALMA",   "precio_palma": "50.00", "es_sistema": true,  "requiere_cosecha_workflow": false },
    { "id": 15, "nombre": "Poda",          "categoria": "PALMA", "tipo": "PODA",          "tipo_pago": "POR_PALMA",   "precio_palma": "80.00", "es_sistema": true,  "requiere_cosecha_workflow": false },
    { "id": 16, "nombre": "Fertilización", "categoria": "PALMA", "tipo": "FERTILIZACION", "tipo_pago": "POR_PALMA",   "precio_palma": null,    "es_sistema": true,  "requiere_cosecha_workflow": false },
    { "id": 17, "nombre": "Sanidad",       "categoria": "PALMA", "tipo": "SANIDAD",       "tipo_pago": "JORNAL_FIJO", "precio_palma": null,    "es_sistema": true,  "requiere_cosecha_workflow": false },
    { "id": 32, "nombre": "Resiembra",     "categoria": "PALMA", "tipo": null,            "tipo_pago": "POR_PALMA",   "precio_palma": "1500.00","es_sistema": false, "requiere_cosecha_workflow": false }
  ]
}

// GET /labores/select?categoria=FINCA
{
  "data": [
    { "id": 7, "nombre": "Reparación de portón", "categoria": "FINCA", "tipo": null, "tipo_pago": "JORNAL_FIJO", "precio_palma": "45000.00", "es_sistema": false, "requiere_cosecha_workflow": false },
    { "id": 8, "nombre": "Transporte interno",   "categoria": "FINCA", "tipo": null, "tipo_pago": "JORNAL_FIJO", "precio_palma": "50000.00", "es_sistema": false, "requiere_cosecha_workflow": false }
  ]
}
```

### Crear (POST)

```json
// POST /labores  — labor custom de palma POR_PALMA
{
  "categoria": "PALMA",
  "nombre": "Resiembra",
  "tipo_pago": "POR_PALMA",
  "precio_palma": 1500.00
}

// POST /labores  — labor custom de finca (tipo_pago forzado a JORNAL_FIJO)
{
  "categoria": "FINCA",
  "nombre": "Reparación de portón",
  "precio_palma": 45000.00
}
```

**Respuesta 201:**
```json
{
  "message": "Labor creada correctamente",
  "data": {
    "id": 32,
    "tenant_id": 1,
    "categoria": "PALMA",
    "tipo": null,
    "nombre": "Resiembra",
    "tipo_pago": "POR_PALMA",
    "precio_palma": "1500.00",
    "es_sistema": false,
    "estado": true
  }
}
```

> Los campos `tipo` y `es_sistema` se ignoran si vienen en el body (siempre se fuerzan a `null` y `false` en POST). Las fijas no se crean por API — se siembran al provisionar el tenant.

### Editar (PUT)

**Fija del sistema** — solo `tipo_pago`, `precio_palma`, `estado`:
```json
// PUT /labores/14   (la fija PLATEO)
{
  "tipo_pago": "JORNAL_FIJO",
  "precio_palma": 60000.00
}
```

**Custom** — `nombre`, `tipo_pago` (solo PALMA), `precio_palma`, `estado`:
```json
// PUT /labores/32   (custom de palma)
{
  "nombre": "Resiembra palmas enfermas",
  "tipo_pago": "JORNAL_FIJO",
  "precio_palma": 50000.00,
  "estado": true
}
```

Los campos `categoria`, `tipo` y `es_sistema` son inmutables (silenciosamente descartados si llegan). En labores de FINCA, `tipo_pago` se vuelve a forzar a `JORNAL_FIJO` aunque el cliente envíe otra cosa.

### Reglas

| Campo | Regla |
|---|---|
| `categoria` | Requerido en POST. `PALMA` o `FINCA`. Inmutable tras crear. |
| `nombre` | Requerido en POST. Único por tenant. Max 100 chars. Las fijas tienen nombre canónico inmutable. |
| `tipo_pago` | Requerido en POST si `categoria=PALMA`. FINCA fuerza `JORNAL_FIJO`. |
| `precio_palma` | Opcional. POR_PALMA: precio por palma. JORNAL_FIJO: valor plano. `null` = aún no configurado → los jornales se guardan con `valor_total=null` y se hidratan al configurar precio. |
| `tipo` | Inmutable. Solo aplica a fijas (COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD). Custom siempre `null`. |
| `es_sistema` | Inmutable. POST siempre crea con `false`. |

### Efectos de `tipo_pago` en el cálculo del jornal

| tipo_pago | UI muestra | Servicio calcula |
|---|---|---|
| `POR_PALMA` | Lote + Sublote + Cantidad Palmas | `precio_palma × cantidad_palmas` (FERTILIZACION usa `precio_abono` por rango en lugar de `labor.precio_palma`) |
| `JORNAL_FIJO` | Solo descripción (sin palmas) | `precio_palma` (valor plano) |

> COSECHA POR_PALMA tiene su propio flujo en `/operaciones/{id}/cosechas` + `precios_cosecha` (ver [API_OPERACIONES.md §3.1](./API_OPERACIONES.md)). COSECHA JORNAL_FIJO usa `labor.precio_palma` como valor plano por cuadrilla.

### Errores específicos

| Código HTTP | Code | Descripción |
|---|---|---|
| 409 | `LABOR_DUPLICADA` | Ya existe una labor con ese nombre en el tenant. |
| 409 | `LABOR_CON_JORNALES` | No se puede eliminar — tiene jornales asociados. |
| 409 | `LABOR_CON_COSECHAS` | No se puede eliminar la labor COSECHA fija — tiene registros de cosecha asociados. |
| 403 | `LABOR_DEL_SISTEMA` | Intento de eliminar una labor fija (`es_sistema=true`). |
| 422 | — | `precio_palma` fuera de rango, `tipo_pago` no reconocido, o `categoria` inválida. |

---

## 5. Promedios por Lote

Historial de promedios kg/gajo por lote. Alimenta el cálculo de pago de cosecha a empleados VARIABLE durante la liquidación de nómina.

Hay **dos tipos de registro** — ambos viven en la misma tabla, diferenciados por `viaje_id`:

| Tipo | `viaje_id` | Quién lo crea | Editable / Eliminable |
|---|---|---|---|
| **Baseline admin** | `NULL` | El admin desde este CRUD | Sí |
| **Generado por viaje** | FK al viaje | Sistema automáticamente al finalizar un viaje homogéneo | No — inmutable |

El admin puede crear varios registros baseline para el mismo lote con fechas distintas. No existe restricción de unicidad por `(lote_id, anio)`.

### Endpoints

| Método   | URL                              | Descripción |
|----------|----------------------------------|-------------|
| `GET`    | `/promedios-lote`                | Listar (paginado). Incluye baseline y auto-generados. |
| `GET`    | `/promedios-lote/{id}`           | Ver detalle. Carga `lote` y `viaje` (si aplica). |
| `POST`   | `/promedios-lote`                | Crear baseline (admin). Siempre crea con `viaje_id = null`. |
| `PUT`    | `/promedios-lote/{id}`           | Editar baseline. Bloquea si `viaje_id IS NOT NULL`. |
| `DELETE` | `/promedios-lote/{id}`           | Eliminar baseline. Bloquea si `viaje_id IS NOT NULL`. |

### Filtros (GET index)

| Parámetro | Tipo    | Descripción |
|-----------|---------|-------------|
| `lote_id` | integer | Filtrar por lote |
| `anio`    | integer | Filtrar por año |
| `fecha_desde` | date | Filtrar desde fecha (inclusive) |
| `fecha_hasta` | date | Filtrar hasta fecha (inclusive) |
| `solo_baseline` | boolean | Si presente, devuelve solo registros con `viaje_id = null` (admin) |
| `solo_viajes`   | boolean | Si presente, devuelve solo registros con `viaje_id IS NOT NULL` (auto) |

### Crear (POST)

```json
// POST /promedios-lote  — baseline admin
{
  "lote_id": 5,
  "promedio": 12.50,
  "anio": 2026,
  "fecha": "2026-01-01"
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `lote_id` | integer | ✔ | Debe existir en `lotes` |
| `promedio` | decimal | ✔ | min: 0, max: 99999999.99 |
| `anio` | integer | ✔ | min: 2000, max: 2100 |
| `fecha` | date | — | Fecha del promedio. Usada por nómina para filtrar registros del período. Si se omite, el registro queda sin fecha y **no entra en el cálculo de nómina por período** (solo sirve como fallback baseline si no hay promedios con fecha en el rango). |

### Editar (PUT)

```json
// PUT /promedios-lote/{id}
{
  "promedio": 13.20,
  "anio": 2026,
  "fecha": "2026-01-15"
}
```

Solo aplica a registros **baseline** (`viaje_id = null`). Campos editables: `promedio`, `anio`, `fecha`. El campo `lote_id` es inmutable.

### Respuesta del detalle (200)

```json
{
  "data": {
    "id": 12,
    "lote_id": 5,
    "viaje_id": null,
    "promedio": "12.50",
    "anio": 2026,
    "fecha": "2026-01-01",
    "lote": { "id": 5, "nombre": "Marsella" },
    "viaje": null
  }
}
```

Para registros generados por viaje, `viaje` incluye `{ id, remision, fecha_viaje }`.

### Errores específicos

| Código HTTP | code | Descripción |
|-------------|------|-------------|
| 409 | `PROMEDIO_DE_VIAJE` | Intento de editar o eliminar un registro generado automáticamente por un viaje (`viaje_id IS NOT NULL`). Estos registros son inmutables. |

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
    "dia_inicio_q1": 1,
    "dia_fin_q1": 15,
    "dia_inicio_q2": 16,
    "dia_fin_q2": 31,
    "moneda": "COP",
    "zona_horaria": "America/Bogota",
    "pais": "CO"
  }
}
```

### Editar (PUT)

Editables: los 8 campos listados abajo. Los demás (`moneda`, `zona_horaria`, `pais`) son de solo lectura.

> **El PUT acepta payloads parciales (todos los campos son `sometimes`).** El frontend está dividido en varias vistas y cada una manda **solo los campos que controla** — no es necesario re-enviar el resto. La validación cruzada de fechas combina lo que llega con los valores actuales en BD, así que mandar un único campo es seguro y no produce falsos `CORTE_QUINCENA_INVALIDO`.

#### Payloads por vista del frontend

```json
// Vista "Periodicidad de la Nómina" — solo periodicidad + fechas de corte
PUT /configuracion/nomina
{
  "tipo_pago_nomina": "QUINCENAL",
  "dia_inicio_q1": 1,
  "dia_fin_q1": 15,
  "dia_inicio_q2": 16,
  "dia_fin_q2": 30
}
```

```json
// Vista "Jornada Laboral Semanal" — solo el divisor
PUT /configuracion/nomina
{ "divisor_jornada_mensual": 210 }
```

```json
// Vista "Constantes Legales" (cuando aplique) — solo SMLV + auxilio
PUT /configuracion/nomina
{
  "salario_minimo_vigente": 1300000.00,
  "auxilio_transporte": 162000.00
}
```

```json
// Payload completo (también válido, p.ej. desde un único formulario)
PUT /configuracion/nomina
{
  "tipo_pago_nomina": "QUINCENAL",
  "salario_minimo_vigente": 1300000.00,
  "auxilio_transporte": 162000.00,
  "divisor_jornada_mensual": 240,
  "dia_inicio_q1": 1,
  "dia_fin_q1": 15,
  "dia_inicio_q2": 16,
  "dia_fin_q2": 30
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `tipo_pago_nomina` | string | `QUINCENAL` o `MENSUAL` |
| `salario_minimo_vigente` | decimal | Salario mínimo legal vigente |
| `auxilio_transporte` | decimal | Auxilio de transporte vigente |
| `divisor_jornada_mensual` | integer (1-480) | Divisor mensual para calcular `valor_hora = salario_base / divisor`. Valores típicos: `240` (48h/sem, CST tradicional) y `210` (42h/sem, Ley 2101/2021). |
| `horas_semanales` | integer (1-96) | **Alias conveniente de `divisor_jornada_mensual`** — acepta cualquier número de horas semanales y el backend calcula `divisor = horas × 5`. Si se envían ambos campos, `horas_semanales` tiene prioridad. |
| `dia_inicio_q1` | integer (1-31) | Día de inicio de la 1ª quincena. Default `1`. |
| `dia_fin_q1` | integer (1-31) | Día de fin de la 1ª quincena. Default `15`. Debe ser ≥ `dia_inicio_q1`. |
| `dia_inicio_q2` | integer (1-31) | Día de inicio de la 2ª quincena. Default `16`. Debe ser > `dia_fin_q1` (sin solapamiento). |
| `dia_fin_q2` | integer (1-31) | Día de fin de la 2ª quincena. Default `31`. Debe ser ≥ `dia_inicio_q2`. **Si supera el último día del mes, se clampea automáticamente** (ej. `31` en febrero → 28/29). |

### Notas para la UI de Configuración → Nómina

- **Jornada Laboral Semanal:** el GET ahora devuelve `horas_semanales` (48 o 42) junto con `divisor_jornada_mensual`. El frontend puede enviar `horas_semanales` directamente en el PUT — el backend lo convierte a `divisor_jornada_mensual` internamente.
- **Fechas de Corte (1ª/2ª quincena):** los 4 dropdowns son **editables**. El motor `Nomina::calcularRangoFechas()` los lee al crear cada nómina nueva. Las nóminas históricas conservan su `fecha_inicio`/`fecha_fin` originales (no se recalculan al cambiar la config). Si el admin pone valores que se solapan o invierten, el endpoint devuelve **422 `CORTE_QUINCENA_INVALIDO`** con los errores por campo.

### Errores específicos

| Código HTTP | code | Descripción |
|---|---|---|
| 422 | `CORTE_QUINCENA_INVALIDO` | Los días de quincena no son coherentes (`dia_fin_q1 < dia_inicio_q1`, solapamiento Q1/Q2, o `dia_fin_q2 < dia_inicio_q2`). |

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

Catálogo paramétrico por tenant con los 7 tipos de hora extra reconocidos por la legislación laboral colombiana (Código Sustantivo del Trabajo arts. 168, 179, Ley 789/2002 art. 26 y **Ley 2466 de 2025** — recargo dominical 75% → 90%). Usado por el Paso 4 del wizard de Planilla del Día.

### Endpoints

| Método   | URL                                | Descripción |
|----------|------------------------------------|-------------|
| `GET`    | `/tipos-hora-extra/codigos`        | Lista estática de los 7 códigos legales colombianos (sin paginación, sin DB). Útil para poblar el selector de `codigo` al crear un nuevo tipo. Permiso: `configuracion.editar`. |
| `GET`    | `/tipos-hora-extra/select`         | Dropdown del wizard (sin paginación). Permiso especial: `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar`. |
| `GET`    | `/tipos-hora-extra`                | Listar (paginado). |
| `GET`    | `/tipos-hora-extra/{id}`           | Ver detalle. |
| `POST`   | `/tipos-hora-extra`                | Crear. |
| `PUT`    | `/tipos-hora-extra/{id}`           | Actualizar. |
| `DELETE` | `/tipos-hora-extra/{id}`           | Eliminar. Falla con 409 `TIPO_HORA_EXTRA_CON_REGISTROS` si hay horas extras asociadas. |

### Respuesta de `/codigos`

```json
{
  "data": [
    { "codigo": "HED",  "nombre": "Hora Extra Diurna",                     "descripcion": "6:00 AM – 9:00 PM, días hábiles",        "es_extra": true,  "paga_hora_completa": true,  "porcentaje_recargo":  25.00 },
    { "codigo": "HEN",  "nombre": "Hora Extra Nocturna",                   "descripcion": "9:00 PM – 6:00 AM, días hábiles",        "es_extra": true,  "paga_hora_completa": true,  "porcentaje_recargo":  75.00 },
    { "codigo": "RN",   "nombre": "Recargo Nocturno",                      "descripcion": "9:00 PM – 6:00 AM (dentro de jornada)", "es_extra": false, "paga_hora_completa": false, "porcentaje_recargo":  35.00 },
    { "codigo": "HRD",  "nombre": "Hora Ordinaria Dominical/Festivo",      "descripcion": "Jornada ordinaria en domingo o festivo", "es_extra": false, "paga_hora_completa": true,  "porcentaje_recargo":  90.00 },
    { "codigo": "HEDF", "nombre": "Hora Extra Diurna Dominical/Festivo",   "descripcion": "6:00 AM – 9:00 PM en domingo o festivo", "es_extra": true,  "paga_hora_completa": true,  "porcentaje_recargo": 115.00 },
    { "codigo": "HENF", "nombre": "Hora Extra Nocturna Dominical/Festivo", "descripcion": "9:00 PM – 6:00 AM en domingo o festivo", "es_extra": true,  "paga_hora_completa": true,  "porcentaje_recargo": 165.00 },
    { "codigo": "RND",  "nombre": "Recargo Nocturno Dominical/Festivo",    "descripcion": "Jornada ordinaria nocturna en festivo",  "es_extra": false, "paga_hora_completa": false, "porcentaje_recargo": 125.00 }
  ]
}
```

> `es_extra`, `paga_hora_completa` y `porcentaje_recargo` están incluidos para que el frontend pueda **pre-llenar automáticamente** el formulario al seleccionar un código en el modal "Nuevo Tipo de Hora Extra". Los valores de `porcentaje_recargo` corresponden a la **Ley 2466 de 2025** para los tipos dominicales/festivos.

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
| `descripcion` | string(150) | — | Texto libre para la UI (ej. "Lunes a sábado 6:00 AM - 9:00 PM"). Solo display, no afecta cálculo. Sembrado por defecto en los 7 tipos. |
| `estado` | boolean | — | Default `true`. |

### Valores sembrados por default

| codigo | nombre | % | franja | festivo | es_extra | paga_hora_completa |
|---|---|---|---|---|---|---|
| HED  | Hora Extra Diurna (6am-9pm)             |  25.00 | DIURNO   | false | true  | true  |
| HEN  | Hora Extra Nocturna (9pm-6am)           |  75.00 | NOCTURNO | false | true  | true  |
| RN   | Recargo Nocturno                        |  35.00 | NOCTURNO | false | false | false |
| HRD  | Hora Ordinaria Dominical/Festivo        |  **90.00** ¹ | DIURNO   | true  | false | true  |
| HEDF | Hora Extra Diurna Dominical/Festivo     | **115.00** ¹ | DIURNO   | true  | true  | true  |
| HENF | Hora Extra Nocturna Dominical/Festivo   | **165.00** ¹ | NOCTURNO | true  | true  | true  |
| RND  | Recargo Nocturno Dominical/Festivo      | **125.00** ¹ | NOCTURNO | true  | false | false |

> ¹ **Ley 2466 de 2025**: el recargo dominical/festivo subió de 75% a **90%**. Los tipos compuestos se recalculan sobre la nueva base. Migración idempotente aplicada por `2026_06_05_000003_update_tipos_hora_extra_ley2466.php`.

Documentación completa del módulo (registros, máquina de estados, integración con nómina, fórmulas): [API_HORAS_EXTRA.md](./API_HORAS_EXTRA.md).

---

## 12. Paramétricas del Colaborador (EPS, Fondos de Pensión, Fondos de Cesantías, ARL, Entidades Bancarias)

Cinco catálogos paramétricos por tenant que alimentan los selectores del formulario de creación/edición de colaboradores. El **empleado guarda el `nombre`** seleccionado (no el `id`), por lo que renombrar o eliminar una entrada del catálogo NO afecta los empleados ya creados — preservando el histórico.

Las cinco paramétricas comparten exactamente el mismo schema y comportamiento; varían solo en los nombres de tabla y URLs.

### Endpoints

Cada paramétrica expone 6 endpoints (5 CRUD + 1 select):

| Recurso | URL base | Modelo | Tabla |
|---------|----------|--------|-------|
| EPS | `/eps` | `Eps` | `eps` |
| Fondos de Pensión | `/fondos-pension` | `FondoPension` | `fondos_pension` |
| Fondos de Cesantías | `/fondos-cesantias` | `FondoCesantias` | `fondos_cesantias` |
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
| `codigo` | string(10) | — | **Solo Entidades Bancarias.** Código del banco (ej. `001` para Bancolombia). Opcional. |
| `contacto` | string(50) | — | **Solo Entidades Bancarias.** Línea de atención / contacto. Opcional. |
| `estado` | boolean | — | Default `true`. |

> EPS, ARL, Fondos de Pensión y Fondos de Cesantías **no** tienen `codigo`/`contacto` — son exclusivos de Entidades Bancarias.

### Crear / Editar

```json
// POST /eps
{ "nombre": "Sura" }

// PUT /eps/{id}
{ "nombre": "Sura EPS", "estado": false }

// POST /entidades-bancarias
{ "nombre": "Bancolombia", "codigo": "001", "contacto": "01-8000-912345" }

// PUT /entidades-bancarias/{id}
{ "codigo": "007", "contacto": null }
```

### Respuesta del select

```json
// GET /eps/select  (mismo formato para /arl/select, /fondos-pension/select y /fondos-cesantias/select)
{
  "data": [
    { "id": 1, "nombre": "Sura" },
    { "id": 2, "nombre": "Sanitas" }
  ]
}

// GET /entidades-bancarias/select
{
  "data": [
    { "id": 1, "nombre": "Bancolombia",    "codigo": "001", "contacto": "01-8000-912345" },
    { "id": 2, "nombre": "Banco de Bogotá", "codigo": "002", "contacto": "01-8000-911111" }
  ]
}
```

> Sin paginación. Devuelve solo activos. Ordenado alfabéticamente por `nombre`. El frontend toma el `nombre` y lo envía en el campo correspondiente del payload de `POST /colaboradores` (`eps`, `fondo_pension`, `fondo_cesantias`, `arl`, `entidad_bancaria`).

### Provisionamiento al crear tenant

Al crear un tenant nuevo desde `POST /api/admin/tenants`, el backend siembra automáticamente las cinco paramétricas con un catálogo inicial vigente para Colombia (EPS, fondos de pensión, fondos de cesantías, ARLs, bancos). El admin del tenant puede editarlo libremente desde Configuración.

Las listas iniciales viven en constantes del modelo:
- `App\Models\Eps::INICIALES` (17 EPS)
- `App\Models\FondoPension::INICIALES` (5 fondos)
- `App\Models\FondoCesantias::INICIALES` (5 fondos de cesantías)
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

## 15. Paramétricas de Viajes (Extractoras · Empresas Transportadoras · Transportadores)

Tres catálogos paramétricos por tenant que alimentan el módulo de Viajes: **extractoras** (plantas destino), **empresa_transportadora** (compañías de transporte de carga) y **transportadores** (conductores hijos N:1 de una empresa). Corresponden a la sub-sección **Configuración → Viajes** del frontend.

> **CRUD bajo `configuracion.editar`.** Los endpoints `/select` y `/{empresa}/transportadores` admiten también `viajes.crear` porque el form "Nuevo Viaje" del módulo Viajes los consume directamente (ver [API_VIAJES.md](./API_VIAJES.md) §4.1).
>
> **Soft delete:** las FK `viajes.empresa_transportadora_id`, `viajes.transportador_id` y `viajes.extractora_id` son `restrictOnDelete()`. Por eso `DELETE` no borra físicamente — solo actualiza `estado = false`. Los viajes históricos conservan la referencia.

### 16.1 Extractoras

Plantas extractoras de aceite de palma que reciben el fruto despachado en cada viaje.

#### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/extractoras/select` | `viajes.crear` **o** `configuracion.editar` | Dropdown sin paginación (solo activas). Campos: `id`, `razon_social`, `nit`, `ubicacion`, `ciudad`, `distancia_km`. |
| `GET` | `/extractoras` | `configuracion.editar` | Listar paginado. |
| `GET` | `/extractoras/{id}` | `configuracion.editar` | Ver detalle (incluye `departamento` y `municipio` cargados). |
| `POST` | `/extractoras` | `configuracion.editar` | Crear. |
| `PUT` | `/extractoras/{id}` | `configuracion.editar` | Editar. |
| `DELETE` | `/extractoras/{id}` | `configuracion.editar` | Inactivar (soft delete: `estado = false`). |

#### Filtros adicionales (GET index)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca parcialmente en `razon_social` y `nit` (ilike). |
| `estado` | boolean | Filtra por activas / inactivas. |
| `departamento_codigo` | string(2) | Filtra por departamento (código DANE). |

#### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `razon_social` | string(150) | ✔ | Nombre comercial / razón social. |
| `nit` | string(30) | ✔ | Único por tenant (`unique(tenant_id, nit)`). |
| `ubicacion` | string(200) | ✔ | Dirección o punto físico (Km de vía, etc.). |
| `departamento_codigo` | string(2) | — | Código DANE del departamento. FK a `departamentos`. |
| `municipio_codigo` | string(5) | — | Código DANE del municipio. FK a `municipios`. |
| `ciudad` | string(100) | — | Ciudad / municipio en texto libre (alternativo a los códigos DANE). |
| `telefono` | string(30) | — | Teléfono de contacto. |
| `email` | email(150) | — | Correo electrónico. |
| `contacto_nombre` | string(150) | — | Persona de contacto. |
| `distancia_km` | decimal(6,2) | — | Distancia desde la finca, para costeo logístico. |
| `observaciones` | text | — | Notas internas. |
| `estado` | boolean | — | Default `true`. |

#### Crear / Editar

```json
// POST /extractoras
{
  "razon_social": "Extractora del Cauca S.A.",
  "nit": "800123456-1",
  "ubicacion": "Km 12 Vía Popayán - Cali",
  "ciudad": "Popayán",
  "telefono": "+57 2 123 4567",
  "email": "extractora@cauca.com",
  "contacto_nombre": "Juan Pérez",
  "distancia_km": 45.50
}

// PUT /extractoras/{id}
{
  "telefono": "+57 2 234 5678",
  "distancia_km": 47.00,
  "estado": false
}
```

#### Respuesta del select

```json
{
  "data": [
    {
      "id": 1,
      "razon_social": "Extractora del Cauca S.A.",
      "nit": "800123456-1",
      "ubicacion": "Km 12 Vía Popayán - Cali",
      "ciudad": "Popayán",
      "distancia_km": "45.50"
    }
  ]
}
```

### 16.2 Empresas Transportadoras

Compañías de transporte que mueven el fruto al destino. Cada una agrupa N transportadores (conductores).

#### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/empresas-transportadoras/select` | `viajes.crear` **o** `configuracion.editar` | Dropdown sin paginación (solo activas). Campos: `id`, `razon_social`, `nit`, `tipo_persona`. |
| `GET` | `/empresas-transportadoras/{empresa}/transportadores` | `viajes.crear` **o** `configuracion.editar` | Lista de conductores activos de la empresa (para el dropdown encadenado del form de viaje). |
| `GET` | `/empresas-transportadoras` | `configuracion.editar` | Listar paginado. Soporta `?with_transportadores_count=1` para incluir contador de conductores en cada item (badge "2 conductores"). |
| `GET` | `/empresas-transportadoras/{id}` | `configuracion.editar` | Ver detalle (siempre con `transportadores_count`). |
| `POST` | `/empresas-transportadoras` | `configuracion.editar` | Crear. |
| `PUT` | `/empresas-transportadoras/{id}` | `configuracion.editar` | Editar. |
| `DELETE` | `/empresas-transportadoras/{id}` | `configuracion.editar` | Inactivar (soft delete). |

#### Filtros adicionales (GET index)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca parcialmente en `razon_social` y `nit`. |
| `estado` | boolean | Filtra por activas / inactivas. |
| `tipo_persona` | string | `JURIDICA` o `NATURAL`. |
| `with_transportadores_count` | boolean | Si `true`, incluye `transportadores_count` en cada item. |

#### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `tipo_persona` | string | ✔ | `JURIDICA` o `NATURAL`. Define el badge ("P. Jurídica" / "P. Natural") en el UI. |
| `razon_social` | string(150) | ✔ | Nombre comercial / razón social. |
| `nit` | string(30) | ✔ | Único por tenant. |
| `telefono` | string(30) | — | Teléfono de contacto. |
| `direccion` | string(200) | — | Dirección física. |
| `ciudad` | string(100) | — | Ciudad. |
| `email` | email(150) | — | Correo electrónico. |
| `contacto_nombre` | string(150) | — | Persona de contacto. |
| `observaciones` | text | — | Notas internas. |
| `estado` | boolean | — | Default `true`. |

#### Crear / Editar

```json
// POST /empresas-transportadoras
{
  "tipo_persona": "JURIDICA",
  "razon_social": "Transportes del Valle S.A.S.",
  "nit": "900111222-1",
  "telefono": "+57 300 444 5555"
}

// POST /empresas-transportadoras (persona natural)
{
  "tipo_persona": "NATURAL",
  "razon_social": "Juan Pérez — Transporte JP",
  "nit": "16123456",
  "telefono": "+57 300 555 6666"
}

// PUT /empresas-transportadoras/{id}
{
  "email": "contacto@transportesvalle.com",
  "estado": false
}
```

#### Respuesta del select

```json
{
  "data": [
    {
      "id": 1,
      "razon_social": "Transportes del Valle S.A.S.",
      "nit": "900111222-1",
      "tipo_persona": "JURIDICA"
    }
  ]
}
```

#### Respuesta del listado con contador (GET `?with_transportadores_count=1`)

```json
{
  "data": [
    {
      "id": 1,
      "razon_social": "Transportes del Valle S.A.S.",
      "nit": "900111222-1",
      "tipo_persona": "JURIDICA",
      "telefono": "+57 300 444 5555",
      "estado": true,
      "transportadores_count": 2
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1 }
}
```

### 16.3 Transportadores (Conductores)

Personas naturales que conducen el vehículo del viaje. Cada uno está asociado a una **única** empresa transportadora (relación N:1) y declara su placa, tipo de vehículo y capacidad.

#### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/transportadores` | `configuracion.editar` | Listar paginado (incluye `empresa` eager-loaded). |
| `GET` | `/transportadores/{id}` | `configuracion.editar` | Ver detalle (con `empresa`). |
| `POST` | `/transportadores` | `configuracion.editar` | Crear. |
| `PUT` | `/transportadores/{id}` | `configuracion.editar` | Editar. |
| `DELETE` | `/transportadores/{id}` | `configuracion.editar` | Inactivar (soft delete). |

> Para listar los conductores de **una empresa específica** (dropdown encadenado del form de viaje), usar `GET /empresas-transportadoras/{empresa}/transportadores` (sección 16.2).

#### Filtros adicionales (GET index)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca parcialmente en `nombres`, `apellidos`, `numero_documento` y `placa_vehiculo`. |
| `estado` | boolean | Filtra por activos / inactivos. |
| `empresa_transportadora_id` | integer | Filtra por empresa. |

#### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `empresa_transportadora_id` | integer | ✔ | FK a `empresa_transportadora`. La global scope multi-tenant garantiza aislamiento. |
| `nombres` | string(100) | ✔ | El frontend hace el split del campo "Nombre Completo" (primera palabra = nombres, resto = apellidos). |
| `apellidos` | string(100) | ✔ | — |
| `placa_vehiculo` | string(20) | ✔ | Único por tenant. |
| `tipo_documento` | string | — | `CC`, `CE`, `PPT` o `PASAPORTE`. |
| `numero_documento` | string(30) | — | Cédula / documento. |
| `telefono` | string(30) | — | Teléfono celular. |
| `licencia_conduccion` | string(30) | — | Número de licencia. |
| `licencia_vencimiento` | date | — | Fecha de vencimiento (formato `YYYY-MM-DD`). |
| `tipo_vehiculo` | string(50) | — | "Camión NHR", "Turbo", etc. |
| `capacidad_kg` | decimal(10,2) | — | Capacidad de carga. |
| `observaciones` | text | — | Notas internas. |
| `estado` | boolean | — | Default `true`. |

#### Crear / Editar

```json
// POST /transportadores
{
  "empresa_transportadora_id": 1,
  "nombres": "Carlos",
  "apellidos": "Martínez",
  "placa_vehiculo": "ABC-123",
  "tipo_documento": "CC",
  "numero_documento": "16123456",
  "telefono": "+57 300 777 8888"
}

// PUT /transportadores/{id}
{
  "telefono": "+57 300 999 0000",
  "tipo_vehiculo": "Turbo",
  "capacidad_kg": 8500.00,
  "estado": false
}
```

#### Respuesta del listado de conductores por empresa (consumida por el form de viaje)

```json
// GET /empresas-transportadoras/1/transportadores
{
  "data": [
    {
      "id": 12,
      "empresa_transportadora_id": 1,
      "nombres": "Carlos",
      "apellidos": "Martínez",
      "placa_vehiculo": "ABC-123",
      "tipo_vehiculo": "Camión NHR",
      "capacidad_kg": "8500.00"
    }
  ]
}
```

### 16.4 Errores específicos del módulo

| Código HTTP | Cuándo | Descripción |
|---|---|---|
| 422 | NIT duplicado (mismo tenant) en `extractoras` o `empresa_transportadora` | `Ya existe una extractora/empresa con este NIT.` |
| 422 | Placa duplicada (mismo tenant) en `transportadores` | `Ya existe un conductor registrado con esta placa.` |
| 422 | `tipo_persona` inválido en `empresa_transportadora` | Solo se aceptan `JURIDICA` o `NATURAL`. |
| 422 | `tipo_documento` inválido en `transportadores` | Solo se aceptan `CC`, `CE`, `PPT` o `PASAPORTE`. |
| 404 | El recurso pertenece a otro tenant | El global scope `BelongsToTenant` filtra automáticamente. |

> **Importante:** los NIT/placas son únicos **por tenant**. Dos fincas distintas pueden tener registros con el mismo NIT/placa sin conflicto.

---

## 16. Motivos de Ausencia (Tipos de Novedades)

Catálogo paramétrico por tenant que alimenta el dropdown "Motivo" del wizard de Ausencias y la sección **Tipos de Novedades** de la pantalla Configuración → Nómina. Cada motivo está anclado a un `tipo_base` del enum fijo (11 valores) que es el discriminador que usa la nómina para aplicar reglas especiales (días 1-2 EPS al 100%, días 3+ al 66.67%, descuentos de permisos no remunerados, etc.).

> **Documentación completa** (snapshots al crear ausencia, integración con nómina, máquina de estados de la ausencia en sí): [API_AUSENCIAS.md §1](./API_AUSENCIAS.md). Esta sección es el **cross-link** para que la pantalla de Configuración → Nómina tenga todos sus CRUD en un solo índice.

### Endpoints

| Método | URL | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/motivos-ausencia/select` | `configuracion.editar` **o** `operaciones.crear` **o** `operaciones.editar` | Dropdown sin paginación (solo activos). Incluye `tipo_base` + flags + `color`. |
| `GET` | `/motivos-ausencia` | `configuracion.editar` | Listar paginado. Filtros: `search`, `tipo_base`, `estado`. |
| `GET` | `/motivos-ausencia/{id}` | `configuracion.editar` | Ver detalle. |
| `POST` | `/motivos-ausencia` | `configuracion.editar` | Crear. |
| `PUT` | `/motivos-ausencia/{id}` | `configuracion.editar` | Editar. |
| `DELETE` | `/motivos-ausencia/{id}` | `configuracion.editar` | Eliminar. 409 `MOTIVO_CON_AUSENCIAS` si tiene ausencias asociadas. |

### Campos

| Campo | Tipo | Requerido al crear | Descripción |
|---|---|---|---|
| `nombre` | string(100) | ✔ | Único por tenant. Ej: "Incapacidad EPS - General". |
| `tipo_base` | enum(11) | ✔ | `INCAPACIDAD_EPS`, `INCAPACIDAD_ARL`, `LICENCIA_MATERNIDAD`, `LICENCIA_PATERNIDAD`, `LICENCIA_LUTO`, `PERMISO_REMUNERADO`, `PERMISO_NO_REMUNERADO`, `AUSENCIA_INJUSTIFICADA`, `CALAMIDAD_DOMESTICA`, `SUSPENSION_DISCIPLINARIA`, `OTRO`. Discrimina la regla de cálculo en nómina. |
| `es_remunerada` | boolean | — | Default `false`. Si `true`, suma a `total_incapacidades`. |
| `afecta_nomina` | boolean | — | Default `true`. Si `false`, solo es tracking informativo. |
| `porcentaje_pago_default` | decimal(5,2) | — | Default `0`. Valor por defecto del % de pago (0-100). |
| `requiere_soporte` | boolean | — | Default `false`. Si `true`, el wizard exige PDF para aprobar. |
| `color` | string(7) | — | Hex `#RRGGBB` (ej. `#3b82f6`). Usado por la UI para el punto de color del listado. Regex `/^#[0-9a-fA-F]{6}$/`. |
| `estado` | boolean | — | Default `true`. |
| `condicion` | string(100) | — | Condición legal / restricción de días (ej. "Día 1-2: 100% / Día 3-90: 66.67%"). Solo informativo. |
| `norma_legal` | string(50) | — | Norma de referencia (ej. "Art. 227 CST + Dec. 780", "Ley 1822 de 2017"). Solo informativo. |
| `formula_calculo` | string(200) | — | Descripción libre de la fórmula si aplica. Solo informativo. |
| `afecta_seguridad_social` | boolean | — | Default `false`. Se **snapshottea en `ausencias.afecta_seguridad_social`** al crear la ausencia. Indica si el período cuenta para IBC de salud/pensión. |
| `afecta_parafiscales` | boolean | — | Default `false`. Snapshoteado en `ausencias`. Indica si el período cuenta para parafiscales (SENA, ICBF, Caja de Compensación). |
| `afecta_prestaciones` | boolean | — | Default `false`. Snapshoteado en `ausencias`. Indica si el período cuenta para prestaciones sociales (cesantías, prima, vacaciones). |

### Crear / Editar

```json
// POST /motivos-ausencia
{
  "nombre": "Permiso médico ambulatorio",
  "tipo_base": "PERMISO_REMUNERADO",
  "es_remunerada": true,
  "afecta_nomina": true,
  "porcentaje_pago_default": 100,
  "requiere_soporte": true,
  "color": "#22c55e",
  "condicion": "Según empresa",
  "norma_legal": "CST Art. 57",
  "afecta_seguridad_social": true,
  "afecta_parafiscales": true,
  "afecta_prestaciones": true
}

// PUT /motivos-ausencia/{id}
{
  "color": "#ef4444",
  "estado": false,
  "afecta_prestaciones": false
}
```

### Respuesta del select

```json
// GET /motivos-ausencia/select
{
  "data": [
    {
      "id": 1,
      "nombre": "Incapacidad EPS - General",
      "tipo_base": "INCAPACIDAD_EPS",
      "es_remunerada": true,
      "afecta_nomina": true,
      "porcentaje_pago_default": "66.67",
      "requiere_soporte": true,
      "color": "#3b82f6",
      "afecta_seguridad_social": true,
      "afecta_parafiscales": false,
      "afecta_prestaciones": false
    }
  ]
}
```

### Catálogo sembrado

`MotivoAusenciaSeeder` crea 11 motivos base por tenant activo (uno por `tipo_base`) con colores, porcentajes y flags de afectación según legislación laboral colombiana. Idempotente vía `updateOrCreate(tenant_id, nombre)`.

Expone `sembrarParaTenant(Tenant $tenant): int` — usado por `TenantController::store()` para que cada finca nueva reciba automáticamente los 11 motivos. Para re-sembrar en tenants existentes tras agregar los nuevos campos:

```bash
php artisan db:seed --class=MotivoAusenciaSeeder
```

Los tres flags (`afecta_seguridad_social`, `afecta_parafiscales`, `afecta_prestaciones`) quedan **snapshotteados en `ausencias`** al crear cada ausencia (via `Ausencia::booted() → creating`), preservando el histórico aunque el admin luego edite el motivo.

### Errores específicos

| Código HTTP | code | Descripción |
|---|---|---|
| 409 | `MOTIVO_CON_AUSENCIAS` | No se puede eliminar porque tiene ausencias asociadas. |
| 422 | — | `color` no cumple el regex hex `#RRGGBB`, o `tipo_base` fuera del enum. |

---

## Sub-módulo "Configuración → Nómina" — índice unificado

Pantalla agrupada del frontend. Todos los endpoints usan **`configuracion.editar`** salvo Conceptos de Nómina (excepción documentada abajo). Mapeo completo:

| # | Sección del mockup | Endpoint(s) | Sección en este doc |
|---|---|---|---|
| 1 | Periodicidad + Fechas de Corte (Q1/Q2) | `GET/PUT /configuracion/nomina` | §8 |
| 2 | Jornada Laboral Semanal (frontend deriva `divisor / 5`) | `GET/PUT /configuracion/nomina` | §8 |
| 3 | Precios de Cosecha (lote × año × $/kg) | `GET/POST/PUT/DELETE /precios-cosecha` | §9 |
| 4 | Rangos de Abonada (gramos × $/palma) | `GET/POST/PUT/DELETE /precios-abono` | §3 |
| 5 | Labores (palma fijas + custom palma + custom finca) — catálogo unificado con `tipo_pago` y `precio_palma` por labor | `GET/POST/PUT/DELETE /labores` | §4 |
| 6 | Tipos de Horas Extras (incluye `descripcion` libre) | `GET/POST/PUT/DELETE /tipos-hora-extra` | §11 |
| 7 | Tipos de Novedades (motivos de ausencia, con `color`) | `GET/POST/PUT/DELETE /motivos-ausencia` | §16 (este doc) |
| 8 | Conceptos de Nómina (deducciones + bonificaciones) | `GET/POST/PUT/DELETE /nomina-conceptos` | ⚠ Vive en [API_NOMINA.md §6](./API_NOMINA.md) |

> **Excepción intencional — Conceptos de Nómina:** usa el permiso **`nomina-conceptos.gestionar`** (no `configuracion.editar`). Esto existe para que el rol "Contador" pueda gestionar conceptos sin tener que recibir acceso al resto de Configuración. Por esa diferencia de permiso vive documentado en `API_NOMINA.md §6` y no aquí.

---

## 17. Bundle inicial — Pantalla "Precios de Labores"

Endpoint único que reemplaza los 6 requests paralelos que la pantalla **Configuración → Precios de Labores** disparaba al cargar. Devuelve los 6 datasets en una sola respuesta cacheada en el servidor (TTL 60 s por tenant). El caché se invalida automáticamente cuando se crea, edita o elimina cualquier labor, precio de cosecha, precio de abono o lote.

### Endpoint

| Método | URL | Permiso |
|--------|-----|---------|
| `GET`  | `/configuracion/precios-labores/init` | `configuracion.editar` |

### Parámetros opcionales

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `per_page_cosecha` | integer | 100 | Límite de registros de `precios_cosecha` incluidos en el bundle |

### Respuesta (200)

```json
{
  "data": {
    "precios_cosecha": [
      { "id": 1, "lote_id": 1, "anio": 2025, "precio": "4500.00", "lote": { "id": 1, "nombre": "Lote Norte" } }
    ],
    "precios_abono": [
      { "id": 1, "gramos_min": 0, "gramos_max": 200, "precio_palma": "100.00", "estado": true }
    ],
    "labores_palma_fijas": [
      { "id": 13, "nombre": "Cosecha",       "categoria": "PALMA", "tipo": "COSECHA",       "tipo_pago": "POR_PALMA",   "precio_palma": null,    "es_sistema": true },
      { "id": 14, "nombre": "Plateo",        "categoria": "PALMA", "tipo": "PLATEO",        "tipo_pago": "POR_PALMA",   "precio_palma": "50.00", "es_sistema": true },
      { "id": 15, "nombre": "Poda",          "categoria": "PALMA", "tipo": "PODA",          "tipo_pago": "POR_PALMA",   "precio_palma": "80.00", "es_sistema": true },
      { "id": 16, "nombre": "Fertilización", "categoria": "PALMA", "tipo": "FERTILIZACION", "tipo_pago": "POR_PALMA",   "precio_palma": null,    "es_sistema": true },
      { "id": 17, "nombre": "Sanidad",       "categoria": "PALMA", "tipo": "SANIDAD",       "tipo_pago": "JORNAL_FIJO", "precio_palma": null,    "es_sistema": true }
    ],
    "labores_palma_custom": [
      { "id": 32, "nombre": "Resiembra", "categoria": "PALMA", "tipo": null, "tipo_pago": "POR_PALMA", "precio_palma": "1500.00", "es_sistema": false }
    ],
    "labores_finca": [
      { "id": 7, "nombre": "Reparación de portón", "categoria": "FINCA", "tipo": null, "tipo_pago": "JORNAL_FIJO", "precio_palma": "45000.00", "es_sistema": false }
    ],
    "lotes": [
      { "id": 1, "nombre": "Lote Norte", "predio_id": 1, "predio": { "id": 1, "nombre": "Predio A" } }
    ]
  }
}
```

### Notas de implementación para el frontend

- **Reemplaza 6 llamadas paralelas** (`/precios-cosecha`, `/precios-abono`, `/labores?categoria=PALMA&es_sistema=true`, `/labores?categoria=PALMA&es_sistema=false`, `/labores?categoria=FINCA`, `/lotes/select`) por una sola.
- **`staleTime` recomendado:** 60 000 ms (igual al TTL del servidor). Ejemplo con TanStack Query:
  ```ts
  useQuery({
    queryKey: ['precios-labores-bundle'],
    queryFn: () => api.get('/configuracion/precios-labores/init').then(r => r.data.data),
    staleTime: 60_000,
    gcTime:    5 * 60_000,
  })
  ```
- **Invalidar tras mutaciones:** después de cada `POST / PUT / DELETE` a `/labores`, `/precios-cosecha`, `/precios-abono` o `/lotes`, ejecutar:
  ```ts
  queryClient.invalidateQueries({ queryKey: ['precios-labores-bundle'] })
  ```
- **Endpoints individuales se mantienen:** siguen funcionando para CRUD, búsquedas con filtros y paginación profunda. Solo la carga inicial de la pantalla usa el bundle.
- **`labores_palma_fijas`** contiene siempre las 5 labores del sistema (`es_sistema=true`, `estado=true`). No incluye inactivas.
- **`lotes`** contiene solo lotes con `estado=true`, ordenados por nombre, con el predio anidado.

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
