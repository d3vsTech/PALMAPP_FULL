<?php

namespace App\Services\Nomina;

use App\Models\Empleado;
use App\Models\NominaConcepto;
use App\Models\Prestamo;
use App\Models\PrestamoCuota;
use App\Models\TenantConfig;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PrestamoService
{
    /**
     * Crea un préstamo y genera su calendario de cuotas.
     */
    public function crear(array $data, int $tenantId, int $userId): Prestamo
    {
        return DB::transaction(function () use ($data, $tenantId, $userId) {
            $this->ensureConceptoPrestamo($tenantId);

            $config     = TenantConfig::where('tenant_id', $tenantId)->first();
            $frecuencia = $config?->tipo_pago_nomina ?? 'QUINCENAL';

            $valorTotal = (float) $data['valor_total'];
            $numCuotas  = (int) $data['num_cuotas'];
            $cuotaValor = floor($valorTotal / $numCuotas * 100) / 100;

            $prestamo = Prestamo::create([
                'tenant_id'        => $tenantId,
                'empleado_id'      => $data['empleado_id'],
                'concepto'         => $data['concepto'],
                'valor_total'      => $valorTotal,
                'num_cuotas'       => $numCuotas,
                'cuota_valor'      => $cuotaValor,
                'inicio_anio'      => $data['inicio_anio'],
                'inicio_mes'       => $data['inicio_mes'],
                'inicio_quincena'  => $frecuencia === 'QUINCENAL' ? ($data['inicio_quincena'] ?? null) : null,
                'saldo_pendiente'  => $valorTotal,
                'cuotas_pagadas'   => 0,
                'estado'           => Prestamo::ESTADO_VIGENTE,
                'observaciones'    => $data['observaciones'] ?? null,
                'created_by'       => $userId,
            ]);

            $this->generarCuotas($prestamo, $frecuencia);

            return $prestamo->load(['empleado', 'cuotas']);
        });
    }

    /**
     * Genera N filas en prestamo_cuotas.
     * Para QUINCENAL avanza de quincena en quincena; para MENSUAL avanza mes a mes.
     */
    public function generarCuotas(Prestamo $prestamo, string $frecuencia = 'QUINCENAL'): void
    {
        $anio     = $prestamo->inicio_anio;
        $mes      = $prestamo->inicio_mes;
        $quincena = $prestamo->inicio_quincena;
        $cuotas   = [];
        $residuo  = round($prestamo->valor_total - ($prestamo->num_cuotas - 1) * $prestamo->cuota_valor, 2);

        for ($i = 1; $i <= $prestamo->num_cuotas; $i++) {
            $monto = ($i === $prestamo->num_cuotas) ? $residuo : $prestamo->cuota_valor;

            $cuotas[] = [
                'tenant_id'    => $prestamo->tenant_id,
                'prestamo_id'  => $prestamo->id,
                'numero_cuota' => $i,
                'anio'         => $anio,
                'mes'          => $mes,
                'quincena'     => $frecuencia === 'QUINCENAL' ? $quincena : null,
                'monto'        => $monto,
                'estado'       => PrestamoCuota::ESTADO_PENDIENTE,
                'created_at'   => now(),
                'updated_at'   => now(),
            ];

            if ($frecuencia === 'QUINCENAL') {
                [$anio, $mes, $quincena] = $this->siguienteQuincena($anio, $mes, $quincena);
            } else {
                [$anio, $mes] = $this->siguienteMes($anio, $mes);
            }
        }

        PrestamoCuota::insert($cuotas);
    }

    /**
     * Edita un préstamo. Si ya tiene cuotas aplicadas solo permite cambiar
     * concepto y observaciones.
     */
    public function actualizar(Prestamo $prestamo, array $data): Prestamo
    {
        return DB::transaction(function () use ($prestamo, $data) {
            $camposFinancieros = ['valor_total', 'num_cuotas', 'inicio_anio', 'inicio_mes', 'inicio_quincena'];
            $intentaCambioFinanciero = ! empty(array_intersect(array_keys($data), $camposFinancieros));

            if ($prestamo->cuotas_pagadas > 0 && $intentaCambioFinanciero) {
                throw new InvalidArgumentException('PRESTAMO_NO_EDITABLE');
            }

            if ($prestamo->cuotas_pagadas === 0 && $intentaCambioFinanciero) {
                $valorTotal = (float) ($data['valor_total'] ?? $prestamo->valor_total);
                $numCuotas  = (int) ($data['num_cuotas'] ?? $prestamo->num_cuotas);
                $cuotaValor = floor($valorTotal / $numCuotas * 100) / 100;

                $data['cuota_valor']     = $cuotaValor;
                $data['saldo_pendiente'] = $valorTotal;

                $prestamo->cuotas()->delete();
                $prestamo->update(array_merge($data, [
                    'valor_total' => $valorTotal,
                    'num_cuotas'  => $numCuotas,
                ]));

                $config     = TenantConfig::where('tenant_id', $prestamo->tenant_id)->first();
                $frecuencia = $config?->tipo_pago_nomina ?? 'QUINCENAL';
                $this->generarCuotas($prestamo->fresh(), $frecuencia);
            } else {
                $prestamo->update(Arr::only($data, ['concepto', 'observaciones']));
            }

            return $prestamo->fresh(['empleado', 'cuotas']);
        });
    }

    /**
     * Cancela un préstamo (soft-delete + estado CANCELADO).
     */
    public function cancelar(Prestamo $prestamo): void
    {
        DB::transaction(function () use ($prestamo) {
            $prestamo->update(['estado' => Prestamo::ESTADO_CANCELADO]);
            $prestamo->delete();
        });
    }

    /**
     * Marca una cuota como APLICADA y actualiza el saldo del préstamo.
     * Llamado desde NominaCalculationService::liquidar().
     */
    public function aplicarCuota(
        PrestamoCuota $cuota,
        int $nominaEmpleadoId,
        int $nominaEmpleadoConceptoId,
        int $userId
    ): void {
        DB::transaction(function () use ($cuota, $nominaEmpleadoId, $nominaEmpleadoConceptoId, $userId) {
            $cuota->update([
                'estado'                      => PrestamoCuota::ESTADO_APLICADA,
                'nomina_empleado_id'          => $nominaEmpleadoId,
                'nomina_empleado_concepto_id' => $nominaEmpleadoConceptoId,
                'aplicada_por'                => $userId,
                'aplicada_at'                 => now(),
            ]);

            $prestamo = $cuota->prestamo()->lockForUpdate()->first();
            $nuevoCuotasPagadas = $prestamo->cuotas_pagadas + 1;
            $nuevoSaldo         = round($prestamo->saldo_pendiente - $cuota->monto, 2);
            $nuevoEstado        = ($nuevoCuotasPagadas >= $prestamo->num_cuotas)
                ? Prestamo::ESTADO_PAGADO
                : Prestamo::ESTADO_VIGENTE;

            $prestamo->update([
                'cuotas_pagadas'  => $nuevoCuotasPagadas,
                'saldo_pendiente' => max(0, $nuevoSaldo),
                'estado'          => $nuevoEstado,
            ]);
        });
    }

    /**
     * Cuotas PENDIENTE de un empleado cuyo período coincide con la nómina actual.
     * Solo de préstamos VIGENTE.
     * $quincena es null para tenants con tipo_pago_nomina MENSUAL.
     */
    public function cuotasPendientesParaNomina(
        int $empleadoId,
        int $anio,
        int $mes,
        ?int $quincena
    ): Collection {
        return PrestamoCuota::query()
            ->whereHas('prestamo', fn ($q) => $q
                ->where('empleado_id', $empleadoId)
                ->where('estado', Prestamo::ESTADO_VIGENTE)
            )
            ->with('prestamo:id,concepto,num_cuotas,saldo_pendiente,cuota_valor')
            ->where('anio', $anio)
            ->where('mes', $mes)
            ->when($quincena !== null, fn ($q) => $q->where('quincena', $quincena))
            ->when($quincena === null, fn ($q) => $q->whereNull('quincena'))
            ->where('estado', PrestamoCuota::ESTADO_PENDIENTE)
            ->get();
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private function siguienteQuincena(int $anio, int $mes, int $quincena): array
    {
        if ($quincena === 1) {
            return [$anio, $mes, 2];
        }
        // Q2 → Q1 del mes siguiente
        if ($mes === 12) {
            return [$anio + 1, 1, 1];
        }

        return [$anio, $mes + 1, 1];
    }

    private function siguienteMes(int $anio, int $mes): array
    {
        return $mes === 12 ? [$anio + 1, 1] : [$anio, $mes + 1];
    }

    /**
     * Garantiza que el concepto DCTO_ADELANTO existe para el tenant.
     * Se llama al crear un préstamo para que el liquidador siempre encuentre
     * el concepto en el catálogo, aunque el seeder no se haya ejecutado aún.
     */
    private function ensureConceptoPrestamo(int $tenantId): void
    {
        NominaConcepto::firstOrCreate(
            ['tenant_id' => $tenantId, 'codigo' => 'DCTO_ADELANTO'],
            [
                'nombre'                => 'Descuento Adelantos / Préstamo',
                'tipo'                  => 'DEDUCCION_VOLUNTARIA',
                'subtipo'               => 'PRESTAMO',
                'operacion'             => 'RESTA',
                'calculo'               => 'VALOR_FIJO',
                'base_calculo'          => 'MANUAL',
                'aplica_a'              => 'AMBOS',
                'activo'                => true,
                'valor_referencia'      => 0,
                'es_obligatorio'        => false,
                'porcentaje_empleado'   => null,
                'porcentaje_empresa'    => null,
                'vigente_desde'         => null,
                'vigente_hasta'         => null,
                'afecta_salario_minimo' => false,
                'tipo_remuneracion'     => 'REMUNERADO',
            ]
        );
    }
}
