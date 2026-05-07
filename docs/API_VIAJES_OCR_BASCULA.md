# API — Viajes · OCR del formulario de extractora con Claude Vision

> Complemento a [API_VIAJES.md](./API_VIAJES.md). Documenta el flujo automatizado que asiste al operador en la digitación del formulario de extractora: el operador sube una foto/PDF cuando el viaje está `EN_VALIDACION`, Claude Vision extrae los datos clave (incluyendo dos campos auxiliares de cross-check: nombre del conductor y placa impresos en el documento), el frontend los muestra en el formulario, y el operador revisa, edita y guarda. **El OCR no toca la tabla `viajes` directamente** — la persistencia y el cierre del viaje siguen pasando por los endpoints manuales `PATCH /validar` y `POST /finalizar`.

---

## 0. Visión general

```
┌──────────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ POST documento-  │     │ Job: Claude      │     │ GET polling        │     │ Operador revisa    │
│ bascula          │ ──▶ │ extrae 12 campos │ ──▶ │ datos_extraidos    │ ──▶ │ y edita en form;   │
│ (foto/PDF)       │     │ → guarda en doc  │     │ + validaciones_    │     │ atiende alertas    │
│                  │     │ NO toca viajes   │     │   cruzadas (live)  │     │ de mismatch        │
└──────────────────┘     └──────────────────┘     └────────────────────┘     └────────┬───────────┘
                                                                                       │
                                                                                       ▼
                                                                              ┌────────────────────┐
                                                                              │ Operador clic en   │
                                                                              │ "Finalizar y       │
                                                                              │  guardar":         │
                                                                              │  PATCH /validar    │
                                                                              │  + POST /finalizar │
                                                                              │  (HOMOGENEO calc)  │
                                                                              └────────────────────┘
```

**El OCR es solo asistencia** — el operador siempre tiene la última palabra antes de persistir. Esto evita que un error de Claude (peso confundido, fecha mal leída) cierre un viaje incorrecto.

**Ganancia:** reduce ~10 campos de digitación a una revisión rápida + clic. Los 4 críticos (peso, número de remisión, fecha y hora de llegada) son los que más errores causan en captura manual; el OCR los pre-rellena. Adicionalmente, dos campos auxiliares (nombre del conductor y placa impresos) se contrastan contra el snapshot del viaje para alertar al operador si llegó un camión distinto al planeado.

---

## 1. Configuración

### 1.1 Variables de entorno

```dotenv
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_BASCULA_CONFIANZA_MINIMA=0.70
```

- `ANTHROPIC_API_KEY` — obligatoria. El endpoint `POST` responde 503 `ANTHROPIC_SIN_CONFIGURAR` si falta.
- `ANTHROPIC_MODEL` — default `claude-haiku-4-5-20251001` (rápido y preciso para formularios impresos). Cambiar a `claude-sonnet-4-6` si hay muchos formularios manuscritos o de baja calidad fotográfica.
- `ANTHROPIC_BASCULA_CONFIANZA_MINIMA` — umbral 0.0–1.0. Respuestas con confianza menor dejan el documento en `REVISION_MANUAL` (los datos se guardan igual; solo cambia el badge visual para que el operador preste especial atención).

### 1.2 Bloque en `config/services.php`

```php
'anthropic' => [
    'api_key' => env('ANTHROPIC_API_KEY'),
    'model'   => env('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001'),
    'bascula' => [
        'confianza_minima' => (float) env('ANTHROPIC_BASCULA_CONFIANZA_MINIMA', 0.70),
    ],
],
```

### 1.3 Queue workers

El Job `ProcesarFormularioExtractoraJob` corre sobre el grupo Supervisor `agro-worker:*` (mismo que `CrearPalmasJob`). Después de desplegar:

```bash
php artisan queue:restart
sudo supervisorctl restart agro-worker:*
```

En desarrollo local basta:

```bash
php artisan queue:work --queue=default
```

---

## 2. Tabla `viaje_documento_bascula`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint PK | |
| `tenant_id` | FK `tenants` | |
| `viaje_id` | FK `viajes` restrictOnDelete | |
| `archivo_path` | string(500) | `tenants/{t}/viajes/{v}/bascula/{uuid}.{ext}` (disk `local`, privado) |
| `archivo_nombre_original` | string(255) | |
| `mime_type` | string(50) | `application/pdf` \| `image/jpeg` \| `image/png` |
| `archivo_tamano` | integer | Bytes |
| `estado_ocr` | string(20) | CHECK IN: PENDIENTE, PROCESANDO, COMPLETADO, REVISION_MANUAL, FALLIDO |
| `peso_extraido` | decimal(10,2) | Atajo: `datos_extraidos.peso_viaje`. Útil para mostrar "12,500 kg" sin parsear el JSON. |
| `confianza` | decimal(4,3) | 0.000–1.000 reportado por el modelo |
| `modelo_usado` | string(50) | Snapshot del modelo al momento de procesar |
| `respuesta_claude` | jsonb | Payload crudo de la API (auditoría/debug) |
| `datos_extraidos` | jsonb | **Subset normalizado** que el frontend consume: 10 campos persistibles en `viajes` + 2 auxiliares de cross-check (`nombre_conductor_extraido`, `placa_vehiculo_extraida`) que NO van al viaje |
| `error_mensaje` | text | Razón si REVISION_MANUAL o FALLIDO |
| `intentos` | smallint | Incrementado por el Job en cada reintento |
| `procesado_at` | timestamp | Cuando Claude respondió |
| `creado_por` | FK `users` nullOnDelete | |
| timestamps | | |

Índices: `(tenant_id, viaje_id)`, `(tenant_id, estado_ocr)`.

### 2.1 Estados

```
PENDIENTE ──(Job toma)──▶ PROCESANDO ──▶ COMPLETADO       (confianza ≥ umbral
                                       │                   y los 3 críticos OK)
                                       │
                                       ├─▶ REVISION_MANUAL  (confianza baja
                                       │                     o crítico faltante;
                                       │                     datos se guardan igual)
                                       │
                                       └─▶ FALLIDO          (Claude inaccesible
                                                             tras 3 reintentos)
```

**El estado `REVISION_MANUAL` no significa que los datos no estén disponibles** — están en `datos_extraidos` igual que en `COMPLETADO`. Es solo una señal para que el frontend pinte una alerta y el operador preste especial atención al revisar.

**Estados terminales:** `COMPLETADO`, `REVISION_MANUAL`, `FALLIDO`. El Job es idempotente — si se reencola sobre un documento en estado terminal, retorna sin tocar nada.

### 2.2 Campos críticos vs opcionales

- **Críticos (obligatorios):** `peso_viaje`, `numero_remision_extractora`, `fecha_llegada`, `hora_llegada`. Si Claude no logra leer alguno, el documento va a `REVISION_MANUAL`.
- **Opcionales (persistibles en `viajes`):** `fruto_verde`, `sobre_maduro`, `podrido`, `pedunculo_largo`, `mal_formado`, `observaciones_extractora`. Es esperado que muchos formularios no traigan todas las calificaciones; Claude devuelve `null` por categoría sin penalizar la confianza.
- **Auxiliares cross-check (NO persistibles en `viajes`):** `nombre_conductor_extraido`, `placa_vehiculo_extraida`. Se comparan en el GET contra el snapshot del viaje para emitir alertas no bloqueantes cuando no coinciden. Su ausencia no degrada la confianza ni manda el documento a `REVISION_MANUAL`.

---

## 3. Endpoints

### 3.1 `POST /api/v1/tenant/viajes/{viaje}/documento-bascula`

Permiso: `viajes.editar`. Content-Type: `multipart/form-data`.

**Form fields:**

| Campo | Tipo | Reglas |
|---|---|---|
| `documento` | file | required · mimes: `pdf,jpg,jpeg,png` · max 10 MB |

**Validaciones de negocio:**

- `ANTHROPIC_API_KEY` debe estar configurada → si no, **503 `ANTHROPIC_SIN_CONFIGURAR`**.
- El viaje debe estar en `EN_VALIDACION` → si no, **409 `VIAJE_ESTADO_INVALIDO`**.
- El archivo se guarda en `storage/app/private/tenants/{tenantId}/viajes/{viajeId}/bascula/{uuid}.{ext}` (driver `local`, privado).

**Respuesta 202:**

```json
{
  "message": "Documento recibido, procesamiento en cola",
  "data": {
    "documento_id": 45,
    "estado_ocr": "PENDIENTE",
    "poll_url": "/api/v1/tenant/viajes/87/documento-bascula/45"
  }
}
```

El front debe hacer polling a `poll_url` cada 2–3 segundos hasta que `estado_ocr` entre a un estado terminal.

### 3.2 `GET /api/v1/tenant/viajes/{viaje}/documento-bascula/{documento}`

Permiso: `viajes.ver`. Retorna el estado del documento, los 12 campos extraídos por Claude, un snapshot mínimo del viaje (id, remision, estado actual) y, cuando el OCR ya alcanzó un estado terminal con datos disponibles, una sección `validaciones_cruzadas` con la comparación tolerante de conductor y placa.

**Respuesta 200 (caso feliz, COMPLETADO con conductor y placa coincidiendo):**

```json
{
  "data": {
    "id": 45,
    "estado_ocr": "COMPLETADO",
    "peso_extraido": "12500.50",
    "confianza": "0.940",
    "modelo_usado": "claude-haiku-4-5-20251001",
    "intentos": 1,
    "procesado_at": "2026-04-24T18:35:12Z",
    "error_mensaje": null,
    "datos_extraidos": {
      "peso_viaje": 12500.50,
      "numero_remision_extractora": "0042",
      "fecha_llegada": "2026-04-24",
      "hora_llegada": "10:45",
      "fruto_verde": 0,
      "sobre_maduro": 17.5,
      "podrido": 2.5,
      "pedunculo_largo": 0,
      "mal_formado": 5,
      "observaciones_extractora": "Llegada sin novedad.",
      "nombre_conductor_extraido": "JORDAN MIGUEL BLANCO TOLOZA",
      "placa_vehiculo_extraida": "JFF319"
    },
    "validaciones_cruzadas": {
      "conductor": {
        "extraido": "JORDAN MIGUEL BLANCO TOLOZA",
        "esperado": "Jordan Blanco Toloza",
        "coincide": true
      },
      "placa": {
        "extraido": "JFF319",
        "esperado": "JFF-319",
        "coincide": true
      }
    },
    "viaje": {
      "id": 87,
      "remision": "REM-2026-015",
      "estado": "EN_VALIDACION"
    }
  }
}
```

**Respuesta 200 (COMPLETADO con mismatch — el camión llegó con conductor/placa distintos):**

```json
{
  "data": {
    "id": 45,
    "estado_ocr": "COMPLETADO",
    "...": "...",
    "datos_extraidos": {
      "...": "...",
      "nombre_conductor_extraido": "PEDRO GOMEZ",
      "placa_vehiculo_extraida": "XYZ-987"
    },
    "validaciones_cruzadas": {
      "conductor": {
        "extraido": "PEDRO GOMEZ",
        "esperado": "Jordan Blanco Toloza",
        "coincide": false
      },
      "placa": {
        "extraido": "XYZ-987",
        "esperado": "JFF-319",
        "coincide": false
      }
    }
  }
}
```

El frontend debe pintar una alerta visible y no bloqueante (ej. "⚠️ El conductor que llegó no coincide con el planeado en el viaje. Verifica antes de guardar."). El operador puede continuar y guardar — el cross-check no bloquea el flujo.

**Respuesta 200 (REVISION_MANUAL — datos disponibles pero baja confianza o crítico faltante):**

```json
{
  "data": {
    "id": 45,
    "estado_ocr": "REVISION_MANUAL",
    "peso_extraido": "12500.50",
    "confianza": "0.450",
    "modelo_usado": "claude-haiku-4-5-20251001",
    "intentos": 1,
    "procesado_at": "2026-04-24T18:35:12Z",
    "error_mensaje": "Faltan campos críticos en el documento: hora_llegada",
    "datos_extraidos": {
      "peso_viaje": 12500.50,
      "numero_remision_extractora": "0042",
      "fecha_llegada": "2026-04-24",
      "hora_llegada": null,
      "...": "..."
    },
    "validaciones_cruzadas": {
      "conductor": { "extraido": null, "esperado": "Jordan Blanco Toloza", "coincide": null },
      "placa": { "extraido": "JFF319", "esperado": "JFF-319", "coincide": true }
    },
    "viaje": { "id": 87, "remision": "REM-2026-015", "estado": "EN_VALIDACION" }
  }
}
```

El frontend debe mostrar una alerta visible ("⚠️ Revisa estos datos cuidadosamente") y pre-rellenar el form con `datos_extraidos` para que el operador complete lo que Claude no pudo leer (en este caso, `hora_llegada`). Cuando un campo cross-check viene `null` (Claude no pudo leerlo), `coincide` se reporta como `null` — el frontend debe interpretarlo como "no se pudo verificar" (ni alerta de mismatch ni confirmación de match).

**Respuesta 200 (mientras procesa):**

```json
{
  "data": {
    "id": 45,
    "estado_ocr": "PROCESANDO",
    "datos_extraidos": null,
    "viaje": { "id": 87, "remision": "REM-2026-015", "estado": "EN_VALIDACION" }
  }
}
```

> Mientras el documento esté en `PENDIENTE`, `PROCESANDO` o `FALLIDO`, la respuesta NO incluye la sección `validaciones_cruzadas` — solo aparece cuando hay datos extraídos disponibles (estados `COMPLETADO` y `REVISION_MANUAL`).

**Respuesta 200 (FALLIDO — Claude inaccesible):**

```json
{
  "data": {
    "id": 45,
    "estado_ocr": "FALLIDO",
    "error_mensaje": "OCR falló tras reintentos: Connection timeout",
    "datos_extraidos": null,
    "viaje": { "id": 87, "remision": "REM-2026-015", "estado": "EN_VALIDACION" }
  }
}
```

**404 `DOCUMENTO_VIAJE_MISMATCH`** si el `{documento}` de la URL no pertenece al `{viaje}` de la URL (defensa contra enumeración).

---

## 4. Lógica del Job (resumen)

Archivo: [app/Jobs/ProcesarFormularioExtractoraJob.php](../app/Jobs/ProcesarFormularioExtractoraJob.php).

```
timeout = 120s
tries = 3
backoff = [30, 90, 180] segundos

handle(ClaudeVisionService, AuditoriaService):
  1. app()->instance('current_tenant_id', $doc->tenant_id)    // restaura contexto multi-tenant
  2. refresh(); si estado ya es terminal → return (idempotencia)
  3. marca PROCESANDO + intentos++
  4. call ClaudeVisionService::extraerFormularioExtractora(path, mime)
  5. determina estado:
     - REVISION_MANUAL si confianza < umbral OR algún crítico faltante
     - COMPLETADO en caso contrario
  6. update documento con: estado_ocr, peso_extraido, confianza, modelo_usado,
     respuesta_claude (raw), datos_extraidos (10 campos normalizados),
     error_mensaje, procesado_at
  7. auditoría PROCESAR_FORMULARIO_EXTRACTORA con observación descriptiva

failed(Throwable):
  → documento estado = FALLIDO, error_mensaje = excepción
```

**El Job no toca la tabla `viajes`.** No hay `lockForUpdate`, no hay `DB::transaction`, no hay race conditions con flujos manuales — todo es read-only excepto el documento mismo. La hidratación del viaje y el cierre los hace el operador con `PATCH /validar` y `POST /finalizar` aparte.

---

## 5. Prompt usado por Claude

**System** (con `cache_control: ephemeral` para prompt caching):

Resumen del prompt (ver [app/Services/ClaudeVisionService.php](../app/Services/ClaudeVisionService.php) constante `SYSTEM_PROMPT`):

- Marca explícitamente **4 campos como CRÍTICOS** (peso_viaje, numero_remision_extractora, fecha_llegada, hora_llegada) y el resto como opcionales (5 calificaciones de fruto, observaciones, y 2 auxiliares cross-check).
- Para `peso_viaje`: prioriza "Peso Neto"; si solo hay Bruto + Tara calcula Neto = Bruto - Tara; si hay Bruto sin tara devuelve bruto y aclara en observaciones; toneladas → ×1000. Aclara que en formato colombiano `21.140` = 21140 kg (punto = miles).
- Para `numero_remision_extractora`: enumera **etiquetas válidas** (`N° DE REMISIÓN`, `NRO. REMISIÓN`, `No. DOCUMENTO`, etc.) y **etiquetas a evitar** (`NÚMERO DE TIQUETE`, `NÚMERO DE REGISTRO`, `COD`) que son IDs internos del sistema de báscula y NO la remisión que firma el conductor.
- Para `fecha_llegada` y `hora_llegada`: enseña a convertir formatos comunes en remisiones colombianas (`05/may/2026`, `10/04/26` DD/MM/YY, `09:46 PM` → 24h) y a NO usar la fecha/hora de salida si solo aparece esa.
- Para los 5 porcentajes de calificación: lista sinónimos por categoría (incluyendo el typo "PRODRIDO" visto en formularios reales) y obliga a devolver null por categoría ausente (NO asumir 0). NUNCA > 100.
- Para `nombre_conductor_extraido`: instruye a usar la etiqueta CONDUCTOR específicamente, no PROVEEDOR / PROPIETARIO / "PESADO POR".
- Para `placa_vehiculo_extraida`: devuelve tal cual sin normalizar (la normalización se hace al comparar en el GET).
- **Nunca inventa valores** — devuelve `null` cuando no ve un dato.
- Confianza global ≤ 0.5 si falta algún crítico. La ausencia de los auxiliares (conductor/placa) NO penaliza la confianza.
- Devuelve solo JSON válido (sin code fences ni texto extra) con las 12 keys + `confianza`.

**User:** bloque `image` (o `document` para PDF) + bloque `text` `"Extrae los datos del formulario de extractora de este documento."`

El servicio tiene fallbacks defensivos: remueve code fences si Claude los incluye, recorta strings al max length del FormRequest, valida formato YYYY-MM-DD y HH:MM, y descarta porcentajes fuera de rango [0, 100] (probablemente Claude leyó mal el separador decimal).

---

## 6. Códigos de error

| HTTP | Code | Cuándo |
|---|---|---|
| 503 | `ANTHROPIC_SIN_CONFIGURAR` | `POST` sin `ANTHROPIC_API_KEY` en el env |
| 409 | `VIAJE_ESTADO_INVALIDO` | `POST` con viaje en estado ≠ EN_VALIDACION |
| 422 | Validation | `documento` ausente, mime inválido o > 10 MB |
| 404 | `DOCUMENTO_VIAJE_MISMATCH` | `GET` con documento_id que no pertenece al viaje_id de la URL |

Errores de Claude durante el Job NO se devuelven al cliente — viven en `viaje_documento_bascula.estado_ocr` + `error_mensaje`.

---

## 7. Flujo de ejemplo (cURL)

```bash
TOKEN="eyJ..."
TENANT="1"
BASE="https://api.example.com/api/v1/tenant"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")

# Paso 1 — Subir formulario (viaje 87 en EN_VALIDACION)
curl -X POST "$BASE/viajes/87/documento-bascula" "${H[@]}" \
  -F "documento=@./formulario_extractora.pdf"
# → 202 { documento_id: 45, estado_ocr: PENDIENTE, poll_url: ... }

# Paso 2 — Polling hasta estado terminal (cada 2-3s)
curl "$BASE/viajes/87/documento-bascula/45" "${H[@]}"
# → estado_ocr: COMPLETADO (o REVISION_MANUAL)
#   datos_extraidos: { peso_viaje: 12500.50, fecha_llegada: "2026-04-24", ... }

# Paso 3 — Operador revisa los datos en pantalla, los edita si hace falta,
#          y al darle clic a "Finalizar y guardar" el frontend dispara los
#          dos endpoints manuales en secuencia:

# 3a — Hidratar el viaje con los datos del form (editados o no)
curl -X PATCH "$BASE/viajes/87/validar" "${H[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "peso_viaje": 12500.50,
    "numero_remision_extractora": "0042",
    "fecha_llegada": "2026-04-24",
    "hora_llegada": "10:45",
    "fruto_verde": 0,
    "sobre_maduro": 17.5,
    "podrido": 2.5,
    "pedunculo_largo": 0,
    "mal_formado": 5,
    "observaciones_extractora": "Llegada sin novedad."
  }'

# 3b — Cerrar el viaje (dispara ViajeCalculationService::calcularAlFinalizar)
curl -X POST "$BASE/viajes/87/finalizar" "${H[@]}"
# → viaje.estado: FINALIZADO, finalizado_at poblado, promedios kg/gajo recalculados
```

---

## 8. Troubleshooting

| Síntoma | Diagnóstico | Acción |
|---|---|---|
| 503 `ANTHROPIC_SIN_CONFIGURAR` | Falta `ANTHROPIC_API_KEY` | Cargar en `.env` del server + `php artisan config:cache` |
| Documento siempre en PENDIENTE | Queue worker no corre o no escucha la queue `default` | `supervisorctl status agro-worker:*`; revisar `--queue=` del comando |
| Frontend muestra "Error genérico" tras subir | Revisar `storage/logs/laravel.log` durante el upload | El controller siempre responde 202 si el viaje está en EN_VALIDACION y el archivo es válido — un error genérico suele ser red, validación 422, o el Job sin clase autoloaded |
| Documento en REVISION_MANUAL frecuente por confianza | Fotos borrosas, ángulo malo, papel termal desvanecido | Capacitar al operador o subir a `claude-sonnet-4-6` |
| Documento en REVISION_MANUAL por crítico faltante | Formulario provisional sin peso/fecha/hora | Esperado — el operador completa manualmente los críticos en el form |
| Documento en FALLIDO | Claude inaccesible tras 3 reintentos | Revisar logs; verificar conectividad a `api.anthropic.com`; reintentar subiendo otra vez |
| `datos_extraidos` con todos null y confianza 0.0 | Imagen subida no era un formulario de extractora (ej. screenshot de correo) | Esperado — Claude rechaza correctamente; operador sube el documento correcto |

---

## 9. Observaciones de costo y seguridad

- **Costo:** Haiku 4.5 con 1 imagen + prompt de ~1KB ≈ USD $0.0005 por extracción. 100 viajes/día ≈ USD $1.5/mes por tenant. Prompt caching ephemeral reduce el costo un ~90% tras el primer hit de cada ventana de 5 min.
- **Privacidad:** los formularios pueden llevar datos del conductor y placa. Se almacenan en el disk `local` (privado — `storage/app/private/`) y NUNCA se exponen vía URL pública.
- **Aislamiento multi-tenant:** el Job restaura `app('current_tenant_id')` al inicio del handle. Como el Job no escribe en `viajes`, no necesita el `WHERE tenant_id = ?` defensivo de versiones anteriores — solo escribe en su propio documento (que ya está scopeado al tenant por el modelo `BelongsToTenant`).
- **Auditoría:** cada procesamiento (exitoso, en revisión manual, o fallido) registra una entrada en `auditorias` con acción `PROCESAR_FORMULARIO_EXTRACTORA`, módulo `VIAJES`. La hidratación posterior (`PATCH /validar`) y el cierre (`POST /finalizar`) registran sus propias entradas con acciones `VALIDAR` y `FINALIZAR`.

---

## 10. Referencias cruzadas

- Máquina de estados del viaje y endpoints manuales: [API_VIAJES.md](./API_VIAJES.md).
- Marco legal del módulo: [CONTEXTO.md §6.5](../CONTEXTO.md).
- Código:
  - [app/Services/ClaudeVisionService.php](../app/Services/ClaudeVisionService.php)
  - [app/Services/ViajeOcrCrossCheckService.php](../app/Services/ViajeOcrCrossCheckService.php) — comparación tolerante de conductor y placa para `validaciones_cruzadas`.
  - [app/Jobs/ProcesarFormularioExtractoraJob.php](../app/Jobs/ProcesarFormularioExtractoraJob.php)
  - [app/Http/Controllers/Api/ViajeDocumentoBasculaController.php](../app/Http/Controllers/Api/ViajeDocumentoBasculaController.php)
  - [app/Models/ViajeDocumentoBascula.php](../app/Models/ViajeDocumentoBascula.php)
  - [database/migrations/2026_04_24_000007_create_viaje_documento_bascula_table.php](../database/migrations/2026_04_24_000007_create_viaje_documento_bascula_table.php)
  - [database/migrations/2026_05_04_000002_add_extractora_form_fields_to_viajes.php](../database/migrations/2026_05_04_000002_add_extractora_form_fields_to_viajes.php) — agrega los 9 campos iniciales del formulario (modelo original con métricas de pulpa/acidez/humedad y enum cualitativo).
  - [database/migrations/2026_05_05_000001_add_datos_extraidos_to_viaje_documento_bascula.php](../database/migrations/2026_05_05_000001_add_datos_extraidos_to_viaje_documento_bascula.php)
  - [database/migrations/2026_05_07_000001_refine_extractora_fields_on_viajes.php](../database/migrations/2026_05_07_000001_refine_extractora_fields_on_viajes.php) — realinea el modelo con lo que las remisiones colombianas realmente traen: dropea las 5 métricas obsoletas y el enum, agrega los 5 porcentajes por categoría de fruto.
