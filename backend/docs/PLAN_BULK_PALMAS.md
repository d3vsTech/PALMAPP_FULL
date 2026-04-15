# Plan: Bulk Insert de Palmas — Mitigacion de Bloqueo de BD

## 1. Problema Actual

### Bug critico en PalmaController::store() (linea 150)

```php
// app/Http/Controllers/Api/PalmaController.php:150
Palma::insert($palmas);  // SIN chunking — falla con cantidades grandes
```

Con 9,999 palmas x 8 columnas = **79,992 parametros bound**, **supera el limite de PostgreSQL de 65,535 parametros por query**. El INSERT falla antes de ejecutarse.

### SubloteController::crearPalmas() (linea 272)

```php
// app/Http/Controllers/Api/SubloteController.php:272-274
foreach (array_chunk($palmas, 1000) as $chunk) {
    Palma::insert($chunk);
}
```

Tiene chunking a 1,000 pero permite hasta 99,999 palmas — todo sincrono en el HTTP request, causando timeout.

### Tabla de rendimiento estimado (PostgreSQL 16)

| Cantidad | Chunks (x1000) | Tiempo estimado | Riesgo |
|----------|-----------------|-----------------|--------|
| 1,000    | 1               | ~100ms          | Ninguno |
| 5,000    | 5               | ~0.5-1s         | Ninguno |
| **8,192+** | -             | -               | **Falla por limite de params** (PalmaController) |
| 10,000   | 10              | ~1-3s           | Bajo (con chunking) |
| 50,000   | 50              | ~8-15s          | HTTP timeout probable |
| 99,999   | 100             | ~15-45s         | Timeout casi seguro |

---

## 2. Solucion: Dos Caminos (Sync + Async)

```
Request llega con cantidad_palmas
         |
   <= 5,000?
    /        \
  SI          NO
   |           |
 SYNC        ASYNC
 chunked     Job en cola
 return 201  return 202 + batch_id
```

**Umbral recomendado sync/async: 5,000 palmas.**

---

## 3. Archivos a Crear

### 3.1 `app/Services/PalmaCreationService.php` (NUEVO)

Servicio compartido que centraliza la logica de creacion (hoy duplicada en ambos controllers):

```php
<?php

namespace App\Services;

use App\Jobs\CrearPalmasJob;
use App\Models\Linea;
use App\Models\Palma;
use App\Models\Sublote;
use Illuminate\Support\Facades\Bus;

class PalmaCreationService
{
    public const SYNC_THRESHOLD = 5_000;
    public const CHUNK_SIZE     = 1_000;

    /**
     * Camino sincrono: inserta palmas en chunks dentro de la transaccion actual.
     */
    public function createSync(Sublote $sublote, int $cantidad, ?int $lineaId = null): void
    {
        $maxContador = $this->getMaxContador($sublote->id);
        $palmas = $this->buildRecords($sublote, $cantidad, $lineaId, $maxContador);
        $this->insertChunked($palmas);
        $this->updateCounters($sublote, $lineaId);
    }

    /**
     * Camino asincrono: despacha un Job en Bus::batch para tracking.
     * Retorna el batch_id.
     */
    public function createAsync(
        Sublote $sublote,
        int $cantidad,
        ?int $lineaId,
        int $tenantId,
        int $userId,
    ): string {
        $batch = Bus::batch([
            new CrearPalmasJob(
                tenantId:  $tenantId,
                subloteId: $sublote->id,
                lineaId:   $lineaId,
                cantidad:  $cantidad,
                userId:    $userId,
            ),
        ])
            ->name("crear-palmas-sublote-{$sublote->id}")
            ->dispatch();

        return $batch->id;
    }

    public function getMaxContador(int $subloteId): int
    {
        return (int) Palma::where('sublote_id', $subloteId)
            ->selectRaw("MAX(CAST(SUBSTRING(codigo FROM '-([0-9]+)$') AS INTEGER)) as max_num")
            ->value('max_num');
    }

    private function buildRecords(Sublote $sublote, int $cantidad, ?int $lineaId, int $startContador): array
    {
        $palmas   = [];
        $now      = now();
        $tenantId = $sublote->tenant_id;

        for ($i = 1; $i <= $cantidad; $i++) {
            $startContador++;
            $palmas[] = [
                'tenant_id'   => $tenantId,
                'sublote_id'  => $sublote->id,
                'linea_id'    => $lineaId,
                'codigo'      => $sublote->nombre . '-' . str_pad($startContador, 3, '0', STR_PAD_LEFT),
                'descripcion' => null,
                'estado'      => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
        }

        return $palmas;
    }

    private function insertChunked(array $palmas): void
    {
        foreach (array_chunk($palmas, self::CHUNK_SIZE) as $chunk) {
            Palma::insert($chunk);
        }
    }

    private function updateCounters(Sublote $sublote, ?int $lineaId): void
    {
        $sublote->update(['cantidad_palmas' => $sublote->palmas()->count()]);

        if ($lineaId) {
            Linea::where('id', $lineaId)->update([
                'cantidad_palmas' => Palma::where('linea_id', $lineaId)->count(),
            ]);
        }
    }
}
```

### 3.2 `app/Jobs/CrearPalmasJob.php` (NUEVO)

```php
<?php

namespace App\Jobs;

use App\Models\Sublote;
use App\Services\PalmaCreationService;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class CrearPalmasJob implements ShouldQueue, ShouldBeUnique
{
    use Queueable, Batchable;

    public int $timeout = 300; // 5 minutos para inserts muy grandes
    public int $tries   = 1;  // No reintentar — evitar palmas duplicadas

    public function __construct(
        public int  $tenantId,
        public int  $subloteId,
        public ?int $lineaId,
        public int  $cantidad,
        public int  $userId,
    ) {}

    /**
     * ID unico para ShouldBeUnique — evita jobs duplicados para el mismo sublote.
     */
    public function uniqueId(): string
    {
        return "crear-palmas-{$this->subloteId}";
    }

    public function handle(PalmaCreationService $service): void
    {
        // Establecer contexto de tenant (no hay HTTP request en jobs)
        app()->instance('current_tenant_id', $this->tenantId);

        DB::transaction(function () use ($service) {
            $sublote = Sublote::withoutTenant()->findOrFail($this->subloteId);
            $service->createSync($sublote, $this->cantidad, $this->lineaId);
        });
    }
}
```

---

## 4. Archivos a Modificar

### 4.1 `app/Http/Controllers/Api/PalmaController.php`

**Cambios en `store()` (lineas 87-189):**

- Inyectar `PalmaCreationService` en el constructor
- Bifurcar segun cantidad:
  - `<= 5,000`: camino sync con `$service->createSync()`, retornar 201 con resumen
  - `> 5,000`: camino async con `$service->createAsync()`, retornar 202 con batch_id
- **Eliminar** la query costosa de lineas 170-174 que carga todas las palmas creadas en la respuesta
- Retornar solo resumen: `{ cantidad_creada, sublote_id, linea_id }`

**Nuevo metodo `batchStatus(string $batchId)`:**

```php
public function batchStatus(string $batchId): JsonResponse
{
    $batch = Bus::findBatch($batchId);

    if (!$batch) {
        return response()->json(['message' => 'Batch no encontrado'], 404);
    }

    return response()->json([
        'data' => [
            'id'           => $batch->id,
            'progress'     => $batch->progress(),
            'finished'     => $batch->finished(),
            'has_failures' => $batch->hasFailures(),
            'created_at'   => $batch->createdAt,
            'finished_at'  => $batch->finishedAt,
        ],
    ]);
}
```

### 4.2 `app/Http/Controllers/Api/SubloteController.php`

- **Eliminar** metodo privado `crearPalmas()` (lineas 247-275)
- Inyectar `PalmaCreationService` en el constructor
- **`store()`**: Si `cantidad <= 5000`, usar `$service->createSync()` dentro de la transaccion. Si `> 5000`, hacer commit de la transaccion primero (crear sublote), luego `$service->createAsync()`. Incluir `batch_id` en la respuesta.
- **`update()`**: Misma logica. Antes de ajustar palmas, verificar que no haya un batch activo para este sublote → retornar 409 Conflict si lo hay.

### 4.3 `app/Http/Requests/Palma/StorePalmaRequest.php`

```php
// Cambiar:
'cantidad_palmas' => 'required|integer|min:1|max:9999',
// Por:
'cantidad_palmas' => 'required|integer|min:1|max:99999',
```

### 4.4 `routes/api.php`

Agregar ruta **ANTES** de `palmas/{palma}` para evitar conflicto:

```php
// ── Palmas ──
Route::get('palmas/batch/{batchId}', [PalmaController::class, 'batchStatus'])
    ->middleware('check.permission:palmas.ver');
Route::delete('palmas/masivo', [PalmaController::class, 'destroyMasivo'])...
// ... resto de rutas existentes
```

---

## 5. Flujo Asincrono (Diagrama)

```
Frontend                    API                         Queue Worker
   |                         |                              |
   |-- POST /palmas -------->|                              |
   |  (cantidad: 50000)      |                              |
   |                         |-- valida, verifica sublote   |
   |                         |-- dispatch Bus::batch([      |
   |                         |     CrearPalmasJob            |
   |                         |   ])                         |
   |<-- 202 {batch_id} ------|                              |
   |                         |                              |
   |-- GET /palmas/batch/X ->|                              |
   |<-- {progress: 0%} ------|                              |
   |                         |                    pick up job
   |                         |                    set tenant context
   |                         |                    DB::transaction
   |                         |                    build 50,000 records
   |                         |                    insert 50 chunks x 1,000
   |                         |                    update contadores
   |                         |                    commit
   |-- GET /palmas/batch/X ->|                              |
   |<-- {progress: 100%,     |                              |
   |     finished: true} ----|                              |
   |                         |                              |
   | Frontend recarga lista de palmas                       |
```

---

## 6. Manejo de Errores Async

| Escenario | Comportamiento |
|-----------|---------------|
| Job falla | Transaccion hace rollback, `cantidad_palmas` NO se actualiza, datos consistentes |
| Frontend consulta batch | `has_failures: true`, `finished: true` — muestra error, puede reintentar |
| Job duplicado para mismo sublote | `ShouldBeUnique` rechaza el segundo job |
| Request a update() mientras job corre | Retornar 409 Conflict |

---

## 7. Configuracion del Queue Worker en Linux (Produccion)

### Opcion A: Supervisor (Recomendado)

**Instalar Supervisor:**

```bash
sudo apt update
sudo apt install supervisor -y
```

**Crear archivo de configuracion:**

```bash
sudo nano /etc/supervisor/conf.d/agro-worker.conf
```

**Contenido del archivo:**

```ini
[program:agro-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/agro_app.v2/artisan queue:work database --sleep=3 --tries=1 --timeout=300 --max-jobs=1000
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/agro_app.v2/storage/logs/worker.log
stopwaitsecs=3600
```

**Parametros importantes:**
- `command`: el comando artisan. Ruta del proyecto: `/var/www/agro_app.v2`
- `user=www-data`: el usuario de Linux que ejecuta PHP (puede ser `nginx`, `apache`, o el usuario de tu deploy)
- `numprocs=1`: un solo worker es suficiente. Subir a 2-3 si hay muchos jobs concurrentes
- `--max-jobs=1000`: el worker se reinicia despues de 1000 jobs (previene memory leaks)
- `--sleep=3`: espera 3 segundos entre chequeos cuando no hay jobs en cola
- `--timeout=300`: mata el job si tarda mas de 5 minutos

**Activar y verificar:**

```bash
# Leer la nueva configuracion
sudo supervisorctl reread

# Actualizar procesos
sudo supervisorctl update

# Iniciar el worker
sudo supervisorctl start agro-worker:*

# Verificar estado
sudo supervisorctl status

# Ver logs en tiempo real
sudo tail -f /var/www/agro_app.v2/storage/logs/worker.log
```

**Comandos utiles de Supervisor:**

```bash
# Reiniciar worker (despues de deploy)
sudo supervisorctl restart agro-worker:*

# Parar worker
sudo supervisorctl stop agro-worker:*

# Ver estado de todos los procesos
sudo supervisorctl status
```

### Opcion B: systemd (Sin instalar nada extra)

**Crear archivo de servicio:**

```bash
sudo nano /etc/systemd/system/agro-worker.service
```

**Contenido:**

```ini
[Unit]
Description=Agro App Queue Worker
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/agro_app.v2
ExecStart=/usr/bin/php artisan queue:work database --sleep=3 --tries=1 --timeout=300 --max-jobs=1000
Restart=always
RestartSec=5
StandardOutput=append:/var/www/agro_app.v2/storage/logs/worker.log
StandardError=append:/var/www/agro_app.v2/storage/logs/worker-error.log

[Install]
WantedBy=multi-user.target
```

**Activar y verificar:**

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar inicio automatico al boot
sudo systemctl enable agro-worker

# Iniciar el servicio
sudo systemctl start agro-worker

# Verificar estado
sudo systemctl status agro-worker

# Ver logs
sudo journalctl -u agro-worker -f
```

**Comandos utiles de systemd:**

```bash
# Reiniciar (despues de deploy)
sudo systemctl restart agro-worker

# Parar
sudo systemctl stop agro-worker

# Deshabilitar inicio automatico
sudo systemctl disable agro-worker
```

### Despues de Cada Deploy

Cada vez que se suba codigo nuevo al servidor, reiniciar el worker:

```bash
# Opcion 1: Desde artisan (graceful — espera que termine el job actual)
cd /var/www/agro_app.v2
php artisan queue:restart

# Opcion 2: Desde supervisor
sudo supervisorctl restart agro-worker:*

# Opcion 3: Desde systemd
sudo systemctl restart agro-worker
```

`php artisan queue:restart` es la opcion mas segura — le dice al worker que termine el job actual y luego se reinicie. No pierde jobs en proceso.

### Para desarrollo local (Windows/Laragon)

Simplemente ejecutar en una terminal:

```bash
php artisan queue:work --tries=1 --timeout=300
```

Dejar la terminal abierta mientras se desarrolla. Cerrarla cuando no se necesite.

---

## 8. Verificacion / Testing

1. **Test sync (< 5,000):** `POST /palmas` con `cantidad_palmas: 100` — debe retornar 201
2. **Test sync limite:** `POST /palmas` con `cantidad_palmas: 5000` — debe retornar 201, verificar que se insertaron todas
3. **Test async (> 5,000):** `POST /palmas` con `cantidad_palmas: 10000` — debe retornar 202 con batch_id
4. **Test batch status:** `GET /palmas/batch/{id}` — polling hasta `finished: true`
5. **Test via SubloteController:** Crear sublote con `cantidad_palmas: 20000` — sublote sync, palmas async
6. **Queue worker corriendo:** `php artisan queue:work --tries=1 --timeout=300`
7. **Test concurrencia:** Crear palmas dos veces para el mismo sublote — el segundo debe rechazarse (ShouldBeUnique)

---

## 9. Resumen de Archivos

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `app/Services/PalmaCreationService.php` | **CREAR** | Servicio con logica centralizada sync/async |
| `app/Jobs/CrearPalmasJob.php` | **CREAR** | Job de cola para inserts grandes |
| `app/Http/Controllers/Api/PalmaController.php` | **MODIFICAR** | Bifurcar sync/async, agregar batchStatus() |
| `app/Http/Controllers/Api/SubloteController.php` | **MODIFICAR** | Eliminar crearPalmas(), usar servicio |
| `app/Http/Requests/Palma/StorePalmaRequest.php` | **MODIFICAR** | max:9999 → max:99999 |
| `routes/api.php` | **MODIFICAR** | Agregar ruta GET palmas/batch/{batchId} |
