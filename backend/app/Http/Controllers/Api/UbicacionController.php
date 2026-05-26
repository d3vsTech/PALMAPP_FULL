<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Departamento;
use App\Models\Municipio;
use App\Support\WizardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class UbicacionController extends Controller
{
    /**
     * GET /api/v1/departamentos
     * Listar todos los departamentos de Colombia.
     */
    public function departamentos(): JsonResponse
    {
        try {
            $departamentos = Cache::remember(
                WizardCache::departamentos(),
                WizardCache::TTL_UBICACIONES,
                fn () => Departamento::orderBy('nombre')->get(['codigo', 'nombre']),
            );

            return response()->json(['data' => $departamentos])
                ->header('Cache-Control', 'public, max-age=21600')
                ->header('ETag', '"' . md5(serialize($departamentos)) . '"');
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
            $payload = Cache::remember(
                WizardCache::municipios($codigo),
                WizardCache::TTL_UBICACIONES,
                function () use ($codigo) {
                    $departamento = Departamento::find($codigo);

                    if (!$departamento) {
                        return null;
                    }

                    return [
                        'departamento' => $departamento->nombre,
                        'municipios'   => Municipio::where('departamento_codigo', $codigo)
                            ->orderBy('nombre')
                            ->get(['codigo', 'nombre']),
                    ];
                },
            );

            if ($payload === null) {
                return response()->json([
                    'message' => 'Departamento no encontrado',
                ], 404);
            }

            return response()->json([
                'data' => $payload['municipios'],
                'departamento' => $payload['departamento'],
            ])
                ->header('Cache-Control', 'public, max-age=21600')
                ->header('ETag', '"' . md5(serialize($payload)) . '"');
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al obtener los municipios',
            ], 500);
        }
    }
}
