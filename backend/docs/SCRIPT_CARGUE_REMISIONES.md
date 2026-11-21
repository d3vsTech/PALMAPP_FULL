# Script de cargue masivo de remisiones de extractora

Herramienta de consola para cerrar muchos viajes de una sentada, leyendo el peso y los datos de la remisión impresa con el OCR del backend. Se pega en la consola del navegador con PalmApp abierto. No es parte de la aplicación: es una utilidad de operación, pensada para el histórico y para los meses en que llegan las remisiones en bloque.

El script está en `SCRIPT_CARGUE_REMISIONES.js`, al lado de este documento.

Contratos que usa: [API_VIAJES.md](./API_VIAJES.md) §3, §5.7, §5.8 y [API_VIAJES_OCR_BASCULA.md](./API_VIAJES_OCR_BASCULA.md) §3.

---

## 1. Qué hace

Toma un montón de fotos o PDF de remisiones de extractora y, por cada una, cierra el viaje que le corresponde:

```
foto  ──▶  POST documento-bascula  ──▶  OCR  ──▶  PATCH validar  ──▶  POST finalizar
```

Lo que lo diferencia de hacerlo a mano en la pantalla es solo el volumen: llama exactamente los mismos endpoints, en el mismo orden, con los mismos permisos. No hay ningún atajo ni ninguna escritura directa.

No trae datos embebidos. Los pesos, las fechas y las calificaciones salen del OCR de cada imagen. Quien corre el script escoge las fotos y revisa; no teclea cifras.

## 2. Antes de correrlo

| Requisito | Dónde se verifica |
|---|---|
| Sesión iniciada en PalmApp, en esa misma pestaña | El script lee `palmapp_token` y `palmapp_tenant_id` de `localStorage`. Si falta alguno, avisa y no arranca. |
| Permisos `viajes.ver` y `viajes.editar` | Los exigen el upload, el validar y el finalizar. |
| Módulo de viajes activo en el tenant | Si `tenant_config.modulo_viajes = false`, todo responde 403 `MODULO_DESHABILITADO`. |
| `ANTHROPIC_API_KEY` configurada | Sin ella el POST del documento responde 503 `ANTHROPIC_SIN_CONFIGURAR` y el script marca la fila como error de subida. |
| Los viajes ya creados, en `CREADO` o `EN_VALIDACION` | El script no crea viajes ni enlaza cosechas. Solo cierra lo que ya existe. |

La URL del backend está fija en la constante `API`, al principio del archivo. Para apuntar a otro ambiente se cambia esa línea.

## 3. Cómo se usa

Abrir PalmApp, abrir la consola con F12, pegar el script completo y dar Enter. Aparece un panel abajo a la derecha con tres botones, que se oprimen en orden.

### Paso 1. Emparejar

Se escogen las fotos y, opcionalmente, un rango de remisiones (`19-36`, o `19` para una sola). El script trae todos los viajes del tenant paginando `GET /viajes`, descarta los `FINALIZADO` y ordena lo que queda por el consecutivo de la remisión.

Luego arma la tabla: la foto número N se empareja con el viaje pendiente número N. El orden de las fotos es alfabético por nombre de archivo, así que conviene que los archivos vengan numerados.

Cada fila tiene un select para corregir el emparejamiento a mano, o para dejar la foto por fuera. Si un viaje queda asignado a dos fotos, las filas se pintan en rojo y los pasos siguientes se bloquean.

Este paso no escribe nada.

### Paso 2. Leer remisiones

Por cada par foto/viaje:

1. Si el viaje está en `CREADO`, lo pasa a `EN_VALIDACION` con `POST /saltar-validacion`. El upload lo exige.
2. Sube la foto con `POST /documento-bascula`.
3. Hace polling del documento cada 2,5 segundos hasta que el `estado_ocr` llegue a un estado terminal, con tope de 24 intentos (unos 60 segundos por foto).

Guarda la lectura en memoria y pinta la tabla de revisión. **No escribe nada en el viaje**: `datos_extraidos` vive en `viaje_documento_bascula`, igual que cuando el OCR se dispara desde la pantalla.

El único efecto secundario de este paso es la transición a `EN_VALIDACION` y el documento guardado. Las dos cosas son reversibles por la vía normal.

### Paso 3. Finalizar

Pide confirmación con el número de viajes y luego, por cada fila marcada como lista:

1. `PATCH /validar` con los 10 campos persistibles que trajo el OCR, omitiendo los nulos y los vacíos.
2. `POST /finalizar`.

Las advertencias que devuelve el finalizar se pintan en la columna de estado de la fila. Las filas que no están listas se saltan, no se tocan.

Este es el único paso que cierra viajes.

## 4. Qué llama, en orden

| Paso | Método y ruta | Cuándo |
|---|---|---|
| 1 | `GET /v1/tenant/viajes?per_page=200&page=N` | Al emparejar. Pagina hasta 25 páginas o hasta agotar `meta.last_page`. |
| 2 | `POST /v1/tenant/viajes/{id}/saltar-validacion` | Solo si el viaje está en `CREADO`. Body `{}`. |
| 2 | `POST /v1/tenant/viajes/{id}/documento-bascula` | Multipart, campo `documento`. |
| 2 | `GET /v1/tenant/viajes/{id}/documento-bascula/{docId}` | Polling hasta estado terminal. |
| 3 | `PATCH /v1/tenant/viajes/{id}/validar` | Con el subconjunto no vacío de los 10 campos. |
| 3 | `POST /v1/tenant/viajes/{id}/finalizar` | Body `{}`. |

Todas con `Authorization: Bearer`, `Accept: application/json` y `X-Tenant-Id`. En el multipart no se fija `Content-Type`: lo pone el navegador con su boundary.

## 5. Qué le pide a la API

Si alguna de estas llaves cambia de nombre o de forma, el script deja de funcionar. Es la lista para revisar antes de tocar el contrato.

| Respuesta | Llave | Uso |
|---|---|---|
| `GET /viajes` | `data[]`, `meta.last_page` | Paginar. De cada viaje usa `id`, `remision`, `fecha_viaje`, `placa_vehiculo`, `estado`. |
| `POST /documento-bascula` | `data.documento_id` | Sin él la fila queda en error. Ignora `poll_url` y arma la ruta él mismo. |
| `GET /documento-bascula/{id}` | `data.estado_ocr` | Termina con `COMPLETADO`, `REVISION_MANUAL` o `FALLIDO`. Cualquier otro valor lo sigue esperando. |
| | `data.datos_extraidos` | Los 10 campos persistibles. Sin este objeto la fila no se finaliza. |
| | `data.confianza` | Solo se muestra. No decide nada. |
| | `data.error_mensaje` | Se muestra cuando no hay datos. |
| | `data.validaciones_cruzadas.placa.{coincide, extraido, esperado}` | Decide si la fila se bloquea por placa. Si la sección no viene, no bloquea. |
| `POST /finalizar` | `advertencias[].message` o `.code` | Se pintan junto al resultado. |

El script lee `confianza` pero no la usa como umbral: ese criterio ya lo aplicó el backend al decidir entre `COMPLETADO` y `REVISION_MANUAL`.

## 6. Cuándo una fila no se finaliza

El semáforo de la tabla de revisión:

| Color | Situación | Se finaliza |
|---|---|---|
| Verde | `COMPLETADO`, con los cuatro críticos y peso mayor que cero | Sí |
| Amarillo | `REVISION_MANUAL` con datos completos | Sí, pero revise esa fila con cuidado |
| Amarillo | La placa leída no coincide con la del viaje | Solo si marca la casilla "finalizar aunque la placa no cuadre" |
| Rojo | Falta alguno de los cuatro críticos | No |
| Rojo | El peso llegó en cero | No |
| Rojo | `FALLIDO`, error de subida, o el OCR no terminó en 60 segundos | No |

Los cuatro campos críticos son `peso_viaje`, `numero_remision_extractora`, `fecha_llegada` y `hora_llegada`.

El peso en cero se bloquea aparte porque pasa el chequeo de "campo presente" y cierra mal el viaje: el promedio kg/gajo del lote quedaría en cero y eso entra al pago de la cosecha.

## 7. Reglas de seguridad

- Los viajes `FINALIZADO` se filtran al traer la lista. No aparecen en el select ni se pueden escoger.
- Un viaje asignado a dos fotos bloquea los pasos 2 y 3 hasta que se corrija.
- La casilla de la placa es lo único que relaja una validación, y es explícita.
- El paso 2 no escribe en el viaje. Equivocarse ahí no cierra nada.
- Si una fila falla, las demás siguen. El script no corre en transacción: cada viaje es independiente.

Un viaje cerrado por error se arregla igual que uno cerrado a mano: `POST /viajes/{id}/reabrir` con el permiso `viajes.reabrir` ([API_VIAJES.md §5.10](./API_VIAJES.md)).

## 8. Parámetros que se pueden ajustar

Arriba del archivo:

| Constante | Valor | Qué controla |
|---|---|---|
| `API` | `https://back.palmapp.com.co/api` | Backend al que apunta. |
| `ESPERA_OCR` | `2500` | Milisegundos entre consultas del estado del OCR. |
| `INTENTOS_OCR` | `24` | Tope de consultas por foto. Con el valor por defecto espera unos 60 segundos. |
| `MAX_PAGINAS` | `25` | Tope de paginación del listado de viajes. A 200 por página son 5.000 viajes. |

Si el OCR del ambiente se demora más que eso, suba `INTENTOS_OCR` antes que `ESPERA_OCR`: la fila que vence el tope queda en rojo y toca repetirla.

## 9. Errores que se ven y qué significan

| Lo que muestra la fila | Qué pasó del lado del backend |
|---|---|
| `409` al saltar validación | El viaje no estaba en `CREADO`. Alguien lo movió mientras tanto. |
| `409 VIAJE_ESTADO_INVALIDO` al subir | El viaje no está en `EN_VALIDACION`. |
| `503 ANTHROPIC_SIN_CONFIGURAR` | Falta `ANTHROPIC_API_KEY` en el env del ambiente. |
| `el backend no devolvio documento_id` | El 202 llegó sin `data.documento_id`. |
| `FALLIDO` con mensaje | El Job terminó en error. El mensaje viene de `error_mensaje`. |
| `PENDIENTE` tras 60 segundos | La cola no alcanzó a procesar. Revise el worker. |
| `422` al validar | Algún porcentaje fuera de 0 a 100, o la hora en otro formato. El OCR devolvió algo que el request rechaza. |
| `422 VIAJE_INCOMPLETO` al finalizar | El viaje tiene cosechas enlazadas y quedó sin peso. |

Todo lo que no reconoce lo muestra como `ERROR` con el estado HTTP y el `message` del backend tal cual.

## 10. Lo que el script no hace

- No crea viajes, ni transportadores, ni extractoras.
- No enlaza cosechas ni toca reconteos. Un viaje sin cosechas cierra sin promedio, que es lo esperado para el histórico de una finca que paga por jornal.
- No reabre nada.
- No guarda el archivo en ningún lado fuera de lo que ya hace el endpoint de documento.
- No revisa nóminas. Si una nómina abierta cubre la fecha, el finalizar avisa en `advertencias[]` y el script lo pinta, pero no bloquea.

## 11. Estado en consola

Mientras el panel esté abierto, `window.remisiones` expone `{ estado, emparejar, leer, finalizar }`. Sirve para inspeccionar los pares y las lecturas crudas sin volver a correr nada:

```js
remisiones.estado.pares.map(p => [p.viajeId, p.lectura?.estado_ocr, p.resultado]);
```
