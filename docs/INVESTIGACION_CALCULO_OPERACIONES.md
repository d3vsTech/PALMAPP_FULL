# Investigación: cómo se calculan Cosecha, Labores de Palma y Labores de Finca

> Análisis profundo del flujo de cálculo de dinero en el módulo de Operaciones (Planilla del Día). Cubre qué tabla resuelve qué precio, cuándo se hidrata cada valor y cómo conecta con Nómina.

El sistema tiene **tres servicios** orquestando el cálculo del dinero que gana cada empleado, y cada uno consume **una tabla de precios distinta**. La clave está en entender qué tabla resuelve qué precio y **cuándo se "hidrata" el valor**.

---

## 1. Las tres tablas de precios

| Tabla | Llave de búsqueda | Quién la consume | Ubicación |
|---|---|---|---|
| `precio_cosecha` | `(lote_id, anio)` | `CosechaCalculationService` | [app/Models/PrecioCosecha.php:13](../app/Models/PrecioCosecha.php#L13) |
| `precios_palma` | `(tenant_id, tipo)` | `JornalCalculationService` | [app/Models/PrecioPalma.php:19](../app/Models/PrecioPalma.php#L19) |
| `precio_abono` | rango `gramos_min..gramos_max` | `JornalCalculationService` (solo FERTILIZACION) | — |
| `labores.valor_base` | `labor_id` | `JornalCalculationService::calcularFinca` | [docs/LABORES_JORNALES.md:42](./LABORES_JORNALES.md#L42) |

Y una tabla **informativa**, no participa en dinero:

| Tabla | Para qué sirve |
|---|---|
| `promedio_lote` | Snapshot histórico de kg/gajo por `(lote, año)`. Se guarda en `registro_cosecha.promedio_kg_gajo` para reportes, **pero nunca multiplica dinero**. [CONTEXTO.md:394](../CONTEXTO.md#L394) lo dice explícito: *"no participa en la fórmula del dinero"*. |

---

## 2. Cosecha (sigue su propio carril)

**Vive aparte de `jornales`** en `registro_cosecha` + `cosecha_cuadrilla` porque es labor de cuadrilla (varios empleados sobre el mismo sublote). Esto está descrito en [docs/LABORES_JORNALES.md:18](./LABORES_JORNALES.md#L18) y [CONTEXTO.md:309](../CONTEXTO.md#L309).

### 2.1 Cómo entra el precio

[app/Services/CosechaCalculationService.php:23-50](../app/Services/CosechaCalculationService.php#L23-L50) hace dos lookups en paralelo al crear/editar:

```
precio   = SELECT precio   FROM precio_cosecha WHERE lote_id=? AND anio=?
promedio = SELECT promedio FROM promedio_lote  WHERE lote_id=? AND anio=?
```

- **`precio`** entra a `valor_total = peso_confirmado × precio`.
- **`promedio`** se copia tal cual a `registro_cosecha.promedio_kg_gajo` como *snapshot* histórico, **no se usa para calcular dinero**. Es ornamental.

### 2.2 Las dos ramas del cálculo (con peso vs. sin peso)

| Caso | `peso_confirmado` | `precio_cosecha` en DB | `valor_total` | Cuadrilla |
|---|---|---|---|---|
| A — solo gajos | NULL | NULL | NULL | `valor_calculado=NULL` por empleado |
| B — gajos + kilos | número | obligado a existir | `peso × precio` | `valor_total/N` (partes iguales) |

Si en el caso B **no existe** registro en `precios_cosecha` para `(lote, año)`, el servicio lanza `InvalidArgumentException` y el controller devuelve **422 `CALC_ERROR`** ([app/Services/CosechaCalculationService.php:35-39](../app/Services/CosechaCalculationService.php#L35-L39), [docs/API_OPERACIONES.md:36](./API_OPERACIONES.md#L36)).

### 2.3 Hidratación posterior (el caso interesante)

La tarjeta de cosecha se crea en campo **antes de pesar** (caso A). Cuando llega el camión a báscula, hay dos rutas para llenar el peso:

1. **Manual:** `PUT /cosechas/{id}` con `peso_confirmado`. [app/Http/Controllers/Api/RegistroCosechaController.php:109-180](../app/Http/Controllers/Api/RegistroCosechaController.php#L109-L180) detecta el cambio y:
   - Si `precio_cosecha` ya está snapshotteado en la fila → multiplica y redistribuye.
   - Si era NULL (porque la cosecha se creó solo con gajos) → re-consulta `precios_cosecha` por primera vez y graba el snapshot ([RegistroCosechaController.php:120-126](../app/Http/Controllers/Api/RegistroCosechaController.php#L120-L126)).
   - Si llega `cuadrilla` en el PUT, se borra y recrea; si no, se hace UPDATE in-place sobre las filas existentes.

2. **Vía Viaje:** [app/Services/ViajeCalculationService.php:17-38](../app/Services/ViajeCalculationService.php#L17-L38) actualiza `promedio_kg_gajo` (solo snapshot, no dinero) cuando un viaje HOMOGENEO se finaliza. **No toca `valor_total`** — la actualización del peso/dinero en cosecha pasa por el PUT del controller, no por el cierre del viaje.

> Detalle importante: el snapshot del precio (`precio_cosecha` en `registro_cosecha`) **se preserva entre ediciones**. Solo se sobreescribe si era NULL y llega peso por primera vez. Esto blinda el histórico si el admin cambia la tarifa anual a media campaña.

---

## 3. Labores de Palma (5 de las 6 caen aquí; COSECHA es el caso aparte)

Todas viven en `jornales` con `categoria='PALMA'` y discriminador `tipo`. El servicio único es [app/Services/JornalCalculationService.php:27-46](../app/Services/JornalCalculationService.php#L27-L46), que despacha por `match($tipo)`:

| `tipo` | Resuelve precio en | Fórmula | Comportamiento si no hay precio |
|---|---|---|---|
| `PLATEO` | `precios_palma` `(tenant, 'PLATEO', estado=true)` | `cantidad_palmas × precio_palma` | **422 `CALC_ERROR`** ([JornalCalculationService.php:78-82](../app/Services/JornalCalculationService.php#L78-L82)) |
| `PODA` | igual que PLATEO | igual | igual |
| `FERTILIZACION` | `precio_abono` por **rango de gramos** | `cantidad_palmas × precio_palma_del_rango` + snapshot en `precio_insumo_snapshot` | **422 `CALC_ERROR`** si no hay rango que cubra los gramos |
| `SANIDAD` | `precios_palma` `(tenant, 'SANIDAD')` | **`valor_total = precio_palma`** (plano, sin multiplicar) | **`valor_total = NULL`** (no rompe, queda pendiente) |
| `OTROS` | `precios_palma` `(tenant, 'OTROS')` | igual que SANIDAD | igual que SANIDAD |

### 3.1 Por qué SANIDAD/OTROS son raros

Dos cosas únicas (documentadas en [docs/PRECIOS_PALMA.md:51-58](./PRECIOS_PALMA.md#L51-L58)):

1. **No usan `cantidad_palmas`** — son monto plano por jornal. Si llega `cantidad_palmas` en el payload, el FormRequest rebota con 422.
2. **`precio_palma` puede ser NULL** — y entonces `valor_total` queda NULL. El servicio retorna NULL en lugar de lanzar excepción ([JornalCalculationService.php:130-151](../app/Services/JornalCalculationService.php#L130-L151)). Esto permite que el supervisor registre la **estructura** del trabajo (lote, descripción, colaborador) hoy aunque la finca aún no decida cobrarlo. El día que se decide cobrar, basta con `UPDATE precios_palma SET precio_palma=X WHERE tipo='SANIDAD'` y los jornales **nuevos** salen calculados — los viejos quedan con NULL salvo recálculo.

### 3.2 Por qué se creó `precios_palma` y no se reutilizó algo

[docs/PRECIOS_PALMA.md:25-29](./PRECIOS_PALMA.md#L25-L29) explica el descarte de las 3 alternativas:

- `labores.valor_base` → quedó reservado a Labores de **Finca** post-Migración 13; mezclar precios de Palma ahí volvía a unir lo que se separó.
- `precio_abono` → su llave es por gramos, no aplica a PLATEO/PODA que son precio plano por palma.
- `tenant_config` (JSON) → no se presta a CRUD admin estándar.

---

## 4. Labores de Finca (el caso más simple)

`categoria='FINCA'`, el discriminador es `labor_id` (FK a `labores`). El catálogo `labores` quedó **exclusivamente** para Finca después de la Migración 13 ([CONTEXTO.md:179](../CONTEXTO.md#L179)).

[app/Services/JornalCalculationService.php:51-60](../app/Services/JornalCalculationService.php#L51-L60):

```
valor_unitario = labor.valor_base
valor_total    = labor.valor_base
```

Sin multiplicación, sin condiciones, sin NULLs. Es un precio fijo por jornal. Si cambia el `valor_base` de la labor después de creado el jornal, el jornal **no se recalcula** salvo que se haga PUT.

---

## 5. Tabla de resumen — quién paga qué

| Operación UI | Tabla destino | Servicio | Precio sale de | ¿Puede quedar `valor_total=NULL`? |
|---|---|---|---|---|
| Tab Cosecha | `registro_cosecha` + `cosecha_cuadrilla` | `CosechaCalculationService` | `precio_cosecha` | Sí, cuando no se envía `peso_confirmado` |
| Tab Plateo | `jornales` (PALMA/PLATEO) | `JornalCalculationService::calcularPalma` | `precios_palma.PLATEO` | No — falta de precio = 422 |
| Tab Poda | `jornales` (PALMA/PODA) | igual | `precios_palma.PODA` | No |
| Tab Fertilización | `jornales` (PALMA/FERTILIZACION) | igual | `precio_abono` por rango | No |
| Tab Sanidad | `jornales` (PALMA/SANIDAD) | igual | `precios_palma.SANIDAD` (nullable) | **Sí**, por diseño |
| Tab Otros | `jornales` (PALMA/OTROS) | igual | `precios_palma.OTROS` (nullable) | **Sí**, por diseño |
| Labores de Finca | `jornales` (FINCA) | `JornalCalculationService::calcularFinca` | `labores.valor_base` | No |

---

## 6. Conexión con Nómina (cierra el ciclo)

[CONTEXTO.md:313-320](../CONTEXTO.md#L313-L320) y [docs/LABORES_JORNALES.md:231-243](./LABORES_JORNALES.md#L231-L243):

- **Empleados FIJO:** los jornales son solo **tracking**. Su sueldo en nómina = `salario_base`, no depende del `valor_total`.
- **Empleados PRODUCCION:** su sueldo = `SUM(jornales.valor_total) + SUM(cosecha_cuadrilla.valor_calculado)` del rango de la nómina, **excluyendo NULLs**. Por eso SANIDAD/OTROS con precio NULL no contaminan la nómina — simplemente no aportan hasta que se les configure precio.

La query agregadora filtra explícitamente `j.valor_total IS NOT NULL`, lo cual hace que el diseño "estructura sin precio" de SANIDAD/OTROS funcione sin tocar nada en el módulo de Nómina.

---

## 7. Rol final de `PromedioLote`

A pesar de aparecer en el flujo, su rol es **menor**:

1. `CosechaCalculationService` lo lee y lo escribe como `promedio_kg_gajo` en la fila de cosecha.
2. `ViajeCalculationService::calcularAlFinalizar` lo **recalcula y sobreescribe** en cosechas cuando el viaje es HOMOGENEO (peso real del viaje / gajos totales del viaje).
3. **No multiplica dinero en ningún lado** — es un dato analítico que vive en la cosecha para reportes y para alimentar reglas del módulo Viajes (HOMOGENEO vs NO_HOMOGENEO).

Si mañana se borrara `promedio_lote`, el cálculo de la plata no se rompería; solo se perdería el snapshot histórico.

---

## 8. TL;DR del flujo

```
Cosecha       → precio_cosecha (por lote/año)  → valor_total = peso × precio        → /N a cuadrilla
PLATEO/PODA   → precios_palma (por tipo)       → valor_total = palmas × precio
FERTILIZ.     → precio_abono (por gramos)      → valor_total = palmas × precio_rango
SANIDAD/OTROS → precios_palma (nullable)       → valor_total = precio (plano, o NULL)
FINCA         → labores.valor_base             → valor_total = valor_base
```

El único punto donde el cálculo es **diferido** es Cosecha (espera el peso de báscula). Todos los demás se resuelven en el `POST /operaciones/{id}/jornales` o devuelven 422 si falta config — excepto SANIDAD/OTROS, que tienen permiso explícito de quedar en NULL.

---

## 9. Referencias cruzadas

- Servicios:
  - [app/Services/CosechaCalculationService.php](../app/Services/CosechaCalculationService.php)
  - [app/Services/JornalCalculationService.php](../app/Services/JornalCalculationService.php)
  - [app/Services/ViajeCalculationService.php](../app/Services/ViajeCalculationService.php)
- Modelos:
  - [app/Models/PrecioCosecha.php](../app/Models/PrecioCosecha.php)
  - [app/Models/PrecioPalma.php](../app/Models/PrecioPalma.php)
  - [app/Models/PromedioLote.php](../app/Models/PromedioLote.php)
  - [app/Models/RegistroCosecha.php](../app/Models/RegistroCosecha.php)
- Docs relacionados:
  - [docs/API_OPERACIONES.md](./API_OPERACIONES.md)
  - [docs/LABORES_JORNALES.md](./LABORES_JORNALES.md)
  - [docs/PRECIOS_PALMA.md](./PRECIOS_PALMA.md)
  - [CONTEXTO.md §5.1 (Migración 13)](../CONTEXTO.md), [§6.5 (Cosecha y Viajes)](../CONTEXTO.md), [§6.6 (Nómina)](../CONTEXTO.md)
