# AGRO CAMPO — Contexto Completo del Proyecto

## 1. ¿Qué es AGRO CAMPO?

AGRO CAMPO es un sistema de gestión integral para plantaciones de palma de aceite en Colombia. Administra todo el ciclo operativo de una finca palmera: la estructura del cultivo (predios, lotes, sublotes, líneas, palmas), el personal (empleados con sus cargos y contratos), las operaciones diarias de campo (jornales de trabajo y cosecha de fruto), y el proceso de nómina quincenal o mensual incluyendo todas las prestaciones sociales colombianas (EPS, ARL, pensión, caja de compensación, cesantías, prima, vacaciones, liquidación).

El sistema está diseñado como plataforma multi-tenant, lo que significa que una sola instalación sirve a múltiples fincas o empresas agrícolas, cada una completamente aislada de las demás. Un super-administrador global controla la creación y gestión de estas fincas desde un panel central.

---

## 2. Stack Tecnológico

### Backend (este proyecto)
- **Framework:** Laravel 12 (PHP 8.4) — funciona exclusivamente como API REST
- **Base de datos:** PostgreSQL 16
- **Autenticación:** JWT via `php-open-source-saver/jwt-auth`
- **Permisos:** Spatie Permission con soporte de teams (team_foreign_key = tenant_id)
- **Monitoreo:** Laravel Pulse (dashboard en /pulse, accesible solo para super-admin)
- **Debugging:** Laravel Telescope (solo en entorno local)
- **Colas:** Database queue (QUEUE_CONNECTION=database)
- **Caché:** Driver `file` (`CACHE_STORE=file`) — claves canónicas y TTLs en `App\Support\WizardCache`. Ver §13 para la estrategia completa.

### Frontend (proyecto separado, por construir)
- Recomendado: Vue 3 + Nuxt 3, o React con Next.js
- PWA con soporte offline para registro de jornales y cosechas en campo
- Comunicación con el backend exclusivamente via API REST + JWT

### Infraestructura local de desarrollo
- Laragon en Windows con PostgreSQL habilitado
- Proyecto ubicado en `C:\laragon\www\agro-campo`
- URL local: `http://agro-campo.test`

---

## 3. Arquitectura Multi-Tenant

### 3.1 Estrategia: Base de datos compartida con `tenant_id`

Se eligió la estrategia de **shared database with tenant_id column** sobre las alternativas de schemas separados o bases de datos separadas. Todas las tablas de negocio tienen una columna `tenant_id` que referencia a la tabla `tenants`. Esto significa que los datos de todas las fincas conviven en las mismas tablas, pero se filtran automáticamente por tenant.

**¿Por qué esta estrategia?**
- Una sola base de datos que respaldar y migrar
- Agregar un nuevo tenant es simplemente insertar un registro en `tenants`, no crear schemas ni bases nuevas
- Escala a cientos de tenants sin complejidad operacional
- Laravel maneja el aislamiento de forma transparente con Global Scopes

### 3.2 Tablas globales (sin tenant_id)

Estas tablas no pertenecen a ningún tenant:

**`tenants`** — Cada registro es una finca o empresa agrícola. Contiene nombre, NIT, datos de contacto, estado (ACTIVO/INACTIVO/SUSPENDIDO), plan (BASICO/PROFESIONAL/ENTERPRISE), y límites (max_empleados, max_usuarios). Tiene soft deletes.

**`tenant_config`** — Configuración individual de cada tenant con relación 1:1. Aquí se define si la finca usa jornales (`usa_jornales`), si usa producción/cosecha (`usa_produccion`), el tipo de pago de nómina (`QUINCENAL` o `MENSUAL`), el salario mínimo vigente, el auxilio de transporte, el **divisor de jornada mensual** para el cálculo de horas extras (`divisor_jornada_mensual`, 240 por default — CST tradicional; 210 bajo Ley 2101/2021), qué módulos están habilitados (vacaciones, liquidación, insumos), y si tiene sincronización offline activa. También tiene un campo `configuracion_extra` tipo JSONB para configuraciones dinámicas futuras.

**`users`** — Usuarios del sistema. Tiene dos campos adicionales: `is_super_admin` (booleano, da acceso al panel de administración global) y `status` (activo/inactivo). Un usuario puede pertenecer a múltiples tenants con roles distintos.

**`tenant_user`** — Tabla pivot que conecta usuarios con tenants. Cada registro tiene un `rol` (ADMIN o USUARIO) y un `estado`. El ADMIN tiene todos los permisos; los USUARIO reciben permisos directos asignados individualmente. Esto permite que Juan Pérez sea ADMIN en Finca A y USUARIO (con permisos específicos) en Finca B.

### 3.3 Cómo funciona el aislamiento en código

#### Trait BelongsToTenant

Ubicado en `app/Models/Traits/BelongsToTenant.php`. Todo modelo de negocio (Predio, Empleado, Jornal, Nomina, etc.) usa este trait, que hace dos cosas automáticas:

1. **Global Scope en lectura:** Cada query que toque ese modelo se filtra automáticamente por `WHERE tenant_id = X`. Si el código hace `Empleado::all()`, Laravel internamente ejecuta `SELECT * FROM empleados WHERE tenant_id = 5`. No hay forma de "olvidar" el filtro porque está en el scope global.

2. **Auto-asignación en escritura:** Al crear un registro nuevo, si no se especifica `tenant_id`, el trait lo toma del container de Laravel (`app('current_tenant_id')`). Así, `Empleado::create([...])` automáticamente incluye el `tenant_id` correcto.

Para queries de super-admin que necesitan ver datos de todos los tenants, existe el scope `->withoutTenant()`.

#### Middleware SetTenant

Ubicado en `app/Http/Middleware/SetTenant.php`. Se ejecuta en cada request a las rutas de negocio (`/api/v1/*`). Su flujo es:

1. Verifica que el usuario esté autenticado (JWT válido)
2. Lee el `tenant_id` del header `X-Tenant-Id` que envía el frontend
3. Busca el tenant en la base de datos y verifica que esté ACTIVO
4. Si el usuario no es super-admin, verifica que tenga un registro en `tenant_user` para ese tenant con `estado = true`
5. Registra en el container de Laravel: `current_tenant_id`, `current_tenant` (modelo), y `current_tenant_role`
6. Configura Spatie Permission para que los permisos se evalúen en el contexto de ese tenant

Si cualquier verificación falla, retorna un error JSON con código específico (TENANT_REQUIRED, TENANT_NOT_FOUND, TENANT_INACTIVE, TENANT_ACCESS_DENIED).

#### Middleware SuperAdmin

Ubicado en `app/Http/Middleware/SuperAdmin.php`. Protege las rutas `/api/admin/*`. Simplemente verifica que `$user->is_super_admin === true`.

### 3.4 Diagrama del flujo completo de un request

```
Frontend envía request
│
├── Header: Authorization: Bearer {jwt_token}
├── Header: X-Tenant-Id: 5
│
▼
Laravel recibe request
│
├── Middleware auth:api → Valida JWT, extrae usuario
│
├── Middleware SetTenant →
│   ├── Lee X-Tenant-Id: 5
│   ├── SELECT * FROM tenants WHERE id = 5 → ¿ACTIVO? ✓
│   ├── SELECT * FROM tenant_user WHERE tenant_id=5 AND user_id=3 → ¿Existe? ✓
│   ├── app()->instance('current_tenant_id', 5)
│   └── app()->instance('current_tenant_role', 'ADMIN') // o 'USUARIO'
│
▼
Controller (ej: EmpleadoController::index)
│
├── Empleado::activos()->paginate()
│   └── BelongsToTenant agrega automáticamente:
│       WHERE tenant_id = 5 AND estado = true
│
▼
Respuesta JSON con empleados SOLO del tenant 5
```

---

## 4. Autenticación JWT

### 4.1 Flujo de autenticación

El sistema usa JWT (JSON Web Tokens) en lugar de sesiones. No hay cookies ni estado en el servidor. El frontend guarda el token y lo envía en cada request.

Hay **tres flujos de login independientes**, cada uno para un tipo de actor distinto. Comparten el modelo `User`, el broker de password reset y JWT, pero tienen prefijos de ruta y reglas de elegibilidad diferentes:

| Prefijo | Quién entra | Claims JWT al seleccionar contexto |
|---------|-------------|------------------------------------|
| `/api/v1/auth`           | Super-admins (`users.is_super_admin = true`) | sin claims extra |
| `/api/v1/tenant-auth`    | Usuarios de finca (filas en `tenant_user`)   | `tenant_id`, `tenant_role` |
| `/api/v1/proveedor-auth` | Usuarios del marketplace (filas en `market_proveedor_user`) | `proveedor_id`, `proveedor_role` |

Cada login bloquea a los actores que no le corresponden (p. ej. el `tenant-auth/login` y el `proveedor-auth/login` devuelven `403 USE_ADMIN_LOGIN` cuando reciben a un super-admin). Detalles del portal proveedor en §15.

**Login:** `POST /api/v1/auth/login` con email y password. Retorna un token JWT que expira en 60 minutos, más datos del usuario.

**Refresh:** `POST /api/v1/auth/refresh` con el token actual. Genera un nuevo token antes de que expire el anterior. El frontend debe implementar auto-refresh.

**Me:** `GET /api/v1/auth/me` retorna el usuario autenticado junto con la lista de tenants a los que tiene acceso y su rol en cada uno.

**Select Tenant:** `POST /api/v1/auth/select-tenant` con `tenant_id`. Genera un nuevo token JWT que incluye el `tenant_id` y el `tenant_role` (ADMIN o USUARIO) como claims personalizados. El frontend usa este token para las requests posteriores y también envía `X-Tenant-Id` en el header.

**Logout:** `POST /api/v1/auth/logout` invalida el token actual.

### 4.2 Flujo completo desde el frontend

1. Usuario ingresa email/password → Login → Recibe token + datos del usuario
2. Frontend llama a `/auth/me` → Obtiene lista de tenants del usuario
3. Si tiene 1 solo tenant → Auto-selecciona
4. Si tiene varios → Muestra pantalla de selección de finca
5. Si es super-admin → Puede ir al panel admin o seleccionar un tenant
6. Al seleccionar tenant → `/auth/select-tenant` → Nuevo token con tenant en claims
7. Desde aquí, cada request lleva `Authorization: Bearer {token}` + `X-Tenant-Id: {id}`
8. Si el backend responde 401 → Frontend intenta refresh → Si falla → Logout

---

## 5. Estructura de la Base de Datos

### 5.1 Resumen: 44 tablas organizadas en 15 migraciones

**Migración 1 — Tenants:** `tenants` (core multi-tenant)

**Migración 2 — Tenant Config:** `tenant_config` (configuración por finca)

**Migración 3 — Usuarios y Auditoría:** Modifica `users` (agrega is_super_admin, status), crea `tenant_user` (pivot), crea `auditorias` (log de acciones)

**Migración 4 — Cultivo (9 tablas):** `predios` (fincas/haciendas), `semillas` (catálogo de variedades), `lotes` (divisiones del predio, `fecha_siembra` y `hectareas_sembradas` nullable), `semilla_lote` (pivot), `sublotes` (subdivisiones del lote), `lineas` (filas dentro del sublote, con `numero` único por sublote y `cantidad_palmas`), `palmas` (plantas individuales, `sublote_id` + `linea_id` nullable FK con `nullOnDelete`), `promedio_lote` (kg/gajo promedio por año), `precio_cosecha` (precio por lote y año)

**Migración 5 — Insumos, Labores y Empleados (6 tablas):** `insumos` (fertilizantes, herbicidas), `precio_abono` (rangos de precio por dosis), `labores` (catálogo **de Labores de Finca** — reparaciones, mantenimiento, etc. — con `nombre` + `valor_base`), `modalidad_contrato` (indefinido, obra/labor, fijo), `cargos` (catálogo de puestos, independiente de empleados), `empleados` (datos completos del trabajador con cargo, salario_base y modalidad_pago directos)

**Migración 6 — Jornales y Cosecha (5 tablas):** `jornales` (registro diario de trabajo, sin campo `fecha` propio — usa la fecha de la operación padre), `viajes` (transporte de fruto), `registro_cosecha` (producción por sublote, sin campo `fecha` propio — usa la fecha de la operación padre), `viaje_detalle` (pivot viaje↔cosecha), `cosecha_cuadrilla` (distribución de cosecha entre empleados)

**Migración 7 — Nómina (7 tablas):** `nomina_concepto` (catálogo unificado de deducciones y bonificaciones), `nomina_tabla_legal` (porcentajes legales con vigencia), `nominas` (encabezado del período), `nomina_empleado` (línea por trabajador), `nomina_empleado_concepto` (detalle de cada deducción/bonificación), `nomina_jornal_ref` (snapshot de jornales incluidos), `nomina_cosecha_ref` (snapshot de cosechas incluidas)

**Migración 20 — Rediseño Nómina para liquidación por empleado (alter de 3 tablas):** Alinea las tablas de nómina con el wizard de 4 pasos descrito en §6.6. (1) `nominas`: simplifica `estado` a `BORRADOR | CERRADA` (drop `CALCULADA`), cambia `quincena` de enum string `('PRIMERA','SEGUNDA')` a `smallint` nullable (1, 2, NULL), agrega `tipo_pago_snapshot` enum `(QUINCENAL,MENSUAL)` para blindar la nómina histórica de cambios futuros del tenant, y unique compuesto `(tenant_id, anio, mes, quincena)` para impedir duplicados. (2) `nomina_empleado`: simplifica `estado` a `PENDIENTE | LIQUIDADO`, agrega `dias_trabajados`, `subsidio_transporte` (columna directa, no concepto), `total_incapacidades`, snapshots `cargo_snapshot`/`predio_snapshot`/`salario_minimo_snapshot`, auditoría `liquidado_por`/`liquidado_at`. (3) `nomina_concepto.subtipo`: amplía con `PRESTAMO` y `AHORRO_VOLUNTARIO`. Nuevo seeder `NominaConceptoSeeder` siembra 23 conceptos colombianos por tenant (8 activos automáticos: SALUD/PENSIÓN al 4% + 6 tramos de Fondo de Solidaridad Pensional según IBC en SMLV; 15 plantilla precargada `activo=false` que el admin activa cuando los necesite: RETEFUENTE, EMBARGO, LIBRANZA, CUOTA_SINDICAL, AFC, PENSION_VOL, AUX_ALIMENTACION, BON_PRODUCTIVIDAD, BON_ANTIGUEDAD, COMISIONES, PRIMA_EXTRALEGAL, AUX_EDUCATIVO; tres de la plantilla — DCTO_ADELANTO, AHORRO, BONIFICACION — vienen `activo=true` porque la UI las usa directamente).

**Migración 8 — Vacaciones y Liquidación (4 tablas):** `vacaciones` (solicitudes), `vacacion_acumulado` (saldo de días), `liquidaciones` (cálculo de prestaciones al retiro), `liquidacion_detalle` (desglose concepto por concepto)

**Migración 9 — Refinamiento de Labores y Jornales:** Expande `labores.tipo_pago` de 2 a 3 valores (`JORNAL_FIJO`, `POR_PALMA_INSUMO`, `POR_PALMA_SIMPLE`). Elimina `fecha` de `jornales` y `registro_cosecha` (se obtiene de la operación padre). Hace `operacion_id` obligatorio (NOT NULL) en ambas tablas. Renombra `jornales.valor_insumo` a `precio_insumo_snapshot`. Agrega `jornales.tipo_pago` como snapshot del tipo de pago al momento de creación.

**Migración 10 — Contratos y Documentos del Empleado (2 tablas nuevas + alter empleados):** Agrega `fecha_expedicion_documento` y `lugar_expedicion` a `empleados`. Crea `empleado_contratos` (historial de contratos laborales con salario snapshot, estado VIGENTE/TERMINADO y adjunto PDF). Crea `empleado_documentos` (documentos digitales organizados por categoría: DATOS_BASE, CONTRATACION_LABORAL, SST, PERMISOS_LICENCIAS, FINALIZACION_CONTRATO, DESPRENDIBLES, OTROS).

**Migración 12 — Refactoring Colaboradores:** Separa `nombres`→`primer_nombre`+`segundo_nombre` y `apellidos`→`primer_apellido`+`segundo_apellido`. Desacopla cargo del modelo relacional: quita `cargo_id` FK de `empleados` y agrega campos directos `cargo` (string), `salario_base` (decimal) y `modalidad_pago` (FIJO/PRODUCCION). Agrega `predio_id` (FK nullable a `predios`). Hace `fecha_expedicion_documento` obligatorio. Quita `modalidad_id` y `cargo_id` de `empleado_contratos`. Reestructura categorías de documentos.

**Migración 21 — Subsidio de Transporte en Empleado (alter empleados):** Agrega `subsidio_transporte` (boolean, default `true`) directamente a la tabla `empleados`. Este campo indica si el colaborador tiene derecho a recibir el auxilio de transporte y es configurable desde el wizard de creación/edición. La nómina lo lee al momento de liquidar para determinar si aplica el cálculo del auxilio.

**Migración 11 — Ausencias (1 tabla nueva + alter nomina_empleado):** Crea `ausencias` (registros de incapacidades, licencias, permisos y faltas reportados desde la operación diaria; `operacion_id` NOT NULL, rango `fecha_inicio`/`fecha_fin`, flujo PENDIENTE → APROBADA → LIQUIDADA, soporte offline con `sync_uuid`/`sync_estado`). Agrega a `nomina_empleado` las columnas `dias_ausencia_descontados`, `total_ausencias_descuento` y `total_ausencias_remunerado` para reflejar el efecto de las ausencias en la liquidación.

**Migración 13 — Rediseño Operación → Planilla del Día:** Alinea el esquema con el wizard de 5 pasos (Info General → Labores de Palma → Labores de Finca → Horas Extras → Finalización). Quita de `operaciones` los campos `hora_inicio_lluvia` y `hora_fin_lluvia` (solo queda `hubo_lluvia` booleano; estados BORRADOR → APROBADA). Simplifica `labores` a catálogo de **Labores de Finca** (`nombre`, `valor_base`, `estado`) — elimina `tipo_pago`, `unidad_medida`, `insumo_id`. Crea `precios_palma` (config per-tenant con `tipo` ∈ {PLATEO, PODA, SANIDAD, OTROS} y `precio_palma` nullable). Rehace `jornales` como tabla unificada con discriminador `categoria` (PALMA|FINCA) + `tipo` (PLATEO|PODA|FERTILIZACION|SANIDAD|OTROS, solo si categoria=PALMA) + `labor_id` (solo si categoria=FINCA). Agrega a `jornales` los campos `descripcion` y `ubicacion` (la columna legacy `horas_extra` fue removida en la migración 16 — ver §6.13). COSECHA no vive en `jornales`: sigue en `registro_cosecha` + `cosecha_cuadrilla`.

**Migración 13.1 — Campos UI Planilla del Día:** Agrega `operaciones.cantidad_lluvia` (decimal 6,2 nullable, milímetros; solo se permite cuando `hubo_lluvia = true`) y `jornales.nombre_trabajo` (varchar 255 nullable; obligatorio solo para `tipo = OTROS`). Son los dos campos que el wizard mostraba en UI y no tenían columna dedicada.
**Migración 15 — Transportadoras, Extractoras y Refactor de Viajes (3 tablas nuevas + alter viajes):** Crea `empresa_transportadora` (catálogo paramétrico por tenant con `razon_social`, `nit` único por tenant, datos de contacto nullables, `estado`), `transportadores` (relación N:1 con empresa, `nombres`+`apellidos`+`placa_vehiculo` obligatorios y únicos por tenant, documentos, licencia, capacidad), y `extractoras` (plantas extractoras de aceite con `razon_social`, `nit` único por tenant, `ubicacion`, FKs opcionales a `departamentos`/`municipios`, `distancia_km`). Refactoriza `viajes`: agrega `empresa_transportadora_id`/`transportador_id`/`extractora_id` (snapshots con `restrictOnDelete`), `remision` (auto-generada `REM-{YYYY}-{NNN}` única por tenant), `hora_salida`, timestamps de transición (`despachado_at`, `llegada_planta_at`, `finalizado_at`) y `creado_por`. Renombra la columna `estado` boolean a `estado_activo` y agrega un nuevo `estado` varchar(20) con check constraint `('CREADO','EN_CAMINO','EN_PLANTA','FINALIZADO')`. Elimina la columna legacy `numero_viaje`.

**Migración 15.1 — Reconteo aprobado en viaje_detalle:** Agrega a `viaje_detalle` las columnas `reconteo_aprobado` (bool, default `false`), `reconteo_aprobado_at` y `reconteo_aprobado_por` (FK a `users`, `nullOnDelete`), más índice `(tenant_id, reconteo_aprobado)`. Crea también un **unique index parcial** `viaje_detalle_cosecha_activa_unique ON viaje_detalle (cosecha_id) WHERE estado = true` que garantiza que una cosecha solo puede estar en un viaje activo a la vez. Habilita el flujo de auto-despacho: cuando todos los detalles de un viaje quedan `reconteo_aprobado = true`, el viaje transiciona automáticamente a `EN_CAMINO`.

**Migración 16 — Fix `viajes.cantidad_gajos_total` nullable:** La migración 6 (`2026_01_01_000003`) creó `cantidad_gajos_total` como `NOT NULL`, lo cual entra en conflicto con el flujo de creación de viaje: en estado `CREADO` el valor aún no existe — se hidrata luego al aprobar el reconteo de cada detalle (`SUM(registro_cosecha.gajos_reconteo)`). La migración ejecuta `ALTER TABLE viajes ALTER COLUMN cantidad_gajos_total DROP NOT NULL` para permitir el insert inicial. El down revierte con backfill a 0 antes de restaurar el NOT NULL.

**Migración 18 — OCR del formulario de extractora con Claude Vision (1 tabla nueva):** Crea `viaje_documento_bascula` (formulario de extractora adjunto a un viaje: FK `viaje_id` restrictOnDelete, `archivo_path`, `mime_type`, `archivo_tamano`, `estado_ocr` con CHECK IN `PENDIENTE, PROCESANDO, COMPLETADO, REVISION_MANUAL, FALLIDO`, `peso_extraido`, `confianza`, `modelo_usado`, `respuesta_claude` JSONB con el payload crudo, `error_mensaje`, `intentos`, `procesado_at`). Migración 19 (`add_datos_extraidos_to_viaje_documento_bascula`) agrega `datos_extraidos` JSONB con el subset normalizado de los 10 campos que el frontend consume. Se usa en un Job asíncrono (`ProcesarFormularioExtractoraJob`) que llama a Claude Vision para extraer 10 campos del formulario (3 críticos: peso/fecha/hora; 7 opcionales). El Job **no toca la tabla `viajes`** — solo guarda los datos extraídos en el documento. La hidratación y el cierre del viaje los hace el operador después de revisar los datos en el frontend, vía `PATCH /viajes/{id}/validar` + `POST /viajes/{id}/finalizar`. Ver §6.5 y [docs/API_VIAJES_OCR_BASCULA.md](docs/API_VIAJES_OCR_BASCULA.md).

**Migración 17 — Horas Extras (2 tablas nuevas + drop columna legacy + alter nomina_empleado + tabla de snapshots):** Crea `tipos_hora_extra` (catálogo paramétrico por tenant: `codigo` único por tenant con CHECK constraint ∈ {HED, HEN, RN, HRD, HEDF, HENF, RND}, `nombre`, `porcentaje_recargo`, `franja_horaria` ∈ {DIURNO, NOCTURNO, MIXTO}, `aplica_festivo`, `es_extra`, `paga_hora_completa`, `estado`) y `horas_extra` (registros anidados a operación: `operacion_id`/`empleado_id`/`tipo_hora_extra_id` restrictOnDelete, snapshots `codigo`/`porcentaje_recargo`/`paga_hora_completa`, `cantidad_horas`, `valor_hora_base`, `valor_calculado`, máquina de estados PENDIENTE → APROBADA/RECHAZADA → LIQUIDADA, `nomina_id` al liquidar, soporte offline con `sync_uuid`/`sync_estado`). Elimina la columna legacy `jornales.horas_extra` que nunca se conectó al endpoint. Agrega a `nomina_empleado` las columnas `total_horas_extra` (suma de `es_extra=true`) y `total_recargos` (suma de `es_extra=false`), separadas para cálculo correcto de prestaciones sociales. Crea `nomina_hora_extra_ref` (snapshots al cerrar nómina, análoga a `nomina_jornal_ref`). Seeder `TipoHoraExtraSeeder` siembra los 7 tipos legales colombianos (CST arts. 168/179 + Ley 789/2002 art. 26) idempotentemente por tenant activo.

**Migración 14 — Chat del Agente IA (2 tablas nuevas):** Crea `agro_chat_sessions` (conversaciones del usuario con el agente IA: `user_id` + `tenant_id` con `ON DELETE CASCADE`, `titulo`, `created_at`/`updated_at` como `TIMESTAMPTZ`) y `agro_chat_messages` (mensajes individuales: `session_id` FK cascade a sessions, `user_id`, `tenant_id`, `role` `user|assistant|system|tool`, `content` texto, `tool_calls` JSONB para auditar qué consultas SQL hizo el agente, `tokens_in`/`tokens_out` opcionales para telemetría, `created_at` TIMESTAMPTZ). Índices: `(user_id, tenant_id, updated_at)` en sesiones; `(session_id, created_at)` y `(user_id, created_at)` en mensajes. Usadas por un agente IA externo que se conecta a la BD: **solo escribe** en estas dos tablas (4 operaciones: crear sesión, insertar mensaje, tocar `updated_at` de la sesión, eliminar sesión con cascada) y **solo lee** el resto del esquema Laravel (users, tenants, predios, lotes, palmas, etc.).

### 5.2 Convención de índices

Todas las tablas de negocio tienen como mínimo un índice compuesto `(tenant_id, campo_frecuente)`. Esto garantiza que las queries filtradas por tenant sean eficientes. Ejemplos: `(tenant_id, estado)`, `(tenant_id, fecha)`, `(tenant_id, empleado_id)`.

### 5.3 Soporte offline

Las tablas `jornales`, `viajes`, `registro_cosecha`, `ausencias` y `horas_extra` tienen campos `sync_uuid` (UUID generado offline para evitar duplicados) y `sync_estado` (LOCAL o SINCRONIZADO). Cuando el supervisor registra datos en campo sin internet, la PWA los guarda localmente y al reconectar los envía al backend. El backend detecta duplicados por `sync_uuid` y no los re-inserta.

### 5.4 Filosofía de borrado: hard delete + `estado`, salvo dos excepciones

Por default el proyecto usa **hard delete** (eliminación física) y un campo `estado` boolean en cada tabla operativa para "desactivar lógicamente" sin borrar (por ejemplo `PATCH /toggle`). Esto evita la complejidad de soft deletes en cascada y mantiene queries simples.

**Excepciones documentadas que sí usan el trait `SoftDeletes` (con columna `deleted_at`):**

1. **`tenants`** — un tenant es un ente global que puede reactivarse; no se borra físicamente para conservar trazabilidad inter-tenant.
2. **`empleados`** — desde la migración `2026_04_28_000002_add_soft_deletes_to_empleados.php`. El motivo es preservar el historial laboral (jornales, nómina, cosechas, contratos, documentos) cuando se elimina un colaborador desde la UI. Detalles operativos en §6.3 ("Soft delete + restauración").

   - El `UNIQUE (tenant_id, documento)` se reemplazó por un **índice parcial** `WHERE deleted_at IS NULL` para permitir recrear empleados con el mismo documento tras un soft delete.
   - Las reglas `Rule::unique(...)` en `StoreEmpleadoRequest` y `UpdateEmpleadoRequest` agregan `whereNull('deleted_at')` para alinearse con el índice.
   - El `BelongsToTenant` global scope (filtra por `tenant_id`) y el `SoftDeletingScope` (filtra por `deleted_at IS NULL`) coexisten sin conflicto: cada uno aporta su `WHERE` independientemente.
   - Las relaciones inversas (`Jornal::empleado`, `NominaEmpleado::empleado`, etc.) por default ocultan empleados soft-deleted; cuando un reporte histórico necesite mostrar el nombre, debe usarse `with(['empleado' => fn($q) => $q->withTrashed()])`.

Si en el futuro otro modelo necesita soft delete, se debe documentar aquí explícitamente y cubrir: (1) índices únicos parciales, (2) reglas de validación, (3) carga `withTrashed` en relaciones inversas, (4) endpoint de restauración + auditoría.

---

## 6. Módulos del Sistema

### 6.1 Módulo de Cultivo

Modela la estructura física de la plantación con la siguiente jerarquía:

```
Predio (finca/hacienda)
  └── Lote (división del terreno)
        └── Sublote (subdivisión del lote, tiene cantidad_palmas total)
              ├── Línea (agrupación opcional, numero + cantidad_palmas)
              └── Palma (planta individual, sublote_id + linea_id nullable)
```

Un **predio** (finca) contiene varios **lotes** (divisiones del terreno), cada lote tiene uno o más **sublotes**, y dentro de cada sublote están las **palmas** individuales. Opcionalmente, un sublote puede tener **líneas** (filas de palmas): si existen, las palmas se asignan a una línea específica (`linea_id`); si no existen, las palmas cuelgan directamente del sublote. Los lotes se asocian con tipos de **semilla** (Africana, Híbrido, Compacta, Americana). Cada lote tiene un **promedio** de kg/gajo por año y un **precio de cosecha** por año. Los campos `fecha_siembra` y `hectareas_sembradas` del lote son opcionales.

Los lotes pueden asociarse con una o más **semillas** (variedades de palma) a través de la tabla pivot `semilla_lote` y el modelo `SemillaLote`. Al crear o editar un lote, se puede enviar un array `semillas_ids` para vincular las variedades plantadas.

**Catálogo de Semillas:** Gestionado por `SemillaController` con CRUD completo (`/semillas`). El campo `tipo` acepta exclusivamente los valores: `Africana`, `Híbrido`, `Compacta`, `Americana`. Protección en eliminación: si la semilla está asignada a un lote retorna 409 `SEMILLA_CON_LOTES`. Endpoint `/semillas/select` (sin paginación, solo activas) disponible para dropdowns con permiso `configuracion.editar` o `lotes.{ver|crear|editar}`.

**Promedios por Lote:** Gestionado por `PromedioLoteController` con CRUD completo (`/promedios-lote`). Registra el kg/gajo promedio por lote y año. Unicidad: no puede existir más de un promedio por `lote_id + anio` — esta validación aplica tanto al crear (`POST`) como al actualizar el año en un `PUT` existente (retorna 409 `PROMEDIO_DUPLICADO`).

**Validación de hectáreas:** Al crear/editar un lote, se valida que `hectareas_sembradas` no exceda las `hectareas_totales` disponibles del predio padre (considerando las hectáreas ya usadas por otros lotes). Al editar un predio, se valida que `hectareas_totales` no sea menor que la suma de `hectareas_sembradas` de sus lotes.

**Generación automática de palmas:** Al crear un sublote (`POST /sublotes`) se puede enviar `cantidad_palmas`; el sistema crea automáticamente los registros de Palma con códigos secuenciales: `{nombre_sublote}-{contador_3_digitos}`. Al editar un sublote (`PUT /sublotes/{id}`) con un nuevo `cantidad_palmas`, el sistema agrega o elimina palmas para alcanzar la cantidad deseada. También se pueden crear palmas adicionales directamente con `POST /palmas` indicando `sublote_id` y `cantidad_palmas`.

**Eliminación en cascada:** Todos los endpoints de eliminación (Predios, Lotes, Sublotes) eliminan recursivamente la jerarquía completa hacia abajo (Predio→Lotes→Sublotes→Palmas), actualizando los contadores correspondientes.

**CRUD implementado:** Predios, Lotes, Sublotes, Líneas y Palmas tienen controllers con auditoría y permisos. Los permisos `lotes.*` cubren predios y lotes; `sublotes.*`, `lineas.*` y `palmas.*` son independientes. Palmas incluye eliminación masiva (`DELETE palmas/masivo`).

**Resumen del predio:** `GET /predios/{id}/resumen` devuelve la jerarquía completa (lotes → sublotes con cantidad_palmas) más totales agregados (lotes/sublotes/palmas, hectáreas sembradas/disponibles). Alimenta el panel "Resumen" del wizard "Crear Nueva Plantación". Respuesta servida desde caché aplicativa (TTL 60 s, invalidada en mutaciones de lotes/sublotes — ver §13).

**Listado de predios:** `GET /predios` ahora incluye `lotes_count` y `palmas_count` (suma de `cantidad_palmas` de todos los sublotes del predio vía relación HasManyThrough).

**Wizard init (bundle de inicialización del wizard de predios):** `GET /predios/wizard-init` (modo creación, permiso `lotes.crear`) y `GET /predios/{id}/wizard-init` (modo edición, permiso `lotes.ver`) retornan en una sola respuesta la estructura completa del predio: predio + lotes (con semillas) + sublotes indexados por `lote_id` (con `cantidad_palmas` y `cantidad_lineas`) + líneas indexadas por `sublote_id` (con `cantidad_palmas`) + paramétricas (semillas y departamentos). **Las palmas NO se incluyen** — con >10.000 palmas por sublote, el payload sería de MB; el frontend las carga paginadas (`per_page=50`) al entrar al paso 5. Esta respuesta colapsa los 14+ fetches secuenciales del `for await` anidado a 2 round-trips (bundle + municipios condicional). La guía para el frontend está en [docs/FRONTEND_WIZARD_PREDIO_MIGRACION.md](docs/FRONTEND_WIZARD_PREDIO_MIGRACION.md); el diagnóstico y plan consolidado en [docs/OPTIMIZACION_WIZARD_PREDIO.md](docs/OPTIMIZACION_WIZARD_PREDIO.md).

> **Líneas:** son una agrupación organizacional **opcional** dentro del sublote (`numero` único + `cantidad_palmas`). Las palmas pueden asignarse a una línea mediante `linea_id` (FK nullable con `nullOnDelete`). **Si el sublote tiene líneas**, al crear palmas se debe especificar la línea; al eliminar una línea las palmas quedan sin línea asignada (`linea_id = null`) pero no se eliminan. **Si el sublote no tiene líneas**, el flujo de palmas es directo (solo sublote_id + cantidad). Endpoints expuestos en `/api/v1/tenant/lineas`.

Modelos: Predio, Lote, Sublote, Linea, Palma, Semilla, SemillaLote, PromedioLote, PrecioCosecha.

### 6.2 Módulo de Insumos, Labores y Precios

**Insumos** (`insumos`) son los fertilizantes, herbicidas y demás productos agrícolas. Cada insumo registra únicamente qué producto es (nombre + unidad de medida). El insumo **no** determina el precio — solo indica qué producto se entrega al trabajador cuando la labor es FERTILIZACION.

**Precios de Abono** (`precio_abono`) es una tabla de escalas **genérica por tenant** que define el precio por palma según los gramos aplicados. Se usa exclusivamente en jornales de tipo FERTILIZACION. Ejemplo: si un trabajador aplica 200g/palma, el sistema busca el rango que contiene 200g y obtiene `precio_palma`. Típicamente son pocos registros (3-6 rangos por tenant).

**Precios de Palma** (`precios_palma`) es la config per-tenant del precio por palma para los demás tipos de Labores de Palma de precio fijo: PLATEO, PODA, SANIDAD, OTROS. Cada tenant tiene a lo sumo un registro por `tipo` (UNIQUE). `precio_palma` puede ser NULL para SANIDAD/OTROS mientras no se decida cobrar esas labores — el jornal se guarda con `valor_total = NULL` y el cálculo se activa luego sin cambio de esquema.

**Precios de Cosecha** (`precios_cosecha`) define el precio pagado por gajo/kg de cosecha según el lote y año (existente, no cambia).

**Labores** (`labores`) es el catálogo paramétrico **exclusivo de Labores de Finca** (arreglos, mantenimiento, transporte interno, etc.). Cada labor tiene `nombre` + `valor_base` (precio fijo que gana el empleado al registrarla). **No** se usa para las Labores de Palma — esas se resuelven con el `tipo` dentro de `jornales` y las tablas de precios (`precios_palma` / `precio_abono` / `precios_cosecha`).

Modelos: Insumo, PrecioAbono, PrecioPalma, Labor.

### 6.3 Módulo de Empleados

**Modalidades de contrato (`modalidad_contrato`):** Catálogo de tipos de contrato (indefinido, obra/labor, fijo, prestación de servicios). Cada tenant configura los suyos. Se mantiene como tabla paramétrica independiente.

**Cargos (`cargos`):** Catálogo de puestos de trabajo con modalidad de contrato asociada y tipo de salario (`FIJO`/`VARIABLE`). Se mantiene como tabla paramétrica independiente, **sin relación FK con empleados** — el cargo se escribe directamente en el registro del empleado.

**Empleados:** Registro completo con nombre desagregado en 4 campos (`primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`). Incluye datos de identificación (tipo de documento: CC, TI, PASAPORTE, CE, PPT; número, fecha de expedición obligatoria, lugar de expedición), cargo directo (`cargo` string, `salario_base` decimal, `subsidio_transporte` boolean default `true`, `modalidad_pago` FIJO/PRODUCCION), predio asignado (`predio_id` nullable FK a `predios`), fechas laborales (`fecha_ingreso` obligatoria, `fecha_retiro` nullable), seguridad social colombiana (EPS, ARL, pensión, caja de compensación), datos bancarios (tipo de cuenta, entidad, número — como VARCHAR para soportar ceros iniciales), tallas de dotación, contacto de emergencia y avatar opcional (`avatar_path`). La unicidad del documento es por tenant **y solo entre empleados activos** — la columna `documento` tiene un índice único parcial `WHERE deleted_at IS NULL`, lo que permite recrear un colaborador con el mismo documento después de un soft delete.

**Regla de `salario_base` por modalidad (Store/Update):** `salario_base` es obligatorio solo cuando `modalidad_pago = FIJO` (regla `required_if`). Cuando es `PRODUCCION`, si no se envía, el FormRequest auto-completa con `tenant_config.salario_minimo_vigente` vía `prepareForValidation()`. Si es PRODUCCION y el tenant no tiene SMLV configurado, devuelve 422 con mensaje descriptivo pidiendo configurar el SMLV primero. El contrato vigente creado junto con el empleado hereda el salario ya resuelto.

**Avatar del colaborador:** Imagen opcional almacenada en disco `public` (URL accesible directamente, mismo patrón que el logo del tenant) en `storage/app/public/tenants/{tenant_id}/empleados/{empleado_id}/avatar/`. Validación: solo `jpg`, `jpeg`, `png`, `webp`, máx **3 MB**. La URL pública se expone como atributo calculado `avatar_url` en el modelo (vía `$appends`); el `avatar_path` interno está en `$hidden`. Endpoints `POST /colaboradores/{id}/avatar` (subir/reemplazar — borra el anterior automáticamente) y `DELETE /colaboradores/{id}/avatar` (limpia archivo y campo). Auditado como módulo `COLABORADORES` con acción `EDITAR`.

**Soft delete + restauración:** El modelo usa el trait `SoftDeletes` (única excepción del proyecto junto con `tenants`, ver §5.2 Filosofía de borrado). `DELETE /colaboradores/{id}` marca `deleted_at` sin tocar el historial ni los archivos en disco; jornales, nómina, cosechas, contratos y documentos quedan intactos referenciando al `empleado_id`. El listado y dropdowns ocultan los eliminados por default; los flags `?incluir_eliminados=true` (mezcla activos + eliminados) y `?solo_eliminados=true` (vista de papelera) permiten exponer la vista administrativa. Restauración con `POST /colaboradores/{id}/restaurar` (permiso `colaboradores.crear`, ruta usa `withTrashed()` en el route binding) — falla con 409 `EMPLEADO_NO_ELIMINADO` o 409 `DOCUMENTO_DUPLICADO` si mientras estaba eliminado se creó otro colaborador con el mismo documento. Auditado como acción `RESTAURAR` (acción libre, no enum). En reportes históricos donde sea necesario seguir mostrando el nombre del colaborador eliminado, los controllers consumidores deben cargar la relación con `withTrashed()` (follow-up por hacer en `JornalController`, `NominaEmpleadoController`, `AusenciaController`, `CosechaCuadrillaController` cuando aparezcan huecos en QA).

**Contratos del empleado (`empleado_contratos`):** Historial de contratos laborales de cada empleado. Cada contrato registra: fecha de inicio, fecha de terminación (nullable), salario acordado (snapshot al momento de firma), estado del contrato (`VIGENTE` o `TERMINADO`), y adjunto PDF escaneado (ruta en disco local privado). Al crear un nuevo contrato VIGENTE, los anteriores deben marcarse como TERMINADO (lógica en capa de aplicación). Los campos `fecha_ingreso` y `fecha_retiro` en `empleados` se usan para cálculos de nómina y prestaciones.

**Documentos del empleado (`empleado_documentos`):** Documentos digitales organizados por categoría, cada uno con archivo adjunto almacenado en disco local privado (`storage/app/private/tenants/{tenant_id}/empleados/{empleado_id}/documentos/`). Las categorías son:
- **DATOS_BASE** (único por tipo — el upload reemplaza al existente): Documento de identidad, Hoja de vida, Antecedentes, Autorización de datos personales.
- **CONTRATACION_LABORAL** (N documentos del mismo tipo): Contrato de trabajo, Acuerdo de confidencialidad.
- **SST** (N documentos del mismo tipo): Examen de ingreso.
- **PERMISOS_LICENCIAS** (N documentos, tipo personalizado desde frontend).
- **FINALIZACION_CONTRATO** (N documentos, tipo fijo: `FINALIZACION_CONTRATO`).
- **DESPRENDIBLES** (N documentos, tipo fijo: `DESPRENDIBLES`).
- **OTROS** (N documentos, tipo personalizado desde frontend).

Las categorías y sus tipos predefinidos están centralizados en `App\Constants\DocumentoCategoria`. **Solo `DATOS_BASE` tiene `unico_por_tipo: true`** — al subir un documento del mismo tipo el anterior se elimina automáticamente del disco y de la BD. El resto de categorías acumulan múltiples documentos del mismo tipo.

**Acceso a archivos de documentos (descarga vs preview):** Como los archivos están en disco privado, todo acceso pasa por endpoints autenticados que validan tenant + permiso + pertenencia al empleado. Hay dos modos:
- `GET /colaboradores/{id}/documentos/{docId}/descargar` → `Content-Disposition: attachment` (fuerza diálogo "Guardar como"), funciona con cualquier mime type.
- `GET /colaboradores/{id}/documentos/{docId}/visualizar` → `Content-Disposition: inline` para renderizar en `<iframe>` (PDF) o `<img>` (imágenes). Solo acepta mimes `application/pdf`, `image/jpeg`, `image/png`, `image/webp`; otros responden 415 `MIME_NOT_PREVIEWABLE` y el frontend debe redirigir a `/descargar`. Como ambos endpoints requieren `Authorization` y `X-Tenant-Id`, **el frontend nunca debe usar la URL directa en `<iframe src>` ni `<a href>`**: tiene que pedir el blob por JS y construir un `URL.createObjectURL()`.

**Importación masiva de colaboradores (`importaciones_empleados`):** Permite cargar múltiples empleados desde un archivo `.xlsx` o `.xls` (máx. 5 MB / 1.000 filas). El flujo es asíncrono: el endpoint `POST /colaboradores/importar` almacena el archivo en disco local privado, crea un registro `ImportacionEmpleados` con estado `PENDIENTE` y despacha `ProcesarImportacionEmpleadosJob`. El Job procesa las filas en chunks de 100 dentro de una transacción por chunk — los fallos de fila individual no revierten el chunk, solo se omiten. Cada fila recibe las mismas validaciones que `StoreEmpleadoRequest` (documento único por tenant, edad ≥ 14 años, SMLV auto-relleno para PRODUCCION, etc.). Al crearse un colaborador se genera su contrato vigente igual que en el store individual. El progreso se puede consultar en `GET /colaboradores/importaciones/{id}` (campo `resultados` con detalle fila a fila). Estados: `PENDIENTE → PROCESANDO → COMPLETADO | CON_ERRORES | FALLIDO`. La auditoría usa inserción directa en `Auditoria::create()` (sin Request object) con acción `IMPORTACION_MASIVA`, módulo `COLABORADORES`. El archivo físico queda en `tenants/{id}/importaciones/empleados/` del disco `local` (privado). **No se cargan** `predio_id` ni avatar por importación masiva. Ver [docs/API_IMPORTACION_COLABORADORES.md](docs/API_IMPORTACION_COLABORADORES.md).

**Wizard init (bundle de inicialización del wizard de creación/edición):** El frontend del wizard solía disparar 8 GET paralelos al montar (predios, eps/arl/fondos/bancos, departamentos, categorías de documentos, colaborador) y eso tardaba hasta 10 s. Para mitigarlo se expone `GET /colaboradores/{id}/wizard-init` (modo edición, permiso `colaboradores.ver`) y `GET /colaboradores/wizard-init` (modo creación, permiso `colaboradores.crear`), que retornan en una sola respuesta el colaborador (o `null` en creación) más todas las paramétricas, cada una servida desde caché aplicativa (ver §13). Los endpoints individuales legacy (`/eps/select`, `/predios`, `/auth/departamentos`, etc.) siguen vivos y soportados — otros consumidores los siguen usando. La guía para el frontend está en [docs/FRONTEND_WIZARD_COLABORADOR_MIGRACION.md](docs/FRONTEND_WIZARD_COLABORADOR_MIGRACION.md); el diagnóstico y plan consolidado en [docs/OPTIMIZACION_WIZARD_COLABORADOR.md](docs/OPTIMIZACION_WIZARD_COLABORADOR.md).

Modelos: ModalidadContrato, Cargo, Empleado, EmpleadoContrato, EmpleadoDocumento, ImportacionEmpleados.

### 6.4 Módulo de Jornales

Un **jornal** es una fila por `(operación × empleado × labor)` que describe lo que ganó un empleado ese día. La tabla `jornales` es **unificada** y usa un discriminador de dos niveles:

- `categoria` ∈ {`PALMA`, `FINCA`}
- `tipo` ∈ {`PLATEO`, `PODA`, `FERTILIZACION`, `SANIDAD`, `OTROS`} — solo cuando `categoria = PALMA`
- `labor_id` (FK a `labores`) — solo cuando `categoria = FINCA`

**COSECHA NO vive en `jornales`.** Se maneja en `registro_cosecha` (cabecera por sublote) + `cosecha_cuadrilla` (distribución por empleado), porque es labor de cuadrilla. Las demás Labores de Palma se registran una por empleado (un colaborador por tarjeta en el wizard).

La fecha del jornal se obtiene de la operación padre (`operacion.fecha`); no existe columna `fecha` propia. `operacion_id` es NOT NULL.

Tanto empleados de salario **FIJO** como **PRODUCCION** pueden tener jornales registrados. El sistema no distingue al registrar — todos los empleados que trabajaron aparecen en la planilla con sus labores. La diferencia está en cómo la **nómina** consume esa información:

| | Empleado PRODUCCION | Empleado FIJO |
|---|---|---|
| Se registra jornal en operación | Sí | Sí |
| El jornal calcula `valor_total` | Sí | Sí |
| En nómina, `valor_total` determina su pago | **Sí** — su sueldo es la suma de jornales + cosechas del período | **No** — su sueldo es `empleado.salario_base` siempre |
| ¿Para qué sirve el jornal? | Para calcular su pago | Para **control/tracking** (saber qué hizo ese día) |

**Lógica de cálculo** (centralizada en `JornalCalculationService`):
- `calcularPalma(tipo=PLATEO|PODA, ...)`: busca `precios_palma` para `(tenant, tipo)` → `valor_total = cantidad_palmas × precio_palma`.
- `calcularPalma(tipo=FERTILIZACION, ...)`: busca `precio_abono` por rango de gramos → guarda `precio_insumo_snapshot` y `valor_total = cantidad_palmas × precio_palma`.
- `calcularPalma(tipo=SANIDAD|OTROS, ...)`: busca `precios_palma` para `(tenant, tipo)` → `valor_total = precio_palma` (valor plano, sin multiplicar). Si `precio_palma` IS NULL, `valor_total = NULL` (se activa luego sin cambio de esquema). SANIDAD/OTROS no usan `cantidad_palmas`.
- `calcularFinca(labor_id)`: `valor_total = labor.valor_base`. La columna legacy `jornales.horas_extra` fue **eliminada** (migración `2026_04_24_000003`); las horas extras ahora viven en una tabla dedicada `horas_extra` con su propia máquina de estados (ver §6.13).

**Campos por categoría + tipo:**

| Campo | PLATEO | PODA | FERTILIZACION | SANIDAD | OTROS | FINCA |
|---|---|---|---|---|---|---|
| `categoria` | PALMA | PALMA | PALMA | PALMA | PALMA | FINCA |
| `tipo` | PLATEO | PODA | FERTILIZACION | SANIDAD | OTROS | NULL |
| `labor_id` | NULL | NULL | NULL | NULL | NULL | ✔ |
| `lote_id` / `sublote_id` | ✔ | ✔ | ✔ | ✔ | ✔ | NULL |
| `cantidad_palmas` | ✔ | ✔ | ✔ | NULL | NULL | NULL |
| `insumo_id` | NULL | NULL | ✔ | NULL | NULL | NULL |
| `gramos_por_palma` | NULL | NULL | ✔ | NULL | NULL | NULL |
| `descripcion` | NULL | NULL | NULL | ✔ | ✔ | NULL |
| `ubicacion` | NULL | NULL | NULL | NULL | NULL | ✔ |
| `valor_total` | palmas × precio | palmas × precio | palmas × precio | NULL u calc | NULL u calc | labor.valor_base |

**Validación** (`StoreJornalRequest`): aplica las reglas condicionales arriba (categoría PALMA ⇒ tipo obligatorio y labor_id prohibido; FINCA ⇒ inverso; cada tipo valida sus propios campos obligatorios).

Este módulo es **crítico para offline** — los supervisores registran jornales en campo sin internet (`sync_uuid`, `sync_estado`).

Modelos: Jornal, Labor, PrecioPalma, PrecioAbono. Servicios: JornalCalculationService, CosechaCalculationService.

**API expuesta (Paso 1 + Paso 2 + Paso 3 del wizard):**
- `OperacionController`: `GET/POST/PUT/DELETE /operaciones`, `POST /operaciones/{id}/aprobar`, `GET /operaciones/{id}/resumen`.
- `RegistroCosechaController`: `POST /operaciones/{id}/cosechas`, `PUT|DELETE /cosechas/{id}`. Usa `CosechaCalculationService` para calcular cabecera (`valor_total = peso_confirmado × precios_cosecha.precio`) y distribuir `valor_total / N` en partes iguales en `cosecha_cuadrilla`. El cálculo se dispara tanto en POST (si viene `peso_confirmado`) como en PUT (al hidratar el peso posteriormente). Si llega `peso_confirmado` y no hay `precios_cosecha` configurado para el (lote, año), devuelve 422 `CALC_ERROR`. El snapshot `precio_cosecha` en la fila se preserva entre ediciones (solo se refresca si era NULL y llega peso por primera vez). Usa `StoreRegistroCosechaRequest` y `UpdateRegistroCosechaRequest` (FormRequests dedicados).
- `JornalController`: `POST /operaciones/{id}/jornales`, `PUT|DELETE /jornales/{id}`. Invoca `JornalCalculationService` para hidratar `valor_unitario`, `precio_insumo_snapshot` y `valor_total`. Soporta tanto Labores de Palma (Paso 2, `categoria=PALMA`) como Labores de Finca (Paso 3, `categoria=FINCA` con `labor_id` → `valor_total = labor.valor_base`).
- `LaborController`: CRUD paramétrico de `labores` bajo `configuracion.editar` + `GET /labores/select` abierto a operadores (`operaciones.crear|editar`) para poblar el dropdown "Labor" del Paso 3. El select devuelve `{id, nombre, valor_base}` sin paginación y filtra `estado=true` por default.
- `PrecioPalmaController`: Gestiona los precios de las Labores de Palma fijas (PLATEO, PODA, SANIDAD, OTROS) bajo `configuracion.editar`. Expone `GET /precios-palma` (los 4 registros del tenant, siempre presentes — se siembran con `precio_palma=0` al crear el tenant), `GET /precios-palma/{id}` y `PUT /precios-palma/{id}` (actualiza `precio_palma` y/o `estado`). No tiene POST ni DELETE — los registros son inmutables en estructura. El `precio_palma` acepta `null` para SANIDAD/OTROS (señala "no configurado"; los jornales de esos tipos quedan con `valor_total=NULL` hasta que se establezca un precio). Audita vía `AuditoriaService::registrarEdicion('PRECIOS_PALMA', ...)`.
- Selects de Lote/Sublote para el wizard: existen **dos pares de endpoints separados**, no se mezclan permisos.
  - `GET /lotes/select` y `GET /sublotes/select`: del módulo de Plantación. Conservan sus permisos originales (`lotes.ver` / `sublotes.ver` + `operaciones.crear|editar` vía OR-logic). Los usa el CRUD admin de Plantación.
  - `GET /operaciones/lotes/select` y `GET /operaciones/sublotes/select`: **nuevos**, dedicados al Paso 2 (Labores de Palma) del wizard. Solo requieren `operaciones.crear|editar` (mismo patrón que los demás selects auxiliares del wizard). Reutilizan los mismos métodos de controlador. El payload de `/operaciones/sublotes/select` incluye `cantidad_palmas`, que el frontend usa para **auto-rellenar** el input "Número de Palmas" al elegir un sublote en las tarjetas de PLATEO/PODA/FERTILIZACION (el campo sigue editable). No aplica a SANIDAD/OTROS.
- Creación de insumo desde el wizard: `POST /operaciones/insumos` (requiere `operaciones.crear|editar`). Para el flujo "Otro" del dropdown "Tipo de Fertilizante" en la tarjeta de FERTILIZACION del Paso 2. Solo recibe `nombre`; el backend setea `unidad_medida = 'GRAMOS'` por default y devuelve `{id, nombre, unidad_medida}` para que el front lo use de inmediato como `insumo_id` del jornal. Constraint UNIQUE `(tenant_id, nombre)` en DB (migración `2026_05_04_000001_add_unique_tenant_nombre_to_insumos`); duplicados rebotan con 409 `INSUMO_DUPLICADO`. Audita vía `AuditoriaService::registrarCreacion('INSUMOS', ...)` con observación que indica el origen wizard.
- Permiso nuevo: `operaciones.aprobar` (además de los `operaciones.ver/crear/editar/eliminar` existentes).
- Bloqueos: cualquier PUT/DELETE sobre una planilla APROBADA devuelve 409 `OPERACION_APROBADA`.
- Contrato completo con payloads y ejemplos: [docs/API_OPERACIONES.md](docs/API_OPERACIONES.md).

### 6.5 Módulo de Cosecha y Viajes

Un **viaje** representa un despacho de fruto de palma desde el predio hacia una **extractora** (planta de beneficio). Se apoya en tres tablas paramétricas por tenant: `empresa_transportadora` (empresas de transporte), `transportadores` (conductores con su placa_vehiculo, hijos N:1 de una empresa) y `extractoras` (plantas destino). Al crear un viaje se selecciona un transportador y una extractora: el backend copia como **snapshot** `empresa_transportadora_id`, `placa_vehiculo` y `nombre_conductor` en la fila de `viajes` para preservar histórico.

Cada viaje lleva un identificador **`remision`** con formato `REM-{YYYY}-{NNN}` auto-generado atómicamente por tenant+año (reemplaza el campo legacy `numero_viaje`, que fue eliminado). El viaje sigue una máquina de **tres estados**:

```
CREADO ──▶ EN_VALIDACION ──▶ FINALIZADO
```

- **CREADO**: se enlazan cosechas al viaje (`viaje_detalle`) y se hace el **reconteo de gajos**. El reconteo hidrata `registro_cosecha.gajos_reconteo` vía el endpoint dedicado `PUT /viajes/{id}/reconteo` (el cual también refresca `viajes.cantidad_gajos_total = SUM(gajos_reconteo)`). Solo en este estado el viaje es editable. Hay **dos rutas de salida**: (1) aprobar el reconteo del último detalle dispara la auto-transición a `EN_VALIDACION` (fincas que pagan por producción); (2) `POST /viajes/{id}/saltar-validacion` para fincas que pagan por jornal y no llevan control de cosechas — no exige detalles ni reconteos aprobados.
- **EN_VALIDACION**: el camión llegó a la extractora y se está validando lo que reportaron. Aquí se hidratan los datos del **formulario de extractora**: `peso_viaje`, `numero_remision_extractora`, `fecha_llegada`, `hora_llegada`, los 5 porcentajes de calificación de fruto (`fruto_verde`, `sobre_maduro`, `podrido`, `pedunculo_largo`, `mal_formado`) y `observaciones_extractora`. La hidratación puede ser por OCR (subir foto/PDF a `POST /documento-bascula`) o manual (`PATCH /viajes/{id}/validar`). Adicional, el OCR captura el **nombre del conductor y la placa impresos** en la remisión y el GET de polling los compara contra el snapshot del viaje (`nombre_conductor`, `placa_vehiculo`) en una sección `validaciones_cruzadas`: si un camión llegó con conductor o placa distintos a los planeados, el frontend pinta una alerta no bloqueante.
- **FINALIZADO**: cerrado. Se dispara el cálculo HOMOGENEO/NO_HOMOGENEO **solo si hay detalles enlazados con peso y gajos**; los viajes "paga por jornal" sin detalles cierran sin recalcular nada.

El borrado lógico del viaje ahora vive en la columna **`estado_activo`** (boolean, renombrada del antiguo `estado`); solo se permite mientras el viaje no esté `FINALIZADO`.

El dashboard de viajes expone **indicadores agregados** vía `GET /viajes/indicadores?periodo=MENSUAL|SEMANAL|ANUAL|CUSTOM&desde=&hasta=`, que retorna en una sola respuesta: `total_viajes`, `en_camino`, `finalizados`, `kilogramos_totales` (SUM `peso_viaje`) y `gajos_totales` (SUM `cantidad_gajos_total`). El listado `GET /viajes` acepta filtros por remision, fecha, estado, vehiculo (placa snapshot), conductor (snapshot), `extractora_id`, `transportador_id`, `empresa_transportadora_id`.

Un **viaje** representa un cargamento de fruto de palma que sale de la finca. Registra la placa del vehículo, conductor, fecha, peso total del viaje, y cantidad total de gajos (racimos).

Un **registro de cosecha** es la producción de un sublote dentro de una **operación** (planilla diaria). No tiene campo `fecha` propio — la fecha se obtiene de la operación padre (`operacion.fecha`). El campo `operacion_id` es obligatorio (NOT NULL). Registra gajos reportados, gajos de reconteo, peso confirmado, y el valor calculado.

El **viaje_detalle** es el pivot que conecta un viaje con múltiples registros de cosecha (un viaje puede llevar fruto de varios sublotes).

La **cosecha_cuadrilla** distribuye el valor de cada cosecha entre los empleados que participaron. Si 4 empleados cosecharon un sublote, el valor se divide entre ellos en partes iguales.

**Fórmula de cálculo (centralizada en `CosechaCalculationService`):**
- Cabecera: `valor_total = peso_confirmado × precios_cosecha.precio` (donde `precio` se resuelve por `lote_id + año de la operación`).
- Cuadrilla: `valor_por_empleado = valor_total / N`, `peso_por_empleado = peso_confirmado / N`.
- `peso_confirmado` es **opcional** al crear. Si se envía, el cálculo se hace al vuelo (no hay que esperar al viaje). Si no se envía, `valor_total = NULL` y se hidrata luego vía `PUT /cosechas/{id}` con el peso de báscula.
- Si llega `peso_confirmado` pero no hay `precios_cosecha` configurado para (lote, año), el servicio lanza `InvalidArgumentException` y el controller responde 422 `CALC_ERROR`.
- `precio_cosecha` en la fila es un **snapshot** escrito al momento del cálculo y se preserva en ediciones posteriores (solo se sobreescribe si era NULL y llega peso por primera vez).
- `promedio_kg_gajo` es un snapshot histórico (`promedio_lote`) guardado para referencia/reportes; **no participa** en la fórmula del dinero.

**Tipos de cálculo para el módulo de Viajes (futuro, no afecta el valor_total de la cosecha):**
- `HOMOGENEO`: El promedio kg/gajo se calcula dividiendo peso del viaje entre gajos totales. Todos los sublotes del viaje comparten el mismo promedio.
- `NO_HOMOGENEO`: Cada sublote usa su propio promedio histórico del año (`promedio_lote`).

Este módulo también es **crítico para offline**.

Modelos: Viaje, RegistroCosecha, ViajeDetalle, CosechaCuadrilla, EmpresaTransportadora, Transportador, Extractora. Constante: `App\Constants\ViajeEstado` (CREADO, EN_VALIDACION, FINALIZADO + transiciones). Servicios: CosechaCalculationService, ViajeCalculationService, RemisionGeneratorService.

**Permisos:** las paramétricas (`empresa_transportadora`, `transportadores`, `extractoras`) se gestionan bajo `configuracion.editar` (no se crean permisos específicos). Los endpoints de viajes siguen usando `viajes.*` ya existentes. Contrato completo: [docs/API_VIAJES.md](docs/API_VIAJES.md).

**OCR de asistencia del formulario de extractora (Claude Vision):** el operador sube el formulario a `POST /viajes/{id}/documento-bascula` (multipart) cuando el viaje está en `EN_VALIDACION`; el Job `ProcesarFormularioExtractoraJob` llama a `ClaudeVisionService` para extraer 10 campos (3 críticos: `peso_viaje`/`fecha_llegada`/`hora_llegada`; 7 opcionales: número de remisión, racimos, temperatura/acidez/humedad, calidad, observaciones) y los guarda en `viaje_documento_bascula.datos_extraidos` (jsonb). El Job **no toca la tabla `viajes`** — el frontend hace polling al GET, rellena el formulario con los datos extraídos y muestra una alerta si quedó en `REVISION_MANUAL` (confianza baja o crítico faltante; los datos se guardan igual). El operador revisa, edita si hace falta, y al darle "Finalizar y guardar" el frontend dispara `PATCH /viajes/{id}/validar` (hidrata) + `POST /viajes/{id}/finalizar` (cierra y dispara `ViajeCalculationService::calcularAlFinalizar`). Tenant isolation: el Job restaura `app('current_tenant_id')` al inicio del handle. Modelo: `ViajeDocumentoBascula`. Configuración: variables `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`), `ANTHROPIC_BASCULA_CONFIANZA_MINIMA`. Contrato completo con payloads y troubleshooting: [docs/API_VIAJES_OCR_BASCULA.md](docs/API_VIAJES_OCR_BASCULA.md).

### 6.6 Módulo de Nómina

Es el módulo más complejo del sistema. Opera en períodos (quincenas o meses), con liquidación **por empleado individualmente** (no en bloque). Documentación completa de la API: [docs/API_NOMINA.md](docs/API_NOMINA.md).

**Conceptos de nómina (`nomina_concepto`):** Catálogo unificado por tenant de todo lo que puede sumar o restar en una nómina. Cada concepto tiene: tipo (DEDUCCION_LEGAL, DEDUCCION_VOLUNTARIA, BONIFICACION_FIJA, BONIFICACION_VARIABLE), subtipo (SALUD, PENSION, ARL, FONDO_SOLIDARIDAD, LIBRANZA, EMBARGO, **PRESTAMO**, **AHORRO_VOLUNTARIO**, PRODUCTIVIDAD, TRANSPORTE, ALIMENTACION, ANTIGUEDAD, OTRO), operación (SUMA/RESTA), método de cálculo (PORCENTAJE/VALOR_FIJO/FORMULA), `valor_referencia`, `base_calculo` (SALARIO_BASE/TOTAL_DEVENGADO/SALARIO_MINIMO/MANUAL), y `aplica_a` (FIJO/VARIABLE/AMBOS). El `NominaConceptoSeeder` siembra 23 conceptos por tenant (ver Migración 20 en §3.1).

**Tabla legal (`nomina_tabla_legal`):** Historial de porcentajes legales colombianos con vigencia. Por ejemplo: "Salud - empleado 4%, empresa 8.5%, vigente desde 2026-01-01". Permite recalcular nóminas históricas con los valores correctos de su época.

**Flujo del wizard (4 pasos):**
1. **Crear período (`POST /nominas`)**: el frontend envía `{ mes, anio, periodicidad: QUINCENAL|MENSUAL, quincena? }`. El backend snapshottea `tipo_pago_snapshot` desde el body (no desde `tenant_config.tipo_pago_nomina` — el config solo es default informativo del frontend) y calcula `fecha_inicio`/`fecha_fin` automáticamente. Estado: BORRADOR.
2. **Agregar empleados (`POST /nominas/{id}/empleados`)**: del listado de activos del tenant. Cada `nomina_empleado` arranca en estado PENDIENTE con `salario_tipo` derivado de `empleado.modalidad_pago` (FIJO o VARIABLE).
3. **Liquidar empleado por empleado** (`POST /nomina-empleado/{id}/liquidar`): el `NominaCalculationService` calcula el devengado, aplica conceptos legales automáticamente y persiste los conceptos manuales (bonificaciones libres + deducciones voluntarias del catálogo). Estado del empleado pasa a LIQUIDADO. Re-liquidación permitida vía `PUT /liquidacion` mientras la nómina siga BORRADOR. Antes hay un `GET /preview` que devuelve el cálculo propuesto sin persistir, y para empleados VARIABLE un `GET /resumen-trabajo` que devuelve la planilla diaria agrupada por categoría (cosecha, plateo, poda, fertilización, sanidad, otros, finca).
4. **Cerrar nómina (`POST /nominas/{id}/cerrar`)**: requiere que **todos** los empleados estén LIQUIDADOS. `CerrarNominaService` ejecuta en una sola transacción: crea snapshots en `nomina_jornal_ref`/`nomina_cosecha_ref`/`nomina_hora_extra_ref`, marca `Ausencia.estado=LIQUIDADA` y `HoraExtra.estado=LIQUIDADA` para los registros APROBADOS del rango, recalcula totales globales, y cambia `nomina.estado=CERRADA` (inmutable).

**Reglas de cálculo (normatividad colombiana, en `NominaCalculationService`):**
- **Devengado FIJO:** `salario_base × (dias_trabajados / dias_periodo) + total_incapacidades_remuneradas + total_horas_extra + total_recargos`. `dias_trabajados = dias_periodo - dias_ausencia_no_remunerada`.
- **Devengado VARIABLE:** `Σ jornales.valor_total + Σ cosecha_cuadrilla.valor_calculado + ...` (solo operaciones APROBADAS). `dias_trabajados = count(distinct DATE(operacion.fecha))`.
- **Subsidio de transporte:** columna directa en `nomina_empleado.subsidio_transporte` (NO es concepto). Aplica si `salario_base ≤ 2 × SMLV`. Monto: `tenant_config.auxilio_transporte × (dias_trabajados / dias_periodo)`. No suma al IBC (no es salario).
- **Salud y Pensión:** sobre IBC = `total_devengado` (sin subsidio). Topes: mínimo 1 SMLV proporcional, máximo 25 SMLV proporcional al período. El porcentaje se obtiene de `NominaTablaLegal` vigente en `fecha_fin` de la nómina (`resolverPorcentaje()`); si el tenant no tiene tabla configurada para ese concepto, se usa `NominaConcepto.valor_referencia` como fallback (típicamente 4% cada uno, sembrado por `NominaConceptoSeeder`).
- **Fondo de Solidaridad Pensional:** un único tramo según IBC mensualizado en SMLV — FSP_1 (1.0% si >4 SMLV) hasta FSP_6 (2.0% si >20 SMLV). Ley 100/1993 art. 27, modif. Ley 797/2003.
- **Ausencias:** ya documentado en §6.9. EPS días 1-2 al 100%, días 3+ al 66.67%; ARL al 100%; permisos no remunerados/injustificadas descuentan `(salario/30) × dias × (1 − %pago/100)`.
- **Horas extras y recargos:** ya snapshotteados en `horas_extra.valor_calculado` (boot logic con divisor por tenant). El service de nómina solo agrega los APROBADOS del rango, separados en `total_horas_extra` (es_extra=true) y `total_recargos` (es_extra=false) — la separación es necesaria para reportes legales (UGPP/DIAN).

**Snapshots históricos:** una nómina CERRADA debe ser reproducible años después. Por eso al cerrar se persisten:
- `nomina_jornal_ref(jornal_id, valor_snapshot)`, `nomina_cosecha_ref(cosecha_cuadrilla_id, valor_snapshot)`, `nomina_hora_extra_ref(hora_extra_id, valor_snapshot)` — congelan los valores actuales.
- `nomina_empleado.cargo_snapshot`, `predio_snapshot`, `salario_minimo_snapshot` — congelan datos del empleado y el SMLV vigente al momento.
- `Ausencia.nomina_id` + `estado=LIQUIDADA`, `HoraExtra.nomina_id` + `estado=LIQUIDADA` — bloquean ediciones posteriores de los registros referenciados.

**Estados:** Nómina (`BORRADOR → CERRADA`, sin estado intermedio CALCULADA). NominaEmpleado (`PENDIENTE → LIQUIDADO`).

**Permisos Spatie:** `nomina.ver`, `nomina.crear`, `nomina.editar`, `nomina.eliminar`, `nomina.liquidar`, `nomina.cerrar`, `nomina-conceptos.ver`, `nomina-conceptos.gestionar`.

**Desprendible:** `GET /nomina-empleado/{id}/desprendible` (JSON), `GET .../desprendible/pdf` (DomPDF, paquete `barryvdh/laravel-dompdf`, vista en `resources/views/desprendible/nomina.blade.php`), `POST .../desprendible/whatsapp` (genera URL firmada del PDF para envío manual vía `wa.me/?text=URL` — placeholder de futura integración con WhatsApp Business API).

Modelos: NominaConcepto, NominaTablaLegal, Nomina, NominaEmpleado, NominaEmpleadoConcepto, NominaJornalRef, NominaCosechaRef, NominaHoraExtraRef.

Services: `NominaCalculationService` (preview + liquidar), `AgrupadorJornalesService` (resumen para VARIABLE), `CerrarNominaService` (cierre transaccional + snapshots), `DesprendibleService` (data + PDF + WhatsApp placeholder).

Controllers: `NominaController` (CRUD + indicadores + cerrar), `NominaEmpleadoController` (agregar/eliminar empleados, preview, resumen-trabajo, liquidar, desprendible), `NominaConceptoController` (CRUD del catálogo + select).

### 6.7 Módulo de Vacaciones

Gestiona solicitudes de vacaciones por empleado. Calcula automáticamente: 15 días hábiles por año trabajado (proporcional), valor del día = salario / 30. Maneja estados: PENDIENTE → APROBADA → PAGADA (se vincula con una nómina) o CANCELADA.

El **acumulado de vacaciones** (`vacacion_acumulado`) lleva el saldo: días generados, tomados, pagados, y disponibles por empleado.

Se puede habilitar/deshabilitar por tenant con `tenant_config.modulo_vacaciones`.

Modelos: Vacacion, VacacionAcumulado.

### 6.8 Módulo de Liquidación

Calcula las prestaciones sociales al retiro de un empleado según la legislación colombiana:

- **Cesantías:** salario × días_trabajados / 360
- **Intereses sobre cesantías:** cesantías × días × 12% / 360
- **Prima de servicios:** salario × días_trabajados / 360
- **Vacaciones no tomadas:** salario × días / 720
- **Indemnización:** Solo aplica si el motivo es DESPIDO_SIN_JUSTA_CAUSA. Para contratos indefinidos con salario ≤ 10 SMLV: 30 días por el primer año + 20 por cada año adicional.

El cálculo es atómico (transacción): se calculan todos los conceptos y se guardan en `liquidacion_detalle` con la fórmula aplicada. Estados: BORRADOR → APROBADA → PAGADA.

Se puede habilitar/deshabilitar por tenant con `tenant_config.modulo_liquidacion`.

Modelos: Liquidacion, LiquidacionDetalle.

### 6.9 Módulo de Ausencias

Las **ausencias** registran cuándo un empleado no está disponible para trabajar (incapacidades EPS/ARL, licencias, permisos, faltas injustificadas, suspensiones disciplinarias). Igual que los jornales y los registros de cosecha, **se reportan desde la operación diaria** (`operacion_id` es FK obligatoria), por lo que comparten los mismos permisos `operaciones.*` — no existen permisos específicos `ausencias.*`.

**Diseño por rango:** una sola fila cubre todo el período de la ausencia (`fecha_inicio` / `fecha_fin`). Una incapacidad de 15 días se registra como un único registro reportado desde la operación del día 1, con `fecha_fin` al día 15. Esto evita fragmentar el evento en N filas y permite adjuntar un único soporte (PDF de la EPS/epicrisis). Para una falta puntual de un día, `fecha_inicio = fecha_fin = operacion.fecha`.

**Convención de fecha_inicio:** se sincroniza automáticamente con `operacion.fecha` en el `creating` del modelo (`Ausencia::booted()`). Aunque es redundante con la operación padre, se mantiene como columna propia porque las queries de overlap por nómina (`WHERE fecha_inicio <= X AND fecha_fin >= Y`) son críticas para el cálculo y evitan un JOIN constante.

**Catálogo paramétrico `motivos_ausencia`:** tabla por tenant con variantes custom de motivos, cada una anclada a un `tipo_base` del enum fijo (`INCAPACIDAD_EPS`, `INCAPACIDAD_ARL`, `LICENCIA_MATERNIDAD`, `LICENCIA_PATERNIDAD`, `LICENCIA_LUTO`, `PERMISO_REMUNERADO`, `PERMISO_NO_REMUNERADO`, `AUSENCIA_INJUSTIFICADA`, `CALAMIDAD_DOMESTICA`, `SUSPENSION_DISCIPLINARIA`, `OTRO`). El check constraint BD restringe los valores válidos en `motivos_ausencia.tipo_base` y en `ausencias.tipo`. El tenant puede crear variantes ("Incapacidad EPS - gripa") todas con el mismo `tipo_base` — la nómina sigue decidiendo por `tipo`. El `MotivoAusenciaSeeder` crea 11 motivos base por tenant activo.

**Snapshot desde el motivo:** al crear una ausencia, el hook `Ausencia::booted()` snapshotea `tipo` ← `motivo.tipo_base`, `es_remunerada`, `afecta_nomina`, y `porcentaje_pago` (default) desde `motivo_ausencia`. Los valores históricos no cambian si el admin edita el motivo después.

**Flujo de aprobación:**
1. Se crea en estado `PENDIENTE` desde la operación diaria.
2. Un usuario con permiso `operaciones.editar` la pasa a `APROBADA` (queda registrada `aprobado_por` y `aprobado_at`). Solo las APROBADAS afectan la nómina.
3. Cuando una nómina cerrada incluye la ausencia, su `nomina_id` se setea y el estado pasa a `LIQUIDADA` (queda inmutable).
4. Estado `RECHAZADA` para casos donde el soporte no llegó o no procede.

**Afectación a la nómina:**

| Tipo de empleado | Tipo de ausencia | Efecto |
|---|---|---|
| **FIJO** | No remunerada (PERMISO_NO_REMUNERADO, AUSENCIA_INJUSTIFICADA) | Descuenta `(salario/30) × días × (1 − %_pago/100)` del `total_devengado` |
| **FIJO** | Incapacidad EPS días 1-2 | La empresa paga 100%, no descuenta |
| **FIJO** | Incapacidad EPS días 3+ | Paga 66.67%, descuenta 33.33% (recobro a EPS queda fuera de scope) |
| **FIJO** | Incapacidad ARL | Paga 100%, no descuenta |
| **FIJO** | Licencias remuneradas (maternidad, paternidad, luto) | Suma a `total_ausencias_remunerado`, no descuenta |
| **VARIABLE** | Cualquier ausencia no remunerada | No descuenta (no cobra fijo), solo se registra para tracking |
| **VARIABLE** | Incapacidad EPS/ARL | Suma a `total_ausencias_remunerado` (la empresa adelanta el pago) |

Para soportar esto, `nomina_empleado` tiene 3 columnas adicionales: `dias_ausencia_descontados` (decimal), `total_ausencias_descuento` (decimal), `total_ausencias_remunerado` (decimal). El desprendible muestra los tres conceptos por separado.

**Lógica de cálculo (a implementar en `NominaCalculationService` cuando se construya el módulo de nómina):**
- Buscar `Ausencia::aprobadas()->afectanNomina()->enRango($nomina->fecha_inicio, $nomina->fecha_fin)->where('empleado_id', $empleado->id)->get()`.
- Por cada ausencia: `dias_aplicables = ausencia->getDiasEnRango($nomina->fecha_inicio, $nomina->fecha_fin)`.
- Aplicar la regla según tipo de empleado y tipo de ausencia.
- Al cerrar la nómina, marcar `ausencia.nomina_id` y `estado = LIQUIDADA`.

**Recobros EPS/ARL:** este módulo **no** trackea el valor a recobrar a la entidad. Solo calcula la afectación al pago del empleado. El recobro queda para un módulo futuro de tesorería.

**Soporte offline:** la tabla incluye `sync_uuid` y `sync_estado`, igual que `jornales` y `registro_cosecha`, para que la PWA pueda registrar ausencias en campo sin internet.

**API expuesta:**
- `AusenciaController`: `POST /operaciones/{id}/ausencias`, `PUT|DELETE /ausencias/{id}`, `POST /ausencias/{id}/aprobar`, `POST /ausencias/{id}/rechazar` (con `motivo_rechazo` obligatorio en columna dedicada), `POST /ausencias/{id}/documento` (multipart PDF/imagen, máx 5MB, guardado en `storage/app/tenants/{tenant}/ausencias/{id}/`).
- `MotivoAusenciaController`: CRUD paramétrico bajo `configuracion.editar` + `GET /motivos-ausencia/select` abierto a operadores del wizard.
- El wizard del Paso 4 pide solo: `empleado_id`, `motivo_ausencia_id`, `motivo` (observación). Los campos avanzados (`fecha_fin`, `entidad`, `numero_radicado`, `porcentaje_pago`) son opcionales y normalmente los llena el admin desde otro módulo.
- Aprobar/rechazar/subir documento **funcionan incluso con la operación APROBADA** (flujo administrativo posterior al cierre). PUT/DELETE sí quedan bloqueados con 409 `OPERACION_APROBADA`.
- Subir documento también bloquea con 409 `AUSENCIA_LIQUIDADA` si la ausencia ya se cerró en nómina.
- Contrato completo: [docs/API_AUSENCIAS.md](docs/API_AUSENCIAS.md).

Modelos: Ausencia, MotivoAusencia.

### 6.10 Auditoría

Registra todas las acciones del sistema: login, logout, crear, editar, eliminar. Cada registro guarda: tenant_id, user_id, acción, módulo, observaciones, IP, user agent, y snapshots JSON de datos anteriores y nuevos (para poder ver exactamente qué cambió).

Modelo: Auditoria.

### 6.11 Chat del Agente IA

Un agente de IA externo se conecta directamente a la base de datos PostgreSQL para asistir a los usuarios con consultas sobre su finca. Puede leer todo el esquema Laravel (empleados, predios, lotes, palmas, jornales, nómina, etc.) y persiste las conversaciones en dos tablas propias con prefijo `agro_`:

- **`agro_chat_sessions`** — cada sesión es una conversación del usuario con el agente. Lleva `user_id` y `tenant_id` (ambos con `ON DELETE CASCADE`), `titulo` opcional y `created_at`/`updated_at` en `TIMESTAMPTZ`.
- **`agro_chat_messages`** — mensajes individuales dentro de una sesión. Columnas clave: `role` (`user` | `assistant` | `system` | `tool`), `content` (texto), `tool_calls` (JSONB con las consultas SQL que ejecutó el agente, útil para auditoría), y telemetría opcional `tokens_in`/`tokens_out`.

**Operaciones de escritura del agente (las únicas 4):**
1. Crear sesión: `INSERT INTO agro_chat_sessions (user_id, tenant_id, titulo) VALUES (...)`
2. Insertar mensaje (tanto del usuario como de la respuesta del AI): `INSERT INTO agro_chat_messages (...)`
3. Tras cada mensaje: `UPDATE agro_chat_sessions SET updated_at = NOW() WHERE id = ?`
4. Borrar sesión: `DELETE FROM agro_chat_sessions WHERE id = ? AND user_id = ?` (la cascada elimina los mensajes).

**Opcional (si se habilita más adelante):** renombrar sesión (`UPDATE agro_chat_sessions SET titulo = ?`). No hay tabla propia de login audit: el agente puede reutilizar la tabla `auditorias` de Laravel.

**Aislamiento multi-tenant:** aunque estas tablas son usadas por un servicio externo (no por los controllers Laravel) y por tanto **no** pasan por `BelongsToTenant`, el agente debe siempre incluir `tenant_id` y `user_id` en sus inserts y filtrar por ambos campos en sus queries para evitar fugas de información entre fincas.

### 6.12 Bot de Integraciones (consumo externo de la API)

El sistema soporta un **bot externo** (cliente Python) que lee correos y consume endpoints de la API en nombre de cualquier finca. Está pensado para integraciones donde la información llega por correo (alertas, remisiones, eventos) y debe insertarse/actualizarse en uno o más tenants automáticamente.

**Estrategia de autenticación elegida:** un único usuario `bot@d3vs.tech` con `is_super_admin = true`, **desacoplado de `tenant_user`**. No tiene fila en la pivot ni permisos de Spatie. Se eligió esta estrategia porque el código ya tiene bypass total para super_admin en toda la cadena (`User::hasAccessToTenant`, `SetTenant`, `CheckPermission`), lo que significa que el bot puede operar sobre **cualquier tenant existente o futuro sin provisionamiento adicional**. Cuando se crea una finca nueva, el bot ya puede llamarla automáticamente.

**Por qué no se usó el modelo "usuario regular asignado por tenant":** habría requerido correr un seeder cada vez que se creara una finca para insertar al bot en `tenant_user` y asignarle permisos directos en cada tenant. Operativamente frágil.

**Por qué `/api/v1/auth/login` y NO `/api/v1/tenant-auth/login`:** el `TenantAuthController::login` bloquea explícitamente a super_admins con código `USE_ADMIN_LOGIN`. El `AuthController::login` (panel de super_admin) es el endpoint correcto para el bot.

**Flujo del bot:**

1. **Login (al iniciar y al expirar el token base, cada ~60 min):**
   `POST /api/v1/auth/login` con `{ email: "bot@d3vs.tech", password: <BOT_USER_PASSWORD> }` → recibe `token` base sin claim de tenant.

2. **Extraer `tenant_id` del correo:** el bot lee el "número de remisión" del correo procesado y de ahí saca el `tenant_id` (cada correo trae el identificador explícito).

3. **Select-tenant (cacheado por tenant en memoria):**
   `POST /api/v1/auth/select-tenant` con `Authorization: Bearer <token_base>` y `{ "tenant_id": X }` → recibe nuevo `token` con `tenant_id` en sus claims. `rol` viene `null` y `permisos: []` (esperado para super_admin sin pivot).

4. **Llamar al endpoint de negocio:**
   `POST /api/v1/tenant/<endpoint>` con `Authorization: Bearer <token_tenant>` y `X-Tenant-Id: X`. El header es **obligatorio** aunque el JWT ya tenga el claim, porque `SetTenant` lo lee del header.

**Reglas críticas para el cliente Python:**
- **No usar `/refresh`** — `persistent_claims` está vacío en `config/jwt.php`, así que un refresh devolvería un token sin `tenant_id`. Es más simple re-loguearse con email/password.
- **Cachear un token por tenant** en un dict en memoria con safety window de 60s; no llamar `select-tenant` por cada correo del mismo tenant.
- **Reintento único en 401** (token caducado o invalidado): vaciar caches, re-loguear, reintentar una sola vez.
- **No reintentar 403/404** (tenant inactivo, tenant inexistente, bot desactivado).

**Endpoint de prueba implementado:** `POST /api/v1/tenant/bot/test` ([app/Http/Controllers/Api/BotTestController.php](app/Http/Controllers/Api/BotTestController.php)). Solo escribe `BOT_TEST consumido` en `storage/logs/laravel.log` con `user_id`, `email`, `tenant_id`, IP, user agent y payload. Sirve para validar end-to-end toda la cadena de auth sin tocar BD.

**Auditoría transparente:** toda llamada del bot queda registrada automáticamente en `auditorias` con `user_id` del bot y el `tenant_id` correcto (login + acciones de negocio). El bot no necesita hacer nada especial.

**Nota de seguridad:** otorgar `super_admin` al bot le da acceso técnico a TODOS los tenants. Es aceptable porque (a) el bot vive en un servidor controlado, (b) sus credenciales están en `.env`, (c) solo va a consumir endpoints muy acotados, (d) toda acción queda en auditoría. Si en el futuro el bot pasara a infra del cliente, habría que volver a discutir el modelo.

Documentación completa para el desarrollador del bot: [docs/API_BOT.md](docs/API_BOT.md).

### 6.13 Módulo de Horas Extras

Las **horas extras** son el Paso 4 del wizard de Planilla del Día. Registran el tiempo trabajado por encima de la jornada ordinaria (o los recargos por trabajar en franja nocturna / dominical / festivo) y alimentan la nómina del período. El diseño replica el patrón de Ausencias: un **catálogo paramétrico por tenant** (`tipos_hora_extra`) + **registros anidados** (`horas_extra`) + **máquina de estados** PENDIENTE → APROBADA / RECHAZADA → LIQUIDADA.

**Marco legal colombiano** (Código Sustantivo del Trabajo arts. 168, 179 y Ley 789/2002 art. 26):

| Código | Nombre | % recargo | `es_extra` | `paga_hora_completa` |
|---|---|---|---|---|
| HED  | Hora Extra Diurna (6am-9pm)             | 25%  | sí | sí |
| HEN  | Hora Extra Nocturna (9pm-6am)           | 75%  | sí | sí |
| RN   | Recargo Nocturno (solo recargo)         | 35%  | no | no |
| HRD  | Hora Ordinaria Dominical/Festivo        | 75%  | no | sí |
| HEDF | Hora Extra Diurna Dominical/Festivo     | 100% | sí | sí |
| HENF | Hora Extra Nocturna Dominical/Festivo   | 150% | sí | sí |
| RND  | Recargo Nocturno Dominical/Festivo      | 110% | no | no |

`es_extra = false` en RN, HRD y RND porque son **recargos sobre jornada ordinaria**, no tiempo trabajado por encima de la jornada máxima. `paga_hora_completa = false` en RN/RND porque esos recargos solo añaden el porcentaje al salario base (la hora ordinaria ya está cubierta). HRD paga la hora completa porque aplica cuando el empleado trabaja en día de descanso legal.

**Fórmula de cálculo:**
```
valor_hora_base = empleado.salario_base / tenant_config.divisor_jornada_mensual  // 240 por default

paga_hora_completa = true  → valor_calculado = cantidad_horas × valor_hora_base × (1 + %recargo/100)
paga_hora_completa = false → valor_calculado = cantidad_horas × valor_hora_base × (%recargo/100)
```

Si el empleado no tiene `salario_base` (modalidad PRODUCCION sin pactar), se cae al `tenant_config.salario_minimo_vigente`. Si ambos son null, la API responde 422 `CALC_ERROR`.

**Divisor per-tenant** en `tenant_config.divisor_jornada_mensual` (`smallint NOT NULL default 240`). Valores permitidos: **240** (48h/sem × ~5 semanas — CST tradicional) o **210** (42h/sem — Ley 2101/2021). Al crear una finca desde el super-admin se inicializa automáticamente en 240. El admin del tenant puede cambiarlo vía `PUT /api/v1/tenant/configuracion/nomina` (validación `in:210,240`). El cambio solo afecta nuevas horas extras — los registros existentes tienen `valor_hora_base` snapshotteado al momento de crearse.

**Snapshots**: al crear una hora extra se copian `codigo`, `porcentaje_recargo`, `paga_hora_completa` del tipo paramétrico a la fila. Si luego el admin edita el tipo, los registros históricos no cambian. Lo mismo con `valor_hora_base` (se calcula al momento del registro).

**Relación con nómina**: `nomina_empleado` tiene dos totales separados — `total_horas_extra` (suma de `es_extra=true`) y `total_recargos` (suma de `es_extra=false`) — porque las prestaciones sociales se calculan distinto sobre ambos rubros (cesantías, prima, vacaciones). Los snapshots de cierre viven en `nomina_hora_extra_ref`.

**API expuesta:**
- `HoraExtraController`: `POST /operaciones/{id}/horas-extra`, `PUT|DELETE /horas-extra/{id}`, `POST /horas-extra/{id}/aprobar|rechazar`.
- `TipoHoraExtraController`: CRUD paramétrico bajo `configuracion.editar` + `GET /tipos-hora-extra/select` abierto a operadores (`operaciones.crear|editar`) para poblar el dropdown "Tipo de Hora" del Paso 4.
- Bloqueos: 409 `OPERACION_APROBADA`, 409 `HORA_EXTRA_LIQUIDADA`, 409 `HORA_EXTRA_ESTADO_INVALIDO`, 409 `TIPO_HORA_EXTRA_CON_REGISTROS`, 422 `CALC_ERROR`.
- Seeder `TipoHoraExtraSeeder` siembra los 7 tipos legales por tenant (idempotente, usa `updateOrCreate` sobre `(tenant_id, codigo)`).

Modelos: TipoHoraExtra, HoraExtra, NominaHoraExtraRef. Contrato completo con payloads y ejemplos: [docs/API_HORAS_EXTRA.md](docs/API_HORAS_EXTRA.md).

---

## 7. Permisos y Control de Acceso

### 7.1 Super Admin

- Accede al panel `/api/admin/*`
- CRUD de tenants (crear, editar, activar, suspender, eliminar)
- Gestiona usuarios por tenant (asignar, remover, asignar como ADMIN)
- Ve el dashboard de Laravel Pulse (/pulse)
- Puede acceder a cualquier tenant como si fuera ADMIN

### 7.2 Modelo de acceso por Tenant (basado en permisos directos)

El sistema usa **permisos directos** en lugar de múltiples roles. Solo existen dos tipos de usuario dentro de un tenant:

**ADMIN:** Tiene automáticamente todos los permisos del sistema. Es creado por el super_admin al configurar la finca. Sus permisos no son editables.

**USUARIO:** No tiene permisos por defecto. El ADMIN le asigna permisos específicos de forma individual según sus responsabilidades. Los permisos se asignan directamente (sin intermediar un rol de Spatie).

> **Nota:** Los roles LIDER DE CAMPO y PROPIETARIO fueron eliminados. Todo usuario que no sea ADMIN es USUARIO y recibe permisos directos.

### 7.3 Flujo de asignación de permisos

1. El super_admin crea una finca y asigna un usuario ADMIN
2. El ADMIN inicia sesión → tiene todos los permisos automáticamente
3. El ADMIN crea usuarios → se crean como USUARIO (sin permisos)
4. El ADMIN asigna permisos específicos a cada USUARIO desde el módulo de permisos
5. El USUARIO inicia sesión → solo tiene los permisos directos que le fueron asignados

### 7.4 Lista de permisos del sistema

Los permisos están agrupados por módulo y son los mismos para todos los tenants:

- **Dashboard:** `dashboard.ver`
- **Plantación:** `lotes.*`, `sublotes.*`, `lineas.*`, `palmas.*` (ver, crear, editar, eliminar cada uno)
- **Colaboradores:** `colaboradores.*`, `contratos.*`
- **Operaciones:** `operaciones.*`, `cosecha.*`, `jornales.*`, `auxiliares.*`
- **Viajes:** `viajes.*`
- **Nómina:** `nomina.ver`, `nomina.crear`, `nomina.editar`, `nomina.eliminar`, `nomina.liquidar`, `nomina.cerrar`, `nomina-conceptos.ver`, `nomina-conceptos.gestionar`
- **Usuarios:** `usuarios.ver`, `usuarios.crear`, `usuarios.editar`, `usuarios.eliminar`, `usuarios.ver_permisos`, `usuarios.editar_permisos`, `usuarios.desactivar`
- **Configuración:** `configuracion.editar`

### 7.5 Dependencias de permisos

Al asignar un permiso padre, el backend expande automáticamente las dependencias:
- `colaboradores.ver` → incluye `contratos.ver`
- (Aplica igualmente para `.crear`, `.editar`, `.eliminar`)

> **Nota:** Los permisos de plantación (`lotes.*`, `sublotes.*`, `lineas.*`, `palmas.*`) son independientes entre sí. Asignar uno NO arrastra los demás.

---

## 8. Estructura de Archivos del Proyecto

```
agro-campo/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php              ← Base controller
│   │   │   └── Api/
│   │   │       ├── AuthController.php      ← Login, register, refresh, me, select-tenant
│   │   │       ├── TenantAuthController.php ← Login para usuarios de tenant
│   │   │       ├── TenantController.php    ← CRUD tenants (super-admin)
│   │   │       ├── PredioController.php    ← CRUD predios + resumen() jerárquico (negocio)
│   │   │       ├── LoteController.php      ← CRUD lotes + semillas (negocio)
│   │   │       ├── SubloteController.php   ← CRUD sublotes + auto-creación de palmas (negocio)
│   │   │       ├── LineaController.php     ← CRUD líneas (metadata opcional, independiente de palmas)
│   │   │       ├── PalmaController.php     ← CRUD palmas + eliminación masiva + bulk sync/async (batchStatus)
│   │   │       ├── TenantUserController.php ← Gestión usuarios del tenant
│   │   │       ├── UserPermissionController.php ← Permisos de usuarios
│   │   │       ├── EmpleadoController.php   ← CRUD colaboradores + toggle
│   │   │       ├── EmpleadoImportacionController.php ← Importación masiva (importar + estado)
│   │   │       ├── TenantSettingsController.php ← Configuración de la finca
│   │   │       ├── ProfileController.php   ← Perfil y cambio de contraseña
│   │   │       ├── PasswordResetController.php ← Recuperación de contraseña
│   │   │       └── BotTestController.php   ← Endpoint de prueba para el bot externo (log only)
│   │   ├── Requests/
│   │   │   ├── Predio/
│   │   │   │   ├── StorePredioRequest.php  ← Validación crear predio
│   │   │   │   └── UpdatePredioRequest.php ← Validación editar predio
│   │   │   ├── Lote/
│   │   │   │   ├── StoreLoteRequest.php    ← Validación crear lote + hectáreas + semillas
│   │   │   │   └── UpdateLoteRequest.php   ← Validación editar lote + hectáreas + semillas
│   │   │   ├── Sublote/
│   │   │   │   ├── StoreSubloteRequest.php ← Validación crear sublote
│   │   │   │   └── UpdateSubloteRequest.php← Validación editar sublote
│   │   │   ├── Palma/
│   │   │   │   ├── StorePalmaRequest.php   ← Validación crear palma individual
│   │   │   │   ├── UpdatePalmaRequest.php  ← Validación editar palma (descripcion, estado)
│   │   │   │   └── DestroyMasivoPalmaRequest.php ← Validación eliminación masiva (palmas_ids)
│   │   │   └── Empleado/
│   │   │       ├── StoreEmpleadoRequest.php        ← Validación crear colaborador (edad ≥ 14)
│   │   │       ├── UpdateEmpleadoRequest.php       ← Validación editar colaborador
│   │   │       └── ImportarEmpleadosRequest.php    ← Validación archivo Excel (xlsx/xls, máx 5 MB)
│   │   └── Middleware/
│   │       ├── SetTenant.php               ← Resuelve y valida tenant por request
│   │       ├── CheckPermission.php         ← Verifica permiso Spatie por ruta
│   │       └── SuperAdmin.php              ← Protege rutas /api/admin/*
│   ├── Models/
│   │   ├── Traits/
│   │   │   └── BelongsToTenant.php         ← Global Scope + auto-assign tenant_id
│   │   ├── User.php                        ← JWT + relaciones tenant
│   │   ├── Tenant.php                      ← Finca/empresa
│   │   ├── TenantConfig.php                ← Configuración por finca
│   │   ├── TenantUser.php                  ← Pivot usuario ↔ tenant
│   │   ├── Auditoria.php                   ← Log de acciones
│   │   ├── Predio.php                      ← Finca/hacienda
│   │   ├── Lote.php                        ← División del predio
│   │   ├── Sublote.php                     ← Subdivisión del lote
│   │   ├── Linea.php                       ← Metadata opcional de líneas por sublote (independiente de palmas)
│   │   ├── Palma.php                       ← Planta individual (ref: sublote_id)
│   │   ├── Semilla.php                     ← Variedad de palma
│   │   ├── SemillaLote.php                 ← Pivot semilla ↔ lote
│   │   ├── PromedioLote.php                ← Kg/gajo promedio por año
│   │   ├── PrecioCosecha.php               ← Precio por lote y año
│   │   ├── Insumo.php                      ← Fertilizante/herbicida
│   │   ├── PrecioAbono.php                 ← Rango de precio por dosis
│   │   ├── Labor.php                       ← Tipo de trabajo
│   │   ├── ModalidadContrato.php           ← Tipo de contrato
│   │   ├── Cargo.php                       ← Puesto (fijo/variable)
│   │   ├── Empleado.php                    ← Trabajador completo
│   │   ├── EmpleadoContrato.php            ← Historial de contratos laborales
│   │   ├── EmpleadoDocumento.php           ← Documentos digitales del empleado
│   │   ├── ImportacionEmpleados.php        ← Registro/estado de importación masiva xlsx
│   │   ├── Jornal.php                      ← Registro diario de trabajo
│   │   ├── Viaje.php                       ← Transporte de fruto
│   │   ├── RegistroCosecha.php             ← Producción por sublote
│   │   ├── ViajeDetalle.php                ← Pivot viaje ↔ cosecha
│   │   ├── CosechaCuadrilla.php            ← Distribución entre empleados
│   │   ├── NominaConcepto.php              ← Catálogo deducciones/bonificaciones
│   │   ├── NominaTablaLegal.php            ← Porcentajes legales con vigencia
│   │   ├── Nomina.php                      ← Período de nómina
│   │   ├── NominaEmpleado.php              ← Línea por empleado
│   │   ├── NominaEmpleadoConcepto.php      ← Detalle de cada concepto
│   │   ├── NominaJornalRef.php             ← Snapshot de jornales
│   │   ├── NominaCosechaRef.php            ← Snapshot de cosechas
│   │   ├── Vacacion.php                    ← Solicitud de vacaciones
│   │   ├── VacacionAcumulado.php           ← Saldo de días
│   │   ├── Liquidacion.php                 ← Prestaciones al retiro
│   │   ├── LiquidacionDetalle.php          ← Desglose de liquidación
│   │   ├── Ausencia.php                    ← Ausencias reportadas desde la operación diaria
│   │   ├── MotivoAusencia.php              ← Catálogo paramétrico de motivos por tenant
│   │   ├── EmpresaTransportadora.php       ← Catálogo paramétrico de empresas de transporte (viajes)
│   │   ├── Transportador.php               ← Conductor + placa, hijo de EmpresaTransportadora
│   │   └── Extractora.php                  ← Planta extractora destino del viaje
│   ├── Constants/
│   │   ├── DocumentoCategoria.php          ← Categorías y tipos de documentos del empleado
│   │   └── ViajeEstado.php                 ← Máquina de estados del viaje (CREADO/EN_CAMINO/EN_PLANTA/FINALIZADO)
│   ├── Jobs/
│   │   ├── CrearPalmasJob.php              ← Job async para bulk de palmas (> 5.000). ShouldBeUnique por sublote, timeout 300s, 1 try
│   │   └── ProcesarImportacionEmpleadosJob.php ← Job importación masiva colaboradores (chunks 100, timeout 300s, 1 try)
│   ├── Services/
│   │   ├── AuditoriaService.php            ← Registra acciones CRUD, login, logout
│   │   └── PalmaCreationService.php        ← Lógica sync/async de creación de palmas (chunking + dispatch Bus::batch)
│   └── Providers/
│       └── AppServiceProvider.php          ← Gate viewPulse para super-admin
├── bootstrap/
│   └── app.php                             ← Middleware aliases + JWT exceptions
├── config/
│   └── auth.php                            ← Guard JWT configurado
├── database/
│   ├── migrations/                         ← 8+ migraciones (35 tablas)
│   └── seeders/
│       ├── DatabaseSeeder.php              ← Super-admin + tenant demo + ADMIN + 2 usuarios con permisos directos
│       ├── RolesAndPermissionsSeeder.php   ← Permisos Spatie del sistema + rol ADMIN
│       └── BotUserSeeder.php               ← Usuario bot@d3vs.tech (super_admin, integraciones externas)
├── routes/
│   └── api.php                             ← 3 grupos: auth, admin, negocio
├── docs/
│   ├── API_PLANTACION.md                        ← Doc endpoints Predios, Lotes, Sublotes, Líneas, Palmas
│   ├── API_COLABORADORES.md                     ← Doc colaboradores + documentos
│   ├── API_IMPORTACION_COLABORADORES.md         ← Estructura Excel + endpoints importación masiva
│   ├── API_USUARIOS_TENANT.md              ← Doc gestión usuarios del tenant
│   ├── API_BOT.md                          ← Guía de integración del bot Python (auth, flujo, errores, cliente)
│   └── API_VIAJES.md                       ← Contrato del módulo de Viajes (paramétricas, máquina de estados, KPIs)
├── SETUP.md                                ← Guía de instalación paso a paso
└── TAREAS.md                               ← Lista completa de tareas back + front
```

---

## 9. Estructura de Rutas API

### Grupo 1: Autenticación (público, sin JWT)
```
# Super-admin
POST   /api/v1/auth/login                       → Token JWT (bloquea no super-admins)
POST   /api/v1/auth/register                    → Crear usuario + token
POST   /api/v1/auth/forgot-password             → Enlace de reset (PasswordResetController)
POST   /api/v1/auth/reset-password              → Restablecer contraseña

# Finca (tenant)
POST   /api/v1/tenant-auth/login                → Login users de finca (bloquea super-admins)

# Portal Proveedor (marketplace)
POST   /api/v1/proveedor-auth/login             → Login users-proveedor (bloquea super-admins; requiere market_proveedor_user activo)
POST   /api/v1/proveedor-auth/forgot-password   → Enlace de reset; respuesta genérica anti-enumeración; URL apunta a FRONTEND_PROVEEDOR_URL
POST   /api/v1/proveedor-auth/reset-password    → Restablecer contraseña
```

### Grupo 2: Autenticación (requiere JWT)
```
# Super-admin
POST   /api/v1/auth/logout                      → Invalidar token
POST   /api/v1/auth/refresh                     → Renovar token
GET    /api/v1/auth/me                          → Usuario + tenants
POST   /api/v1/auth/select-tenant               → Token con tenant en claims

# Finca (tenant)
POST   /api/v1/tenant-auth/select-tenant        → Token con tenant_id + tenant_role en claims
GET    /api/v1/tenant-auth/me                   → Usuario + tenants activos
POST   /api/v1/tenant-auth/logout
POST   /api/v1/tenant-auth/refresh

# Portal Proveedor (marketplace)
POST   /api/v1/proveedor-auth/select-proveedor  → Token con proveedor_id + proveedor_role en claims
GET    /api/v1/proveedor-auth/me                → Usuario + proveedores activos
POST   /api/v1/proveedor-auth/logout
POST   /api/v1/proveedor-auth/refresh
```

### Grupo 3: Super Admin (JWT + is_super_admin)
```
GET    /api/admin/tenants             → Listar tenants (paginado, filtros)
POST   /api/admin/tenants             → Crear tenant + config
GET    /api/admin/tenants/:id         → Detalle con config y usuarios
PUT    /api/admin/tenants/:id         → Editar tenant y/o config
DELETE /api/admin/tenants/:id         → Soft delete
PATCH  /api/admin/tenants/:id/toggle  → Activar/suspender
POST   /api/admin/tenants/:id/users   → Asignar usuario (ADMIN o USUARIO)
DELETE /api/admin/tenants/:id/users/:userId → Remover usuario

# Market — Proveedores (empresas vendedoras del marketplace)
GET    /api/admin/market/proveedores             → Listar proveedores (paginado, filtros estado/ciudad/departamento/buscar)
POST   /api/admin/market/proveedores             → Crear proveedor
GET    /api/admin/market/proveedores/:id         → Detalle (con usuarios + conteos)
PUT    /api/admin/market/proveedores/:id         → Editar proveedor
DELETE /api/admin/market/proveedores/:id         → Soft delete (422 PROVIDER_ACTIVE si está activo)
PATCH  /api/admin/market/proveedores/:id/toggle  → Activo ⇄ Suspendido
GET    /api/admin/market/proveedores/:id/usuarios            → Listar usuarios del proveedor
POST   /api/admin/market/proveedores/:id/usuarios            → Asignar user existente o crear nuevo (rol ADMIN|OPERADOR)
PUT    /api/admin/market/proveedores/:id/usuarios/:userId    → Editar user + pivot (rol, estado)
DELETE /api/admin/market/proveedores/:id/usuarios/:userId    → Desvincular user del proveedor
```

### Grupo 4: Negocio (JWT + X-Tenant-Id)

**Implementados (CRUD completo con auditoría y permisos):**
```
GET             /api/v1/tenant/dashboard            → Dashboard finca (indicadores, lotes, viajes, lluvias) (dashboard.ver)
GET             /api/v1/tenant/eps/select           → Dropdown EPS (configuracion.editar O colaboradores.{ver|crear|editar})
GET|POST        /api/v1/tenant/eps                  → Listar / Crear EPS (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/eps/:id              → Ver / Editar / Eliminar EPS (configuracion.editar)
GET             /api/v1/tenant/fondos-pension/select → Dropdown Fondos de Pensión (configuracion.editar O colaboradores.{ver|crear|editar})
GET|POST        /api/v1/tenant/fondos-pension       → Listar / Crear fondo de pensión (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/fondos-pension/:id   → Ver / Editar / Eliminar fondo de pensión (configuracion.editar)
GET             /api/v1/tenant/arl/select           → Dropdown ARL (configuracion.editar O colaboradores.{ver|crear|editar})
GET|POST        /api/v1/tenant/arl                  → Listar / Crear ARL (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/arl/:id              → Ver / Editar / Eliminar ARL (configuracion.editar)
GET             /api/v1/tenant/entidades-bancarias/select → Dropdown Entidades Bancarias (configuracion.editar O colaboradores.{ver|crear|editar})
GET|POST        /api/v1/tenant/entidades-bancarias  → Listar / Crear entidad bancaria (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/entidades-bancarias/:id → Ver / Editar / Eliminar entidad bancaria (configuracion.editar)
GET|POST        /api/v1/tenant/predios              → Listar (con palmas_count) / Crear predio  (lotes.ver / lotes.crear)
GET             /api/v1/tenant/predios/:id/resumen  → Jerarquía completa + totales para wizard  (lotes.ver)
GET|PUT|DELETE  /api/v1/tenant/predios/:id          → Ver / Editar / Eliminar   (lotes.ver / lotes.editar / lotes.eliminar)
GET             /api/v1/tenant/semillas/select      → Dropdown semillas activas (configuracion.editar O lotes.{ver|crear|editar})
GET|POST        /api/v1/tenant/semillas             → Listar / Crear semilla (tipo: Africana|Híbrido|Compacta|Americana) (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/semillas/:id         → Ver / Editar / Eliminar (409 SEMILLA_CON_LOTES si está en uso) (configuracion.editar)
GET|POST        /api/v1/tenant/promedios-lote       → Listar / Crear promedio kg/gajo por lote+año (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/promedios-lote/:id   → Ver / Editar / Eliminar (409 PROMEDIO_DUPLICADO si lote+año duplicado) (configuracion.editar)
GET             /api/v1/tenant/lotes/semillas       → Listar semillas activas   (lotes.ver)
GET|POST        /api/v1/tenant/lotes                → Listar / Crear lote       (lotes.ver / lotes.crear)
GET             /api/v1/tenant/lotes/select         → Dropdown lotes del módulo Plantación (lotes.ver O operaciones.{crear|editar})
GET|PUT|DELETE  /api/v1/tenant/lotes/:id            → Ver / Editar / Eliminar   (lotes.ver / lotes.editar / lotes.eliminar)
GET|POST        /api/v1/tenant/sublotes             → Listar / Crear sublote    (sublotes.ver / sublotes.crear)
GET             /api/v1/tenant/sublotes/select      → Dropdown sublotes del módulo Plantación (sublotes.ver O operaciones.{crear|editar})
GET|PUT|DELETE  /api/v1/tenant/sublotes/:id         → Ver / Editar / Eliminar   (sublotes.ver / sublotes.editar / sublotes.eliminar)
GET             /api/v1/tenant/operaciones/lotes/select    → Dropdown lotes para el wizard de Operaciones (operaciones.crear O operaciones.editar)
GET             /api/v1/tenant/operaciones/sublotes/select → Dropdown sublotes para el wizard, incluye cantidad_palmas para autofill (operaciones.crear O operaciones.editar)
POST            /api/v1/tenant/operaciones/insumos         → Crear insumo desde wizard ("Otro" en FERTILIZACION). Solo recibe nombre; unidad_medida='GRAMOS' default. 409 INSUMO_DUPLICADO si ya existe en el tenant. (operaciones.crear O operaciones.editar)
GET|POST        /api/v1/tenant/lineas               → Listar / Crear línea      (lineas.ver / lineas.crear)
GET|PUT|DELETE  /api/v1/tenant/lineas/:id           → Ver / Editar / Eliminar   (lineas.ver / lineas.editar / lineas.eliminar)
GET             /api/v1/tenant/palmas/batch/:batchId → Estado de batch async de palmas (palmas.ver)
DELETE          /api/v1/tenant/palmas/masivo         → Eliminación masiva        (palmas.eliminar)
GET|POST        /api/v1/tenant/palmas               → Listar / Crear palmas en bulk (sync ≤5.000 → 201, async >5.000 → 202 + batch_id)  (palmas.ver / palmas.crear)
GET|PUT         /api/v1/tenant/palmas/:id           → Ver / Editar palma        (palmas.ver / palmas.editar)
GET|POST        /api/v1/tenant/usuarios             → Listar / Crear usuario    (usuarios.ver / usuarios.crear)
PUT|DELETE      /api/v1/tenant/usuarios/:id         → Editar / Eliminar usuario (usuarios.editar / usuarios.eliminar)
PATCH           /api/v1/tenant/usuarios/:id/toggle  → Activar/Desactivar        (usuarios.desactivar)
GET|PUT         /api/v1/tenant/usuarios/:id/permisos → Ver / Editar permisos    (usuarios.ver_permisos / usuarios.editar_permisos)
DELETE          /api/v1/tenant/usuarios/:id/permisos → Resetear permisos        (usuarios.editar_permisos)
GET|PUT         /api/v1/tenant/configuracion/info-empresa       → Ver / Editar datos de la empresa (nombre, NIT, rep. legal, contacto, logo) (configuracion.editar)
PUT             /api/v1/tenant/configuracion/finca             → Alias legacy de PUT /configuracion/info-empresa (configuracion.editar)
GET|PUT         /api/v1/tenant/configuracion/nomina            → Ver / Editar configuración de nómina del tenant (tipo_pago_nomina, SMLV, auxilio, divisor_jornada) (configuracion.editar)
GET|PUT         /api/v1/tenant/configuracion/constantes-legales → Ver / Editar constantes legales colombianas (anio_vigente, cesantías, prima, vacaciones, días comerciales) (configuracion.editar)
GET             /api/v1/tenant/configuracion/tablas-legales/conceptos-select → Dropdown conceptos de SS (Salud, Pensión, ARL) (configuracion.editar)
GET             /api/v1/tenant/configuracion/tablas-legales    → Listar porcentajes de aportes SS por vigencia (sin paginación) (configuracion.editar)
POST            /api/v1/tenant/configuracion/tablas-legales    → Crear registro de aportes SS (concepto + porcentajes + vigencia) (configuracion.editar)
PUT|DELETE      /api/v1/tenant/configuracion/tablas-legales/:id → Editar / Eliminar registro de aportes SS (configuracion.editar)
PUT             /api/v1/tenant/perfil               → Editar perfil propio
PUT             /api/v1/tenant/perfil/password      → Cambiar contraseña propia
GET|POST        /api/v1/tenant/precios-cosecha      → Listar / Crear precio cosecha (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/precios-cosecha/:id → Ver / Editar / Eliminar      (configuracion.editar)
GET             /api/v1/tenant/precios-palma       → Listar los 4 tipos de Labor de Palma con sus precios (sin paginación) (configuracion.editar)
GET|PUT         /api/v1/tenant/precios-palma/:id   → Ver / Actualizar precio_palma de un tipo (configuracion.editar) — sin POST/DELETE (registros pre-sembrados)
GET             /api/v1/tenant/auditorias           → Listar auditoría del tenant (configuracion.editar)
GET             /api/v1/tenant/auditorias/:id       → Detalle de auditoría       (configuracion.editar)
GET             /api/v1/tenant/colaboradores/select → Dropdown colaboradores (colaboradores.ver O operaciones.{crear|editar})
GET|POST        /api/v1/tenant/colaboradores        → Listar (con `?incluir_eliminados` y `?solo_eliminados`) / Crear colaborador (colaboradores.ver / colaboradores.crear)
POST            /api/v1/tenant/colaboradores/importar → Importación masiva xlsx (async, retorna importacion_id) (colaboradores.crear)
GET             /api/v1/tenant/colaboradores/importaciones/:id → Estado y resultados de una importación masiva (colaboradores.ver)
GET|PUT|DELETE  /api/v1/tenant/colaboradores/:id    → Ver / Editar / Eliminar (soft delete) (colaboradores.ver / colaboradores.editar / colaboradores.eliminar)
PATCH           /api/v1/tenant/colaboradores/:id/toggle    → Activar/Desactivar     (colaboradores.editar)
POST            /api/v1/tenant/colaboradores/:id/restaurar → Restaurar colaborador eliminado (colaboradores.crear)
POST|DELETE     /api/v1/tenant/colaboradores/:id/avatar    → Subir / Eliminar avatar (image, máx 3 MB, disco public) (colaboradores.editar)
GET             /api/v1/tenant/colaboradores/documento-categorias → Catálogo de categorías y tipos de documento (colaboradores.ver)
GET|POST        /api/v1/tenant/colaboradores/:id/documentos     → Listar / Subir documento (colaboradores.ver / colaboradores.editar)
GET|DELETE      /api/v1/tenant/colaboradores/:id/documentos/:docId → Detalle / Eliminar documento (colaboradores.ver / colaboradores.editar)
GET             /api/v1/tenant/colaboradores/:id/documentos/:docId/descargar  → Descargar archivo (Content-Disposition: attachment) (colaboradores.ver)
GET             /api/v1/tenant/colaboradores/:id/documentos/:docId/visualizar → Preview inline (PDF/imagen, 415 si otro mime) (colaboradores.ver)
POST            /api/v1/tenant/bot/test             → Endpoint de prueba del bot externo (solo log, sin permiso)
```

**Implementados — Nómina (rediseño liquidación por empleado, ver §6.6 y [docs/API_NOMINA.md](docs/API_NOMINA.md)):**
```
GET             /api/v1/tenant/nominas/indicadores                              (nomina.ver)
GET|POST        /api/v1/tenant/nominas                                          (nomina.ver / nomina.crear)
GET|PUT|DELETE  /api/v1/tenant/nominas/:id                                      (nomina.ver / nomina.editar / nomina.eliminar)
POST            /api/v1/tenant/nominas/:id/cerrar                               (nomina.cerrar)
GET             /api/v1/tenant/nominas/:id/empleados-disponibles                (nomina.editar)
POST            /api/v1/tenant/nominas/:id/empleados                            (nomina.editar)
DELETE          /api/v1/tenant/nomina-empleado/:id                              (nomina.editar)
GET             /api/v1/tenant/nomina-empleado/:id/preview                      (nomina.liquidar)
GET             /api/v1/tenant/nomina-empleado/:id/resumen-trabajo              (nomina.liquidar) — solo VARIABLE
POST            /api/v1/tenant/nomina-empleado/:id/liquidar                     (nomina.liquidar)
PUT             /api/v1/tenant/nomina-empleado/:id/liquidacion                  (nomina.liquidar) — re-liquidar
GET             /api/v1/tenant/nomina-empleado/:id/desprendible                 (nomina.ver) — JSON
GET             /api/v1/tenant/nomina-empleado/:id/desprendible/pdf             (nomina.ver) — PDF DomPDF
POST            /api/v1/tenant/nomina-empleado/:id/desprendible/whatsapp        (nomina.ver) — URL firmada
GET|POST        /api/v1/tenant/nomina-conceptos                                 (nomina-conceptos.ver / nomina-conceptos.gestionar)
GET             /api/v1/tenant/nomina-conceptos/select                          (nomina.liquidar)
PUT|DELETE      /api/v1/tenant/nomina-conceptos/:id                             (nomina-conceptos.gestionar)
```

**Pendientes por implementar:**
```
/api/v1/tenant/colaboradores/:id/contratos
/api/v1/tenant/jornales
/api/v1/tenant/viajes, /api/v1/tenant/cosechas
/api/v1/tenant/vacaciones, /api/v1/tenant/vacaciones-acumulado/:empleadoId
/api/v1/tenant/liquidaciones, /api/v1/tenant/liquidaciones/:id/calcular, /api/v1/tenant/liquidaciones/:id/aprobar
/api/v1/tenant/sync/jornales, /api/v1/tenant/sync/cosechas, /api/v1/tenant/sync/catalogs
```

### Grupo 5: Portal Proveedor — Negocio (JWT con proveedor_id claims, sin X-Tenant-Id)

**Middleware:** `auth:api` + `SetProveedor` (lee `proveedor_id`+`proveedor_role` de los claims JWT)
**Controllers:** `app/Http/Controllers/Api/Market/MarketProveedorDashboardController.php`, `MarketProveedorProductoController.php`, `MarketProveedorPedidoController.php`, `MarketProveedorEstadisticasController.php`, `MarketProveedorReportesController.php`, `MarketProveedorCatalogoController.php`, `MarketProveedorConfiguracionController.php`, `MarketProveedorPerfilController.php`

```
# Market — Dashboard del Proveedor
GET    /api/v1/market/proveedor/dashboard                 → KPIs (productos activos, pedidos pendientes/en proceso/completados mes, ventas mes actual+anterior+variación%), últimos 5 pedidos recientes, top 5 productos más vendidos

# Market — Catálogo del Proveedor
GET    /api/v1/market/proveedor/wizard-init               → Categorías + unidades de medida para selects del formulario
GET    /api/v1/market/proveedor/productos                 → Listar productos propios (filtros: estado, categoria_id, destacados, buscar, ordenar; paginado + stats)
POST   /api/v1/market/proveedor/productos                 → Crear producto (multipart/form-data; SKU autogenerado PROV{id}-{timestamp} si se omite)
GET    /api/v1/market/proveedor/productos/:id             → Detalle (incluye precios volumen activos e inactivos, unidades vendidas, ingresos acumulados)
PUT    /api/v1/market/proveedor/productos/:id             → Actualizar producto (campos opcionales con sometimes; precios_volumen: omitir=sin cambio, []=borrar todos, [{...}]=reemplazar todos)
DELETE /api/v1/market/proveedor/productos/:id             → Eliminar (409 PRODUCTO_CON_ORDENES_ACTIVAS si hay órdenes pendiente/confirmado/preparando/en_transito)
PATCH  /api/v1/market/proveedor/productos/:id/toggle      → Activo ⇄ Inactivo
POST   /api/v1/market/proveedor/productos/:id/imagenes    → Añadir imagen a la galería (jpg/png/webp/jpeg, máx 3MB; orden autocalculado)
DELETE /api/v1/market/proveedor/productos/:id/imagenes/:imgId → Eliminar imagen de galería

# Market — Pedidos del Proveedor
GET    /api/v1/market/proveedor/pedidos/exportar          → Exportar Excel (mismos filtros que listado, máx 1000 registros)
GET    /api/v1/market/proveedor/pedidos                   → Listado paginado (15/pág) + stats (por_confirmar, activos, en_transito, completados, ventas_mes); filtros: tab, estado, buscar
GET    /api/v1/market/proveedor/pedidos/:codigo           → Detalle con items, historial, datos del tenant comprador y acciones_disponibles
PUT    /api/v1/market/proveedor/pedidos/:id/estado        → Cambiar estado (409 TRANSICION_INVALIDA si no es válida); registra historial + auditoría
GET    /api/v1/market/proveedor/pedidos/:codigo/factura   → Descargar factura PDF (DomPDF, template resources/views/market/factura.blade.php)

# Market — Estadísticas y Reportes del Proveedor
GET    /api/v1/market/proveedor/estadisticas              → KPIs + evolución + top productos/clientes + métricas adicionales
GET    /api/v1/market/proveedor/reportes/ventas           → Reporte Excel de ventas
GET    /api/v1/market/proveedor/reportes/productos        → Reporte Excel de productos
GET    /api/v1/market/proveedor/reportes/clientes         → Reporte Excel de clientes

# Market — Catálogos paramétricos (read-only) y Configuración del Proveedor
GET    /api/v1/market/proveedor/catalogos/bancos          → Lista global de bancos (cache 1h)
GET    /api/v1/market/proveedor/catalogos/transportadoras → Lista global de transportadoras (cache 1h)
GET    /api/v1/market/proveedor/configuracion             → Configuración completa (general, bancario, envíos, notificaciones)  — ADMIN u OPERADOR
GET    /api/v1/market/proveedor/configuracion/resumen     → Resumen + progreso de wizard (4 etapas) — ADMIN u OPERADOR
PUT    /api/v1/market/proveedor/configuracion/general         → Editar datos generales del proveedor — solo ADMIN (403 PERMISSION_DENIED a OPERADOR)
PUT    /api/v1/market/proveedor/configuracion/bancario        → Editar datos bancarios — solo ADMIN
PUT    /api/v1/market/proveedor/configuracion/envios          → Editar configuración de envíos — solo ADMIN
PUT    /api/v1/market/proveedor/configuracion/notificaciones  → Editar preferencias de notificaciones (jsonb) — solo ADMIN

# Market — Perfil del Usuario de Proveedor (edita su propio User global)
PUT    /api/v1/market/proveedor/perfil                    → Editar nombre/correo del usuario autenticado (cualquier rol; 422 NO_DATA si body vacío)
PUT    /api/v1/market/proveedor/perfil/password           → Cambiar contraseña (current_password + password + password_confirmation; 422 INVALID_CURRENT_PASSWORD / SAME_PASSWORD)
```

**Notas de seguridad:** Un proveedor solo puede ver/modificar sus propios productos; intentar acceder a productos ajenos retorna `404` (no `403`) para no revelar existencia. SKU único global entre todos los proveedores.

---

## 10. Formato de Respuesta Estándar

```json
// Listado paginado
{
  "data": [...],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 73 }
}

// Recurso individual
{ "data": { "id": 1, "nombre": "...", ... } }

// Error de validación (422)
{ "message": "Error de validación", "errors": { "campo": ["El campo es requerido"] } }

// Error de auth (401)
{ "message": "Token expirado", "code": "TOKEN_EXPIRED" }

// Error de tenant (403/422)
{ "message": "No tiene acceso a este tenant", "code": "TENANT_ACCESS_DENIED" }
```

---

## 11. Reglas de Seguridad

1. **Nunca usar `DB::table()` sin filtro de tenant** en modelos de negocio. Siempre usar Eloquent con el trait BelongsToTenant.
2. **Rutas de super-admin en grupo separado** con middleware `super_admin`. No mezclar con rutas de negocio.
3. **Auditoría obligatoria** en acciones de CREATE, UPDATE, DELETE de módulos sensibles (empleados, nómina, liquidación).
4. **Nómina cerrada es inmutable.** Una vez en estado CERRADA, ningún endpoint permite modificar sus datos.
5. **Validar límites del plan** al crear empleados (max_empleados) y usuarios (max_usuarios) por tenant.
6. **Rate limiting por tenant** para evitar abuso de API.
7. **Cache keys prefijados** con `tenant:{id}:` para evitar colisiones entre tenants.

---

## 12. Estado Actual del Proyecto

**Implementado y listo para usar:**
- Todas las migraciones (37 tablas, incluyendo `lineas` entre sublotes y palmas, `empleado_contratos` y `empleado_documentos`)
- Todos los modelos (37+ modelos con relaciones y scopes, incluyendo Linea, SemillaLote, EmpleadoContrato, EmpleadoDocumento)
- Trait BelongsToTenant
- Middleware SetTenant, SuperAdmin y CheckPermission
- AuthController completo (login, register, logout, refresh, me, select-tenant)
- TenantAuthController (login para usuarios de tenant, select-tenant, me)
- PasswordResetController (forgot-password, reset-password)
- **ProveedorAuthController** — auth del Portal Proveedor del Marketplace (login, select-proveedor, me, logout, refresh, forgot-password, reset-password). Bloquea super-admins (`USE_ADMIN_LOGIN`) y exige al menos una fila `market_proveedor_user.estado=true` con `market_proveedores.estado='activo'`. Auto-selecciona si el user tiene un solo proveedor activo (token con claims `proveedor_id`+`proveedor_role`); si tiene varios, devuelve la lista y `requires_proveedor_selection: true`. `forgot-password` siempre responde 200 con mensaje genérico (anti-enumeración) y solo envía email cuando el user es proveedor activo; el link apunta a `FRONTEND_PROVEEDOR_URL/reset-password`. Notification dedicada `ResetPasswordProveedorNotification`. Auditoría con `tenant_id=null` y módulo `AUTH`. Documentación: [docs/API_MARKET_PROVEEDORES_AUTH.md](docs/API_MARKET_PROVEEDORES_AUTH.md).
- TenantController completo (CRUD + toggle + gestión de usuarios)
- TenantUserController (CRUD usuarios dentro de un tenant)
- UserPermissionController (ver, editar, resetear permisos por usuario)
- TenantSettingsController (configuración de la finca)
- ProfileController (editar perfil, cambiar contraseña — tenant)
- **MarketProveedorPerfilController** — `PUT /api/v1/market/proveedor/perfil` y `PUT /api/v1/market/proveedor/perfil/password` para que el usuario logueado en el portal proveedor (cualquier rol) edite su `User` global. Mismo patrón que `ProfileController` tenant: validación inline en español, `Hash::check` para validar la contraseña actual + prohibir reutilizarla (`422 INVALID_CURRENT_PASSWORD` / `422 SAME_PASSWORD`), `422 NO_DATA` si el body de `update` viene vacío. Auditoría vía `AuditoriaService::registrar` con módulo `MARKET_PROVEEDOR_PERFIL` (acciones `EDITAR` y `CAMBIO_PASSWORD`; los hashes NUNCA se loguean). Documentación: [docs/API_MARKET_PROVEEDOR_PERFIL.md](docs/API_MARKET_PROVEEDOR_PERFIL.md).
- **PredioController** — CRUD + `resumen()` (jerarquía completa con totales para wizard) + listado con `lotes_count`/`palmas_count`. Eliminación en cascada (permiso: `lotes.*`)
- **LoteController** — CRUD completo con auditoría, validación de hectáreas, gestión de semillas y eliminación en cascada (permiso: `lotes.*`)
- **SubloteController** — CRUD completo con auditoría y eliminación en cascada. Usa `PalmaCreationService` para crear palmas (sync/async según umbral). `update()` rechaza con 409 si hay batch activo para el sublote (permiso: `sublotes.*`)
- **LineaController** — CRUD completo (index, show, store, update, destroy). Líneas son metadata opcional por sublote, **independientes de palmas** (eliminar líneas no afecta palmas) (permiso: `lineas.*`)
- **PalmaController** — index, show, store bulk (sync/async), update, eliminación masiva, `batchStatus(batchId)` para polling de jobs async (permiso: `palmas.*`)
- **Bulk de palmas con cola (Jobs)** — soporta hasta 99.999 palmas por petición. Umbral 5.000: `<=` sync (chunking 1.000), `>` async vía `CrearPalmasJob` en `Bus::batch()`. `ShouldBeUnique` por sublote evita duplicados. Requiere **queue worker** (`php artisan queue:work`, driver `database`). Doc de implementación y despliegue: `docs/PLAN_BULK_PALMAS.md`
- **EmpleadoController** — CRUD + toggle + restaurar + upload/delete de avatar, todo con auditoría y validación de edad ≥ 14 años. Usa **soft delete** (trait `SoftDeletes`, columna `deleted_at`) — al eliminar se preserva todo el historial (jornales, nómina, cosechas, contratos, documentos, archivos en disco) y el colaborador se oculta de listados/dropdowns. `index()` acepta `?incluir_eliminados=true` (mezcla activos+eliminados) y `?solo_eliminados=true` (vista de papelera). Endpoint `POST /:id/restaurar` con `withTrashed()` en route binding restaura el registro y verifica que no exista otro activo con el mismo documento (409 `DOCUMENTO_DUPLICADO`). UNIQUE de `documento` por tenant es ahora un índice parcial `WHERE deleted_at IS NULL` que permite reusar el documento tras un soft delete. Avatar en disco `public` (`tenants/{t}/empleados/{id}/avatar/`), reemplazo automático del archivo previo, atributo calculado `avatar_url` expuesto vía `$appends`. (permiso: `colaboradores.*`, `colaboradores.crear` para restaurar)
- **EmpleadoDocumentoController** — Carga, listado, descarga, **previsualización inline** y eliminación de documentos del colaborador. Almacena archivos en disco privado (`local`), acceso por endpoint autenticado. `download()` envía `Content-Disposition: attachment` (cualquier mime); `visualizar()` envía `Content-Disposition: inline` (solo `application/pdf`, `image/jpeg`, `image/png`, `image/webp` — otros mimes responden 415 `MIME_NOT_PREVIEWABLE`). Categorías con `unico_por_tipo: true` reemplazan el documento existente al subir uno nuevo del mismo tipo; **solo `DATOS_BASE` tiene este comportamiento**, el resto (`CONTRATACION_LABORAL`, `SST`, `PERMISOS_LICENCIAS`, `FINALIZACION_CONTRATO`, `DESPRENDIBLES`, `OTROS`) acumula múltiples documentos. Auditoría en todas las acciones de escritura (permiso: `colaboradores.ver` lectura, `colaboradores.editar` escritura)
- **DashboardTenantController + DashboardService** — `GET /api/v1/tenant/dashboard` devuelve en una sola respuesta: indicadores principales (`produccion_total_kg`, `promedio_kg_gajo`), promedio kg por lote (todos los lotes activos, 0 si sin producción), viajes finalizados en el rango y lluvias (semana actual / anterior / mes actual / promedio mensual histórico — fijo, no depende del filtro). Filtros: `periodo=semanal|quincenal|mensual|personalizado` + `fecha_inicio`/`fecha_fin` cuando es personalizado. Solo cuenta cosechas activas de operaciones APROBADAS y viajes con estado FINALIZADO. Read-only sin auditoría (permiso: `dashboard.ver`). FormRequest: `DashboardFilterRequest`
- **Paramétricas del Colaborador (EPS, Fondos de Pensión, ARL, Entidades Bancarias)** — 4 catálogos paramétricos por tenant con schema idéntico (`id`, `tenant_id`, `nombre`, `estado`, timestamps + `unique(['tenant_id','nombre'])`). Cada uno expone CRUD completo bajo `configuracion.editar` con auditoría (`AuditoriaService`) y un endpoint `/select` accesible además con `colaboradores.{ver|crear|editar}` para alimentar los dropdowns del formulario de colaboradores. **El empleado guarda el `nombre`** (string), no el `id` — preserva histórico al renombrar/eliminar entradas del catálogo. Listas iniciales colombianas en constantes `INICIALES` de cada modelo (17 EPS, 5 fondos, 9 ARLs, 23 bancos). Provisionamiento automático al crear tenant vía `Admin\TenantController::seedParametricasColaborador()` y seeder global idempotente `ParametricasColaboradorSeeder` para fincas existentes. Modelos: `Eps`, `FondoPension`, `Arl`, `EntidadBancaria`. Controllers: `EpsController`, `FondoPensionController`, `ArlController`, `EntidadBancariaController`
- **InfoEmpresaController** — `GET|PUT /configuracion/info-empresa`. Gestiona los datos de identificación de la empresa: `nombre`, `tipo_persona` (NATURAL/JURIDICA), `nit` (único por tenant, error 422 `NIT_DUPLICATED`), `razon_social`, `actividad_economica`, representante legal (`representante_nombre`, `representante_cedula`, `representante_cargo`), y datos de contacto/ubicación (`direccion`, `departamento`, `municipio`, `correo_contacto`, `telefono`, `telefono_fijo`, `sitio_web`). Soporta carga de logo vía `multipart/form-data` (jpeg/jpg/png/webp, máx 2MB). Todos los campos son opcionales en el PUT (`sometimes`). Auditoría en edición. El endpoint legacy `PUT /configuracion/finca` sigue activo como alias. (permiso: `configuracion.editar`)
- **ConstantesLegalesController** — `GET|PUT /configuracion/constantes-legales`. Almacena en `tenant_config` los parámetros legales colombianos por tenant: `anio_vigente` (año fiscal, 2020–2100), `salario_minimo_vigente`, `auxilio_transporte`, `tasa_interes_cesantias` (%), fechas límite de cesantías, prima primer/segundo semestre, `dias_vacaciones_anuales` (CST: 15), `dias_anio_comercial` (360), `dias_mes_comercial` (30). Todos los campos son opcionales en el PUT (`sometimes`). Valores default al crear tenant: año actual, 12% cesantías, fechas legales colombianas estándar. (permiso: `configuracion.editar`)
- **TablasLegalesController** — `GET|GET /conceptos-select|POST|PUT|DELETE /configuracion/tablas-legales`. Historial de porcentajes de aportes a seguridad social (Salud, Pensión, ARL) por vigencia (`vigente_desde`/`vigente_hasta`, formato `dd/mm/yyyy`; `null` = vigente indefinidamente). Devuelve listado sin paginación. Endpoint `/conceptos-select` retorna los 3 conceptos disponibles (Salud, Pensión, ARL) desde `nomina_concepto` del tenant, filtrados por `subtipo` en `SALUD|PENSION|ARL`. (permiso: `configuracion.editar`)
- FormRequest validations para Predios, Lotes (con validación de hectáreas y semillas_ids), Sublotes, Líneas, Palmas, Empleados (con validación de edad y `unique` parcial sobre `whereNull('deleted_at')` para soft delete), EmpleadoAvatar (image, máx 3 MB) y EmpleadoDocumento (con validación de categoría/tipo via DocumentoCategoria)
- AuditoriaService (registrar, registrarCreacion, registrarEdicion, registrarEliminacion)
- Rol ADMIN (con todos los permisos) + usuarios con permisos directos (sin roles intermedios)
- Seeder con datos de prueba + RolesAndPermissionsSeeder
- AppServiceProvider con gate para Pulse
- Documentación API: `docs/API_PLANTACION.md` (Predios, Lotes, Sublotes, Líneas, Palmas), `docs/API_COLABORADORES.md` (Colaboradores), `docs/API_IMPORTACION_COLABORADORES.md` (Importación masiva xlsx), `docs/API_BOT.md` (Bot de integraciones)
- Constantes de categorías de documentos: `App\Constants\DocumentoCategoria`
- Modelos de contratos y documentos del empleado: EmpleadoContrato, EmpleadoDocumento
- **Modelo de Ausencias** (`Ausencia`): tabla `ausencias` reportada desde la operación diaria con `operacion_id` NOT NULL, rango `fecha_inicio`/`fecha_fin`, flujo PENDIENTE → APROBADA → LIQUIDADA, soporte offline (`sync_uuid`/`sync_estado`). Reutiliza permisos `operaciones.*` (no se crearon permisos `ausencias.*`). `nomina_empleado` extendida con `dias_ausencia_descontados`, `total_ausencias_descuento`, `total_ausencias_remunerado` para reflejar el efecto en nómina.
- **Chat del Agente IA (solo tablas):** Migración `2026_04_15_000001_create_agro_chat_tables.php` crea `agro_chat_sessions` y `agro_chat_messages` con FKs cascade a `users` y `tenants`, `tool_calls` JSONB para auditar consultas SQL del agente y `TIMESTAMPTZ` en las fechas. Las tablas existen listas para que un agente IA externo persista conversaciones (4 operaciones de escritura, el resto del esquema es solo lectura). Aún no hay controllers ni modelos Eloquent — el agente se conecta directamente a PostgreSQL.
- **Módulo Market — API Tenant (lado finca):** 11 rutas bajo `GET|POST|PUT|DELETE /api/v1/tenant/market/*`, protegidas con `check.modulo:modulo_market` + `check.permission:market.*`. Tres controllers en `app/Http/Controllers/Api/Market/`: **MarketCatalogoController** (categorias, index con filtros/paginación 12, show), **MarketCarritoController** (show con cálculo dinámico de precios por volumen, addItem upsert, updateItem, removeItem, clear), **MarketPedidoController** (index con stats cards, show con historial, store checkout). Tres FormRequests en `app/Http/Requests/Market/`. Permisos `market.catalogo`, `market.carrito`, `market.pedidos` creados en BD y asignados al rol ADMIN. El catálogo filtra: `estado=activo` + `stock_disponible>0` + `precio_unitario>0` + `proveedor.estado=activo`. El checkout agrupa ítems por proveedor y crea un pedido por proveedor en una única transacción (`DB::transaction`), con guard de concurrencia en el decremento de stock (`WHERE stock_disponible >= cantidad`). Precios por volumen calculados via `MarketProducto::getPrecioParaCantidad()`. (permiso: `market.catalogo`, `market.carrito`, `market.pedidos`)
- **Bot de integraciones externas:**
  - `BotUserSeeder` provisiona un único usuario `bot@d3vs.tech` como super_admin desacoplado de tenants (cero provisionamiento por finca, válido para tenants futuros)
  - `BotTestController` con endpoint `POST /api/v1/tenant/bot/test` que escribe `BOT_TEST consumido` en `storage/logs/laravel.log`
  - Variable `BOT_USER_PASSWORD` en `.env` para el password del bot
  - Documentación completa para el desarrollador del bot Python en `docs/API_BOT.md` (login, select-tenant, headers, manejo de errores, cliente Python de referencia)

**Pendiente:**
- Controllers de: contratos del empleado, vacaciones, liquidación (al retiro)
- Sync offline (SyncController)
- Integración real de WhatsApp Business API para envío automático de desprendibles (hoy es placeholder con URL firmada del PDF)
- Tests de aislamiento multi-tenant
- Todo el frontend

---

## 13. Datos de Prueba (Seeder)

| Usuario | Email | Contraseña | Tipo | Permisos |
|---|---|---|---|---|
| Super Admin | devs@d3vs.tech | password123 | Super Admin global | Acceso total |
| Juan Pérez | juan@laesperanza.com | password | ADMIN en Finca La Esperanza | Todos los permisos |
| Carlos Rodríguez | carlos@laesperanza.com | password | USUARIO en Finca La Esperanza | Operaciones, viajes, colaboradores (lectura) |
| María García | maria@laesperanza.com | password | USUARIO en Finca La Esperanza | Solo lectura (dashboard, plantación, colaboradores, operaciones, viajes, nómina) |
| Bot Integraciones | bot@d3vs.tech | `BOT_USER_PASSWORD` (.env) | Super Admin (bot externo) | Acceso a todos los tenants — provisionado con `php artisan db:seed --class=BotUserSeeder` |

**Tenant demo:** Finca La Esperanza (NIT 900123456-1), plan BASICO, ubicada en Acacías, Meta. Configurada con jornales y producción activos, nómina quincenal, SMLV $1.423.500, auxilio de transporte $200.000.

> El usuario `bot@d3vs.tech` **NO** se crea con `DatabaseSeeder` para no contaminar el entorno demo. Se provisiona aparte con `php artisan db:seed --class=BotUserSeeder`. El password se toma de la variable `BOT_USER_PASSWORD` del `.env`. Cambiar el `.env` y re-correr el seeder rota la credencial.

---

## 14. Documentación API para Frontend

| Documento | Ruta | Contenido |
|---|---|---|
| Tablas Paramétricas de Configuración | `docs/API_PARAMETRICAS.md` | Todos los catálogos paramétricos del tenant: Semillas, Insumos, Precios de Abono, Labores, Promedios por Lote, Cargos, Modalidades de Contrato, Config Nómina, Precios de Cosecha, Auditoría, Tipos de Hora Extra, EPS/Pensión/ARL/Bancos, Info Empresa, Constantes Legales, Tablas Legales |
| Plantación (Predios, Lotes, Sublotes, Líneas, Palmas) | `docs/API_PLANTACION.md` | Endpoints CRUD con ejemplos de request/response, permisos, validación de hectáreas, semillas, códigos de palma y errores |
| Usuarios del Tenant | `docs/API_USUARIOS_TENANT.md` | CRUD usuarios, activar/desactivar, gestión de permisos directos, guía de implementación frontend |
| Colaboradores | `docs/API_COLABORADORES.md` | CRUD colaboradores con soft delete + restaurar + filtros `incluir_eliminados`/`solo_eliminados`, toggle estado, campo `subsidio_transporte` (boolean, default `true`), avatar (upload/delete), carga/descarga/preview/eliminación de documentos por categoría, categorías de documentos, reemplazo automático en `DATOS_BASE`, paramétricas (EPS/Pensiones/ARL/Bancos), guía de uso del frontend para descargas y previsualizaciones por blob |
| Importación masiva colaboradores | `docs/API_IMPORTACION_COLABORADORES.md` | Estructura del Excel (columnas A–AE), endpoints POST /importar y GET /importaciones/{id}, estados de la importación, comportamiento por fila, auditoría, ejemplo de consumo JS con polling |
| Bot de Integraciones | `docs/API_BOT.md` | Guía completa para el desarrollador del bot Python: flujo de autenticación (login + select-tenant), headers obligatorios, endpoint de prueba, manejo de errores, cliente Python de referencia con cache de tokens por tenant, variables de entorno, checklist pre-producción |
| Dashboard Tenant | `docs/API_DASHBOARD.md` | `GET /api/v1/tenant/dashboard`: contrato, headers, query params (presets de periodo + rango custom), estructura completa de la respuesta (indicadores, lotes, viajes, lluvias), reglas de negocio (solo APROBADAS / FINALIZADO), códigos de error y notas de consumo para el frontend |
| Módulo Market — Arquitectura | `docs/MARKET_MODULE.md` | Arquitectura completa del marketplace: tablas, relaciones, flujo carrito→pedido, precios por volumen, imágenes, autenticación de proveedores |
| Módulo Market — API Frontend | `docs/API_MARKET.md` | Guía de consumo para el frontend: todos los endpoints tenant (catálogo, carrito, pedidos), ejemplos JSON, tabla de códigos de error, flujo de checkout multi-proveedor |
| Módulo Market — API Admin Proveedores | `docs/API_MARKET_PROVEEDORES_ADMIN.md` | Endpoints del superadmin para CRUD de proveedores y sus usuarios: validaciones, soft delete, toggle estado, modos de creación de usuario (existente vs nuevo), códigos de error |
| Módulo Market — API Portal Proveedor Auth | `docs/API_MARKET_PROVEEDORES_AUTH.md` | Guía del frontend del portal proveedor: login, select-proveedor, forgot/reset password, claims del JWT, reglas de elegibilidad |
| Módulo Market — API Portal Proveedor Productos | `docs/API_MARKET_PROVEEDOR_PRODUCTOS.md` | Guía del frontend del portal proveedor: wizard-init, CRUD productos (multipart/form-data), galería de imágenes, precios por volumen (sincronización completa), toggle estado, eliminación con guard de órdenes activas |
| Módulo Market — API Dashboard Proveedor | `docs/API_MARKET_PROVEEDOR_DASHBOARD.md` | Endpoint único `GET /dashboard`: KPIs de productos y pedidos del mes, ventas con variación porcentual vs mes anterior, últimos 5 pedidos recientes con datos de la finca compradora, top 5 productos más vendidos |
| Módulo Market — API Pedidos Proveedor | `docs/API_MARKET_PROVEEDOR.md` | Guía del frontend del portal proveedor para gestión de pedidos: listado con stats/tabs, detalle, cambio de estado (máquina de estados + CTAs), factura PDF, exportación Excel, campos `prioridad`/`estado_pago`/`numero_guia` |
| Módulo Market — API Configuración del Proveedor | `docs/API_MARKET_PROVEEDOR_CONFIGURACION.md` | 4 tabs (General/Bancario/Envíos/Notificaciones) + resumen con cuenta enmascarada y progreso de wizard. Lectura ADMIN u OPERADOR, escritura solo ADMIN (`403 PERMISSION_DENIED`). Catálogos paramétricos cacheados (bancos, transportadoras). Auditoría por tab (`MARKET_PROVEEDOR_CONFIG_GENERAL`, `_BANCARIO`, `_ENVIOS`, `_NOTIFICACIONES`) |
| Módulo Market — API Perfil del Usuario de Proveedor | `docs/API_MARKET_PROVEEDOR_PERFIL.md` | Edición del `User` global del usuario logueado en el portal: `PUT /perfil` (name/email, 422 NO_DATA si body vacío) y `PUT /perfil/password` (current_password + password confirmed, 422 INVALID_CURRENT_PASSWORD / SAME_PASSWORD). Disponible para cualquier rol (ADMIN u OPERADOR); auditoría con módulo `MARKET_PROVEEDOR_PERFIL` — el cambio de password no guarda hashes |

---

## 15. Módulo Market (Marketplace AgroInsumos)

### ¿Qué es?
Un marketplace B2B integrado donde **proveedores** externos cargan productos agrícolas y las **fincas (tenants)** los compran directamente desde la app.

### Entidades clave

| Entidad | Tabla | tenant_id |
|---------|-------|-----------|
| Empresas vendedoras | `market_proveedores` | No (global) |
| Pivot user↔proveedor | `market_proveedor_user` | No (global) |
| Categorías de productos | `market_categorias` | No (global) |
| Unidades de medida | `market_unidades_medida` | No (global) |
| Catálogo de productos | `market_productos` | No (global) |
| Imágenes adicionales | `market_producto_imagenes` | No |
| Descuentos por volumen | `market_precios_volumen` | No |
| Carrito (1 por finca) | `market_carritos` | Sí |
| Ítems del carrito | `market_carrito_items` | Sí (vía carrito) |
| Órdenes de compra | `market_pedidos` | Sí |
| Líneas del pedido | `market_pedido_items` | Sí (vía pedido) |
| Timeline de estados | `market_pedido_estados_historial` | Sí (vía pedido) |

### Habilitación por tenant
`tenant_config.modulo_market = true` habilita el módulo. El middleware `check.modulo:modulo_market` protege todas las rutas (retorna `403 MODULE_DISABLED` si está deshabilitado).

### Modelos PHP
Todos en `app/Models/Market/`. Métodos clave:
- `MarketProducto::getPrecioParaCantidad(int $cantidad): float` — aplica descuentos escalonados de `market_precios_volumen`
- `MarketProducto::scopeActivos()` — filtra `estado = 'activo'`
- `MarketPedido::generarCodigo(): string` — genera PED-001, PED-002, etc.
- `MarketPedido::$transicionesValidas` — array estático con las transiciones permitidas por estado (pendiente→confirmado|cancelado, confirmado→preparando|cancelado, preparando→en_transito|cancelado, en_transito→entregado|cancelado)
- `MarketPedido::$accionesPorEstado` — array estático con los CTAs disponibles por estado (devuelto en responses para que el frontend no reimplemente la lógica de estados)
- `MarketCarrito::itemsConProducto()` — relación eager con producto + preciosVolumen + unidadMedida + proveedor

**Campos nuevos en `market_pedidos`** (migración `2026_05_19_000010`):
- `prioridad` — enum `normal|alta|urgente`, default `normal`
- `estado_pago` — enum `pendiente|pagado`, default `pendiente` (el proveedor lo marca manualmente; el pago no se procesa en la plataforma)
- `numero_guia` — string nullable (número de tracking del transportista, se asigna al pasar a `en_transito`)

### API Tenant implementada (lado finca)

**Rutas base:** `GET|POST|PUT|DELETE /api/v1/tenant/market/*`
**Middleware:** `auth:api` + `SetTenant` + `check.modulo:modulo_market` + `check.permission:market.*`
**Controllers:** `app/Http/Controllers/Api/Market/`

#### Catálogo (`market.catalogo`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/market/categorias` | Categorías activas con conteo de productos disponibles |
| GET | `/market/productos` | Lista paginada (12/pág) con filtros: `categoria_id`, `buscar`, `ordenar`, `destacados` |
| GET | `/market/productos/{id}` | Detalle con galería, especificaciones y precios por volumen |

Condiciones de visibilidad en catálogo: `estado=activo` + `stock_disponible>0` + `precio_unitario>0` + `proveedor.estado=activo`.

#### Carrito (`market.carrito`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/market/carrito` | Ver carrito (crea si no existe); calcula precios por volumen en tiempo real |
| POST | `/market/carrito/items` | Agregar/actualizar ítem (upsert — SET cantidad, no acumulativo) |
| PUT | `/market/carrito/items/{id}` | Cambiar cantidad; valida pertenencia al tenant |
| DELETE | `/market/carrito/items/{id}` | Eliminar ítem |
| DELETE | `/market/carrito` | Vaciar carrito (mantiene el registro) |

#### Pedidos (`market.pedidos`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/market/pedidos` | Lista paginada (10/pág) + stats cards (activos, entregados, total gastado) |
| POST | `/market/pedidos` | Checkout: crea 1 pedido por proveedor en una transacción atómica |
| GET | `/market/pedidos/{codigo}` | Detalle completo con historial de estados y proveedor |

### Flujo de checkout

1. Carga carrito con ítems (eager load producto + proveedor + preciosVolumen)
2. Valida carrito no vacío → `409 CARRITO_VACIO`
3. Valida stock pre-transacción → `409 STOCK_INSUFICIENTE`
4. Agrupa ítems por `proveedor_id`
5. `DB::transaction`: por cada grupo crea `MarketPedido` + `MarketPedidoItem` (snapshot nombre + precio) + historial inicial + decrementa stock con `WHERE stock_disponible >= cantidad`
6. Vacía el carrito
7. Retorna array de pedidos creados

Si el carrito tiene productos de 2 proveedores → 2 pedidos en la misma transacción.

### Estados del pedido
`pendiente → confirmado → preparando → en_transito → entregado`
`cancelado` es alcanzable desde cualquier estado.

### Permisos
`market.catalogo`, `market.carrito`, `market.pedidos` — creados en BD, asignados al rol ADMIN.

### Seeder demo
`database/seeders/MarketSeeder.php` crea:
- Proveedor: "AgroInsumos del Valle" → `admin@agroinsumosdelvalle.com` / `password`
- 5 categorías, 5 unidades de medida, 6 productos con precios por volumen
- 3 pedidos demo + carrito activo para Finca La Esperanza (`modulo_market = true`)

### API Admin implementada (gestión de proveedores desde superadmin)

**Rutas base:** `/api/v1/admin/market/proveedores/*`
**Middleware:** `auth:api` + `super_admin`
**Controller:** `app/Http/Controllers/Api/Admin/MarketProveedorController.php`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/proveedores` | Listar paginado (filtros `estado`, `ciudad`, `departamento`, `buscar`); incluye `total_usuarios`, `total_productos`, `total_pedidos` |
| POST | `/proveedores` | Crear proveedor (sin usuario; el usuario se asigna después) |
| GET | `/proveedores/:id` | Detalle con `proveedor_users.user` y conteos |
| PUT | `/proveedores/:id` | Editar proveedor (validación con `sometimes`, unique-ignore del propio id) |
| DELETE | `/proveedores/:id` | Soft delete; retorna `422 PROVIDER_ACTIVE` si está `activo` |
| PATCH | `/proveedores/:id/toggle` | `activo` ⇄ `suspendido` (también recupera desde `inactivo`) |
| GET | `/proveedores/:id/usuarios` | Lista usuarios vinculados con su `rol` y `estado` del pivot |
| POST | `/proveedores/:id/usuarios` | Asignar `user_id` existente o crear nuevo con `name`+`email`+`password`; reusa usuario si el email ya existe; reactiva pivot si está en `estado=false`; `409 USER_ALREADY_ASSIGNED` si ya está activo |
| PUT | `/proveedores/:id/usuarios/:userId` | Actualizar datos del user global (`name`, `email`, `password`) y/o del pivot (`rol`, `estado`) |
| DELETE | `/proveedores/:id/usuarios/:userId` | Borra fila del pivot; el `User` global no se elimina |

**Notas:**
- `MarketProveedor` usa `SoftDeletes` (migración `2026_05_13_000001_add_soft_deletes_to_market_proveedores_table`) — preserva histórico de pedidos.
- Estados del proveedor en minúsculas: `activo` | `inactivo` | `suspendido` (diferente a tenants que usa mayúsculas).
- Roles del pivot: `ADMIN` | `OPERADOR` (default `ADMIN`).
- Toda acción audita en módulos `MARKET_PROVEEDORES` y `MARKET_PROVEEDOR_USERS` (consultable vía `GET /api/v1/admin/auditorias`).

### Portal Proveedor — Auth (implementado)

El proveedor entra al marketplace por un **portal propio** (`/api/v1/proveedor-auth/*`), independiente del panel super-admin y del panel finca. Estructura espejo del `TenantAuthController`:

**Rutas base:** `/api/v1/proveedor-auth/*`
**Middleware:** público en login/forgot/reset; `auth:api` en select/me/logout/refresh
**Controller:** `app/Http/Controllers/Api/ProveedorAuthController.php`
**Variable de entorno:** `FRONTEND_PROVEEDOR_URL` (default `http://localhost:3001`) — usada en el link del email de reset

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/proveedor-auth/login` | Email+password. Auto-selecciona proveedor si el user tiene uno solo activo (token con claims). Si tiene varios, devuelve `requires_proveedor_selection: true` + lista. |
| POST | `/proveedor-auth/select-proveedor` | `proveedor_id` → token nuevo con claims `proveedor_id`+`proveedor_role` |
| GET | `/proveedor-auth/me` | Usuario actual + lista de proveedores activos vinculados |
| POST | `/proveedor-auth/logout` | Invalida el token JWT |
| POST | `/proveedor-auth/refresh` | Renueva el token (sin preservar claims de proveedor) |
| POST | `/proveedor-auth/forgot-password` | Anti-enumeración: siempre 200; solo envía email si el user es proveedor activo |
| POST | `/proveedor-auth/reset-password` | Estándar (usa `Password::broker()` de Laravel) |

**Reglas de elegibilidad para login (todas deben cumplirse):**
1. `users.email` y `users.password` coinciden
2. `users.status = true`
3. `users.is_super_admin = false` (los super-admins reciben `403 USE_ADMIN_LOGIN`)
4. Existe al menos una fila `market_proveedor_user.estado = true` cuyo proveedor relacionado tiene `estado = 'activo'` y `deleted_at IS NULL`

Si la condición 4 falla → `403 NO_PROVEEDORES_ACTIVOS`.

**Claims del JWT después de seleccionar proveedor:**
```json
{ "sub": 5, "proveedor_id": 1, "proveedor_role": "ADMIN" }
```

**Relaciones agregadas a `User` model** (`app/Models/User.php`):
- `proveedores()` — BelongsToMany via `market_proveedor_user`
- `proveedorUsers()` — HasMany de `MarketProveedorUser`
- `activeProveedores()` — proveedores activos (pivot estado=true + proveedor estado='activo' + no soft-deleted)
- `hasAccessToProveedor(int)` / `getRoleInProveedor(int)` — helpers análogos a los de tenant

**Auditoría:** registra eventos `LOGIN_EXITOSO`/`LOGIN_FALLIDO`/`LOGOUT`/`CAMBIO_PASSWORD` en módulo `AUTH` con `tenant_id = null`.

### Portal Proveedor — Gestión de Productos (implementado)

**Rutas base:** `/api/v1/market/proveedor/*`
**Middleware:** `auth:api` + `SetProveedor` (middleware análogo a `SetTenant`; lee `proveedor_id`+`proveedor_role` de los claims JWT; retorna `422 PROVEEDOR_NOT_SELECTED`, `404 PROVEEDOR_NOT_FOUND`, `403 PROVEEDOR_INACTIVE`, `403 PROVEEDOR_ACCESS_DENIED` según el caso)
**Controllers:** `app/Http/Controllers/Api/Market/MarketProveedorDashboardController.php`, `MarketProveedorProductoController.php`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | KPIs del proveedor en una sola llamada: `indicadores` (productos activos/total, pedidos pendientes/en_proceso/completados_mes, ventas_mes_actual, ventas_mes_anterior, variacion_ventas_porcentaje), `pedidos_recientes` (últimos 5 con tenant + primer producto), `productos_mas_vendidos` (top 5 por `unidades_vendidas`) |
| GET | `/wizard-init` | Categorías activas + unidades de medida activas para selects |
| GET | `/productos` | Lista paginada (default 15/pág) + stats (`total_activos`, `total_inactivos`, `total_sin_stock`); filtros: `estado`, `categoria_id`, `destacados`, `buscar`, `ordenar` |
| POST | `/productos` | Crear producto (multipart/form-data; SKU autogenerado `PROV{id}-{timestamp}` si se omite; `precios_volumen` como JSON string en FormData) |
| GET | `/productos/{id}` | Detalle con galería, especificaciones, `unidades_vendidas`, `ingresos_acumulados`, todos los precios por volumen incluyendo inactivos |
| PUT | `/productos/{id}` | Actualizar (todos los campos con `sometimes`); `precios_volumen` omitido = sin cambio, `[]` = borrar todos, `[{...}]` = replace completo |
| DELETE | `/productos/{id}` | Eliminar; `409 PRODUCTO_CON_ORDENES_ACTIVAS` si tiene órdenes en estado activo |
| PATCH | `/productos/{id}/toggle` | Alterna `activo` ⇄ `inactivo` |
| POST | `/productos/{id}/imagenes` | Añadir imagen a galería (jpg/jpeg/png/webp, máx 3MB); `orden` autocalculado |
| DELETE | `/productos/{id}/imagenes/{imgId}` | Eliminar imagen de galería |

**Notas de implementación:**
- Scope de seguridad: `404` (no `403`) al acceder a producto de otro proveedor — no revela si existe.
- `imagen_principal` (campo de texto en `market_productos`) y galería (`market_producto_imagenes`) son conceptos separados. El PUT de producto con `imagen_principal` nuevo elimina la imagen anterior automáticamente.
- SKU único global entre todos los proveedores del marketplace.

### Portal Proveedor — Carga masiva de productos (implementado)

**Rutas base:** `/api/v1/market/proveedor/productos/*`
**Middleware:** `auth:api` + `SetProveedor`
**Controller:** `app/Http/Controllers/Api/Market/MarketProveedorProductoImportController.php`
**Request:** `app/Http/Requests/Market/ImportarProductosRequest.php`
**Job:** `app/Jobs/ProcesarImportacionProductosJob.php` (background, timeout 600s)
**Modelo:** `app/Models/Market/ImportacionProductos.php`
**Migración:** `database/migrations/2026_05_22_113200_create_importaciones_productos_table.php` (tabla `importaciones_productos`, FK a `market_proveedores` y `users`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/productos/importar/plantilla` | Descarga `plantilla_productos.xlsx` con 13 cabeceras + 1 fila de ejemplo (PhpSpreadsheet) |
| POST | `/productos/importar` | Recibe ZIP (`archivo` multipart, máx 50 MB), guarda en disco `local`, dispara job, retorna `202` con `importacion_id` y `estado: PENDIENTE` |
| GET | `/productos/importaciones/{id}` | Estado actual: `estado`, `total_filas`, `filas_exitosas`, `filas_fallidas`, `error_fatal`, `resultados[]`, timestamps |

**Estructura del ZIP:** `productos.xlsx` en la raíz + carpeta `imagenes/` con todas las fotos. El Excel referencia los archivos por nombre en las columnas `IMAGEN_PRINCIPAL` (string) e `IMAGENES_GALERIA` (lista separada por `|`).

**Columnas del Excel (13, A→M):** `NOMBRE`, `DESCRIPCION`, `CATEGORIA_ID`, `UNIDAD_MEDIDA_ID`, `PRECIO_UNITARIO`, `STOCK_DISPONIBLE`, `STOCK_MINIMO`, `SKU`, `ESTADO`, `DESTACADO`, `ESPECIFICACIONES` (formato `clave:valor|clave:valor`), `IMAGEN_PRINCIPAL`, `IMAGENES_GALERIA`. SKU vacío se autogenera con el helper `generarSku()` del controller de productos; SKU duplicado rechaza la fila.

**Estados del job:** `PENDIENTE` → `PROCESANDO` → `COMPLETADO` (todas OK) | `CON_ERRORES` (parcial) | `FALLIDO` (error fatal — ZIP corrupto, falta `productos.xlsx` o `imagenes/`, > 500 filas, extensión PHP `zip` no habilitada).

**Pipeline del job:**
1. Marca `PROCESANDO` + `iniciado_at`.
2. Extrae ZIP a `storage/app/private/market/importaciones/{proveedorId}/tmp_{uuid}/`.
3. Valida estructura (existe `productos.xlsx` + carpeta `imagenes/`).
4. Carga Excel con `IOFactory::load()`, descarta cabecera y filas vacías.
5. Valida límite de 500 filas.
6. Procesa en chunks de 50: por fila → `validate()` → copiar imágenes a `storage/app/public/market/productos/{proveedorId}/{uuid}.{ext}` → `DB::transaction` crea `MarketProducto` + N `MarketProductoImagen`. Si la transacción falla, hace cleanup manual de las imágenes ya copiadas (storage no es transaccional).
7. Estado final + `AuditoriaService` (`accion=IMPORTACION_MASIVA`, `modulo=MARKET_PRODUCTOS`).
8. Borra el directorio temporal en `finally`.

**Límites:** ZIP 50 MB · 500 filas/importación · 3 MB por imagen · formatos `jpg/jpeg/png/webp` · timeout job 600s · sin reintentos.

**Reportes legibles para UI:** cada entrada de `resultados[]` tiene shape `{fila, estado: "exitoso"|"fallido", sku, mensaje}` con mensajes listos para pintar tal cual (ej. `"El SKU 'TOMATE-001' ya existe en el catálogo."`, `"La imagen 'foto.bmp' tiene un formato inválido."`).

**Notas:**
- Solo CREA productos — no es upsert. SKU duplicado falla la fila.
- Ownership: el endpoint de estado retorna `404 IMPORTACION_NOT_FOUND` si la importación es de otro proveedor (no `403`, para no filtrar existencia).
- ZIP fuente se conserva en disco privado para auditar/reprocesar (considerar limpieza > 30 días).
- No hay endpoint de historial de importaciones todavía (mencionado como follow-up).

### Portal Proveedor — Gestión de Pedidos (implementado)

**Rutas base:** `/api/v1/market/proveedor/pedidos/*`
**Middleware:** `auth:api` + `SetProveedor`
**Controller:** `app/Http/Controllers/Api/Market/MarketProveedorPedidoController.php`
**Request:** `app/Http/Requests/Market/Proveedor/UpdateMarketPedidoEstadoRequest.php`
**Service:** `app/Services/Market/MarketFacturaService.php` (PDF con DomPDF)
**Vista:** `resources/views/market/factura.blade.php`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/pedidos/exportar` | Exporta a Excel (.xlsx) los pedidos filtrados (máx 1000, PhpSpreadsheet) |
| GET | `/pedidos` | Lista paginada (15/pág) + stats cards: `por_confirmar`, `activos`, `en_transito`, `completados`, `ventas_mes` |
| GET | `/pedidos/{codigo}` | Detalle completo con items, historial y datos del tenant comprador |
| PUT | `/pedidos/{id}/estado` | Cambia estado con validación de máquina de estados; registra historial; audita vía `AuditoriaService` |
| GET | `/pedidos/{codigo}/factura` | Descarga PDF de la factura del pedido |

**Filtros en `GET /pedidos`:** `?tab=por_confirmar|activos|completados|todos` + `?estado=` + `?buscar=` (código o nombre finca) + `?page=`

**Máquina de estados:**
```
pendiente → confirmado | cancelado
confirmado → preparando | cancelado
preparando → en_transito | cancelado
en_transito → entregado | cancelado
entregado / cancelado → (sin transiciones)
```
Transición inválida → `409 TRANSICION_INVALIDA`.

**Campo `acciones_disponibles`** — devuelto en `index` y `show`; mapea el estado actual a los CTAs que el frontend debe renderizar (`["confirmar","rechazar"]`, `["preparar"]`, `["despachar"]`, `["confirmar_entrega"]`, `[]`).

**Notas:**
- Scope de seguridad: `delProveedor($id)` en todas las queries — un proveedor nunca accede a pedidos de otro.
- `fecha_entrega_real` se asigna automáticamente a `now()` al transicionar a `entregado`.
- La ruta `exportar` se registra **antes** de `{codigo}` en `routes/api.php` para evitar que Laravel capture "exportar" como código de pedido.
- Los nuevos campos `prioridad`, `estado_pago` y `numero_guia` también aparecen en los responses del lado tenant (`GET /tenant/market/pedidos`) sin cambios adicionales.

### Documentación
- `docs/MARKET_MODULE.md` — arquitectura, tablas, flujos, estrategia de imágenes
- `docs/API_MARKET.md` — guía completa de consumo para el frontend (lado finca)
- `docs/API_MARKET_PROVEEDORES_ADMIN.md` — guía del frontend para el panel de superadmin (CRUD proveedores y sus usuarios)
- `docs/API_MARKET_PROVEEDORES_AUTH.md` — guía del frontend del Portal Proveedor (login, select, forgot/reset, claims del JWT, reglas de elegibilidad)
- `docs/API_MARKET_PROVEEDOR_PRODUCTOS.md` — guía del frontend del Portal Proveedor (gestión de catálogo: wizard-init, CRUD productos, galería de imágenes, precios por volumen)
- `docs/API_MARKET_PROVEEDOR_DASHBOARD.md` — guía del frontend del Portal Proveedor (dashboard: KPIs, pedidos recientes, top productos)
- `docs/API_MARKET_PROVEEDOR.md` — guía del frontend del Portal Proveedor (gestión de pedidos: listado con stats, cambio de estado, factura PDF, exportación Excel)
- `docs/API_MARKET_PROVEEDOR_CONFIGURACION.md` — guía del frontend del Portal Proveedor (configuración del proveedor: 4 tabs General/Bancario/Envíos/Notificaciones + resumen con cuenta enmascarada; lectura ADMIN u OPERADOR, escritura solo ADMIN)
- `docs/API_MARKET_PROVEEDOR_PERFIL.md` — guía del frontend del Portal Proveedor (perfil del usuario logueado: `PUT /perfil` y `PUT /perfil/password`, disponible para cualquier rol; reglas de validación de contraseña actual y no-reutilización)
- `docs/PLAN_BULK_PRODUCTOS_MARKET.md` — plan de implementación de la carga masiva de productos (decisiones de diseño, columnas del Excel, pipeline del job, verificación end-to-end)
- `docs/API_BULK_PRODUCTOS_MARKET.md` — guía del frontend del Portal Proveedor (carga masiva: descargar plantilla, subir ZIP, polling de estado, mensajes de error, ejemplos JS)
- `docs/ESTRUCTURA_EXCEL_BULK_PRODUCTOS.md` — referencia detallada de las 13 columnas del Excel de carga masiva, ejemplos por campo, errores comunes

---

## 13. Estrategia de Caché y Performance

### 13.1 Driver y filosofía

El driver de caché es `file` (`CACHE_STORE=file`), almacenado en `storage/framework/cache/data/`. Se eligió sobre `database` (que tenía contención con escrituras concurrentes en la tabla `cache` de PostgreSQL) y sobre `redis` (no disponible localmente; configurado en `.env` pero no activo). Para escalar a >50 tenants concurrentes, migrar a `redis` es un solo cambio en `.env`.

**Las claves y TTLs canónicos viven en [`App\Support\WizardCache`](app/Support/WizardCache.php).** Nunca se construyen strings de caché ad-hoc en controllers — todo pasa por el helper para que la invalidación quede centralizada.

### 13.2 Capas de caché

Hay dos niveles de caché operando juntos:

1. **Caché aplicativa (servidor)** — `Cache::remember` envolviendo los reads de paramétricas. La invalidación se dispara explícitamente desde los controllers en `store/update/destroy`. TTLs:
   - Paramétricas del tenant (EPS, ARL, fondos pensión, bancos, predios, semillas): **15 min**.
   - Bundle de predio (lotes + sublotes + líneas por predio específico): **60 s** — TTL corto porque cambia con CRUD del wizard; invalidación explícita en Lote/Sublote/Línea.
   - Resumen del predio: **60 s** — misma clave que el bundle, invalidación compartida.
   - Ubicaciones (departamentos, municipios): **6 h** — son catálogos prácticamente inmutables.
   - Tenant + tenant_user en `SetTenant` middleware: **60 s** — acota la ventana de inconsistencia si un super-admin desactiva un usuario sin invalidar explícitamente. Follow-up: añadir `WizardCache::forgetTenantUser()` en `TenantUserController`.

2. **Caché HTTP (cliente)** — Headers `Cache-Control` + `ETag` en los responses de paramétricas (`max-age=600` privado para selects del tenant, `max-age=21600` público para ubicaciones, `max-age=3600` para categorías de documentos). El navegador devuelve 304 sin que el front lo gestione manualmente.

El endpoint `wizard-init` retorna `Cache-Control: private, max-age=0, must-revalidate` deliberadamente — el navegador NO debe cachearlo (el colaborador puede cambiar entre peticiones); la caché vive en el servidor.

### 13.3 Endpoints con caché aplicativa

| Endpoint | TTL | Invalidación |
|----------|-----|--------------|
| `GET /eps/select` | 15 min | `store/update/destroy` de `EpsController` |
| `GET /arl/select` | 15 min | `store/update/destroy` de `ArlController` |
| `GET /fondos-pension/select` | 15 min | `store/update/destroy` de `FondoPensionController` |
| `GET /entidades-bancarias/select` | 15 min | `store/update/destroy` de `EntidadBancariaController` |
| `GET /predios` (solo sin `search` ni `estado`) | 15 min | `store/update/destroy` de `PredioController` |
| `GET /lotes/semillas` | 15 min | n/a (catálogo del tenant, invalidar si se crea/edita semilla) |
| `GET /auth/departamentos` | 6 h | n/a (estático) |
| `GET /auth/departamentos/{codigo}/municipios` | 6 h | n/a (estático) |
| `GET /colaboradores/{id}/wizard-init` y `/colaboradores/wizard-init` | hereda TTLs de sus paramétricas | hereda invalidaciones |
| `GET /predios/{id}/wizard-init` y `/predios/wizard-init` | 60 s (bundle) + TTLs de paramétricas | `WizardCache::forgetPredioBundle()` en `store/update/destroy` de `LoteController`, `SubloteController`, `LineaController` |
| `GET /predios/{id}/resumen` | 60 s | `WizardCache::forgetPredioBundle()` (misma clave) |
| `SetTenant` middleware (`tenant:{id}` y `tenant_user:{tid}:{uid}`) | 60 s | TTL solamente — follow-up: invalidar en `TenantUserController` |

### 13.4 Regla operacional

> **Cualquier endpoint nuevo que sirva una paramétrica o configuración debe pasar por `App\Support\WizardCache`** — registrar la clave y el TTL ahí, no inventar strings en el controller. Cualquier mutación de esa paramétrica debe invalidar la caché correspondiente en el mismo método (store/update/destroy).

### 13.5 Diagnóstico

**Wizard de colaborador lento:**
1. `php artisan cache:clear` para descartar caché corrupto.
2. DevTools → Network → confirmar 1 GET a `colaboradores/wizard-init` (no 8 GET legacy).
3. Revisar `storage/framework/cache/data/` — si tiene cientos de MB es signo de claves fuera del helper.

Ver [docs/OPTIMIZACION_WIZARD_COLABORADOR.md](docs/OPTIMIZACION_WIZARD_COLABORADOR.md).

**Wizard de predios lento:**
1. `php artisan cache:clear`.
2. DevTools → Network → confirmar 1 GET a `predios/{id}/wizard-init` (no 14+ GET legacy).
3. Si el resumen del panel tarda, verificar que la clave `wizard:predio_resumen:t:{tid}:p:{pid}` existe en caché tras la primera carga.
4. Si las palmas en el paso 5 saturan la red, verificar que el frontend pide `per_page=50` y solo la primera página — no debe intentar cargar todo.

Ver [docs/OPTIMIZACION_WIZARD_PREDIO.md](docs/OPTIMIZACION_WIZARD_PREDIO.md).
