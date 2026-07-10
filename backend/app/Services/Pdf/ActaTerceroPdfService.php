<?php

namespace App\Services\Pdf;

use App\Models\NominaTercero;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renderiza el acta de pago al contratista como PDF (DomPDF) y arma el array
 * estructurado que usa tanto el GET /terceros/{tercero} como el blade PDF.
 *
 * Cambios PR-4.2:
 *  - Operarios incluyen `total_jornales`, `total_cosecha`, `total_descuentos`,
 *    `descuentos[]` (lista de descuentos con concepto) y `subtotal`.
 *  - Se eliminan los campos `dias`, `tarifa_dia`, `ajuste`, `descuento_concepto`,
 *    `descuento_valor`, `descuento_observacion` (vista ahora es solo-lectura).
 */
class ActaTerceroPdfService
{
    public function pdf(NominaTercero $acta): Response
    {
        $data = $this->data($acta);
        $pdf  = Pdf::loadView('desprendible.acta_tercero', ['a' => $data])
            ->setPaper('letter')
            ->setOption('isPhpEnabled', true);

        return $pdf->download($this->filename($acta));
    }

    /**
     * Array estructurado del acta lista para la vista Blade o para el frontend
     * en `GET /nominas/{id}/terceros/{tercero}`.
     */
    public function data(NominaTercero $acta): array
    {
        $acta->loadMissing([
            'nomina',
            'tercero',
            'operarios.operario',
            'operarios.descuentos.concepto:id,codigo,nombre',
            'pagadoPor',
        ]);

        $tercero = $acta->tercero;
        $nomina  = $acta->nomina;
        $tenant  = app('current_tenant') ?? Tenant::find($acta->tenant_id);

        return [
            'tenant' => [
                'nombre'    => $tenant?->razon_social ?? $tenant?->nombre ?? '',
                'nit'       => $tenant?->nit ?? '',
                'municipio' => $tenant?->municipio ?? '',
                'telefono'  => $tenant?->telefono ?? $tenant?->telefono_fijo ?? '',
            ],
            'tercero' => [
                'id'             => $tercero?->id,
                'tipo_persona'   => $tercero?->tipo_persona,
                'nombre'         => $this->nombreTercero($tercero),
                'nit'            => $tercero?->nit,
                'cedula'         => $tercero?->cedula,
                'representante'  => $tercero?->representante,
                'telefono'       => $tercero?->telefono,
                'email'          => $tercero?->email,
                'banco'          => $tercero?->banco,
                'tipo_cuenta'    => $tercero?->tipo_cuenta,
                'numero_cuenta'  => $tercero?->numero_cuenta,
                'titular_cuenta' => $tercero?->titular_cuenta,
            ],
            'nomina' => [
                'id'            => $nomina->id,
                'periodo_label' => $this->etiquetaPeriodo($nomina),
                'mes'           => $nomina->mes,
                'anio'          => $nomina->anio,
                'quincena'      => $nomina->quincena,
                'fecha_inicio'  => $nomina->fecha_inicio?->format('Y-m-d'),
                'fecha_fin'     => $nomina->fecha_fin?->format('Y-m-d'),
                'estado'        => $nomina->estado,
            ],
            'acta' => [
                'id'                 => $acta->id,
                'numero_comprobante' => "COMP-N{$nomina->id}-ET{$acta->id}",
                'total_dias'         => (int) $acta->total_dias,
                'total_jornales'     => (float) $acta->total_jornales,
                'total_cosecha'      => (float) $acta->total_cosecha,
                'total_bruto'        => (float) $acta->total_bruto,
                'total_a_transferir' => (float) $acta->total_a_transferir,
                'estado_pago'        => $acta->estado_pago,
                'orden_pago_numero'  => $acta->orden_pago_numero,
                'metodo_pago'        => $acta->metodo_pago,
                'referencia_pago'    => $acta->referencia_pago,
                'pagado_at'          => $acta->pagado_at?->format('Y-m-d'),
                'pagado_por'         => $acta->pagadoPor?->name,
                'observacion'        => $acta->observacion,
            ],
            'operarios' => $acta->operarios->map(fn ($linea) => [
                'id'               => $linea->id,
                'operario_id'      => $linea->operario_id,
                'nombre_completo'  => trim(($linea->operario?->nombres ?? '') . ' ' . ($linea->operario?->apellidos ?? '')),
                'cedula'           => $linea->operario?->cedula,
                'cargo'            => $linea->operario?->cargo,
                'labores_realizadas' => $linea->labores_realizadas ?? [],
                'total_jornales'   => (float) $linea->total_jornales,
                'total_cosecha'    => (float) $linea->total_cosecha,
                'total_descuentos' => (float) $linea->descuentos->sum('valor'),
                'descuentos'       => $linea->descuentos->map(fn ($d) => [
                    'id'              => $d->id,
                    'concepto_id'     => $d->concepto_id,
                    'concepto_codigo' => $d->concepto?->codigo,
                    'concepto_nombre' => $d->concepto?->nombre,
                    'valor'           => (float) $d->valor,
                    'observacion'     => $d->observacion,
                ])->values()->all(),
                'subtotal'         => (float) $linea->subtotal,
                'observacion'      => $linea->observacion,
            ])->values()->all(),
        ];
    }

    public function filename(NominaTercero $acta): string
    {
        $ident   = $acta->tercero?->nit ?? $acta->tercero?->cedula ?? $acta->tercero_id;
        $periodo = $acta->nomina->anio . '_' . str_pad((string) $acta->nomina->mes, 2, '0', STR_PAD_LEFT)
            . ($acta->nomina->quincena ? "_Q{$acta->nomina->quincena}" : '');

        return "acta_tercero_{$ident}_{$periodo}.pdf";
    }

    private function nombreTercero(?\App\Models\Tercero $tercero): ?string
    {
        if (! $tercero) {
            return null;
        }
        return $tercero->tipo_persona === 'JURIDICA'
            ? ($tercero->razon_social ?? $tercero->nombre_comercial ?? 'Sin nombre')
            : ($tercero->nombre_completo ?? $tercero->nombre_comercial ?? 'Sin nombre');
    }

    private function etiquetaPeriodo(\App\Models\Nomina $nomina): string
    {
        $meses = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
        ];
        $mesNombre = $meses[$nomina->mes] ?? '';

        if ($nomina->tipo_pago_snapshot === 'MENSUAL') {
            return "{$mesNombre} {$nomina->anio}";
        }
        $quincenaLabel = $nomina->quincena === 1 ? 'Primera quincena' : 'Segunda quincena';
        return "{$mesNombre} {$nomina->anio} – {$quincenaLabel}";
    }
}
