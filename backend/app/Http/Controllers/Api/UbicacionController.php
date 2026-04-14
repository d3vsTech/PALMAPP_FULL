<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Departamento;
use App\Models\Municipio;
use Illuminate\Http\JsonResponse;

class UbicacionController extends Controller
{
    /**
     * GET /api/v1/departamentos
     * Listar todos los departamentos de Colombia.
     */
    public function departamentos(): JsonResponse
    {
        try {
            $departamentos = Departamento::orderBy('nombre')
                ->get(['codigo', 'nombre']);

            return response()->json([
                'data' => $departamentos,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al obtener los departamentos',
            ], 500);
        }
    }

    /**
     * GET /api/v1/departamentos/{codigo}/municipios
     * Listar municipios de un departamento.
     */
    public function municipios(string $codigo): JsonResponse
    {
        try {
            $departamento = Departamento::find($codigo);

            if (!$departamento) {
                return response()->json([
                    'message' => 'Departamento no encontrado',
                ], 404);
            }

            $municipios = Municipio::where('departamento_codigo', $codigo)
                ->orderBy('nombre')
                ->get(['codigo', 'nombre']);

            return response()->json([
                'data' => $municipios,
                'departamento' => $departamento->nombre,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al obtener los municipios',
            ], 500);
        }
    }
}
