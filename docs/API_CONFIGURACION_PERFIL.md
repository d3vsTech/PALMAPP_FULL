# API — Configuración de Finca y Perfil de Usuario

> Documentación para el equipo de frontend.
> Base URL: `/api/v1/tenant`
> Todos los endpoints requieren: `Authorization: Bearer {token}` + `X-Tenant-Id: {tenant_id}`

---

## Resumen de Endpoints

| # | Método | Ruta | Permiso | Descripción |
|---|--------|------|---------|-------------|
| 1 | `PUT` | `/configuracion/finca` | `configuracion.editar` | Editar datos de la finca |
| 2 | `PUT` | `/perfil` | Ninguno (solo JWT) | Editar nombre y correo del usuario |
| 3 | `PUT` | `/perfil/password` | Ninguno (solo JWT) | Cambiar contraseña |

---

## 1. Editar datos de la finca

### `PUT /api/v1/tenant/configuracion/finca`

**Permiso requerido:** `configuracion.editar`

> Este endpoint acepta `multipart/form-data` porque incluye subida de imagen (logo).

#### Headers

```
Authorization: Bearer {token}
X-Tenant-Id: {tenant_id}
Content-Type: multipart/form-data
```

#### Campos editables

| Campo | Tipo | Validación | Obligatorio |
|-------|------|-----------|-------------|
| `nombre` | string | max: 100 | No (enviar solo lo que cambie) |
| `tipo_persona` | string | `NATURAL` o `JURIDICA` | No |
| `nit` | string | max: 20, único entre tenants | No |
| `razon_social` | string | max: 200 | No |
| `correo_contacto` | string | email, max: 100 | No |
| `telefono` | string | max: 20 | No |
| `direccion` | string | max: 200, nullable | No |
| `departamento` | string | max: 100 | No |
| `municipio` | string | max: 100 | No |
| `logo` | file | imagen (jpeg, jpg, png, webp), max: 2MB | No |

> **Nota:** Todos los campos son opcionales. Solo enviar los que se deseen modificar.
> El campo para la imagen es `logo` (no `logo_url`). Se envía como archivo.

#### Ejemplo con FormData (JavaScript)

```javascript
const formData = new FormData();
formData.append('nombre', 'Finca El Palmar');
formData.append('telefono', '3001234567');
formData.append('correo_contacto', 'contacto@fincaelpalmar.com');

// Solo si el usuario seleccionó un nuevo logo
if (logoFile) {
  formData.append('logo', logoFile); // logoFile = input.files[0]
}

const response = await axios.put('/api/v1/tenant/configuracion/finca', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'multipart/form-data',
  },
});
```

> **Importante para axios:** Cuando se usa `PUT` con `FormData`, algunos backends no lo procesan correctamente.
> Si el backend no recibe los datos, usar el truco de `POST` + `_method`:
> ```javascript
> formData.append('_method', 'PUT');
> await axios.post('/api/v1/tenant/configuracion/finca', formData, { ... });
> ```

#### Respuesta exitosa (200)

```json
{
  "message": "Datos de la finca actualizados correctamente",
  "data": {
    "id": 1,
    "nombre": "Finca El Palmar",
    "tipo_persona": "JURIDICA",
    "nit": "900123456-1",
    "razon_social": "Finca El Palmar S.A.S",
    "correo_contacto": "contacto@fincaelpalmar.com",
    "telefono": "3001234567",
    "direccion": "Km 5 vía Villavicencio",
    "departamento": "META",
    "municipio": "VILLAVICENCIO",
    "logo_url": "http://localhost/storage/tenants/1/logo/abc123.png"
  }
}
```

#### Errores posibles

| Código | Code | Descripción |
|--------|------|-------------|
| 403 | — | Sin permiso `configuracion.editar` |
| 422 | `NIT_DUPLICATED` | Ya existe otra finca con ese NIT |
| 422 | `NO_DATA` | No se enviaron datos para actualizar |
| 422 | — | Errores de validación (campos inválidos) |

---

## 2. Editar perfil de usuario

### `PUT /api/v1/tenant/perfil`

**Permiso requerido:** Ninguno — solo necesita estar autenticado con JWT válido.

#### Headers

```
Authorization: Bearer {token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
```

#### Body (JSON)

| Campo | Tipo | Validación | Obligatorio |
|-------|------|-----------|-------------|
| `name` | string | max: 255 | No (enviar solo lo que cambie) |
| `email` | string | email, max: 255, único | No |

#### Ejemplo

```javascript
const response = await axios.put('/api/v1/tenant/perfil', {
  name: 'Juan Pérez',
  email: 'juan.perez@correo.com',
}, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  },
});
```

#### Respuesta exitosa (200)

```json
{
  "message": "Perfil actualizado correctamente",
  "data": {
    "id": 5,
    "name": "Juan Pérez",
    "email": "juan.perez@correo.com"
  }
}
```

#### Errores posibles

| Código | Code | Descripción |
|--------|------|-------------|
| 422 | `NO_DATA` | No se enviaron datos para actualizar |
| 422 | — | Email ya existe en otro usuario |

---

## 3. Cambiar contraseña

### `PUT /api/v1/tenant/perfil/password`

**Permiso requerido:** Ninguno — solo necesita estar autenticado con JWT válido.

#### Headers

```
Authorization: Bearer {token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
```

#### Body (JSON)

| Campo | Tipo | Validación | Obligatorio |
|-------|------|-----------|-------------|
| `current_password` | string | Contraseña actual | **Sí** |
| `password` | string | min: 8 | **Sí** |
| `password_confirmation` | string | Debe coincidir con `password` | **Sí** |

> **Nota:** Laravel usa `password_confirmation` (no `confirm_password`) cuando se aplica la regla `confirmed`.

#### Ejemplo

```javascript
const response = await axios.put('/api/v1/tenant/perfil/password', {
  current_password: 'contraseña_actual',
  password: 'nueva_contraseña_segura',
  password_confirmation: 'nueva_contraseña_segura',
}, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  },
});
```

#### Respuesta exitosa (200)

```json
{
  "message": "Contraseña actualizada correctamente"
}
```

#### Errores posibles

| Código | Code | Descripción |
|--------|------|-------------|
| 422 | `INVALID_CURRENT_PASSWORD` | La contraseña actual es incorrecta |
| 422 | `SAME_PASSWORD` | La nueva contraseña es igual a la actual |
| 422 | — | Validación: min 8 caracteres, confirmación no coincide |

---

## Guía de implementación para el frontend

### Visibilidad de botones por permiso

| Sección | Permiso necesario | Componente sugerido |
|---------|------------------|---------------------|
| Editar datos de la finca | `configuracion.editar` | Página de configuración, formulario con los campos editables |
| Editar perfil | Ninguno | Página "Mi perfil", siempre visible para usuarios autenticados |
| Cambiar contraseña | Ninguno | Página "Mi perfil" o sección aparte, siempre visible |

### Composable para verificar permisos (Vue 3)

```javascript
// composables/usePermisos.js
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

export function usePermisos() {
  const auth = useAuthStore();

  const tienePermiso = (permiso) => {
    return computed(() => auth.permisos?.includes(permiso));
  };

  return { tienePermiso };
}
```

### Uso en componente

```vue
<template>
  <!-- Botón de configuración de finca: solo si tiene permiso -->
  <button v-if="puedeEditarConfig" @click="abrirConfigFinca">
    Editar datos de la finca
  </button>

  <!-- Perfil y contraseña: siempre visibles -->
  <button @click="abrirPerfil">Mi perfil</button>
  <button @click="abrirCambioPassword">Cambiar contraseña</button>
</template>

<script setup>
import { usePermisos } from '@/composables/usePermisos';

const { tienePermiso } = usePermisos();
const puedeEditarConfig = tienePermiso('configuracion.editar');
</script>
```

### Flujo recomendado para subida de logo

1. Usar `<input type="file" accept="image/jpeg,image/png,image/webp">` para seleccionar la imagen.
2. Mostrar preview antes de enviar: `URL.createObjectURL(file)`.
3. Validar en frontend que el archivo no supere 2MB.
4. Enviar con `FormData` y `Content-Type: multipart/form-data`.
5. Tras respuesta exitosa, actualizar el `logo_url` en el store del tenant.

```javascript
// Ejemplo de preview y validación
const handleLogoChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño (2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('El logo no puede exceder 2MB');
    return;
  }

  // Validar tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    alert('Solo se permiten imágenes jpeg, png o webp');
    return;
  }

  // Preview
  logoPreview.value = URL.createObjectURL(file);
  logoFile.value = file;
};
```

### Flujo recomendado para cambio de contraseña

1. Mostrar formulario con 3 campos: contraseña actual, nueva, confirmación.
2. Validar en frontend que `password` y `password_confirmation` coincidan antes de enviar.
3. Validar longitud mínima (8 caracteres).
4. Si el backend responde con `INVALID_CURRENT_PASSWORD`, mostrar error en el campo de contraseña actual.
5. Si el backend responde con `SAME_PASSWORD`, mostrar mensaje de que la nueva debe ser diferente.
6. Tras éxito, limpiar el formulario y mostrar mensaje de confirmación.

---

## Auditoría

Todas las acciones quedan registradas en la tabla `auditorias`:

| Acción | Módulo | Observaciones |
|--------|--------|---------------|
| `EDITAR` | `CONFIGURACION` | Se editaron los datos de la finca 'Nombre' |
| `EDITAR` | `PERFIL` | El usuario 'Nombre' actualizó su perfil |
| `CAMBIO_PASSWORD` | `PERFIL` | El usuario 'Nombre' cambió su contraseña |
