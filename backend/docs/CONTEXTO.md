# CONTEXTO — Agro Campo v2

Documento de referencia técnica del sistema. Actualizado: **2026-07-10** (Planilla Diaria).

---

## §1. Visión general del proyecto

**Agro Campo v2** es una plataforma multi-tenant de gestión agrícola para fincas palmeras en Colombia. Centraliza operaciones de campo, personal, transporte y nómina en una sola API REST.

**Stack:**
- Laravel 12 · PHP 8.2+
- PostgreSQL (producción) / SQLite (tests in-memory)
- JWT Auth (`php-open-source-saver/jwt-auth`)
- Permisos: `spatie/laravel-permission`
- PDF: `barryvdh/laravel-dompdf`
- Excel/imports: `phpoffice/phpspreadsheet`
- IA: Claude Vision API (OCR de documentos de báscula)
- Monitoreo: Laravel Telescope + Laravel Pulse

---

## §2. Multi-tenancy

Cada **Tenant** representa una empresa/finca. Todas las tablas incluyen `tenant_id` y usan el trait `BelongsToTenant` (global scope automático).

**Resolución del tenant:** middleware `SetTenant` → lee `X-Tenant-Id` del header o del JWT y publica `app('current_tenant')`.

**Tres flujos de autenticación:**
1. **Super Admin** — `POST /v1/auth/login` → accede a `v1/admin/*`
2. **Usuario de Tenant** — `POST /v1/tenant-auth/login` → accede a `v1/tenant/*`
3. **Proveedor Marketplace** — `POST /v1/proveedor-auth/login` → accede a rutas market

**Tenant Model** (`app/Models/Tenant.php`):
- Datos empresa: `nombre`, `nit`, `razon_social`, `tipo_persona`, `representante_nombre`
- Plan: `plan`, `max_empleados`, `max_usuarios`
- Estado: `ACTIVO | SUSPENDIDO | INACTIVO`
- Métodos: `modulosActivos()`, `configNomina()`

**TenantConfig** (`app/Models/TenantConfig.php`):
- Toggles por módulo: `modulo_dashboard`, `modulo_plantacion`, `modulo_colaboradores`, `modulo_nomina`, `modulo_operaciones`, `modulo_viajes`, `modulo_market`
- Nómina: `tipo_pago_nomina` (QUINCENAL|MENSUAL), `salario_minimo_vigente`, `auxilio_transporte`, `divisor_jornada_mensual`
- Cortes de quincena: `dia_inicio_q1`, `dia_fin_q1`, `dia_inicio_q2`, `dia_fin_q2`
- Días laborales: `dias_vacaciones_anuales`, `dias_anio_comercial` (360), `dias_mes_comercial` (30)
- Entidades: EPS, AFP, ARL, Banco, Caja de compensación seleccionables por tenant

---

## §3. Módulos del sistema

| Módulo | Prefijo de ruta | Tablas principales |
|--------|-----------------|-------------------|
| Plantación | `/lotes`, `/sublotes`, `/lineas`, `/palmas` | `predios`, `lotes`, `sublotes`, `lineas`, `palmas` |
| Colaboradores | `/empleados`, `/cargos` | `empleados`, `empleado_contratos`, `empleado_documentos` |
| Operaciones | `/operaciones`, `/jornales`, `/ausencias` | `operaciones`, `jornales`, `registro_cosecha`, `ausencias`, `horas_extra` |
| Viajes | `/viajes` | `viajes`, `viaje_detalle`, `viaje_documento_bascula` |
| Nómina | `/nominas`, `/nomina-empleado`, `/prestamos` | ver §6 |
| Terceros | `/terceros`, `/operarios` | `terceros`, `operarios`, `tercero_labor_precios` |
| Configuración | `/configuracion/*` | `tenant_config`, `labores`, `precios_cosecha` |
| Marketplace | `/market/*` | `market_proveedores`, `market_productos`, `market_pedidos` |

---

## §4. Módulo Plantación

- **Predio** → **Lote** → **Sublote** → **Línea** → **Palma**
- Palmas tienen: `codigo_palma`, `estado` (ACTIVA|INACTIVA|ELIMINADA), referencias a sublote y línea
- Precios de cosecha (`precios_cosecha`): tabla de `$/kg` por lote × año × variedad, con historial
- Promedios de lote (`promedio_lote`): promedio actual de kg/palma por lote; actualizado por `ViajeCalculationService` — **read-only para el resto del sistema**

---

## §5. Módulo Colaboradores y Terceros

### 5.1 Colaborador (Empleado)

`app/Models/Empleado.php` — tabla `empleados`

- Identidad: `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `tipo_documento`, `documento`
- Laboral: `cargo`, `salario_base` (decimal:2), `subsidio_transporte` (bool), `modalidad_pago` (FIJO|PRODUCCION), `predio_id`
- Seguridad social: `eps`, `fondo_pension`, `fondo_cesantias`, `arl`, `caja_compensacion`
- Bancario: `tipo_cuenta`, `entidad_bancaria`, `numero_cuenta`
- Estado: `estado` (bool activo/inactivo)
- Relaciones: `contratos()`, `documentos()`, `jornales()`, `ausencias()`, `horasExtra()`, `nominaEmpleados()`, `vacaciones()`

### 5.2 Tercero (Contratista)

`app/Models/Tercero.php` — tabla `terceros`

- `tipo_persona` (JURIDICA|NATURAL), `nit`/`cedula`, `razon_social`/`nombre_completo`, `nombre_comercial`
- Bancario: `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`
- Accessor `datos_bancarios_completos` (bool): todos los campos bancarios rellenos
- Relaciones: `operarios()`, `laborPrecios()`, `preciosCosecha()`, `preciosAbono()`

### 5.3 Operario (trabajador de un tercero)

`app/Models/Operario.php` — tabla `operarios`

- Pertenece a un `Tercero` (`tercero_id`)
- Campos laborales propios: `cargo`, `cedula`, `nombres`, `apellidos`
- **No recibe nómina directa**: cobra a través del acta de su tercero (ver §6.7)
- **No puede recibir préstamos**: solo los Empleados (§6.8)

### 5.4 Precios de tercero

`TerceroLaborPrecio` — tabla `tercero_labor_precios`:
- `tercero_id`, `labor_id`, `tipo_pago` (POR_PALMA|JORNAL_FIJO), `precio_palma`, `tarifa_jornal`
- Accessor `precio_resuelto`: retorna `tarifa_jornal` si JORNAL_FIJO, `precio_palma` si POR_PALMA

---

## §6. Módulo Nómina (Payroll)

### §6.1 Estructura de tablas

| Tabla | Propósito |
|-------|-----------|
| `nominas` | Encabezado del período (mes/quincena/año, estado, totales globales) |
| `nomina_empleado` | Una fila por colaborador/operario por período |
| `nomina_empleado_concepto` | Conceptos de nómina por fila (SALUD, PENSION, bonos, descuentos) |
| `nomina_concepto` | Catálogo de conceptos del tenant |
| `nomina_tercero` | Acta agrupada por contratista (totales) |
| `nomina_tercero_operario` | Línea de detalle por operario dentro del acta |
| `nomina_tercero_operario_descuento` | N descuentos con concepto identificado por línea de operario |
| `nomina_validacion_cosecha` | Snapshot del paso 3 del wizard (validación de cosecha) |
| `nomina_promedio_lote` | Override de promedio por nómina × lote (no toca `promedio_lote`) |
| `nomina_jornal_ref` | Snapshot de jornales al cerrar |
| `nomina_cosecha_ref` | Snapshot de cosechas al cerrar |
| `nomina_hora_extra_ref` | Snapshot de horas extra al cerrar |
| `prestamos` | Préstamos/adelantos a colaboradores internos |
| `prestamo_cuotas` | Calendario de cuotas generado al crear el préstamo |

### §6.2 Estados de la nómina

```
nominas.estado:
  BORRADOR ──→ CERRADA (irreversible vía POST /cerrar)

nomina_empleado.estado:
  PENDIENTE ──→ LIQUIDADO (vía POST /liquidar; reversible solo si nomina en BORRADOR vía PUT /liquidacion)
```

### §6.3 Wizard frontend (4 pasos)

```
Paso 1: Elegir período         → POST /nominas
Paso 2: Elegir colaboradores   → POST /nominas/{id}/empleados + POST /nominas/{id}/terceros
Paso 3: Validar Cosecha        → GET /nominas/{id}/validar-cosecha
                               → PUT /nominas/{id}/promedios-lote/{lote}
                               → POST /nominas/{id}/validar-cosecha/confirmar
Paso 4: Confirmación           → (pre-hidrata nomina_tercero + nomina_tercero_operario con totales 0)

Post-wizard:
  → Liquidar colaborador        GET /nomina-empleado/{id}/preview
                                POST /nomina-empleado/{id}/liquidar
  → Liquidación de Terceros     GET /nominas/{id}/terceros-actas
                                GET /nominas/{id}/terceros/{id}
                                POST /nominas/{id}/terceros/{id}/liquidar
                                GET /nominas/{id}/terceros/{id}/operarios/{op}/detalle
                                POST /nominas/{id}/terceros/{id}/operarios/{op}/descuentos
                                DELETE /nominas/{id}/terceros/{id}/operarios/{op}/descuentos/{d}
                                POST /nominas/{id}/terceros/{id}/registrar-pago
  → Cerrar nómina               POST /nominas/{id}/cerrar
```

### §6.4 Empleado vs Operario en nómina

| Campo | Colaborador (Empleado) | Operario (de Tercero) |
|-------|----------------------|----------------------|
| `nomina_empleado.empleado_id` | NOT NULL | NULL |
| `nomina_empleado.operario_id` | NULL | NOT NULL |
| `nomina_empleado.tercero_id` | NULL | NOT NULL |
| Conceptos legales (SALUD/PENSION/FSP) | ✅ Sí | ❌ No |
| Subsidio de transporte | ✅ Si aplica | ❌ No |
| Ausencias | ✅ Sí | ❌ No |
| Bonificaciones/Deducciones voluntarias | ✅ Sí | ❌ No |
| Préstamos | ✅ Sí (§6.8) | ❌ No |
| Devengado | Salario base proporcional | Solo jornales + cosecha |
| Liquidación | `NominaCalculationService::liquidar()` | `::liquidarOperario()` |

### §6.5 Conceptos de nómina

`nomina_concepto` — catálogo por tenant:
- `tipo`: DEDUCCION_LEGAL | DEDUCCION_VOLUNTARIA | BONIFICACION_FIJA | BONIFICACION_VARIABLE
- `subtipo`: SALUD | PENSION | ARL | FONDO_SOLIDARIDAD | LIBRANZA | EMBARGO | **PRESTAMO** | AHORRO_VOLUNTARIO | PRODUCTIVIDAD | TRANSPORTE | ALIMENTACION | ANTIGUEDAD | OTRO
- `operacion`: SUMA | RESTA
- `calculo`: PORCENTAJE | VALOR_FIJO | FORMULA
- `base_calculo`: SALARIO_BASE | TOTAL_DEVENGADO | SALARIO_MINIMO | MANUAL

**Concepto sembrado por defecto:** `DCTO_ADELANTO` (codigo, tipo=DEDUCCION_VOLUNTARIA, subtipo=PRESTAMO, calculo=VALOR_FIJO, base_calculo=MANUAL) → usado por el módulo de Préstamos.

**Provisión automática de DCTO_ADELANTO:** se garantiza en tres capas:
1. `TenantController::seedNominaConceptos()` lo siembra al crear un tenant nuevo (catálogo completo, `soloActivos: false`).
2. `PrestamoService::crear()` llama `ensureConceptoPrestamo()` al crear el primer préstamo — crea el concepto si no existe.
3. `NominaCalculationService::liquidar()` lo auto-resuelve via `resolveConceptoPrestamo()` cuando `prestamo_cuota_id` llega sin `concepto_id`.

Para backfill de tenants existentes: `php artisan nomina:seed-conceptos` (idempotente).

### §6.6 Reglas de cálculo legales (Colombia)

- **Salud (empleado):** 4% sobre IBC (= total devengado sin subsidio transporte)
- **Pensión (empleado):** 4% sobre IBC
- **Fondo de Solidaridad Pensional (FSP):**
  - 1% si IBC ∈ (4 SMLV, 16 SMLV]
  - 1,2% si IBC ∈ (16 SMLV, 17 SMLV]
  - etc. (progresivo según decreto)
- **Subsidio de transporte:** aplica si `salario_base ≤ 2 SMLV`; monto proporcional a días trabajados = `auxilio_transporte × (dias_trabajados / dias_periodo)`
- **Empleado FIJO:** `devengado = salario_base × (dias_trabajados / dias_periodo)` (días del período según quincena/mes)
- **Empleado VARIABLE (PRODUCCION):** `devengado = Σ jornales + Σ cosechas` en el rango de fechas
- **Ausencias no remuneradas:** descuentan `dias_periodo` proporcional al salario base (FIJO)
- **Ausencias remuneradas (incapacidades):** empleador paga 66,67% desde día 3 (CST + Decreto 780/2016)
- **Horas extra y recargos:** se suman al devengado en columnas separadas (reporte UGPP/DIAN)

### §6.7 Acta de Tercero (PR-4.2)

`nomina_tercero` — agrupado por contratista:
- `estado_pago`: PENDIENTE | PAGADO
- Se **pre-hidrata** con totales 0 al agregar operarios (paso 4 del wizard)
- Se **liquida** via `LiquidarTerceroService::liquidar()` — suma jornales+cosecha de todos los operarios
- **Excepción:** `POST /registrar-pago` sigue habilitado después del cierre de nómina

`nomina_tercero_operario` — una línea por operario:
- `total_jornales`, `total_cosecha`, `subtotal`, `labores_realizadas` (JSON)
- Vista **solo-lectura** (no editable directamente en UI)

`nomina_tercero_operario_descuento` — N descuentos por línea:
- `concepto_id` FK → `nomina_concepto` (`tipo=DEDUCCION_VOLUNTARIA`)
- `subtotal_operario = total_jornales + total_cosecha − SUM(descuentos.valor)`
- `total_a_transferir = SUM(subtotales)` — sin suma separada de cosecha

Endpoints post-PR-4.2:
- `GET /operarios/{op}/detalle` — desglose de labores para el acordeón (solo-lectura)
- `POST /operarios/{op}/descuentos` — agregar descuento con concepto
- `DELETE /operarios/{op}/descuentos/{id}` — eliminar descuento

Validación de cierre: para cada contratista con operarios en la nómina debe existir `nomina_tercero` calculado (PENDIENTE o PAGADO); si falta → 409 `NOMINA_TERCERO_NO_LIQUIDADO`.

### §6.8 Módulo de Préstamos

Ver [API_PRESTAMOS.md](./API_PRESTAMOS.md) para documentación completa.

**Tablas:**
- `prestamos`: encabezado del préstamo (empleado, monto, cuotas, saldo, estado)
- `prestamo_cuotas`: calendario pre-generado de N cuotas con `(anio, mes, quincena)` de cada una

**Solo para Empleados** (colaboradores internos). Los operarios de tercero no pueden tener préstamos.

**Flujo:** `PrestamoService::crear()` → garantiza que DCTO_ADELANTO existe para el tenant → genera N cuotas en `prestamo_cuotas` → el preview de liquidación (`GET /nomina-empleado/{id}/preview`) incluye `prestamos_pendientes[]` para el período → el liquidador incluye la cuota en `deducciones_voluntarias` con `prestamo_cuota_id` (sin necesidad de enviar `concepto_id`; el backend lo resuelve automáticamente) → `NominaCalculationService::liquidar()` crea la entrada en `nomina_empleado_concepto` y llama `PrestamoService::aplicarCuota()`.

**Estados del préstamo:** VIGENTE → PAGADO (cuando todas las cuotas están APLICADAS) | CANCELADO (manual).
**Estados de la cuota:** PENDIENTE → APLICADA.

### §6.9 Promedios de lote en nómina

- `promedio_lote` (tabla): promedio general actualizado por `ViajeCalculationService` — **read-only** para el resto
- `nomina_promedio_lote` (tabla): override por `(nomina_id, lote_id)` — modificado por `ValidarCosechaService::ajustarPromedio()` durante el paso 3 del wizard
- `NominaCalculationService::sumarCosecha()` consulta `nomina_promedio_lote` con prioridad; si no hay override usa `AVG(promedio_lote)` como fallback

### §6.10 Snapshots al cerrar

Al ejecutar `POST /nominas/{id}/cerrar`, `CerrarNominaService` persiste snapshots históricos en:
- `nomina_jornal_ref` — jornales con tarifa al momento del cierre
- `nomina_cosecha_ref` — cosechas con promedio efectivo al momento del cierre
- `nomina_hora_extra_ref` — horas extra con tipo y recargo al cierre

### §6.11 Permisos de nómina

| Permiso | Scope |
|---------|-------|
| `nomina.ver` | Ver períodos, previews, indicadores, préstamos, actas |
| `nomina.editar` | Crear/editar períodos, agregar colaboradores, crear préstamos |
| `nomina.liquidar` | Liquidar colaboradores (POST /liquidar) |
| `nomina.cerrar` | Cerrar período de nómina |
| `nomina.pagar-tercero` | Registrar pago a contratista post-liquidación |

### §6.12 Servicios de nómina

| Servicio | Responsabilidad |
|----------|----------------|
| `NominaCalculationService` | Cálculo por empleado: preview, liquidar, liquidarOperario, recalcularTotales |
| `CerrarNominaService` | Cierre: validaciones, snapshots, estado CERRADA |
| `ValidarCosechaService` | Paso 3 del wizard: bundle cosecha vs extractora, ajuste de promedios |
| `AgrupadorJornalesService` | Resumen de trabajo agrupado por categoría (solo VARIABLE) |
| `DesprendibleService` | Generación JSON/PDF del desprendible de pago |
| `PrestamoService` | CRUD de préstamos, generación de cuotas, aplicación de cuota en liquidación |
| `HidratarActaTerceroService` | Pre-hidratación de `nomina_tercero` / `nomina_tercero_operario` |
| `LiquidarTerceroService` | Liquidación del acta agrupada; agregar/eliminar descuentos; desglose de labores |
| `RegistrarPagoTerceroService` | Marcado de pago del contratista (PENDIENTE → PAGADO) |
| `ActaTerceroPdfService` | Generación del PDF del acta de contratista (datos + blade) |

### §6.13 Preview de liquidación — detalle de horas extra y ausencias

`GET /nomina-empleado/{id}/preview` devuelve, además de los totales, el detalle línea a línea:

- `detalle_horas_extra[]` — cada hora extra APROBADA en el rango: tipo, fecha, horas, valor hora, % recargo, valor calculado.
- `detalle_ausencias[]` — cada ausencia APROBADA que afecta la nómina: tipo, motivo, fechas, días en rango, si es remunerada, valor calculado.
- `pendientes_por_aprobar{}` — conteo de horas extra y ausencias en estado PENDIENTE (no entran al cálculo; el frontend puede advertir al liquidador).

La misma información aparece en `GET /nomina-empleado/{id}/desprendible` → `liquidacion.detalle_horas_extra` y `liquidacion.detalle_ausencias` (consultadas por `nomina_id` una vez la nómina está CERRADA).

**Regla de estado:** solo registros en estado `APROBADA` entran al cálculo. Los `PENDIENTE` se excluyen silenciosamente y se exponen via `pendientes_por_aprobar` para visibilidad.

### §6.14 Reglas de validación del cierre

El `CerrarNominaService` valida en orden:
1. Nómina en BORRADOR (no ya CERRADA)
2. Si hay cosechas en el período: debe existir `nomina_validacion_cosecha.validado_at` → 409 `NOMINA_VALIDACION_COSECHA_REQUERIDA`
3. Todos los `nomina_empleado` deben estar en LIQUIDADO → 409 `EMPLEADOS_PENDIENTES`
4. Si hay operarios de terceros: cada contratista debe tener `nomina_tercero` calculado → 409 `NOMINA_TERCERO_NO_LIQUIDADO`

### §6.15 Planilla Diaria de Trabajo

Reporte de solo-lectura accesible desde el botón "Planilla Diaria" en el módulo de Pagos. Muestra todas las `Operacion` con `estado=APROBADA` dentro del rango del período, agrupadas por tipo de labor.

**Controller:** `App\Http\Controllers\Api\Nomina\NominaPlanillaDiariaController`

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/nominas/{nomina}/planilla-diaria` | Datos JSON con secciones por tipo de labor |
| `GET` | `/nominas/{nomina}/planilla-diaria/lotes` | Lotes únicos del período (para filtro dropdown) |
| `GET` | `/nominas/{nomina}/planilla-diaria/exportar` | Descarga Excel `.xlsx` |

**Permiso requerido:** `nomina.ver` (los 3 endpoints).

**Filtros soportados** (en `/planilla-diaria` y `/exportar`): `?colaborador=nombre`, `?lote_id=1`, `?fecha=YYYY-MM-DD`.

**Secciones:** `cosecha`, `plateo`, `poda`, `fertilizacion`, `sanidad`, `otros` (labores custom de palma), `auxiliares` (labores de finca).

**Lógica de agrupación:**
- Cosecha: 1 fila por `RegistroCosecha`; `pago_por_colaborador = valor_total / N`.
- Jornales: agrupados por `(operacion_id, labor_id, lote_id)`; `pago_por_colaborador = valor_unitario` individual.

**`col_neto`:** solo suma colaboradores internos (`empleado_id IS NOT NULL`). Los operarios de tercero quedan excluidos — su valor va al acta del contratista. `total_neto_colaboradores` = suma de todos los `col_neto`.

Ver [API_PLANILLA_DIARIA.md](./API_PLANILLA_DIARIA.md) para documentación completa de contratos, respuestas y ejemplos cURL.

---

## §7. Módulo Operaciones

**Flujo diario:**
```
Operacion (fecha + predio + sublote)
  → Jornal[] (empleado + labor + palmas/jornales trabajados)
  → RegistroCosecha[] (peso kg + lote + palmas cosechadas)
  → HoraExtra[] (empleado + tipo + horas)
  → Ausencia[] (empleado + motivo + días)
  → Operacion.estado: BORRADOR → APROBADA
```

Una vez APROBADA, la operación alimenta el cálculo de nómina.

**`JornalCalculationService`:** ramifica entre `POR_PALMA` (usa `precio_palma`) y `JORNAL_FIJO` (usa `tarifa_jornal`) vía accessor `precio_resuelto` de `TerceroLaborPrecio`/`Labor`.

---

## §8. Módulo Viajes

**Estados:** CREADO → EN_VALIDACION → FINALIZADO

**Flujo:**
1. Crear viaje (`POST /viajes` → estado `CREADO`). Auto-genera `remision = REM-{YYYY}-{NNN}` y toma snapshot de placa/conductor del transportador.
2. Agregar `ViajeDetalle` con cosechas de operaciones APROBADAS. El campo opcional `gajos_en_viaje` permite **cosechas partidas**: una misma cosecha puede repartirse en múltiples camiones, cada uno con su porción de gajos.
3. Reconteo de gajos por detalle (`PUT /detalles/{id}/reconteo` → campo `gajos_en_viaje`). Cada save recalcula `registro_cosecha.gajos_reconteo = SUM(gajos_en_viaje)` de todos los splits activos, manteniendo la nómina sincronizada.
4. Aprobar reconteo de cada detalle (`POST /detalles/{id}/aprobar-reconteo`). Cuando todos los detalles quedan aprobados, el viaje auto-transiciona a `EN_VALIDACION`. Alternativamente, `POST /saltar-validacion` para fincas que pagan por jornal.
5. Hidratar datos de la extractora: peso recibido, número de remisión, calidad de fruto (5 porcentajes). Vía captura manual (`PATCH /validar`) o OCR de la báscula (`POST /documento-bascula` → `ClaudeVisionService`).
6. `POST /finalizar` → `EN_VALIDACION → FINALIZADO`. `ViajeCalculationService::calcularAlFinalizar()` calcula el promedio kg/gajo por lote (usando `gajos_en_viaje` del detalle para splits) y acumula `cosecha_cuadrilla.peso_calculado_empleado` con `COALESCE + suma`.

**Cosechas partidas (splits):** cuando los gajos de una cosecha van en camiones distintos, cada `viaje_detalle` lleva su `gajos_en_viaje`. `ValidarCosechaService` expone `splits_pendientes` por cosecha en el paso 3 del wizard de nómina para alertar si algún split aún no ha finalizado (kg_extractora puede estar incompleto).

**Servicios:**
- `ViajeCalculationService` — cálculo HOMOGENEO/NO_HOMOGENEO al finalizar, acumulación en cuadrilla
- `RemisionGeneratorService` — generación atómica de `REM-{YYYY}-{NNN}`
- `ClaudeVisionService` — OCR del formulario de báscula (Claude Vision API)

---

## §9. Módulo Marketplace

Plataforma B2B de compra de insumos agrícolas.

**Entidades principales:**
- `MarketProveedor` — empresa vendedora (auth separada)
- `MarketProducto` / `MarketProductoImagen` / `MarketProductoPrecioVolumen`
- `MarketCarrito` / `MarketCarritoItem`
- `MarketPedido` / `MarketPedidoItem` / `MarketPedidoEstadoHistorial`

**Estado del módulo (2026-05-07):** tablas, modelos y seeder creados. Controllers y middleware `SetProveedor` pendientes.

---

## §10. Patrones de código

### Trait BelongsToTenant

Aplica global scope `where('tenant_id', app('current_tenant')->id)` automáticamente en todas las queries. Para saltar el scope: `Model::withoutGlobalScope('tenant')`.

### Migrations con guards PostgreSQL

```php
if (DB::getDriverName() === 'pgsql') {
    DB::statement("ALTER TABLE foo ADD CONSTRAINT foo_estado_check CHECK (estado IN ('A','B'))");
}
// SQLite usa ->change() en lugar de ALTER COLUMN
```

### Respuesta estándar de errores

```json
{ "message": "Descripción legible", "code": "SNAKE_CASE_CODE", "errors": {} }
```

### AuditoriaService

Registra `registrarCreacion()`, `registrarEdicion()`, `registrarEliminacion()` en tabla `auditorias` para todos los endpoints de escritura importantes.

### FormRequest autorización

```php
protected function failedAuthorization(): void {
    throw new HttpResponseException(response()->json([
        'message' => 'Sin permiso', 'code' => 'PERMISSION_DENIED'
    ], 403));
}
```

---

## §11. Archivos de documentación

| Archivo | Contenido |
|---------|-----------|
| [API_NOMINA.md](./API_NOMINA.md) | Todos los endpoints del módulo de Nómina (wizard + liquidación + terceros + préstamos) |
| [API_PLANILLA_DIARIA.md](./API_PLANILLA_DIARIA.md) | Reporte Planilla Diaria de Trabajo: 3 endpoints (datos JSON, lotes, Excel) |
| [API_PRESTAMOS.md](./API_PRESTAMOS.md) | Endpoints del módulo de Préstamos a colaboradores |
| [API_AUDITORIAS.md](./API_AUDITORIAS.md) | Endpoints de auditoría |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Documentación general de la API |
| [ROADMAP_NOMINA_TERCEROS.md](./ROADMAP_NOMINA_TERCEROS.md) | Hoja de ruta del módulo Nómina (PR-1 al PR-7) |
| [CHECKLIST_CONFIGURACION.md](./CHECKLIST_CONFIGURACION.md) | Checklist de configuración inicial |
