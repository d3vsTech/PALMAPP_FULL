# Investigación: cómo se calculan Cosecha, Labores de Palma y Labores de Finca

> Análisis profundo del flujo de cálculo de dinero en el módulo de Operaciones (Planilla del Día). Cubre qué tabla resuelve qué precio, cuándo se hidrata cada valor y cómo conecta con Nómina.

El sistema tiene **tres servicios** orquestando el cálculo del dinero que gana cada empleado, y cada uno consume **una tabla de precios distinta**. La clave está en entender qué tabla resuelve qué precio y **cuándo se "hidrata" el valor**.

---

## 1. Las tres tablas de precios

| Tabla | Llave de búsqueda | Quién la consume | Ubicación |
|---|---|---|---|
| `precio_cosecha` | `(lote_id, anio)` | `NominaCalculationService`, `CosechaCalculationService` | [app/Models/PrecioCosecha.php](../app/Models/PrecioCosecha.php) |
| `promedio_lote` | `(tenant_id, lote_id, fecha)` | `NominaCalculationService`, `ViajeCalculationService` | [app/Models/PromedioLote.php](../app/Models/PromedioLote.php) |
| `labores.precio_palma` | `labor_id` | `JornalCalculationService` (PALMA y FINCA) | [app/Models/Labor.php](../app/Models/Labor.php) |
| `precio_abono` | rango `gramos_min..gramos_max` | `JornalCalculationService` (solo FERTILIZACION POR_PALMA) | — |

---

## 2. Cosecha — Flujo Correcto (dos capas: operativa y de nómina)

**Vive aparte de `jornales`** en `registro_cosecha` + `cosecha_cuadrilla` porque es labor de cuadrilla (varios empleados sobre el mismo sublote).

### 2.1 Capa operativa: registro en la planilla

`CosechaCalculationService::calcular()` calcula `registro_cosecha.valor_total` al crear o editar una cosecha. Esto es un **valor de referencia operativo** (visible en el resumen de la planilla), NO el valor final de nómina.

```
POR_PALMA (default):
  precio   = precio_cosecha WHERE lote_id=? AND anio=?
  promedio = promedio_lote más reciente del año (snapshot informativo)
  Si peso_confirmado es NULL:
    valor_total = NULL (se hidrata al registrar el peso)
  Si peso_confirmado existe:
    valor_total = peso_confirmado × precio

JORNAL_FIJO:
  valor_total = labor.precio_palma (plano)
```

`cosecha_cuadrilla.valor_calculado = valor_total / N` (valor por empleado, referencia operativa).

### 2.2 Capa de viaje: generación del historial de promedios

Al finalizar un viaje (`ViajeCalculationService::calcularAlFinalizar()`):

El campo `es_homogeneo` **no lo define el usuario** — el sistema lo recalcula automáticamente en cada `addDetalle()` / `removeDetalle()`:

```
lotes_distintos = COUNT(DISTINCT lote_id de cosechas activas del viaje)
es_homogeneo    = (lotes_distintos <= 1)
```

- **Si `es_homogeneo = true`** (single-lote): calcula el promedio real kg/gajo usando los gajos efectivos de cada cosecha:
  ```
  gajos_efectivos = gajos_reconteo ?? gajos_reportados
  promedio = peso_viaje / SUM(gajos_efectivos) agrupado por lote
  → INSERT INTO promedio_lote (lote_id, viaje_id, promedio, fecha, anio)
  → UPDATE registro_cosecha SET promedio_kg_gajo = promedio (snapshot visual)
  ```
  Crea un registro histórico en `promedio_lote` por cada lote involucrado.

- **Si `es_homogeneo = false`** (multi-lote): no se crea PromedioLote, no se actualiza nada.

### 2.3 Capa de nómina: cálculo del pago real por empleado

`NominaCalculationService::sumarCosecha()` calcula cuánto gana el empleado de VARIABLE por cosecha en el período:

```
Para cada cosecha_cuadrilla del empleado en el período (operación APROBADA):
  lote_id = cosecha.lote_id
  gajos_efectivos = cosecha.gajos_reconteo ?? cosecha.gajos_reportados
  N = COUNT(cuadrilleros activos de la cosecha)
  gajos_empleado = FLOOR(gajos_efectivos / N)   ← partes iguales enteras

  promedio_de_promedios = AVG(promedio_lote WHERE lote_id=X AND fecha BETWEEN inicio AND fin)
  
  Si no hay promedios de viajes en el período:
    → usar PromedioLote baseline admin más reciente del año (viaje_id IS NULL)
  Si sigue sin haber → omitir, totalcosecha no aumenta

  precio = precio_cosecha WHERE lote_id=X AND anio=año_inicio_periodo

  pago_dia = gajos_empleado × promedio_de_promedios × precio

total_cosecha = SUM(pago_dia por cada cosecha del período)
```

**Ejemplo:**
```
Período: Jun 1-15  |  Lote: Marsella
PromedioLote registrados: [15.5 (viaje 1), 14.2 (viaje 2), 16.0 (viaje 3)]
Promedio de promedios: (15.5 + 14.2 + 16.0) / 3 = 15.23 kg/gajo
PrecioCosecha Marsella 2026: $2.500/kg

Juan: 50 gajos × 15.23 × $2.500 = $1.903.750
Pedro: 50 gajos × 15.23 × $2.500 = $1.903.750
```

### 2.4 Tabla promedio_lote — Nuevo comportamiento histórico

La tabla `promedio_lote` ya no tiene UNIQUE(lote_id, anio). Soporta múltiples registros por lote:

| Campo | Descripción |
|---|---|
| `viaje_id` | FK a viajes. NULL = baseline manual del admin. NOT NULL = generado por viaje |
| `fecha` | Fecha del viaje o fecha manual. Usada para filtrar por período de nómina |
| `anio` | Año (para filtros rápidos) |

El admin puede seguir creando registros baseline desde el CRUD de PromedioLote. Los registros generados por viajes son **inmutables** (no se pueden editar ni borrar manualmente).

### 2.5 Snapshots de nómina: trazabilidad

Al cerrar la nómina, `CerrarNominaService::snapshotCosechas()` graba en `nomina_cosecha_ref`:

| Campo | Descripción |
|---|---|
| `valor_snapshot` | Pago calculado: gajos × promedio × precio |
| `gajos_asignados` | Gajos que le correspondieron a este empleado |
| `precio_cosecha_snapshot` | Precio/kg vigente al momento de liquidar |
| `promedio_promedios_snapshot` | Promedio de promedios del período |

Esto garantiza trazabilidad completa aunque cambien los precios o promedios después.

---

## 3. Labores de Palma (5 de las 6 caen aquí; COSECHA es el caso aparte)

Sin cambios respecto al diseño anterior. Todas viven en `jornales` con `categoria='PALMA'` y discriminador `tipo`. El servicio único es `JornalCalculationService`.

| `tipo` | tipo_pago | Resuelve precio en | Fórmula |
|---|---|---|---|
| PLATEO / PODA | POR_PALMA | `labor.precio_palma` | `cantidad_palmas × precio_palma` |
| PLATEO / PODA | JORNAL_FIJO | `labor.precio_palma` | valor plano |
| FERTILIZACION | POR_PALMA | `precio_abono` por rango de gramos | `cantidad_palmas × precio_rango` |
| FERTILIZACION | JORNAL_FIJO | `labor.precio_palma` | valor plano |
| SANIDAD | POR_PALMA | `labor.precio_palma` | `cantidad_palmas × precio_palma` |
| SANIDAD | JORNAL_FIJO | `labor.precio_palma` | valor plano (puede ser NULL) |

---

## 4. Labores de Finca (el caso más simple)

`categoria='FINCA'`, siempre `JORNAL_FIJO`. `valor_total = labor.precio_palma` (plano). Sin cambios.

---

## 5. Tabla de resumen — quién paga qué

| Operación UI | Tabla destino | Servicio | Precio sale de | ¿Puede quedar `valor_total=NULL`? |
|---|---|---|---|---|
| Tab Cosecha | `registro_cosecha` + `cosecha_cuadrilla` | `CosechaCalculationService` | `precio_cosecha` (referencia operativa) | Sí, cuando no se envía `peso_confirmado` |
| Nómina — cosecha | `nomina_empleado.total_cosecha` | `NominaCalculationService::sumarCosecha` | `promedio_lote` + `precio_cosecha` | 0 si sin promedios/precio |
| Tab Plateo/Poda | `jornales` (PALMA) | `JornalCalculationService` | `labor.precio_palma` | No |
| Tab Fertilización | `jornales` (PALMA) | `JornalCalculationService` | `precio_abono` por rango | No |
| Tab Sanidad | `jornales` (PALMA) | `JornalCalculationService` | `labor.precio_palma` (nullable) | Sí, por diseño |
| Labores de Finca | `jornales` (FINCA) | `JornalCalculationService` | `labor.precio_palma` | No |

---

## 6. Conexión con Nómina (cierra el ciclo)

- **Empleados FIJO**: los jornales y cosechas son solo **tracking**. Sueldo = `salario_base × (dias/periodo)`.
- **Empleados VARIABLE**: sueldo = `SUM(jornales.valor_total) + total_cosecha_calculado`.
  - `total_cosecha_calculado` usa la fórmula nueva: gajos × promedio_promedios × precio.
  - NULLs excluidos automáticamente.

---

## 7. Rol de promedio_lote en el nuevo sistema

| Momento | Rol |
|---|---|
| Inicio de temporada | Admin crea registros baseline (viaje_id=NULL) con fecha dentro del primer período |
| Cierre de viaje homogéneo | Sistema crea registro de viaje (viaje_id=ID) con fecha = fecha_viaje |
| Cálculo de nómina | NominaCalculationService promedia todos los registros del período para el lote |
| Reportes | El historial de promedios por lote está disponible para análisis |

---

## 8. TL;DR del flujo

```
Cosecha (operativa):  precio_cosecha        → valor_total = peso × precio (referencia, opcional)
Cosecha (nómina):     promedio_lote + precio_cosecha → gajos_empleado × avg(promedio) × precio
PLATEO/PODA:          labor.precio_palma     → palmas × precio  (o plano en JORNAL_FIJO)
FERTILIZ.:            precio_abono (rangos)  → palmas × precio_rango
SANIDAD:              labor.precio_palma     → plano (nullable)
FINCA:                labor.precio_palma     → plano

ViajeCalculationService (al finalizar viaje homogéneo):
  → CREATE PromedioLote { lote_id, viaje_id, promedio = peso/gajos, fecha }
  → UPDATE registro_cosecha.promedio_kg_gajo (snapshot visual)
```

---

## 9. Referencias cruzadas

- Servicios:
  - [app/Services/CosechaCalculationService.php](../app/Services/CosechaCalculationService.php)
  - [app/Services/ViajeCalculationService.php](../app/Services/ViajeCalculationService.php)
  - [app/Services/Nomina/NominaCalculationService.php](../app/Services/Nomina/NominaCalculationService.php)
  - [app/Services/Nomina/CerrarNominaService.php](../app/Services/Nomina/CerrarNominaService.php)
- Modelos:
  - [app/Models/PrecioCosecha.php](../app/Models/PrecioCosecha.php)
  - [app/Models/PromedioLote.php](../app/Models/PromedioLote.php)
  - [app/Models/RegistroCosecha.php](../app/Models/RegistroCosecha.php)
  - [app/Models/NominaCosechaRef.php](../app/Models/NominaCosechaRef.php)
- Docs relacionados:
  - [docs/API_OPERACIONES.md](./API_OPERACIONES.md)
  - [docs/LABORES_JORNALES.md](./LABORES_JORNALES.md)
  - [docs/API_VIAJES.md](./API_VIAJES.md)
