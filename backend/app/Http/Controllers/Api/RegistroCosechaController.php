<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cosecha\StoreRegistroCosechaRequest;
use App\Http\Requests\Cosecha\UpdateRegistroCosechaRequest;
use App\Models\CosechaCuadrilla;
use App\Models\Labor;
use App\Models\Operacion;
use App\Models\RegistroCosecha;
use App\Services\AuditoriaService;
use App\Services\CosechaCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistroCosechaController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
        protected CosechaCalculationService $calcService,
    ) {}

    public function store(StoreRegistroCosechaRequest $request, Operacion $operacion): JsonResponse
    {
        try {
            if ($operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden agregar cosechas a una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $data = $request->validated();
            $anio = (int) $operacion->fecha->format('Y');
            $peso = isset($data['peso_confirmado']) ? (float) $data['peso_confirmado'] : null;

            // Derivar terceroId: del campo explícito o del primer operario de la cuadrilla
            $terceroId = $data['tercero_id'] ?? $this->derivarTerceroIdDeCuadrilla($data['cuadrilla']);

            $laborCosecha = $this->resolverLaborCosecha();
            $calc = $this->calcService->calcular($laborCosecha, $data['lote_id'], $anio, $peso, $terceroId);

            [$cosecha, $n] = DB::transaction(function () use ($operacion, $data, $peso, $calc, $laborCosecha) {
                $cosecha = RegistroCosecha::create([
                    'operacion_id'     => $operacion->id,
                    'lote_id'          => $data['lote_id'],
                    'sublote_id'       => $data['sublote_id'],
                    'labor_id'         => $laborCosecha->id,
                    'gajos_reportados' => $data['gajos_reportados'],
                    'peso_confirmado'  => $data['peso_confirmado'] ?? null,
                    'precio_cosecha'   => $calc['precio_cosecha'],
                    'promedio_kg_gajo' => $calc['promedio_kg_gajo'],
                    'valor_total'      => $calc['valor_total'],
                    'estado'           => true,
                ]);

                $miembros = collect($data['cuadrilla'])->unique(function ($m) {
                    return !empty($m['empleado_id']) ? "E_{$m['empleado_id']}" : "O_{$m['operario_id']}";
                })->values();
                $n = $miembros->count();

                $dist = $this->calcService->distribuirCuadrilla(
                    $calc['valor_total'] !== null ? (float) $calc['valor_total'] : null,
                    $peso,
                    $n,
                );

                foreach ($miembros as $miembro) {
                    CosechaCuadrilla::create([
                        'cosecha_id'              => $cosecha->id,
                        'empleado_id'             => $miembro['empleado_id'] ?? null,
                        'operario_id'             => $miembro['operario_id'] ?? null,
                        'tercero_id'              => $miembro['tercero_id'] ?? null,
                        'peso_calculado_empleado' => $dist['peso_por_empleado'],
                        'valor_calculado'         => $dist['valor_por_empleado'],
                        'estado'                  => true,
                    ]);
                }

                return [$cosecha, $n];
            });

            $descripcion = $cosecha->valor_total !== null
                ? "Se agregó cosecha con peso {$cosecha->peso_confirmado} kg (valor_total \${$cosecha->valor_total}, distribuido entre {$n} miembros) en planilla {$operacion->fecha->format('Y-m-d')} (lote {$cosecha->lote_id})"
                : "Se agregó cosecha pendiente de peso (solo gajos={$cosecha->gajos_reportados}, {$n} miembros) en planilla {$operacion->fecha->format('Y-m-d')} (lote {$cosecha->lote_id})";

            $this->auditoria->registrarCreacion($request, 'COSECHAS', $cosecha, $descripcion);

            return response()->json([
                'message' => 'Cosecha registrada correctamente',
                'data'    => $cosecha->load(
                    'cuadrilla.empleado:id,primer_nombre,primer_apellido,documento',
                    'cuadrilla.operario:id,nombres,apellidos',
                    'cuadrilla.tercero:id,tipo_persona,razon_social,nombre_completo',
                ),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error al crear cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al registrar la cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateRegistroCosechaRequest $request, RegistroCosecha $cosecha): JsonResponse
    {
        try {
            $cosecha->load('operacion');

            if ($cosecha->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden editar cosechas de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            $validated       = $request->validated();
            $datosAnteriores = $cosecha->toArray();

            $laborCosecha = $cosecha->labor ?: $this->resolverLaborCosecha();

            $pesoCambio   = array_key_exists('peso_confirmado', $validated);
            $pesoEfectivo = $pesoCambio ? $validated['peso_confirmado'] : $cosecha->peso_confirmado;
            $pesoEfectivo = $pesoEfectivo !== null ? (float) $pesoEfectivo : null;

            // Si la labor COSECHA está en JORNAL_FIJO, el valor_total no depende del peso —
            // viene de labor.precio_palma. Resolver de una sola pasada.
            if ($laborCosecha->esJornalFijo()) {
                $calc = $this->calcService->calcular(
                    $laborCosecha,
                    $cosecha->lote_id,
                    (int) $cosecha->operacion->fecha->format('Y'),
                    $pesoEfectivo,
                );

                $valorTotal              = $calc['valor_total'] !== null ? (float) $calc['valor_total'] : null;
                $nuevoPrecioSnapshot     = null; // JORNAL_FIJO no usa precios_cosecha
                $nuevoPromedioSnapshot   = null;
            } else {
                // POR_PALMA — lógica histórica con snapshot de precio.
                $precioSnapshot = $cosecha->precio_cosecha !== null ? (float) $cosecha->precio_cosecha : null;
                $nuevoPrecioSnapshot   = null;
                $nuevoPromedioSnapshot = null;

                if ($pesoCambio && $pesoEfectivo !== null && $precioSnapshot === null) {
                    $anio = (int) $cosecha->operacion->fecha->format('Y');
                    $calc = $this->calcService->calcular($laborCosecha, $cosecha->lote_id, $anio, $pesoEfectivo);
                    $nuevoPrecioSnapshot   = $calc['precio_cosecha'];
                    $nuevoPromedioSnapshot = $calc['promedio_kg_gajo'];
                    $precioSnapshot = (float) $calc['precio_cosecha'];
                }

                if ($pesoCambio) {
                    $valorTotal = ($pesoEfectivo !== null && $precioSnapshot !== null)
                        ? round($pesoEfectivo * $precioSnapshot, 2)
                        : null;
                } else {
                    $valorTotal = $cosecha->valor_total !== null ? (float) $cosecha->valor_total : null;
                }
            }

            $cosecha = DB::transaction(function () use (
                $cosecha, $validated, $pesoEfectivo, $valorTotal, $pesoCambio,
                $nuevoPrecioSnapshot, $nuevoPromedioSnapshot, $laborCosecha
            ) {
                $cosecha->fill(collect($validated)->except('cuadrilla')->toArray());

                // Snapshot de la labor (por si la cosecha histórica aún no la tenía).
                if ($cosecha->labor_id === null) {
                    $cosecha->labor_id = $laborCosecha->id;
                }

                if ($nuevoPrecioSnapshot !== null) {
                    $cosecha->precio_cosecha   = $nuevoPrecioSnapshot;
                    $cosecha->promedio_kg_gajo = $nuevoPromedioSnapshot;
                }

                if ($pesoCambio || $laborCosecha->esJornalFijo()) {
                    $cosecha->valor_total = $valorTotal !== null ? (string) $valorTotal : null;
                }
                $cosecha->save();

                if (isset($validated['cuadrilla'])) {
                    $cosecha->cuadrilla()->delete();

                    $miembros = collect($validated['cuadrilla'])->unique(function ($m) {
                        return !empty($m['empleado_id']) ? "E_{$m['empleado_id']}" : "O_{$m['operario_id']}";
                    })->values();
                    $n = $miembros->count();

                    $dist = $this->calcService->distribuirCuadrilla($valorTotal, $pesoEfectivo, $n);

                    foreach ($miembros as $miembro) {
                        CosechaCuadrilla::create([
                            'cosecha_id'              => $cosecha->id,
                            'empleado_id'             => $miembro['empleado_id'] ?? null,
                            'operario_id'             => $miembro['operario_id'] ?? null,
                            'tercero_id'              => $miembro['tercero_id'] ?? null,
                            'peso_calculado_empleado' => $dist['peso_por_empleado'],
                            'valor_calculado'         => $dist['valor_por_empleado'],
                            'estado'                  => true,
                        ]);
                    }
                } elseif ($pesoCambio || $laborCosecha->esJornalFijo()) {
                    // Solo se tocó el peso (POR_PALMA) o la labor es JORNAL_FIJO —
                    // redistribuir sobre la cuadrilla existente.
                    $n = $cosecha->cuadrilla()->count();
                    $dist = $this->calcService->distribuirCuadrilla($valorTotal, $pesoEfectivo, $n);

                    if ($n > 0) {
                        $cosecha->cuadrilla()->update([
                            'valor_calculado'         => $dist['valor_por_empleado'],
                            'peso_calculado_empleado' => $dist['peso_por_empleado'],
                        ]);
                    }
                }

                return $cosecha;
            });

            $eraPendiente = $datosAnteriores['peso_confirmado'] === null;
            $yaHidratada  = $cosecha->peso_confirmado !== null;

            $descripcion = ($eraPendiente && $yaHidratada)
                ? "Se hidrató cosecha #{$cosecha->id}: peso={$cosecha->peso_confirmado} kg, valor_total \${$cosecha->valor_total}"
                : "Se editó cosecha #{$cosecha->id}";

            $this->auditoria->registrarEdicion($request, 'COSECHAS', $cosecha, $datosAnteriores, $descripcion);

            return response()->json([
                'message' => 'Cosecha actualizada correctamente',
                'data'    => $cosecha->fresh()->load(
                    'cuadrilla.empleado:id,primer_nombre,primer_apellido,documento',
                    'cuadrilla.operario:id,nombres,apellidos',
                    'cuadrilla.tercero:id,tipo_persona,razon_social,nombre_completo',
                ),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al actualizar la cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, RegistroCosecha $cosecha): JsonResponse
    {
        try {
            $cosecha->load('operacion');

            if ($cosecha->operacion->isAprobada()) {
                return response()->json([
                    'message' => 'No se pueden eliminar cosechas de una planilla aprobada',
                    'code'    => 'OPERACION_APROBADA',
                ], 409);
            }

            if ($cosecha->viajeDetalles()->where('estado', true)->exists()) {
                return response()->json([
                    'message' => 'No se puede eliminar: la cosecha está incluida en un viaje',
                    'code'    => 'COSECHA_EN_VIAJE',
                ], 409);
            }

            $this->auditoria->registrarEliminacion(
                $request, 'COSECHAS', $cosecha,
                "Se eliminó cosecha #{$cosecha->id}",
            );

            DB::transaction(function () use ($cosecha) {
                $cosecha->cuadrilla()->delete();
                $cosecha->delete();
            });

            return response()->json(['message' => 'Cosecha eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar cosecha: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar la cosecha', 'error' => $e->getMessage()], 500);
        }
    }

    public function bulkStore(Request $request, Operacion $operacion): JsonResponse
    {
        if ($operacion->isAprobada()) {
            return response()->json([
                'message' => 'No se pueden agregar cosechas a una planilla aprobada',
                'code'    => 'OPERACION_APROBADA',
            ], 409);
        }

        $validated = $request->validate([
            'items'                           => 'required|array|min:1|max:200',
            'items.*.lote_id'                 => 'required|exists:lotes,id',
            'items.*.sublote_id'              => 'nullable|exists:sublotes,id',
            'items.*.gajos_reportados'        => 'required|integer|min:0',
            'items.*.peso_confirmado'         => 'nullable|numeric|min:0',
            'items.*.tercero_id'              => 'nullable|exists:terceros,id',
            'items.*.cuadrilla'               => 'required|array|min:1',
            'items.*.cuadrilla.*.empleado_id' => 'nullable|exists:empleados,id',
            'items.*.cuadrilla.*.operario_id' => 'nullable|exists:operarios,id',
            'items.*.cuadrilla.*.tercero_id'  => 'nullable|exists:terceros,id',
        ]);

        try {
            $anio         = (int) $operacion->fecha->format('Y');
            $laborCosecha = $this->resolverLaborCosecha();

            $created = DB::transaction(function () use ($validated, $operacion, $anio, $laborCosecha) {
                $results = [];
                foreach ($validated['items'] as $data) {
                    $peso      = isset($data['peso_confirmado']) ? (float) $data['peso_confirmado'] : null;
                    $terceroId = $data['tercero_id'] ?? $this->derivarTerceroIdDeCuadrilla($data['cuadrilla']);
                    $calc      = $this->calcService->calcular($laborCosecha, $data['lote_id'], $anio, $peso, $terceroId);

                    $cosecha = RegistroCosecha::create([
                        'operacion_id'     => $operacion->id,
                        'lote_id'          => $data['lote_id'],
                        'sublote_id'       => $data['sublote_id'] ?? null,
                        'labor_id'         => $laborCosecha->id,
                        'gajos_reportados' => $data['gajos_reportados'],
                        'peso_confirmado'  => $data['peso_confirmado'] ?? null,
                        'precio_cosecha'   => $calc['precio_cosecha'],
                        'promedio_kg_gajo' => $calc['promedio_kg_gajo'],
                        'valor_total'      => $calc['valor_total'],
                        'estado'           => true,
                    ]);

                    $miembros = collect($data['cuadrilla'])->unique(function ($m) {
                        return !empty($m['empleado_id']) ? "E_{$m['empleado_id']}" : "O_{$m['operario_id']}";
                    })->values();
                    $n = $miembros->count();

                    $dist = $this->calcService->distribuirCuadrilla(
                        $calc['valor_total'] !== null ? (float) $calc['valor_total'] : null,
                        $peso,
                        $n,
                    );

                    foreach ($miembros as $miembro) {
                        CosechaCuadrilla::create([
                            'cosecha_id'              => $cosecha->id,
                            'empleado_id'             => $miembro['empleado_id'] ?? null,
                            'operario_id'             => $miembro['operario_id'] ?? null,
                            'tercero_id'              => $miembro['tercero_id'] ?? null,
                            'peso_calculado_empleado' => $dist['peso_por_empleado'],
                            'valor_calculado'         => $dist['valor_por_empleado'],
                            'estado'                  => true,
                        ]);
                    }

                    $results[] = ['id' => $cosecha->id];
                }
                return $results;
            });

            return response()->json(['data' => $created], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'CALC_ERROR'], 422);
        } catch (\Throwable $e) {
            Log::error('Error en bulk de cosechas: ' . $e->getMessage());
            return response()->json(['message' => 'Error al crear cosechas en bulk', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Resuelve la labor fija COSECHA del tenant actual. El seeder garantiza
     * que existe; si no se encuentra es un error de provisionamiento.
     */
    private function resolverLaborCosecha(): Labor
    {
        $tenantId = app('current_tenant_id');

        return Labor::query()
            ->where('tenant_id', $tenantId)
            ->where('tipo', Labor::TIPO_COSECHA)
            ->where('es_sistema', true)
            ->firstOrFail();
    }

    /**
     * Deriva el terceroId de la cuadrilla si todos los miembros son operarios.
     * Usa el tercero_id del primer operario encontrado.
     */
    private function derivarTerceroIdDeCuadrilla(array $cuadrilla): ?int
    {
        foreach ($cuadrilla as $miembro) {
            if (!empty($miembro['tercero_id'])) {
                return (int) $miembro['tercero_id'];
            }
        }
        return null;
    }
}
