# PalmApp 🌴

Sistema de gestión para fincas palmeras. Monorepo con estructura modular.

## Estructura

```
palmapp/
├── frontend/        → Aplicación React + Vite + Tailwind
├── backend/         → Documentación de la API (Laravel)
│   └── docs/        → Especificaciones de endpoints por módulo
├── database/        → Scripts y migraciones de base de datos
├── docs/            → Documentación general del proyecto
├── .gitignore
└── README.md
```

## Inicio rápido

```bash
# 1. Instalar dependencias del frontend
cd frontend
pnpm install        # o npm install / yarn

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL de tu API

# 3. Ejecutar en desarrollo
pnpm dev
```

## Frontend

- **Framework:** React 18 + TypeScript
- **Build:** Vite 6
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Routing:** React Router v7
- **API:** Capa de servicios en `src/api/`

## Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| Auth | Login de finca y super admin, selección de tenant |
| Plantación | Predios, lotes, sublotes, palmas |
| Colaboradores | Empleados, contratos |
| Nómina | Liquidaciones, préstamos, permisos, ausencias |
| Operaciones | Planillas diarias de campo |
| Viajes | Remisiones y transporte de cosecha |
| Configuración | Paramétricas, perfil, datos de finca |
| Super Admin | Gestión global de fincas y usuarios |
| Agente IA | Asistente inteligente integrado |

## Permisos

El sistema usa permisos granulares por módulo. Ejemplo:

```typescript
const { hasPermiso, hasModulo } = useAuth();

if (hasPermiso('colaboradores.crear')) { /* mostrar botón */ }
if (hasModulo('jornales')) { /* mostrar sección */ }
```

## Variables de entorno

Ver `frontend/.env.example` para la configuración requerida.
