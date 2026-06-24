# Lógica de Precios para Terceros

## Resumen

Cuando un jornal o registro de cosecha pertenece a un **operario de tercero** (no a un colaborador propio), el sistema busca el precio en las tablas de override del tercero antes de caer al precio por defecto del tenant. Esta lógica es **siempre de dos capas**: override del tercero → fallback tenant → NULL o error.

El `tercero_id` nunca lo envía el frontend. El backend lo inyecta automáticamente a partir del `operario_id` en el FormRequest.

---

## Las tres tablas de override

| Tabla | Qué sobreescribe | Key único |
|---|---|---|
| `tercero_labor_precios` | `labores.precio_palma` **y** `labores.tipo_pago` (nullable) | `(tenant_id, tercero_id, labor_id)` |
| `tercero_precios_cosecha` | `precios_cosecha.precio` (por lote+año) | `(tenant_id, tercero_id, lote_id, anio)` |
| `tercero_precio_abono` | Rangos en `precio_abono` (gramos→precio) | índice `(tenant_id, tercero_id)` + validación solapamiento |

> **`tercero_labor_precios.tipo_pago` nullable**: si está poblado (`POR_PALMA` o `JORNAL_FIJO`), reemplaza el modo de pago efectivo para los jornales y cosechas del tercero. Si es `NULL`, hereda `labores.tipo_pago` del tenant. Esto permite que un mismo tercero pague una labor en modo distinto al que el tenant configuró para sus colaboradores propios.

---

## 1. Labores — `JornalCalculationService`

Aplica para labores **POR_PALMA** (plateo, poda, sanidad, custom PALMA) y **JORNAL_FIJO** de cualquier categoría (incluye **labores de FINCA**, que siempre son JORNAL_FIJO por invariante del modelo `Labor`).

### Fallback (`resolverPrecioLabor` + `resolverTipoPago`)

Hay dos resolvers que consultan la misma tabla pero con cometidos distintos:

**Modo de pago (`Labor::resolverTipoPago(?int $terceroId): string`)** — decide POR_PALMA vs JORNAL_FIJO antes de elegir la fórmula:
```
tercero_labor_precios WHERE tercero_id = ? AND labor_id = ? AND estado = true AND tipo_pago IS NOT NULL
   └─ si existe  → usa tipo_pago del override
   └─ si no      → usa labor.tipo_pago del tenant
```

> Override de `tipo_pago` solo aplica a labores **PALMA**. Para FINCA, el resolver siempre devuelve `JORNAL_FIJO` (heredado del tenant) porque `Labor::booted()` fuerza ese invariante. El endpoint `POST /terceros/{t}/labor-precios` rechaza con 422 cualquier override `tipo_pago=POR_PALMA` sobre una labor FINCA.

**Monto (`JornalCalculationService::resolverPrecioLabor()`)** — resuelve el precio una vez decidido el modo:
```
tercero_labor_precios WHERE tercero_id = ? AND labor_id = ? AND estado = true
   └─ si existe  → usa precio_palma del override
   └─ si no      → usa labor.precio_palma del tenant
                       └─ si NULL → valor_total queda NULL (pendiente configurar)
```

El campo `estado` en `tercero_labor_precios` controla si el override está activo. Si se desactiva, el sistema cae automáticamente al precio y modo de pago del tenant **sin eliminar el registro**.

### Código fuente

```php
// JornalCalculationService::resolverPrecioLabor()
if ($terceroId !== null) {
    $override = TerceroLaborPrecio::where('tercero_id', $terceroId)
        ->where('labor_id', $labor->id)
        ->where('estado', true)
        ->value('precio_palma');

    if ($override !== null) {
        return (float) $override;
    }
}

return $labor->precio_palma !== null ? (float) $labor->precio_palma : null;
```

### Comportamiento por tipo de cálculo

| Labor / tipo_pago efectivo | Fórmula | Fuente del precio |
|---|---|---|
| PALMA `POR_PALMA` (PLATEO/PODA/SANIDAD/custom) | `cantidad_palmas × precio` | `resolverPrecioLabor()` |
| PALMA `JORNAL_FIJO` (PLATEO/PODA/SANIDAD/custom) | `precio` (valor plano) | `resolverPrecioLabor()` |
| FINCA (custom, siempre `JORNAL_FIJO`) | `precio` (valor plano) | `resolverPrecioLabor()` |
| `FERTILIZACION` + `POR_PALMA` | `cantidad_palmas × precio_rango` | `calcularFertilizacion()` (ver §3) |

> Para **labores FINCA**, el flujo es idéntico a PALMA en modo JORNAL_FIJO: el resolver consulta `tercero_labor_precios.precio_palma` (si existe override activo del tercero) o cae a `labor.precio_palma` del tenant. Ejemplo: un colaborador cobra "Reparación portón" a $50.000 (precio del tenant) y un operario del Tercero Norte cobra la misma labor a $60.000 (override) — todo decidido por el mismo `resolverPrecioLabor()` según el `tercero_id` que el FormRequest inyecta.

---

## 2. Cosecha — `CosechaCalculationService`

La labor de tipo `COSECHA` tiene dos modos de pago configurados en `labores.tipo_pago`.

### Modo POR_PALMA (default histórico)

El precio se determina por **lote + año**, no por la labor en sí.

```
tercero_precios_cosecha WHERE tercero_id = ? AND lote_id = ? AND anio = ?
   └─ si existe  → usa precio ($/kg)
   └─ si no      → usa precios_cosecha WHERE lote_id = ? AND anio = ?
                       └─ si NULL + hay peso_confirmado → lanza 422 CALC_ERROR
                       └─ si NULL + sin peso_confirmado → valor_total = NULL (se hidrata en PUT)
```

`tercero_precios_cosecha` **no tiene campo `estado`** — si existe el registro, siempre se usa.

```php
// CosechaCalculationService::calcularPorPalma()
if ($terceroId !== null) {
    $precio = TerceroPrecioCosecha::query()
        ->where('tercero_id', $terceroId)
        ->where('lote_id', $loteId)
        ->where('anio', $anio)
        ->value('precio');
}

if ($precio === null) {
    $precio = PrecioCosecha::query()
        ->where('lote_id', $loteId)
        ->where('anio', $anio)
        ->value('precio');
}
```

**Fórmula:** `valor_total = peso_confirmado × precio`

La distribución en cuadrilla es siempre equitativa: `valor_por_empleado = valor_total / count(cuadrilla)`.

### Modo JORNAL_FIJO (opt-in del admin)

El cálculo es un valor plano, no depende del peso. Usa `resolverPrecioLabor` (mismo flujo que labores normales):

```
tercero_labor_precios WHERE tercero_id = ? AND labor_id = [labor_cosecha.id] AND estado = true
   └─ si existe  → usa precio_palma del override
   └─ si no      → usa labor.precio_palma del tenant
                       └─ si NULL → lanza InvalidArgumentException (config obligatoria)
```

El peso, si llega, se persiste como dato agronómico pero no afecta el cálculo.

---

## 3. Fertilización — `JornalCalculationService::calcularFertilizacion`

La fertilización usa rangos de gramos por palma en lugar de un precio fijo.

```
tercero_precio_abono WHERE tercero_id = ? AND gramos_min <= G AND gramos_max >= G AND estado = true
   └─ si existe  → usa precio_palma del rango del tercero
   └─ si no      → usa precio_abono tenant (mismo criterio de rango)
                       └─ si no hay rango → lanza 422 (no silenciosa, es error de config)
```

El campo `estado` también existe en `tercero_precio_abono`. Rangos inactivos se ignoran.

**Fórmula:** `valor_total = cantidad_palmas × precio_rango`

### Validación de solapamiento de rangos

Al crear o editar un rango en `tercero_precio_abono`, el controller verifica que no se cruce con rangos activos del **mismo tercero** (no del tenant global). La validación cubre tres casos de solapamiento:

```php
$q->whereBetween('gramos_min', [$data['gramos_min'], $data['gramos_max']])
  ->orWhereBetween('gramos_max', [$data['gramos_min'], $data['gramos_max']])
  ->orWhere(function ($q2) use ($data) {
      $q2->where('gramos_min', '<=', $data['gramos_min'])
         ->where('gramos_max', '>=', $data['gramos_max']);
  });
```

Si hay solapamiento → `409 RANGO_SOLAPADO`.

---

## 4. Cómo fluye el `tercero_id`

```
Frontend envía:                  Backend procesa:
  { "operario_id": 5, ... }  →  StoreJornalRequest::withValidator()
                                  $operario = Operario::find(5)
                                  $this->merge(['tercero_id' => $operario->tercero_id])
                                  ↓
                               JornalController pasa $terceroId al service
                                  ↓
                               JornalCalculationService::calcular($labor, $data, $terceroId=2)
```

El mismo flujo aplica para `StoreRegistroCosechaRequest` — cada miembro de cuadrilla con `operario_id` recibe su `tercero_id` inyectado.

---

## 5. Gestión de precios vía API

Todos los endpoints viven bajo `GET /api/v1/tenant/terceros/{tercero}/...` con permiso `configuracion.editar`.

### Wizard de creación (sin tercero_id)

`GET /terceros/wizard-init` devuelve el contexto para los pasos 2 y 3 del wizard de creación, **antes de que exista el tercero**. No requiere `{tercero}` en la URL.

```json
{
  "data": {
    "labores_contexto": [
      { "id": 1, "nombre": "Plateo",            "categoria": "PALMA", "tipo": "PLATEO",  "tipo_pago": "POR_PALMA",   "precio_palma": "50.00",    "es_sistema": true  },
      { "id": 3, "nombre": "Sanidad",           "categoria": "PALMA", "tipo": "SANIDAD", "tipo_pago": "JORNAL_FIJO", "precio_palma": "80000.00", "es_sistema": true  },
      { "id": 7, "nombre": "Reparación portón", "categoria": "FINCA", "tipo": null,      "tipo_pago": "JORNAL_FIJO", "precio_palma": "50000.00", "es_sistema": false }
    ],
    "lotes_contexto":           [{ "id": 1, "nombre": "Lote 1", "sublotes": [{ "id": 1, "nombre": "Sublote A" }] }],
    "precios_abono_referencia": [{ "gramos_min": "0.00", "gramos_max": "150.00", "precio_palma": "50.00" }],
    "anio_actual":              2026,
    "eps":                      [{ "id": 1, "nombre": "Sura" }],
    "arl":                      [{ "id": 1, "nombre": "Positiva" }]
  }
}
```

`labores_contexto` incluye **PALMA y FINCA** activas, excluyendo solo COSECHA y FERTILIZACION (esas tienen flujos dedicados: `precios-cosecha` y `precios-abono`). Cada item trae `categoria` para que el frontend agrupe en sub-secciones. `lotes_contexto` incluye sublotes eager-loaded. `precios_abono_referencia` son las escalas del tenant como referencia visual para el admin. `eps` y `arl` alimentan los dropdowns del paso 3 (Operarios); el frontend envía solo el `nombre` al guardar cada operario.

### Pantalla de configuración (con tercero existente)

`GET /terceros/{tercero}/configuracion/init` devuelve un bundle completo:

```json
{
  "data": {
    "tercero": { ... },
    "labor_precios": [
      { "id": 1, "labor_id": 3, "tipo_pago": "POR_PALMA", "precio_palma": "60.00",    "estado": true },
      { "id": 2, "labor_id": 7, "tipo_pago": null,        "precio_palma": "60000.00", "estado": true }
    ],
    "precios_cosecha": [{ "id": 1, "lote_id": 2, "anio": 2024, "precio": "180.00" }],
    "precios_abono":   [{ "id": 1, "gramos_min": "0.00", "gramos_max": "150.00", "precio_palma": "55.00", "estado": true }],
    "labores_contexto": [
      { "id": 3, "nombre": "Sanidad",           "categoria": "PALMA", "tipo": "SANIDAD", "tipo_pago": "JORNAL_FIJO", "precio_palma": "80000.00" },
      { "id": 7, "nombre": "Reparación portón", "categoria": "FINCA", "tipo": null,      "tipo_pago": "JORNAL_FIJO", "precio_palma": "50000.00" }
    ],
    "lotes_contexto": [{ "id": 1, "nombre": "Lote 1", "sublotes": [{ "id": 1, "nombre": "Sublote A" }] }],
    "eps": [{ "id": 1, "nombre": "Sura" }],
    "arl": [{ "id": 1, "nombre": "Positiva" }]
  }
}
```

`labores_contexto` excluye solo COSECHA (esta vista sí incluye FERTILIZACION, a diferencia del wizard de creación). `labor_precios` lista los overrides existentes del tercero: el campo `tipo_pago` puede ser `POR_PALMA`/`JORNAL_FIJO` (override explícito del modo) o `null` (solo override de monto, hereda el modo del catálogo del tenant). `lotes_contexto` incluye sublotes eager-loaded. `eps` y `arl` alimentan los dropdowns de la sección Operarios en pantalla de edición.

### Endpoints de escritura

| Operación | Endpoint | Comportamiento |
|---|---|---|
| Override de labor | `POST /terceros/{t}/labor-precios` | `updateOrCreate` — upsert por `(tenant_id, tercero_id, labor_id)` |
| Eliminar override labor | `DELETE /terceros/{t}/labor-precios/{precio}` | Elimina — vuelve al precio del tenant |
| Override de cosecha | `POST /terceros/{t}/precios-cosecha` | `updateOrCreate` — upsert por `(tenant_id, tercero_id, lote_id, anio)`; `anio` es opcional (default: año actual) |
| Eliminar override cosecha | `DELETE /terceros/{t}/precios-cosecha/{precio}` | Elimina — vuelve al precio del tenant |
| Crear rango abono | `POST /terceros/{t}/precios-abono` | `create` — valida solapamiento antes |
| Editar rango abono | `PUT /terceros/{t}/precios-abono/{precio}` | `update` — revalida solapamiento excluyendo el registro actual |
| Eliminar rango abono | `DELETE /terceros/{t}/precios-abono/{precio}` | Elimina el rango |

---

## 6. Diferencias de comportamiento vs colaboradores

| Aspecto | Colaborador (empleado) | Operario (tercero) |
|---|---|---|
| Precio por defecto | `labor.precio_palma` del tenant | Mismo — es el fallback final |
| Override disponible | No | Sí — `tercero_labor_precios` (PALMA + FINCA) |
| Override de tipo_pago | No aplica | Sí — solo para labores PALMA (FINCA siempre es JORNAL_FIJO) |
| Precio cosecha | `precios_cosecha` (lote+año) tenant | `tercero_precios_cosecha` → fallback tenant |
| Precio fertilización | `precio_abono` (rango gramos) tenant | `tercero_precio_abono` → fallback tenant |
| Precio labores FINCA | `labor.precio_palma` (JORNAL_FIJO) | `tercero_labor_precios.precio_palma` → fallback `labor.precio_palma` |
| valor_total = NULL | Silencioso — jornal en "limbo" | Igual — silencioso para labores; error para cosecha con peso |
| `tercero_id` en jornales | NULL | Inyectado automáticamente |

**Caso de uso típico FINCA:** La labor "Reparación portón" en el catálogo del tenant paga $50.000 plano (`labor.tipo_pago = JORNAL_FIJO`, `labor.precio_palma = 50000`). Cuando el admin contrata un tercero que cobra más por la misma labor, registra el override:

```bash
POST /terceros/1/labor-precios
{ "labor_id": 7, "precio_palma": 60000 }   # sin tipo_pago — FINCA siempre es JORNAL_FIJO
```

A partir de ese momento:
- Jornal de colaborador propio + Reparación portón → `valor_total = 50000` (precio del tenant).
- Jornal de operario del tercero 1 + Reparación portón → `valor_total = 60000` (override).
- Jornal de operario de otro tercero sin override → `valor_total = 50000` (fallback al tenant).

---

## 7. Resumen visual del fallback

```
Jornal/Cosecha de operario
        │
        ▼
┌───────────────────────────────────────────────┐
│  ¿Hay override en tercero_labor_precios?       │  ← labores y cosecha JORNAL_FIJO
│  WHERE tercero_id=X AND labor_id=Y AND estado  │
└───────────────────┬───────────────────────────┘
      SÍ ──────────►│◄────────── NO
       │            ▼            │
       │  labor.precio_palma (tenant)
       │            │
       │            └── NULL → valor_total = NULL (silencioso)
       │
┌───────────────────────────────────────────────┐
│  ¿Hay precio en tercero_precios_cosecha?       │  ← cosecha POR_PALMA
│  WHERE tercero_id=X AND lote_id=Y AND anio=Z  │
└───────────────────┬───────────────────────────┘
      SÍ ──────────►│◄────────── NO
       │            ▼            │
       │  precios_cosecha tenant (lote+año)
       │            │
       │            └── NULL + peso → 422 CALC_ERROR
       │
┌───────────────────────────────────────────────┐
│  ¿Hay rango en tercero_precio_abono?           │  ← fertilización POR_PALMA
│  WHERE tercero_id=X AND min<=G<=max AND estado │
└───────────────────┬───────────────────────────┘
      SÍ ──────────►│◄────────── NO
                    ▼
          precio_abono tenant (mismo rango)
                    │
                    └── sin rango → 422 (error de configuración)
```
