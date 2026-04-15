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

**`tenant_config`** — Configuración individual de cada tenant con relación 1:1. Aquí se define si la finca usa jornales (`usa_jornales`), si usa producción/cosecha (`usa_produccion`), el tipo de pago de nómina (`QUINCENAL` o `MENSUAL`), el salario mínimo vigente, el auxilio de transporte, qué módulos están habilitados (vacaciones, liquidación, insumos), y si tiene sincronización offline activa. También tiene un campo `configuracion_extra` tipo JSONB para configuraciones dinámicas futuras.

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

### 5.1 Resumen: 40 tablas organizadas en 13 migraciones

**Migración 1 — Tenants:** `tenants` (core multi-tenant)

**Migración 2 — Tenant Config:** `tenant_config` (configuración por finca)

**Migración 3 — Usuarios y Auditoría:** Modifica `users` (agrega is_super_admin, status), crea `tenant_user` (pivot), crea `auditorias` (log de acciones)

**Migración 4 — Cultivo (9 tablas):** `predios` (fincas/haciendas), `semillas` (catálogo de variedades), `lotes` (divisiones del predio, `fecha_siembra` y `hectareas_sembradas` nullable), `semilla_lote` (pivot), `sublotes` (subdivisiones del lote), `lineas` (filas dentro del sublote, con `numero` único por sublote y `cantidad_palmas`), `palmas` (plantas individuales, `sublote_id` + `linea_id` nullable FK con `nullOnDelete`), `promedio_lote` (kg/gajo promedio por año), `precio_cosecha` (precio por lote y año)

**Migración 5 — Insumos, Labores y Empleados (6 tablas):** `insumos` (fertilizantes, herbicidas), `precio_abono` (rangos de precio por dosis), `labores` (tipos de trabajo con 3 formas de pago: `JORNAL_FIJO`, `POR_PALMA_INSUMO`, `POR_PALMA_SIMPLE`), `modalidad_contrato` (indefinido, obra/labor, fijo), `cargos` (catálogo de puestos, independiente de empleados), `empleados` (datos completos del trabajador con cargo, salario_base y modalidad_pago directos)

**Migración 6 — Jornales y Cosecha (5 tablas):** `jornales` (registro diario de trabajo, sin campo `fecha` propio — usa la fecha de la operación padre), `viajes` (transporte de fruto), `registro_cosecha` (producción por sublote, sin campo `fecha` propio — usa la fecha de la operación padre), `viaje_detalle` (pivot viaje↔cosecha), `cosecha_cuadrilla` (distribución de cosecha entre empleados)

**Migración 7 — Nómina (7 tablas):** `nomina_concepto` (catálogo unificado de deducciones y bonificaciones), `nomina_tabla_legal` (porcentajes legales con vigencia), `nominas` (encabezado del período), `nomina_empleado` (línea por trabajador), `nomina_empleado_concepto` (detalle de cada deducción/bonificación), `nomina_jornal_ref` (snapshot de jornales incluidos), `nomina_cosecha_ref` (snapshot de cosechas incluidas)

**Migración 8 — Vacaciones y Liquidación (4 tablas):** `vacaciones` (solicitudes), `vacacion_acumulado` (saldo de días), `liquidaciones` (cálculo de prestaciones al retiro), `liquidacion_detalle` (desglose concepto por concepto)

**Migración 9 — Refinamiento de Labores y Jornales:** Expande `labores.tipo_pago` de 2 a 3 valores (`JORNAL_FIJO`, `POR_PALMA_INSUMO`, `POR_PALMA_SIMPLE`). Elimina `fecha` de `jornales` y `registro_cosecha` (se obtiene de la operación padre). Hace `operacion_id` obligatorio (NOT NULL) en ambas tablas. Renombra `jornales.valor_insumo` a `precio_insumo_snapshot`. Agrega `jornales.tipo_pago` como snapshot del tipo de pago al momento de creación.

**Migración 10 — Contratos y Documentos del Empleado (2 tablas nuevas + alter empleados):** Agrega `fecha_expedicion_documento` y `lugar_expedicion` a `empleados`. Crea `empleado_contratos` (historial de contratos laborales con salario snapshot, estado VIGENTE/TERMINADO y adjunto PDF). Crea `empleado_documentos` (documentos digitales organizados por categoría: DATOS_BASE, CONTRATACION_LABORAL, SST, PERMISOS_LICENCIAS, FINALIZACION_CONTRATO, DESPRENDIBLES, OTROS).

**Migración 12 — Refactoring Colaboradores:** Separa `nombres`→`primer_nombre`+`segundo_nombre` y `apellidos`→`primer_apellido`+`segundo_apellido`. Desacopla cargo del modelo relacional: quita `cargo_id` FK de `empleados` y agrega campos directos `cargo` (string), `salario_base` (decimal) y `modalidad_pago` (FIJO/PRODUCCION). Agrega `predio_id` (FK nullable a `predios`). Hace `fecha_expedicion_documento` obligatorio. Quita `modalidad_id` y `cargo_id` de `empleado_contratos`. Reestructura categorías de documentos.

**Migración 11 — Ausencias (1 tabla nueva + alter nomina_empleado):** Crea `ausencias` (registros de incapacidades, licencias, permisos y faltas reportados desde la operación diaria; `operacion_id` NOT NULL, rango `fecha_inicio`/`fecha_fin`, flujo PENDIENTE → APROBADA → LIQUIDADA, soporte offline con `sync_uuid`/`sync_estado`). Agrega a `nomina_empleado` las columnas `dias_ausencia_descontados`, `total_ausencias_descuento` y `total_ausencias_remunerado` para reflejar el efecto de las ausencias en la liquidación.

**Migración 13 — Chat del Agente IA (2 tablas nuevas):** Crea `agro_chat_sessions` (conversaciones del usuario con el agente IA: `user_id` + `tenant_id` con `ON DELETE CASCADE`, `titulo`, `created_at`/`updated_at` como `TIMESTAMPTZ`) y `agro_chat_messages` (mensajes individuales: `session_id` FK cascade a sessions, `user_id`, `tenant_id`, `role` `user|assistant|system|tool`, `content` texto, `tool_calls` JSONB para auditar qué consultas SQL hizo el agente, `tokens_in`/`tokens_out` opcionales para telemetría, `created_at` TIMESTAMPTZ). Índices: `(user_id, tenant_id, updated_at)` en sesiones; `(session_id, created_at)` y `(user_id, created_at)` en mensajes. Usadas por un agente IA externo que se conecta a la BD: **solo escribe** en estas dos tablas (4 operaciones: crear sesión, insertar mensaje, tocar `updated_at` de la sesión, eliminar sesión con cascada) y **solo lee** el resto del esquema Laravel (users, tenants, predios, lotes, palmas, etc.).

### 5.2 Convención de índices

Todas las tablas de negocio tienen como mínimo un índice compuesto `(tenant_id, campo_frecuente)`. Esto garantiza que las queries filtradas por tenant sean eficientes. Ejemplos: `(tenant_id, estado)`, `(tenant_id, fecha)`, `(tenant_id, empleado_id)`.

### 5.3 Soporte offline

Las tablas `jornales`, `viajes`, `registro_cosecha` y `ausencias` tienen campos `sync_uuid` (UUID generado offline para evitar duplicados) y `sync_estado` (LOCAL o SINCRONIZADO). Cuando el supervisor registra datos en campo sin internet, la PWA los guarda localmente y al reconectar los envía al backend. El backend detecta duplicados por `sync_uuid` y no los re-inserta.

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

Un **predio** (finca) contiene varios **lotes** (divisiones del terreno), cada lote tiene uno o más **sublotes**, y dentro de cada sublote están las **palmas** individuales. Opcionalmente, un sublote puede tener **líneas** (filas de palmas): si existen, las palmas se asignan a una línea específica (`linea_id`); si no existen, las palmas cuelgan directamente del sublote. Los lotes se asocian con tipos de **semilla** (híbrido, ténera, dura). Cada lote tiene un **promedio** de kg/gajo por año y un **precio de cosecha** por año. Los campos `fecha_siembra` y `hectareas_sembradas` del lote son opcionales.

Los lotes pueden asociarse con una o más **semillas** (variedades de palma) a través de la tabla pivot `semilla_lote` y el modelo `SemillaLote`. Al crear o editar un lote, se puede enviar un array `semillas_ids` para vincular las variedades plantadas.

**Validación de hectáreas:** Al crear/editar un lote, se valida que `hectareas_sembradas` no exceda las `hectareas_totales` disponibles del predio padre (considerando las hectáreas ya usadas por otros lotes). Al editar un predio, se valida que `hectareas_totales` no sea menor que la suma de `hectareas_sembradas` de sus lotes.

**Generación automática de palmas:** Al crear un sublote (`POST /sublotes`) se puede enviar `cantidad_palmas`; el sistema crea automáticamente los registros de Palma con códigos secuenciales: `{nombre_sublote}-{contador_3_digitos}`. Al editar un sublote (`PUT /sublotes/{id}`) con un nuevo `cantidad_palmas`, el sistema agrega o elimina palmas para alcanzar la cantidad deseada. También se pueden crear palmas adicionales directamente con `POST /palmas` indicando `sublote_id` y `cantidad_palmas`.

**Eliminación en cascada:** Todos los endpoints de eliminación (Predios, Lotes, Sublotes) eliminan recursivamente la jerarquía completa hacia abajo (Predio→Lotes→Sublotes→Palmas), actualizando los contadores correspondientes.

**CRUD implementado:** Predios, Lotes, Sublotes, Líneas y Palmas tienen controllers con auditoría y permisos. Los permisos `lotes.*` cubren predios y lotes; `sublotes.*`, `lineas.*` y `palmas.*` son independientes. Palmas incluye eliminación masiva (`DELETE palmas/masivo`).

**Resumen del predio:** `GET /predios/{id}/resumen` devuelve la jerarquía completa (lotes → sublotes con cantidad_palmas) más totales agregados (lotes/sublotes/palmas, hectáreas sembradas/disponibles). Alimenta el panel "Resumen" del wizard "Crear Nueva Plantación".

**Listado de predios:** `GET /predios` ahora incluye `lotes_count` y `palmas_count` (suma de `cantidad_palmas` de todos los sublotes del predio vía relación HasManyThrough).

> **Líneas:** son una agrupación organizacional **opcional** dentro del sublote (`numero` único + `cantidad_palmas`). Las palmas pueden asignarse a una línea mediante `linea_id` (FK nullable con `nullOnDelete`). **Si el sublote tiene líneas**, al crear palmas se debe especificar la línea; al eliminar una línea las palmas quedan sin línea asignada (`linea_id = null`) pero no se eliminan. **Si el sublote no tiene líneas**, el flujo de palmas es directo (solo sublote_id + cantidad). Endpoints expuestos en `/api/v1/tenant/lineas`.

Modelos: Predio, Lote, Sublote, Linea, Palma, Semilla, SemillaLote, PromedioLote, PrecioCosecha.

### 6.2 Módulo de Insumos y Labores

**Insumos** son los fertilizantes, herbicidas y demás productos agrícolas. Cada insumo registra únicamente qué producto es (nombre + unidad de medida). Los insumos **no** determinan el precio de la labor — solo indican qué producto se entrega al trabajador.

**Precios de Abono** (`precio_abono`) es una tabla de escalas **genérica por tenant** que define el precio por palma según los gramos aplicados. Aplica a **todas** las labores de tipo `POR_PALMA_INSUMO` sin importar qué insumo se use. Ejemplo: si un trabajador aplica 200g/palma, el sistema busca en `precio_abono` el rango que contiene 200g y obtiene el precio correspondiente. Típicamente son pocos registros (3-6 rangos por tenant).

**Labores** son los tipos de trabajo que se realizan en campo. Cada labor tiene uno de tres tipos de pago:

- **`JORNAL_FIJO`**: Se paga un valor fijo por día de trabajo. Requiere `valor_base` (tarifa diaria). No usa insumo.
- **`POR_PALMA_INSUMO`**: Se paga según la cantidad de palmas trabajadas y los gramos aplicados. Requiere `insumo_id` (solo para identificar qué producto se entrega, **no determina el precio**). El precio por palma se obtiene de la tabla genérica `precio_abono` según el rango de gramos aplicados.
- **`POR_PALMA_SIMPLE`**: Se paga un valor fijo por cada palma trabajada, sin insumo. Requiere `valor_base` (precio por palma). No usa insumo.

El modelo Labor tiene helpers: `esJornalFijo()`, `esPorPalma()` (true para ambos POR_PALMA_*), `requiereInsumo()`.

**Validación** (`StoreLaborRequest`): Valida que cada tipo de pago tenga los campos requeridos y prohíbe los que no aplican (ej: `POR_PALMA_INSUMO` exige `insumo_id`, `JORNAL_FIJO` lo prohíbe).

Modelos: Insumo, PrecioAbono, Labor.

### 6.3 Módulo de Empleados

**Modalidades de contrato (`modalidad_contrato`):** Catálogo de tipos de contrato (indefinido, obra/labor, fijo, prestación de servicios). Cada tenant configura los suyos. Se mantiene como tabla paramétrica independiente.

**Cargos (`cargos`):** Catálogo de puestos de trabajo con modalidad de contrato asociada y tipo de salario (`FIJO`/`VARIABLE`). Se mantiene como tabla paramétrica independiente, **sin relación FK con empleados** — el cargo se escribe directamente en el registro del empleado.

**Empleados:** Registro completo con nombre desagregado en 4 campos (`primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`). Incluye datos de identificación (tipo de documento: CC, TI, PASAPORTE, CE, PPT; número, fecha de expedición obligatoria, lugar de expedición), cargo directo (`cargo` string, `salario_base` decimal, `modalidad_pago` FIJO/VARIABLE), predio asignado (`predio_id` nullable FK a `predios`), fechas laborales (`fecha_ingreso` obligatoria, `fecha_retiro` nullable), seguridad social colombiana (EPS, ARL, pensión, caja de compensación), datos bancarios (tipo de cuenta, entidad, número — como VARCHAR para soportar ceros iniciales), tallas de dotación, y contacto de emergencia. La unicidad del documento es por tenant (dos tenants pueden tener empleados con el mismo documento).

**Contratos del empleado (`empleado_contratos`):** Historial de contratos laborales de cada empleado. Cada contrato registra: fecha de inicio, fecha de terminación (nullable), salario acordado (snapshot al momento de firma), estado del contrato (`VIGENTE` o `TERMINADO`), y adjunto PDF escaneado (ruta en disco local privado). Al crear un nuevo contrato VIGENTE, los anteriores deben marcarse como TERMINADO (lógica en capa de aplicación). Los campos `fecha_ingreso` y `fecha_retiro` en `empleados` se usan para cálculos de nómina y prestaciones.

**Documentos del empleado (`empleado_documentos`):** Documentos digitales organizados por categoría, cada uno con archivo adjunto almacenado en disco local privado (`storage/app/private/tenants/{tenant_id}/empleados/{empleado_id}/documentos/`). Las categorías son:
- **DATOS_BASE** (único por tipo): Documento de identidad, Hoja de vida, Antecedentes, Autorización de datos personales.
- **CONTRATACION_LABORAL** (único por tipo): Contrato de trabajo, Acuerdo de confidencialidad.
- **SST** (único por tipo): Examen de ingreso.
- **PERMISOS_LICENCIAS** (N documentos, tipo personalizado desde frontend).
- **FINALIZACION_CONTRATO** (N documentos, tipo fijo: `FINALIZACION_CONTRATO`).
- **DESPRENDIBLES** (N documentos, tipo fijo: `DESPRENDIBLES`).
- **OTROS** (N documentos, tipo personalizado desde frontend).

Las categorías y sus tipos predefinidos están centralizados en `App\Constants\DocumentoCategoria`.

Modelos: ModalidadContrato, Cargo, Empleado, EmpleadoContrato, EmpleadoDocumento.

### 6.4 Módulo de Jornales

Un **jornal** es un registro diario de trabajo de un empleado dentro de una **operación** (planilla diaria). Vincula al empleado con una labor, opcionalmente con un lote/sublote. El jornal **no tiene campo `fecha` propio** — la fecha se obtiene de la operación padre (`operacion.fecha`). El campo `operacion_id` es obligatorio (NOT NULL).

Tanto empleados de salario **FIJO** como **VARIABLE** pueden tener jornales registrados. El sistema no distingue entre ellos al registrar la operación diaria — todos los empleados que trabajaron ese día aparecen en la planilla con sus labores asignadas. La diferencia está en cómo la **nómina** usa esa información después:

| | Empleado VARIABLE | Empleado FIJO |
|---|---|---|
| Se registra jornal en operación | Sí | Sí |
| El jornal calcula `valor_total` | Sí | Sí |
| En nómina, `valor_total` determina su pago | **Sí** — su sueldo es la suma de jornales + cosechas del período | **No** — su sueldo es `empleado.salario_base` siempre |
| ¿Para qué sirve el jornal? | Para calcular su pago | Para **control/tracking** (saber qué hizo ese día) |

Cada jornal guarda un **snapshot** del tipo de pago (`tipo_pago`) de la labor al momento de creación, para que si la labor cambia después, el jornal mantiene el contexto original de cálculo.

**Lógica de cálculo** (centralizada en `JornalCalculationService`):
- Si la labor es `JORNAL_FIJO`: `valor_total = labor.valor_base × dias_jornal`
- Si la labor es `POR_PALMA_INSUMO`: Se busca en la tabla genérica `precio_abono` (por tenant, sin importar el insumo) el rango que corresponde a los `gramos_por_palma`, se obtiene el `precio_palma`, se guarda en `precio_insumo_snapshot`, y `valor_total = precio_palma × cantidad_palmas`
- Si la labor es `POR_PALMA_SIMPLE`: `valor_total = labor.valor_base × cantidad_palmas`

**Campos condicionales por tipo:**

| Campo | JORNAL_FIJO | POR_PALMA_INSUMO | POR_PALMA_SIMPLE |
|---|---|---|---|
| `dias_jornal` | Requerido (0.5, 1.0, etc.) | Default 1.0 | Default 1.0 |
| `cantidad_palmas` | No aplica (null) | Requerido | Requerido |
| `gramos_por_palma` | No aplica (null) | Requerido | No aplica (null) |
| `precio_insumo_snapshot` | null | Snapshot del precio de abono | null |
| `valor_unitario` | labor.valor_base | precio de abono | labor.valor_base |

**Validación** (`StoreJornalRequest`): Valida condicionalmente según el `tipo_pago` de la labor seleccionada.

Este módulo es **crítico para offline** — los supervisores registran jornales en campo sin internet.

Modelo: Jornal. Servicio: JornalCalculationService.

### 6.5 Módulo de Cosecha y Viajes

Un **viaje** representa un cargamento de fruto de palma que sale de la finca. Registra la placa del vehículo, conductor, fecha, peso total del viaje, y cantidad total de gajos (racimos).

Un **registro de cosecha** es la producción de un sublote dentro de una **operación** (planilla diaria). No tiene campo `fecha` propio — la fecha se obtiene de la operación padre (`operacion.fecha`). El campo `operacion_id` es obligatorio (NOT NULL). Registra gajos reportados, gajos de reconteo, peso confirmado, y el valor calculado.

El **viaje_detalle** es el pivot que conecta un viaje con múltiples registros de cosecha (un viaje puede llevar fruto de varios sublotes).

La **cosecha_cuadrilla** distribuye el valor de cada cosecha entre los empleados que participaron. Si 4 empleados cosecharon un sublote, el valor se divide entre ellos.

**Tipos de cálculo de cosecha:**
- `HOMOGENEO`: El promedio kg/gajo se calcula dividiendo peso del viaje entre gajos totales. Todos los sublotes del viaje comparten el mismo promedio.
- `NO_HOMOGENEO`: Cada sublote usa su propio promedio histórico del año (`promedio_lote`).

Este módulo también es **crítico para offline**.

Modelos: Viaje, RegistroCosecha, ViajeDetalle, CosechaCuadrilla.

### 6.6 Módulo de Nómina

Es el módulo más complejo del sistema. Opera en períodos (quincenas o meses, según la configuración del tenant).

**Conceptos de nómina (`nomina_concepto`):** Catálogo unificado de todo lo que puede sumar o restar en una nómina. Cada concepto tiene: tipo (deducción legal, deducción voluntaria, bonificación fija, bonificación variable), subtipo (salud, pensión, ARL, fondo solidaridad, libranza, embargo, productividad, transporte, alimentación, antigüedad), operación (SUMA o RESTA), método de cálculo (porcentaje, valor fijo, fórmula), valor de referencia, base de cálculo (salario base, total devengado, salario mínimo, manual), y si aplica a empleados fijos, variables o ambos.

**Tabla legal (`nomina_tabla_legal`):** Historial de porcentajes legales colombianos con vigencia. Por ejemplo: "Salud - empleado 4%, empresa 8.5%, vigente desde 2026-01-01". Esto permite que cuando cambien los porcentajes, se pueda recalcular nóminas históricas con los valores correctos de su época.

**Flujo de nómina:**
1. Se crea un período (`nominas`) con estado BORRADOR
2. Se agregan empleados al período (`nomina_empleado`). Para empleados fijos, el `total_devengado = empleado.salario_base`. Para variables, se suman jornales + cosechas del rango de fechas.
3. Se ejecuta "Calcular": el sistema recorre cada empleado, aplica los conceptos obligatorios (salud 4%, pensión 4%, etc.), calcula bonificaciones, genera los snapshots de jornales y cosechas referenciados. Estado pasa a CALCULADA.
4. Se pueden hacer ajustes manuales (agregar conceptos, cambiar valores).
5. Se ejecuta "Cerrar": la nómina pasa a CERRADA y se vuelve inmutable. No se puede editar ni eliminar.

**Snapshots:** `nomina_jornal_ref` y `nomina_cosecha_ref` guardan una copia del valor de cada jornal y cosecha incluidos en la nómina. Así, si después alguien modifica un jornal, la nómina cerrada mantiene el valor original con el que se calculó.

Modelos: NominaConcepto, NominaTablaLegal, Nomina, NominaEmpleado, NominaEmpleadoConcepto, NominaJornalRef, NominaCosechaRef.

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

**Catálogo de tipos:** `INCAPACIDAD_EPS`, `INCAPACIDAD_ARL`, `LICENCIA_MATERNIDAD`, `LICENCIA_PATERNIDAD`, `LICENCIA_LUTO`, `PERMISO_REMUNERADO`, `PERMISO_NO_REMUNERADO`, `AUSENCIA_INJUSTIFICADA`, `CALAMIDAD_DOMESTICA`, `SUSPENSION_DISCIPLINARIA`, `OTRO`. El check constraint a nivel de BD restringe los valores válidos.

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

Modelo: Ausencia.

### 6.10 Auditoría

Registra todas las acciones del sistema: login, logout, crear, editar, eliminar. Cada registro guarda: tenant_id, user_id, acción, módulo, observaciones, IP, user agent, y snapshots JSON de datos anteriores y nuevos (para poder ver exactamente qué cambió).

Modelo: Auditoria.

### 6.12 Chat del Agente IA

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

### 6.11 Bot de Integraciones (consumo externo de la API)

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
- **Nómina:** `nomina.ver`, `nomina.crear`, `nomina.editar`, `nomina.calcular`, `nomina.cerrar`
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
│   │   │       ├── PalmaController.php     ← CRUD palmas + eliminación masiva
│   │   │       ├── TenantUserController.php ← Gestión usuarios del tenant
│   │   │       ├── UserPermissionController.php ← Permisos de usuarios
│   │   │       ├── EmpleadoController.php   ← CRUD colaboradores + toggle
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
│   │   │       ├── StoreEmpleadoRequest.php  ← Validación crear colaborador (edad ≥ 14)
│   │   │       └── UpdateEmpleadoRequest.php ← Validación editar colaborador
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
│   │   └── Ausencia.php                    ← Ausencias reportadas desde la operación diaria
│   ├── Constants/
│   │   └── DocumentoCategoria.php          ← Categorías y tipos de documentos del empleado
│   ├── Services/
│   │   └── AuditoriaService.php            ← Registra acciones CRUD, login, logout
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
│   ├── API_PLANTACION.md                   ← Doc endpoints Predios, Lotes, Sublotes, Líneas, Palmas
│   ├── API_COLABORADORES.md                ← Doc colaboradores + documentos
│   ├── API_USUARIOS_TENANT.md              ← Doc gestión usuarios del tenant
│   └── API_BOT.md                          ← Guía de integración del bot Python (auth, flujo, errores, cliente)
├── SETUP.md                                ← Guía de instalación paso a paso
└── TAREAS.md                               ← Lista completa de tareas back + front
```

---

## 9. Estructura de Rutas API

### Grupo 1: Autenticación (público, sin JWT)
```
POST   /api/v1/auth/login             → Token JWT
POST   /api/v1/auth/register          → Crear usuario + token
```

### Grupo 2: Autenticación (requiere JWT)
```
POST   /api/v1/auth/logout            → Invalidar token
POST   /api/v1/auth/refresh           → Renovar token
GET    /api/v1/auth/me                → Usuario + tenants
POST   /api/v1/auth/select-tenant     → Token con tenant en claims
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
```

### Grupo 4: Negocio (JWT + X-Tenant-Id)

**Implementados (CRUD completo con auditoría y permisos):**
```
GET|POST        /api/v1/tenant/predios              → Listar (con palmas_count) / Crear predio  (lotes.ver / lotes.crear)
GET             /api/v1/tenant/predios/:id/resumen  → Jerarquía completa + totales para wizard  (lotes.ver)
GET|PUT|DELETE  /api/v1/tenant/predios/:id          → Ver / Editar / Eliminar   (lotes.ver / lotes.editar / lotes.eliminar)
GET             /api/v1/tenant/lotes/semillas       → Listar semillas activas   (lotes.ver)
GET|POST        /api/v1/tenant/lotes                → Listar / Crear lote       (lotes.ver / lotes.crear)
GET|PUT|DELETE  /api/v1/tenant/lotes/:id            → Ver / Editar / Eliminar   (lotes.ver / lotes.editar / lotes.eliminar)
GET|POST        /api/v1/tenant/sublotes             → Listar / Crear sublote    (sublotes.ver / sublotes.crear)
GET|PUT|DELETE  /api/v1/tenant/sublotes/:id         → Ver / Editar / Eliminar   (sublotes.ver / sublotes.editar / sublotes.eliminar)
GET|POST        /api/v1/tenant/lineas               → Listar / Crear línea      (lineas.ver / lineas.crear)
GET|PUT|DELETE  /api/v1/tenant/lineas/:id           → Ver / Editar / Eliminar   (lineas.ver / lineas.editar / lineas.eliminar)
DELETE          /api/v1/tenant/palmas/masivo         → Eliminación masiva        (palmas.eliminar)
GET|POST        /api/v1/tenant/palmas               → Listar / Crear palma      (palmas.ver / palmas.crear)
GET|PUT         /api/v1/tenant/palmas/:id           → Ver / Editar palma        (palmas.ver / palmas.editar)
GET|POST        /api/v1/tenant/usuarios             → Listar / Crear usuario    (usuarios.ver / usuarios.crear)
PUT|DELETE      /api/v1/tenant/usuarios/:id         → Editar / Eliminar usuario (usuarios.editar / usuarios.eliminar)
PATCH           /api/v1/tenant/usuarios/:id/toggle  → Activar/Desactivar        (usuarios.desactivar)
GET|PUT         /api/v1/tenant/usuarios/:id/permisos → Ver / Editar permisos    (usuarios.ver_permisos / usuarios.editar_permisos)
DELETE          /api/v1/tenant/usuarios/:id/permisos → Resetear permisos        (usuarios.editar_permisos)
PUT             /api/v1/tenant/configuracion/finca  → Editar config finca       (configuracion.editar)
PUT             /api/v1/tenant/perfil               → Editar perfil propio
PUT             /api/v1/tenant/perfil/password      → Cambiar contraseña propia
GET|POST        /api/v1/tenant/precios-cosecha      → Listar / Crear precio cosecha (configuracion.editar)
GET|PUT|DELETE  /api/v1/tenant/precios-cosecha/:id → Ver / Editar / Eliminar      (configuracion.editar)
GET             /api/v1/tenant/auditorias           → Listar auditoría del tenant (configuracion.editar)
GET             /api/v1/tenant/auditorias/:id       → Detalle de auditoría       (configuracion.editar)
GET|POST        /api/v1/tenant/colaboradores        → Listar / Crear colaborador (colaboradores.ver / colaboradores.crear)
GET|PUT|DELETE  /api/v1/tenant/colaboradores/:id    → Ver / Editar / Eliminar    (colaboradores.ver / colaboradores.editar / colaboradores.eliminar)
PATCH           /api/v1/tenant/colaboradores/:id/toggle → Activar/Desactivar     (colaboradores.editar)
POST            /api/v1/tenant/bot/test             → Endpoint de prueba del bot externo (solo log, sin permiso)
```

**Pendientes por implementar:**
```
/api/v1/tenant/colaboradores/:id/contratos, /api/v1/tenant/colaboradores/:id/documentos
/api/v1/tenant/jornales
/api/v1/tenant/viajes, /api/v1/tenant/cosechas
/api/v1/tenant/nominas, /api/v1/tenant/nominas/:id/calcular, /api/v1/tenant/nominas/:id/cerrar
/api/v1/tenant/nomina-conceptos
/api/v1/tenant/vacaciones, /api/v1/tenant/vacaciones-acumulado/:empleadoId
/api/v1/tenant/liquidaciones, /api/v1/tenant/liquidaciones/:id/calcular, /api/v1/tenant/liquidaciones/:id/aprobar
/api/v1/tenant/sync/jornales, /api/v1/tenant/sync/cosechas, /api/v1/tenant/sync/catalogs
```

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
- TenantController completo (CRUD + toggle + gestión de usuarios)
- TenantUserController (CRUD usuarios dentro de un tenant)
- UserPermissionController (ver, editar, resetear permisos por usuario)
- TenantSettingsController (configuración de la finca)
- ProfileController (editar perfil, cambiar contraseña)
- **PredioController** — CRUD + `resumen()` (jerarquía completa con totales para wizard) + listado con `lotes_count`/`palmas_count`. Eliminación en cascada (permiso: `lotes.*`)
- **LoteController** — CRUD completo con auditoría, validación de hectáreas, gestión de semillas y eliminación en cascada (permiso: `lotes.*`)
- **SubloteController** — CRUD completo con auditoría y eliminación en cascada (permiso: `sublotes.*`)
- **LineaController** — CRUD completo (index, show, store, update, destroy). Líneas son metadata opcional por sublote, **independientes de palmas** (eliminar líneas no afecta palmas) (permiso: `lineas.*`)
- **PalmaController** — index, show, store individual, update, eliminación masiva (permiso: `palmas.*`)
- **EmpleadoController** — CRUD completo + toggle con auditoría, validación de edad ≥ 14 años, protección contra eliminación si tiene jornales/nómina, limpieza de archivos físicos al eliminar (permiso: `colaboradores.*`)
- **EmpleadoDocumentoController** — Carga, listado, descarga y eliminación de documentos del colaborador. Soporta categorías con documentos únicos por tipo (reemplazo automático). Almacena archivos en disco privado (`local`), descarga segura via controller. Auditoría en todas las acciones de escritura (permiso: `colaboradores.ver` lectura, `colaboradores.editar` escritura)
- FormRequest validations para Predios, Lotes (con validación de hectáreas y semillas_ids), Sublotes, Líneas, Palmas, Empleados (con validación de edad) y EmpleadoDocumento (con validación de categoría/tipo via DocumentoCategoria)
- AuditoriaService (registrar, registrarCreacion, registrarEdicion, registrarEliminacion)
- Rol ADMIN (con todos los permisos) + usuarios con permisos directos (sin roles intermedios)
- Seeder con datos de prueba + RolesAndPermissionsSeeder
- AppServiceProvider con gate para Pulse
- Documentación API: `docs/API_PLANTACION.md` (Predios, Lotes, Sublotes, Líneas, Palmas), `docs/API_COLABORADORES.md` (Colaboradores), `docs/API_BOT.md` (Bot de integraciones)
- Constantes de categorías de documentos: `App\Constants\DocumentoCategoria`
- Modelos de contratos y documentos del empleado: EmpleadoContrato, EmpleadoDocumento
- **Modelo de Ausencias** (`Ausencia`): tabla `ausencias` reportada desde la operación diaria con `operacion_id` NOT NULL, rango `fecha_inicio`/`fecha_fin`, flujo PENDIENTE → APROBADA → LIQUIDADA, soporte offline (`sync_uuid`/`sync_estado`). Reutiliza permisos `operaciones.*` (no se crearon permisos `ausencias.*`). `nomina_empleado` extendida con `dias_ausencia_descontados`, `total_ausencias_descuento`, `total_ausencias_remunerado` para reflejar el efecto en nómina.
- **Chat del Agente IA (solo tablas):** Migración `2026_04_15_000001_create_agro_chat_tables.php` crea `agro_chat_sessions` y `agro_chat_messages` con FKs cascade a `users` y `tenants`, `tool_calls` JSONB para auditar consultas SQL del agente y `TIMESTAMPTZ` en las fechas. Las tablas existen listas para que un agente IA externo persista conversaciones (4 operaciones de escritura, el resto del esquema es solo lectura). Aún no hay controllers ni modelos Eloquent — el agente se conecta directamente a PostgreSQL.
- **Bot de integraciones externas:**
  - `BotUserSeeder` provisiona un único usuario `bot@d3vs.tech` como super_admin desacoplado de tenants (cero provisionamiento por finca, válido para tenants futuros)
  - `BotTestController` con endpoint `POST /api/v1/tenant/bot/test` que escribe `BOT_TEST consumido` en `storage/logs/laravel.log`
  - Variable `BOT_USER_PASSWORD` en `.env` para el password del bot
  - Documentación completa para el desarrollador del bot Python en `docs/API_BOT.md` (login, select-tenant, headers, manejo de errores, cliente Python de referencia)

**Pendiente:**
- Controllers de: contratos del empleado, jornales, cosecha, ausencias, nómina, vacaciones, liquidación
- Lógica de cálculo de jornales, cosechas, ausencias y su efecto en nómina, y liquidación
- Sync offline (SyncController)
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
| Plantación (Predios, Lotes, Sublotes, Líneas, Palmas) | `docs/API_PLANTACION.md` | Endpoints CRUD con ejemplos de request/response, permisos, validación de hectáreas, semillas, códigos de palma y errores |
| Usuarios del Tenant | `docs/API_USUARIOS_TENANT.md` | CRUD usuarios, activar/desactivar, gestión de permisos directos, guía de implementación frontend |
| Colaboradores | `docs/API_COLABORADORES.md` | CRUD colaboradores, toggle estado, carga/descarga/eliminación de documentos por categoría, categorías de documentos, reemplazo automático de documentos únicos |
| Bot de Integraciones | `docs/API_BOT.md` | Guía completa para el desarrollador del bot Python: flujo de autenticación (login + select-tenant), headers obligatorios, endpoint de prueba, manejo de errores, cliente Python de referencia con cache de tokens por tenant, variables de entorno, checklist pre-producción |
