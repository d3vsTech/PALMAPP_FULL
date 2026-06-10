<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmpresaTransportadora\StoreEmpresaTransportadoraRequest;
use App\Http\Requests\EmpresaTransportadora\UpdateEmpresaTransportadoraRequest;
use App\Models\EmpresaTransportadora;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmpresaTransportadoraController extends Controller
{
    public function __construct(protected AuditoriaService $auditoria) {}

    /**
     * Select de empresas transportadoras activas.
     * Alimenta el dropdown "Transportador" del form de creación de viaje.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $empresas = EmpresaTransportadora::query()
                ->activas()
                ->when($request->search, fn ($q, $v) => $q->where('razon_social', 'ilike', "%{$v}%"))
                ->orderBy('razon_social')
                ->get(['id', 'razon_social', 'nit', 'tipo_persona']);

            return response()->json(['data' => $empresas]);
        } catch (\Throwable $e) {
            Log::error('Error al listar empresas transportadoras (select): ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar empresas', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Lista los transportadores activos de una empresa específica.
     * Alimenta el dropdown "Conductor" una vez elegida la empresa.
     */
    public function transportadores(EmpresaTransportadora $empresa): JsonResponse
    {
        try {
            $transportadores = $empresa->transportadores()
                ->activos()
                ->orderBy('nombres')
                ->get([
                    'id', 'empresa_transportadora_id',
                    'nombres', 'apellidos', 'placa_vehiculo',
                    'tipo_vehiculo', 'capacidad_kg',
                ]);

            return response()->json(['data' => $transportadores]);
        } catch (\Throwable $e) {
            Log::error('Error al listar transportadores de empresa: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar transportadores', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $withCount = filter_var($request->query('with_transportadores_count', false), FILTER_VALIDATE_BOOLEAN);

            $items = EmpresaTransportadora::query()
                ->when($withCount, fn ($q) => $q->withCount('transportadores'))
                ->when($request->search, function ($q, $s) {
                    $q->where(function ($q2) use ($s) {
                        $q2->where('razon_social', 'ilike', "%{$s}%")
                           ->orWhere('nit', 'ilike', "%{$s}%");
                    });
                })
                ->when($request->has('estado'), fn ($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->when($request->tipo_persona, fn ($q, $v) => $q->where('tipo_persona', $v))
                ->orderBy('razon_social')
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
            Log::error('Error al listar empresas transportadoras: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar las empresas', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(EmpresaTransportadora $empresa): JsonResponse
    {
        try {
            $empresa->loadCount('transportadores');
            return response()->json(['data' => $empresa]);
        } catch (\Throwable $e) {
            Log::error('Error al mostrar empresa transportadora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al consultar la empresa', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreEmpresaTransportadoraRequest $request): JsonResponse
    {
        try {
            $empresa = EmpresaTransportadora::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'EMPRESAS_TRANSPORTADORAS', $empresa,
                "Se creó la empresa transportadora '{$empresa->razon_social}'"
            );

            return response()->json([
                'message' => 'Empresa transportadora creada correctamente',
                'data'    => $empresa,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear empresa transportadora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear la empresa', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateEmpresaTransportadoraRequest $request, EmpresaTransportadora $empresa): JsonResponse
    {
        try {
            $datosAnteriores = $empresa->toArray();
            $empresa->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'EMPRESAS_TRANSPORTADORAS', $empresa, $datosAnteriores,
                "Se editó la empresa transportadora '{$empresa->razon_social}'"
            );

            return response()->json([
                'message' => 'Empresa transportadora actualizada correctamente',
                'data'    => $empresa->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar empresa transportadora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la empresa', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, EmpresaTransportadora $empresa): JsonResponse
    {
        try {
            $razonSocial = $empresa->razon_social;

            $this->auditoria->registrarEliminacion(
                $request, 'EMPRESAS_TRANSPORTADORAS', $empresa,
                "Se inactivó la empresa transportadora '{$razonSocial}'"
            );

            // Soft delete: las FK de viajes son restrictOnDelete.
            $empresa->update(['estado' => false]);

            return response()->json(['message' => "Empresa '{$razonSocial}' eliminada correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar empresa transportadora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la empresa', 'error' => $e->getMessage()], 500);
        }
    }
}
