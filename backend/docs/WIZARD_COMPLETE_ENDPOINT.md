# Backend: endpoint `wizard-complete` para NuevoTerceroWizard

## Contexto

El wizard de creación de terceros (`/configuracion/terceros/nuevo`) actualmente genera
**~15 peticiones POST simultáneas** al guardar: una por cada lote de cosecha, cada rango
de abono, cada labor y cada operario. El frontend ya fue actualizado para consumir un
nuevo endpoint bulk; este documento describe qué implementar en el backend.

---

## 1. Ruta nueva — `routes/api.php`

Añadir **antes** del cierre del grupo de terceros (actualmente ~línea 760):

```php
// Después de la última ruta de precios-abono:
Route::delete('terceros/{tercero}/precios-abono/{precio}', [TerceroConfiguracionController::class, 'destroyPrecioAbono']);

// NUEVO — debe ir aquí:
Route::post('terceros/{tercero}/wizard-complete', [TerceroConfiguracionController::class, 'wizardComplete']);
```

**Permiso:** hereda `configuracion.editar` del grupo padre (igual que el resto de terceros).

---

## 2. Método nuevo — `TerceroConfiguracionController::wizardComplete()`

Archivo: `app/Http/Controllers/Api/TerceroConfiguracionController.php`

### 2.1 Payload esperado

```json
{
  "precios_cosecha": [
    { "lote_id": 2, "precio": 180.00 }
  ],
  "precios_abono": [
    { "gramos_min": 0,   "gramos_max": 150,  "precio_palma": 55.00 },
    { "gramos_min": 151, "gramos_max": 500,  "precio_palma": 45.00 }
  ],
  "labor_precios": [
    { "labor_id": 3, "precio_palma": 60.00, "tipo_pago": "POR_PALMA" },
    { "labor_id": 7, "precio_palma": 60000.00 }
  ],
  "operarios": [
    { "nombres": "Carlos", "apellidos": "Ramírez", "cedula": "87654321", "cargo": "Cosechero", "eps": "Sura", "arl": "Positiva" }
  ]
}
```

Todos los arrays son opcionales (pueden llegar vacíos `[]`).

### 2.2 Validación de reglas

```php
$data = $request->validate([
    // Cosecha
    'precios_cosecha'              => 'nullable|array',
    'precios_cosecha.*.lote_id'    => 'required|exists:lotes,id',
    'precios_cosecha.*.precio'     => 'required|numeric|min:0|max:99999999.99',

    // Abono
    'precios_abono'                => 'nullable|array',
    'precios_abono.*.gramos_min'   => 'required|numeric|min:0',
    'precios_abono.*.gramos_max'   => 'required|numeric|gt:precios_abono.*.gramos_min',
    'precios_abono.*.precio_palma' => 'required|numeric|min:0|max:99999999.99',

    // Labor precios
    'labor_precios'                => 'nullable|array',
    'labor_precios.*.labor_id'     => 'required|exists:labores,id',
    'labor_precios.*.precio_palma' => 'required|numeric|min:0|max:99999999.99',
    'labor_precios.*.tipo_pago'    => 'nullable|in:POR_PALMA,JORNAL_FIJO',

    // Operarios
    'operarios'                    => 'nullable|array',
    'operarios.*.nombres'          => 'required|string|max:100',
    'operarios.*.apellidos'        => 'required|string|max:100',
    'operarios.*.cedula'           => 'nullable|string|max:20',
    'operarios.*.cargo'            => 'nullable|string|max:100',
    'operarios.*.eps'              => 'nullable|string|max:100',
    'operarios.*.arl'              => 'nullable|string|max:100',
]);
```

### 2.3 Lógica (dentro de `DB::transaction`)

```php
public function wizardComplete(Request $request, Tercero $tercero): JsonResponse
{
    try {
        $tenantId = (int) app('current_tenant_id');
        $data = $request->validate([/* reglas del §2.2 */]);

        $conteos = DB::transaction(function () use ($data, $tenantId, $tercero) {
            $anioActual = now()->year;
            $conteos = ['labor_precios' => 0, 'precios_cosecha' => 0, 'precios_abono' => 0, 'operarios' => 0];

            // ── Labor precios ────────────────────────────────────────────
            foreach ($data['labor_precios'] ?? [] as $item) {
                // Invariante: FINCA rechaza POR_PALMA
                if (!empty($item['tipo_pago']) && $item['tipo_pago'] === Labor::TIPO_PAGO_POR_PALMA) {
                    $labor = Labor::find($item['labor_id']);
                    if ($labor && $labor->esFinca()) {
                        throw new \InvalidArgumentException("Labor FINCA #{$item['labor_id']} no admite POR_PALMA.");
                    }
                }
                TerceroLaborPrecio::updateOrCreate(
                    ['tenant_id' => $tenantId, 'tercero_id' => $tercero->id, 'labor_id' => $item['labor_id']],
                    ['tipo_pago' => $item['tipo_pago'] ?? null, 'precio_palma' => $item['precio_palma'], 'estado' => true],
                );
                $conteos['labor_precios']++;
            }

            // ── Precios cosecha ──────────────────────────────────────────
            foreach ($data['precios_cosecha'] ?? [] as $item) {
                $anio = $item['anio'] ?? $anioActual;
                TerceroPrecioCosecha::updateOrCreate(
                    ['tenant_id' => $tenantId, 'tercero_id' => $tercero->id, 'lote_id' => $item['lote_id'], 'anio' => $anio],
                    ['precio' => $item['precio']],
                );
                $conteos['precios_cosecha']++;
            }

            // ── Precios abono — validar solapamiento entre rangos del batch ──
            $rangos = $data['precios_abono'] ?? [];
            foreach ($rangos as $i => $rango) {
                // Solapamiento contra BD existente
                $solapaDB = TerceroPrecioAbono::where('tenant_id', $tenantId)
                    ->where('tercero_id', $tercero->id)
                    ->where('estado', true)
                    ->where(function ($q) use ($rango) {
                        $q->whereBetween('gramos_min', [$rango['gramos_min'], $rango['gramos_max']])
                          ->orWhereBetween('gramos_max', [$rango['gramos_min'], $rango['gramos_max']])
                          ->orWhere(function ($q2) use ($rango) {
                              $q2->where('gramos_min', '<=', $rango['gramos_min'])
                                 ->where('gramos_max', '>=', $rango['gramos_max']);
                          });
                    })->exists();

                if ($solapaDB) {
                    throw new \RuntimeException('RANGO_SOLAPADO');
                }

                // Solapamiento contra otros rangos del mismo batch
                foreach (array_slice($rangos, $i + 1) as $otro) {
                    if ($rango['gramos_min'] <= $otro['gramos_max'] && $rango['gramos_max'] >= $otro['gramos_min']) {
                        throw new \RuntimeException('RANGO_SOLAPADO');
                    }
                }

                TerceroPrecioAbono::create([
                    'tenant_id'    => $tenantId,
                    'tercero_id'   => $tercero->id,
                    'gramos_min'   => $rango['gramos_min'],
                    'gramos_max'   => $rango['gramos_max'],
                    'precio_palma' => $rango['precio_palma'],
                    'estado'       => true,
                ]);
                $conteos['precios_abono']++;
            }

            // ── Operarios ────────────────────────────────────────────────
            foreach ($data['operarios'] ?? [] as $op) {
                $tercero->operarios()->create(array_merge($op, ['tenant_id' => $tenantId, 'estado' => true]));
                $conteos['operarios']++;
            }

            return $conteos;
        });

        // Cache — una sola invalidación al final
        WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);
        WizardCache::forgetOperacionesBundle($tenantId);

        // Auditoría — una entrada con resumen
        $this->auditoria->registrarCreacion($request, 'TERCERO_WIZARD_COMPLETE', $tercero,
            "Wizard completo tercero #{$tercero->id}: " .
            "labores={$conteos['labor_precios']}, cosecha={$conteos['precios_cosecha']}, " .
            "abono={$conteos['precios_abono']}, operarios={$conteos['operarios']}");

        return response()->json(['data' => $conteos], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
    } catch (\RuntimeException $e) {
        if ($e->getMessage() === 'RANGO_SOLAPADO') {
            return response()->json([
                'message' => 'Los rangos de gramos de abono se solapan entre sí.',
                'code'    => 'RANGO_SOLAPADO',
            ], 409);
        }
        Log::error('Error en wizard-complete: ' . $e->getMessage());
        return response()->json(['message' => 'Error al guardar configuración'], 500);
    } catch (\Throwable $e) {
        Log::error('Error en wizard-complete: ' . $e->getMessage());
        return response()->json(['message' => 'Error al guardar configuración', 'error' => $e->getMessage()], 500);
    }
}
```

### 2.4 Respuesta exitosa

**`201 Created`**
```json
{
  "data": {
    "labor_precios": 3,
    "precios_cosecha": 5,
    "precios_abono": 2,
    "operarios": 2
  }
}
```

### 2.5 Errores posibles

| HTTP | code | Cuándo |
|------|------|--------|
| `422` | — | Validación de campos fallida |
| `409` | `RANGO_SOLAPADO` | Rangos de abono solapados entre sí o con BD |
| `500` | — | Error inesperado |

---

## 3. Modelo `Operario` — verificar `fillable`

El método usa `$tercero->operarios()->create([...])`. Confirmar que el modelo
`app/Models/Operario.php` tiene en `$fillable`:
`tenant_id`, `nombres`, `apellidos`, `cedula`, `cargo`, `eps`, `arl`, `estado`.

---

## 4. Impacto en tests

Si hay feature tests para `storeLaborPrecio`, `storePrecioCosecha`, etc., añadir un test
para `POST /terceros/{id}/wizard-complete` que cubra:
- Happy path con datos completos
- Rango de abono solapado → 409
- Labor FINCA con `tipo_pago=POR_PALMA` → 422

---

## 5. Documentación — `API_TERCEROS.md`

Añadir sección `6.2` en el documento existente describiendo el nuevo endpoint.
El frontend ya lo documenta en `frontend/src/api/terceros.ts` con los tipos
`WizardCompletePayload` y `WizardCompleteResult`.
