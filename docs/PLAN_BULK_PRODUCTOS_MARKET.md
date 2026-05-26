# Plan: Carga masiva de productos del proveedor (Excel + imágenes en ZIP)

## Contexto

El módulo Market del proveedor actualmente solo permite crear productos uno a uno mediante `POST /api/v1/market/proveedor/productos` ([MarketProveedorProductoController::store](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php#L129)). Esto es lento para proveedores que cargan catálogos iniciales o actualizan inventarios mensuales con decenas/cientos de productos, cada uno con imagen principal y galería.

**Objetivo:** Permitir al proveedor subir UN solo archivo ZIP que contiene un Excel (`productos.xlsx`) y una carpeta `imagenes/` con todas las fotos. El sistema procesa todo en background y reporta filas exitosas/fallidas.

**Por qué ZIP y no URLs:** Decisión del usuario. Una sola petición HTTP, sin dependencia de servicios externos, sin riesgo SSRF, y el proveedor controla todo el contenido offline antes de subirlo.

El proyecto ya tiene el patrón completo establecido para importación masiva con empleados ([ProcesarImportacionEmpleadosJob](../app/Jobs/ProcesarImportacionEmpleadosJob.php), [EmpleadoImportacionController](../app/Http/Controllers/Api/EmpleadoImportacionController.php), [ImportacionEmpleados](../app/Models/ImportacionEmpleados.php)) usando `phpoffice/phpspreadsheet ^5.7` (ya en `composer.json`). Esto se replica adaptándolo a productos + extracción de ZIP + manejo de imágenes.

## Decisiones tomadas

- **Estructura del paquete:** ZIP con `productos.xlsx` en la raíz y carpeta `imagenes/` con las fotos. En el Excel, las columnas `IMAGEN_PRINCIPAL` y `IMAGENES_GALERIA` referencian nombres de archivo dentro de `imagenes/` (galería separada por `|`).
- **Límite:** 500 filas por importación (la mitad del de empleados — cada fila pesa más por las imágenes).
- **SKUs duplicados:** Se rechaza la fila como fallida. La constraint `UNIQUE` de [market_productos.sku](../database/migrations/2026_05_07_000006_create_market_productos_table.php) hace cumplir la regla en BD; el validador la chequea antes para reportar el error legible.
- **SKU vacío en Excel:** Se autogenera con la lógica del helper existente [generarSku()](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php#L531).

## Estructura del ZIP (formato que recibe el proveedor)

```
catalogo.zip
├── productos.xlsx
└── imagenes/
    ├── tomate-cherry-001.jpg
    ├── tomate-cherry-001-b.jpg
    ├── papa-pastusa-002.png
    └── ...
```

## Columnas del Excel (`productos.xlsx`)

| Col | Campo                | Tipo / Reglas                                                                    |
|-----|----------------------|----------------------------------------------------------------------------------|
| A   | NOMBRE               | required, string, max:150                                                        |
| B   | DESCRIPCION          | required, text                                                                   |
| C   | CATEGORIA_ID         | required, exists:market_categorias,id                                            |
| D   | UNIDAD_MEDIDA_ID     | required, exists:market_unidades_medida,id                                       |
| E   | PRECIO_UNITARIO      | required, numeric, min:0, max:9999999999.99                                      |
| F   | STOCK_DISPONIBLE     | required, integer, min:0                                                         |
| G   | STOCK_MINIMO         | nullable, integer, min:0                                                         |
| H   | SKU                  | nullable, string, max:50, unique en market_productos (autogenerado si vacío)     |
| I   | ESTADO               | nullable, in:activo,inactivo,agotado (default: activo)                           |
| J   | DESTACADO            | nullable, boolean (1/0, true/false, si/no)                                       |
| K   | ESPECIFICACIONES     | nullable, formato `clave1:valor1\|clave2:valor2` → se convierte a array JSON     |
| L   | IMAGEN_PRINCIPAL     | nullable, nombre de archivo dentro de `imagenes/` (ej: `tomate1.jpg`)            |
| M   | IMAGENES_GALERIA     | nullable, lista separada por `\|` (ej: `tomate1b.jpg\|tomate1c.jpg`)             |

## Archivos a crear

### 1. Migración: `importaciones_productos`
**Ruta:** `database/migrations/YYYY_MM_DD_HHMMSS_create_importaciones_productos_table.php`

Réplica de la migración de empleados, pero con `proveedor_id` en lugar de `tenant_id`:

```php
$table->id();
$table->foreignId('proveedor_id')->constrained('market_proveedores')->cascadeOnDelete();
$table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
$table->string('nombre_archivo_original');
$table->string('archivo_path');                              // ZIP almacenado
$table->unsignedInteger('total_filas')->default(0);
$table->unsignedInteger('filas_exitosas')->default(0);
$table->unsignedInteger('filas_fallidas')->default(0);
$table->string('estado', 20)->default('PENDIENTE');
$table->jsonb('resultados')->nullable();
$table->text('error_fatal')->nullable();
$table->timestamp('iniciado_at')->nullable();
$table->timestamp('finalizado_at')->nullable();
$table->timestamps();
$table->index(['proveedor_id', 'estado']);
```

### 2. Modelo: `ImportacionProductos`
**Ruta:** `app/Models/Market/ImportacionProductos.php`

Réplica de [ImportacionEmpleados](../app/Models/ImportacionEmpleados.php), pero:
- Sin `BelongsToTenant`.
- Filtrado por `proveedor_id` en el controller (`app('current_proveedor_id')`).
- Constantes de estado idénticas: `PENDIENTE`, `PROCESANDO`, `COMPLETADO`, `CON_ERRORES`, `FALLIDO`.

### 3. FormRequest: `ImportarProductosRequest`
**Ruta:** `app/Http/Requests/Market/ImportarProductosRequest.php`

```php
public function rules(): array {
    return [
        'archivo' => ['required', 'file', 'mimes:zip', 'max:51200'], // 50 MB
    ];
}
```

### 4. Controller: `MarketProveedorProductoImportController`
**Ruta:** `app/Http/Controllers/Api/Market/MarketProveedorProductoImportController.php`

Tres endpoints:

- **`importar(ImportarProductosRequest)`** — Guarda el ZIP en `storage/app/private/market/importaciones/{proveedorId}/{Ymd_His}_{uuid}.zip`, crea registro `ImportacionProductos` con estado `PENDIENTE`, despacha `ProcesarImportacionProductosJob`, retorna 202 con `importacion_id`.

- **`estado(ImportacionProductos)`** — Verifica que la importación pertenece al proveedor actual (`app('current_proveedor_id')`) y retorna su estado completo (resultados, contadores).

- **`descargarPlantilla()`** — Genera con PhpSpreadsheet un Excel vacío con las cabeceras de las 13 columnas y una fila de ejemplo. Esto reduce errores del usuario. Retorna el archivo como descarga.

### 5. Job: `ProcesarImportacionProductosJob`
**Ruta:** `app/Jobs/ProcesarImportacionProductosJob.php`

Sigue el esqueleto de [ProcesarImportacionEmpleadosJob](../app/Jobs/ProcesarImportacionEmpleadosJob.php), con estos pasos:

1. **Marcar `PROCESANDO`** + `iniciado_at`.
2. **Extraer ZIP** con `ZipArchive` (extensión PHP built-in) a un directorio temporal:
   `storage/app/private/market/importaciones/{proveedorId}/tmp_{uuid}/`
3. **Validar estructura del ZIP:**
   - Existe `productos.xlsx` en la raíz.
   - Existe la carpeta `imagenes/`.
   - Si falla algo: `FALLIDO` + `error_fatal` y abortar.
4. **Cargar Excel** con `IOFactory::load()`, descartar cabecera y filas vacías (mismo filtro que empleados).
5. **Validar límite:** si `count($rows) > 500` → `FALLIDO` + `error_fatal`.
6. **Procesar en chunks de 50 filas** (más pequeño que empleados porque cada fila involucra I/O de imágenes):
   - Por cada fila → `mapRow()` → `validate()`.
   - Si OK → `processProducto()`:
     - Validar que los archivos referenciados (`IMAGEN_PRINCIPAL`, `IMAGENES_GALERIA`) existen en `tmp_{uuid}/imagenes/`.
     - Validar mimetype (jpg/jpeg/png/webp) y tamaño (≤3 MB cada una).
     - Copiar a `storage/app/public/market/productos/{proveedorId}/{uuid}.{ext}` con `Storage::disk('public')->putFileAs()`.
     - Generar URLs públicas con `Storage::disk('public')->url()`.
     - **Dentro de `DB::transaction`**: crear `MarketProducto` + crear N `MarketProductoImagen` con `orden` ascendente.
     - Si la transacción falla: eliminar las imágenes ya copiadas a `public/` (cleanup manual, porque storage no es transaccional).
   - Acumular resultado en `resultados[]` con shape `{fila, estado, sku, mensaje}`.
   - Actualizar contadores en BD después de cada chunk.
7. **Estado final:** `COMPLETADO` si todas exitosas, `CON_ERRORES` si hubo fallos parciales, `FALLIDO` si excepción global.
8. **Limpieza:** Borrar el directorio temporal `tmp_{uuid}/` (siempre, en `finally`).
9. **Registrar auditoría** con `AuditoriaService` (ver patrón en [MarketProveedorProductoController::store](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php#L163)).
10. **`failed(Throwable)`:** marcar `FALLIDO` y limpiar tmp si quedó.

**Reutilización clave:**
- Helper `generarSku($proveedorId)` — copiar la lógica de [MarketProveedorProductoController::generarSku](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php#L531) al Job (o extraer a un Service `MarketProductoSkuGenerator`).
- Storage paths idénticos a [MarketProveedorProductoController::storeImagen](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php#L386): `market/productos/{proveedorId}/{uuid}.{ext}`.

### 6. Rutas
**Ruta:** `routes/api.php`, dentro del grupo `auth:api + SetProveedor` (después de la línea 753).

```php
// Importación masiva de productos
Route::post  ('productos/importar',                    [MarketProveedorProductoImportController::class, 'importar']);
Route::get   ('productos/importaciones/{importacion}', [MarketProveedorProductoImportController::class, 'estado']);
Route::get   ('productos/importar/plantilla',          [MarketProveedorProductoImportController::class, 'descargarPlantilla']);
```

Prefijo completo del grupo: `/api/v1/market/proveedor/productos/...`

## Manejo de errores en fila (ejemplos de mensajes)

- `"SKU 'TOMATE-001' ya existe en el catálogo"` — Antes de crear, el validador chequea unicidad.
- `"La imagen 'tomate1.jpg' no se encuentra en la carpeta imagenes/ del ZIP"` — Validación de existencia.
- `"La imagen 'foto.bmp' tiene un formato inválido. Permitidos: jpg, jpeg, png, webp"` — Validación de mimetype.
- `"La imagen 'producto.jpg' excede los 3 MB"` — Validación de tamaño.
- `"La categoría con ID 99 no existe"` — Validación de FK.

## Verificación end-to-end

1. **Aplicar migración:** `php artisan migrate` (verificar tabla `importaciones_productos`).
2. **Descargar plantilla:** `GET /api/v1/market/proveedor/productos/importar/plantilla` con token JWT de proveedor → debe descargar `plantilla_productos.xlsx`.
3. **Preparar ZIP de prueba:**
   - Llenar el Excel con 3 filas: 1 válida con 2 imágenes, 1 con SKU duplicado, 1 con imagen faltante.
   - Empacar en `test.zip` junto a `imagenes/`.
4. **Importar:** `POST /api/v1/market/proveedor/productos/importar` (multipart, campo `archivo`) → debe devolver 202 con `importacion_id`.
5. **Verificar worker:** levantar la queue con `php artisan queue:work` → el job debe ejecutarse en background.
6. **Consultar estado:** `GET /api/v1/market/proveedor/productos/importaciones/{id}` cada par de segundos hasta `COMPLETADO`/`CON_ERRORES`.
7. **Verificar BD:**
   - `market_productos` tiene la fila válida con `imagen_principal` apuntando a URL pública.
   - `market_producto_imagenes` tiene 1 entrada extra para la imagen de galería.
   - Las imágenes existen físicamente en `storage/app/public/market/productos/{proveedorId}/`.
   - El symlink `public/storage/...` sirve las imágenes en el navegador.
8. **Verificar limpieza:** El directorio `storage/app/private/market/importaciones/{proveedorId}/tmp_*/` ya no existe.
9. **Verificar auditoría:** Una nueva entrada en la tabla `auditoria` con `accion=IMPORTACION_MASIVA` y `modulo=MARKET_PRODUCTOS`.
10. **Verificar reporte de fallos:** El campo `resultados` muestra las 2 filas fallidas con mensajes legibles.

## Archivos críticos (lecturas obligadas antes de implementar)

- [app/Http/Controllers/Api/EmpleadoImportacionController.php](../app/Http/Controllers/Api/EmpleadoImportacionController.php) — Patrón del controller (storeAs, dispatch, response 202).
- [app/Jobs/ProcesarImportacionEmpleadosJob.php](../app/Jobs/ProcesarImportacionEmpleadosJob.php) — Patrón del job (chunks, processChunk, mapRow, makeValidator, failed, auditoría).
- [app/Models/ImportacionEmpleados.php](../app/Models/ImportacionEmpleados.php) — Patrón del modelo (estados, casts).
- [app/Http/Controllers/Api/Market/MarketProveedorProductoController.php](../app/Http/Controllers/Api/Market/MarketProveedorProductoController.php) — Reglas de validación (vía StoreMarketProductoRequest), helpers `uploadImagenPrincipal`, `eliminarImagen`, `generarSku`.
- [database/migrations/2026_05_07_000006_create_market_productos_table.php](../database/migrations/2026_05_07_000006_create_market_productos_table.php) — Schema de productos.
- [database/migrations/2026_05_07_000007_create_market_producto_imagenes_table.php](../database/migrations/2026_05_07_000007_create_market_producto_imagenes_table.php) — Schema de imágenes.

## Notas técnicas

- **No usar maatwebsite/excel** — el proyecto ya usa `phpoffice/phpspreadsheet` directo (decisión arquitectónica establecida).
- **`ZipArchive` es nativo de PHP** — no requiere dependencias adicionales. Confirmar que la extensión `zip` está habilitada en el `php.ini` de producción.
- **Timeout del job:** Subir a `600` (10 min) — `phpspreadsheet` + extracción de ZIP + I/O de imágenes es más lento que solo Excel.
- **Memoria del job:** Considerar `chunk(50)` y `unset()` de variables grandes en cada iteración para evitar OOM con ZIPs grandes.
- **Almacenamiento del ZIP fuente:** se mantiene en disco `local` (privado) por si se necesita reprocesar o auditar. Considerar job de limpieza después de 30 días.
