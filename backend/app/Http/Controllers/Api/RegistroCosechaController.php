<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cosecha\StoreRegistroCosechaRequest;
use App\Http\Requests\Cosecha\UpdateRegistroCosechaRequest;
use App\Models\CosechaCuadrilla;
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

            $calc = $this->calcService->calcular($data['lote_id'], $anio, $peso);

            [$cosecha, $n] = DB::transaction(function () use ($operacion, $data, $peso, $calc) {
                $cosecha = RegistroCosecha::create([
                    'operacion_id'     => $operacion->id,
                    'lote_id'          => $data['lote_id'],
                    'sublote_id'       => $data['sublote_id'],
                    'gajos_reportados' => $data['gajos_reportados'],
                    'peso_confirmado'  => $data['peso_confirmado'] ?? null,
                    'precio_cosecha'   => $calc['precio_cosecha'],
                    'promedio_kg_gajo' => $calc['promedio_kg_gajo'],
                    'valor_total'      => $calc['valor_total'],
                    'estado'           => true,
                ]);

                $empleados = collect($data['cuadrilla'])->pluck('empleado_id')->unique()->values();
                $n = $empleados->count();

                $dist = $this->calcService->distribuirCuadrilla(
                    $calc['valor_total'] !== null ? (float) $calc['valor_total'] : null,
                    $peso,
                    $n,
                );

                foreach ($empleados as $empleadoId) {
                    CosechaCuadrilla::create([
                        'cosecha_id'              => $cosecha->id,
                        'empleado_id'             => $empleadoId,
                        'peso_calculado_empleado' => $dist['peso_por_empleado'],
                        'valor_calculado'         => $dist['valor_por_empleado'],
                        'estado'                  => true,
                    ]);
                }

                return [$cosecha, $n];
            });

            $descripcion = $cosecha->valor_total !== null
                ? "Se agregó cosecha con peso {$cosecha->peso_confirmado} kg (valor_total \${$cosecha->valor_total}, distribuido entre {$n} empleados) en planilla {$operacion->fecha->format('Y-m-d')} (lote {$cosecha->lote_id})"
                : "Se agregó cosecha pendiente de peso (solo gajos={$cosecha->gajos_reportados}, {$n} empleados) en planilla {$operacion->fecha->format('Y-m-d')} (lote {$cosecha->lote_id})";

            $this->auditoria->registrarCreacion($request, 'COSECHAS', $cosecha, $descripcion);

            return response()->json([
                'message' => 'Cosecha registrada correctamente',
                'data'    => $cosecha->load('cuadrilla.empleado:id,primer_nombre,primer_apellido,documento'),
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

            $pesoCambio   = array_key_exists('peso_confirmado', $validated);
            $pesoEfectivo = $pesoCambio ? $validated['peso_confirmado'] : $cosecha->peso_confirmado;
            $pesoEfectivo = $pesoEfectivo !== null ? (float) $pesoEfectivo : null;

            // Snapshot de precio — se guarda al crear. Si es NULL (creación hecha
            // sin precios_cosecha configurado) y ahora llega peso, fetch fresco y
            // valida CALC_ERROR vía el servicio.
            $precioSnapshot = $cosecha->precio_cosecha !== null ? (float) $cosecha->precio_cosecha : null;
            $nuevoPrecioSnapshot = null;
            $nuevoPromedioSnapshot = null;

            if ($pesoCambio && $pesoEfectivo !== null && $precioSnapshot === null) {
                $anio = (int) $cosecha->operacion->fecha->format('Y');
                $calc = $this->calcService->calcular($cosecha->lote_id, $anio, $pesoEfectivo);
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

            $cosecha = DB::transaction(function () use (
                $cosecha, $validated, $pesoEfectivo, $valorTotal, $pesoCambio,
                $nuevoPrecioSnapshot, $nuevoPromedioSnapshot
            ) {
                $cosecha->fill(collect($validated)->except('cuadrilla')->toArray());

                if ($nuevoPrecioSnapshot !== null) {
                    $cosecha->precio_cosecha   = $nuevoPrecioSnapshot;
                    $cosecha->promedio_kg_gajo = $nuevoPromedioSnapshot;
                }

                if ($pesoCambio) {
                    $cosecha->valor_total = $valorTotal !== null ? (string) $valorTotal : null;
                }
                $cosecha->save();

                if (isset($validated['cuadrilla'])) {
                    $cosecha->cuadrilla()->delete();

                    $empleados = collect($validated['cuadrilla'])->pluck('empleado_id')->unique()->values();
                    $n = $empleados->count();

                    $dist = $this->calcService->distribuirCuadrilla($valorTotal, $pesoEfectivo, $n);

                    foreach ($empleados as $empleadoId) {
                        CosechaCuadrilla::create([
                            'cosecha_id'              => $cosecha->id,
                            'empleado_id'             => $empleadoId,
                            'peso_calculado_empleado' => $dist['peso_por_empleado'],
                            'valor_calculado'         => $dist['valor_por_empleado'],
                            'estado'                  => true,
                        ]);
                    }
                } elseif ($pesoCambio) {
                    // Solo se tocó el peso, redistribuir sobre la cuadrilla existente.
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
                'data'    => $cosecha->fresh()->load('cuadrilla.empleado:id,primer_nombre,primer_apellido,documento'),
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

            if ($cosecha->viajeDetalles()->exists()) {
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
}
