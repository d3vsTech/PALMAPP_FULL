# API — Carga masiva de productos del proveedor

Documentación de los 3 endpoints que el frontend debe consumir para implementar la funcionalidad de carga masiva de productos mediante un ZIP (Excel + imágenes).

---

## Tabla de contenidos

1. [Autenticación y prefijo](#autenticación-y-prefijo)
2. [Flujo recomendado](#flujo-recomendado-en-el-frontend)
3. [Endpoint 1 — Descargar plantilla](#endpoint-1--descargar-plantilla)
4. [Endpoint 2 — Subir ZIP e iniciar importación](#endpoint-2--subir-zip-e-iniciar-importación)
5. [Endpoint 3 — Consultar estado de la importación](#endpoint-3--consultar-estado-de-la-importación)
6. [Estados de la importación](#estados-de-la-importación)
7. [Mensajes de error por fila](#mensajes-de-error-por-fila)
8. [Estrategia de polling](#estrategia-de-polling)
9. [Ejemplo end-to-end (JavaScript)](#ejemplo-end-to-end-javascript)
10. [Validaciones y límites](#validaciones-y-límites)

---

## Autenticación y prefijo

Todos los endpoints están bajo el grupo `auth:api + SetProveedor`. El frontend debe:

- Enviar el **JWT** del usuario en `Authorization: Bearer {token}`.
- El JWT debe tener un proveedor seleccionado previamente (ver `/api/v1/proveedor-auth/select-proveedor`). Si no, los endpoints responden `422` con `code: PROVEEDOR_NOT_SELECTED`.

**Prefijo común:** `/api/v1/market/proveedor`

---

## Flujo recomendado en el frontend

```
┌────────────────────────────────────────────────────────────────────┐
│  1. Usuario hace clic en "Descargar plantilla"                     │
│     → GET /productos/importar/plantilla                            │
│     → El navegador descarga plantilla_productos.xlsx               │
├────────────────────────────────────────────────────────────────────┤
│  2. Usuario llena el Excel, prepara la carpeta imagenes/           │
│     y empaqueta todo en un único catalogo.zip (offline)            │
├────────────────────────────────────────────────────────────────────┤
│  3. Usuario sube el ZIP                                            │
│     → POST /productos/importar  (multipart, campo "archivo")       │
│     → Recibe 202 con importacion_id                                │
│     → Mostrar progreso indeterminado / mensaje "Procesando..."     │
├────────────────────────────────────────────────────────────────────┤
│  4. Polling cada 2-3 segundos                                      │
│     → GET /productos/importaciones/{importacion_id}                │
│     → Detener cuando estado ∈ {COMPLETADO, CON_ERRORES, FALLIDO}   │
├────────────────────────────────────────────────────────────────────┤
│  5. Mostrar resultado final                                        │
│     → COMPLETADO  → "Se cargaron N productos correctamente"        │
│     → CON_ERRORES → tabla con filas fallidas + mensajes            │
│     → FALLIDO     → error_fatal (banner rojo)                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint 1 — Descargar plantilla

Genera y devuelve un Excel vacío con las 13 cabeceras correctas y una fila de ejemplo. **Úsalo siempre** antes de que el usuario arme su archivo manualmente — evita errores de tipeo en columnas.

### Request

```
GET /api/v1/market/proveedor/productos/importar/plantilla
Headers:
  Authorization: Bearer {jwt}
```

### Response — 200 OK

Stream binario con el Excel. Headers de respuesta:

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="plantilla_productos.xlsx"
Cache-Control: no-store, no-cache, must-revalidate
```

### Implementación frontend (JavaScript)

```javascript
async function descargarPlantilla(token) {
  const res = await fetch('/api/v1/market/proveedor/productos/importar/plantilla', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) throw new Error('No se pudo descargar la plantilla');

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'plantilla_productos.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Endpoint 2 — Subir ZIP e iniciar importación

Recibe el ZIP, lo guarda en disco privado y **despacha un job en background**. No procesa nada en esta petición — responde inmediatamente con el `importacion_id` para que el frontend consulte el estado después.

### Request

```
POST /api/v1/market/proveedor/productos/importar
Headers:
  Authorization: Bearer {jwt}
  Content-Type: multipart/form-data
Body (multipart/form-data):
  archivo: <File>   (el ZIP, máx. 50 MB)
```

### Response — 202 Accepted (caso exitoso)

```json
{
  "message": "Importación iniciada. Consulte el estado con el ID devuelto.",
  "data": {
    "importacion_id": 123,
    "estado": "PENDIENTE"
  }
}
```

### Response — 422 Unprocessable Entity (validación falla)

```json
{
  "message": "El archivo debe ser un ZIP (.zip).",
  "errors": {
    "archivo": ["El archivo debe ser un ZIP (.zip)."]
  }
}
```

Mensajes posibles del validator:
- `Debe adjuntar un archivo ZIP con productos.xlsx y la carpeta imagenes/.`
- `El campo archivo debe ser un archivo válido.`
- `El archivo debe ser un ZIP (.zip).`
- `El archivo no puede superar los 50 MB.`

### Response — 401 Unauthorized

JWT inválido o expirado.

### Response — 422 con `PROVEEDOR_NOT_SELECTED`

```json
{
  "message": "Token sin proveedor seleccionado. Llame a /proveedor-auth/select-proveedor primero.",
  "code": "PROVEEDOR_NOT_SELECTED"
}
```

### Response — 500 Internal Server Error

```json
{
  "message": "No se pudo iniciar la importación.",
  "code": "IMPORTACION_INIT_ERROR"
}
```

### Implementación frontend (JavaScript)

```javascript
async function iniciarImportacion(token, fileZip) {
  const formData = new FormData();
  formData.append('archivo', fileZip);

  const res = await fetch('/api/v1/market/proveedor/productos/importar', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  const json = await res.json();

  if (res.status === 422) {
    throw new Error(json.errors?.archivo?.[0] ?? json.message);
  }
  if (!res.ok) {
    throw new Error(json.message ?? 'Error desconocido');
  }

  return json.data.importacion_id;
}
```

---

## Endpoint 3 — Consultar estado de la importación

Devuelve el progreso y resultados de una importación previa. El frontend debe hacer **polling** a este endpoint hasta que el estado sea terminal.

### Request

```
GET /api/v1/market/proveedor/productos/importaciones/{importacion_id}
Headers:
  Authorization: Bearer {jwt}
```

### Response — 200 OK

```json
{
  "data": {
    "id": 123,
    "estado": "CON_ERRORES",
    "nombre_archivo_original": "catalogo.zip",
    "total_filas": 100,
    "filas_exitosas": 98,
    "filas_fallidas": 2,
    "error_fatal": null,
    "resultados": [
      {
        "fila": 2,
        "estado": "exitoso",
        "sku": "TOM-CHE-001",
        "mensaje": "Producto 'Tomate cherry orgánico 500g' creado correctamente."
      },
      {
        "fila": 47,
        "estado": "fallido",
        "sku": "TOMATE-001",
        "mensaje": "El SKU 'TOMATE-001' ya existe en el catálogo."
      },
      {
        "fila": 89,
        "estado": "fallido",
        "sku": null,
        "mensaje": "La imagen 'foto.bmp' tiene un formato inválido. Permitidos: jpg, jpeg, png, webp."
      }
    ],
    "iniciado_at": "2026-05-22T16:32:01.000000Z",
    "finalizado_at": "2026-05-22T16:33:14.000000Z",
    "created_at": "2026-05-22T16:32:00.000000Z"
  }
}
```

### Response — 404 Not Found

Cuando el `importacion_id` no existe **o** pertenece a otro proveedor (ownership check transparente — no se filtra información):

```json
{
  "message": "Importación no encontrada.",
  "code": "IMPORTACION_NOT_FOUND"
}
```

### Campos importantes para la UI

| Campo | Tipo | Uso en la UI |
|-------|------|--------------|
| `estado` | string | Pintar badge de color + decidir si seguir el polling |
| `total_filas` | int | Denominador del progreso |
| `filas_exitosas` | int | Numerador del progreso "verdes" |
| `filas_fallidas` | int | Numerador del progreso "rojas" |
| `error_fatal` | string\|null | Si no es null → mostrar banner rojo, no hay `resultados` |
| `resultados` | array | Tabla detallada (sólo cuando `estado` es terminal) |
| `iniciado_at` | datetime | "Procesando desde X" |
| `finalizado_at` | datetime | Calcular duración total |

### Implementación frontend (JavaScript)

```javascript
async function consultarEstado(token, importacionId) {
  const res = await fetch(
    `/api/v1/market/proveedor/productos/importaciones/${importacionId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message ?? 'No se pudo consultar el estado');
  }

  const json = await res.json();
  return json.data;
}
```

---

## Estados de la importación

| Estado | Significado | ¿Seguir polling? | Color sugerido |
|--------|-------------|------------------|----------------|
| `PENDIENTE` | El job está encolado, todavía no empezó | Sí | gris |
| `PROCESANDO` | El job está ejecutándose activamente | Sí | azul (animado) |
| `COMPLETADO` | Todas las filas se importaron correctamente | **No** | verde |
| `CON_ERRORES` | Algunas filas fallaron, otras se crearon | **No** | naranja |
| `FALLIDO` | Error fatal — ninguna fila se creó (revisar `error_fatal`) | **No** | rojo |

### Lógica de decisión

```javascript
const ESTADOS_TERMINALES = ['COMPLETADO', 'CON_ERRORES', 'FALLIDO'];

function esTerminal(estado) {
  return ESTADOS_TERMINALES.includes(estado);
}
```

---

## Mensajes de error por fila

Los mensajes son **legibles para el usuario final** — se pueden mostrar directamente en la tabla de resultados sin transformación.

### Errores típicos

| Causa | Mensaje |
|-------|---------|
| SKU duplicado | `El SKU 'TOMATE-001' ya existe en el catálogo.` |
| Imagen no encontrada en ZIP | `La imagen 'tomate1.jpg' no se encuentra en la carpeta imagenes/ del ZIP.` |
| Formato de imagen inválido | `La imagen 'foto.bmp' tiene un formato inválido. Permitidos: jpg, jpeg, png, webp.` |
| Imagen demasiado pesada | `La imagen 'producto.jpg' excede los 3 MB.` |
| Categoría inexistente | `validation.exists` o se concatenan varios errores con ` \| ` |
| Múltiples errores en la misma fila | `El nombre es obligatorio. | El precio unitario es obligatorio.` (separados por ` \| `) |

### Errores fatales (campo `error_fatal`)

Cuando la importación entera falla. `resultados` puede venir vacío.

| Causa | Mensaje |
|-------|---------|
| ZIP corrupto | `No se pudo abrir el archivo ZIP (código: 19).` |
| Falta `productos.xlsx` | `El ZIP no contiene el archivo "productos.xlsx" en la raíz.` |
| Falta carpeta `imagenes/` | `El ZIP no contiene la carpeta "imagenes/" en la raíz.` |
| Excede 500 filas | `El archivo excede el límite de 500 filas permitidas por importación.` |
| Excepción genérica | `Error fatal al procesar el archivo: {mensaje}` |
| Extensión `zip` no habilitada | `La extensión PHP "zip" no está habilitada en el servidor.` |

---

## Estrategia de polling

### Recomendación

- **Intervalo:** 2.5 segundos.
- **Timeout total:** 10 minutos (alineado con el `$timeout = 600` del job).
- **Backoff opcional:** si la importación tiene > 200 filas, aumentar a 4-5 segundos después de 30 s.
- **Detener inmediatamente** cuando el estado sea terminal.

### Helper de polling reutilizable

```javascript
async function esperarFinalizacion(token, importacionId, opts = {}) {
  const intervalo = opts.intervalo ?? 2500;
  const timeout   = opts.timeout   ?? 600_000;
  const onUpdate  = opts.onUpdate  ?? (() => {});

  const inicio = Date.now();
  const TERMINALES = ['COMPLETADO', 'CON_ERRORES', 'FALLIDO'];

  while (true) {
    if (Date.now() - inicio > timeout) {
      throw new Error('Tiempo de espera agotado. La importación sigue en proceso.');
    }

    const data = await consultarEstado(token, importacionId);
    onUpdate(data); // callback para actualizar UI

    if (TERMINALES.includes(data.estado)) {
      return data;
    }

    await new Promise(r => setTimeout(r, intervalo));
  }
}
```

---

## Ejemplo end-to-end (JavaScript)

```javascript
async function ejecutarCargaMasiva(token, fileZip) {
  // 1. Subir ZIP
  let importacionId;
  try {
    importacionId = await iniciarImportacion(token, fileZip);
  } catch (e) {
    mostrarError(`No se pudo iniciar: ${e.message}`);
    return;
  }

  mostrarInfo(`Importación #${importacionId} iniciada. Procesando...`);

  // 2. Esperar finalización con polling
  let resultado;
  try {
    resultado = await esperarFinalizacion(token, importacionId, {
      intervalo: 2500,
      onUpdate: (data) => {
        actualizarProgresoUI({
          estado:    data.estado,
          exitosas:  data.filas_exitosas,
          fallidas:  data.filas_fallidas,
          total:     data.total_filas,
        });
      }
    });
  } catch (e) {
    mostrarError(e.message);
    return;
  }

  // 3. Render del resultado final
  if (resultado.estado === 'COMPLETADO') {
    mostrarExito(`Se cargaron ${resultado.filas_exitosas} productos correctamente.`);
  } else if (resultado.estado === 'CON_ERRORES') {
    mostrarAdvertencia(
      `${resultado.filas_exitosas} productos creados, ${resultado.filas_fallidas} con errores.`
    );
    renderizarTablaResultados(resultado.resultados);
  } else if (resultado.estado === 'FALLIDO') {
    mostrarError(`Importación fallida: ${resultado.error_fatal}`);
  }
}
```

---

## Validaciones y límites

| Recurso | Límite |
|---------|--------|
| Tamaño del ZIP | 50 MB |
| Filas de datos en el Excel | 500 |
| Tamaño máximo por imagen | 3 MB |
| Formatos de imagen permitidos | jpg, jpeg, png, webp |
| Chunk de procesamiento | 50 filas por batch |
| Timeout del job | 600 segundos (10 min) |
| Reintentos del job | 1 (sin reintentos automáticos) |

### Validación previa en el frontend (recomendado)

Antes de subir, validar en el cliente para dar feedback inmediato:

```javascript
function validarZipLocal(file) {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'El archivo debe tener extensión .zip';
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'El archivo no puede superar los 50 MB';
  }
  if (file.type && !file.type.includes('zip')) {
    return 'El archivo debe ser un ZIP válido';
  }
  return null; // OK
}
```

---

## Notas adicionales

- **Idempotencia:** subir el mismo ZIP dos veces crea **dos importaciones distintas**. Los SKUs duplicados de la segunda subida fallarán en el reporte, pero el primer batch se preserva.
- **Visibilidad histórica:** el backend conserva todas las importaciones del proveedor en `importaciones_productos`. En un futuro se podría exponer un endpoint `GET /productos/importaciones` para listar el historial (no implementado en esta versión).
- **El ZIP original se conserva** en `storage/app/private/market/importaciones/{proveedorId}/` por si se necesita auditar o reprocesar. El frontend no necesita descargarlo.
- **Las imágenes resultantes** quedan en `storage/app/public/market/productos/{proveedorId}/` con nombres UUID; las URLs devueltas en `producto.imagen_principal` ya son las URLs públicas finales.
- **Ownership:** un proveedor solo puede consultar el estado de sus propias importaciones. Intentar consultar una importación de otro proveedor devuelve `404` (no `403`, para no filtrar existencia).
