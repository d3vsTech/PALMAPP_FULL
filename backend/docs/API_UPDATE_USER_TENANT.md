# Endpoint: Actualizar Usuario de un Tenant

## Informacion General

| Campo      | Valor                                              |
|------------|----------------------------------------------------|
| **Metodo** | `PUT`                                              |
| **URL**    | `/api/v1/admin/tenants/{tenant}/users/{user}`      |
| **Auth**   | JWT (Bearer Token) + `is_super_admin = true`       |

## Parametros de URL

| Parametro  | Tipo    | Descripcion                        |
|------------|---------|------------------------------------|
| `tenant`   | integer | ID del tenant (finca)              |
| `user`     | integer | ID del usuario a actualizar        |

## Headers

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

## Body (JSON)

Todos los campos son opcionales (solo enviar los que se desean actualizar):

| Campo    | Tipo    | Reglas                                         | Descripcion                              |
|----------|---------|------------------------------------------------|------------------------------------------|
| `name`   | string  | max: 255 caracteres                            | Nombre del usuario                       |
| `email`  | string  | email valido, unico en tabla users             | Correo electronico del usuario           |
| `rol`    | string  | `ADMIN`, `LIDER DE CAMPO`, `PROPIETARIO`       | Rol del usuario dentro del tenant        |
| `estado` | boolean | `true` o `false`                               | Estado del usuario en el tenant          |

## Ejemplos de Request

### Actualizar solo nombre y correo

```json
{
  "name": "Juan Carlos Perez",
  "email": "juancarlos@correo.com"
}
```

### Actualizar solo el rol

```json
{
  "rol": "ADMIN"
}
```

### Actualizar estado (desactivar usuario en el tenant)

```json
{
  "estado": false
}
```

### Actualizar todos los campos

```json
{
  "name": "Maria Lopez",
  "email": "maria.lopez@correo.com",
  "rol": "PROPIETARIO",
  "estado": true
}
```

## Respuestas

### 200 - OK

```json
{
  "message": "Usuario actualizado en la finca",
  "data": {
    "user_id": 5,
    "name": "Maria Lopez",
    "email": "maria.lopez@correo.com",
    "rol": "PROPIETARIO",
    "estado": true
  }
}
```

### 404 - Usuario no asignado al tenant

```json
{
  "message": "El usuario no esta asignado a esta finca"
}
```

### 422 - Error de validacion

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["Ya existe un usuario con este correo electronico"],
    "rol": ["El rol debe ser ADMIN, LIDER DE CAMPO o PROPIETARIO"]
  }
}
```

### 500 - Error del servidor

```json
{
  "message": "Error al actualizar el usuario en la finca",
  "error": "Descripcion del error"
}
```

## Ejemplo con cURL

```bash
curl -X PUT \
  http://localhost/api/v1/admin/tenants/1/users/5 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Juan Perez",
    "email": "juan.perez@correo.com",
    "rol": "ADMIN",
    "estado": true
  }'
```

## Notas

- Si se actualiza el `rol`, los permisos del usuario se sincronizan automaticamente con Spatie Permission para el tenant correspondiente.
- El `email` debe ser unico en toda la tabla `users` (excluyendo el usuario actual).
- Si el usuario no esta asignado al tenant indicado, se retorna un error 404.
- Solo usuarios con `is_super_admin = true` pueden acceder a este endpoint.
