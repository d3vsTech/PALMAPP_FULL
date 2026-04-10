# API de Gestion de Usuarios del Tenant

> Documentacion para el equipo de frontend sobre los endpoints de gestion de usuarios dentro de una finca (tenant).

---

## Modelo de acceso

- **ADMIN:** Tiene todos los permisos del sistema. Es creado por el super_admin al configurar la finca.
- **USUARIO:** No tiene permisos por defecto. El ADMIN le asigna permisos directos segun lo necesite.

> **Nota:** Ya no existen los roles "LIDER DE CAMPO" ni "PROPIETARIO". Todo se maneja con permisos directos.

---

## Requisitos de todas las peticiones

Todas las rutas de este modulo requieren:

| Header | Valor | Descripcion |
|--------|-------|-------------|
| `Authorization` | `Bearer {token}` | JWT del usuario autenticado |
| `X-Tenant-Id` | `{tenant_id}` | ID del tenant seleccionado |
| `Content-Type` | `application/json` | Para peticiones con body |
| `Accept` | `application/json` | Para recibir respuestas JSON |

---

## Permisos necesarios por endpoint

| Endpoint | Metodo | Permiso requerido |
|----------|--------|-------------------|
| `/api/v1/tenant/usuarios` | GET | `usuarios.ver` |
| `/api/v1/tenant/usuarios` | POST | `usuarios.crear` |
| `/api/v1/tenant/usuarios/{user}` | PUT | `usuarios.editar` |
| `/api/v1/tenant/usuarios/{user}` | DELETE | `usuarios.eliminar` |
| `/api/v1/tenant/usuarios/{user}/toggle` | PATCH | `usuarios.desactivar` |
| `/api/v1/tenant/usuarios/{user}/permisos` | GET | `usuarios.ver_permisos` |
| `/api/v1/tenant/usuarios/{user}/permisos` | PUT | `usuarios.editar_permisos` |
| `/api/v1/tenant/usuarios/{user}/permisos` | DELETE | `usuarios.editar_permisos` |

> **Nota:** El usuario ADMIN tiene todos los permisos automaticamente.

---

## 1. Listar usuarios del tenant

```
GET /api/v1/tenant/usuarios
```

### Query Parameters (opcionales)

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `search` | string | Filtra por nombre o email del usuario |
| `estado` | boolean | Filtra por estado: `true` (activos) o `false` (inactivos) |

### Ejemplo de peticion

```
GET /api/v1/tenant/usuarios?search=juan&estado=true
```

### Respuesta exitosa (200)

```json
{
  "data": [
    {
      "id": 3,
      "name": "Juan Perez",
      "email": "juan@laesperanza.com",
      "status": true,
      "is_admin": true,
      "estado": true,
      "asignado_at": "2026-03-15T10:30:00.000000Z"
    },
    {
      "id": 5,
      "name": "Carlos Rodriguez",
      "email": "carlos@laesperanza.com",
      "status": true,
      "is_admin": false,
      "estado": true,
      "asignado_at": "2026-03-15T11:00:00.000000Z"
    }
  ],
  "resumen": {
    "total": 8,
    "activos": 7,
    "inactivos": 1
  }
}
```

> **Importante:** El bloque `resumen` siempre refleja los conteos **globales del tenant**. No se ve afectado por los filtros `search` ni `estado`, asi las tarjetas del frontend siguen mostrando los totales reales aunque el usuario este filtrando la tabla.

### Campos de la respuesta

| Campo | Descripcion |
|-------|-------------|
| `data[].id` | ID del usuario (usar para las demas operaciones) |
| `data[].name` | Nombre del usuario |
| `data[].email` | Correo electronico |
| `data[].status` | Estado global del usuario (`true`=activo, `false`=inactivo) |
| `data[].is_admin` | Si el usuario es administrador de la finca |
| `data[].estado` | Estado de la relacion usuario-tenant (`true`=activo) |
| `data[].asignado_at` | Fecha en que fue asignado al tenant |
| `resumen.total` | Total de usuarios asignados al tenant (sin aplicar filtros) |
| `resumen.activos` | Usuarios con acceso a la finca (`estado = true`) |
| `resumen.inactivos` | Usuarios sin acceso a la finca (`estado = false`) |

---

## 2. Crear / Asignar usuario al tenant

```
POST /api/v1/tenant/usuarios
```

> Los usuarios siempre se crean como **USUARIO** (sin permisos). Luego el ADMIN les asigna permisos desde el endpoint de permisos.

### Opcion A: Crear usuario nuevo

```json
{
  "name": "Maria Lopez",
  "email": "maria@correo.com",
  "password": "password123"
}
```

### Opcion B: Asignar usuario existente

```json
{
  "user_id": 10
}
```

### Campos del body

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `user_id` | integer | Si no envias `email` | ID de un usuario existente |
| `email` | string | Si no envias `user_id` | Email del nuevo usuario |
| `name` | string | Obligatorio con `email` | Nombre del nuevo usuario |
| `password` | string | Obligatorio con `email` | Contrasena (min 8 caracteres) |

### Respuesta exitosa (201)

```json
{
  "message": "Usuario asignado a la finca correctamente",
  "data": {
    "id": 10,
    "name": "Maria Lopez",
    "email": "maria@correo.com"
  }
}
```

### Errores posibles

| Codigo | Respuesta | Descripcion |
|--------|-----------|-------------|
| 409 | `USER_ALREADY_ASSIGNED` | El usuario ya esta asignado a esta finca |
| 422 | `MAX_USERS_REACHED` | Se alcanzo el limite de usuarios del plan |
| 422 | Validacion | Campos invalidos o faltantes |

---

## 3. Editar usuario

```
PUT /api/v1/tenant/usuarios/{user_id}
```

### Body (todos los campos son opcionales)

```json
{
  "name": "Juan Perez Actualizado",
  "email": "juan.nuevo@correo.com",
  "password": "nuevaPassword123",
  "estado": true
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `name` | string | Nuevo nombre |
| `email` | string | Nuevo email (debe ser unico) |
| `password` | string (nullable) | Nueva contrasena (min 8 chars). Enviar `null` o no enviar para no cambiarla |
| `estado` | boolean | Estado de la relacion usuario-tenant |

### Respuesta exitosa (200)

```json
{
  "message": "Usuario actualizado correctamente",
  "data": {
    "id": 3,
    "name": "Juan Perez Actualizado",
    "email": "juan.nuevo@correo.com",
    "status": true,
    "is_admin": false,
    "estado": true
  }
}
```

### Errores posibles

| Codigo | Respuesta | Descripcion |
|--------|-----------|-------------|
| 404 | `USER_NOT_IN_TENANT` | El usuario no esta asignado a esta finca |
| 422 | Validacion | Email duplicado, etc. |

---

## 4. Eliminar (remover) usuario del tenant

```
DELETE /api/v1/tenant/usuarios/{user_id}
```

> **Importante:** No elimina al usuario del sistema. Solo lo remueve de esta finca y revoca sus permisos en el tenant.

### Respuesta exitosa (200)

```json
{
  "message": "Usuario 'Juan Perez' removido de la finca"
}
```

### Errores posibles

| Codigo | Respuesta | Descripcion |
|--------|-----------|-------------|
| 403 | `SELF_REMOVE_DENIED` | Un usuario no puede removerse a si mismo |
| 404 | `USER_NOT_IN_TENANT` | El usuario no esta asignado a esta finca |

---

## 5. Activar / Desactivar usuario (toggle)

```
PATCH /api/v1/tenant/usuarios/{user_id}/toggle
```

Cambia el campo `status` del usuario entre `true` y `false`. Tambien actualiza el campo `estado` en la relacion con el tenant.

### Respuesta exitosa (200)

```json
{
  "message": "Usuario 'Carlos Rodriguez' desactivado correctamente",
  "data": {
    "id": 5,
    "name": "Carlos Rodriguez",
    "status": false
  }
}
```

### Errores posibles

| Codigo | Respuesta | Descripcion |
|--------|-----------|-------------|
| 403 | `SELF_TOGGLE_DENIED` | No puede desactivarse a si mismo |
| 404 | `USER_NOT_IN_TENANT` | El usuario no pertenece a esta finca |

---

## 6. Ver permisos de un usuario

```
GET /api/v1/tenant/usuarios/{user_id}/permisos
```

### Respuesta exitosa (200) — Usuario normal

```json
{
  "user_id": 5,
  "user_name": "Carlos Rodriguez",
  "is_admin": false,
  "permisos_directos": [
    "operaciones.ver",
    "operaciones.crear",
    "cosecha.ver",
    "cosecha.crear",
    "nomina.ver"
  ],
  "permisos_efectivos": [
    "operaciones.ver",
    "operaciones.crear",
    "cosecha.ver",
    "cosecha.crear",
    "nomina.ver"
  ],
  "permisos_disponibles": [
    "dashboard.ver",
    "lotes.ver",
    "lotes.crear",
    "..."
  ],
  "dependencias": {
    "colaboradores.ver": ["contratos.ver"],
    "colaboradores.crear": ["contratos.crear"],
    "colaboradores.editar": ["contratos.editar"],
    "colaboradores.eliminar": ["contratos.eliminar"]
  }
}
```

### Respuesta exitosa (200) — Usuario ADMIN

```json
{
  "user_id": 3,
  "user_name": "Juan Perez",
  "is_admin": true,
  "permisos_directos": [],
  "permisos_efectivos": ["dashboard.ver", "lotes.ver", "...todos los permisos..."],
  "permisos_disponibles": ["dashboard.ver", "lotes.ver", "..."],
  "dependencias": {
    "colaboradores.ver": ["contratos.ver"],
    "colaboradores.crear": ["contratos.crear"],
    "colaboradores.editar": ["contratos.editar"],
    "colaboradores.eliminar": ["contratos.eliminar"]
  }
}
```

### Campos de la respuesta

| Campo | Descripcion |
|-------|-------------|
| `is_admin` | Si es ADMIN, tiene todos los permisos (NO editables) |
| `permisos_directos` | Permisos asignados directamente por el admin (editables). Vacio para ADMIN. |
| `permisos_efectivos` | Lo que el usuario realmente puede hacer |
| `permisos_disponibles` | TODOS los permisos del sistema (para renderizar checkboxes) |
| `dependencias` | Mapa de dependencias para auto-seleccion en el UI |

---

## 7. Asignar permisos a un usuario

```
PUT /api/v1/tenant/usuarios/{user_id}/permisos
```

> **Nota:** No se pueden editar permisos de un usuario ADMIN (retorna 403).

### Body

```json
{
  "permisos": ["nomina.ver", "nomina.crear", "lotes.ver"]
}
```

> **Nota:** Los permisos de plantacion (lotes, sublotes, lineas, palmas) son independientes entre si. El backend solo expande dependencias para colaboradores→contratos.

### Respuesta exitosa (200)

```json
{
  "message": "Permisos actualizados correctamente",
  "permisos_directos": ["nomina.ver", "nomina.crear", "lotes.ver"],
  "permisos_efectivos": ["nomina.ver", "nomina.crear", "lotes.ver"]
}
```

### Errores posibles

| Codigo | Respuesta | Descripcion |
|--------|-----------|-------------|
| 403 | `SELF_PERMISSION_DENIED` | No puede modificar sus propios permisos |
| 403 | `ADMIN_PERMISSION_DENIED` | No se pueden editar permisos de un administrador |
| 404 | `USER_NOT_IN_TENANT` | El usuario no pertenece a esta finca |

---

## 8. Revocar todos los permisos

```
DELETE /api/v1/tenant/usuarios/{user_id}/permisos
```

Elimina todos los permisos del usuario. El usuario queda sin acceso.

> **Nota:** No se pueden revocar permisos de un usuario ADMIN (retorna 403).

### Respuesta exitosa (200)

```json
{
  "message": "Todos los permisos del usuario han sido revocados."
}
```

---

## Guia de implementacion en el Frontend

### Tarjetas de resumen sobre el listado

La vista "Gestion de Usuarios" muestra tres tarjetas encima de la tabla:

| Tarjeta | Campo del response |
|---------|--------------------|
| **Total Usuarios** (`registrados`) | `resumen.total` |
| **Usuarios Activos** (`Con acceso`) | `resumen.activos` |
| **Usuarios Inactivos** (`Sin acceso`) | `resumen.inactivos` |

Estos valores vienen en el **mismo response** del endpoint `GET /api/v1/tenant/usuarios`, por lo que **no se requiere una segunda llamada**. Como `resumen` no se ve afectado por los filtros `search` ni `estado`, las tarjetas siempre reflejan los totales globales del tenant aunque la tabla este filtrada. Despues de operaciones que cambian el estado (`POST` para crear, `DELETE` para remover, `PATCH /toggle`), volver a llamar a `index` para refrescar tanto la tabla como las tarjetas.

### Control de visibilidad de botones y secciones

Al hacer login o seleccionar un tenant, el backend devuelve los permisos efectivos del usuario. Guardar estos permisos en el store global (Vuex/Pinia/Redux/Context).

#### Ejemplo con Vue 3 + Composable

```javascript
// composables/usePermission.js
import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const auth = useAuthStore()

  const can = (permiso) => {
    // Super admins pueden todo
    if (auth.user?.is_super_admin) return true
    return auth.permisos?.includes(permiso) ?? false
  }

  const canAny = (...permisos) => {
    return permisos.some(p => can(p))
  }

  return { can, canAny }
}
```

#### Uso en componentes

```vue
<template>
  <!-- Seccion de usuarios: solo visible si tiene usuarios.ver -->
  <nav>
    <router-link v-if="can('usuarios.ver')" to="/usuarios">
      Usuarios
    </router-link>
  </nav>

  <!-- Boton crear: solo si tiene usuarios.crear -->
  <button v-if="can('usuarios.crear')" @click="abrirModalCrear">
    Nuevo Usuario
  </button>

  <!-- Tabla de usuarios -->
  <table>
    <tr v-for="usuario in usuarios" :key="usuario.id">
      <td>{{ usuario.name }}</td>
      <td>{{ usuario.email }}</td>
      <td>{{ usuario.is_admin ? 'Administrador' : 'Usuario' }}</td>
      <td>
        <!-- Boton editar -->
        <button v-if="can('usuarios.editar')" @click="editarUsuario(usuario)">
          Editar
        </button>

        <!-- Boton activar/desactivar -->
        <button v-if="can('usuarios.desactivar')" @click="toggleUsuario(usuario)">
          {{ usuario.status ? 'Desactivar' : 'Activar' }}
        </button>

        <!-- Boton permisos (solo para usuarios NO admin) -->
        <button v-if="can('usuarios.ver_permisos') && !usuario.is_admin" @click="verPermisos(usuario)">
          Permisos
        </button>

        <!-- Boton eliminar -->
        <button v-if="can('usuarios.eliminar')" @click="eliminarUsuario(usuario)">
          Remover
        </button>
      </td>
    </tr>
  </table>
</template>

<script setup>
import { usePermission } from '@/composables/usePermission'
const { can } = usePermission()
</script>
```

### Pantalla de gestion de permisos

Al cargar la pantalla de permisos de un usuario (`GET /usuarios/{id}/permisos`):

1. Si `is_admin` es `true`: mostrar mensaje "Este usuario es administrador y tiene todos los permisos"
2. Si `is_admin` es `false`:
   - Renderizar todos los `permisos_disponibles` como checkboxes agrupados por modulo
   - Marcar como **checked** los permisos en `permisos_directos`
   - Al marcar un permiso padre, usar el mapa de `dependencias` para auto-marcar los hijos
   - Al guardar, enviar `PUT /usuarios/{id}/permisos` con el array de permisos seleccionados

```javascript
// Ejemplo de agrupacion de permisos por modulo
const agruparPorModulo = (permisos) => {
  const modulos = {}
  permisos.forEach(p => {
    const [modulo] = p.split('.')
    if (!modulos[modulo]) modulos[modulo] = []
    modulos[modulo].push(p)
  })
  return modulos
}

// Ejemplo: { dashboard: ['dashboard.ver'], lotes: ['lotes.ver', 'lotes.crear', ...], ... }
```

### Mapa completo de permisos del modulo Usuarios

| Permiso | Donde usarlo en el UI |
|---------|----------------------|
| `usuarios.ver` | Mostrar/ocultar el menu "Usuarios" en la navegacion y acceso a la pagina |
| `usuarios.crear` | Mostrar boton "Nuevo Usuario" |
| `usuarios.editar` | Mostrar boton "Editar" en cada fila de la tabla |
| `usuarios.eliminar` | Mostrar boton "Remover" en cada fila |
| `usuarios.desactivar` | Mostrar boton/switch "Activar/Desactivar" |
| `usuarios.ver_permisos` | Mostrar boton "Permisos" para ver permisos del usuario |
| `usuarios.editar_permisos` | Habilitar edicion de checkboxes de permisos y boton "Guardar" |

---

## Flujo recomendado del modulo

```
1. Usuario accede a /usuarios
   → GET /api/v1/tenant/usuarios
   → Renderizar tabla con filtros

2. Click "Nuevo Usuario"
   → Formulario: nombre, email, password (sin rol)
   → POST /api/v1/tenant/usuarios
   → Recargar tabla

3. Click "Editar" en un usuario
   → Formulario: nombre, email, password (opcional)
   → PUT /api/v1/tenant/usuarios/{id}
   → Recargar tabla

4. Click "Activar/Desactivar"
   → Confirmar accion
   → PATCH /api/v1/tenant/usuarios/{id}/toggle
   → Actualizar estado en la tabla

5. Click "Permisos" (solo usuarios NO admin)
   → GET /api/v1/tenant/usuarios/{id}/permisos
   → Renderizar checkboxes agrupados por modulo
   → Guardar: PUT /api/v1/tenant/usuarios/{id}/permisos
   → Revocar todos: DELETE /api/v1/tenant/usuarios/{id}/permisos

6. Click "Remover"
   → Confirmar accion (dialog)
   → DELETE /api/v1/tenant/usuarios/{id}
   → Recargar tabla
```
