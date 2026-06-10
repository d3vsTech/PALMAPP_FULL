<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Labor\StoreLaborRequest;
use App\Http\Requests\Labor\UpdateLaborRequest;
use App\Models\Labor;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * CRUD unificado de Labores (palma + finca, fijas + custom).
 *
 * Responsabilidades:
 *   - Listar/buscar labores con filtros por categoria, tipo_pago, es_sistema.
 *   - Crear labores CUSTOM (de palma o finca). Las 5 fijas se siembran al
 *     provisionar el tenant.
 *   - Actualizar labores: fijas solo permiten editar tipo_pago/precio_palma/estado;
 *     custom permiten también el nombre.
 *   - Eliminar custom (bloquea si tienen jornales o cosechas asociadas).
 */
class LaborController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Listado liviano para dropdowns del wizard.
     * Query: ?categoria=PALMA|FINCA (recomendado), ?estado=false para inactivas.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $labores = Labor::query()
                ->when($request->categoria, fn($q, $c) => $q->where('categoria', $c))
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->orderBy('es_sistema', 'desc') // fijas primero
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'categoria', 'tipo', 'tipo_pago', 'precio_palma', 'es_sistema']);

            // Decorar con flag de flujo especial (COSECHA usa su pantalla propia).
            $labores->each(function (Labor $l) {
                $l->requiere_cosecha_workflow = $l->requiereFlujoCosecha();
            });

            return response()->json(['data' => $labores]);
        } catch (\Throwable $e) {
            Log::error('Error en labores/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar labores', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $labores = Labor::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->categoria, fn($q, $c) => $q->where('categoria', $c))
                ->when($request->tipo, fn($q, $t) => $q->where('tipo', $t))
                ->when($request->tipo_pago, fn($q, $tp) => $q->where('tipo_pago', $tp))
                ->when($request->has('es_sistema'), fn($q) => $q->where('es_sistema', filter_var($request->es_sistema, FILTER_VALIDATE_BOOLEAN)))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('categoria')
                ->orderBy('es_sistema', 'desc')
                ->orderBy('nombre')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $labores->items(),
                'meta' => [
                    'current_page' => $labores->currentPage(),
                    'last_page'    => $labores->lastPage(),
                    'per_page'     => $labores->perPage(),
                    'total'        => $labores->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar labores: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las labores', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Labor $labor): JsonResponse
    {
        return response()->json(['data' => $labor]);
    }

    public function store(StoreLaborRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            // Forzar es_sistema=false y tipo=NULL (las fijas no se crean por API).
            $data['es_sistema'] = false;
            $data['tipo']       = null;

            $labor = Labor::create($data);

            WizardCache::forgetPreciosLaboresBundle((int) app('current_tenant_id'));

            $this->auditoria->registrarCreacion(
                $request,
                'LABORES',
                $labor,
                "Se creó la labor '{$labor->nombre}' (" . strtolower($labor->categoria) . ")"
            );

            return response()->json([
                'message' => 'Labor creada correctamente',
                'data'    => $labor,
            ], 201);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'labores_tenant_nombre_unique')) {
                return response()->json([
                    'message' => 'Ya existe una labor con ese nombre',
                    'code'    => 'LABOR_DUPLICADA',
                ], 409);
            }
            Log::error('Error al crear labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la labor'], 500);
        } catch (\Throwable $e) {
            Log::error('Error al crear labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la labor', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateLaborRequest $request, Labor $labor): JsonResponse
    {
        try {
            $datosAnteriores = $labor->toArray();
            $labor->update($request->validated());

            WizardCache::forgetPreciosLaboresBundle((int) app('current_tenant_id'));

            $this->auditoria->registrarEdicion(
                $request,
                'LABORES',
                $labor,
                $datosAnteriores,
                "Se editó la labor '{$labor->nombre}'"
            );

            return response()->json([
                'message' => 'Labor actualizada correctamente',
                'data'    => $labor->fresh(),
            ]);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'labores_tenant_nombre_unique')) {
                return response()->json([
                    'message' => 'Ya existe una labor con ese nombre',
                    'code'    => 'LABOR_DUPLICADA',
                ], 409);
            }
            Log::error('Error al actualizar labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la labor'], 500);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la labor', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Labor $labor): JsonResponse
    {
        try {
            if ($labor->es_sistema) {
                return response()->json([
                    'message' => "No se puede eliminar la labor del sistema '{$labor->nombre}'",
                    'code'    => 'LABOR_DEL_SISTEMA',
                ], 403);
            }

            if ($labor->jornales()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar la labor porque tiene jornales asociados',
                    'code'    => 'LABOR_CON_JORNALES',
                ], 409);
            }

            if ($labor->registroCosechas()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar la labor porque tiene cosechas asociadas',
                    'code'    => 'LABOR_CON_COSECHAS',
                ], 409);
            }

            WizardCache::forgetPreciosLaboresBundle((int) app('current_tenant_id'));

            $this->auditoria->registrarEliminacion(
                $request,
                'LABORES',
                $labor,
                "Se eliminó la labor '{$labor->nombre}'"
            );
            $labor->delete();

            return response()->json(['message' => "Labor '{$labor->nombre}' eliminada correctamente"]);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'LABOR_DEL_SISTEMA'], 403);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar labor: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la labor', 'error' => $e->getMessage()], 500);
        }
    }
}
