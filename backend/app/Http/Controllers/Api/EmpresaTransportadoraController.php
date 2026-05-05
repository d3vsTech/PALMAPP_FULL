<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmpresaTransportadora;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmpresaTransportadoraController extends Controller
{
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
                ->get(['id', 'razon_social', 'nit']);

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
}
