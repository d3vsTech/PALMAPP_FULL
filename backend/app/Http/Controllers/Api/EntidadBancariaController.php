<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EntidadBancaria\StoreEntidadBancariaRequest;
use App\Http\Requests\EntidadBancaria\UpdateEntidadBancariaRequest;
use App\Models\EntidadBancaria;
use App\Services\AuditoriaService;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class EntidadBancariaController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    public function select(Request $request): JsonResponse
    {
        try {
            $tenantId = (int) app('current_tenant_id');

            $items = Cache::remember(
                WizardCache::entidadesBancarias($tenantId),
                WizardCache::TTL_PARAMETRICA,
                fn () => EntidadBancaria::query()
                    ->activos()
                    ->orderBy('nombre')
                    ->get(['id', 'nombre', 'codigo', 'contacto']),
            );

            return response()->json(['data' => $items])
                ->header('Cache-Control', 'private, max-age=600')
                ->header('ETag', '"' . md5(serialize($items)) . '"');
        } catch (\Throwable $e) {
            Log::error('Error en entidades-bancarias/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar entidades bancarias', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $items = EntidadBancaria::query()
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
            Log::error('Error al listar entidades bancarias: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las entidades bancarias', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(EntidadBancaria $entidadBancaria): JsonResponse
    {
        return response()->json(['data' => $entidadBancaria]);
    }

    public function store(StoreEntidadBancariaRequest $request): JsonResponse
    {
        try {
            $entidad = EntidadBancaria::create($request->validated());

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'entidades_bancarias');

            $this->auditoria->registrarCreacion(
                $request, 'ENTIDADES_BANCARIAS', $entidad,
                "Se creó la entidad bancaria '{$entidad->nombre}'"
            );

            return response()->json([
                'message' => 'Entidad bancaria creada correctamente',
                'data'    => $entidad,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear entidad bancaria: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la entidad bancaria', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateEntidadBancariaRequest $request, EntidadBancaria $entidadBancaria): JsonResponse
    {
        try {
            $datosAnteriores = $entidadBancaria->toArray();
            $entidadBancaria->update($request->validated());

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'entidades_bancarias');

            $this->auditoria->registrarEdicion(
                $request, 'ENTIDADES_BANCARIAS', $entidadBancaria, $datosAnteriores,
                "Se editó la entidad bancaria '{$entidadBancaria->nombre}'"
            );

            return response()->json([
                'message' => 'Entidad bancaria actualizada correctamente',
                'data'    => $entidadBancaria->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar entidad bancaria: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la entidad bancaria', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, EntidadBancaria $entidadBancaria): JsonResponse
    {
        try {
            $nombre = $entidadBancaria->nombre;

            $this->auditoria->registrarEliminacion(
                $request, 'ENTIDADES_BANCARIAS', $entidadBancaria,
                "Se eliminó la entidad bancaria '{$nombre}'"
            );
            $entidadBancaria->delete();

            WizardCache::forgetParametricasTenant((int) app('current_tenant_id'), 'entidades_bancarias');

            return response()->json(['message' => "Entidad bancaria '{$nombre}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar entidad bancaria: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la entidad bancaria', 'error' => $e->getMessage()], 500);
        }
    }
}
