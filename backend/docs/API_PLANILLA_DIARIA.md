# API — Planilla Diaria de Trabajo

> Reporte consolidado dentro del módulo **Pagos (Nómina)** que muestra, para un período de nómina seleccionado, todas las operaciones aprobadas agrupadas por tipo de labor. Incluye colaboradores, valores brutos y neto por colaborador interno.

---

## 0. Base y autenticación

**Base URL:** `{host}/api/v1/tenant`

**Headers requeridos en TODAS las peticiones:**
```
Authorization: Bearer {jwt_token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
Accept: application/json
```

**Permiso requerido:** `nomina.ver` (los 3 endpoints).

**Controller:** `App\Http\Controllers\Api\Nomina\NominaPlanillaDiariaController`

---

## 1. Datos principales

`GET /nominas/{nomina}/planilla-diaria`

Devuelve las secciones de la planilla diaria para el período indicado. Solo incluye `Operacion` con `estado = APROBADA` dentro del rango `fecha_inicio – fecha_fin` de la nómina.

### Query params

| Parámetro | Tipo | Descripción |
|---|---|---|
| `colaborador` | string | Búsqueda libre por nombre/apellido (empleado u operario). Filtra filas donde ningún colaborador coincide. |
| `lote_id` | int | Filtrar por lote. Excluye cosechas y grupos de jornales en otros lotes. |
| `fecha` | date (YYYY-MM-DD) | Filtrar por día específico dentro del período. |

> Los tres filtros son independientes y acumulativos.

### Lógica de agrupación

| Sección | Fuente | Clave de agrupación |
|---|---|---|
| `cosecha` | `registro_cosecha` | Cada registro = 1 fila con su cuadrilla |
| `plateo` / `poda` / `fertilizacion` / `sanidad` | `jornales` (`categoria=PALMA`, `tipo` correspondiente) | `(operacion_id, labor_id, lote_id)` |
| `otros` | `jornales` (`categoria=PALMA`, `tipo IS NULL`) | `(operacion_id, labor_id, lote_id)` |
| `auxiliares` | `jornales` (`categoria=FINCA`) | `(operacion_id, labor_id, lote_id)` |

### Campos por fila

**Cosecha:**

| Campo | Descripción |
|---|---|
| `id` | `registro_cosecha.id` |
| `fecha` | `operacion.fecha` |
| `lote` | `lote.nombre` |
| `colaboradores` | Array ordenado: internos primero, luego operarios de tercero |
| `gajos` | `gajos_reconteo ?? gajos_reportados` |
| `kilos` | `peso_confirmado` (null si sin peso) |
| `promedio` | `promedio_kg_gajo` (null si sin peso) |
| `precio` | `precio_cosecha` snapshot |
| `total` | `valor_total` (null si sin peso) |
| `num_colaboradores` | Total de integrantes en la cuadrilla |
| `pago_por_colaborador` | `valor_total / num_colaboradores` (null si sin valor) |
| `col_neto` | Suma de `cosecha_cuadrilla.valor_calculado` donde `empleado_id IS NOT NULL` (solo internos) |

**Jornales (plateo / poda / fertilizacion / sanidad / otros / auxiliares):**

| Campo | Descripción |
|---|---|
| `id` | `jornal.id` del primer elemento del grupo |
| `fecha` | `operacion.fecha` del grupo |
| `lote` | `lote.nombre` (null si el jornal no tiene lote asignado) |
| `labor` | `labor.nombre` |
| `colaboradores` | Array de integrantes del grupo |
| `precio` | `valor_unitario` (igual para todos en el grupo dado que comparten labor+lote+operación) |
| `total` | `SUM(valor_total)` del grupo |
| `num_colaboradores` | `COUNT` del grupo |
| `pago_por_colaborador` | `valor_unitario` (ya es individual — cada jornal es por persona) |
| `col_neto` | `SUM(valor_total)` de jornales del grupo donde `empleado_id IS NOT NULL` |

**Objeto colaborador (en `colaboradores[]`):**

```json
{
  "id": 10,
  "nombre": "PAULO RODRÍGUEZ",
  "tipo": "empleado"
}
```
```json
{
  "id": 5,
  "nombre": "ROCKET GÓMEZ",
  "tipo": "operario",
  "tercero_nombre": "Contratistas del Norte SAS"
}
```

> **UI:** los primeros 3 elementos del array `colaboradores` corresponden a `COL.1`, `COL.2`, `COL.3`. El resto se muestra en la columna `CUADRILLA`. Para jornales, la cuadrilla siempre viene vacía o `-` porque cada jornal es individual.

### Definición de `col_neto` y `total_neto_colaboradores`

- `col_neto` **solo suma valores de colaboradores internos** (`empleado_id IS NOT NULL`). Los operarios de terceros quedan excluidos (su valor va al acta del contratista).
- Para cosecha 100% interna → `col_neto = valor_total`.
- Para cosecha con operarios de tercero → `col_neto < valor_total`.
- `total_neto_colaboradores` = suma de todos los `col_neto` de todas las secciones.

### Respuesta 200

```json
{
  "data": {
    "periodo": {
      "id": 5,
      "nombre": "Planilla 15–30 Abril 2026",
      "fecha_inicio": "2026-04-15",
      "fecha_fin": "2026-04-30"
    },
    "secciones": {
      "cosecha": {
        "count": 6,
        "registros": [
          {
            "id": 55,
            "fecha": "2026-04-01",
            "lote": "TARRO",
            "colaboradores": [
              { "id": 10, "nombre": "PAULO RODRÍGUEZ", "tipo": "empleado" },
              { "id": 11, "nombre": "ROCKET GÓMEZ",    "tipo": "empleado" }
            ],
            "gajos": 6,
            "kilos": "106.00",
            "promedio": "17.67",
            "precio": "45000.00",
            "total": "73753.00",
            "num_colaboradores": 2,
            "pago_por_colaborador": "36876.50",
            "col_neto": "73753.00"
          }
        ],
        "subtotal_total":    "1599947.00",
        "subtotal_col_neto": "552050.00"
      },
      "plateo": {
        "count": 3,
        "registros": [
          {
            "id": 201,
            "fecha": "2026-04-01",
            "lote": "TARRO",
            "labor": "Plateo",
            "colaboradores": [
              { "id": 10, "nombre": "MARIO LUIS", "tipo": "empleado" },
              { "id": 12, "nombre": "LUIS PÉREZ", "tipo": "empleado" }
            ],
            "precio": "38000.00",
            "total": "76000.00",
            "num_colaboradores": 2,
            "pago_por_colaborador": "38000.00",
            "col_neto": "76000.00"
          }
        ],
        "subtotal_total":    "228000.00",
        "subtotal_col_neto": "114000.00"
      },
      "poda":          { "count": 2, "registros": [...], "subtotal_total": "126000.00", "subtotal_col_neto": "84000.00" },
      "fertilizacion": { "count": 2, "registros": [...], "subtotal_total": "135000.00", "subtotal_col_neto": "90000.00" },
      "sanidad":       { "count": 1, "registros": [...], "subtotal_total": "80000.00",  "subtotal_col_neto": "40000.00" },
      "otros":         { "count": 0, "registros": [],    "subtotal_total": "0.00",      "subtotal_col_neto": "0.00" },
      "auxiliares":    { "count": 1, "registros": [...], "subtotal_total": "35000.00",  "subtotal_col_neto": "35000.00" }
    },
    "totales": {
      "total_kilos":              "36293.00",
      "total_bruto":              "2202947.00",
      "total_neto_colaboradores": "922252.00"
    }
  }
}
```

**Totales:**
| Campo | Descripción |
|---|---|
| `total_kilos` | Suma de `kilos` de todas las filas de cosecha (null excluido) |
| `total_bruto` | Suma de `subtotal_total` de todas las secciones |
| `total_neto_colaboradores` | Suma de `subtotal_col_neto` de todas las secciones |

**Ejemplo cURL:**
```bash
# Sin filtros
curl "$BASE/nominas/5/planilla-diaria" "${H[@]}"

# Filtrado por colaborador y lote
curl "$BASE/nominas/5/planilla-diaria?colaborador=mario&lote_id=1" "${H[@]}"

# Filtrado por día específico
curl "$BASE/nominas/5/planilla-diaria?fecha=2026-04-01" "${H[@]}"
```

---

## 2. Lotes del período (filtro dropdown)

`GET /nominas/{nomina}/planilla-diaria/lotes`

Devuelve los lotes únicos que aparecen en las operaciones del período (en cosechas o en jornales). Alimenta el dropdown "Lote" del filtro de la UI.

### Respuesta 200

```json
{
  "data": [
    { "id": 1, "nombre": "TARRO" },
    { "id": 2, "nombre": "PISCINAS" },
    { "id": 3, "nombre": "ESCUELA" },
    { "id": 4, "nombre": "CASIRO" }
  ]
}
```

Sin paginación. Ordenado por `nombre`. Solo lotes realmente usados en el período.

**Ejemplo cURL:**
```bash
curl "$BASE/nominas/5/planilla-diaria/lotes" "${H[@]}"
```

---

## 3. Exportar a Excel

`GET /nominas/{nomina}/planilla-diaria/exportar`

Mismos query params que el endpoint §1 (`colaborador`, `lote_id`, `fecha`).

Retorna un archivo `.xlsx` descargable.

**Headers de respuesta:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Planilla-Diaria-2026-04-15.xlsx"
Cache-Control: no-cache, no-store, must-revalidate
```

### Estructura del Excel

Una sola hoja ("Planilla Diaria") con el siguiente layout vertical:

```
Fila 1:  [Título] "Planilla Diaria de Trabajo — Planilla 15-30 Abril 2026"
Fila 2:  (vacía)
--- COSECHA (fondo verde claro #DCFCE7) ---
Fila 3:  [Encabezado sección] COSECHA
Fila 4:  [Headers] FECHA | COL.1 | COL.2 | COL.3 | CUADRILLA | LOTE | Nº GAJOS | KILOS | PROMEDIO | PRECIO | TOTAL | COLAB. | PAGO X COLAB. | $ COL NETO
Filas 5-N: [Datos cosecha, filas alternas gris #F9FAFB]
Fila N+1: [Subtotal Cosecha] (fondo #F0FDF4, negrita)
(vacía)
--- PLATEO ---
[mismo patrón: encabezado sección → headers → datos → subtotal]
--- PODA ---
--- FERTILIZACIÓN ---
--- SANIDAD ---
--- OTROS ---
--- AUXILIARES ---
(vacía)
Última fila: [TOTALES GENERALES] fondo verde oscuro #14532D, texto blanco
             Total Kilos | ... | Total Bruto | ... | Total Neto Colaboradores | ...
```

**Columnas de datos:**

| Columna Excel | Datos cosecha | Datos jornales |
|---|---|---|
| A — FECHA | fecha | fecha |
| B — COL. 1 | nombre del colaborador[0] | nombre del colaborador[0] |
| C — COL. 2 | nombre del colaborador[1] (o `-`) | nombre del colaborador[1] (o `-`) |
| D — COL. 3 | nombre del colaborador[2] (o `-`) | nombre del colaborador[2] (o `-`) |
| E — CUADRILLA | colaboradores[3+] concatenados con `, ` | `-` (jornales no tienen extra) |
| F — LOTE | lote.nombre | lote.nombre |
| G | Nº GAJOS | LABOR (nombre de la labor) |
| H | KILOS | *(vacío)* |
| I | PROMEDIO | *(vacío)* |
| J — PRECIO | precio (formato `$#,##0`) | precio (formato `$#,##0`) |
| K — TOTAL | total (formato `$#,##0`) | total (formato `$#,##0`) |
| L — COLAB. | num_colaboradores | num_colaboradores |
| M — PAGO X COLAB. | pago_por_colaborador (formato `$#,##0`) | pago_por_colaborador (formato `$#,##0`) |
| N — $ COL NETO | col_neto (formato `$#,##0`) | col_neto (formato `$#,##0`) |

Secciones con cero registros se omiten del Excel.

**Ejemplo cURL:**
```bash
curl "$BASE/nominas/5/planilla-diaria/exportar" "${H[@]}" \
  --output "planilla-abril-2026.xlsx"

# Con filtros
curl "$BASE/nominas/5/planilla-diaria/exportar?lote_id=1&colaborador=mario" "${H[@]}" \
  --output "planilla-filtrada.xlsx"
```

---

## 4. Notas de implementación frontend

- **Una sola petición al entrar a la pantalla:** llamar `GET /nominas/{id}/planilla-diaria` al montar la vista. El período viene dentro del payload (`data.periodo`) — no hay que pedirlo por separado.
- **Dropdown de período:** el selector "Planilla" usa `GET /nominas?estado=CERRADA` o el índice de nóminas ya disponible; al cambiar el período, re-solicitar `/planilla-diaria`.
- **Dropdown de Lotes:** poblar con `GET /nominas/{id}/planilla-diaria/lotes` al abrir la pantalla. Re-solicitar si cambia el período.
- **Filtros:** aplicar en el cliente o re-llamar el endpoint con params. Re-llamar al servidor es preferible para períodos con muchos registros.
- **Columnas COL.1/2/3:** asignar `colaboradores[0]`, `[1]`, `[2]`. Si es `-` (array corto), mostrar guión.
- **Columna CUADRILLA:** mostrar `colaboradores.slice(3)` como nombres truncados o en tooltip. Para jornales siempre estará vacía.
- **`col_neto` en gris:** es una columna destacada que muestra lo que realmente va a los colaboradores propios de la finca.
- **Secciones vacías:** si `count === 0`, ocultar la sección completa (no mostrar tabla vacía).
- **Botón Exportar:** llama a `/exportar` con los mismos query params que el filtro activo. El navegador descargará el `.xlsx` directamente.

---

## 5. Referencias cruzadas

- Modelo de datos de Operaciones, Jornales y Cosechas: [LABORES_JORNALES.md](./LABORES_JORNALES.md)
- Endpoints del módulo de Nómina (wizard, liquidación, terceros): [API_NOMINA.md](./API_NOMINA.md)
- Ciclo de vida de la Operación (planilla diaria operativa): [API_OPERACIONES.md](./API_OPERACIONES.md)
