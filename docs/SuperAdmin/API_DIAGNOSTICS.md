# API de Diagnósticos del Sistema

Guía para consumir el endpoint de diagnósticos del servidor.

---

## Información General

| Campo         | Valor                              |
| ------------- | ---------------------------------- |
| **URL**       | `GET /api/v1/admin/diagnostics`    |
| **Método**    | `GET`                              |
| **Auth**      | Bearer Token (JWT)                 |
| **Rol**       | Super Administrador (`is_super_admin = true`) |
| **Parámetros**| Ninguno                            |
| **Body**      | No requiere                        |

> Este endpoint es de solo lectura y no almacena datos en la base de datos. Recopila métricas del sistema en tiempo real.

---

## Autenticación

Se requiere un token JWT válido en el header `Authorization` y que el usuario autenticado sea **super administrador**.

```
Authorization: Bearer {tu_token_jwt}
```

### Respuesta si no estás autenticado (401)

```json
{
  "message": "Unauthenticated."
}
```

### Respuesta si no eres super admin (403)

```json
{
  "message": "Acceso denegado. Se requiere rol de super administrador.",
  "code": "SUPER_ADMIN_REQUIRED"
}
```

---

## Ejemplo de Consumo

### cURL

```bash
curl -X GET "https://tu-dominio.com/api/v1/admin/diagnostics" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGci..." \
  -H "Accept: application/json"
```

### JavaScript (Fetch)

```javascript
const response = await fetch('/api/v1/admin/diagnostics', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json',
  },
});

const { data } = await response.json();
console.log(data.servidor);
console.log(data.php);
console.log(data.base_datos);
```

### Axios

```javascript
const { data } = await axios.get('/api/v1/admin/diagnostics', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Respuesta Exitosa (200)

```json
{
  "data": {
    "servidor": { ... },
    "php": { ... },
    "base_datos": { ... },
    "disco": { ... },
    "cache": { ... },
    "aplicacion": { ... }
  }
}
```

---

## Estructura de Datos por Categoría

### 1. `servidor` — Información del Servidor

| Campo              | Tipo     | Ejemplo                          | Descripción                          |
| ------------------ | -------- | -------------------------------- | ------------------------------------ |
| `hostname`         | `string` | `"server-prod-01"`               | Nombre del host                      |
| `sistema_operativo`| `string` | `"Linux (Linux 5.15.0...)"`      | Familia y versión del SO             |
| `arquitectura`     | `string` | `"x86_64"`                       | Arquitectura del CPU                 |
| `servidor_web`     | `string` | `"Apache/2.4.54"`                | Software del servidor web            |
| `ip_servidor`      | `string` | `"192.168.1.100"`                | Dirección IP del servidor            |
| `tiempo_actividad` | `string` | `"15d 3h 42m"`                   | Tiempo activo (solo Linux, sino `"N/A"`) |

---

### 2. `php` — Configuración de PHP

| Campo                 | Tipo      | Ejemplo      | Descripción                        |
| --------------------- | --------- | ------------ | ---------------------------------- |
| `version`             | `string`  | `"8.2.12"`   | Versión de PHP                     |
| `sapi`                | `string`  | `"fpm-fcgi"` | Tipo de interfaz del servidor      |
| `memoria_limite`      | `string`  | `"256M"`     | Límite de memoria configurado      |
| `memoria_uso_actual`  | `string`  | `"45.23 MB"` | Memoria en uso actualmente         |
| `memoria_pico`        | `string`  | `"52.10 MB"` | Pico máximo de memoria alcanzado   |
| `max_execution_time`  | `string`  | `"300s"`     | Tiempo máximo de ejecución         |
| `upload_max_filesize` | `string`  | `"64M"`      | Tamaño máximo de archivo subido    |
| `post_max_size`       | `string`  | `"128M"`     | Tamaño máximo de datos POST        |
| `extensiones_cargadas`| `integer` | `75`         | Cantidad de extensiones PHP activas|
| `opcache_habilitado`  | `boolean` | `true`       | Si OPcache está habilitado         |

---

### 3. `base_datos` — Base de Datos

#### Campos comunes (todos los drivers)

| Campo      | Tipo     | Ejemplo    | Descripción                         |
| ---------- | -------- | ---------- | ----------------------------------- |
| `driver`   | `string` | `"mysql"`  | Driver: `mysql`, `mariadb`, `pgsql`, `sqlite` |
| `database` | `string` | `"agro_campo"` | Nombre de la base de datos      |
| `conexion` | `string` | `"OK"`     | Estado de conexión (`"OK"` o `"ERROR"`) |
| `error`    | `string` | —          | Mensaje de error (solo si `conexion = "ERROR"`) |

#### Campos adicionales para MySQL / MariaDB

| Campo                | Tipo      | Ejemplo          | Descripción                    |
| -------------------- | --------- | ---------------- | ------------------------------ |
| `version`            | `string`  | `"8.0.35"`       | Versión del servidor DB        |
| `peso_mb`            | `string`  | `"125.50 MB"`    | Tamaño total de la base de datos |
| `tablas`             | `integer` | `42`             | Número total de tablas         |
| `uptime_db`          | `string`  | `"360:15:30"`    | Tiempo activo de la DB (HH:MM:SS) |
| `conexiones_activas` | `integer` | `5`              | Conexiones activas             |
| `queries_totales`    | `string`  | `"1,234,567"`    | Total de queries ejecutadas    |

#### Campos adicionales para PostgreSQL

| Campo                | Tipo      | Ejemplo        | Descripción              |
| -------------------- | --------- | -------------- | ------------------------ |
| `version`            | `string`  | `"15.4"`       | Versión del servidor     |
| `peso`               | `string`  | `"250 MB"`     | Tamaño de la DB          |
| `tablas`             | `integer` | `38`           | Número de tablas         |
| `conexiones_activas` | `integer` | `3`            | Conexiones activas       |

#### Campos adicionales para SQLite

| Campo    | Tipo      | Ejemplo      | Descripción              |
| -------- | --------- | ------------ | ------------------------ |
| `version`| `string`  | `"3.39.0"`  | Versión de SQLite        |
| `peso`   | `string`  | `"15.20 MB"` | Tamaño del archivo DB   |
| `tablas` | `integer` | `20`         | Número de tablas         |

---

### 4. `disco` — Almacenamiento

| Campo            | Tipo     | Ejemplo       | Descripción                        |
| ---------------- | -------- | ------------- | ---------------------------------- |
| `total`          | `string` | `"465.66 GB"` | Espacio total en disco             |
| `usado`          | `string` | `"210.30 GB"` | Espacio utilizado                  |
| `libre`          | `string` | `"255.36 GB"` | Espacio disponible                 |
| `uso_porcentaje` | `string` | `"45.32%"`    | Porcentaje de uso                  |
| `storage_app`    | `string` | `"1.25 GB"`   | Tamaño del directorio `storage/app`|
| `storage_logs`   | `string` | `"50.00 MB"`  | Tamaño del directorio `storage/logs`|

---

### 5. `cache` — Estado del Cache

| Campo    | Tipo     | Ejemplo   | Descripción                           |
| -------- | -------- | --------- | ------------------------------------- |
| `driver` | `string` | `"redis"` | Driver de cache configurado           |
| `estado` | `string` | `"OK"`    | Estado funcional (`"OK"` o `"ERROR"`) |

---

### 6. `aplicacion` — Configuración de Laravel

| Campo          | Tipo      | Ejemplo          | Descripción                  |
| -------------- | --------- | ---------------- | ---------------------------- |
| `nombre`       | `string`  | `"Agro Campo"`   | Nombre de la aplicación      |
| `entorno`      | `string`  | `"production"`   | Entorno actual               |
| `debug`        | `boolean` | `false`          | Si el modo debug está activo |
| `url`          | `string`  | `"https://..."`  | URL de la aplicación         |
| `timezone`     | `string`  | `"America/Bogota"`| Zona horaria configurada    |
| `locale`       | `string`  | `"es"`           | Idioma por defecto           |
| `laravel`      | `string`  | `"11.x"`         | Versión de Laravel           |
| `queue_driver` | `string`  | `"database"`     | Driver de colas              |

---

## Ejemplo de Respuesta Completa

```json
{
  "data": {
    "servidor": {
      "hostname": "server-prod-01",
      "sistema_operativo": "Linux (Linux 5.15.0-91-generic)",
      "arquitectura": "x86_64",
      "servidor_web": "Apache/2.4.54 (Ubuntu)",
      "ip_servidor": "192.168.1.100",
      "tiempo_actividad": "15d 3h 42m"
    },
    "php": {
      "version": "8.2.12",
      "sapi": "fpm-fcgi",
      "memoria_limite": "256M",
      "memoria_uso_actual": "45.23 MB",
      "memoria_pico": "52.10 MB",
      "max_execution_time": "300s",
      "upload_max_filesize": "64M",
      "post_max_size": "128M",
      "extensiones_cargadas": 75,
      "opcache_habilitado": true
    },
    "base_datos": {
      "driver": "mysql",
      "database": "agro_campo",
      "conexion": "OK",
      "version": "8.0.35",
      "peso_mb": "125.50 MB",
      "tablas": 42,
      "uptime_db": "360:15:30",
      "conexiones_activas": 5,
      "queries_totales": "1,234,567"
    },
    "disco": {
      "total": "465.66 GB",
      "usado": "210.30 GB",
      "libre": "255.36 GB",
      "uso_porcentaje": "45.32%",
      "storage_app": "1.25 GB",
      "storage_logs": "50.00 MB"
    },
    "cache": {
      "driver": "redis",
      "estado": "OK"
    },
    "aplicacion": {
      "nombre": "Agro Campo",
      "entorno": "production",
      "debug": false,
      "url": "https://agro-campo.com",
      "timezone": "America/Bogota",
      "locale": "es",
      "laravel": "11.x",
      "queue_driver": "database"
    }
  }
}
```

---

## Notas Importantes

- **Sin paginación ni filtros**: El endpoint no acepta query params. Siempre retorna el reporte completo.
- **Sin modelo de base de datos**: No existe una tabla `diagnostics`. Todo se calcula en tiempo real.
- **Uptime del servidor**: Solo disponible en sistemas Linux (lee `/proc/uptime`). En otros SO retorna `"N/A"`.
- **Campos de DB varían**: Los campos de `base_datos` cambian según el driver configurado (MySQL, PostgreSQL o SQLite).
- **Test de cache**: El endpoint realiza una prueba de escritura/lectura/eliminación en el cache para verificar su funcionamiento.
