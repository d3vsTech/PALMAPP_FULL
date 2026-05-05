# Decisión: Tabla `precios_palma`

> Explica por qué existe la tabla `precios_palma` y cuál es su rol dentro del rediseño de Jornales (Migración 13).

---

## Contexto previo

Antes del rediseño, la tabla `labores` era un catálogo mixto que cubría **todo lo que un empleado podía hacer** (plateo, poda, fertilización, reparaciones, etc.) con un discriminador `tipo_pago` de tres valores:

- `JORNAL_FIJO` → valor diario (`valor_base`)
- `POR_PALMA_SIMPLE` → precio fijo por palma (`valor_base`)
- `POR_PALMA_INSUMO` → precio por palma buscado en `precio_abono` según gramos aplicados

Esa estructura asumía que cada tarjeta del wizard elegía "una labor de un catálogo". El rediseño cambió esa premisa: las **6 Labores de Palma son fijas** (COSECHA, PLATEO, PODA, FERTILIZACION, SANIDAD, OTROS) y viven como `tipo` dentro de `jornales`, no como filas de un catálogo. El catálogo `labores` ahora sirve **exclusivamente** a Labores de Finca (arreglos, mantenimiento, etc.).

Eso dejó a PLATEO y PODA sin dónde guardar su precio por palma.

---

## Por qué una tabla nueva

PLATEO y PODA necesitan un **precio por palma configurable por tenant**, pero distinto a los mecanismos existentes:

| Mecanismo        | Por qué no encajaba                                                                 |
|------------------|--------------------------------------------------------------------------------------|
| `labores.valor_base` | `labores` pasó a ser catálogo de Finca; meter precios de Palma ahí mezcla los dos mundos que precisamente separamos. |
| `precio_abono`   | Usa rangos `gramos_min/gramos_max`. PLATEO/PODA no dependen de gramos — son precio plano por palma. Forzar un único rango ficticio por tipo sería un hack. |
| `tenant_config` (JSON) | Requiere un solo punto de edición por tenant y no se presta a un CRUD estándar para el admin. |

La decisión fue crear una tabla dedicada: **un registro por `(tenant, tipo)` con un `precio_palma` plano**.

---

## Esquema

```
precios_palma:
  id, tenant_id,
  tipo ENUM('PLATEO','PODA','SANIDAD','OTROS'),
  precio_palma decimal(12,2) NULL,
  estado boolean,
  timestamps
  UNIQUE (tenant_id, tipo)
```

Modelo: [app/Models/PrecioPalma.php](../app/Models/PrecioPalma.php).

---

## Por qué SANIDAD y OTROS también están aquí (con `precio_palma` nullable)

El usuario pidió dejar "oculto o planteado" el precio de SANIDAD/OTROS: el supervisor registra la estructura (lote, sublote, descripción, colaborador) **hoy**, pero no se factura al empleado todavía. Cuando el negocio decida cobrarlas, solo hay que hacer `UPDATE precios_palma SET precio_palma = X WHERE tipo = 'SANIDAD'` y el cálculo se enciende automáticamente — **sin cambio de esquema ni migraciones**.

Por eso `precio_palma` es nullable:

- `NULL` → el `JornalCalculationService` guarda `valor_total = NULL`. La estructura queda.
- Valor seteado → calcula `cantidad_palmas × precio_palma` igual que PLATEO/PODA.

COSECHA y FERTILIZACION **no** están aquí porque ya tienen sus propios mecanismos (`precios_cosecha` y `precio_abono`).

---

## Resumen de precios por tipo de Labor de Palma

| Tipo          | Resuelve precio en   | Criterio                                          |
|---------------|----------------------|---------------------------------------------------|
| COSECHA       | `precios_cosecha`    | Por `lote_id` + año                               |
| PLATEO        | `precios_palma`      | `(tenant_id, tipo='PLATEO')`                      |
| PODA          | `precios_palma`      | `(tenant_id, tipo='PODA')`                        |
| FERTILIZACION | `precio_abono`       | Rango de `gramos_por_palma`                       |
| SANIDAD       | `precios_palma`      | `(tenant_id, tipo='SANIDAD')` — `precio_palma` puede ser NULL |
| OTROS         | `precios_palma`      | `(tenant_id, tipo='OTROS')` — `precio_palma` puede ser NULL   |

---

## Referencias

- Migración 13 — rediseño Operación → Planilla del Día: ver [CONTEXTO.md §5.1](../CONTEXTO.md).
- Lógica de cálculo: [docs/LABORES_JORNALES.md §4.3](./LABORES_JORNALES.md).
- Modelo: [app/Models/PrecioPalma.php](../app/Models/PrecioPalma.php).
- Servicio que consume la tabla: [app/Services/JornalCalculationService.php](../app/Services/JornalCalculationService.php).
