# Plan — Paramétricas del Colaborador (EPS, Fondos de Pensión, ARL, Entidades Bancarias)

## 1. Contexto

El modelo `Empleado` (en [app/Models/Empleado.php](../app/Models/Empleado.php)) guarda
hoy estos cuatro campos como texto libre:

- `eps`
- `fondo_pension`
- `arl`
- `entidad_bancaria`

Eso obliga al frontend a escribirlos a mano en cada creación/edición y abre la
puerta a inconsistencias (`"SURA"`, `"Sura"`, `"sura eps"`, etc.).

La meta es exponer **catálogos paramétricos por tenant** para esos cuatro
campos, alimentar el formulario del colaborador con dropdowns, pero **mantener
la columna del empleado como string** (se guarda el `nombre`, no el `id`). Esto
preserva el histórico aunque más tarde se renombre/elimine la paramétrica y
evita migrar el campo a `*_id` con FK.

Reglas a respetar:

- **Multi-tenant**: cada finca tiene su propio set, igual que `motivos_ausencia`,
  `tipos_hora_extra`, `cargos`, `modalidades_contrato`. Trait `BelongsToTenant`.
- **Permiso de escritura**: `configuracion.editar` (CRUD).
- **Permiso de lectura para selects del wizard de colaboradores**:
  `configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar`
  (mismo patrón que `cargos/select` y `modalidades/select`).
- **Auditoría**: `AuditoriaService::registrarCreacion / registrarEdicion / registrarEliminacion`
  en cada mutación.
- **Try-catch + Log::error** en cada método (patrón `MotivoAusenciaController`).
- **Provisionamiento al crear tenant**: el `Admin\TenantController::store()` debe
  sembrar las cuatro paramétricas para el tenant nuevo, igual que ya hace con
  `PrecioPalma::TIPOS`.

---

## 2. Decisiones de diseño

| Tema | Decisión | Justificación |
|------|----------|---------------|
| Estructura de la tabla | `id`, `tenant_id`, `nombre`, `estado` (boolean), `timestamps` | Mismo patrón que `motivos_ausencia`. El usuario solo pidió `id, nombre, status, timestamps`; agregamos `tenant_id` por multi-tenancy. **Nota**: el campo se llama `estado` (boolean, no `status`) para alinearse con la convención del proyecto — todos los demás modelos usan `estado`. |
| Unicidad | `unique(['tenant_id', 'nombre'])` | Evita duplicados por tenant; permite el mismo nombre entre tenants distintos. |
| Empleado guarda el `nombre` | El `EmpleadoController` no cambia: sigue recibiendo y persistiendo `eps`, `fondo_pension`, `arl`, `entidad_bancaria` como string. Las paramétricas son solo fuente del dropdown. | Requisito explícito del usuario; preserva histórico. |
| Sin FK desde `empleados` | No se agrega `eps_id`, `arl_id`, etc. | Ídem — y mantiene el módulo de empleados desacoplado del catálogo. |
| Provisionamiento al crear tenant | Inline en `TenantController::store()` con un helper `seedParametricas(Tenant $tenant)` privado, que itera sobre las 4 listas constantes definidas en cada modelo (`Eps::INICIALES`, `FondoPension::INICIALES`, etc.) | Mantiene el patrón existente de `PrecioPalma::TIPOS` sin sobreingeniería. No introducimos un `TenantBootstrapService` porque por ahora son 5 tablas; si en el futuro crece, se extrae. |
| Seeder global | Un único `ParametricasColaboradorSeeder` que itera sobre todos los tenants `ACTIVO` y aplica `updateOrCreate(['tenant_id', 'nombre'], …)` para cada paramétrica. Idempotente. | Mismo patrón que `MotivoAusenciaSeeder` y `TipoHoraExtraSeeder`. |
| Nombres de endpoints | `/eps`, `/fondos-pension`, `/arl`, `/entidades-bancarias` (kebab-case en plural, sigue convención del proyecto) | Consistente con `motivos-ausencia`, `tipos-hora-extra`, `precios-cosecha`. |
| Borrado | `delete()` físico, sin protección por uso (ya que `empleados` guarda el nombre como string, no hay FK que valide). El admin asume la responsabilidad. | Igual que `MotivoAusenciaController` solo bloquea si hay relaciones; aquí no hay relación. |

---

## 3. Archivos a crear / modificar

### 3.1 Migraciones (4 archivos nuevos)

Path: `database/migrations/2026_04_27_000001_create_eps_table.php`
Path: `database/migrations/2026_04_27_000002_create_fondos_pension_table.php`
Path: `database/migrations/2026_04_27_000003_create_arl_table.php`
Path: `database/migrations/2026_04_27_000004_create_entidades_bancarias_table.php`

Plantilla común (sustituir `eps` por la tabla correspondiente):

```php
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nombre', 100);
            $table->boolean('estado')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'nombre']);
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eps');
    }
};
```

### 3.2 Modelos (4 archivos nuevos)

| Path | Tabla | Constante de seed |
|------|-------|-------------------|
| `app/Models/Eps.php` | `eps` | `Eps::INICIALES` |
| `app/Models/FondoPension.php` | `fondos_pension` | `FondoPension::INICIALES` |
| `app/Models/Arl.php` | `arl` | `Arl::INICIALES` |
| `app/Models/EntidadBancaria.php` | `entidades_bancarias` | `EntidadBancaria::INICIALES` |

Plantilla común:

```php
namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Eps extends Model
{
    use BelongsToTenant;

    protected $table = 'eps';

    protected $fillable = ['tenant_id', 'nombre', 'estado'];

    protected function casts(): array
    {
        return ['estado' => 'boolean'];
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public const INICIALES = [
        'Sura', 'Sanitas', 'Compensar', 'Salud Total', 'Famisanar',
        'Nueva EPS', 'Aliansalud', 'Mutual Ser', 'Coosalud', 'Asmet Salud',
        'Capital Salud', 'Cajacopi Atlántico', 'Comfachocó', 'Comfaoriente',
        'Pijaos Salud', 'EPS Familiar de Colombia', 'Savia Salud',
    ];
}
```

`Arl::INICIALES`:
```
Sura, Positiva, Colmena Seguros, Bolívar, AXA Colpatria, La Equidad,
Liberty, Mapfre, Seguros Alfa
```

`FondoPension::INICIALES`:
```
Porvenir, Protección, Colfondos, Skandia, Colpensiones
```

`EntidadBancaria::INICIALES`:
```
Bancolombia, Davivienda, Banco de Bogotá, BBVA, Banco Popular,
Banco AV Villas, Banco Caja Social, Banco Falabella, Banco Pichincha,
Citibank, Itaú, Scotiabank Colpatria, Banco Agrario, Banco GNB Sudameris,
Banco Cooperativo Coopcentral, Banco W, Bancamía, Bancoomeva, Nequi,
Daviplata, Movii, RappiPay, Lulo Bank
```

> Las listas son punto de partida y el ADMIN del tenant puede ajustarlas.

### 3.3 FormRequests (8 archivos nuevos — Store + Update por paramétrica)

Path: `app/Http/Requests/Eps/StoreEpsRequest.php`, `UpdateEpsRequest.php`
(y similar para `FondoPension`, `Arl`, `EntidadBancaria`).

Plantilla Store:

```php
namespace App\Http\Requests\Eps;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEpsRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $tenantId = app('current_tenant_id');

        return [
            'nombre' => [
                'required', 'string', 'max:100',
                Rule::unique('eps', 'nombre')->where('tenant_id', $tenantId),
            ],
            'estado' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.unique'   => 'Ya existe una EPS con este nombre.',
        ];
    }
}
```

Plantilla Update:

```php
public function rules(): array
{
    $tenantId = app('current_tenant_id');
    $epsId    = $this->route('ep')->id ?? $this->route('eps');

    return [
        'nombre' => [
            'sometimes', 'string', 'max:100',
            Rule::unique('eps', 'nombre')
                ->where('tenant_id', $tenantId)
                ->ignore($epsId),
        ],
        'estado' => 'sometimes|boolean',
    ];
}
```

### 3.4 Controllers (4 archivos nuevos)

Path: `app/Http/Controllers/Api/EpsController.php`, `FondoPensionController.php`, `ArlController.php`, `EntidadBancariaController.php`.

Cada uno expone:

```php
public function select(Request $request): JsonResponse           // dropdown del form de colaboradores
public function index(Request $request): JsonResponse            // listado paginado (configuración)
public function show(Eps $eps): JsonResponse
public function store(StoreEpsRequest $request): JsonResponse
public function update(UpdateEpsRequest $request, Eps $eps): JsonResponse
public function destroy(Request $request, Eps $eps): JsonResponse
```

Plantilla del controller (siguiendo `MotivoAusenciaController` exacto):

```php
class EpsController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $items = Eps::query()
                ->activos()
                ->orderBy('nombre')
                ->get(['id', 'nombre']);
            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('Error en eps/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = Eps::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $items->items(),
                'meta' => [
                    'current_page' => $items->currentPage(),
                    'last_page'    => $items->lastPage(),
                    'per_page'     => $items->perPage(),
                    'total'        => $items->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Eps $ep): JsonResponse
    {
        return response()->json(['data' => $ep]);
    }

    public function store(StoreEpsRequest $request): JsonResponse
    {
        try {
            $eps = Eps::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'EPS', $eps,
                "Se creó la EPS '{$eps->nombre}'"
            );

            return response()->json([
                'message' => 'EPS creada correctamente',
                'data'    => $eps,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateEpsRequest $request, Eps $ep): JsonResponse
    {
        try {
            $datosAnteriores = $ep->toArray();
            $ep->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'EPS', $ep, $datosAnteriores,
                "Se editó la EPS '{$ep->nombre}'"
            );

            return response()->json([
                'message' => 'EPS actualizada correctamente',
                'data'    => $ep->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la EPS', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Eps $ep): JsonResponse
    {
        try {
            $this->auditoria->registrarEliminacion(
                $request, 'EPS', $ep,
                "Se eliminó la EPS '{$ep->nombre}'"
            );
            $ep->delete();

            return response()->json(['message' => "EPS '{$ep->nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar EPS: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la EPS', 'error' => $e->getMessage()], 500);
        }
    }
}
```

> Nota: route-model binding usa el singular `eps` → `Eps $ep` (Laravel
> singulariza `eps` raro porque ya termina en `s`; declarar `Route::resource`
> binding `'ep'` o usar `Route::model('eps', Eps::class)`). Para el resto de
> paramétricas no hay problema (`fondoPension`, `arl`, `entidadBancaria`).

### 3.5 Rutas — `routes/api.php`

**Imports al top:**
```php
use App\Http\Controllers\Api\EpsController;
use App\Http\Controllers\Api\FondoPensionController;
use App\Http\Controllers\Api\ArlController;
use App\Http\Controllers\Api\EntidadBancariaController;
```

**Selects (dropdowns del wizard de Colaboradores)** — agregar antes del bloque
de "TABLAS PARAMÉTRICAS" (línea ~376), junto a `cargos/select`:

```php
// ── Paramétricas del colaborador (dropdowns del form) ──
Route::get('eps/select', [EpsController::class, 'select'])
    ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
Route::get('fondos-pension/select', [FondoPensionController::class, 'select'])
    ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
Route::get('arl/select', [ArlController::class, 'select'])
    ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
Route::get('entidades-bancarias/select', [EntidadBancariaController::class, 'select'])
    ->middleware('check.permission:configuracion.editar,colaboradores.ver,colaboradores.crear,colaboradores.editar');
```

**CRUD** — agregar dentro del grupo `check.permission:configuracion.editar`
(líneas 380-454), después de `Tipos de Hora Extra`:

```php
// ── EPS ──
Route::get('eps', [EpsController::class, 'index']);
Route::get('eps/{ep}', [EpsController::class, 'show']);
Route::post('eps', [EpsController::class, 'store']);
Route::put('eps/{ep}', [EpsController::class, 'update']);
Route::delete('eps/{ep}', [EpsController::class, 'destroy']);

// ── Fondos de Pensión ──
Route::get('fondos-pension', [FondoPensionController::class, 'index']);
Route::get('fondos-pension/{fondoPension}', [FondoPensionController::class, 'show']);
Route::post('fondos-pension', [FondoPensionController::class, 'store']);
Route::put('fondos-pension/{fondoPension}', [FondoPensionController::class, 'update']);
Route::delete('fondos-pension/{fondoPension}', [FondoPensionController::class, 'destroy']);

// ── ARL ──
Route::get('arl', [ArlController::class, 'index']);
Route::get('arl/{arl}', [ArlController::class, 'show']);
Route::post('arl', [ArlController::class, 'store']);
Route::put('arl/{arl}', [ArlController::class, 'update']);
Route::delete('arl/{arl}', [ArlController::class, 'destroy']);

// ── Entidades Bancarias ──
Route::get('entidades-bancarias', [EntidadBancariaController::class, 'index']);
Route::get('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'show']);
Route::post('entidades-bancarias', [EntidadBancariaController::class, 'store']);
Route::put('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'update']);
Route::delete('entidades-bancarias/{entidadBancaria}', [EntidadBancariaController::class, 'destroy']);
```

### 3.6 Seeder — `database/seeders/ParametricasColaboradorSeeder.php`

```php
class ParametricasColaboradorSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('estado', 'ACTIVO')->get();

        $catalogos = [
            [Eps::class,             Eps::INICIALES],
            [FondoPension::class,    FondoPension::INICIALES],
            [Arl::class,             Arl::INICIALES],
            [EntidadBancaria::class, EntidadBancaria::INICIALES],
        ];

        foreach ($tenants as $tenant) {
            foreach ($catalogos as [$modelClass, $nombres]) {
                foreach ($nombres as $nombre) {
                    $modelClass::updateOrCreate(
                        ['tenant_id' => $tenant->id, 'nombre' => $nombre],
                        ['estado' => true],
                    );
                }
            }
        }

        $this->command->info(' ✓ ParametricasColaboradorSeeder');
    }
}
```

Registrar en `DatabaseSeeder.php` después de `TipoHoraExtraSeeder`:

```php
$this->call(ParametricasColaboradorSeeder::class);
```

### 3.7 Provisionamiento al crear tenant — `Admin\TenantController::store()`

Modificación dentro de la transacción, después del `foreach (PrecioPalma::TIPOS …)`:

```php
$this->seedParametricasColaborador($tenant);
```

Y método privado en el mismo controller:

```php
private function seedParametricasColaborador(Tenant $tenant): void
{
    $catalogos = [
        [Eps::class,             Eps::INICIALES],
        [FondoPension::class,    FondoPension::INICIALES],
        [Arl::class,             Arl::INICIALES],
        [EntidadBancaria::class, EntidadBancaria::INICIALES],
    ];

    foreach ($catalogos as [$modelClass, $nombres]) {
        foreach ($nombres as $nombre) {
            $modelClass::create([
                'tenant_id' => $tenant->id,
                'nombre'    => $nombre,
                'estado'    => true,
            ]);
        }
    }
}
```

> Aquí no hace falta `updateOrCreate` porque el tenant es nuevo. Está dentro
> de la transacción de `store()`, así que si falla algo, todo rolea atrás.

### 3.8 Documentación — actualizar `docs/API_COLABORADORES.md`

Agregar al final, antes de "Códigos de Error", una sección nueva:

```markdown
---

## Paramétricas del Colaborador (dropdowns del formulario)

Estos endpoints alimentan los selectores de EPS, fondo de pensión, ARL y
entidad bancaria del formulario de creación/edición de colaboradores. **No**
forman parte del módulo de colaboradores: la edición del catálogo se hace
desde Configuración (permiso `configuracion.editar`). El colaborador guarda
el **nombre** seleccionado, no el `id`.

### Endpoints

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/eps/select` | `configuracion.editar` o `colaboradores.{ver|crear|editar}` |
| GET | `/fondos-pension/select` | idem |
| GET | `/arl/select` | idem |
| GET | `/entidades-bancarias/select` | idem |

Todos siguen el mismo formato de respuesta:

\`\`\`json
{
  "data": [
    { "id": 1, "nombre": "Sura" },
    { "id": 2, "nombre": "Sanitas" }
  ]
}
\`\`\`

### Comportamiento

- Devuelven **solo activos** (sin opción de incluir inactivos — son selectores
  para llenar formularios).
- Sin paginación.
- Ordenados alfabéticamente por `nombre`.
- El frontend toma el `nombre` del item seleccionado y lo envía en el campo
  correspondiente del payload de `POST /colaboradores` (`eps`, `fondo_pension`,
  `arl`, `entidad_bancaria`).

> Para el CRUD completo de estas paramétricas (crear/editar/eliminar el
> catálogo), ver `docs/API_PARAMETRICAS.md`.
```

> **Decisión documental**: el CRUD completo de las 4 paramétricas se documenta
> en `docs/API_PARAMETRICAS.md` (que ya existe en el repo) o en un archivo
> nuevo `docs/API_PARAMETRICAS_COLABORADOR.md` si se prefiere mantenerlo
> aparte. Confirmar con el usuario al implementar.

---

## 4. Resumen de archivos

| # | Acción | Path |
|---|--------|------|
| 1 | Crear | `database/migrations/2026_04_27_000001_create_eps_table.php` |
| 2 | Crear | `database/migrations/2026_04_27_000002_create_fondos_pension_table.php` |
| 3 | Crear | `database/migrations/2026_04_27_000003_create_arl_table.php` |
| 4 | Crear | `database/migrations/2026_04_27_000004_create_entidades_bancarias_table.php` |
| 5 | Crear | `app/Models/Eps.php` |
| 6 | Crear | `app/Models/FondoPension.php` |
| 7 | Crear | `app/Models/Arl.php` |
| 8 | Crear | `app/Models/EntidadBancaria.php` |
| 9-16 | Crear | `app/Http/Requests/{Eps,FondoPension,Arl,EntidadBancaria}/{Store,Update}*Request.php` (8 archivos) |
| 17 | Crear | `app/Http/Controllers/Api/EpsController.php` |
| 18 | Crear | `app/Http/Controllers/Api/FondoPensionController.php` |
| 19 | Crear | `app/Http/Controllers/Api/ArlController.php` |
| 20 | Crear | `app/Http/Controllers/Api/EntidadBancariaController.php` |
| 21 | Modificar | `routes/api.php` (4 imports + 4 selects + 4 bloques CRUD) |
| 22 | Crear | `database/seeders/ParametricasColaboradorSeeder.php` |
| 23 | Modificar | `database/seeders/DatabaseSeeder.php` (1 línea: `$this->call(...)`) |
| 24 | Modificar | `app/Http/Controllers/Api/Admin/TenantController.php` (método privado + 1 llamada) |
| 25 | Modificar | `docs/API_COLABORADORES.md` (sección de paramétricas) |
| 26 | (Opcional) Crear | `docs/API_PARAMETRICAS_COLABORADOR.md` con el CRUD completo |

**Total: 22 archivos nuevos, 3 modificados.**

---

## 5. Verificación end-to-end

1. **Migraciones:**
   ```bash
   php artisan migrate
   ```
   Debe crear las 4 tablas sin errores. Verificar con `\dt eps fondos_pension arl entidades_bancarias` en psql.

2. **Seeder:**
   ```bash
   php artisan db:seed --class=ParametricasColaboradorSeeder
   ```
   Debe poblar 4 catálogos × N tenants ACTIVO. Re-correr para validar idempotencia (no debe duplicar).

3. **Selects:**
   ```bash
   curl -H "Authorization: Bearer $JWT" -H "X-Tenant-Id: 1" \
        "http://agro_app.v2.test/api/v1/tenant/eps/select"
   ```
   Debe devolver `{"data":[{"id":1,"nombre":"Sura"}, …]}`.

4. **CRUD:** crear, editar y eliminar una EPS desde Postman con un usuario que tenga `configuracion.editar`. Verificar:
   - Auditoría registrada (`SELECT * FROM auditorias WHERE modulo='EPS' ORDER BY id DESC LIMIT 5;`)
   - Unicidad por tenant (no permite dos EPS con el mismo nombre en el mismo tenant)
   - Tenant aislado (con `X-Tenant-Id: 2` no ve las del tenant 1)

5. **Provisionamiento:** crear un tenant nuevo desde el endpoint super-admin
   `POST /api/admin/tenants` y verificar que las 4 paramétricas aparezcan
   automáticamente para el nuevo tenant.

6. **Frontend dropdown smoke test:** consumir `/eps/select` desde el wizard de
   colaboradores, seleccionar uno, enviar `POST /colaboradores` y verificar
   que el campo `eps` del empleado quedó con el `nombre` (no el `id`).

---

## 6. Riesgos y notas

- **Empleados existentes**: hoy ya hay empleados con texto libre en `eps`,
  `fondo_pension`, `arl`, `entidad_bancaria`. La migración **no toca** esos
  datos (solo crea tablas nuevas). El frontend debe permitir que un valor
  legacy que no esté en el catálogo siga viéndose. Recomendación: si en el
  futuro se quiere normalizar, correr un script aparte que inserte los
  valores únicos existentes en cada catálogo.
- **Listas iniciales**: las constantes `INICIALES` son un punto de partida
  basado en EPS/ARL/fondos/bancos vigentes en Colombia a 2026. El admin del
  tenant es responsable de mantenerlas al día (ej: si una EPS se liquida).
- **Borrado físico sin protección**: ya que `empleados` no tiene FK a estas
  tablas, eliminar una EPS NO afecta empleados existentes (siguen con el
  string que tenían). Es responsabilidad del admin no eliminar opciones que
  se sigan usando si quiere mantener consistencia.
- **`Eps` como nombre de modelo**: el route-model binding singulariza raro
  (`eps` → `ep`). Por claridad, declarar el binding explícito en el `Route`
  o usar `Route::model('ep', Eps::class)` en el `RouteServiceProvider`.

---

## 7. Estimación de esfuerzo

- Migraciones + modelos: 30 min
- FormRequests: 30 min
- Controllers: 1 h (4 controllers casi idénticos, copy-paste con ajuste de nombres)
- Rutas: 15 min
- Seeder: 15 min
- TenantController.store() ajuste: 15 min
- Documentación: 30 min
- Pruebas manuales (Postman + Tinker): 30 min

**Total estimado: ~3.5 h.**
