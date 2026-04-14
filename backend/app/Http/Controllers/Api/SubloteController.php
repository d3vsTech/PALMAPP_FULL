<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sublote\StoreSubloteRequest;
use App\Http\Requests\Sublote\UpdateSubloteRequest;
use App\Models\Linea;
use App\Models\Lote;
use App\Models\Palma;
use App\Models\Sublote;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubloteController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/sublotes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $sublotes = Sublote::query()
                ->with('lote:id,nombre,predio_id', 'lote.predio:id,nombre')
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->lote_id, fn($q, $id) => $q->where('lote_id', $id))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->withCount('palmas')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $sublotes->items(),
                'meta' => [
                    'current_page' => $sublotes->currentPage(),
                    'last_page'    => $sublotes->lastPage(),
                    'per_page'     => $sublotes->perPage(),
                    'total'        => $sublotes->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar sublotes: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al listar los sublotes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/tenant/sublotes/{sublote}
     */
    public function show(Sublote $sublote): JsonResponse
    {
        try {
            $sublote->load([
                'lote:id,nombre,predio_id',
                'lote.predio:id,nombre',
                'lineas' => fn($q) => $q->withCount('palmas')->orderBy('numero'),
                'palmas' => fn($q) => $q->with('linea:id,numero')->orderBy('codigo'),
            ]);

            return response()->json(['data' => $sublote]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al obtener el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/tenant/sublotes
     */
    public function store(StoreSubloteRequest $request): JsonResponse
    {
        try {
            $lote = Lote::find($request->lote_id);
            if (!$lote) {
                return response()->json([
                    'message' => 'El lote no pertenece a esta finca',
                    'code'    => 'LOTE_NOT_FOUND',
                ], 404);
            }

            $cantidadPalmas = (int) ($request->cantidad_palmas ?? 0);

            DB::beginTransaction();

            $sublote = Sublote::create([
                'lote_id'         => $request->lote_id,
                'nombre'          => $request->nombre,
                'cantidad_palmas' => $cantidadPalmas,
            ]);

            if ($cantidadPalmas > 0) {
                $this->crearPalmas($sublote, $cantidadPalmas);
            }

            DB::commit();

            $this->auditoria->registrarCreacion(
                $request,
                'SUBLOTES',
                $sublote,
                "Se creó el sublote '{$sublote->nombre}' en lote '{$lote->nombre}'" .
                ($cantidadPalmas > 0 ? " con {$cantidadPalmas} palmas" : ''),
            );

            return response()->json([
                'message' => 'Sublote creado correctamente',
                'data'    => $sublote->load('lote:id,nombre'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al crear sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al crear el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/sublotes/{sublote}
     */
    public function update(UpdateSubloteRequest $request, Sublote $sublote): JsonResponse
    {
        try {
            if ($request->has('lote_id') && $request->lote_id !== $sublote->lote_id) {
                $lote = Lote::find($request->lote_id);
                if (!$lote) {
                    return response()->json([
                        'message' => 'El lote no pertenece a esta finca',
                        'code'    => 'LOTE_NOT_FOUND',
                    ], 404);
                }
            }

            $datosAnteriores = $sublote->toArray();

            DB::beginTransaction();

            // Ajustar palmas si cambió cantidad_palmas
            if ($request->has('cantidad_palmas')) {
                $nuevaCantidad = (int) $request->cantidad_palmas;
                $cantidadActual = (int) $sublote->cantidad_palmas;

                if ($nuevaCantidad > $cantidadActual) {
                    $diferencia = $nuevaCantidad - $cantidadActual;
                    $this->crearPalmas($sublote, $diferencia);
                } elseif ($nuevaCantidad < $cantidadActual) {
                    $diferencia = $cantidadActual - $nuevaCantidad;
                    $palmasAEliminar = $sublote->palmas()
                        ->orderBy('codigo', 'desc')
                        ->take($diferencia)
                        ->get();

                    $lineasAfectadas = $palmasAEliminar->pluck('linea_id')->filter()->unique();

                    $palmasAEliminar->each->delete();

                    // Sincronizar contadores de líneas afectadas
                    foreach (Linea::whereIn('id', $lineasAfectadas)->get() as $linea) {
                        $linea->update(['cantidad_palmas' => $linea->palmas()->count()]);
                    }
                }
            }

            $sublote->update($request->validated());

            DB::commit();

            $this->auditoria->registrarEdicion(
                $request,
                'SUBLOTES',
                $sublote,
                $datosAnteriores,
                "Se editó el sublote '{$sublote->nombre}'",
            );

            return response()->json([
                'message' => 'Sublote actualizado correctamente',
                'data'    => $sublote->fresh()->load('lote:id,nombre'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al actualizar sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/sublotes/{sublote}
     */
    public function destroy(Request $request, Sublote $sublote): JsonResponse
    {
        try {
            DB::beginTransaction();

            $sublote->palmas()->delete();
            $sublote->lineas()->delete();

            $this->auditoria->registrarEliminacion(
                $request,
                'SUBLOTES',
                $sublote,
                "Se eliminó el sublote '{$sublote->nombre}' con todas sus palmas y líneas",
            );

            $sublote->delete();

            DB::commit();

            return response()->json([
                'message' => "Sublote '{$sublote->nombre}' eliminado correctamente",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al eliminar sublote: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al eliminar el sublote',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crea palmas en bulk para un sublote, continuando desde el máximo contador existente.
     */
    private function crearPalmas(Sublote $sublote, int $cantidad, ?int $lineaId = null): void
    {
        $maxContador = (int) Palma::where('sublote_id', $sublote->id)
            ->selectRaw("MAX(CAST(SUBSTRING(codigo FROM '-([0-9]+)$') AS INTEGER)) as max_num")
            ->value('max_num');

        $palmas = [];
        $now = now();
        $tenantId = $sublote->tenant_id;

        for ($i = 1; $i <= $cantidad; $i++) {
            $maxContador++;
            $codigo = $sublote->nombre . '-' . str_pad($maxContador, 3, '0', STR_PAD_LEFT);
            $palmas[] = [
                'tenant_id'   => $tenantId,
                'sublote_id'  => $sublote->id,
                'linea_id'    => $lineaId,
                'codigo'      => $codigo,
                'descripcion' => null,
                'estado'      => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
        }

        foreach (array_chunk($palmas, 1000) as $chunk) {
            Palma::insert($chunk);
        }
    }
}
