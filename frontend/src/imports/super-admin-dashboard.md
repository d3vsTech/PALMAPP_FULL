Agrega un nivel adicional de administración superior al sistema, llamado SUPER ADMIN. Este rol representa al administrador del SaaS completo, no pertenece a ninguna finca y su función es gestionar los clientes (fincas) que usarán el sistema.

Este rol debe existir por encima de los roles actuales (Dueño, Administrador, Jefe de campo).

NUEVO ROL
Super Administrador

Rol con acceso al control total del sistema multi-cliente.

Este rol:

NO pertenece a ninguna finca

administra todas las fincas/clientes

crea los administradores iniciales de cada finca

controla la activación o suspensión del servicio

NUEVA SECCIÓN EN EL SISTEMA

Debes diseñar un dashboard completamente separado del sistema principal.

Este dashboard será llamado:

AGRO CAMPO – Super Admin

y tendrá su propio login independiente.

NUEVAS PÁGINAS EN FIGMA

Agrega una nueva página en la estructura:

12 — Super Admin

LOGIN SUPER ADMIN

Crea una variante adicional del login:

Login Super Administrador

Características:

mismo estilo visual que el login principal

branding: AGRO CAMPO – Control Central

formulario simple:

Campos:

Email
Contraseña

Botón:

Iniciar sesión como Super Admin

Nota UX:

Debe quedar claro que este login es solo para administración del sistema, no para usuarios de finca.

DASHBOARD SUPER ADMIN

Diseña un dashboard tipo SaaS control panel.

Secciones principales:

KPIs

Total de fincas registradas

Fincas activas

Fincas suspendidas

Fincas próximas a vencimiento

Usuarios totales del sistema

MÓDULO PRINCIPAL — FINCAS (CLIENTES)

Pantalla:

Gestión de Fincas

Tabla principal con columnas:

Nombre finca

Predio principal

Administrador

Plan

Estado

Fecha inicio

Fecha expiración

Usuarios activos

Acciones

Acciones:

Ver
Editar
Suspender
Activar
Eliminar

Estados de finca (chips):

ACTIVA
SUSPENDIDA
EXPIRADA

CREAR NUEVA FINCA

Botón principal:

Crear nueva finca

Abrir modal o página de formulario.

Campos:

Información general

Nombre finca

Predio principal

Ubicación

Descripción

Administrador de la finca

Nombre

Email

Contraseña temporal

Configuración inicial del sistema

Checkboxes:

Usa jornales
Usa control de insumos
Usa ambos

Tipo de pago

semanal

quincenal

mensual

Plan del sistema

Básico

Profesional

Empresarial

Control de acceso

Fecha inicio

Fecha expiración

Botón:

Crear finca

Resultado esperado:

Al crear la finca:

se registra la finca

se crea automáticamente el Administrador de la finca

se habilita el acceso al sistema Agro Campo para ese cliente

EDICIÓN DE FINCA

Pantalla o modal:

Editar:

nombre

plan

estado

configuraciones activas

fecha expiración

CONFIGURACIÓN DE MÓDULOS

Las configuraciones definidas por el Super Admin deben determinar qué módulos aparecen en el dashboard del cliente.

Ejemplo:

Si NO usa jornales, ocultar:

jornales

cuadrillas

labores relacionadas

Si NO usa insumos, ocultar:

inventario

insumos

escalas abonadas

Esto debe reflejarse visualmente en el diseño.

NAVEGACIÓN SUPER ADMIN

Sidebar del Super Admin:

Dashboard
Fincas
Planes
Usuarios globales
Actividad del sistema
Configuración global

PLANES (SaaS)

Diseñar una pantalla simple:

Planes del sistema

Tabla:

Plan
Precio
Usuarios permitidos
Módulos incluidos

Botón:

Editar plan

ACTIVIDAD DEL SISTEMA

Pantalla con logs simples:

finca creada

finca suspendida

administrador creado

cambio de plan

Columnas:

Fecha
Usuario
Acción
Entidad afectada

PROTOTIPO

Agregar navegación:

Login Super Admin
→ Dashboard Super Admin
→ Gestión de Fincas
→ Crear Finca
→ Editar Finca

NOTA IMPORTANTE DE DISEÑO

El Super Admin debe sentirse como un panel SaaS de control central, diferente al sistema operativo agrícola.

Inspiración visual:

Stripe Dashboard

Vercel Dashboard

Supabase Admin

Shopify Admin

Más enfocado a gestión de clientes, no a operación agrícola.