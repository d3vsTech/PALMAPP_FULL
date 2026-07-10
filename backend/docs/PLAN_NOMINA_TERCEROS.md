# Plan: Integración de Terceros a Nómina + Paso "Validar Cosecha"

> **Estado:** Plan en revisión. Pendiente integrar módulos de **Préstamos** y **Planilla Diaria** (el usuario enviará la info).

## Contexto

El módulo de Nómina actual ([app/Models/NominaEmpleado.php](../app/Models/NominaEmpleado.php), [app/Services/Nomina/NominaCalculationService.php](../app/Services/Nomina/NominaCalculationService.php)) está **totalmente orientado a empleados propios** (FK `empleado_id` único). El nuevo flujo que describen los mockups requiere:

1. **Paso 2 — Selección extendida**: agregar también operarios de terceros, mostrándolos como segundo bloque ("Colaboradores Terceros") con `Tarifa/Día` en lugar de `Salario Base`.
2. **Paso 3 NUEVO — Validar Cosecha**: comparar cosecha registrada por cada colaborador del período vs remisiones de extractora, permitiendo ajustar promedios anuales por lote (modal "Promedios Anuales") hasta que la diferencia tienda a 0.
3. **Paso 4 — Confirmación** (existente, sin cambios estructurales).
4. **Liquidación de terceros** en vista agrupada **por empresa contratista** (no por persona) con "Orden de pago", "Registrar Pago" y exportación PDF.

El backend tiene ya **base sólida**: Operarios y Terceros existen, los jornales/cosechas soportan `operario_id`/`tercero_id` con XOR, el cálculo de cosecha en nómina ya usa `AVG(PromedioLote del período)` con fallback a baseline ([app/Services/Nomina/NominaCalculationService.php:489-503](../app/Services/Nomina/NominaCalculationService.php#L489-L503)), `nomina_cosecha_ref.promedio_promedios_snapshot` ya existe, y los días de corte de quincena son configurables ([app/Models/Nomina.php:122-139](../app/Models/Nomina.php#L122-L139)).

Lo que falta es **integrar terceros al ciclo de liquidación**, **exponer la validación de cosecha**, y **construir la pista de pago a empresa contratista**.

---

## Estado actual — qué ya existe ✅ vs qué falta ❌

| Área | Estado | Detalle |
|---|---|---|
| Modelos Tercero / Operario | ✅ | [app/Models/Tercero.php](../app/Models/Tercero.php), [app/Models/Operario.php](../app/Models/Operario.php). CRUD funcional con `configuracion.editar` |
| Jornales/Cosechas con operario | ✅ | XOR validado en [app/Http/Requests/StoreJornalRequest.php:71-89](../app/Http/Requests/StoreJornalRequest.php#L71-L89). `tercero_id` auto-inyectado |
| Fallback de precios por tercero | ✅ | [app/Services/JornalCalculationService.php:174-188](../app/Services/JornalCalculationService.php#L174-L188), [app/Services/CosechaCalculationService.php:82-92](../app/Services/CosechaCalculationService.php#L82-L92) |
| Promedio de promedios + snapshot | ✅ | Migration `2026_06_14_000002_alter_nomina_cosecha_ref_add_snapshots.php`, columna `promedio_promedios_snapshot` |
| Días corte quincena configurables | ✅ | `tenant_config.dia_inicio_q1/dia_fin_q1/...`, usados en `Nomina::calcularRangoFechas` |
| `NominaEmpleado` soporta operarios | ❌ | Solo `empleado_id`. Sin `operario_id` ni `tercero_id` |
| Endpoint "Validar Cosecha" del período | ❌ | No existe. `PromedioLoteController` solo permite CRUD individual fuera del flujo de nómina |
| Liquidación a empresa contratista | ❌ | No existe ningún `TerceroPago`, `NominaTercero`, `liquidacion_terceros`. La pantalla "Liquidación de Terceros" del mockup no tiene contraparte backend |
| Datos bancarios en `terceros` | ❌ | Solo identificación y contacto. Falta `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta` |
| Cards superiores nuevas (Pagado a Colaboradores / a Terceros / Neto / Pendiente) | ❌ | `GET /nominas/indicadores` solo expone `total_devengado` global |
| Tarifa diaria de operario | ⚠️ | Vive en `tercero_labor_precios` (uniforme por contratista). Falta agregar columna `tarifa_jornal` separada — hoy `precio_palma` se reusa para ambos modos en [JornalCalculationService.php:100-106](../app/Services/JornalCalculationService.php#L100-L106) |
| Módulo de Préstamos / Adelantos | ❌ | Hoy `DCTO_ADELANTO` es solo concepto manual en la liquidación. Sin tabla, sin saldo, sin cronograma. **Pendiente diseño con info del usuario.** |
| Planilla Diaria impresible / PDF | ❌ | `Operacion` existe como transacción pero no hay vista impresible/PDF. **Pendiente diseño con info del usuario.** |

---

## Decisiones arquitectónicas confirmadas

1. **Estructura BD**: Extender `nomina_empleado` con `operario_id`/`tercero_id` (XOR). No se crean tablas paralelas.
2. **Días trabajados de operario**: Cálculo automático = `COUNT(DISTINCT operacion.fecha)` de jornales+cosechas en el período. Editable por el admin desde la pantalla de liquidación del tercero (el valor persistido prevalece sobre el cálculo automático).
3. **Cierre de nómina**: Se permite cerrar con `nomina_tercero` en estado `PENDIENTE`. El acta queda calculada y lista para girar; el `registrar-pago` puede ejecutarse después del cierre. (Esto requiere relajar la validación de `CerrarNominaService` para que solo bloquee si hay `nomina_empleado` PENDIENTES, no si hay `nomina_tercero` PENDIENTES.)
4. **Tarifa uniforme por contratista**: Todos los operarios de un mismo tercero cobran lo mismo por una labor dada. La fuente de verdad es `tercero_labor_precios` (UNIQUE por `tenant_id, tercero_id, labor_id`). No se requieren overrides por operario individual.
5. **`salario_tipo` no se extiende con `'TERCERO'`**: el motor ramifica por `operario_id IS NOT NULL`. La columna queda nullable cuando la fila es de un operario, evitando tocar `nomina_concepto.aplica_a` y los conceptos seedeados.
6. **Tarifa diaria se almacena en `tercero_labor_precios`** (no en `operarios`): cuando `tipo_pago=JORNAL_FIJO`, el monto vive en la columna `tarifa_jornal` de `tercero_labor_precios`. Se descarta `operarios.tarifa_dia_default` por redundante.

### Por qué extender `nomina_empleado`

- Reutiliza los snapshots ya existentes (`nomina_jornal_ref`, `nomina_cosecha_ref`, `nomina_hora_extra_ref`)
- Reutiliza el motor de cálculo de jornales/cosechas (que ya acepta `tercero_id`)
- La diferencia de comportamiento (operarios no llevan SALUD/PENSION/SUBSIDIO_TRANSPORTE) se ramifica en el `NominaCalculationService` mediante guarda `if ($ne->operario_id !== null) { ... }`

Para la **vista agrupada por empresa contratista** se crea una tabla complementaria `nomina_tercero` (un registro por nómina+tercero) que agrega totales, estado de pago y datos del giro bancario, **sin duplicar** la lógica de cálculo por operario.

---

## Cambios necesarios

### A. Base de datos (6 migraciones nuevas)

1. **`alter_nomina_empleado_add_operario.php`**
   - `empleado_id`: drop NOT NULL → nullable
   - `operario_id`: nullable FK → `operarios.id`, `restrictOnDelete`
   - `tercero_id`: nullable FK → `terceros.id`, `restrictOnDelete` (snapshot del contratista al momento de agregar)
   - `salario_tipo`: pasa a **nullable** cuando la fila es de un operario (no se agrega `'TERCERO'` al enum — ver Decisión 5)
   - CHECK XOR: exactamente uno de `empleado_id` u `operario_id` presente
   - CHECK: si `operario_id IS NOT NULL` → `tercero_id IS NOT NULL` (snapshot obligatorio)
   - Índice `(tenant_id, nomina_id, tercero_id)`
   - Índice `(tenant_id, operario_id)`

2. **`alter_terceros_add_datos_bancarios.php`**
   - `banco` VARCHAR(100) NULL
   - `tipo_cuenta` ENUM('AHORROS','CORRIENTE') NULL
   - `numero_cuenta` VARCHAR(50) NULL
   - `titular_cuenta` VARCHAR(150) NULL (opcional, default = razon_social/nombre_completo)
   - Estos campos quedan NULL en BD pero `RegistrarPagoTerceroRequest` los valida obligatorios al momento del pago (ver Sección F.5).

3. **`alter_tercero_labor_precios_add_tarifa_jornal.php`** — Separar semántica del precio
   - `tarifa_jornal` DECIMAL(12,2) NULL — monto cuando `tipo_pago=JORNAL_FIJO`
   - `precio_palma` queda solo para `tipo_pago=POR_PALMA` (sin cambio de tipo)
   - CHECK: `(tipo_pago='POR_PALMA' AND precio_palma IS NOT NULL) OR (tipo_pago='JORNAL_FIJO' AND tarifa_jornal IS NOT NULL) OR tipo_pago IS NULL`
   - **Backfill**: las filas existentes con `tipo_pago='JORNAL_FIJO'` deben copiar `precio_palma → tarifa_jornal` antes del CHECK (ver [JornalCalculationService.php:100-106](../app/Services/JornalCalculationService.php#L100-L106) — hoy reusa `precio_palma` para ambos modos).
   - Actualizar `JornalCalculationService::resolverPrecioLabor()` para leer la columna correcta según `tipo_pago`.

4. **`create_nomina_tercero_table.php`** — Resumen por empresa contratista para una nómina
   ```
   id, tenant_id, nomina_id FK, tercero_id FK,
   total_dias, total_jornales, total_cosecha, total_bruto,
   total_a_transferir,
   estado_pago ENUM('PENDIENTE','PAGADO'),
   orden_pago_numero VARCHAR(50) NULL,
   pagado_at TIMESTAMP NULL, pagado_por FK users NULL,
   metodo_pago ENUM('TRANSFERENCIA','EFECTIVO','CHEQUE') NULL,
   referencia_pago VARCHAR(100) NULL,
   observacion TEXT NULL,
   timestamps,
   UNIQUE(nomina_id, tercero_id),
   INDEX(tenant_id, nomina_id),
   INDEX(tenant_id, tercero_id, estado_pago)
   ```
   *Sin `ajuste_manual` a nivel acta — los ajustes se hacen a granularidad de operario en la tabla 5. Si más adelante se requiere bono/redondeo global se agrega.*

5. **`create_nomina_tercero_operario_table.php`** — Detalle por operario dentro del acta de pago al tercero
   ```
   id, tenant_id, nomina_tercero_id FK, operario_id FK,
   dias INT, tarifa_dia DECIMAL(12,2),
   ajuste DECIMAL(12,2) DEFAULT 0,
   subtotal DECIMAL(12,2),
   labores_realizadas JSON (snapshot de tipos: ["Cosecha","Plateo"]),
   observacion TEXT NULL,
   timestamps,
   UNIQUE(nomina_tercero_id, operario_id)
   ```

6. **`create_nomina_validacion_cosecha_table.php`** — Snapshot del paso 3 (ajuste de promedios)
   ```
   id, tenant_id, nomina_id FK,
   total_kg_colaboradores DECIMAL(12,2),
   total_kg_extractora DECIMAL(12,2),
   diferencia_kg DECIMAL(12,2),
   detalle_por_colaborador JSON,
   validado_por FK users, validado_at TIMESTAMP,
   timestamps,
   UNIQUE(nomina_id)
   ```
   *UNIQUE en `nomina_id` permite re-ejecutar el paso 3 mediante `upsert` mientras la nómina esté en BORRADOR — el último snapshot pisa al anterior.*

> **Descartadas del plan original:**
> - ~~`alter_operarios_add_tarifa.php`~~ — la tarifa diaria vive en `tercero_labor_precios.tarifa_jornal` (uniforme por contratista, ver Decisión 4 y 6).
> - ~~`alter_jornales_add_observacion_tercero.php`~~ — YAGNI; la observación por operario ya está en `nomina_tercero_operario.observacion`.
> - ~~`alter_nomina_cosecha_ref_add_diferencia_extractora.php`~~ — redundante; la auditoría agregada vive en `nomina_validacion_cosecha`. Las remisiones no mapean 1:1 con `cosecha_cuadrilla`.

### B. Modelos

| Archivo | Cambio |
|---|---|
| [app/Models/NominaEmpleado.php](../app/Models/NominaEmpleado.php) | Agregar `operario_id`, `tercero_id` a `$fillable`. Relaciones `operario()`, `tercero()`. Helpers `esDeTercero()`, `esDeEmpleado()`. (No se agrega constante `TIPO_TERCERO` — la rama se detecta por `operario_id !== null`.) |
| [app/Models/Tercero.php](../app/Models/Tercero.php) | Agregar `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta` a `$fillable`. Accessor `datos_bancarios_completos` |
| [app/Models/TerceroLaborPrecio.php](../app/Models/TerceroLaborPrecio.php) | Agregar `tarifa_jornal` a `$fillable`. Accessor `precio_resuelto` que devuelve `precio_palma` o `tarifa_jornal` según `tipo_pago` |
| `app/Models/NominaTercero.php` (nuevo) | Modelo nuevo con relaciones a Nomina, Tercero, NominaTerceroOperario[] |
| `app/Models/NominaTerceroOperario.php` (nuevo) | Modelo nuevo |
| `app/Models/NominaValidacionCosecha.php` (nuevo) | Modelo nuevo |

### C. Servicios

| Archivo | Cambio |
|---|---|
| [app/Services/JornalCalculationService.php](../app/Services/JornalCalculationService.php) | En `resolverPrecioLabor()` (líneas 174-188) leer `tarifa_jornal` cuando `tipo_pago=JORNAL_FIJO` y `precio_palma` cuando `POR_PALMA`. **Hoy ambos casos leen `precio_palma`** — corregir tras la migración 3 |
| [app/Services/Nomina/NominaCalculationService.php](../app/Services/Nomina/NominaCalculationService.php) | Ramificar `liquidar(NominaEmpleado $ne)`: si `$ne->operario_id !== null` → llamar a `liquidarOperario()` (sin SALUD/PENSION/FSP/SUBSIDIO_TRANSPORTE). Adaptar `sumarJornales()` (líneas 424-432) y `sumarCosecha()` (líneas 446-523) para aceptar `operario_id`, hoy hardcodeado a `empleado_id`. `contarDiasConJornal()` (líneas 408-419) debe contar `DISTINCT operaciones.fecha` filtrando por operario cuando aplique |
| `app/Services/Nomina/ValidarCosechaService.php` (nuevo) | Construye payload del paso 3: total kg trabajado por colaborador (jornales+cosechas) vs total kg de remisiones del período. Agrega filtro por lote+sublote |
| `app/Services/Nomina/LiquidarTerceroService.php` (nuevo) | Calcula `nomina_tercero` agregando jornales+cosechas de todos los operarios del tercero. Genera `nomina_tercero_operario` con días trabajados (distinct DATE) y tarifa promedio resuelta por labor desde `tercero_labor_precios` |
| `app/Services/Nomina/RegistrarPagoTerceroService.php` (nuevo) | Marca `nomina_tercero.estado_pago=PAGADO`, registra orden de pago, fecha, método y referencia. Genera PDF del acta |
| [app/Services/Nomina/CerrarNominaService.php](../app/Services/Nomina/CerrarNominaService.php) | Adaptar `snapshotJornales`/`snapshotCosechas` para soportar `operario_id` (cuando `nomina_empleado.operario_id` no es null, snapshotear jornales por operario en vez de empleado). Validar que `nomina_tercero` esté en estado coherente |

### D. Controllers y Rutas (endpoints nuevos)

```
# Paso 2 — selección extendida
GET    /api/v1/tenant/nominas/{nomina}/terceros-disponibles
POST   /api/v1/tenant/nominas/{nomina}/terceros          { tercero_ids: [], operario_ids?: [] }
DELETE /api/v1/tenant/nominas/{nomina}/terceros/{terceroId}

# Paso 3 — Validar Cosecha
GET    /api/v1/tenant/nominas/{nomina}/validar-cosecha           # bundle de comparación
PUT    /api/v1/tenant/nominas/{nomina}/promedios-lote/{lote}     # ajuste rápido del promedio (crea baseline si no existe)
POST   /api/v1/tenant/nominas/{nomina}/validar-cosecha/confirmar # persiste snapshot en nomina_validacion_cosecha

# Liquidación de terceros (nueva vista)
GET    /api/v1/tenant/nominas/{nomina}/terceros                  # resumen por empresa con totales
GET    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}        # detalle acta + operarios
POST   /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/liquidar
PUT    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/operarios/{op}  # ajustar dias/tarifa/observación
POST   /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/registrar-pago  { metodo, referencia, observacion }
GET    /api/v1/tenant/nominas/{nomina}/terceros/{tercero}/acta/pdf         # PDF del acta de pago

# Indicadores nuevos (cards superiores del listado)
GET    /api/v1/tenant/nominas/indicadores  # extender: total_colaboradores, total_terceros, neto_pagar, pendiente_pagar
```

### E. FormRequests nuevos

- `AgregarTercerosNominaRequest` — valida `tercero_ids[]`, `operario_ids[]` (cumple constraint que cada operario pertenezca a un tercero seleccionado)
- `AjustarPromedioLoteNominaRequest` — valida `lote_id`, `promedio` (decimal > 0)
- `LiquidarTerceroRequest` — valida ajustes por operario
- `RegistrarPagoTerceroRequest` — valida `metodo_pago`, `referencia_pago`, `pagado_at`

### F. Validaciones / reglas de negocio

1. **XOR estricto** en `nomina_empleado`: igual que en `jornales` — un FormRequest valida y un CHECK constraint blinda.
2. **Cierre de nómina**: ahora valida que `nomina_tercero` también esté en estado consistente (`PAGADO` o `PENDIENTE`, no `EN_AJUSTE`).
3. **Ajuste de promedios**: solo permitido si nómina está `BORRADOR`. Crea/actualiza registro en `promedio_lote` con `viaje_id=NULL` (baseline) marcado con `created_at` dentro del período de la nómina para que `AVG()` lo recoja.
4. **Operario sin tarifa**: si `tercero_labor_precios` no resuelve para una labor que el operario reportó → **422 `TERCERO_LABOR_SIN_PRECIO`** indicando `tercero_id`, `labor_id` y `tipo_pago` esperado. No hay fallback en `operarios` (ver Decisión 6).
5. **Datos bancarios al registrar pago**: `RegistrarPagoTerceroRequest` valida que `tercero.banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta` estén presentes **solo si `metodo_pago=TRANSFERENCIA`**. Para `EFECTIVO`/`CHEQUE` se omite la validación bancaria.
6. **Tarifa uniforme por contratista**: el motor NO permite override de tarifa por operario individual. Si se requiere distinguir, se ajusta la labor (crear sub-labores) o se documenta como `observacion` en `nomina_tercero_operario` con `ajuste` manual (no como nueva tarifa).

---

## Archivos críticos a modificar

| Path | Razón |
|---|---|
| [app/Models/NominaEmpleado.php](../app/Models/NominaEmpleado.php) | Soporte XOR empleado/operario |
| [app/Models/Tercero.php](../app/Models/Tercero.php) | Datos bancarios |
| [app/Models/TerceroLaborPrecio.php](../app/Models/TerceroLaborPrecio.php) | Nueva columna `tarifa_jornal` para `tipo_pago=JORNAL_FIJO` |
| [app/Services/JornalCalculationService.php](../app/Services/JornalCalculationService.php) | Leer `tarifa_jornal` vs `precio_palma` según `tipo_pago` |
| [app/Services/Nomina/NominaCalculationService.php](../app/Services/Nomina/NominaCalculationService.php) | Ramificación operario/empleado |
| [app/Services/Nomina/CerrarNominaService.php](../app/Services/Nomina/CerrarNominaService.php) | Snapshots por operario |
| [app/Http/Controllers/Api/Nomina/NominaController.php](../app/Http/Controllers/Api/Nomina/NominaController.php) | Indicadores extendidos |
| [app/Http/Controllers/Api/Nomina/NominaEmpleadoController.php](../app/Http/Controllers/Api/Nomina/NominaEmpleadoController.php) | `empleadosDisponibles()` debe excluir operarios ya agregados |
| [routes/api.php](../routes/api.php) (líneas 428-483) | Registrar todas las rutas nuevas |
| [database/migrations/](../database/migrations/) | 6 migrations nuevas (ver Sección A) |

---

## Hoja de ruta — sprints sugeridos

| Sprint | Duración estimada (con IA) | Entregables |
|---|---|---|
| **1. Migrations + modelos** | 1 semana (~16-24h) | Las 6 migrations, modelos extendidos, tests unitarios de relaciones y XOR, backfill de `tarifa_jornal` |
| **2. Paso 3 — Validar Cosecha** | 1 semana (~20-28h) | `ValidarCosechaService`, 3 endpoints, snapshot table, ajuste de baseline desde nómina, tests integración |
| **3. Integración operarios en `nomina_empleado`** | 1 semana (~20-28h) | Ramificación en `NominaCalculationService`, `empleadosDisponibles` extendido, agregar/quitar operarios, preview y liquidar operario, tests |
| **4. Liquidación de terceros** | 2 semanas (~40-50h) | `nomina_tercero` + `nomina_tercero_operario`, `LiquidarTerceroService`, `RegistrarPagoTerceroService`, 7 endpoints, generación PDF acta (DomPDF), tests |
| **5. Indicadores + cards + ajustes finales** | 0.5 semana (~6-10h) | `GET /nominas/indicadores` extendido (4 cards), filtros, docs API actualizada |
| **6. QA, regresión y hardening** | 1 semana (~20-30h) | E2E del wizard completo, regresión de nómina existente (FIJO y VARIABLE), cierre con terceros mezclados, edge cases (operario sin precios), docs |
| **7. Módulo de Préstamos** | _Por definir con info del usuario_ | Pendiente |
| **8. Planilla Diaria impresible** | _Por definir con info del usuario_ | Pendiente |

**Total estimado (sin préstamos ni planilla):** ~5.5 semanas (~120-170h) con un desarrollador asistido por IA. Sin IA, multiplicar por 1.5×–2× (8-11 semanas).

---

## Riesgos y consideraciones

1. **Compatibilidad hacia atrás**: las nóminas existentes (solo empleados) deben seguir funcionando sin tocar. El CHECK XOR sobre `nomina_empleado` requiere que las filas existentes tengan `operario_id IS NULL` — garantizado al añadir la columna como nullable.
2. **Snapshots históricos**: `nomina_jornal_ref` y `nomina_cosecha_ref` siguen apuntando a `jornal_id`/`cosecha_cuadrilla_id` (no a operario), por lo que el snapshot se mantiene íntegro independientemente del XOR.
3. **Backfill de `tarifa_jornal`**: la migración 3 debe copiar `precio_palma → tarifa_jornal` para todas las filas con `tipo_pago='JORNAL_FIJO'` **antes** de activar el CHECK. Cualquier desfase entre `JornalCalculationService` (que hoy lee `precio_palma`) y los datos backfilleados rompe el cálculo. Hacer migración + ajuste del servicio en el mismo PR.
4. **PDF del acta de tercero**: nuevo template Blade (`resources/views/desprendible/acta_tercero.blade.php`). Reusa estilos del desprendible existente.
5. **Cálculo de "días" para operario**: COUNT(DISTINCT operacion.fecha) precalculado por backend y editable por el admin. La columna `nomina_tercero_operario.dias` guarda el valor final (con override aplicado) — no el cálculo crudo.
6. **Ajuste de promedios dentro de nómina** debe quedar trazado en `nomina_validacion_cosecha.detalle_por_colaborador` para auditoría — el cambio se aplica a `promedio_lote` global y afectaría otras nóminas del mismo período si las hubiera; mitigación: solo permitir si no hay otra nómina del mismo lote+rango cerrada.
7. **Cierre con terceros pendientes**: nóminas cerradas pueden tener `nomina_tercero.estado_pago=PENDIENTE`. El endpoint `POST /nominas/{nomina}/terceros/{tercero}/registrar-pago` debe seguir funcionando aunque `nomina.estado=CERRADA` (única excepción al patrón "CERRADA = inmutable"). Importante documentar en API_NOMINA.md.
8. **Tarifa uniforme**: dos operarios del mismo contratista con tarifas distintas no son representables en `tercero_labor_precios` (UNIQUE por tercero+labor). Si en el futuro aparece este caso, la salida es crear sub-labores o agregar `operario_id NULL` a la unique. Por ahora, los `ajuste` por operario en `nomina_tercero_operario` cubren correcciones puntuales.

---

## Verificación end-to-end

1. **Migrations**: `php artisan migrate` sin errores. `php artisan migrate:rollback` reversible.
2. **Tests unitarios**: `php artisan test --filter=Nomina` debe pasar incluyendo casos nuevos (operario en `nomina_empleado`, validar-cosecha, liquidar tercero).
3. **Flujo wizard completo (manual con cURL o Postman)**:
   - Crear nómina QUINCENAL 5/2026
   - Agregar 2 empleados + 2 operarios de 2 terceros distintos
   - Validar cosecha → ajustar promedio del lote 1 → confirmar paso 3
   - Liquidar empleado FIJO + VARIABLE
   - Liquidar tercero 1 (acta) + registrar pago
   - Liquidar tercero 2 (acta) sin pagar todavía
   - Cerrar nómina → verificar snapshots en `nomina_cosecha_ref` con `promedio_promedios_snapshot`, snapshots por operario en `nomina_jornal_ref`, `nomina_tercero` con totales finales
4. **Regresión**: crear una nómina solo de empleados (sin terceros) y verificar que el flujo legado siga intacto.
5. **PDFs**: descargar desprendible de empleado + acta de tercero, validar layout.

---

## Módulos pendientes (esperando info del usuario)

### Préstamos / Adelantos

**Estado actual:** solo existe el concepto `DCTO_ADELANTO` como entrada manual en la liquidación de nómina ([database/seeders/NominaConceptoSeeder.php:246-255](../database/seeders/NominaConceptoSeeder.php#L246-L255)). No hay tabla de solicitudes, aprobaciones, saldo pendiente ni cronograma de cuotas.

**Preguntas pendientes para el usuario:**
- ¿Aplica solo a empleados propios o también a operarios de terceros?
- ¿Hay flujo de aprobación (jefe/RRHH) o el admin lo registra directo?
- ¿Cuotas (descuento por X nóminas) o pago único en la siguiente?
- ¿Se permite refinanciar?
- ¿Tope máximo (% del salario)?

### Planilla Diaria

**Estado actual:** `Operacion` existe como transacción ([app/Models/Operacion.php](../app/Models/Operacion.php)) y soporta jornales/cosechas de empleados y operarios. **No hay vista impresible ni endpoint PDF.**

**Preguntas pendientes para el usuario:**
- ¿La planilla impresa debe firmarse en campo (papel) y luego subir/transcribir?
- ¿Una planilla por finca/lote/cuadrilla o una global del día?
- ¿Debe separar empleados y operarios visualmente o ir mezclados?
- ¿Formato Excel (operativo) + PDF (entregable al contratista) o solo uno?

---

## Resumen ejecutivo

- **Estado:** ~60% de los building blocks ya existen (terceros, operarios, jornales, snapshots, promedios). El gap principal es **integrar operarios al ciclo de liquidación** y **construir la vista de pago a empresa contratista**.
- **Esfuerzo:** ~5-6 semanas con un desarrollador asistido por IA (sin contar Préstamos ni Planilla Diaria, que están en espera de definición).
- **Riesgo:** bajo a medio. La pieza más delicada es la ramificación en `NominaCalculationService` y mantener intacto el flujo de nómina empleado-only existente.
- **Decisiones cerradas (confirmadas con el usuario):** extender `nomina_empleado` (XOR), días automáticos con override manual, cierre permite terceros PENDIENTES, **tarifa uniforme por contratista** (no override por operario), **tarifa diaria vive en `tercero_labor_precios.tarifa_jornal`** (no en `operarios`), `salario_tipo` queda NULL para operarios (no se agrega `'TERCERO'` al enum).
