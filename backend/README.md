# Backend — PalmApp API

El backend está construido en **Laravel** y expone una API REST con autenticación JWT.

## Base URL

```
http://agro-campo.test/api
```

## Autenticación

Todas las rutas protegidas requieren:
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

Las rutas de tenant también requieren:
```
X-Tenant-Id: {tenant_id}
```

## Documentación de endpoints

Ver la carpeta `docs/` para la especificación detallada de cada módulo:

| Archivo | Módulo |
|---------|--------|
| `API_AUTH_FINCA.md` | Login de fincas, selección de tenant, recuperar contraseña |
| `API_AUTH_DOCS.md` | Registro y autenticación general |
| `API_SUPER_ADMIN.md` | Gestión global: fincas, usuarios, planes |
| `API_PLANTACION.md` | Predios, lotes, sublotes, palmas |
| `API_USUARIOS_TENANT.md` | Usuarios y permisos de la finca |
| `API_PARAMETRICAS.md` | Tablas paramétricas (semillas, insumos, etc.) |
| `API_CONFIGURACION_PERFIL.md` | Perfil y datos de la finca |
| `API_AUDITORIAS.md` | Log de actividad (solo super admin) |
| `API_DIAGNOSTICS.md` | Diagnóstico del servidor (solo super admin) |
| `API_BOT.md` | Integración del bot de correos |
| `API_UPDATE_USER_TENANT.md` | Actualización de usuarios desde super admin |
| `departamentosYmunicpios.md` | Catálogo de departamentos y municipios |

## Usuarios de prueba

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | `devs@d3vs.tech` | `password123` |
| Admin Finca | `juan@laesperanza.com` | `password` |
| Lider de Campo | `carlos@laesperanza.com` | `password` |
| Propietario | `maria@laesperanza.com` | `password` |
