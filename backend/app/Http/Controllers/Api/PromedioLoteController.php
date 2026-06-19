<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromedioLote;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PromedioLoteController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $promedios = PromedioLote::query()
                ->with('lote:id,nombre')
                ->when($request->lote_id, fn($q, $id) => $q->where('lote_id', $id))
                ->when($request->anio, fn($q, $a) => $q->where('anio', $a))
                ->when($request->fecha_desde, fn($q, $d) => $q->where('fecha', '>=', $d))
                ->when($request->fecha_hasta, fn($q, $d) => $q->where('fecha', '<=', $d))
                ->when($request->filled('solo_baseline'), fn($q) => $q->baseline())
                ->when($request->filled('solo_viajes'), fn($q) => $q->deViaje())
                ->orderByDesc('fecha')
                ->orderByDesc('anio')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $promedios->items(),
                'meta' => [
                    'current_page' => $promedios->currentPage(),
                    'last_page'    => $promedios->lastPage(),
                    'per_page'     => $promedios->perPage(),
                    'total'        => $promedios->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar promedios: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los promedios', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(PromedioLote $promedioLote): JsonResponse
    {
        try {
            $promedioLote->load('lote:id,nombre', 'viaje:id,remision,fecha_viaje');
            return response()->json(['data' => $promedioLote]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener promedio: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el promedio', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Crea un registro de promedio baseline (configurado manualmente por el admin).
     * Los promedios generados por viajes se crean automáticamente al finalizar el viaje.
     *
     * Se permiten múltiples registros por lote — ya no hay restricción de unicidad
     * (lote_id, anio). El admin puede crear varios baselines con distintas fechas
     * para reflejar variaciones iniciales del promedio.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'lote_id'  => 'required|exists:lotes,id',
                'promedio' => 'required|numeric|min:0|max:99999999.99',
                'anio'     => 'required|integer|min:2000|max:2100',
                'fecha'    => 'nullable|date',
            ]);

            // viaje_id siempre NULL en los creados por el admin (baseline manual)
            $validated['viaje_id'] = null;

            $promedio = PromedioLote::create($validated);

            $this->auditoria->registrarCreacion(
                $request, 'PROMEDIOS', $promedio,
                "Se creó baseline de promedio para lote #{$promedio->lote_id} año {$promedio->anio}"
            );

            return response()->json([
                'message' => 'Promedio creado correctamente',
                'data'    => $promedio->load('lote:id,nombre'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear promedio: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el promedio', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Editar un promedio. Solo aplica a registros baseline (viaje_id IS NULL).
     * Los generados por viaje son inmutables (el viaje es el registro de auditoría).
     */
    public function update(Request $request, PromedioLote $promedioLote): JsonResponse
    {
        try {
            if ($promedioLote->viaje_id !== null) {
                return response()->json([
                    'message' => 'Los promedios generados por viajes no se pueden editar manualmente.',
                    'code'    => 'PROMEDIO_DE_VIAJE',
                ], 409);
            }

            $validated = $request->validate([
                'promedio' => 'sometimes|numeric|min:0|max:99999999.99',
                'anio'     => 'sometimes|integer|min:2000|max:2100',
                'fecha'    => 'sometimes|nullable|date',
            ]);

            $datosAnteriores = $promedioLote->toArray();
            $promedioLote->update($validated);

            $this->auditoria->registrarEdicion(
                $request, 'PROMEDIOS', $promedioLote, $datosAnteriores,
                "Se editó promedio lote #{$promedioLote->lote_id} año {$promedioLote->anio}"
            );

            return response()->json([
                'message' => 'Promedio actualizado correctamente',
                'data'    => $promedioLote->fresh()->load('lote:id,nombre'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar promedio: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el promedio', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, PromedioLote $promedioLote): JsonResponse
    {
        try {
            if ($promedioLote->viaje_id !== null) {
                return response()->json([
                    'message' => 'Los promedios generados por viajes no se pueden eliminar manualmente.',
                    'code'    => 'PROMEDIO_DE_VIAJE',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'PROMEDIOS', $promedioLote,
                "Se eliminó promedio lote #{$promedioLote->lote_id} año {$promedioLote->anio}"
            );
            $promedioLote->delete();

            return response()->json(['message' => 'Promedio eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar promedio: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el promedio', 'error' => $e->getMessage()], 500);
        }
    }
}
