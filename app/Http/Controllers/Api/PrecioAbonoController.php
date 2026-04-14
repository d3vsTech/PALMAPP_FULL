<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrecioAbono;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrecioAbonoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/precios-abono
     * Lista las escalas de precio de abono del tenant.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $precios = PrecioAbono::query()
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('gramos_min')
                ->get();

            return response()->json(['data' => $precios]);
        } catch (\Throwable $e) {
            Log::error('Error al listar precios de abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los precios de abono', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/v1/tenant/precios-abono
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'gramos_min'   => 'required|numeric|min:0',
                'gramos_max'   => 'required|numeric|gt:gramos_min',
                'precio_palma' => 'required|numeric|min:0|max:99999999.99',
            ]);

            // Verificar solapamiento de rangos dentro del tenant
            $solapamiento = PrecioAbono::where('estado', true)
                ->where(function ($q) use ($validated) {
                    $q->whereBetween('gramos_min', [$validated['gramos_min'], $validated['gramos_max']])
                      ->orWhereBetween('gramos_max', [$validated['gramos_min'], $validated['gramos_max']])
                      ->orWhere(function ($q2) use ($validated) {
                          $q2->where('gramos_min', '<=', $validated['gramos_min'])
                             ->where('gramos_max', '>=', $validated['gramos_max']);
                      });
                })
                ->exists();

            if ($solapamiento) {
                return response()->json([
                    'message' => 'El rango de gramos se solapa con un rango existente',
                    'code'    => 'RANGO_SOLAPADO',
                ], 409);
            }

            $precio = PrecioAbono::create($validated);

            $this->auditoria->registrarCreacion($request, 'PRECIOS_ABONO', $precio, "Se creó rango de precio: {$precio->gramos_min}g-{$precio->gramos_max}g → \${$precio->precio_palma}/palma");

            return response()->json([
                'message' => 'Precio de abono creado correctamente',
                'data'    => $precio,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear precio de abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el precio de abono', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/v1/tenant/precios-abono/{precioAbono}
     */
    public function update(Request $request, PrecioAbono $precioAbono): JsonResponse
    {
        try {
            $validated = $request->validate([
                'gramos_min'   => 'sometimes|numeric|min:0',
                'gramos_max'   => 'sometimes|numeric|min:0',
                'precio_palma' => 'sometimes|numeric|min:0|max:99999999.99',
                'estado'       => 'sometimes|boolean',
            ]);

            // Validar que gramos_max > gramos_min con los valores finales
            $gramosMin = $validated['gramos_min'] ?? $precioAbono->gramos_min;
            $gramosMax = $validated['gramos_max'] ?? $precioAbono->gramos_max;

            if ($gramosMax <= $gramosMin) {
                return response()->json([
                    'message' => 'Error de validación',
                    'errors'  => ['gramos_max' => ['gramos_max debe ser mayor que gramos_min']],
                ], 422);
            }

            // Verificar solapamiento (excluyendo el registro actual)
            if ($request->hasAny(['gramos_min', 'gramos_max'])) {
                $solapamiento = PrecioAbono::where('estado', true)
                    ->where('id', '!=', $precioAbono->id)
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
                        'message' => 'El rango de gramos se solapa con un rango existente',
                        'code'    => 'RANGO_SOLAPADO',
                    ], 409);
                }
            }

            $datosAnteriores = $precioAbono->toArray();
            $precioAbono->update($validated);

            $this->auditoria->registrarEdicion($request, 'PRECIOS_ABONO', $precioAbono, $datosAnteriores, "Se editó rango de precio: {$precioAbono->gramos_min}g-{$precioAbono->gramos_max}g");

            return response()->json([
                'message' => 'Precio de abono actualizado correctamente',
                'data'    => $precioAbono->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar precio de abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el precio de abono', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/v1/tenant/precios-abono/{precioAbono}
     */
    public function destroy(Request $request, PrecioAbono $precioAbono): JsonResponse
    {
        try {
            $this->auditoria->registrarEliminacion($request, 'PRECIOS_ABONO', $precioAbono, "Se eliminó rango: {$precioAbono->gramos_min}g-{$precioAbono->gramos_max}g → \${$precioAbono->precio_palma}/palma");
            $precioAbono->delete();

            return response()->json(['message' => 'Precio de abono eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar precio de abono: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el precio de abono', 'error' => $e->getMessage()], 500);
        }
    }
}
