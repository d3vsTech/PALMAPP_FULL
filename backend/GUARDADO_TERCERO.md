# ¿Por qué tarda tanto guardar un Tercero?

Documento técnico que explica el flujo de guardado del módulo Terceros en
PalmApp V.2, por qué genera tantas peticiones HTTP, y qué se puede optimizar
desde frontend vs. lo que requiere cambios en el backend.

---

## 1. El flujo actual del guardado (creación)

Cuando un admin pulsa **"Guardar Tercero"** en el wizard de creación
([NuevoTerceroWizard.tsx](../d:/Devs/PALMA/Front/V.2/PalmApp-Modular/palmapp_modular/frontend/src/app/pages/configuracion/NuevoTerceroWizard.tsx)),
ocurre lo siguiente:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. POST /api/v1/tenant/terceros          ← espera (round-trip)  │
│     → backend responde con el {id} del tercero creado            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Promise.allSettled([...]) — TODAS en paralelo:               │
│                                                                  │
│     • POST /precios-cosecha  × N lotes con precio > 0            │
│     • POST /precios-abono    × N rangos con precio > 0           │
│     • POST /labor-precios    × Plateo/Poda/Sanidad si > 0        │
│     • POST /labor-precios    × N labores de Finca con precio > 0 │
│     • POST /operarios        × N operarios                       │
└──────────────────────────────────────────────────────────────────┘
```

### Por qué dos fases (secuencial + paralelo)

La primera petición (`POST /terceros`) tiene que **esperar** porque las demás
dependen del `id` que devuelve el backend. No hay forma de paralelizarla. Las
siguientes sí van todas en paralelo con `Promise.allSettled` para minimizar
tiempo total.

---

## 2. Cuántas peticiones se generan en la práctica

Depende de cuánto llene el admin en el paso 2 (precios) y paso 3 (operarios):

| Lo que llenó el admin | Peticiones totales |
|---|---|
| Tercero + 1 operario, **sin precios** | **2** |
| Tercero + 1 operario + precios en 3 lotes | **5** |
| Tercero + 2 operarios + 3 rangos abono + 3 labores fijas + 5 lotes cosecha | **14** |
| Finca con muchos lotes y todos los precios llenos | **15 – 20+** |

Cada petición es **un POST individual al backend**.

---

## 3. Causas reales del tiempo total

### 3.1 Límite del navegador: 6 conexiones HTTP simultáneas por host

Los browsers (Chrome, Firefox, Safari) limitan a **6 conexiones HTTP
simultáneas por origen** sobre HTTP/1.1. Si el guardado genera 14 peticiones
en paralelo:

- Las primeras **6 salen al mismo tiempo**.
- Las **8 restantes se encolan** y esperan a que se liberen las conexiones.

Eso ya multiplica el tiempo total. La cola se nota en DevTools → Network
como **"Stalled"** o **"Queued"** > 500 ms.

### 3.2 Backend monolítico procesando paralelos

Laravel (sin Octane / Swoole) levanta **un proceso PHP-FPM por petición**.
Cada POST individual puede tomar **300–500 ms de procesamiento**.

Si tu backend tiene 4 workers PHP-FPM y le llegan 14 POSTs en paralelo:

- Procesa 4 al mismo tiempo.
- Los demás se encolan en nginx → PHP-FPM.

Con 14 peticiones y 4 workers, el tiempo total es ≈ `(14 / 4) × 400 ms ≈ 1.4 s`
en el mejor caso. Si el backend hace queries lentas o validaciones extensas,
sube a 2–4 segundos.

### 3.3 TLS handshake en cada conexión nueva

Aunque HTTP keep-alive reduce esto, abrir conexiones nuevas al host HTTPS
(`back.palmapp.com.co`) cuesta ~100–200 ms de TLS handshake por conexión nueva.

---

## 4. Qué se puede optimizar (y qué no)

### 4.1 Ya hecho en frontend

#### Edición — diff inteligente

En **edición** (`EditarTerceroWizard.tsx`), ya se aplica diff por valor:

| Acción | Peticiones antes | Peticiones ahora |
|---|---|---|
| Solo cambia teléfono del tercero | 15 – 20 | **1** (PUT tercero) |
| Agrega 1 operario nuevo | 15 | **1** (POST operario) |
| Cambia precio de 2 lotes | 15 | **2** (upsert cosecha) |
| Elimina 1 operario | 15 | **1** (DELETE) |
| Sin cambios reales | 15 – 20 | **0** |

El frontend ahora compara cada campo contra el snapshot original (`bundle.*`)
y solo envía la operación si efectivamente cambió. Eso elimina el grueso de
peticiones innecesarias en edición.

#### Carga del wizard

- **1 petición** al `wizard-init` para creación / `configuracion/init` para
  edición (en lugar de pedir cada catálogo por separado).
- **Cache** en memoria (`cached()` con TTL 60 s) para que abrir el wizard de
  nuevo en la misma sesión no haga otra ronda completa de catálogos.
- **Invalidación** automática del cache tras crear/eliminar para que el
  listado se refresque al volver a Configuración.

### 4.2 Lo que NO se puede optimizar desde frontend

#### Creación con muchos precios

Si el admin crea un tercero y llena precios en 15 lotes + 3 rangos + 3 labores
fijas + 4 labores de finca + 5 operarios, son **30 peticiones** al backend.
**No hay forma de reducir eso desde frontend** mientras la API REST tenga
endpoints separados por recurso.

#### Concurrencia del backend

Si el backend solo tiene 4 workers PHP-FPM, no importa cuánto paralelice el
frontend — el cuello de botella está en el servidor.

---

## 5. Qué optimización requiere cambios en backend

### 5.1 Endpoint batch (la solución real)

Pedirle al compañero del backend un endpoint nuevo:

```
POST /api/v1/tenant/terceros/wizard-finalize
```

Que reciba en **un solo body** todo el wizard:

```json
{
  "tercero": { "tipo_persona": "JURIDICA", "nit": "...", "razon_social": "..." },
  "precios_cosecha": [ { "lote_id": 1, "precio": 800 }, ... ],
  "precios_abono":   [ { "gramos_min": 0, "gramos_max": 500, "precio_palma": 50 }, ... ],
  "labor_precios":   [ { "labor_id": 13, "precio_palma": 60 }, ... ],
  "operarios":       [ { "nombres": "Carlos", "apellidos": "Ramírez", ... }, ... ]
}
```

El backend procesa todo dentro de una sola transacción y devuelve el tercero
completo con sus relaciones.

**Resultado**: de 15–20 peticiones a **1 sola petición** + 1 transacción
atómica. Mejora típica: de 2–4 segundos a 300–500 ms.

### 5.2 Octane / Swoole

Si Laravel corre con **Octane (Swoole / RoadRunner)**, los procesos PHP
quedan en memoria entre peticiones. Esto elimina el costo de levantar y
destruir un proceso por cada POST, llevando el tiempo individual de
~400 ms a ~50 ms.

### 5.3 HTTP/2 en el servidor

Configurar `back.palmapp.com.co` con **HTTP/2** elimina el límite de 6
conexiones simultáneas del navegador. Las 14 peticiones se multiplexan
sobre una sola conexión TCP.

---

## 6. Diagnóstico — cómo medir dónde está el cuello

Abrir **DevTools (F12) → Network** y ver:

| Columna | Significado | Acción si > 1 s |
|---|---|---|
| **Stalled / Queued** | Esperando conexión libre del navegador | Backend no es el problema. Necesitas HTTP/2 o reducir paralelismo. |
| **Waiting (TTFB)** | El servidor tarda en responder | Backend lento. Necesitas Octane o un endpoint batch. |
| **Content Download** | El body de respuesta es grande | Rara vez problema en APIs JSON pequeñas. |
| **DNS / Initial connection / SSL** | Setup de conexión | Solo en la primera petición; HTTP keep-alive reusa después. |

Si en una creación con 14 POSTs ves:

- **6 con "Waiting" rápido + 8 con "Queued"** → cuello del navegador (HTTP/2 lo arregla).
- **Todas con "Waiting" > 500 ms** → backend lento (Octane lo arregla).
- **Una sola con "Waiting" > 5 s mientras las demás son rápidas** → query lenta o lock; revisar logs del backend.

---

## 7. Conclusión

| Mejora | Donde se aplica | Estado |
|---|---|---|
| Diff en edición (solo enviar lo que cambió) | Frontend | ✅ Hecho |
| Cache de catálogos del wizard | Frontend | ✅ Hecho |
| Invalidación del listado tras guardar | Frontend | ✅ Hecho |
| Endpoint batch `wizard-finalize` | Backend | ⏳ Pendiente — petición al compañero |
| Octane / Swoole en Laravel | Backend | ⏳ Pendiente |
| HTTP/2 en nginx | Infra | ⏳ Pendiente |

El frontend ya está optimizado. La próxima ganancia significativa requiere
cambios fuera del frontend.

---

_Generado para PalmApp V.2 — módulo Terceros (palmapp_modular/frontend)._
