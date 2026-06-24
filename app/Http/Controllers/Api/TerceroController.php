<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tercero;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class TerceroController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $terceros = Tercero::query()
                ->withCount('operarios')
                ->when($request->tipo_persona, fn ($q, $t) => $q->where('tipo_persona', $t))
                ->when(isset($request->estado), fn ($q) => $q->where('estado', (bool) $request->estado))
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q2) use ($s) {
                        $q2->where('razon_social', 'like', "%{$s}%")
                           ->orWhere('nombre_completo', 'like', "%{$s}%")
                           ->orWhere('nombre_comercial', 'like', "%{$s}%")
                           ->orWhere('nit', 'like', "%{$s}%")
                           ->orWhere('cedula', 'like', "%{$s}%");
                    });
                })
                ->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $terceros->items(),
                'meta' => [
                    'current_page' => $terceros->currentPage(),
                    'last_page'    => $terceros->lastPage(),
                    'per_page'     => $terceros->perPage(),
                    'total'        => $terceros->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar terceros: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar terceros', 'error' => $e->getMessage()], 500);
        }
    }

    public function select(Request $request): JsonResponse
    {
        try {
            $terceros = Tercero::query()
                ->where('estado', true)
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q2) use ($s) {
                        $q2->where('razon_social', 'like', "%{$s}%")
                           ->orWhere('nombre_completo', 'like', "%{$s}%")
                           ->orWhere('nombre_comercial', 'like', "%{$s}%");
                    });
                })
                ->orderByRaw('COALESCE(razon_social, nombre_completo, nombre_comercial)')
                ->get(['id', 'tipo_persona', 'razon_social', 'nombre_completo', 'nombre_comercial', 'nit', 'cedula'])
                ->map(fn ($t) => [
                    'id'             => $t->id,
                    'tipo_persona'   => $t->tipo_persona,
                    'nombre_display' => $t->nombre_display,
                    'documento'      => $t->documento_display,
                ]);

            return response()->json(['data' => $terceros]);
        } catch (\Throwable $e) {
            Log::error('Error en terceros/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cargar terceros', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Tercero $tercero): JsonResponse
    {
        try {
            $tercero->loadCount('operarios');

            return response()->json(['data' => $tercero]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener tercero', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate($this->rules($tenantId));

            $tercero = Tercero::create(array_merge($data, ['estado' => true]));

            $this->auditoria->registrarCreacion(
                $request, 'TERCEROS', $tercero,
                "Se creó tercero {$tercero->tipo_persona}: {$tercero->nombre_display}",
            );

            return response()->json(['message' => 'Tercero creado correctamente', 'data' => $tercero], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear tercero', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $data = $request->validate($this->rules($tenantId, $tercero->id));
            $datosAnteriores = $tercero->toArray();

            $tercero->update($data);

            $this->auditoria->registrarEdicion(
                $request, 'TERCEROS', $tercero, $datosAnteriores,
                "Se editó tercero #{$tercero->id}",
            );

            return response()->json(['message' => 'Tercero actualizado correctamente', 'data' => $tercero->fresh()]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar tercero', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            if ($tercero->operarios()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar un tercero que tiene operarios asociados.',
                    'code'    => 'TERCERO_CON_OPERARIOS',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'TERCEROS', $tercero,
                "Se eliminó tercero #{$tercero->id}: {$tercero->nombre_display}",
            );

            $tercero->laborPrecios()->delete();
            $tercero->preciosCosecha()->delete();
            $tercero->preciosAbono()->delete();

            $tercero->delete();

            return response()->json(['message' => 'Tercero eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar tercero', 'error' => $e->getMessage()], 500);
        }
    }

    public function toggle(Request $request, Tercero $tercero): JsonResponse
    {
        try {
            $tercero->update(['estado' => !$tercero->estado]);

            $accion = $tercero->estado ? 'activado' : 'desactivado';
            $this->auditoria->registrarEdicion(
                $request, 'TERCEROS', $tercero, ['estado' => !$tercero->estado],
                "Se {$accion} tercero #{$tercero->id}",
            );

            return response()->json(['message' => "Tercero {$accion} correctamente", 'data' => $tercero]);
        } catch (\Throwable $e) {
            Log::error('Error al cambiar estado de tercero: ' . $e->getMessage());
            return response()->json(['message' => 'Error al cambiar estado', 'error' => $e->getMessage()], 500);
        }
    }

    private function rules(int $tenantId, ?int $ignoreId = null): array
    {
        return [
            'tipo_persona'    => 'required|in:JURIDICA,NATURAL',
            'nit'             => [
                'nullable', 'string', 'max:20',
                Rule::unique('terceros')->where('tenant_id', $tenantId)->ignore($ignoreId),
            ],
            'razon_social'    => 'nullable|string|max:150',
            'representante'   => 'nullable|string|max:150',
            'cedula'          => [
                'nullable', 'string', 'max:20',
                Rule::unique('terceros')->where('tenant_id', $tenantId)->ignore($ignoreId),
            ],
            'nombre_completo' => 'nullable|string|max:150',
            'nombre_comercial'=> 'nullable|string|max:150',
            'telefono'        => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:100',
        ];
    }
}
