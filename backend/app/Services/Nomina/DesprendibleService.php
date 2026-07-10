<?php

namespace App\Services\Nomina;

use App\Models\Ausencia;
use App\Models\HoraExtra;
use App\Models\NominaEmpleado;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Genera el desprendible de un NominaEmpleado liquidado.
 *
 * Tres salidas:
 *   - data(): array JSON listo para frontend (renderiza en pantalla).
 *   - pdf():  PDF descargable (DomPDF).
 *   - whatsapp(): URL pública firmada del PDF, para que el front abra
 *                 wa.me/?text={url} y el usuario envíe el mensaje manualmente.
 */
class DesprendibleService
{
    public function __construct(private readonly AgrupadorJornalesService $agrupador) {}

    /**
     * Datos completos para el desprendible (JSON o vista Blade).
     */
    public function data(NominaEmpleado $ne): array
    {
        $ne->loadMissing([
            'empleado.predio',
            'nomina',
            'conceptos.concepto',
            'liquidadoPor',
        ]);

        $empleado = $ne->empleado;
        $nomina   = $ne->nomina;

        // Resumen por categoría solo aplica a VARIABLE
        $resumenTrabajo = null;
        if ($ne->isVariable()) {
            $resumenTrabajo = $this->agrupador->paraEmpleadoEnRango(
                $ne->empleado_id,
                $nomina->fecha_inicio,
                $nomina->fecha_fin
            );
        }

        // Separar conceptos por operación
        $bonificaciones = [];
        $deducciones    = [];
        foreach ($ne->conceptos as $cep) {
            $row = [
                'codigo'      => $cep->concepto?->codigo,
                'nombre'      => $cep->concepto?->nombre,
                'observacion' => $cep->observacion,
                'porcentaje'  => $cep->porcentaje_aplicado,
                'base'        => $cep->base_aplicada,
                'valor'       => (float) $cep->valor_calculado,
                'es_manual'   => (bool) $cep->es_manual,
            ];
            if ($cep->operacion === 'SUMA') {
                $bonificaciones[] = $row;
            } else {
                $deducciones[] = $row;
            }
        }

        // Detalle de horas extras y ausencias liquidadas en esta nómina
        $detalleHorasExtra = [];
        $detalleAusencias  = [];

        if ($ne->empleado_id) {
            $horasExtra = HoraExtra::where('empleado_id', $ne->empleado_id)
                ->where('nomina_id', $ne->nomina_id)
                ->with(['tipoHoraExtra', 'operacion:id,fecha'])
                ->orderBy('id')
                ->get();

            foreach ($horasExtra as $h) {
                $esExtra = (bool) ($h->tipoHoraExtra?->es_extra ?? true);
                $detalleHorasExtra[] = [
                    'id'                 => $h->id,
                    'fecha'              => $h->operacion?->fecha?->format('Y-m-d'),
                    'codigo'             => $h->codigo,
                    'tipo_nombre'        => $h->tipoHoraExtra?->nombre,
                    'es_extra'           => $esExtra,
                    'cantidad_horas'     => (float) $h->cantidad_horas,
                    'valor_hora_base'    => (float) $h->valor_hora_base,
                    'porcentaje_recargo' => (float) $h->porcentaje_recargo,
                    'paga_hora_completa' => (bool) $h->paga_hora_completa,
                    'valor_calculado'    => (float) $h->valor_calculado,
                    'observacion'        => $h->observacion,
                ];
            }

            $ausencias = Ausencia::where('empleado_id', $ne->empleado_id)
                ->where('nomina_id', $ne->nomina_id)
                ->with('motivoAusencia:id,nombre')
                ->orderBy('fecha_inicio')
                ->get();

            foreach ($ausencias as $a) {
                $detalleAusencias[] = [
                    'id'             => $a->id,
                    'tipo'           => $a->tipo,
                    'motivo_nombre'  => $a->motivoAusencia?->nombre,
                    'fecha_inicio'   => $a->fecha_inicio?->format('Y-m-d'),
                    'fecha_fin'      => $a->fecha_fin?->format('Y-m-d'),
                    'dias_calendario'=> (int) $a->dias_calendario,
                    'es_remunerada'  => (bool) $a->es_remunerada,
                    'porcentaje_pago'=> (float) $a->porcentaje_pago,
                    'afecta'         => $a->es_remunerada ? 'INCAPACIDAD' : 'DESCUENTO',
                ];
            }
        }

        return [
            'finca'   => $ne->predio_snapshot ?? $empleado?->predio?->nombre,
            'empleado' => [
                'id'              => $empleado?->id,
                'nombre_completo' => $empleado?->nombre_completo,
                'documento'       => $empleado?->documento,
                'cargo'           => $ne->cargo_snapshot ?? $empleado?->cargo,
                'salario_tipo'    => $ne->salario_tipo,
                'salario_base'    => (float) $ne->salario_base,
            ],
            'nomina' => [
                'id'             => $nomina->id,
                'periodo_label'  => $this->etiquetaPeriodo($nomina),
                'mes'            => $nomina->mes,
                'anio'           => $nomina->anio,
                'quincena'       => $nomina->quincena,
                'tipo_pago'      => $nomina->tipo_pago_snapshot,
                'fecha_inicio'   => $nomina->fecha_inicio?->format('Y-m-d'),
                'fecha_fin'      => $nomina->fecha_fin?->format('Y-m-d'),
                'estado'         => $nomina->estado,
            ],
            'liquidacion' => [
                'fecha'                  => $ne->liquidado_at?->format('Y-m-d'),
                'fecha_humana'           => $ne->liquidado_at?->translatedFormat('l, j \d\e F \d\e Y'),
                'liquidado_por'          => $ne->liquidadoPor?->name,
                'dias_trabajados'        => (int) $ne->dias_trabajados,
                'total_jornales'         => (float) $ne->total_jornales,
                'total_cosecha'          => (float) $ne->total_cosecha,
                'total_horas_extra'      => (float) $ne->total_horas_extra,
                'total_recargos'         => (float) $ne->total_recargos,
                'total_incapacidades'    => (float) $ne->total_incapacidades,
                'subsidio_transporte'    => (float) $ne->subsidio_transporte,
                'total_devengado'        => (float) $ne->total_devengado,
                'total_bonificaciones'   => (float) $ne->total_bonificaciones,
                'total_deducciones'      => (float) $ne->total_deducciones,
                'total_neto'             => (float) $ne->total_neto,
                'bonificaciones'         => $bonificaciones,
                'deducciones'            => $deducciones,
                'detalle_horas_extra'    => $detalleHorasExtra,
                'detalle_ausencias'      => $detalleAusencias,
            ],
            'resumen_trabajo' => $resumenTrabajo,
        ];
    }

    /**
     * Genera el PDF del desprendible. Devuelve un Response listo para
     * descargar (Content-Disposition: attachment).
     */
    public function pdf(NominaEmpleado $ne): Response
    {
        $data = $this->data($ne);
        $pdf  = Pdf::loadView('desprendible.nomina', ['d' => $data])
            ->setPaper('letter')
            ->setOption('isPhpEnabled', true);

        $filename = $this->filename($ne);

        return $pdf->download($filename);
    }

    /**
     * Persiste el PDF en disco y devuelve una URL firmada para WhatsApp.
     *
     * IMPORTANT: este sprint solo entrega la URL; la integración real con
     * WhatsApp Business API se hace en una iteración posterior.
     *
     * @return array{url:string,filename:string,expires_at:string}
     */
    public function whatsapp(NominaEmpleado $ne): array
    {
        $data = $this->data($ne);
        $pdf  = Pdf::loadView('desprendible.nomina', ['d' => $data])
            ->setPaper('letter');

        $filename = $this->filename($ne);
        $path     = "tenants/{$ne->tenant_id}/desprendibles/{$filename}";

        Storage::disk('public')->put($path, $pdf->output());

        $url = URL::temporarySignedRoute(
            'nomina.desprendible.descarga',
            now()->addDays(7),
            ['nomina_empleado' => $ne->id]
        );

        return [
            'url'        => $url,
            'filename'   => $filename,
            'expires_at' => now()->addDays(7)->toIso8601String(),
        ];
    }

    private function filename(NominaEmpleado $ne): string
    {
        $documento = $ne->empleado?->documento ?? $ne->empleado_id;
        $periodo   = $ne->nomina->anio . '_' . str_pad((string) $ne->nomina->mes, 2, '0', STR_PAD_LEFT)
            . ($ne->nomina->quincena ? "_Q{$ne->nomina->quincena}" : '');

        return "desprendible_{$documento}_{$periodo}.pdf";
    }

    private function etiquetaPeriodo($nomina): string
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
