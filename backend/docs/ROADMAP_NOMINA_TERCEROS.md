# Hoja de ruta — Nómina (Colaboradores + Terceros)

> Operativiza [PLAN_NOMINA_TERCEROS.md](PLAN_NOMINA_TERCEROS.md) en PRs secuenciales con criterios de aceptación. **Alcance: módulo de Nómina completo** — la integración de terceros toca también el flujo actual de colaboradores propios. El wizard frontend mantiene sus 4 pasos (elegir período → elegir colaboradores → validar cosecha → confirmar); el paso "Confirmación" dispara toda la persistencia backend, y la pantalla dedicada de "Liquidación de Terceros" (PR-4) queda como flujo post-wizard. Varios endpoints cambian su payload; indicadores se rediseñan. Cada PR es un commit-set acotado y mergeable. **Ningún PR rompe la liquidación de un empleado existente.**

---

## Estado de partida (2026-06-25)

✅ **Hecho:** las 6 migraciones de BD están creadas pero **no aplicadas** (`database/migrations/2026_06_25_00000{2..7}_*.php`).

❌ **Pendiente:** todo el código aplicativo, ajustes al wizard de colaboradores, ajustes al cierre, indicadores rediseñados, frontend y documentación.

## Estado actual (2026-06-30) — PR-2 extendido con nueva arquitectura de promedios

✅ **PR-1 LISTO para merge.** Migraciones aplicadas en dev. Pendiente correr en staging.

✅ **PR-2 LISTO para merge — EXTENDIDO.** Además del scope original (ValidarCosecha), se implementó la nueva arquitectura de promedio efectivo por nómina:
- Nueva migración `nomina_promedio_lote` (aplicada).
- `promedio_lote` es ahora **read-only** — solo `ViajeCalculationService` escribe en ella.
- `ValidarCosechaService` reescrito: `bundle()` devuelve detalle por cosecha por colaborador + `promedios_por_lote[]`. `ajustarPromedio()` escribe en `nomina_promedio_lote`.
- `NominaCalculationService` y `CerrarNominaService` usan `nomina_promedio_lote` con prioridad.
- `API_NOMINA.md §4` actualizado con los nuevos formatos.

✅ **PR-3 LISTO para merge.** Liquidar operarios implementado: ramificación en `NominaCalculationService` (5 métodos nuevos), `preview()` del controller ramificado, `withValidator` en `LiquidarEmpleadoRequest`, snapshots en `CerrarNominaService`. `API_NOMINA.md` §5 y §8 actualizados.

✅ **PR-3.5 LISTO para merge.** Cierre del gap de persistencia del paso "Confirmación" del wizard: fachada `POST /nominas/{id}/terceros`, pre-hidratación de `nomina_tercero` / `nomina_tercero_operario` con totales 0, `DELETE /nominas/{id}/terceros/{tercero}` en cascada, `GET /nominas/{id}/paso-4-checklist` para diagnóstico del frontend. Documentación en `API_NOMINA.md §3.4/3.5/3.6/3.7`.

✅ **PR-4 LISTO para merge.** Pantalla "Liquidación de Terceros" (acta agrupada + PDF + cierre): `LiquidarTerceroService`, `RegistrarPagoTerceroService`, `ActaTerceroPdfService` con blade `acta_tercero.blade.php`, `NominaTerceroController` con 6 endpoints (resumen, detalle, liquidar, ajustar línea, registrar-pago, PDF), 3 FormRequests, permiso `nomina.pagar-tercero`. `CerrarNominaService` valida ahora que cada contratista con operarios tenga su acta liquidada (409 `NOMINA_TERCERO_NO_LIQUIDADO`). Excepción documentada: `registrar-pago` sigue habilitado post-cierre. Documentación en `API_NOMINA.md §7` (nueva) + renumeración §7→§8/…/§13→§14.

✅ **PR-4.2 LISTO para merge.** Vista solo-lectura + descuentos múltiples por operario: nueva tabla `nomina_tercero_operario_descuento` (N descuentos con concepto por línea), 3 endpoints nuevos (`GET /detalle`, `POST /descuentos`, `DELETE /descuentos/{id}`), `PUT /operarios/{op}` eliminado, fórmula `subtotal = total_jornales + total_cosecha − SUM(descuentos)`, fix bug doble-conteo cosecha en `recalcularTotalesActa()`. PDF actualizado con columnas Jornales/Cosecha y filas de descuentos. Breaking change coordinado con frontend. Documentación en `API_NOMINA.md §7`.

✅ **PR-5 LISTO para merge.** Indicadores rediseñados: `GET /nominas/indicadores` extendido con 4 cards (`total_colaboradores`, `total_terceros`, `neto_pagar`, `pendiente_pagar`) y filtros combinables `?anio`/`?mes`/`?estado`. Queries agregadas con `SUM(CASE WHEN…)` — sin N+1. `total_devengado` marcado como **deprecated** pero se mantiene por compat con el frontend legado. `pendiente_pagar` filtra `total_a_transferir > 0` para excluir las actas pre-hidratadas de PR-3.5. Response incluye `meta.filtros` con el eco de los filtros aplicados. Documentación en `API_NOMINA.md §2.3` + ejemplo cURL en §12.

✅ **PR-7 planificado:** Módulo de Préstamos / Adelantos (ver PR-7 abajo).

⏸️ **Fuera de alcance** (se planifican cuando llegue info del usuario):
- Planilla Diaria impresible

---

## Cambios al flujo legado de Nómina

Resumen de **qué cambia para colaboradores propios** (aparte de añadir terceros). Cada cambio aparece detallado en el PR que lo entrega.

### Wizard frontend (4 pasos, sin cambio en el número)

```
Wizard (frontend, siempre 4 pasos)          Post-wizard (pantallas separadas)
────────────────────────────────────        ─────────────────────────────────
1. Elegir período (solo UI)                 · Liquidar colaborador (empleado u operario)
2. Elegir colaboradores (solo UI)           · Liquidación de Terceros (acta agrupada, PR-4)
   ↳ empleados + operarios en un solo       · Cerrar nómina + desprendible + acta PDF
     wizard, con badges Colaborador/Tercero
3. Validar Cosecha (solo UI)
4. Confirmación → "Crear Período de Pago"
   ↳ dispara toda la persistencia backend
     (crear + agregar + promedios + validar)
```

> El wizard mantiene 4 pasos — la integración de terceros no cambia el número. Lo que cambia es que el paso 4 ("Confirmación") ejecuta el bundle de llamadas backend (secuencia obligatoria en `API_NOMINA.md §3.7`), y post-wizard se agregan la pantalla "Liquidación de Terceros" (PR-4) y el flujo de cierre.

### Endpoints existentes que cambian

| Endpoint | Cambio | PR |
|---|---|---|
| `GET /nominas/{id}/empleados-disponibles` | Respuesta pasa de `{ data: [empleados] }` a `{ data: { empleados: [], operarios: [] } }` agrupado. Acepta `?tercero_id=N` para filtrar bloque operarios. | PR-3 |
| `POST /nominas/{id}/empleados` | Body acepta `operario_ids: []` además de `empleado_ids: []`. Crea `nomina_empleado` con XOR (uno u otro). | PR-3 |
| `DELETE /nomina-empleado/{id}` | Sigue funcionando igual; ahora también admite filas con `operario_id`. | PR-3 |
| `GET /nomina-empleado/{id}/preview` | Si la fila es de operario, devuelve estructura sin `conceptos_legales`, sin `subsidio_transporte` y sin `dias_ausencia_*`. Campo `salario_tipo: null` en respuesta. | PR-3 |
| `POST /nomina-empleado/{id}/liquidar` | Para operarios, el body **no acepta** `bonificaciones`/`deducciones_voluntarias` (422 si llegan). Solo `dias_trabajados` opcional. | PR-3 |
| `POST /nominas/{id}/cerrar` | Valida que cada tercero presente en la nómina tenga su `nomina_tercero` liquidado (`PENDIENTE` permitido, ausente = error). Snapshotea jornales/cosechas por `operario_id` cuando aplique. | PR-4 |
| `GET /nominas/indicadores` | Reemplaza `total_devengado` por 4 cards: `total_colaboradores`, `total_terceros`, `neto_pagar`, `pendiente_pagar`. Mantiene `total_periodos`, `borradores`, `cerradas`. | PR-5 |

### Cambios en errores documentados

Códigos nuevos a registrar en [API_NOMINA.md §0](API_NOMINA.md#0-base-y-autenticación):

| Código | HTTP | Cuándo |
|---|---|---|
| `TERCERO_LABOR_SIN_PRECIO` | 422 | El operario reportó una labor sin precio en `tercero_labor_precios`. |
| `OPERARIO_NO_PERTENECE_A_TERCERO` | 422 | `operario_ids[]` incluye un operario cuyo `tercero_id` no está en `tercero_ids[]`. |
| `OPERARIO_LIQUIDADO_EN_TERCERO` | 409 | Intento de quitar un operario cuyo `nomina_tercero` ya está liquidado. |
| `TERCERO_SIN_DATOS_BANCARIOS` | 422 | `metodo_pago=TRANSFERENCIA` sin `banco`/`numero_cuenta`/etc. |
| `NOMINA_VALIDACION_COSECHA_REQUERIDA` | 409 | Intento de cerrar nómina sin haber confirmado el paso 3. |
| `NOMINA_TERCERO_NO_LIQUIDADO` | 409 | Intento de cerrar nómina con un tercero presente pero sin `nomina_tercero` calculado. |

### Permisos nuevos

Agregar a la tabla de [API_NOMINA.md §0](API_NOMINA.md#0-base-y-autenticación):

| Acción | Permiso |
|---|---|
| Liquidar acta de tercero | `nomina.liquidar` (reusa el existente) |
| Registrar pago a tercero | `nomina.pagar-tercero` (NUEVO) |
| Ver actas/PDF de tercero | `nomina.ver` |

---

## Mapa de PRs

```
PR-1 (foundations) ✅
  ├── PR-2 (Paso 3: Validar Cosecha) ✅        ─┐
  └── PR-3 (Paso 2 extendido + Liquidar op) ✅ ─┼── PR-3.5 (Fachada /terceros + pre-hidratar acta + paso-4-checklist) ✅
                                                │        │
                                                └────────┴── PR-4 (Acta tercero + PDF + cierre) ✅
                                                                │
                                                        PR-4.2 (Vista solo-lectura + descuentos múltiples) ✅
                                                                │
                                                        PR-5 (Indicadores 4 cards) ✅
                                                                │
                                                                └── PR-6 (QA + API_NOMINA.md actualizado) ⏳
                                                                        │
                                                                PR-7 (Préstamos a colaboradores) ⏳
```

**Regla de oro:** PR-1 debe mergearse y desplegarse antes de empezar PR-2/PR-3. PR-4 depende de ambos. PR-5 puede ir en paralelo con PR-4 una vez que PR-3 esté mergeado. PR-7 es independiente: depende solo de que las tablas base de nómina existan (PR-1), puede desarrollarse en paralelo con PR-6.

---

## PR-1 — Foundations (migraciones + modelos + cálculo de tarifa) ✅ COMPLETO

**Objetivo:** dejar la BD migrada, los modelos extendidos, y reparar el cálculo de tarifa diaria en `JornalCalculationService` para que use `tarifa_jornal` cuando `tipo_pago=JORNAL_FIJO`. **Sin nuevos endpoints todavía.**

**Estimación:** 16-24h. **Impacto en colaboradores propios:** ninguno (los modelos extendidos y migraciones son aditivas).

### Cambios de código

| Archivo | Cambio | Estado |
|---|---|---|
| `app/Models/Tercero.php` | +`banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta` a `$fillable`. Accessor `datos_bancarios_completos` (bool) | ✅ |
| `app/Models/TerceroLaborPrecio.php` | +`tarifa_jornal` a `$fillable` + cast. Accessor `precio_resuelto` (`precio_palma` ó `tarifa_jornal` según `tipo_pago`) | ✅ |
| `app/Models/NominaEmpleado.php` | +`operario_id`, `tercero_id` a `$fillable` + casts. Relaciones `operario()`, `tercero()`. Helpers `esDeOperario()`, `esDeEmpleado()` | ✅ |
| `app/Models/NominaTercero.php` (nuevo) | Modelo con relaciones a Nomina, Tercero, NominaTerceroOperario[] | ✅ |
| `app/Models/NominaTerceroOperario.php` (nuevo) | Modelo con relaciones a NominaTercero, Operario | ✅ |
| `app/Models/NominaValidacionCosecha.php` (nuevo) | Modelo con relaciones a Nomina, User (validado_por), cast `detalle_por_colaborador` → array | ✅ |
| `app/Services/JornalCalculationService.php` | `resolverPrecioLabor()`: ramifica lectura entre `precio_palma` y `tarifa_jornal` vía `precio_resuelto` del modelo | ✅ |
| `database/migrations/2026_06_25_000002_*.php` | +Guard `if (pgsql)` en ADD/DROP CONSTRAINT (SQLite compat) | ✅ |
| `database/migrations/2026_06_25_000004_*.php` | +Guard `if (pgsql)` en ALTER COLUMN y ADD/DROP CONSTRAINT; rama SQLite usa `->change()` | ✅ |

### Tests

- `tests/Unit/Models/NominaEmpleadoXorTest.php` ✅ — skip en SQLite, cubre casos: solo empleado OK, solo operario OK, ambos KO, ninguno KO
- `tests/Unit/Models/NominaEmpleadoOperarioRequiereTerceroTest.php` ✅ — skip en SQLite, cubre: operario+tercero OK, operario sin tercero KO
- `tests/Unit/Services/JornalCalculationServiceTipoPagoTest.php` ✅ — corre en SQLite; cubre POR_PALMA usa `precio_palma`, JORNAL_FIJO usa `tarifa_jornal`, sin tercero usa labor.precio_palma
- `tests/Feature/Migrations/TarifaJornalBackfillTest.php` ✅ — corre en SQLite; cubre backfill pobla tarifa_jornal, no afecta POR_PALMA, no sobreescribe valor existente

### Documentación

- No se toca [API_NOMINA.md](API_NOMINA.md) (los endpoints no cambian todavía).

### Criterios de aceptación

- [x] Migraciones con guards SQLite: `php artisan test` corre la suite completa sin fallar al aplicar las migraciones.
- [ ] `php artisan migrate` corre limpio sobre BD con datos reales PostgreSQL (staging).
- [ ] `php artisan migrate:rollback --step=6` revierte sin errores (puede perder filas con `operario_id`, documentado).
- [x] Suite de tests del PR-1 pasa en verde sobre SQLite in-memory.
- [x] Crear una `nomina_empleado` solo con `empleado_id` sigue funcionando exactamente igual que hoy.
- [x] `JornalCalculationService` con `tipo_pago=JORNAL_FIJO` usa `tarifa_jornal`, no `precio_palma`.

---

## PR-2 — Paso 3 "Validar Cosecha" + Promedio Efectivo por Nómina ✅ COMPLETO (extendido)

**Objetivo original:** insertar un paso nuevo entre "Agregar empleados" y "Liquidar". Compara cosecha registrada por colaboradores vs remisiones de extractora y permite ajustar promedios por lote.

**Scope extendido (2026-06-30):** nueva arquitectura de promedio efectivo por nómina × lote: tabla `nomina_promedio_lote`, `promedio_lote` queda read-only, bundle con detalle por cosecha por colaborador, coherencia entre validación y pago real.

**Depende de:** PR-1. **Impacto en colaboradores propios:** el wizard suma un paso obligatorio (validar cosecha) que afecta nóminas con cosechas en el período. Para nóminas sin cosechas, el paso 3 puede saltarse.

### Cambios de código

| Archivo | Cambio |
|---|---|
| `database/migrations/2026_06_30_000001_create_nomina_promedio_lote_table.php` (nuevo) | Tabla `nomina_promedio_lote`: override de promedio efectivo por nómina × lote. UNIQUE `(nomina_id, lote_id)`. |
| `app/Models/NominaPromedioLote.php` (nuevo) | Modelo con BelongsToTenant; relaciones `nomina()`, `lote()`, `ajustadoPor()`; casts decimal:4. |
| `app/Services/Nomina/ValidarCosechaService.php` (reescrito) | `bundle()`: devuelve `promedios_por_lote[]` + `detalle_por_colaborador[].cosechas[]` con fila por cosecha por colaborador. `ajustarPromedio()`: escribe en `nomina_promedio_lote` (NO en `promedio_lote`). `buildPromedioEfectivoMap()` + `calcularPromedioAuto()` privados. |
| `app/Http/Controllers/Api/Nomina/ValidarCosechaController.php` (modificado) | `ajustarPromedio()`: responde con shape de `NominaPromedioLote` (`lote_id`, `lote_nombre`, `promedio_auto`, `promedio_manual`, `promedio_efectivo`, `ajustado_at`). |
| `app/Http/Requests/Nomina/AjustarPromedioLoteNominaRequest.php` (existente) | Sin cambio estructural. |
| `app/Services/Nomina/NominaCalculationService.php` (modificado) | `sumarCosecha()` y `sumarCosechaOperario()` aceptan `?int $nominaId`; consultan `NominaPromedioLote` con prioridad antes del AVG fallback. `previewLiquidacion()` y `previewLiquidacionOperario()` pasan `$ne->nomina_id`. |
| `app/Services/Nomina/CerrarNominaService.php` (modificado) | `snapshotCosechas()` usa `NominaPromedioLote.promedio_efectivo` como primer candidato. Validación gate cosecha confirmada. |
| `routes/api.php` | 3 rutas bajo `nominas/{nomina}` con `nomina.editar`. |

### Endpoints

```
GET    /api/v1/tenant/nominas/{nomina}/validar-cosecha
PUT    /api/v1/tenant/nominas/{nomina}/promedios-lote/{lote}
POST   /api/v1/tenant/nominas/{nomina}/validar-cosecha/confirmar
```

### Tests

- `tests/Feature/Api/Nomina/ValidarCosechaBundleTest.php` — payload incluye colaboradores con kg trabajados, total extractora, diferencia
- `tests/Feature/Api/Nomina/AjustarPromedioLoteNominaTest.php` — solo en BORRADOR, persiste en `promedio_lote` y recalcula bundle
- `tests/Feature/Api/Nomina/ConfirmarValidacionCosechaTest.php` — upsert (segundo POST pisa al primero, no duplica)
- `tests/Feature/Api/Nomina/ValidarCosechaCerradaTest.php` — nómina `CERRADA` devuelve 422
- `tests/Feature/Services/Nomina/CerrarSinValidacionCosechaTest.php` — cierre falla con 409 si hay cosechas y no se validó

### Documentación

- Insertar **nueva §4** en [API_NOMINA.md](API_NOMINA.md) titulada "Paso 3 — Validar Cosecha". Renumerar las secciones siguientes (actual §4 "Liquidar" → §5, etc.).
- Actualizar el ASCII del flujo en §1: agregar el paso 3.
- Documentar el código `NOMINA_VALIDACION_COSECHA_REQUERIDA` en §0.

### Criterios de aceptación

- [ ] El GET responde en <500ms para una nómina con 50 colaboradores y 200 remisiones.
- [x] Ajustar promedio recalcula el bundle (la diferencia debe acercarse a 0).
- [x] Confirmar bloquea ajustes posteriores (la nómina puede seguir en BORRADOR pero el snapshot queda como "validado_at").
- [x] No se modifica `nomina_empleado` ni se calcula nada — solo se persiste el snapshot.
- [x] Una nómina sin cosechas registradas puede saltarse el paso (el cierre no lo exige).
- [x] Documentación actualizada: `API_NOMINA.md §4` con nuevo formato bundle, `promedios_por_lote`, `cosechas[]`, nueva respuesta `PUT /promedios-lote`.
- [x] `promedio_lote` intacto (read-only). Overrides van exclusivamente a `nomina_promedio_lote`.
- [x] `NominaCalculationService` y `CerrarNominaService` coherentes con el promedio ajustado.

---

## PR-3 — Paso 2 extendido + Liquidar operario

**Objetivo:** dos cosas en un mismo PR (van juntas porque se prueban con el mismo wizard):
1. **Extender el Paso 2** para que la pantalla muestre dos bloques (Colaboradores y Terceros) y permita agregar operarios a la nómina.
2. **Liquidar operarios** (sin SALUD/PENSION/FSP/SUBSIDIO_TRANSPORTE) en el motor de cálculo existente.

**Estimación:** 24-32h (subió de 20-28h porque también ajusta endpoints legados). **Depende de:** PR-1. **Paralelizable con:** PR-2.

### Cambios de código

| Archivo | Cambio |
|---|---|
| `app/Services/Nomina/NominaCalculationService.php` | En `liquidar(NominaEmpleado $ne)`: `if ($ne->operario_id !== null) return $this->liquidarOperario($ne);`. Nuevo método `liquidarOperario()` que: (1) suma jornales+cosecha por `operario_id`, (2) calcula `dias_trabajados` con `COUNT(DISTINCT operacion.fecha)`, (3) NO aplica conceptos legales obligatorios, (4) NO procesa ausencias ni horas extra. Adaptar `sumarJornales()` y `sumarCosecha()` para aceptar wrapper `Empleado\|Operario` |
| `app/Http/Controllers/Api/Nomina/NominaEmpleadoController.php` | `empleadosDisponibles()`: cambiar respuesta a `{ empleados: [], operarios: [] }`. El bloque `operarios` viene agrupado con su `tercero` embebido. Aceptar `?tercero_id=N` para filtrar. `preview()` ramifica: si fila es de operario, devuelve estructura sin `conceptos_legales`/`subsidio_transporte`. `liquidar()` valida que `bonificaciones`/`deducciones_voluntarias` no vengan si la fila es de operario |
| `app/Http/Resources/Nomina/EmpleadoDisponibleResource.php` | Sin cambio |
| `app/Http/Resources/Nomina/OperarioDisponibleResource.php` (nuevo) | Incluye `id`, `nombres`, `apellidos`, `cedula`, `cargo`, `tercero: {id, razon_social}`, `tarifa_dia_estimada` (calculada a partir de `tercero_labor_precios` JORNAL_FIJO de la labor más frecuente) |
| `app/Http/Requests/Nomina/AgregarEmpleadosNominaRequest.php` | Extender: aceptar `operario_ids: []` además de `empleado_ids: []`. Regla custom: cada `operario_id` debe pertenecer a un tercero válido. Al menos uno de los dos arrays debe venir con elementos |
| `app/Http/Requests/Nomina/LiquidarNominaEmpleadoRequest.php` | Si la `nomina_empleado` es de operario, prohibir `bonificaciones` y `deducciones_voluntarias` (devuelve 422 con campo) |

### Endpoints (nuevos / extendidos)

```
# Extendido (cambia respuesta)
GET    /api/v1/tenant/nominas/{nomina}/empleados-disponibles[?tercero_id=N]

# Extendido (cambia body)
POST   /api/v1/tenant/nominas/{nomina}/empleados      { empleado_ids: [], operario_ids: [] }
```

> **No se crea** una ruta separada `/terceros` para selección — el wizard usa el mismo endpoint `/empleados` con bloque agrupado. Esto evita duplicar lógica de validación de XOR.

### Tests

- `tests/Feature/Api/Nomina/EmpleadosDisponiblesConOperariosTest.php` — endpoint devuelve dos bloques, excluye agregados
- `tests/Feature/Api/Nomina/AgregarEmpleadosYOperariosNominaTest.php` — body mixto crea filas correctas con XOR
- `tests/Feature/Api/Nomina/AgregarOperarioNoPerteneceTerceroTest.php` — error `OPERARIO_NO_PERTENECE_A_TERCERO`
- `tests/Feature/Services/Nomina/LiquidarOperarioTest.php` — operario con 5 jornales JORNAL_FIJO + 3 cosechas → `total_devengado` esperado, **sin** SALUD/PENSION/FSP, **sin** subsidio
- `tests/Feature/Services/Nomina/LiquidarOperarioSinTarifaTest.php` — labor sin precio en `tercero_labor_precios` → 422 `TERCERO_LABOR_SIN_PRECIO`
- `tests/Feature/Services/Nomina/LiquidarEmpleadoLegadoTest.php` — **regresión**: empleado FIJO + VARIABLE sin tocar
- `tests/Feature/Api/Nomina/PreviewOperarioTest.php` — preview de operario no incluye `conceptos_legales`
- `tests/Feature/Api/Nomina/LiquidarOperarioConBonificacionRechazadaTest.php` — body con bonificaciones a fila de operario → 422

### Documentación

- Actualizar [API_NOMINA.md §3](API_NOMINA.md) "Paso 2 — Agregar empleados" → renombrar a "Paso 2 — Agregar empleados y operarios". Cambiar la respuesta documentada de `/empleados-disponibles` y el body de `POST /empleados`.
- Actualizar [API_NOMINA.md §4](API_NOMINA.md) "Paso 3 — Liquidar empleado" → renombrar a "Paso 4 — Liquidar colaborador" (queda como paso 4 tras insertar Validar Cosecha). Aclarar que para operarios el preview/liquidar tienen estructura reducida.
- Agregar nota en §7 "Reglas de cálculo": los operarios **no** aplican §7.3 (subsidio), §7.4 (SALUD/PENSION) ni §7.5 (FSP).
- Registrar códigos `TERCERO_LABOR_SIN_PRECIO`, `OPERARIO_NO_PERTENECE_A_TERCERO`, `OPERARIO_LIQUIDADO_EN_TERCERO` en §0.

### Criterios de aceptación

- [x] Agregar 3 operarios de 2 terceros a una nómina BORRADOR crea 3 filas `nomina_empleado` con `operario_id != NULL` y `tercero_id` consistente.
- [x] El endpoint `/empleados-disponibles` devuelve exactamente la estructura `{ empleados: [], operarios: [] }` documentada.
- [x] Quitar un operario elimina la fila (`DELETE`) solo si está en PENDIENTE.
- [x] Liquidar un operario calcula correctamente jornales+cosecha y persiste en `nomina_empleado.total_devengado`/`total_neto`.
- [x] **El flujo de empleado FIJO/VARIABLE no cambia** — comparar antes/después en una nómina mezclada.
- [x] `previewLiquidacion()` para empleado devuelve estructura idéntica a hoy (regresión 0).
- [x] `previewLiquidacion()` para operario omite `conceptos_legales`, `subsidio_transporte`, `dias_ausencia_*`.

---

## PR-3.5 — Cierre del gap de persistencia del paso "Confirmación" del wizard ✅ COMPLETO

**Objetivo:** cerrar dos gaps descubiertos cuando el frontend integró el wizard completo:
1. El endpoint `POST /nominas/{id}/terceros` que el frontend estaba llamando devolvía **404** — el ROADMAP original decidió no crearlo, pero el contrato del frontend ya lo requería.
2. Cuando se agregaban operarios a una nómina, `nomina_tercero` y `nomina_tercero_operario` quedaban vacías hasta que llegara PR-4 — el frontend no podía mostrar el acta pendiente ni el usuario podía coordinar el paso a "Liquidación de Terceros".

**Estimación:** 8-12h. **Depende de:** PR-1, PR-3. **Impacto en colaboradores propios:** ninguno (agrega alias sin tocar `POST /empleados`).

### Cambios de código

| Archivo | Cambio |
|---|---|
| `app/Services/Nomina/HidratarActaTerceroService.php` (nuevo) | `hidratar(Nomina, Operario, tenantId)`: `firstOrCreate` en `nomina_tercero` (totales 0, PENDIENTE) + `firstOrCreate` en `nomina_tercero_operario` (dias 0, tarifa_dia resuelta desde `tercero_labor_precios.tarifa_jornal` de la primera labor JORNAL_FIJO activa del tercero). `limpiarSiVacia(nominaId, terceroId)`: borra el acta si no le quedan operarios. Idempotente en ambos casos. |
| `app/Http/Requests/Nomina/AgregarTercerosNominaRequest.php` (nuevo) | Valida 3 variantes de body (`operario_ids[]`, `tercero_ids[]`, `terceros[]`). Método `resolverOperarioIds()` que normaliza a lista plana. Valida XOR de pertenencia en variante C con código `OPERARIO_NO_PERTENECE_A_TERCERO`. |
| `app/Http/Controllers/Api/Nomina/NominaEmpleadoController.php` | Refactor: extrae los bloques de inserción a métodos privados `insertarEmpleados()` e `insertarOperarios()` (este último invoca `HidratarActaTerceroService::hidratar()`). Ambos son idempotentes. Los métodos `agregar()` y `agregarTerceros()` los reusan. Nuevos endpoints públicos: `agregarTerceros()`, `eliminarTercero()`, `paso4Checklist()`. `eliminar()` también borra la línea de acta si la fila era de operario y limpia el acta vacía. Todos los cambios corren dentro de `DB::transaction()`. |
| `routes/api.php` | +3 rutas: `POST /nominas/{nomina}/terceros`, `DELETE /nominas/{nomina}/terceros/{tercero}`, `GET /nominas/{nomina}/paso-4-checklist`, todas con `nomina.editar`. |
| `docs/API_NOMINA.md` | +§3.4 (alias `POST /terceros`), +§3.5 (`DELETE /terceros/{tercero}`), +§3.6 (`GET /paso-4-checklist`), +§3.7 (secuencia obligatoria del paso Confirmación con warnings), +códigos `OPERARIO_LIQUIDADO_EN_TERCERO` y `TERCERO_SIN_OPERARIOS_EN_NOMINA` en §0. |

### Endpoints

```
POST   /api/v1/tenant/nominas/{nomina}/terceros
DELETE /api/v1/tenant/nominas/{nomina}/terceros/{tercero}
GET    /api/v1/tenant/nominas/{nomina}/paso-4-checklist
```

### Justificación del cambio a la decisión "no crear ruta separada `/terceros`"

En PR-3 se decidió NO crear ese endpoint (ver [ROADMAP §Cambios al flujo legado](#endpoints-existentes-que-cambian)) para evitar duplicar la lógica XOR. Cuando el frontend integró el wizard, ya había construido su capa de servicios asumiendo separación empleados/terceros. Cambiar el frontend habría requerido reescribir el store del wizard + toda la vista de "Confirmación", con impacto en el timeline.

La fachada agregada en PR-3.5 NO duplica lógica: es un thin wrapper sobre el mismo método privado `insertarOperarios()` que usa `POST /empleados`. Convive con el endpoint canónico. Cuando el frontend migre a `/empleados` en el futuro, `POST /terceros` puede marcarse como deprecated sin romper nada.

### Coherencia con PR-4

`nomina_tercero` queda con totales `0` después de PR-3.5. Cuando llegue PR-4, `LiquidarTerceroService::liquidar(Nomina, Tercero)` hará `updateOrCreate` con los totales reales — el UNIQUE `(nomina_id, tercero_id)` garantiza que no se duplican filas. La pre-hidratación de PR-3.5 no rompe PR-4; solo adelanta la creación de las filas para que la UI de "Liquidación de Terceros" pueda listarlas como "Pendiente de liquidar".

### Tests

- `tests/Feature/Api/Nomina/AgregarOperariosPreHidrataActaTest.php` — verifica creación de `nomina_tercero` + `nomina_tercero_operario` con totales 0 cuando se agregan operarios via `/empleados` y via `/terceros`. Verifica idempotencia (segunda llamada no duplica).
- `tests/Feature/Api/Nomina/EliminarTerceroDeNominaTest.php` — verifica borrado en cascada + validación `OPERARIO_LIQUIDADO_EN_TERCERO`.
- `tests/Feature/Api/Nomina/EliminarOperarioIndividualLimpiaActaTest.php` — verifica que `DELETE /nomina-empleado/{id}` cuando la fila es de operario también borra su línea del acta y limpia `nomina_tercero` si queda vacía.
- `tests/Feature/Api/Nomina/Paso4ChecklistTest.php` — verifica que `listo_para_cerrar` refleja el estado correcto según qué llamadas se hicieron.
- **Regresión:** `AgregarEmpleadosSinOperariosTest` — nómina solo con empleados propios no crea filas en `nomina_tercero` ni `nomina_tercero_operario`.

### Criterios de aceptación

- [x] `POST /nominas/{id}/terceros` acepta las 3 variantes de body y persiste correctamente.
- [x] Después de agregar operarios, `nomina_tercero` y `nomina_tercero_operario` tienen filas por cada contratista/operario con totales 0.
- [x] `POST /nominas/{id}/empleados` con `operario_ids` también pre-hidrata las mismas tablas (mismo comportamiento que el alias).
- [x] `DELETE /nominas/{id}/terceros/{tercero}` borra todo en cascada dentro de una transacción.
- [x] `GET /paso-4-checklist` refleja el estado real de las 4 tablas.
- [x] Idempotencia: repetir cualquier operación no duplica filas.
- [x] `DELETE /nomina-empleado/{id}` cuando es operario limpia la línea del acta y borra el acta si queda vacía.
- [x] Documentación actualizada: `API_NOMINA.md §3.4/3.5/3.6/3.7` + códigos de error en §0.

---

## PR-4 — Liquidación de terceros (acta agrupada + PDF + cierre) ✅ COMPLETO

**Objetivo:** la pantalla "Liquidación de Terceros" del mockup — vista agrupada por empresa contratista con acta, ajustes por operario, registro de pago, exportación PDF, y ajustes al cierre de nómina.

**Estimación:** 40-50h. **Depende de:** PR-3, PR-3.5 (aprovecha la pre-hidratación de `nomina_tercero`/`nomina_tercero_operario` para evitar 404 en la primera carga de la pantalla). **Impacto en colaboradores propios:** el `CerrarNominaService` ahora valida coherencia de `nomina_tercero`. Una nómina solo-empleados sigue cerrando idéntico (sin terceros = sin validación extra). Snapshots por `operario_id` ya estaban en PR-3 (`CerrarNominaService::snapshotJornales()`/`snapshotCosechas()` ramifican vía `NominaEmpleado::esDeOperario()`).

### Cambios de código

| Archivo | Cambio |
|---|---|
| `app/Services/Nomina/LiquidarTerceroService.php` (nuevo) | `liquidar(Nomina $n, Tercero $t)`: suma jornales+cosecha de todos los operarios del tercero en el período. Crea/actualiza `nomina_tercero` (totales) y `nomina_tercero_operario` (líneas con `dias=COUNT(DISTINCT fecha)`, `tarifa_dia` resuelta por labor desde `tercero_labor_precios.tarifa_jornal`, `subtotal`, `labores_realizadas` JSON). Idempotente |
| `app/Services/Nomina/RegistrarPagoTerceroService.php` (nuevo) | `registrar(NominaTercero $nt, RegistrarPagoTerceroData $d, User $u)`: marca `estado_pago=PAGADO`, persiste `pagado_at`, `pagado_por`, `metodo_pago`, `referencia_pago`, `orden_pago_numero`, `observacion`. Permitido aunque `nomina.estado=CERRADA` (excepción documentada al patrón "CERRADA = inmutable") |
| `app/Services/Nomina/CerrarNominaService.php` | (1) En `snapshotJornales()`/`snapshotCosechas()`: cuando `nomina_empleado.operario_id IS NOT NULL`, snapshotear por `operario_id`. (2) Validar que para cada tercero con operarios en la nómina exista `nomina_tercero` (PENDIENTE o PAGADO); si falta → 409 `NOMINA_TERCERO_NO_LIQUIDADO`. (3) **No** exigir que `nomina_tercero.estado_pago=PAGADO` para cerrar — PENDIENTE es válido |
| `app/Http/Controllers/Api/Nomina/NominaTerceroController.php` (nuevo) | `index` (resumen agrupado), `show` (acta detalle), `liquidar`, `actualizarOperario`, `registrarPago`, `actaPdf` |
| `app/Http/Requests/Nomina/LiquidarTerceroRequest.php` (nuevo) | Valida la nómina existe en BORRADOR/CERRADA, el tercero tiene operarios en la nómina |
| `app/Http/Requests/Nomina/ActualizarOperarioActaRequest.php` (nuevo) | Valida `dias` (int ≥0), `tarifa_dia` (decimal ≥0), `ajuste` (decimal), `observacion` (str opcional) |
| `app/Http/Requests/Nomina/RegistrarPagoTerceroRequest.php` (nuevo) | Valida `metodo_pago` (in TRANSFERENCIA,EFECTIVO,CHEQUE), `referencia_pago` (req si TRANSFERENCIA), `pagado_at` (datetime). Si `metodo_pago=TRANSFERENCIA` exige `tercero.banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta` |
| `resources/views/desprendible/acta_tercero.blade.php` (nuevo) | Template DomPDF reusando estilos del desprendible existente. Header con datos del tercero (incluye bancarios si aplica), tabla de operarios con días/tarifa/labores/subtotal, footer con total y línea de firma |
| `app/Services/Pdf/ActaTerceroPdfService.php` (nuevo) | Renderiza el blade y devuelve `DomPDF` listo para `->download()` o `->stream()` |
| `database/seeders/PermissionSeeder.php` | +Permiso `nomina.pagar-tercero` |
| `routes/api.php` | +6 rutas del CRUD de `nomina_tercero` |

### Endpoints

```
GET    /api/v1/tenant/nominas/{nomina}/terceros-actas       # resumen agrupado (renombrado desde /terceros para no colisionar con PR-3.5)
GET    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}   # detalle acta
POST   /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/liquidar
PUT    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/operarios/{op}
POST   /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/registrar-pago
GET    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/acta/pdf
```

> **Nota de nombrado:** `POST /nominas/{id}/terceros` está reservado por PR-3.5 (agregar operarios al paso 4). Para no colisionar, el resumen agrupado del acta usa `GET /nominas/{id}/terceros-actas`. Los endpoints por contratista (`/terceros/{tercero}/*`) conviven sin problema — Laravel resuelve por método HTTP.

### Tests

- `tests/Feature/Services/Nomina/LiquidarTerceroServiceTest.php` — 2 operarios de 1 tercero con 5 días + 3 cosechas → totales correctos en `nomina_tercero` y 2 filas en `nomina_tercero_operario`
- `tests/Feature/Services/Nomina/LiquidarTerceroIdempotenteTest.php` — ejecutar 2 veces no duplica
- `tests/Feature/Api/Nomina/RegistrarPagoTransferenciaSinBancoTest.php` — `metodo_pago=TRANSFERENCIA` sin datos bancarios → 422 `TERCERO_SIN_DATOS_BANCARIOS`
- `tests/Feature/Api/Nomina/RegistrarPagoEfectivoSinBancoTest.php` — `metodo_pago=EFECTIVO` sin datos bancarios → 200 OK
- `tests/Feature/Api/Nomina/RegistrarPagoSobreNominaCerradaTest.php` — nómina CERRADA + tercero PENDIENTE → 200 OK (excepción documentada)
- `tests/Feature/Pdf/ActaTerceroPdfRenderTest.php` — el PDF se genera, contiene los operarios y totales correctos
- `tests/Feature/Services/Nomina/CerrarNominaConTerceroPendienteTest.php` — cierre OK con `nomina_tercero.estado_pago=PENDIENTE`
- `tests/Feature/Services/Nomina/CerrarNominaSinLiquidarTerceroTest.php` — cierre falla con 409 `NOMINA_TERCERO_NO_LIQUIDADO`
- `tests/Feature/Services/Nomina/CerrarNominaSoloEmpleadosLegadoTest.php` — **regresión**: nómina solo-empleados cierra igual que hoy

### Documentación

- ✅ Nueva **§7 "Acta de Tercero"** en [API_NOMINA.md](API_NOMINA.md) con 7 subsecciones (7.1 resumen agrupado, 7.2 detalle, 7.3 liquidar, 7.4 ajustar línea, 7.5 registrar-pago, 7.6 PDF, 7.7 diagrama de estados). Cubre los 6 endpoints, el flujo del acta y la excepción "registrar-pago sobre CERRADA". Renumeración §7→§8/…/§13→§14.
- ✅ Actualizada §6 "Cerrar nómina" con las 3 validaciones (empleados+operarios liquidados, cosecha confirmada, actas de terceros calculadas) y el comportamiento de snapshots para operarios.
- ✅ Registrados 7 códigos de error en §0: `OPERARIO_LIQUIDADO_EN_TERCERO`, `TERCERO_SIN_OPERARIOS_EN_NOMINA`, `NOMINA_TERCERO_NO_LIQUIDADO`, `TERCERO_SIN_DATOS_BANCARIOS`, `ACTA_TERCERO_YA_PAGADA`, `ACTA_NO_CALCULADA`.
- ✅ Permiso `nomina.pagar-tercero` documentado en la tabla de permisos de §0.
- ✅ Diagrama ASCII del ciclo de vida en §1 incluye el bloque "Liquidación de Terceros" en post-wizard.

### Criterios de aceptación

- [x] `GET /terceros-actas` agrupa correctamente y devuelve totales por contratista + resumen global (total, pendiente, pagado, contratistas).
- [x] Ajustar `dias` o `tarifa_dia` de un operario actualiza `subtotal` y propaga al `total_a_transferir` del acta (`LiquidarTerceroService::actualizarLineaOperario()` → `recalcularTotalesActa()`).
- [x] El PDF del acta abre correctamente y refleja los datos reales (Blade `acta_tercero.blade.php`, DomPDF, filename `acta_tercero_{ident}_{anio}_{mes}[_Q{n}].pdf`).
- [x] Cerrar nómina con terceros PENDIENTES funciona; `registrar-pago` sigue habilitado post-cierre (excepción documentada en §7.5 y §6).
- [x] **Cerrar nómina solo-empleados sigue funcionando igual** (la validación `validarActasTercerosLiquidadas()` retorna temprano si no hay `tercero_id` en `nomina_empleado`).
- [x] Snapshots de jornales/cosechas de operarios quedan en `nomina_jornal_ref`/`nomina_cosecha_ref` referenciados desde la fila `nomina_empleado` del operario (heredado de PR-3 vía `esDeOperario()` en `snapshotJornales()`/`snapshotCosechas()`).
- [x] Datos bancarios obligatorios solo si `metodo_pago=TRANSFERENCIA` (`RegistrarPagoTerceroRequest::withValidator()` reporta lista de campos faltantes).
- [x] `LiquidarTerceroService` idempotente — segundo `POST /liquidar` no duplica y **preserva** `ajuste`/`observacion` manual de líneas y `estado_pago`/datos de giro de la cabecera.

---

## PR-4.2 — Vista solo-lectura + descuentos múltiples por operario ✅ COMPLETO

**Objetivo:** reemplazar la edición libre de líneas (`PUT /operarios/{op}`) por una vista de solo-lectura con acordeón de desglose de labores y múltiples descuentos con concepto identificado por operario.

**Depende de:** PR-4. **Breaking change frontend:** `PUT /operarios/{op}` eliminado; shape del response por operario cambia (quita `dias`, `tarifa_dia`, `ajuste`, `descuento_*`; agrega `total_jornales`, `total_cosecha`, `descuentos[]`).

### Cambios de código

| Archivo | Cambio |
|---------|--------|
| `database/migrations/2026_07_09_000001_create_nomina_tercero_operario_descuento_table.php` | NUEVO — tabla con FK cascade desde `nomina_tercero_operario` |
| `database/migrations/2026_07_09_000002_alter_nomina_tercero_operario_replace_descuento_fields.php` | DROP `ajuste`, `descuento_concepto_id`, `descuento_valor`, `descuento_observacion`; ADD `total_jornales DECIMAL(14,2)`, `total_cosecha DECIMAL(14,2)` |
| `app/Models/NominaTerceroOperarioDescuento.php` | NUEVO — BelongsTo `NominaTerceroOperario` + `NominaConcepto` |
| `app/Models/NominaTerceroOperario.php` | Quita campos `ajuste`/`descuento_*`; añade `total_jornales`, `total_cosecha`; relación `descuentos()` HasMany |
| `app/Services/Nomina/LiquidarTerceroService.php` | `liquidar()` refactorizado; `recalcularTotalesActa()` simplificado (fix doble-conteo); nuevos métodos `agregarDescuento()`, `eliminarDescuento()`, `recalcularSubtotalLinea()`, `calcularDetalleOperario()` |
| `app/Http/Requests/Nomina/AgregarDescuentoOperarioActaRequest.php` | NUEVO — `concepto_id` (DEDUCCION_VOLUNTARIA + activo), `valor`, `observacion` |
| `app/Http/Controllers/Api/Nomina/NominaTerceroController.php` | Elimina `actualizarOperario()`; añade `detalleOperario()`, `agregarDescuento()`, `eliminarDescuento()` |
| `app/Services/Pdf/ActaTerceroPdfService.php` | Eager-load actualizado; shape por operario actualizado |
| `resources/views/desprendible/acta_tercero.blade.php` | Columnas Jornales/Cosecha reemplazan Días/Tarifa/Ajuste/Descuento; filas de descuentos en fondo amarillo |
| `routes/api.php` | Elimina `PUT …/operarios/{op}`; añade `GET …/detalle`, `POST …/descuentos`, `DELETE …/descuentos/{d}` |

### Fix del bug doble-conteo cosecha

**Antes** (PR-4): `total_a_transferir = SUM(subtotales) + total_cosecha` — bug latente porque los subtotales iniciales ya incluían cosecha.

**Después** (PR-4.2): `subtotal = total_jornales + total_cosecha − SUM(descuentos)` y `total_a_transferir = SUM(subtotales)` → sin doble suma.

### Criterios de aceptación

- [x] `GET /terceros/{tercero}` devuelve operarios sin `dias`/`tarifa_dia`/`ajuste`/`descuento_*` y con `total_jornales`, `total_cosecha`, `descuentos[]`.
- [x] `GET /operarios/{op}/detalle` devuelve `cosecha[]` y `jornales[]` con valores calculados por labor/lote.
- [x] `POST /descuentos` → subtotal del operario baja, `total_a_transferir` propaga.
- [x] `DELETE /descuentos/{id}` → subtotal sube, `total_a_transferir` propaga.
- [x] Concepto inválido/inactivo → 422 `DESCUENTO_CONCEPTO_INVALIDO`.
- [x] `POST /liquidar` en acta con descuentos existentes: preserva descuentos y recalcula correctamente.
- [x] PDF muestra columnas Jornales/Cosecha y filas de descuentos bajo cada operario.
- [x] **Regresión:** `total_a_transferir` no duplica cosecha después de re-liquidar.
- [x] **Breaking change coordinado:** deploy backend + frontend juntos.

---

## PR-5 — Indicadores rediseñados (4 cards del listado) ✅ COMPLETO

**Objetivo:** reemplazar la card actual "Total Devengado" por 4 cards: **Pagado a Colaboradores**, **Pagado a Terceros**, **Neto**, **Pendiente**. Aplica al listado de nóminas (tabla "Nóminas Creadas").

**Estimación:** 6-10h. **Depende de:** PR-3, PR-4 (para `pendiente_pagar`). **Paralelizable con:** PR-4 una vez que PR-3 esté merged.

### Cambios de código

| Archivo | Cambio |
|---|---|
| `app/Http/Controllers/Api/Nomina/NominaController.php` | `indicadores(Request $request)`: extendido con 4 cards nuevas + filtros. Query agregada única con `SUM(CASE WHEN …)` para conteos + `total_devengado`. Ids de nóminas CERRADAS filtradas se resuelven una sola vez y se reusan en las queries de agregación de `nomina_empleado` y `nomina_tercero`. `pendiente_pagar` filtra `total_a_transferir > 0` para excluir las actas pre-hidratadas de PR-3.5. Response incluye `meta.filtros` con el eco de los filtros aplicados. Helpers privados `extraerFiltrosIndicadores()` y `aplicarFiltrosIndicadores(query, filtros, alias?)` para reusar en múltiples queries y sobre JOINs. |

### Endpoints

```
GET /api/v1/tenant/nominas/indicadores[?anio=YYYY][&mes=1-12][&estado=BORRADOR|CERRADA]
```

### Response

```jsonc
{
  "data": {
    "total_periodos": 3,
    "borradores": 1,
    "cerradas": 2,
    "total_devengado": 55500000,          // @deprecated
    "total_colaboradores": 33150000,       // SUM total_neto empleados propios en nóminas CERRADAS filtradas
    "total_terceros": 7870000,             // SUM total_a_transferir actas PAGADO en nóminas CERRADAS filtradas
    "neto_pagar": 41020000,                // colaboradores + terceros
    "pendiente_pagar": 19550000            // actas PENDIENTE con total > 0 (BORRADOR o CERRADA)
  },
  "meta": { "filtros": { "anio": 2026, "mes": 7 } }
}
```

### Tests

- `tests/Feature/Api/Nomina/IndicadoresExtendidosTest.php` — nómina con 2 empleados + 3 terceros (1 pagado, 2 pendientes) → cards con valores correctos
- `tests/Feature/Api/Nomina/IndicadoresLegadosCompatTest.php` — los campos legados (`total_devengado`, `total_periodos`, etc.) siguen presentes con valores correctos
- `tests/Feature/Api/Nomina/IndicadoresFiltrosTest.php` — filtros `?anio=2026&mes=5` funcionan combinados

### Documentación

- ✅ [API_NOMINA.md §2.3](API_NOMINA.md) "Indicadores (cards superiores)" reescrito con la nueva firma. Marcado `total_devengado` como **deprecated** + descripción de cada campo + notas de implementación (sin N+1, filtros combinables, `pendiente_pagar` excluye pre-hidratación).
- ✅ Ejemplo cURL de §12 (paso 10) actualizado con filtros y el nuevo shape del response.

### Criterios de aceptación

- [x] La query es 1 sola consulta agregada sobre `nominas` (`SUM(CASE WHEN…)`) + 3 queries constantes independientes del volumen (ids CERRADAS, agregado empleado, agregado tercero pagado, agregado tercero pendiente). No hay N+1.
- [x] Funciona para nóminas sin terceros (los campos de tercero quedan en `0` gracias al fallback `isEmpty()` sobre `nominasCerradasIds`).
- [x] Filtros funcionan combinados (`?anio=2026&mes=7&estado=CERRADA`).
- [x] Frontend puede leer ambos formatos durante la transición (legados + nuevos coexisten en el mismo response).
- [x] `pendiente_pagar` excluye las actas pre-hidratadas de PR-3.5 (`total_a_transferir > 0`).
- [x] Response incluye `meta.filtros` para debug y UI (chips de filtros activos).

---

## PR-6 — QA, regresión, hardening y docs

**Objetivo:** verificación end-to-end completa del módulo entero (colaboradores + terceros), fix de bugs descubiertos, reescritura del [API_NOMINA.md](API_NOMINA.md) para que refleje el wizard frontend de 4 pasos + las pantallas post-wizard (Liquidación de colaborador, Liquidación de Terceros, Cerrar) como flujo principal.

**Estimación:** 24-32h (subió de 20-30h por la reescritura del doc). **Depende de:** PR-1 a PR-5.

### Actividades

#### E2E manual completo

Ejecutar el flujo wizard completo descrito en [PLAN_NOMINA_TERCEROS.md §Verificación end-to-end](PLAN_NOMINA_TERCEROS.md) y agregar las variantes:

1. **Nómina mixta**: 2 empleados (1 FIJO + 1 VARIABLE) + 2 operarios de 2 terceros distintos
   - Validar cosecha → ajustar promedio de 1 lote → confirmar paso 3
   - Liquidar empleados FIJO y VARIABLE → desprendibles
   - Liquidar tercero 1 (acta) + registrar pago por transferencia (con datos bancarios)
   - Liquidar tercero 2 (acta) sin pagar todavía
   - Cerrar nómina → verificar `nomina.estado=CERRADA`, snapshots
   - Registrar pago tercero 2 post-cierre por efectivo (sin banco)
2. **Nómina solo-empleados** (regresión legada): repetir flujo viejo, verificar paridad byte-a-byte con baseline pre-feature
3. **Nómina solo-terceros**: sin empleados, validar que el wizard permite cerrar
4. **Nómina sin cosechas**: omitir paso 3, cerrar OK

#### Edge cases obligatorios

- Operario sin precios en `tercero_labor_precios` → 422 `TERCERO_LABOR_SIN_PRECIO` con `tercero_id`/`labor_id`
- Operario con `tercero_id` distinto al `tercero_ids[]` enviado → 422 `OPERARIO_NO_PERTENECE_A_TERCERO`
- Tercero sin operarios en la nómina → `liquidar` devuelve 422
- Pago en efectivo sin datos bancarios → 200 OK
- Pago por transferencia sin datos bancarios → 422 con detalle de campos faltantes
- Re-ejecutar paso 3 mientras BORRADOR → upsert OK
- Cerrar nómina con cosechas y sin validar → 409 `NOMINA_VALIDACION_COSECHA_REQUERIDA`
- Cerrar nómina con tercero presente pero sin `nomina_tercero` → 409 `NOMINA_TERCERO_NO_LIQUIDADO`
- Eliminar operario con `nomina_tercero` liquidado → 409 `OPERARIO_LIQUIDADO_EN_TERCERO`

#### Reescritura de API_NOMINA.md

El doc actual describe un wizard centrado en empleados. Hay que reescribirlo para que refleje:
- Wizard frontend de **4 pasos** (elegir período → elegir colaboradores → validar cosecha → confirmación); el paso "Confirmación" dispara toda la persistencia backend en cadena ✅ hecho en PR-3.5
- "Empleado" → "Colaborador" en títulos (§5 renombrado en PR-4; los endpoints siguen llamándose `nomina-empleado` por compat) ✅ hecho en PR-4
- Sección **§7 "Acta de Tercero"** nueva ✅ hecha en PR-4 (renumeración §7→§8/…/§13→§14 aplicada)
- Sección §11 (Snapshots) ampliada: snapshots de `nomina_tercero`, `nomina_validacion_cosecha` y `nomina_promedio_lote`
- Sección §0 con los 7 códigos de error nuevos y el permiso `nomina.pagar-tercero` ✅ hecho en PR-4
- Sección §13/§14 (Configuración → Nómina + Referencias): agregar fila para "Datos bancarios de Terceros" si la UI lo expone
- Diagrama de estados de `nomina_tercero` (PENDIENTE → PAGADO) en §7.7 ✅ hecho en PR-4
- Ejemplos cURL en §12 ampliados con validar cosecha y liquidar tercero + registrar pago (pendiente en PR-6)

#### Performance

- Nómina con 100 colaboradores (50 empleados + 50 operarios de 5 terceros) cierra en <30s
- `GET /nominas/{id}/validar-cosecha` < 500ms con 50 colaboradores
- `GET /nominas/{id}/terceros-actas` < 300ms con 10 terceros

### Criterios de aceptación

- [ ] Suite completa en verde (incluyendo regresión legada).
- [ ] Manual E2E pasa los 4 escenarios sin intervención.
- [ ] Nómina legado (solo empleados) idéntica byte-a-byte en el desprendible.
- [ ] [API_NOMINA.md](API_NOMINA.md) reescrito y revisado por el equipo frontend.
- [ ] Postman/OpenAPI actualizado con todos los endpoints nuevos.
- [ ] Performance benchmarks dentro de los umbrales.

---

## PR-7 — Préstamos a colaboradores ⏳

**Objetivo:** módulo completo de préstamos/adelantos a colaboradores internos con integración en la liquidación de nómina: el liquidador decide en cada quincena si aplica o no el descuento de la cuota.

**Estimación:** 16-20h. **Depende de:** PR-1 (tablas nomina base). **Paralelizable con:** PR-6. **Impacto en flujo existente:** mínimo — solo extiende el preview y agrega campo opcional `prestamo_cuota_id` en `deducciones_voluntarias`.

### Cambios de código

| Archivo | Acción |
|---------|--------|
| `database/migrations/2026_07_02_000001_create_prestamos_table.php` | NUEVO |
| `database/migrations/2026_07_02_000002_create_prestamo_cuotas_table.php` | NUEVO |
| `app/Models/Prestamo.php` | NUEVO |
| `app/Models/PrestamoCuota.php` | NUEVO |
| `app/Services/Nomina/PrestamoService.php` | NUEVO — CRUD + generarCuotas + aplicarCuota |
| `app/Http/Controllers/Api/Nomina/PrestamoController.php` | NUEVO — 6 endpoints |
| `app/Http/Requests/Nomina/CrearPrestamoRequest.php` | NUEVO |
| `app/Http/Requests/Nomina/ActualizarPrestamoRequest.php` | NUEVO |
| `app/Http/Controllers/Api/Nomina/NominaEmpleadoController.php` | MODIFICADO — `preview()` incluye `prestamos_pendientes[]` |
| `app/Http/Requests/Nomina/LiquidarEmpleadoRequest.php` | MODIFICADO — agrega `*.prestamo_cuota_id` opcional |
| `app/Services/Nomina/NominaCalculationService.php` | MODIFICADO — `liquidar()` llama `PrestamoService::aplicarCuota()` |
| `routes/api.php` | MODIFICADO — +6 rutas |
| `docs/API_PRESTAMOS.md` | NUEVO — documentación completa |
| `docs/API_NOMINA.md` | MODIFICADO — §5.1 preview + §5.3 body + §15 referencia cruzada |

### Endpoints

```
GET    /api/v1/tenant/prestamos/indicadores
GET    /api/v1/tenant/prestamos[?empleado_id=N][&estado=][&anio=]
POST   /api/v1/tenant/prestamos
GET    /api/v1/tenant/prestamos/{id}
PUT    /api/v1/tenant/prestamos/{id}
DELETE /api/v1/tenant/prestamos/{id}
```

### Criterios de aceptación

- [ ] `POST /prestamos` con 10 cuotas genera exactamente 10 filas en `prestamo_cuotas` con fechas consecutivas (incluyendo cruce de año, Q2-dic → Q1-ene).
- [ ] `GET /nomina-empleado/{id}/preview` para colaborador con cuota pendiente en el período retorna `prestamos_pendientes` con la cuota correcta.
- [ ] `GET /nomina-empleado/{id}/preview` para **operario** NO retorna `prestamos_pendientes`.
- [ ] `POST /nomina-empleado/{id}/liquidar` con `prestamo_cuota_id`: crea deducción en `nomina_empleado_concepto`, marca cuota APLICADA, decrementa `saldo_pendiente`, incrementa `cuotas_pagadas`.
- [ ] Cuando `cuotas_pagadas == num_cuotas`, el préstamo cambia automáticamente a `estado=PAGADO`.
- [ ] `PUT /prestamos/{id}` intentando cambiar `valor_total` con cuotas aplicadas → 422 `PRESTAMO_NO_EDITABLE`.
- [ ] `DELETE /prestamos/{id}` → soft-delete + `estado=CANCELADO`. Las cuotas PENDIENTE dejan de aparecer en previews futuros.
- [ ] **Regresión:** liquidar un empleado sin `prestamo_cuota_id` en ninguna deducción sigue funcionando igual que antes.

---

## Riesgos por PR

| PR | Riesgo principal | Mitigación |
|---|---|---|
| PR-1 | Backfill `tarifa_jornal` inconsistente con `JornalCalculationService` | Migración + ajuste del servicio en el **mismo PR**. Test de backfill obligatorio. |
| PR-2 | Paso 3 obligatorio rompe nóminas sin cosechas | Validación condicional: solo exigir paso 3 si hay `cosecha_cuadrilla` en el rango |
| PR-3 | Romper cálculo de empleado existente | Test de regresión obligatorio antes de mergear; revisión 4-ojos del diff en `NominaCalculationService` y `NominaEmpleadoController` |
| PR-3 | Frontend rompe porque cambió el payload de `/empleados-disponibles` | Coordinar el merge con frontend; documentar el cambio antes (RFC corto en el PR) |
| PR-4 | PDF del acta con encoding/layout mal en Windows | Probar render en entorno destino antes de mergear |
| PR-4 | Cerrar nómina con tercero presente sin liquidar lo bloquea sin que el usuario sepa por qué | Mensaje de error 409 debe incluir `tercero_ids` faltantes en `errors` |
| PR-5 | Indicadores con N+1 | Forzar 1 query agregada; test de queries con `DB::enableQueryLog()` |
| PR-5 | Frontend lee `total_devengado` y se rompe si lo quitamos | Mantenerlo deprecated en el response 1 versión completa antes de eliminarlo |
| PR-6 | Edge case no contemplado | Buffer de 20-30% sobre estimación |

---

## Calendario sugerido (1 dev + IA, full-time)

| Semana | Sprints en curso |
|---|---|
| 1 | PR-1 |
| 2 | PR-2 (mitad) + PR-3 inicio (en paralelo si hay capacidad) |
| 3 | PR-2 mergeado + PR-3 mergeado |
| 4-5 | PR-4 |
| 5.5 | PR-5 (overlap con final de PR-4) |
| 6.5-7 | PR-6 |

**Total: ~7 semanas (~140-200h)** — sube ~10-15% vs. estimación previa por la reescritura del doc y los ajustes a los endpoints legados.

---

## Definition of Done (aplicable a cada PR)

- [ ] Tests verdes en CI.
- [ ] `php artisan test` no rompe ningún test legado.
- [ ] Migración aplicada y revertida limpiamente en staging.
- [ ] [API_NOMINA.md](API_NOMINA.md) actualizado para endpoints/payloads/errores tocados en el PR.
- [ ] PR-description con: scope, screenshots/curl, checklist de regresión.
- [ ] Code review aprobado (4-ojos para PR-3 y PR-4 mínimo).
- [ ] Si el PR cambia un endpoint existente: nota en el changelog del PR para coordinación con frontend.

---

## PR-4.1 — Descuentos por operario en el acta de tercero (post-PR-4)

**Objetivo:** extender el `PUT /nominas/{id}/terceros/{tercero}/operarios/{op}` para aceptar un descuento con **concepto identificado** (dropdown del catálogo `DEDUCCION_VOLUNTARIA`), además del `ajuste` numérico ya existente. Motivación operativa: hoy el ajuste es un valor bruto sin trazabilidad; el frontend requiere que el liquidador pueda registrar por qué se descontó (herramienta extraviada, adelanto, uniforme…).

**Estimación:** 6-10h. **Depende de:** PR-4. **Impacto:** aditivo — actas existentes tienen `descuento_valor=0` y `descuento_concepto_id=NULL` → subtotal idéntico al previo.

### Cambios de código

| Archivo | Cambio |
|---|---|
| `database/migrations/2026_07_07_000001_alter_nomina_tercero_operario_add_descuento_fields.php` | NUEVO — +3 columnas nullable: `descuento_concepto_id` (FK → `nomina_conceptos`, RESTRICT), `descuento_valor` (DECIMAL(12,2) DEFAULT 0), `descuento_observacion` (VARCHAR(255) NULL) |
| [app/Models/NominaTerceroOperario.php](../app/Models/NominaTerceroOperario.php) | +3 fillable, +2 casts, +relación `descuentoConcepto()` → BelongsTo(NominaConcepto) |
| [app/Http/Requests/Nomina/ActualizarOperarioActaRequest.php](../app/Http/Requests/Nomina/ActualizarOperarioActaRequest.php) | +3 reglas + `withValidator()`: (1) si `descuento_valor > 0` exige `descuento_concepto_id`, (2) verifica que el concepto sea del tenant, `tipo=DEDUCCION_VOLUNTARIA` y `activo=true` → si no, 422 `DESCUENTO_CONCEPTO_INVALIDO` |
| [app/Services/Nomina/LiquidarTerceroService.php](../app/Services/Nomina/LiquidarTerceroService.php) | (1) `actualizarLineaOperario()`: nueva fórmula `subtotal = (dias × tarifa_dia) + ajuste − descuento_valor` + limpia el concepto si `descuento_valor=0`. (2) `liquidar()`: preserva `descuento_*` en re-liquidación (idempotente) y descuenta al `total_a_transferir` de cabecera |
| [app/Services/Pdf/ActaTerceroPdfService.php](../app/Services/Pdf/ActaTerceroPdfService.php) | Eager-load `operarios.descuentoConcepto:id,codigo,nombre` + 3 claves nuevas en el array de cada operario |
| [resources/views/desprendible/acta_tercero.blade.php](../resources/views/desprendible/acta_tercero.blade.php) | +2 columnas en la tabla de operarios (Descuento con concepto + observación, Desc. Valor). Anchos ajustados |
| [docs/API_NOMINA.md](API_NOMINA.md) | §0 nuevo código `DESCUENTO_CONCEPTO_INVALIDO`, §7.2 payload extendido, §7.4 fórmula + request + semántica ajuste vs descuento |

### Endpoints

Sin rutas nuevas. Solo se extiende el body de:

```
PUT /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/operarios/{op}
```

### Fórmula

```
subtotal          = (dias × tarifa_dia) + ajuste − descuento_valor
total_a_transferir = SUM(subtotal de líneas) + total_cosecha
```

`recalcularTotalesActa()` no requiere cambios: ya suma `subtotal` de líneas, y el subtotal ahora trae el descuento aplicado.

### Semántica `ajuste` vs `descuento_valor`

- `ajuste`: numérico libre (± bonos, redondeos), sin concepto. Se mantiene como estaba.
- `descuento_valor`: siempre ≥ 0, siempre resta. Requiere `descuento_concepto_id` cuando > 0.
- Reusa el catálogo existente sin cambios: `GET /nomina-conceptos/select?tipo=DEDUCCION_VOLUNTARIA` (mismo dropdown que empleados propios).

### Criterios de aceptación

- [ ] `php artisan migrate` corre limpio en dev y staging. Actas existentes tienen `descuento_valor=0` → regresión 0 en cálculo del subtotal.
- [ ] PUT operario con `{ descuento_concepto_id: 17, descuento_valor: 50000 }` → subtotal baja 50k, `total_a_transferir` de cabecera propaga.
- [ ] PUT con `descuento_valor: 50000` sin `descuento_concepto_id` → 422 con campo `descuento_concepto_id` requerido.
- [ ] PUT con `descuento_concepto_id` de tipo distinto o inactivo → 422 `DESCUENTO_CONCEPTO_INVALIDO`.
- [ ] Re-liquidar (`POST /liquidar`) tras editar descuento no pisa el valor manual (preserva igual que `ajuste`).
- [ ] PUT con `descuento_valor: 0` limpia también `descuento_concepto_id` y `descuento_observacion`.
- [ ] PDF muestra columnas "Descuento" y "Desc. Valor". `descuento_concepto=null` → celdas con `—`.
- [ ] **Regresión:** actas sin descuento (`descuento_valor=0` default) tienen subtotal idéntico al previo.
