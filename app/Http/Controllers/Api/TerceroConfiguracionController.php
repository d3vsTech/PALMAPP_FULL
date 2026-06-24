<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Arl;
use App\Models\Eps;
use App\Models\Labor;
use App\Models\Lote;
use App\Models\PrecioAbono;
use App\Models\Tercero;
use App\Models\TerceroLaborPrecio;
use App\Models\TerceroPrecioAbono;
use App\Models\TerceroPrecioCosecha;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TerceroConfiguracionController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /terceros/wizard-init
     * Bundle de contexto para los pasos 2 (Precios) y 3 (Operarios) del wizard
     * de creación de terceros, sin requerir tercero_id.
     */
    public function wizardInit(): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            // Datos tenant-level cacheados 60 s; se invalidan si cambian labores o precios abono
            $data = Cache::remember(
                WizardCache::terceroWizardInit($tenantId),
                WizardCache::TTL_TENANT,
                function () use ($tenantId) {
                    // Incluye labores PALMA y FINCA. COSECHA y FERTILIZACION quedan fuera
                    // porque tienen sus propios flujos (precios-cosecha y precios-abono).
                    // El frontend agrupa por `categoria` para pintar dos secciones distintas
                    // en el Paso 2 del wizard (Labores de Palma + Labores de Finca).
                    $labores = Labor::query()
                        ->where('tenant_id', $tenantId)
                        ->where('estado', true)
                        ->where(function ($q) {
                            $q->whereNotIn('tipo', [Labor::TIPO_COSECHA, Labor::TIPO_FERTILIZACION])
                              ->orWhereNull('tipo'); // custom PALMA y custom FINCA tienen tipo=NULL
                        })
                        ->orderBy('categoria')
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema']);

                    $lotes = Lote::query()
                        ->where('tenant_id', $tenantId)
                        ->where('estado', true)
                        ->with(['sublotes' => fn ($q) => $q->where('estado', true)->orderBy('nombre')])
                        ->orderBy('nombre')
                        ->get(['id', 'nombre']);

                    $preciosAbonoRef = PrecioAbono::query()
                        ->where('tenant_id', $tenantId)
                        ->where('estado', true)
                        ->orderBy('gramos_min')
                        ->get();

                    return [
                        'labores_contexto'         => $labores,
                        'lotes_contexto'           => $lotes,
                        'precios_abono_referencia' => $preciosAbonoRef,
                        'anio_actual'              => now()->year,
                    ];
                },
            );

            // EPS/ARL tienen sus propios TTL de 15 min
            $data['eps'] = Cache::remember(
                WizardCache::eps($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => Eps::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
            );
            $data['arl'] = Cache::remember(
                WizardCache::arl($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => Arl::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
            );

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('Error en tercero wizard-init: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar wizard', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /terceros/{tercero}/configuracion/init
     * Bundle inicial para la pantalla de configuración de precios del tercero.
     */
    public function bundleInit(Tercero $tercero): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            // Queries pesadas cacheadas 60 s por (tenant, tercero); se invalidan en cualquier mutación
            $bundle = Cache::remember(
                WizardCache::terceroConfigBundle($tenantId, $tercero->id),
                WizardCache::TTL_TENANT,
                function () use ($tenantId, $tercero) {
                    $labores = Labor::query()
                        ->where('tenant_id', $tenantId)
                        ->where('estado', true)
                        ->whereNot('tipo', Labor::TIPO_COSECHA)
                        ->orderBy('categoria')
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma']);

                    $lotes = Lote::query()
                        ->where('tenant_id', $tenantId)
                        ->where('estado', true)
                        ->with(['sublotes' => fn ($q) => $q->where('estado', true)->orderBy('nombre')])
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'predio_id']);

                    $laborPrecios = $tercero->laborPrecios()
                        ->where('estado', true)
                        ->get(['id', 'labor_id', 'tipo_pago', 'precio_palma', 'estado']);

                    $preciosCosecha = $tercero->preciosCosecha()
                        ->orderBy('anio', 'desc')
                        ->orderBy('lote_id')
                        ->get(['id', 'lote_id', 'anio', 'precio']);

                    $preciosAbono = $tercero->preciosAbono()
                        ->where('estado', true)
                        ->orderBy('gramos_min')
                        ->get(['id', 'gramos_min', 'gramos_max', 'precio_palma', 'estado']);

                    return [
                        'labor_precios'    => $laborPrecios,
                        'precios_cosecha'  => $preciosCosecha,
                        'precios_abono'    => $preciosAbono,
                        'labores_contexto' => $labores,
                        'lotes_contexto'   => $lotes,
                    ];
                },
            );

            // Tercero siempre fresco (route model binding); EPS/ARL desde sus propios caches
            $bundle['tercero'] = $tercero;
            $bundle['eps'] = Cache::remember(
                WizardCache::eps($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => Eps::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
            );
            $bundle['arl'] = Cache::remember(
                WizardCache::arl($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => Arl::query()->activos()->orderBy('nombre')->get(['id', 'nombre']),
            );

            return response()->json(['data' => $bundle]);
        } catch (\Throwable $e) {
            Log::error('Error en tercero bundle-init: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar configuración', 'error' => $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Labor Precios
    // ──────────────────────────────────────────────────────────────────

    public function indexLaborPrecios(Tercero $tercero): JsonResponse
    {
        $data = $tercero->laborPrecios()->with('labor:id,nombre,categoria,tipo')->get();
        return response()->json(['data' => $data]);
    }

    public function storeLaborPrecio(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate([
                'labor_id'     => 'required|exists:labores,id',
                'precio_palma' => 'required|numeric|min:0|max:99999999.99',
                'tipo_pago'    => 'nullable|in:POR_PALMA,JORNAL_FIJO',
            ]);

            // Invariante: una labor FINCA siempre paga JORNAL_FIJO. Si el override intenta
            // forzar POR_PALMA → 422.
            if (!empty($data['tipo_pago']) && $data['tipo_pago'] === Labor::TIPO_PAGO_POR_PALMA) {
                $labor = Labor::find($data['labor_id']);
                if ($labor && $labor->esFinca()) {
                    return response()->json([
                        'message' => 'Datos inválidos',
                        'errors'  => ['tipo_pago' => ['FINCA solo admite JORNAL_FIJO.']],
                    ], 422);
                }
            }

            $precio = TerceroLaborPrecio::updateOrCreate(
                ['tenant_id' => $tenantId, 'tercero_id' => $tercero->id, 'labor_id' => $data['labor_id']],
                [
                    'tipo_pago'    => $data['tipo_pago'] ?? null,
                    'precio_palma' => $data['precio_palma'],
                    'estado'       => true,
                ],
            );

            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);
            // El bundle del wizard de Operaciones expone tercero_labor_overrides — invalidar también.
            WizardCache::forgetOperacionesBundle($tenantId);

            $tipoPagoLog = $data['tipo_pago'] ?? 'hereda';
            $this->auditoria->registrarCreacion($request, 'TERCERO_LABOR_PRECIOS', $precio,
                "Se configuró precio labor #{$data['labor_id']} → \${$data['precio_palma']} (tipo_pago={$tipoPagoLog}) para tercero #{$tercero->id}");

            return response()->json(['message' => 'Precio configurado correctamente', 'data' => $precio], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al guardar precio labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al guardar precio', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyLaborPrecio(Request $request, Tercero $tercero, TerceroLaborPrecio $precio): JsonResponse
    {
        try {
            if ((int) $precio->tercero_id !== $tercero->id) {
                abort(404);
            }

            $tenantId = (int) app('current_tenant_id');

            $this->auditoria->registrarEliminacion($request, 'TERCERO_LABOR_PRECIOS', $precio,
                "Se eliminó override de precio labor #{$precio->labor_id} del tercero #{$tercero->id}");

            $precio->delete();
            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);
            WizardCache::forgetOperacionesBundle($tenantId);

            return response()->json(['message' => 'Precio eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar precio labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar precio', 'error' => $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Precios Cosecha
    // ──────────────────────────────────────────────────────────────────

    public function indexPreciosCosecha(Tercero $tercero): JsonResponse
    {
        $data = $tercero->preciosCosecha()->with('lote:id,nombre')->orderBy('anio', 'desc')->get();
        return response()->json(['data' => $data]);
    }

    public function storePrecioCosecha(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate([
                'lote_id' => 'required|exists:lotes,id',
                'anio'    => 'nullable|integer|min:2000|max:2100',
                'precio'  => 'required|numeric|min:0|max:99999999.99',
            ]);

            $anio = $data['anio'] ?? now()->year;

            $precio = TerceroPrecioCosecha::updateOrCreate(
                ['tenant_id' => $tenantId, 'tercero_id' => $tercero->id, 'lote_id' => $data['lote_id'], 'anio' => $anio],
                ['precio' => $data['precio']],
            );

            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);

            $this->auditoria->registrarCreacion($request, 'TERCERO_PRECIOS_COSECHA', $precio,
                "Se configuró precio cosecha lote #{$data['lote_id']} año {$anio} → \${$data['precio']} para tercero #{$tercero->id}");

            return response()->json(['message' => 'Precio de cosecha configurado', 'data' => $precio], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al guardar precio cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al guardar precio', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyPrecioCosecha(Request $request, Tercero $tercero, TerceroPrecioCosecha $precio): JsonResponse
    {
        try {
            if ((int) $precio->tercero_id !== $tercero->id) {
                abort(404);
            }

            $tenantId = (int) app('current_tenant_id');

            $this->auditoria->registrarEliminacion($request, 'TERCERO_PRECIOS_COSECHA', $precio,
                "Se eliminó precio cosecha lote #{$precio->lote_id} año {$precio->anio} del tercero #{$tercero->id}");

            $precio->delete();
            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);

            return response()->json(['message' => 'Precio eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar precio cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar precio', 'error' => $e->getMessage()], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Precios Abono
    // ──────────────────────────────────────────────────────────────────

    public function indexPreciosAbono(Tercero $tercero): JsonResponse
    {
        $data = $tercero->preciosAbono()->orderBy('gramos_min')->get();
        return response()->json(['data' => $data]);
    }

    public function storePrecioAbono(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate([
                'gramos_min'   => 'required|numeric|min:0',
                'gramos_max'   => 'required|numeric|gt:gramos_min',
                'precio_palma' => 'required|numeric|min:0|max:99999999.99',
            ]);

            // Verificar solapamiento dentro del mismo tercero
            $solapamiento = TerceroPrecioAbono::where('tenant_id', $tenantId)
                ->where('tercero_id', $tercero->id)
                ->where('estado', true)
                ->where(function ($q) use ($data) {
                    $q->whereBetween('gramos_min', [$data['gramos_min'], $data['gramos_max']])
                      ->orWhereBetween('gramos_max', [$data['gramos_min'], $data['gramos_max']])
                      ->orWhere(function ($q2) use ($data) {
                          $q2->where('gramos_min', '<=', $data['gramos_min'])
                             ->where('gramos_max', '>=', $data['gramos_max']);
                      });
                })
                ->exists();

            if ($solapamiento) {
                return response()->json([
                    'message' => 'El rango de gramos se solapa con un rango existente para este tercero.',
                    'code'    => 'RANGO_SOLAPADO',
                ], 409);
            }

            $precio = TerceroPrecioAbono::create(array_merge($data, [
                'tenant_id'  => $tenantId,
                'tercero_id' => $tercero->id,
                'estado'     => true,
            ]));

            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);

            $this->auditoria->registrarCreacion($request, 'TERCERO_PRECIOS_ABONO', $precio,
                "Se creó rango abono {$data['gramos_min']}g-{$data['gramos_max']}g → \${$data['precio_palma']}/palma para tercero #{$tercero->id}");

            return response()->json(['message' => 'Precio de abono configurado', 'data' => $precio], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al guardar precio abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al guardar precio', 'error' => $e->getMessage()], 500);
        }
    }

    public function updatePrecioAbono(Request $request, Tercero $tercero, TerceroPrecioAbono $precio): JsonResponse
    {
        try {
            if ((int) $precio->tercero_id !== $tercero->id) {
                abort(404);
            }

            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate([
                'gramos_min'   => 'sometimes|numeric|min:0',
                'gramos_max'   => 'sometimes|numeric|min:0',
                'precio_palma' => 'sometimes|numeric|min:0|max:99999999.99',
                'estado'       => 'sometimes|boolean',
            ]);

            $gramosMin = $data['gramos_min'] ?? $precio->gramos_min;
            $gramosMax = $data['gramos_max'] ?? $precio->gramos_max;

            if ((float) $gramosMax <= (float) $gramosMin) {
                return response()->json([
                    'message' => 'Datos inválidos',
                    'errors'  => ['gramos_max' => ['gramos_max debe ser mayor que gramos_min']],
                ], 422);
            }

            if ($request->hasAny(['gramos_min', 'gramos_max'])) {
                $solapamiento = TerceroPrecioAbono::where('tenant_id', $tenantId)
                    ->where('tercero_id', $tercero->id)
                    ->where('estado', true)
                    ->where('id', '!=', $precio->id)
                    ->where(function ($q) use ($gramosMin, $gramosMax) {
                        $q->whereBetween('gramos_min', [$gramosMin, $gramosMax])
                          ->orWhereBetween('gramos_max', [$gramosMin, $gramosMax])
                          ->orWhere(function ($q2) use ($gramosMin, $gramosMax) {
                              $q2->where('gramos_min', '<=', $gramosMin)
                                 ->where('gramos_max', '>=', $gramosMax);
                          });
                    })
                    ->exists();

                if ($solapamiento) {
                    return response()->json([
                        'message' => 'El rango se solapa con un rango existente para este tercero.',
                        'code'    => 'RANGO_SOLAPADO',
                    ], 409);
                }
            }

            $datosAnteriores = $precio->toArray();
            $precio->update($data);

            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);

            $this->auditoria->registrarEdicion($request, 'TERCERO_PRECIOS_ABONO', $precio, $datosAnteriores,
                "Se editó rango abono #{$precio->id} del tercero #{$tercero->id}");

            return response()->json(['message' => 'Precio actualizado correctamente', 'data' => $precio->fresh()]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar precio abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar precio', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyPrecioAbono(Request $request, Tercero $tercero, TerceroPrecioAbono $precio): JsonResponse
    {
        try {
            if ((int) $precio->tercero_id !== $tercero->id) {
                abort(404);
            }

            $tenantId = (int) app('current_tenant_id');

            $this->auditoria->registrarEliminacion($request, 'TERCERO_PRECIOS_ABONO', $precio,
                "Se eliminó rango abono #{$precio->id} del tercero #{$tercero->id}");

            $precio->delete();
            WizardCache::forgetTerceroConfigBundle($tenantId, $tercero->id);

            return response()->json(['message' => 'Precio eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar precio abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar precio', 'error' => $e->getMessage()], 500);
        }
    }
}
