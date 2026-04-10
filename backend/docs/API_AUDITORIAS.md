# Endpoint: Auditorias (Log de actividad)

Endpoints para consultar el registro de actividad del sistema. Solo accesible por usuarios super admin.

---

## 1. Listar Auditorias

| Campo      | Valor                                    |
|------------|------------------------------------------|
| **Metodo** | `GET`                                    |
| **URL**    | `/api/v1/admin/auditorias`               |
| **Auth**   | JWT (Bearer Token) + `is_super_admin`    |

### Headers

```
Authorization: Bearer {token}
Accept: application/json
```

### Query Parameters (todos opcionales)

| Parametro     | Tipo    | Descripcion                                           | Ejemplo                    |
|---------------|---------|-------------------------------------------------------|----------------------------|
| `accion`      | string  | Filtrar por tipo de accion                            | `CREAR`, `EDITAR`, `LOGIN_EXITOSO` |
| `modulo`      | string  | Filtrar por entidad afectada                          | `TENANTS`, `AUTH`          |
| `user_id`     | integer | Filtrar por ID del usuario                            | `1`                        |
| `tenant_id`   | integer | Filtrar por ID del tenant                             | `3`                        |
| `correo`      | string  | Buscar por correo (parcial)                           | `admin@`                   |
| `search`      | string  | Busqueda general en usuario, correo, observaciones y modulo | `finca`              |
| `fecha_desde` | date    | Fecha inicio (formato YYYY-MM-DD)                     | `2026-01-01`               |
| `fecha_hasta` | date    | Fecha fin (formato YYYY-MM-DD)                        | `2026-03-13`               |
| `sort_by`     | string  | Campo de ordenamiento: `created_at`, `accion`, `modulo`, `usuario` | `created_at`   |
| `sort_dir`    | string  | Direccion: `asc` o `desc` (default: `desc`)           | `desc`                     |
| `per_page`    | integer | Registros por pagina (default: 15)                    | `20`                       |
| `page`        | integer | Numero de pagina                                      | `2`                        |

### Ejemplo de Request

```
GET /api/v1/admin/auditorias?accion=CREAR&modulo=TENANTS&fecha_desde=2026-01-01&per_page=10
```

### Respuesta 200 - OK

```json
{
  "current_page": 1,
  "data": [
    {
      "id": 15,
      "accion": "CREAR",
      "fecha": "13/03/2026 14:30:00",
      "usuario": "Admin Principal",
      "correo": "admin@agrocampo.com",
      "entidad_afectada": "TENANTS",
      "detalle": "Se creo la finca 'Finca Nueva'",
      "direccion_ip": "192.168.1.100",
      "datos_anteriores": null,
      "datos_nuevos": { "id": 5, "nombre": "Finca Nueva", "..." : "..." },
      "tenant_id": null
    },
    {
      "id": 14,
      "accion": "LOGIN_EXITOSO",
      "fecha": "13/03/2026 14:25:00",
      "usuario": "Admin Principal",
      "correo": "admin@agrocampo.com",
      "entidad_afectada": "AUTH",
      "detalle": "Login exitoso",
      "direccion_ip": "192.168.1.100",
      "datos_anteriores": null,
      "datos_nuevos": null,
      "tenant_id": null
    }
  ],
  "first_page_url": "http://localhost/api/v1/admin/auditorias?page=1",
  "from": 1,
  "last_page": 3,
  "last_page_url": "http://localhost/api/v1/admin/auditorias?page=3",
  "next_page_url": "http://localhost/api/v1/admin/auditorias?page=2",
  "per_page": 15,
  "prev_page_url": null,
  "to": 15,
  "total": 42
}
```

### Mapeo de campos (tabla vs respuesta)

| Campo en BD        | Campo en respuesta  | Descripcion                          |
|--------------------|---------------------|--------------------------------------|
| `accion`           | `accion`            | Tipo de accion realizada             |
| `created_at`       | `fecha`             | Fecha formateada dd/mm/yyyy HH:mm:ss|
| `user.name`        | `usuario`           | Nombre del usuario (relacion o campo)|
| `user.email`       | `correo`            | Correo del usuario                   |
| `modulo`           | `entidad_afectada`  | Entidad/modulo afectado              |
| `observaciones`    | `detalle`           | Descripcion de la accion             |

### Tipos de accion disponibles

| Accion            | Descripcion                              |
|-------------------|------------------------------------------|
| `CREAR`           | Creacion de un registro                  |
| `EDITAR`          | Edicion de un registro                   |
| `ELIMINAR`        | Eliminacion de un registro               |
| `LOGIN_EXITOSO`   | Inicio de sesion exitoso                 |
| `LOGIN_FALLIDO`   | Intento de login fallido                 |
| `LOGOUT`          | Cierre de sesion                         |

### Modulos/Entidades disponibles

| Modulo     | Descripcion                        |
|------------|------------------------------------|
| `AUTH`     | Autenticacion (login/logout)       |
| `TENANTS`  | Gestion de fincas                  |
| `USERS`    | Gestion de usuarios                |

---

## 2. Detalle de una Auditoria

| Campo      | Valor                                        |
|------------|----------------------------------------------|
| **Metodo** | `GET`                                        |
| **URL**    | `/api/v1/admin/auditorias/{id}`              |
| **Auth**   | JWT (Bearer Token) + `is_super_admin`        |

### Ejemplo de Request

```
GET /api/v1/admin/auditorias/15
```

### Respuesta 200 - OK

```json
{
  "data": {
    "id": 15,
    "accion": "CREAR",
    "fecha": "13/03/2026 14:30:00",
    "usuario": "Admin Principal",
    "correo": "admin@agrocampo.com",
    "entidad_afectada": "TENANTS",
    "detalle": "Se creo la finca 'Finca Nueva'",
    "direccion_ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0 ...",
    "datos_anteriores": null,
    "datos_nuevos": { "id": 5, "nombre": "Finca Nueva" },
    "tenant_id": null,
    "created_at": "2026-03-13T14:30:00.000000Z"
  }
}
```

### Respuesta 404 - No encontrado

```json
{
  "message": "Registro de auditoria no encontrado"
}
```

---

## Respuesta 500 - Error del servidor

Aplica a ambos endpoints:

```json
{
  "message": "Error al listar las auditorias",
  "error": "Descripcion del error"
}
```

---

## Ejemplo con cURL

### Listar con filtros

```bash
curl -X GET \
  "http://localhost/api/v1/admin/auditorias?accion=CREAR&fecha_desde=2026-01-01&per_page=10" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

### Ver detalle

```bash
curl -X GET \
  "http://localhost/api/v1/admin/auditorias/15" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

## Notas

- Los registros se ordenan por fecha descendente (mas recientes primero) por defecto.
- El `withoutGlobalScope('tenant')` permite al super admin ver auditorias de todos los tenants.
- Los campos `usuario` y `correo` priorizan la relacion `user` del modelo; si no existe (ej: login fallido), usa los valores directos de la tabla `auditorias`.
- El campo `datos_anteriores` y `datos_nuevos` contienen el snapshot del registro antes/despues del cambio (solo en acciones CREAR, EDITAR, ELIMINAR).
