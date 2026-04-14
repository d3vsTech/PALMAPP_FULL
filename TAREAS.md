# AGRO CAMPO — Listas de Tareas Backend + Frontend + Integración

---

## PARTE 1: BACKEND (Laravel 12 API)

### Fase 1 — Setup y Arquitectura Base
```
□ 1.1  Crear proyecto Laravel 12 en C:\laragon\www\agro-campo
□ 1.2  Instalar dependencias: jwt-auth, spatie/permission, horizon, telescope
□ 1.3  Configurar .env para PostgreSQL + Redis
□ 1.4  Configurar config/auth.php con guard JWT
□ 1.5  Configurar config/permission.php con teams=true, team_foreign_key=tenant_id
□ 1.6  Publicar configs: jwt, spatie, horizon, telescope
□ 1.7  Generar JWT secret: php artisan jwt:secret
□ 1.8  Copiar migraciones proporcionadas a database/migrations/
□ 1.9  Copiar modelos, traits, middleware a sus carpetas
□ 1.10 Registrar middleware en bootstrap/app.php (SetTenant, SuperAdmin)
□ 1.11 Ejecutar php artisan migrate
□ 1.12 Ejecutar php artisan db:seed
□ 1.13 Verificar php artisan route:list --path=api
```

### Fase 2 — Autenticación JWT
```
□ 2.1  AuthController: login (valida credenciales, retorna JWT + user)
□ 2.2  AuthController: register (crea user, opcionalmente asigna a tenant)
□ 2.3  AuthController: logout (invalida token)
□ 2.4  AuthController: refresh (renueva token)
□ 2.5  AuthController: me (retorna user + lista de tenants con roles)
□ 2.6  AuthController: selectTenant (genera token con tenant_id en claims)
□ 2.7  Middleware SetTenant: resuelve tenant_id desde header X-Tenant-Id
□ 2.8  Middleware SetTenant: valida acceso del user al tenant
□ 2.9  Middleware SetTenant: verifica tenant activo
□ 2.10 Middleware SuperAdmin: protege rutas /api/admin/*
□ 2.11 Manejar excepciones JWT en bootstrap/app.php
□ 2.12 Test: login exitoso retorna token válido
□ 2.13 Test: login fallido retorna 401
□ 2.14 Test: request sin X-Tenant-Id retorna 422
□ 2.15 Test: user de tenant A no accede a tenant B
□ 2.16 Test: tenant SUSPENDIDO retorna 403
```

### Fase 3 — CRUD Super Admin
```
□ 3.1  TenantController: index (listar tenants con paginación y filtros)
□ 3.2  TenantController: store (crear tenant + config por defecto)
□ 3.3  TenantController: show (detalle con config y usuarios)
□ 3.4  TenantController: update (editar tenant + config)
□ 3.5  TenantController: toggle (activar/suspender)
□ 3.6  TenantController: addUser (asignar usuario a tenant con rol)
□ 3.7  TenantController: removeUser (desasignar usuario)
□ 3.8  Validar límites del plan (max_empleados, max_usuarios)
□ 3.9  Test: solo super_admin puede acceder a /api/admin/*
□ 3.10 Test: CRUD completo de tenants
```

### Fase 4 — Módulo Cultivo (Predios, Lotes, Sublotes, Palmas)
```
□ 4.1  Modelo Predio con BelongsToTenant
□ 4.2  PredioController: CRUD completo
□ 4.3  Modelo Lote con BelongsToTenant + relaciones (predio, sublotes, semillas)
□ 4.4  LoteController: CRUD con filtro por predio
□ 4.5  Modelo Semilla con BelongsToTenant
□ 4.6  SemillaController: CRUD
□ 4.7  Modelo Sublote con BelongsToTenant
□ 4.8  SubloteController: CRUD con filtro por lote
□ 4.9  Modelo Palma con BelongsToTenant
□ 4.10 PalmaController: CRUD con filtro por sublote
□ 4.11 Modelo PromedioLote (recálculo por job async)
□ 4.12 Modelo PrecioCosecha
□ 4.13 FormRequest validations para cada recurso
□ 4.14 Test: datos de tenant A no aparecen en tenant B
```

### Fase 5 — Módulo Insumos y Labores
```
□ 5.1  Modelo Insumo con BelongsToTenant
□ 5.2  InsumoController: CRUD
□ 5.3  Modelo PrecioAbono con BelongsToTenant
□ 5.4  PrecioAbonoController: CRUD con validación de rangos
□ 5.5  Modelo Labor con BelongsToTenant
□ 5.6  LaborController: CRUD
□ 5.7  Respetar tenant_config.modulo_insumos (si false, retornar 403)
```

### Fase 6 — Módulo Empleados y Cargos
```
□ 6.1  Modelo ModalidadContrato con BelongsToTenant
□ 6.2  ModalidadContratoController: CRUD
□ 6.3  Modelo Cargo con BelongsToTenant
□ 6.4  CargoController: CRUD
□ 6.5  Modelo Empleado con BelongsToTenant (el más complejo)
□ 6.6  EmpleadoController: CRUD con búsqueda, filtros por cargo/estado
□ 6.7  Validar unicidad de documento por tenant
□ 6.8  Validar límite max_empleados del plan
□ 6.9  API Resource para formatear respuesta de empleado
```

### Fase 7 — Módulo Jornales
```
□ 7.1  Modelo Jornal con BelongsToTenant
□ 7.2  JornalController: CRUD
□ 7.3  Lógica de cálculo: si JORNAL_FIJO → valor_base
□ 7.4  Lógica de cálculo: si POR_PALMA → buscar precio_abono según gramos
□ 7.5  Validar que tenant_config.usa_jornales = true
□ 7.6  Soporte sync_uuid para registros offline
□ 7.7  JornalController: filtro por rango de fechas y empleado
□ 7.8  Test: cálculo correcto por jornal fijo
□ 7.9  Test: cálculo correcto por palma con rango de abono
```

### Fase 8 — Módulo Cosecha y Viajes
```
□ 8.1  Modelo Viaje con BelongsToTenant
□ 8.2  ViajeController: CRUD
□ 8.3  Modelo RegistroCosecha con BelongsToTenant
□ 8.4  RegistroCosechaController: CRUD
□ 8.5  Modelo ViajeDetalle (pivot viaje ↔ cosecha)
□ 8.6  Modelo CosechaCuadrilla (distribución empleados)
□ 8.7  Lógica HOMOGENEO: promedio_kg_gajo = peso_viaje / gajos_totales
□ 8.8  Lógica NO HOMOGENEO: consultar promedio_lote del año
□ 8.9  Cálculo valor_total = promedio × gajos_reconteo × precio_cosecha
□ 8.10 Distribución cuadrilla: valor_total / count(empleados)
□ 8.11 Job: RecalcularPromedioLote (Laravel Horizon) al registrar cosecha
□ 8.12 Validar que tenant_config.usa_produccion = true
□ 8.13 Test: escenario homogéneo
□ 8.14 Test: escenario no homogéneo
```

### Fase 9 — Módulo Nómina
```
□ 9.1  Modelo NominaConcepto con BelongsToTenant
□ 9.2  NominaConceptoController: CRUD (catálogo de conceptos)
□ 9.3  Modelo NominaTablaLegal con BelongsToTenant
□ 9.4  Seeder: porcentajes legales Colombia 2026
□ 9.5  Modelo Nomina con BelongsToTenant
□ 9.6  NominaController: crear período (respetar tipo_pago_nomina del config)
□ 9.7  Modelo NominaEmpleado
□ 9.8  NominaController: calcular()
        → Para FIJO: total_devengado = cargo.salario
        → Para VARIABLE: SUM jornales + SUM cosechas en el rango
□ 9.9  Modelo NominaEmpleadoConcepto
□ 9.10 Aplicar deducciones legales (salud 4%, pensión 4%)
□ 9.11 Aplicar bonificaciones configuradas
□ 9.12 Calcular total_neto = devengado + bonificaciones - deducciones
□ 9.13 Modelo NominaJornalRef (snapshot de jornales)
□ 9.14 Modelo NominaCosechaRef (snapshot de cosechas)
□ 9.15 NominaController: cerrar() → estado CERRADA, inmutable
□ 9.16 Validar: nómina CERRADA no se puede editar
□ 9.17 Test: cálculo empleado fijo
□ 9.18 Test: cálculo empleado variable
□ 9.19 Test: nómina cerrada es inmutable
```

### Fase 10 — Módulo Vacaciones
```
□ 10.1 Modelo Vacacion con BelongsToTenant
□ 10.2 VacacionController: CRUD
□ 10.3 Modelo VacacionAcumulado
□ 10.4 Cálculo: 15 días hábiles por año trabajado
□ 10.5 Cálculo: valor_dia = salario / 30
□ 10.6 Endpoint: acumulado por empleado
□ 10.7 Validar que tenant_config.modulo_vacaciones = true
```

### Fase 11 — Módulo Liquidación
```
□ 11.1 Modelo Liquidacion con BelongsToTenant
□ 11.2 LiquidacionController: CRUD
□ 11.3 Modelo LiquidacionDetalle
□ 11.4 LiquidacionController: calcular()
        → Cesantías: salario × dias / 360
        → Intereses: cesantías × dias × 0.12 / 360
        → Prima: salario × dias / 360
        → Indemnización: solo si DESPIDO_SIN_JUSTA_CAUSA
□ 11.5 LiquidacionController: aprobar()
□ 11.6 Transacción atómica: todo o rollback
□ 11.7 Validar que tenant_config.modulo_liquidacion = true
□ 11.8 Test: liquidación completa con todos los conceptos
```

### Fase 12 — Sync Offline
```
□ 12.1 SyncController: jornales (recibe array, detecta duplicados por sync_uuid)
□ 12.2 SyncController: cosechas (recibe array, detecta duplicados por sync_uuid)
□ 12.3 SyncController: catalogs (retorna lotes, sublotes, empleados, labores para cache)
□ 12.4 Validar sync_habilitado en tenant_config
□ 12.5 Respuesta: { sincronizados: N, duplicados: N, errores: [...] }
```

### Fase 13 — Auditoría y Logging
```
□ 13.1 AuditoriaController: listar con filtros (fecha, usuario, módulo, acción)
□ 13.2 Trait Auditable: auto-registrar CREATE/UPDATE/DELETE en modelos clave
□ 13.3 Guardar datos_anteriores y datos_nuevos (diff)
□ 13.4 Proteger endpoint: solo ADMIN puede ver auditorías
```

### Fase 14 — Horizon y Jobs
```
□ 14.1 Configurar Horizon para Redis
□ 14.2 Job: RecalcularPromedioLote
□ 14.3 Job: CalcularNomina (proceso pesado en background)
□ 14.4 Job: GenerarReportePDF (si se necesita)
□ 14.5 Configurar supervisord o pm2 para php artisan horizon
```

---

## PARTE 2: FRONTEND (Vue 3 + Nuxt 3)

### Fase 1 — Setup Nuxt 3
```
□ 1.1  Crear proyecto: npx nuxi@latest init agro-campo-front
□ 1.2  Instalar dependencias: pinia, @pinia/nuxt, @vueuse/nuxt
□ 1.3  Instalar UI: tailwindcss, @headlessui/vue o primevue
□ 1.4  Configurar PWA: @vite-pwa/nuxt
□ 1.5  Configurar Axios o $fetch nativo de Nuxt
□ 1.6  Crear estructura de carpetas:
        ├── composables/       → useAuth, useApi, useTenant
        ├── stores/            → Pinia stores
        ├── layouts/           → default, auth, admin
        ├── middleware/         → auth, guest, super-admin, tenant
        ├── pages/             → rutas automáticas
        ├── components/        → componentes reutilizables
        └── plugins/           → axios interceptors, JWT
```

### Fase 2 — Autenticación y JWT
```
□ 2.1  Store: useAuthStore (Pinia)
        → state: token, user, tenants, currentTenantId, currentRole
        → actions: login, logout, refresh, selectTenant
        → getters: isAuthenticated, isSuperAdmin, currentTenant
□ 2.2  Plugin: jwt-interceptor.ts
        → Interceptor request: agregar Authorization: Bearer {token}
        → Interceptor request: agregar X-Tenant-Id: {currentTenantId}
        → Interceptor response: si 401 → intentar refresh → si falla → logout
□ 2.3  Middleware Nuxt: auth.ts (redirige a /login si no hay token)
□ 2.4  Middleware Nuxt: guest.ts (redirige a / si ya autenticado)
□ 2.5  Middleware Nuxt: super-admin.ts (solo super admin)
□ 2.6  Middleware Nuxt: tenant.ts (debe tener tenant seleccionado)
□ 2.7  Página: /login
□ 2.8  Página: /select-tenant (después del login, elegir finca)
□ 2.9  Persistir token en cookie httpOnly o localStorage cifrado
□ 2.10 Auto-refresh del token antes de expirar
```

### Fase 3 — Layout y Navegación
```
□ 3.1  Layout auth: solo logo + formulario centrado
□ 3.2  Layout default: sidebar + topbar + content
□ 3.3  Layout admin: sidebar especial super-admin
□ 3.4  Sidebar: navegación por módulo (dinámico según config del tenant)
        → Si usa_jornales = false → ocultar sección Jornales
        → Si usa_produccion = false → ocultar sección Cosecha
        → Si modulo_vacaciones = false → ocultar Vacaciones
□ 3.5  Topbar: nombre usuario, tenant actual, selector de tenant, logout
□ 3.6  Breadcrumbs automáticos
□ 3.7  Componente NotificationToast global
□ 3.8  Responsive: sidebar colapsable en móvil
```

### Fase 4 — Panel Super Admin
```
□ 4.1  Página: /admin/tenants (tabla con filtros, paginación)
□ 4.2  Página: /admin/tenants/create (formulario crear tenant + config)
□ 4.3  Página: /admin/tenants/:id (detalle + editar + toggle estado)
□ 4.4  Página: /admin/tenants/:id/users (gestionar usuarios del tenant)
□ 4.5  Dashboard admin: total tenants, activos, suspendidos, usuarios
□ 4.6  Acción: activar/suspender tenant con confirmación
□ 4.7  Acción: asignar/remover usuarios con selector de rol
```

### Fase 5 — Módulo Cultivo
```
□ 5.1  Página: /predios (listado con mapa GPS opcional)
□ 5.2  Componente: PredioForm (crear/editar)
□ 5.3  Página: /predios/:id (detalle con lotes)
□ 5.4  Página: /lotes (listado filtrable por predio)
□ 5.5  Componente: LoteForm
□ 5.6  Página: /lotes/:id (detalle con sublotes y palmas)
□ 5.7  Componente: SubloteForm
□ 5.8  Componente: PalmaList (tabla con código y estado)
□ 5.9  Página: /semillas (catálogo)
```

### Fase 6 — Módulo Insumos y Labores
```
□ 6.1  Página: /insumos (CRUD)
□ 6.2  Página: /insumos/:id/precios (gestionar rangos precio_abono)
□ 6.3  Página: /labores (CRUD con tipo de pago)
```

### Fase 7 — Módulo Empleados
```
□ 7.1  Página: /empleados (tabla con búsqueda, filtros cargo/estado)
□ 7.2  Componente: EmpleadoForm (formulario multi-step o tabs)
        → Tab 1: Datos personales
        → Tab 2: Seguridad social
        → Tab 3: Datos bancarios
        → Tab 4: Dotación
□ 7.3  Página: /empleados/:id (perfil con historial de nóminas, jornales)
□ 7.4  Página: /cargos (CRUD)
□ 7.5  Página: /modalidades (CRUD)
□ 7.6  Exportar lista de empleados a Excel/PDF
```

### Fase 8 — Módulo Jornales
```
□ 8.1  Página: /jornales (tabla con filtro fecha, empleado, labor)
□ 8.2  Componente: JornalForm (registro rápido)
        → Seleccionar empleado, labor, lote/sublote
        → Auto-calcular valor según tipo de labor
□ 8.3  Registro masivo: seleccionar varios empleados + misma labor
□ 8.4  Vista calendario de jornales por empleado
□ 8.5  ** OFFLINE: registrar jornales sin conexión **
```

### Fase 9 — Módulo Cosecha y Viajes
```
□ 9.1  Página: /viajes (listado)
□ 9.2  Componente: ViajeForm (wizard multi-paso)
        → Paso 1: Datos del viaje (placa, conductor, fecha)
        → Paso 2: Seleccionar sublotes y gajos
        → Paso 3: Peso y tipo (homogéneo/no homogéneo)
        → Paso 4: Asignar cuadrilla por sublote
        → Paso 5: Resumen y confirmar
□ 9.3  Página: /viajes/:id (detalle con cosechas y cuadrilla)
□ 9.4  ** OFFLINE: registrar viajes sin conexión **
```

### Fase 10 — Módulo Nómina
```
□ 10.1 Página: /nominas (listado de períodos)
□ 10.2 Componente: CrearNominaForm (seleccionar quincena, rango fechas)
□ 10.3 Página: /nominas/:id (vista detalle del período)
        → Tabla de empleados con columnas:
          Devengado | Bonificaciones | Deducciones | Neto
□ 10.4 Acción: "Calcular Nómina" (botón que llama al endpoint)
□ 10.5 Expandir fila de empleado: ver detalle de conceptos
□ 10.6 Editar conceptos manuales por empleado
□ 10.7 Acción: "Cerrar Nómina" con confirmación (es irreversible)
□ 10.8 Estado visual: BORRADOR (amarillo), CALCULADA (azul), CERRADA (verde)
□ 10.9 Exportar nómina a Excel/PDF
□ 10.10 Página: /nomina-conceptos (catálogo de conceptos)
□ 10.11 Vista de colilla de pago individual por empleado
```

### Fase 11 — Módulo Vacaciones
```
□ 11.1 Página: /vacaciones (listado con filtro estado)
□ 11.2 Componente: VacacionForm (solicitud)
□ 11.3 Vista de saldo acumulado por empleado
□ 11.4 Acción: aprobar/rechazar vacaciones
□ 11.5 Calendario visual de vacaciones del equipo
```

### Fase 12 — Módulo Liquidación
```
□ 12.1 Página: /liquidaciones (listado)
□ 12.2 Componente: LiquidacionForm (seleccionar empleado, motivo, fecha)
□ 12.3 Acción: "Calcular" → muestra preview con todos los conceptos
□ 12.4 Acción: "Aprobar" → confirma y cierra
□ 12.5 Vista de impresión/PDF de la liquidación
```

### Fase 13 — PWA y Offline
```
□ 13.1 Configurar @vite-pwa/nuxt con service worker
□ 13.2 Store offline: useOfflineStore (Pinia + IndexedDB via localForage)
□ 13.3 Guardar catálogos en IndexedDB al conectar:
        → empleados, lotes, sublotes, labores, insumos
□ 13.4 Formulario jornal offline: guardar en IndexedDB con sync_uuid
□ 13.5 Formulario viaje offline: guardar en IndexedDB con sync_uuid
□ 13.6 Componente: SyncIndicator (muestra pendientes de sincronizar)
□ 13.7 Auto-sync: al detectar conexión → enviar cola → marcar sincronizados
□ 13.8 Manejo de conflictos: si el backend rechaza un registro
□ 13.9 Banner: "Modo offline — N registros pendientes de sincronizar"
```

### Fase 14 — Auditoría y Configuración
```
□ 14.1 Página: /auditorias (tabla con filtros fecha, usuario, módulo)
□ 14.2 Página: /configuracion (ver/editar tenant_config del tenant actual)
□ 14.3 Restringir acceso: solo ADMIN ve configuración y auditoría
```

---

## PARTE 3: INTEGRACIÓN FRONTEND ↔ BACKEND

### Flujo de Autenticación JWT

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuario abre la app                                         │
│     └─→ Middleware Nuxt "auth" verifica si hay token            │
│         └─→ NO: redirige a /login                               │
│         └─→ SÍ: verifica expiración                             │
│             └─→ Expirado: intenta refresh                       │
│             └─→ Válido: continúa                                │
│                                                                 │
│  2. POST /api/v1/auth/login                                     │
│     ← { token, user }                                          │
│     └─→ Guardar token en Pinia + cookie                        │
│     └─→ GET /api/v1/auth/me → obtener tenants del user         │
│                                                                 │
│  3. Si user tiene 1 tenant → auto-seleccionar                  │
│     Si user tiene N tenants → mostrar /select-tenant            │
│     Si user es super_admin → ir a /admin/tenants                │
│                                                                 │
│  4. POST /api/v1/auth/select-tenant { tenant_id }              │
│     ← { token (con tenant_id en claims) }                      │
│     └─→ Guardar nuevo token                                    │
│     └─→ Setear X-Tenant-Id en interceptor                      │
│     └─→ Redirigir a /dashboard                                 │
│                                                                 │
│  5. Todas las requests llevan:                                  │
│     Authorization: Bearer {token}                               │
│     X-Tenant-Id: {currentTenantId}                              │
│                                                                 │
│  6. Si backend responde 401:                                    │
│     └─→ Interceptor intenta POST /api/v1/auth/refresh           │
│         └─→ Éxito: reintentar request original con nuevo token  │
│         └─→ Falla: limpiar store, redirigir a /login            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuración del Interceptor HTTP (Nuxt)

```typescript
// composables/useApi.ts
export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const api = $fetch.create({
    baseURL: config.public.apiBase, // http://agro-campo.test/api

    onRequest({ options }) {
      const headers = options.headers ||= {}

      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      if (authStore.currentTenantId) {
        headers['X-Tenant-Id'] = String(authStore.currentTenantId)
      }
    },

    async onResponseError({ response }) {
      if (response.status === 401) {
        const refreshed = await authStore.refreshToken()
        if (!refreshed) {
          authStore.logout()
          navigateTo('/login')
        }
      }
    },
  })

  return api
}
```

### Contrato de API — Endpoints Principales

```
AUTENTICACIÓN
─────────────────────────────────────────────────
POST   /api/v1/auth/login          { email, password }              → { token, user }
POST   /api/v1/auth/register       { name, email, password, ... }   → { token, user }
POST   /api/v1/auth/logout         (Bearer token)                   → { message }
POST   /api/v1/auth/refresh        (Bearer token)                   → { token }
GET    /api/v1/auth/me             (Bearer token)                   → { user, tenants[] }
POST   /api/v1/auth/select-tenant  { tenant_id }                    → { token, tenant_id, rol }

SUPER ADMIN (X-Tenant-Id NO requerido)
─────────────────────────────────────────────────
GET    /api/admin/tenants                      → { data[], meta{} }
POST   /api/admin/tenants                      → { tenant }
GET    /api/admin/tenants/:id                  → { tenant, config, users[] }
PUT    /api/admin/tenants/:id                  → { tenant }
PATCH  /api/admin/tenants/:id/toggle           → { tenant }
POST   /api/admin/tenants/:id/users            → { message }
DELETE /api/admin/tenants/:id/users/:userId     → { message }

NEGOCIO (X-Tenant-Id REQUERIDO)
─────────────────────────────────────────────────
GET|POST        /api/v1/predios
GET|PUT|DELETE  /api/v1/predios/:id

GET|POST        /api/v1/lotes
GET|PUT|DELETE  /api/v1/lotes/:id

GET|POST        /api/v1/sublotes
GET|POST        /api/v1/semillas
GET|POST        /api/v1/palmas

GET|POST        /api/v1/insumos
GET|POST        /api/v1/labores
GET|POST        /api/v1/precio-abono

GET|POST        /api/v1/modalidades
GET|POST        /api/v1/cargos
GET|POST        /api/v1/empleados
GET|PUT|DELETE  /api/v1/empleados/:id

GET|POST        /api/v1/jornales
GET|PUT|DELETE  /api/v1/jornales/:id

GET|POST        /api/v1/viajes
GET|POST        /api/v1/cosechas

GET|POST        /api/v1/nominas
POST            /api/v1/nominas/:id/calcular
POST            /api/v1/nominas/:id/cerrar
GET|POST        /api/v1/nomina-conceptos

GET|POST        /api/v1/vacaciones
GET             /api/v1/vacaciones-acumulado/:empleadoId

GET|POST        /api/v1/liquidaciones
POST            /api/v1/liquidaciones/:id/calcular
POST            /api/v1/liquidaciones/:id/aprobar

POST            /api/v1/sync/jornales
POST            /api/v1/sync/cosechas
GET             /api/v1/sync/catalogs

GET             /api/v1/config
GET             /api/v1/auditorias
```

### Formato de Respuesta Estándar

```json
// Éxito - Listado
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 73
  }
}

// Éxito - Recurso individual
{
  "data": { "id": 1, "nombre": "...", ... }
}

// Error de validación (422)
{
  "message": "Error de validación",
  "errors": {
    "campo": ["El campo es requerido"]
  }
}

// Error de autenticación (401)
{
  "message": "Token expirado",
  "code": "TOKEN_EXPIRED"
}

// Error de tenant (403)
{
  "message": "No tiene acceso a este tenant",
  "code": "TENANT_ACCESS_DENIED"
}
```

### Control de Acceso por Rol en Frontend

```typescript
// composables/usePermissions.ts
export const usePermissions = () => {
  const authStore = useAuthStore()

  const can = (action: string): boolean => {
    const role = authStore.currentRole

    const permissions: Record<string, string[]> = {
      ADMIN:      ['*'],  // Todo
      SUPERVISOR: ['predios.*', 'lotes.*', 'empleados.read', 'jornales.*', 'cosechas.*'],
      NOMINA:     ['empleados.read', 'nominas.*', 'vacaciones.*', 'liquidaciones.*'],
      VISOR:      ['*.read'],
    }

    const allowed = permissions[role] || []
    return allowed.includes('*') ||
           allowed.includes(action) ||
           allowed.some(p => p.endsWith('.*') && action.startsWith(p.replace('.*', '')))
  }

  return { can }
}

// Uso en componente:
// v-if="can('nominas.create')"
// v-if="can('empleados.delete')"
```

---

## PARTE 4: ORDEN DE EJECUCIÓN RECOMENDADO

### Sprint 1 (Semana 1-2): Fundaciones
```
BACK:  Fases 1 + 2 + 3 (Setup, JWT, Super Admin)
FRONT: Fases 1 + 2 + 3 (Setup, Auth, Layout)
META:  Al final del sprint, login funcional + crear tenants + seleccionar tenant
```

### Sprint 2 (Semana 3-4): Datos Maestros
```
BACK:  Fases 4 + 5 + 6 (Cultivo, Insumos, Empleados)
FRONT: Fases 5 + 6 + 7 (Insumos, Labores, Empleados)
META:  CRUD completo de datos maestros, navegación por módulos
```

### Sprint 3 (Semana 5-6): Operaciones de Campo
```
BACK:  Fases 7 + 8 (Jornales, Cosecha)
FRONT: Fases 8 + 9 (Jornales, Viajes)
META:  Registro de jornales y cosechas funcionando
```

### Sprint 4 (Semana 7-8): Nómina
```
BACK:  Fase 9 (Nómina completa)
FRONT: Fase 10 (Nómina UI)
META:  Cálculo de nómina quincenal/mensual end-to-end
```

### Sprint 5 (Semana 9-10): Vacaciones + Liquidación + Offline
```
BACK:  Fases 10 + 11 + 12 (Vacaciones, Liquidación, Sync)
FRONT: Fases 11 + 12 + 13 (Vacaciones, Liquidación, PWA)
META:  Módulos completos + PWA offline básico
```

### Sprint 6 (Semana 11-12): Polish
```
BACK:  Fases 13 + 14 (Auditoría, Horizon, Jobs)
FRONT: Fase 14 (Auditoría, Config)
META:  Testing E2E, optimización, deployment
```
