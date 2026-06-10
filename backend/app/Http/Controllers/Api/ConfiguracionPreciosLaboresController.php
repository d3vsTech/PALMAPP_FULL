<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Labor;
use App\Models\Lote;
use App\Models\PrecioAbono;
use App\Models\PrecioCosecha;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Compositor de carga inicial para la pantalla "Precios de Labores".
 * Reemplaza 6 requests paralelos por 1 sola llamada cacheada.
 */
class ConfiguracionPreciosLaboresController extends Controller
{
    /**
     * GET /api/v1/tenant/configuracion/precios-labores/init
     *
     * Devuelve en una sola respuesta los 6 datasets que necesita la pantalla:
     * precios_cosecha, precios_abono, labores_palma_fijas,
     * labores_palma_custom, labores_finca, lotes.
     */
    public function bundleInit(Request $request): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $bundle = Cache::remember(
                WizardCache::preciosLaboresBundle($tenantId),
                WizardCache::TTL_PRECIOS_LABORES_BUNDLE,
                function () use ($request) {
                    $laboresPalmaFijas = Labor::query()
                        ->where('categoria', 'PALMA')
                        ->where('es_sistema', true)
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema'])
                        ->toArray();

                    $laboresPalmaCustom = Labor::query()
                        ->where('categoria', 'PALMA')
                        ->where('es_sistema', false)
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema'])
                        ->toArray();

                    $laboresFinca = Labor::query()
                        ->where('categoria', 'FINCA')
                        ->where('estado', true)
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema'])
                        ->toArray();

                    $preciosCosecha = PrecioCosecha::query()
                        ->with('lote:id,nombre')
                        ->orderByDesc('anio')
                        ->limit($request->per_page_cosecha ?? 100)
                        ->get()
                        ->toArray();

                    $preciosAbono = PrecioAbono::query()
                        ->orderBy('gramos_min')
                        ->get()
                        ->toArray();

                    $lotes = Lote::query()
                        ->where('estado', true)
                        ->with('predio:id,nombre')
                        ->orderBy('nombre')
                        ->get(['id', 'nombre', 'predio_id'])
                        ->toArray();

                    return compact(
                        'laboresPalmaFijas',
                        'laboresPalmaCustom',
                        'laboresFinca',
                        'preciosCosecha',
                        'preciosAbono',
                        'lotes',
                    );
                },
            );

            return response()->json(['data' => [
                'precios_cosecha'      => $bundle['preciosCosecha'],
                'precios_abono'        => $bundle['preciosAbono'],
                'labores_palma_fijas'  => $bundle['laboresPalmaFijas'],
                'labores_palma_custom' => $bundle['laboresPalmaCustom'],
                'labores_finca'        => $bundle['laboresFinca'],
                'lotes'                => $bundle['lotes'],
            ]]);
        } catch (\Throwable $e) {
            Log::error('Error en configuracion/precios-labores/init: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar datos de precios de labores', 'error' => $e->getMessage()], 500);
        }
    }
}
