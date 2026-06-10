<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TipoHoraExtra\StoreTipoHoraExtraRequest;
use App\Http\Requests\TipoHoraExtra\UpdateTipoHoraExtraRequest;
use App\Models\TipoHoraExtra;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TipoHoraExtraController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public function codigos(): JsonResponse
    {
        $codigos = [
            ['codigo' => TipoHoraExtra::CODIGO_HED,  'nombre' => 'Hora Extra Diurna',                     'descripcion' => '6:00 AM – 9:00 PM, días hábiles',        'es_extra' => true,  'paga_hora_completa' => true,  'porcentaje_recargo' => 25.00],
            ['codigo' => TipoHoraExtra::CODIGO_HEN,  'nombre' => 'Hora Extra Nocturna',                   'descripcion' => '9:00 PM – 6:00 AM, días hábiles',        'es_extra' => true,  'paga_hora_completa' => true,  'porcentaje_recargo' => 75.00],
            ['codigo' => TipoHoraExtra::CODIGO_RN,   'nombre' => 'Recargo Nocturno',                      'descripcion' => '9:00 PM – 6:00 AM (dentro de jornada)',  'es_extra' => false, 'paga_hora_completa' => false, 'porcentaje_recargo' => 35.00],
            ['codigo' => TipoHoraExtra::CODIGO_HRD,  'nombre' => 'Hora Ordinaria Dominical/Festivo',      'descripcion' => 'Jornada ordinaria en domingo o festivo',  'es_extra' => false, 'paga_hora_completa' => true,  'porcentaje_recargo' => 90.00],
            ['codigo' => TipoHoraExtra::CODIGO_HEDF, 'nombre' => 'Hora Extra Diurna Dominical/Festivo',   'descripcion' => '6:00 AM – 9:00 PM en domingo o festivo',  'es_extra' => true,  'paga_hora_completa' => true,  'porcentaje_recargo' => 115.00],
            ['codigo' => TipoHoraExtra::CODIGO_HENF, 'nombre' => 'Hora Extra Nocturna Dominical/Festivo', 'descripcion' => '9:00 PM – 6:00 AM en domingo o festivo',  'es_extra' => true,  'paga_hora_completa' => true,  'porcentaje_recargo' => 165.00],
            ['codigo' => TipoHoraExtra::CODIGO_RND,  'nombre' => 'Recargo Nocturno Dominical/Festivo',    'descripcion' => 'Jornada ordinaria nocturna en festivo',   'es_extra' => false, 'paga_hora_completa' => false, 'porcentaje_recargo' => 125.00],
        ];

        return response()->json(['data' => $codigos]);
    }

    /**
     * Listado liviano para dropdowns (wizard Paso 4 - Horas Extras).
     * Incluye codigo + porcentaje + flags para ayuda contextual en la UI.
     */
    public function select(Request $request): JsonResponse
    {
        try {
            $soloActivos = !$request->has('estado') || filter_var($request->estado, FILTER_VALIDATE_BOOLEAN);

            $tipos = TipoHoraExtra::query()
                ->when($soloActivos, fn($q) => $q->where('estado', true))
                ->when(!$soloActivos && $request->has('estado'), fn($q) => $q->where('estado', false))
                ->orderBy('codigo')
                ->get(['id', 'codigo', 'nombre', 'porcentaje_recargo', 'franja_horaria', 'aplica_festivo', 'es_extra', 'paga_hora_completa', 'descripcion']);

            return response()->json(['data' => $tipos]);
        } catch (\Throwable $e) {
            Log::error('Error en tipos-hora-extra/select: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar tipos de hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $tipos = TipoHoraExtra::query()
                ->when($request->search, fn($q, $s) => $q->where('nombre', 'ilike', "%{$s}%"))
                ->when($request->codigo, fn($q, $c) => $q->where('codigo', $c))
                ->when($request->has('estado'), fn($q) => $q->where('estado', filter_var($request->estado, FILTER_VALIDATE_BOOLEAN)))
                ->orderBy('codigo')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'data' => $tipos->items(),
                'meta' => [
                    'current_page' => $tipos->currentPage(),
                    'last_page'    => $tipos->lastPage(),
                    'per_page'     => $tipos->perPage(),
                    'total'        => $tipos->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al listar tipos-hora-extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los tipos de hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(TipoHoraExtra $tipoHoraExtra): JsonResponse
    {
        return response()->json(['data' => $tipoHoraExtra]);
    }

    public function store(StoreTipoHoraExtraRequest $request): JsonResponse
    {
        try {
            $tipo = TipoHoraExtra::create($request->validated());

            $this->auditoria->registrarCreacion(
                $request, 'TIPOS_HORA_EXTRA', $tipo,
                "Se creó el tipo de hora extra '{$tipo->codigo}' ({$tipo->nombre}) — recargo {$tipo->porcentaje_recargo}%"
            );

            return response()->json([
                'message' => 'Tipo de hora extra creado correctamente',
                'data'    => $tipo,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al crear tipo de hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear el tipo de hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateTipoHoraExtraRequest $request, TipoHoraExtra $tipoHoraExtra): JsonResponse
    {
        try {
            $datosAnteriores = $tipoHoraExtra->toArray();
            $tipoHoraExtra->update($request->validated());

            $this->auditoria->registrarEdicion(
                $request, 'TIPOS_HORA_EXTRA', $tipoHoraExtra, $datosAnteriores,
                "Se editó el tipo de hora extra '{$tipoHoraExtra->codigo}'"
            );

            return response()->json([
                'message' => 'Tipo de hora extra actualizado correctamente',
                'data'    => $tipoHoraExtra->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar tipo de hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar el tipo de hora extra', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, TipoHoraExtra $tipoHoraExtra): JsonResponse
    {
        try {
            if ($tipoHoraExtra->horasExtra()->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar el tipo porque tiene horas extra asociadas',
                    'code'    => 'TIPO_HORA_EXTRA_CON_REGISTROS',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'TIPOS_HORA_EXTRA', $tipoHoraExtra,
                "Se eliminó el tipo de hora extra '{$tipoHoraExtra->codigo}'"
            );
            $tipoHoraExtra->delete();

            return response()->json(['message' => "Tipo '{$tipoHoraExtra->codigo}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar tipo de hora extra: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el tipo de hora extra', 'error' => $e->getMessage()], 500);
        }
    }
}
