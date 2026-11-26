/**
 * Resultado del preview de vacaciones: comprobante y saldo que queda.
 * Todo llega calculado de `/preview`; aquí solo se arma la tabla de conceptos.
 */
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import SeccionCard from '../../../components/liquidaciones/SeccionCard';
import DatoLista from '../../../components/liquidaciones/DatoLista';
import ConceptosTabla, { type Concepto } from '../../../components/liquidaciones/ConceptosTabla';
import type { CalendarioVacaciones, ComprobanteVacaciones } from '../../../../api/vacaciones';
import { fmtCOP, fmtDias } from './comunes';
import { Aviso, fechaCorta, fechaLarga } from './PiezasNuevaVacacion';

const SIN_FECHA = <span className="font-normal text-muted-foreground">Sin definir</span>;

/** Disfrute y compensación. Se pagan días comerciales (D1, v1.10). */
function conceptosDias(preview: ComprobanteVacaciones): Concepto[] {
  const r = preview.resultado;
  const diasPago = r.dias_pago ?? null;
  const items: Concepto[] = [];
  if (r.dias_calendario > 0) {
    const calendario = diasPago != null && diasPago !== r.dias_calendario
      ? ` · ${fmtDias(r.dias_calendario)} calendario`
      : '';
    items.push({
      label: 'Días de disfrute',
      detalle: `${fmtDias(diasPago ?? r.dias_calendario)} días × ${fmtCOP(r.valor_dia)} · equivalen a ${fmtDias(r.dias_disfrute)} días hábiles${calendario}`,
      valor: fmtCOP(r.valor_disfrute),
    });
  }
  if (r.dias_dinero > 0) {
    items.push({
      label: 'Días en dinero (art. 189 CST)',
      detalle: `${fmtDias(r.dias_dinero)} días × ${fmtCOP(r.valor_dia)}`,
      valor: fmtCOP(r.valor_dinero),
    });
  }
  return items;
}

/**
 * v1.11 (ajuste A) — En DIRECTO se descuentan salud, pensión y FSP sobre el
 * disfrute y se gira el neto. `valor_total` sigue siendo el bruto. En NOMINA
 * las deducciones llegan en cero porque las aplica cada nómina.
 */
function conceptosTotales(preview: ComprobanteVacaciones): Concepto[] {
  const r = preview.resultado;
  const ded = r.deducciones ?? null;
  const tasas = preview.seguridad_social?.tasas ?? null;
  const conDeducciones = !!ded && (ded.total ?? 0) > 0;
  const items: Concepto[] = [{
    label: conDeducciones ? 'Total devengado' : 'Total a pagar',
    detalle: r.formula_aplicada,
    valor: fmtCOP(r.valor_total),
    total: true,
  }];
  if (!ded || !conDeducciones) return items;
  if (ded.salud > 0) items.push({ label: `Salud del trabajador${tasas ? ` (${tasas.salud} %)` : ''}`, valor: fmtCOP(ded.salud), negativo: true });
  if (ded.pension > 0) items.push({ label: `Pensión del trabajador${tasas ? ` (${tasas.pension} %)` : ''}`, valor: fmtCOP(ded.pension), negativo: true });
  if (ded.fsp > 0) items.push({ label: `Fondo de Solidaridad Pensional${tasas?.fsp ? ` (${tasas.fsp} %)` : ''}`, valor: fmtCOP(ded.fsp), negativo: true });
  items.push({
    label: 'Neto a pagar',
    detalle: 'La compensación en dinero no cotiza (CST art. 189)',
    valor: fmtCOP(r.valor_neto ?? r.valor_total ?? 0),
    total: true,
  });
  return items;
}

export function ResumenVacacion({ preview, calendario, formaPago, listo }: {
  preview: ComprobanteVacaciones;
  calendario: CalendarioVacaciones | null;
  /** Texto ya armado por la página: nómina, anticipado o pendiente. */
  formaPago: string;
  listo: boolean;
}) {
  return (
    <SeccionCard
      title="Resumen de liquidación"
      actions={listo && <Badge variant="success">Listo para confirmar</Badge>}
    >
      <div className="space-y-5">
        <ConceptosTabla items={[...conceptosDias(preview), ...conceptosTotales(preview)]} />
        <DatoLista
          className="lg:grid-cols-3"
          items={[
            { label: 'Inicio de vacaciones', value: calendario ? fechaLarga(calendario.fecha_inicio) : SIN_FECHA },
            { label: 'Fin de vacaciones', value: calendario ? fechaLarga(calendario.fecha_fin) : SIN_FECHA },
            { label: 'Forma de pago', value: formaPago },
          ]}
        />
      </div>
    </SeccionCard>
  );
}

/** Saldo antes y después, y los períodos que se consumen (FIFO). */
export function SaldoVacacion({ preview }: { preview: ComprobanteVacaciones }) {
  const saldo = preview.saldo;
  if (!saldo) return null;
  return (
    <SeccionCard title="Saldo de vacaciones">
      <div className="space-y-5">
        <DatoLista
          className="lg:grid-cols-3"
          items={[
            { label: 'Saldo antes', value: `${fmtDias(saldo.dias_disponibles_exigibles_antes)} días` },
            { label: 'Saldo después', value: `${fmtDias(saldo.dias_disponibles_exigibles_despues)} días` },
            {
              label: 'Próximo vencimiento',
              value: saldo.fecha_vencimiento_despues ? fechaLarga(saldo.fecha_vencimiento_despues) : SIN_FECHA,
            },
          ]}
        />
        {preview.periodos_afectados.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[13px] font-medium text-muted-foreground">Períodos que se consumen</p>
            {preview.periodos_afectados.map((p) => (
              <div key={p.periodo} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <Badge variant="outline">Período {p.periodo}</Badge>
                <span className="text-muted-foreground">{fechaCorta(p.inicio)} al {fechaCorta(p.fin)}</span>
                <span className="text-foreground">
                  {fmtDias(p.dias_disfrute)} disfrute · {fmtDias(p.dias_dinero)} dinero
                </span>
                <span className="text-muted-foreground">Queda {fmtDias(p.saldo_restante)}</span>
              </div>
            ))}
          </div>
        )}
        {saldo.usa_periodo_en_curso && (
          <Aviso tono="warning" icono={AlertTriangle}>
            <p>
              Se están usando días del año en curso. Si el trabajador se retira antes de cumplirlo, esos días no se le
              pueden cobrar.
            </p>
          </Aviso>
        )}
      </div>
    </SeccionCard>
  );
}
