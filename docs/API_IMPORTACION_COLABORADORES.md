# API de Importación Masiva de Colaboradores

> Base URL: `/api/v1/tenant`
> Requiere: `Authorization: Bearer {token}` + `X-Tenant-Id: {id}`

---

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/colaboradores/importar` | `colaboradores.crear` | Sube un archivo Excel e inicia la importación asíncrona |
| GET | `/colaboradores/importaciones/{id}` | `colaboradores.ver` | Consulta el estado y resultados de una importación |

---

## 1. Iniciar Importación

```
POST /api/v1/tenant/colaboradores/importar
Content-Type: multipart/form-data
```

### Body (form-data)

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `archivo` | file | Sí | Solo `.xlsx` o `.xls`. Máx. **5 MB**. |

### Respuesta 202 — Importación iniciada

```json
{
  "message": "Importación iniciada. Consulte el estado con el ID devuelto.",
  "data": {
    "importacion_id": 7,
    "estado": "PENDIENTE"
  }
}
```

Guarda el `importacion_id` para consultar el progreso con el segundo endpoint.

### Respuesta 422 — Archivo inválido

```json
{
  "message": "The archivo field must be a file of type: xlsx, xls.",
  "errors": {
    "archivo": ["El archivo debe ser formato Excel (.xlsx o .xls)"]
  }
}
```

---

## 2. Consultar Estado de la Importación

```
GET /api/v1/tenant/colaboradores/importaciones/{id}
```

### Respuesta 200 — Ejemplo con errores de validación (importación atómica abortada)

```json
{
  "data": {
    "id": 7,
    "estado": "CON_ERRORES",
    "nombre_archivo_original": "colaboradores_mayo_2026.xlsx",
    "total_filas": 120,
    "filas_exitosas": 0,
    "filas_fallidas": 2,
    "error_fatal": null,
    "resultados": [
      {
        "fila": 45,
        "estado": "fallido",
        "documento": "9876543210",
        "mensaje": "documento: Ya existe un colaborador con este número de documento"
      },
      {
        "fila": 87,
        "estado": "fallido",
        "documento": null,
        "mensaje": "primer_nombre: El campo primer nombre es obligatorio. | tipo_documento: El tipo de documento debe ser CC, TI, PASAPORTE, CE o PPT"
      }
    ],
    "iniciado_at": "2026-05-14T10:30:05.000000Z",
    "finalizado_at": "2026-05-14T10:30:12.000000Z",
    "created_at": "2026-05-14T10:30:01.000000Z"
  }
}
```

> **Importante:** la importación es **atómica**. Cuando `estado = CON_ERRORES`, **ningún colaborador fue creado**: `filas_exitosas` siempre es `0` y `resultados` contiene únicamente las filas inválidas. Corrija el archivo y vuelva a subirlo.

### Estados posibles

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | El job aún no ha sido tomado por el worker |
| `PROCESANDO` | El job está en ejecución activa |
| `COMPLETADO` | Todas las filas pasaron validación y fueron creadas exitosamente |
| `CON_ERRORES` | La validación detectó errores en una o más filas. **Ningún colaborador fue creado.** Consultar `resultados` para ver el detalle |
| `FALLIDO` | Error fatal — el archivo no pudo procesarse (parseo, excede 1.000 filas, excepción durante la inserción) |

> **Recomendación para el frontend:** hacer polling cada 3–5 segundos mientras `estado` sea `PENDIENTE` o `PROCESANDO`. Detener el polling cuando el estado sea `COMPLETADO`, `CON_ERRORES` o `FALLIDO`.

---

## Estructura del Archivo Excel

### Reglas generales

- **Fila 1**: Cabecera con los nombres de columna (se omite al procesar).
- **Datos**: desde la fila 2 en adelante.
- **Máximo**: 1.000 filas de datos por archivo.
- **Fechas**: formato `YYYY-MM-DD` (ej. `1990-05-15`). Se acepta también el formato de fecha nativo de Excel.
- **Valores vacíos**: dejar la celda vacía para campos opcionales.
- **Campos excluidos**: `predio_id` y `avatar` no se pueden cargar por importación masiva.

### Columnas

| Col | Nombre de Cabecera | Campo en BD | Tipo | Requerido | Reglas de validación |
|-----|--------------------|-------------|------|-----------|----------------------|
| A | `primer_nombre` | primer_nombre | Texto | **Sí** | Máx. 50 caracteres |
| B | `segundo_nombre` | segundo_nombre | Texto | No | Máx. 50 caracteres |
| C | `primer_apellido` | primer_apellido | Texto | **Sí** | Máx. 50 caracteres |
| D | `segundo_apellido` | segundo_apellido | Texto | No | Máx. 50 caracteres |
| E | `tipo_documento` | tipo_documento | Texto | **Sí** | Valores: `CC`, `TI`, `PASAPORTE`, `CE`, `PPT` |
| F | `documento` | documento | Texto | **Sí** | Máx. 50. Único por tenant (entre no eliminados) |
| G | `fecha_nacimiento` | fecha_nacimiento | Fecha | **Sí** | El colaborador debe tener al menos 14 años |
| H | `fecha_expedicion_documento` | fecha_expedicion_documento | Fecha | **Sí** | No puede ser futura |
| I | `lugar_expedicion` | lugar_expedicion | Texto | No | Máx. 100 caracteres |
| J | `cargo` | cargo | Texto | **Sí** | Máx. 100 caracteres |
| K | `modalidad_pago` | modalidad_pago | Texto | **Sí** | Valores: `FIJO` o `PRODUCCION` |
| L | `salario_base` | salario_base | Número | Condicional | Obligatorio si `modalidad_pago = FIJO`. Para `PRODUCCION` se auto-rellena con el SMLV del tenant si está configurado |
| M | `fecha_ingreso` | fecha_ingreso | Fecha | **Sí** | No puede ser futura |
| N | `fecha_retiro` | fecha_retiro | Fecha | No | Si se indica, debe ser >= `fecha_ingreso` |
| O | `eps` | eps | Texto | No | Máx. 50. Escribir el nombre de la EPS (ej. `Sura`) |
| P | `fondo_pension` | fondo_pension | Texto | No | Máx. 50. Escribir el nombre del fondo (ej. `Porvenir`) |
| Q | `arl` | arl | Texto | No | Máx. 50. Escribir el nombre de la ARL |
| R | `caja_compensacion` | caja_compensacion | Texto | No | Máx. 50 |
| S | `talla_camisa` | talla_camisa | Texto | No | Máx. 10 (ej. `M`, `L`, `XL`) |
| T | `talla_pantalon` | talla_pantalon | Texto | No | Máx. 10 (ej. `32`, `34`) |
| U | `talla_calzado` | talla_calzado | Texto | No | Máx. 5 (ej. `42`) |
| V | `tipo_cuenta` | tipo_cuenta | Texto | No | Valores: `AHORROS`, `CORRIENTE`, `EFECTIVO` |
| W | `entidad_bancaria` | entidad_bancaria | Texto | No | Máx. 50. Escribir el nombre del banco |
| X | `numero_cuenta` | numero_cuenta | Texto | No | Máx. 30 |
| Y | `correo_electronico` | correo_electronico | Email | No | Formato válido, máx. 100 |
| Z | `telefono` | telefono | Texto | No | Máx. 50 |
| AA | `direccion` | direccion | Texto | No | Máx. 200 |
| AB | `municipio` | municipio | Texto | No | Máx. 100 |
| AC | `departamento` | departamento | Texto | No | Máx. 100 |
| AD | `contacto_emergencia_nombre` | contacto_emergencia_nombre | Texto | No | Máx. 100 |
| AE | `contacto_emergencia_telefono` | contacto_emergencia_telefono | Texto | No | Máx. 50 |

### Nota sobre `salario_base` (columna L) por modalidad

| `modalidad_pago` | `salario_base` | Comportamiento |
|-----------------|---------------|----------------|
| `FIJO` | Presente | Usa el valor indicado |
| `FIJO` | Vacío | **Error de validación** — la fila falla |
| `PRODUCCION` | Presente | Usa el valor indicado |
| `PRODUCCION` | Vacío | Se auto-rellena con el SMLV configurado en el tenant |
| `PRODUCCION` | Vacío y sin SMLV configurado | **Error de validación** — la fila falla |

---

## Comportamiento Atómico (All-or-Nothing)

- La importación es **transaccional a nivel de archivo**: si **una sola** fila no pasa validación, **ninguna** se crea.
- El procesamiento ocurre en dos fases:
  1. **Validación completa en memoria**: se valida cada fila sin escribir en BD.
  2. **Inserción atómica**: solo si todas las filas son válidas, se insertan dentro de una única transacción. Si alguna inserción falla (p.ej. race condition con un documento único), se hace rollback total y la importación queda en `FALLIDO`.
- Si una o más fallan validación, la importación termina en `CON_ERRORES` con `filas_exitosas = 0`, `filas_fallidas = N` y `resultados` con el detalle de **todas** las filas inválidas (ordenadas por número de fila).
- Cuando todas las filas son exitosas, se crea automáticamente el **contrato vigente** de cada colaborador (igual que al crear individualmente).
- **Unicidad del documento**: el `documento` debe ser único contra la BD del tenant **y** único dentro del propio archivo. Si dos o más filas del Excel comparten el mismo `documento`, todas ellas se reportan como fallidas con el mensaje `documento: El documento aparece duplicado en las filas X, Y, Z del archivo`.

### Estructura de cada elemento en `resultados`

```json
{
  "fila": 2,
  "estado": "exitoso" | "fallido",
  "documento": "1098765432",
  "mensaje": "Texto descriptivo del resultado o del error"
}
```

---

## Auditoría

Las importaciones que terminan en `COMPLETADO` o `CON_ERRORES` generan un registro en `auditorias` con:

- `accion`: `IMPORTACION_MASIVA`
- `modulo`: `COLABORADORES`
- `observaciones`: resumen con conteos
- `datos_nuevos`: JSON con `importacion_id`, `total_filas`, `filas_exitosas`, `filas_fallidas`, `estado_final`

> Cuando `estado_final = CON_ERRORES`, `filas_exitosas` siempre será `0` por el comportamiento atómico. Las importaciones que terminan en `FALLIDO` (errores fatales del archivo) no generan registro de auditoría.

---

## Ejemplo de Consumo (JavaScript / Axios)

```js
// 1. Subir archivo e iniciar importación
const formData = new FormData();
formData.append('archivo', archivoExcel);

const { data: inicio } = await axios.post(
  '/api/v1/tenant/colaboradores/importar',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'multipart/form-data',
    },
  }
);

const importacionId = inicio.data.importacion_id;

// 2. Polling de estado
let terminado = false;
while (!terminado) {
  await new Promise(r => setTimeout(r, 4000)); // esperar 4 segundos

  const { data: estado } = await axios.get(
    `/api/v1/tenant/colaboradores/importaciones/${importacionId}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Id': tenantId } }
  );

  const estadosTerminales = ['COMPLETADO', 'CON_ERRORES', 'FALLIDO'];
  if (estadosTerminales.includes(estado.data.estado)) {
    terminado = true;
    console.log('Importación finalizada:', estado.data);
    // Mostrar resumen al usuario y las filas fallidas si las hay
  }
}
```

---

## Códigos de Error

| HTTP | Descripción |
|------|-------------|
| 202 | Importación iniciada correctamente |
| 404 | `importacion_id` no existe o no pertenece al tenant |
| 422 | Archivo inválido (formato o tamaño) |
| 500 | Error inesperado del servidor |

> **Nota:** Los errores de validación por fila **no generan HTTP 422**. La petición POST siempre retorna 202 si el archivo es válido. Los errores por fila se consultan en `GET /importaciones/{id}` y se reflejan como `estado = CON_ERRORES`. Cuando hay errores, **ninguna fila se crea**: la importación es atómica (all-or-nothing).
