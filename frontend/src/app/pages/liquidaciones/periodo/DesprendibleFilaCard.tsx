/**
 * Tarjeta de desprendible de una fila liquidada (diseño V.25). Pinta lo
 * que ya trae el período (§2.5) y, al desplegar, el comprobante legal
 * completo del backend (§6.1): componentes de la base, descuentos de
 * días, método de liquidación con sus normas y advertencias.
 *
 * El desglose se pide solo al abrirlo para no disparar una petición por
 * colaborador al entrar al período.
 */
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Loader2, FileDown, Banknote, Undo2, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type { DesprendibleLiquidacion, LiquidacionFila } from '../../../../api/liquidaciones';
import Desprendible from '../../../components/liquidaciones/Desprendible';
import ConceptosTabla, { type Concepto } from '../../../components/liquidaciones/ConceptosTabla';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, METODO_PAGO_LABEL, TEXTOS_PERIODO, CAJA_AVISO, type TipoPeriodoDetalle } from './textos';

interface Props {
  fila: LiquidacionFila;
  tipo: TipoPeriodoDetalle;
  anio: number;
  semestre: number;
  /** Dato "Período" del desprendible: el año, o los meses en prima. */
  periodoLabel: string;
  /** Comprobante completo, si ya se cargó. */
  detalle?: DesprendibleLiquidacion;
  cargandoDetalle: boolean;
  expandido: boolean;
  onToggleDetalle: () => void;
  descargandoPdf: boolean;
  onDescargarPdf: () => void;
  onRegistrarGiro: () => void;
  onAnularGiro: () => void;
}

const METODO_LABEL: Record<string, string> = {
  ULTIMO_SALARIO: 'Último salario',
  PROMEDIO: 'Promedio devengado',
  MANUAL: 'Ajuste manual',
};

/** Conceptos del cálculo según el tipo: base salarial, histórico o intereses. */
function conceptosFila(
  fila: LiquidacionFila,
  tipo: TipoPeriodoDetalle,
  detalle: DesprendibleLiquidacion | undefined,
): Concepto[] {
  const txt = TEXTOS_PERIODO[tipo];
  const formula = `Fórmula: ${detalle?.resultado.formula_aplicada ?? txt.formulaGenerica}`;
  const total: Concepto = { label: `Total ${txt.colValor.toLowerCase()}`, valor: fmtCOP(fila.valor_final), total: true };

  if (detalle?.historico === true) {
    return [
      {
        label: 'Base de cálculo',
        valor: '—',
        detalle: 'Valor consignado fuera del sistema y registrado desde un archivo. La base salarial de ese año no quedó registrada; del sistema solo salen los días.',
      },
      { label: 'Días laborados', valor: fila.dias_computados },
      total,
    ];
  }
  if (tipo === 'INTERESES_CESANTIAS') {
    return [
      { label: 'Saldo cesantías', valor: fmtCOP(fila.saldo_cesantias ?? fila.base_prestacional) },
      { label: 'Tasa de interés', valor: `${fila.tasa_aplicada ?? 12} % anual`, detalle: 'Ley 52 de 1975' },
      { label: 'Días laborados', valor: fila.dias_base_intereses ?? fila.dias_computados, detalle: formula },
      total,
    ];
  }
  // Los tres componentes de la base son parte fija del desprendible, como en
  // el diseño: se pintan desde el principio y toman valor cuando llega el
  // comprobante legal (§6.1), que se pide al abrir el desglose.
  const componentes: Concepto[] = [
    {
      label: 'Salario básico',
      valor: detalle ? fmtCOP(detalle.base.salario_basico) : '—',
      detalle: detalle ? undefined : 'Se detalla al abrir el desglose',
    },
    { label: 'Auxilio de transporte', valor: detalle ? fmtCOP(detalle.base.auxilio_transporte) : '—' },
    { label: 'Promedio variables', valor: detalle ? fmtCOP(detalle.base.promedio_variables) : '—' },
  ];
  return [
    ...componentes,
    {
      label: 'Base prestacional',
      valor: fmtCOP(fila.base_prestacional),
      detalle: (fila.metodo_base && METODO_LABEL[fila.metodo_base]) || 'Base de cálculo',
    },
    { label: 'Días laborados', valor: fila.dias_computados, detalle: formula },
    total,
  ];
}

/** Estado del giro: consignado con su referencia o pendiente. */
function EstadoGiro({ fila, tipo }: { fila: LiquidacionFila; tipo: TipoPeriodoDetalle }) {
  const txt = TEXTOS_PERIODO[tipo];
  if (fila.estado_pago === 'PENDIENTE') {
    return (
      <div className="border-t border-border px-5 py-3">
        <Badge variant="warning">{txt.pendienteGiroLabel}</Badge>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <div className="space-y-1">
        <Badge variant="success">{txt.giradoLabel}</Badge>
        <p className="text-xs text-muted-foreground">
          {fila.fecha_pago ? formatFecha(fila.fecha_pago) : ''}
          {fila.metodo_pago ? ` · ${METODO_PAGO_LABEL[fila.metodo_pago] ?? fila.metodo_pago}` : ''}
          {fila.referencia_pago ? ` · Ref ${fila.referencia_pago}` : ''}
          {tipo === 'CESANTIAS' && fila.fondo_consignacion ? ` · ${fila.fondo_consignacion}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">{fmtCOP(fila.valor_pagado ?? fila.valor_final)}</p>
        {fila.dias_mora != null && fila.dias_mora > 0 && (
          <p className="text-xs text-warning">{fila.dias_mora} día(s) de mora</p>
        )}
      </div>
    </div>
  );
}

/** "SUSPENSION_DISCIPLINARIA" → "Suspension disciplinaria". */
const tipoDescuento = (tipo: string) => {
  const t = tipo.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Desglose legal completo (§6.1): tiempo de servicio, componentes y advertencias. */
function DesgloseLegal({ detalle, conBaseSalarial }: { detalle: DesprendibleLiquidacion; conBaseSalarial: boolean }) {
  const tiempo: Concepto[] = [
    { label: 'Desde', valor: formatFecha(detalle.dias.fecha_computo_desde) },
    { label: 'Hasta', valor: formatFecha(detalle.dias.fecha_computo_hasta) },
    { label: 'Días de vinculación', valor: detalle.dias.dias_vinculacion },
    ...(detalle.dias.dias_descontados > 0
      ? [{ label: 'Días descontados', valor: detalle.dias.dias_descontados }]
      : []),
  ];
  const c = detalle.base.componentes;
  const componentes: Concepto[] = [
    { label: 'Ordinario', valor: fmtCOP(c.ordinario) },
    { label: 'Variables', valor: fmtCOP(c.variables) },
    { label: 'Auxilio devengado', valor: fmtCOP(c.auxilio_devengado) },
    ...(c.bonificaciones_excluidas > 0
      ? [{ label: 'Bonificaciones excluidas', valor: fmtCOP(c.bonificaciones_excluidas) }]
      : []),
    { label: 'Meses base', valor: detalle.base.meses_base },
    { label: 'Cobertura de nóminas', valor: `${detalle.base.cobertura_nominas_pct}%` },
    ...((detalle.base.dias_proyectados ?? 0) > 0
      ? [{ label: 'Tramo final proyectado', valor: `${detalle.base.dias_proyectados} día(s)` }]
      : []),
  ];
  return (
    <>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">Tiempo de servicio</p>
        <ConceptosTabla items={tiempo} />
        {detalle.dias.detalle_descuentos.map((d, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {tipoDescuento(d.tipo)}: {formatFecha(d.desde)} a {formatFecha(d.hasta)} ({d.dias} días)
          </p>
        ))}
      </div>
      {conBaseSalarial && (
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Componentes del período</p>
          <ConceptosTabla items={componentes} />
        </div>
      )}
      {detalle.advertencias.map((a, i) => (
        <div key={i} className={CAJA_AVISO}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p>{a.mensaje ?? a.code}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Comprobante {detalle.numero_comprobante} · Liquidado el {detalle.liquidacion.fecha_humana} por {detalle.liquidacion.liquidado_por}
      </p>
    </>
  );
}

export default function DesprendibleFilaCard({
  fila, tipo, anio, semestre, periodoLabel, detalle, cargandoDetalle, expandido, onToggleDetalle,
  descargandoPdf, onDescargarPdf, onRegistrarGiro, onAnularGiro,
}: Props) {
  const txt = TEXTOS_PERIODO[tipo];
  const esPrima = tipo === 'PRIMA';
  // Prima comparte con cesantías la base salarial; intereses es el distinto.
  // Un registro histórico (§12) tampoco tiene base.
  const conBaseSalarial = tipo !== 'INTERESES_CESANTIAS' && detalle?.historico !== true;
  const col = fila.empleado;
  const girada = fila.estado_pago !== 'PENDIENTE';

  return (
    <div className="print:break-inside-avoid">
      <Desprendible
        nombre={col.nombre_completo}
        cargo={col.cargo ?? undefined}
        meta={esPrima
          ? { label: 'Semestre', value: `${semestre}° · ${anio}` }
          : { label: 'Fondo', value: col.fondo_cesantias ?? '—' }}
        datos={[
          { label: 'Cédula', value: col.documento },
          {
            label: 'Días laborados',
            value: conBaseSalarial ? fila.dias_computados : (fila.dias_base_intereses ?? fila.dias_computados),
          },
          { label: 'Período', value: periodoLabel },
        ]}
        conceptos={conceptosFila(fila, tipo, detalle)}
      >
        <EstadoGiro fila={fila} tipo={tipo} />

        {expandido && (
          <div className="space-y-4 border-t border-border px-5 py-4">
            {cargandoDetalle && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando desglose...
              </div>
            )}
            {detalle && <DesgloseLegal detalle={detalle} conBaseSalarial={conBaseSalarial} />}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 print:hidden">
          <Button variant="ghost" size="sm" onClick={onToggleDetalle}>
            {expandido ? <ChevronUp strokeWidth={2} /> : <ChevronDown strokeWidth={2} />}
            {expandido ? 'Ocultar desglose' : 'Ver desglose'}
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onDescargarPdf} disabled={descargandoPdf}>
              {descargandoPdf ? <Loader2 className="animate-spin" /> : <FileDown strokeWidth={2} />}
              Desprendible PDF
            </Button>
            {girada ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAnularGiro}
                className="text-muted-foreground hover:text-destructive"
              >
                <Undo2 strokeWidth={2} />
                Anular
              </Button>
            ) : (
              <Button size="sm" onClick={onRegistrarGiro}>
                <Banknote strokeWidth={2} />
                {txt.girarFila}
              </Button>
            )}
          </div>
        </div>
      </Desprendible>
    </div>
  );
}
