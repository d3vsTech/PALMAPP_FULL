/**
 * Tabla de faltas injustificadas por no-registro en la planilla
 * (PLAN_AUSENCIAS_IMPLICITAS §1.3/§1.6). Se usa en:
 *  - `LiquidarColaborador` con `preview.detalle_faltas_injustificadas`
 *  - `DesprendiblePago` con `liquidacion.detalle_faltas_injustificadas`
 *
 * Es la contraparte de `DetalleDescansos` pero para el otro lado del cálculo:
 * el descanso perdido tiene su tabla; esta muestra los días que CAUSARON esas
 * pérdidas (via `consecuencia_dominical`) más los que solo descontaron día.
 *
 * Si `items` es undefined o vacío no renderiza nada.
 */

import { estiloDetalle } from './estiloDetalle';

export interface FaltaInjustificadaItem {
  fecha: string;
  origen: string;
  operacion_id: number;
  valor_dia: number;
  impacto: string;
  consecuencia_dominical?: string | null;
}

interface Props {
  items?: FaltaInjustificadaItem[];
  /** Total del bloque (redundante con `items.length`, pero el backend lo trae calculado). */
  total?: number;
  formatMoney: (n: number) => string;
  variant?: 'default' | 'compact';
  titulo?: string;
}

function labelImpacto(impacto: string): string {
  switch (impacto) {
    case 'DIA_DESCONTADO':
      return 'Día descontado';
    case 'SIN_IMPACTO_DIRECTO':
      return 'Solo pierde dominical';
    default:
      return impacto;
  }
}

function labelOrigen(origen: string): string {
  switch (origen) {
    case 'NO_REGISTRADO_EN_PLANILLA':
      return 'Sin registro en planilla';
    case 'FUERA_DE_CONTRATO':
      return 'Fuera de contrato';
    default:
      return origen;
  }
}

export function FaltasInjustificadas({
  items,
  total,
  formatMoney,
  variant = 'default',
  titulo,
}: Props) {
  if (!items || items.length === 0) return null;

  const e = estiloDetalle(variant);
  const totalCount = total ?? items.length;

  return (
    <div>
      {titulo && (
        <h4 className={e.titulo}>
          {titulo}
          <span className="font-normal text-muted-foreground">
            {' · '}{totalCount} día{totalCount !== 1 ? 's' : ''}
          </span>
        </h4>
      )}
      <div className={e.marco}>
        <table className={e.tabla}>
          <thead>
            <tr className={e.encabezado}>
              <th className={`${e.th} text-left`}>Fecha</th>
              <th className={`${e.th} text-left`}>Origen</th>
              <th className={`${e.th} text-left`}>Impacto</th>
              <th className={`${e.th} text-right`}>Valor día</th>
              <th className={`${e.th} text-right`}>Domingo perdido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((f, i) => (
              <tr key={`${f.fecha}-${i}`}>
                <td className={`${e.td} whitespace-nowrap tabular-nums text-muted-foreground`}>{f.fecha}</td>
                <td className={e.td}>{labelOrigen(f.origen)}</td>
                <td className={`${e.td} ${f.impacto === 'DIA_DESCONTADO' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {labelImpacto(f.impacto)}
                </td>
                <td className={`${e.td} whitespace-nowrap text-right tabular-nums`}>
                  {f.impacto === 'DIA_DESCONTADO' ? formatMoney(f.valor_dia) : '-'}
                </td>
                <td className={`${e.td} whitespace-nowrap text-right tabular-nums text-muted-foreground`}>
                  {f.consecuencia_dominical ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={e.nota}>
        Días con planilla aprobada donde el colaborador no aparece y no tiene
        novedad de ausencia registrada. Se tratan como inasistencia injustificada.
      </p>
    </div>
  );
}
