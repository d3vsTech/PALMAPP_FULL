# Database — PalmApp

Esta carpeta contiene scripts de base de datos, migraciones y seeders.

## Tecnología
- **Motor:** MySQL / PostgreSQL
- **ORM:** Laravel Eloquent (Migraciones en el backend)

## Estructura multi-tenant
El sistema usa arquitectura **multi-tenant con base de datos compartida**:
- Tabla `tenants` → cada finca es un tenant
- Tabla `tenant_users` → relación usuario ↔ finca con rol
- Todas las tablas de negocio incluyen `tenant_id`

## Conexión
Ver variables de entorno del backend (.env del proyecto Laravel).
