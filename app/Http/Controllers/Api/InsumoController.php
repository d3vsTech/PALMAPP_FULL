<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Insumo;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class InsumoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/v1/tenant/insumos/select
     * Listado liviano para dropdowns (id, nombre, unidad_medida).
     * Default: solo activos.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $insumos = Insumo::query()
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'unidad_medida']);

            return response()->json(['data' => $insumos]);
        } catch (\Throwable $e) {
            Log::error('Error en insumos/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar insumos', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $insumos = Insumo::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $insumos->items(),
                'meta' => [
                    'current_page' => $insumos->currentPage(),
                    'last_page'    => $insumos->lastPage(),
                    'per_page'     => $insumos->perPage(),
                    'total'        => $insumos->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar insumos: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los insumos', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Insumo $insumo): JsonResponse
    {
        try {
            return response()->json(['data' => $insumo]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'        => 'required|string|max:100',
                'unidad_medida' => 'required|string|max:100',
            ]);

            $insumo = Insumo::create($validated);

            $this->auditoria->registrarCreacion($request, 'INSUMOS', $insumo, "Se creó el insumo '{$insumo->nombre}'");

            WizardCache::forgetOperacionesKey(WizardCache::operacionesInsumos((int) app('current_tenant_id')));

            return response()->json([
                'message' => 'Insumo creado correctamente',
                'data'    => $insumo,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/v1/tenant/operaciones/insumos
     *
     * Crea un insumo "rápido" desde el wizard de Fertilización cuando el
     * operador elige "Otro" en el dropdown "Tipo de Fertilizante". Solo
     * recibe `nombre`; el backend setea `unidad_medida = 'GRAMOS'` por
     * default (FERTILIZACION usa gramos_por_palma). El admin puede ajustar
     * la unidad luego desde el CRUD de configuración (PUT /insumos/{id}).
     *
     * Validación de unicidad: app-level con Rule::unique scoped por tenant
     * + UNIQUE (tenant_id, nombre) en DB como red de seguridad ante
     * concurrencia.
     */
    public function storeFromWizard(Request $request): JsonResponse
    {
        try {
            $tenantId = app('current_tenant_id');

            $validated = $request->validate([
                'nombre' => [
                    'required', 'string', 'max:100',
                    Rule::unique('insumos', 'nombre')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
                ],
            ], [
                'nombre.unique' => 'Ya existe un insumo con ese nombre en este tenant.',
            ]);

            $insumo = Insumo::create([
                'nombre'        => $validated['nombre'],
                'unidad_medida' => 'GRAMOS',
            ]);

            $this->auditoria->registrarCreacion(
                $request,
                'INSUMOS',
                $insumo,
                "Se creó el insumo '{$insumo->nombre}' desde el wizard de Operaciones (FERTILIZACION)"
            );

            WizardCache::forgetOperacionesKey(WizardCache::operacionesInsumos((int) $tenantId));

            return response()->json([
                'message' => 'Insumo creado correctamente',
                'data'    => $insumo->only(['id', 'nombre', 'unidad_medida']),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            $esDuplicado = isset($errors['nombre'])
                && str_contains(implode(' ', $errors['nombre']), 'Ya existe');

            return response()->json(array_filter([
                'message' => 'Error de validación',
                'errors'  => $errors,
                'code'    => $esDuplicado ? 'INSUMO_DUPLICADO' : null,
            ]), $esDuplicado ? 409 : 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear insumo desde wizard: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al crear el insumo',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, Insumo $insumo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nombre'        => 'sometimes|string|max:100',
                'unidad_medida' => 'sometimes|string|max:100',
                'estado'        => 'sometimes|boolean',
            ]);

            $datosAnteriores = $insumo->toArray();
            $insumo->update($validated);

            $this->auditoria->registrarEdicion($request, 'INSUMOS', $insumo, $datosAnteriores, "Se editó el insumo '{$insumo->nombre}'");

            WizardCache::forgetOperacionesKey(WizardCache::operacionesInsumos((int) app('current_tenant_id')));

            return response()->json([
                'message' => 'Insumo actualizado correctamente',
                'data'    => $insumo->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el insumo', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Insumo $insumo): JsonResponse
    {
        try {
            if ($insumo->jornales()->where('estado', true)->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el insumo porque tiene jornales activos asociados',
                    'code'    => 'INSUMO_CON_JORNALES',
                ], 409);
            }

            $this->auditoria->registrarEliminacion($request, 'INSUMOS', $insumo, "Se eliminó el insumo '{$insumo->nombre}'");
            $insumo->delete();

            WizardCache::forgetOperacionesKey(WizardCache::operacionesInsumos((int) app('current_tenant_id')));

            return response()->json(['message' => "Insumo '{$insumo->nombre}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar insumo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el insumo', 'error' => $e->getMessage()], 500);
        }
    }
}
