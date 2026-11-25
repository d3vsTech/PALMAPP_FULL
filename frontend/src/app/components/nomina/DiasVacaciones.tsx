/**
 * Bloque de vacaciones dentro de la nómina (API_NOMINA PR-L8 y PR-L15).
 * Se usa en:
 *  - `LiquidarColaborador` con `preview.detalle_vacaciones`
 *  - `DesprendiblePago` con `liquidacion.detalle_vacaciones`
 *
 * Con `modo_pago = DIRECTO` la línea es informativa: esos días los pagó el
 * módulo de Liquidaciones con su comprobante VAC-n y la nómina solo los
 * neutraliza. Sin la línea el trabajador no entiende por qué su quincena
 * trae menos días.
 *
 * Con `modo_pago = NOMINA` el tramo sí es plata de esta nómina: `valor_tramo`
 * entra como salario en `total_devengado`, y la compensación en dinero del
 * CST 189 viaja con el período que contiene la fecha de inicio. Por eso la
 * tabla muestra el valor del tramo y el pie cambia de texto: decir
 * "no suman ni restan" cuando sí suman sería mentirle al desprendible.
 *
 * Si `items` es undefined o vacío no renderiza nada. `null` llega en filas
 * liquidadas antes de PR-L8 y significa "esto no se registraba entonces".
 */
import type { DetalleVacacionNomina } from '../../../api/nomina';
import { formatFecha } from '../../utils/fecha';
import { estiloDetalle } from './estiloDetalle';

interface Props {
  items?: DetalleVacacionNomina[] | null;
  /** Días comerciales del período. El backend lo trae calculado. */
  total?: number;
  formatMoney: (n: number) => string;
  variant?: 'default' | 'compact';
  titulo?: string;
}

/** Lo que esta nómina paga por el tramo: disfrute más compensación. */
function pagadoAqui(v: DetalleVacacionNomina): number {
  if (!v.pagada_aqui) return 0;
  return (v.valor_tramo ?? 0) + (v.paga_dinero_aqui ? v.valor_dinero ?? 0 : 0);
}

export function DiasVacaciones({
  items,
  total,
  formatMoney,
  variant = 'default',
  titulo,
}: Props) {
  if (!items || items.length === 0) return null;

  const e = estiloDetalle(variant);
  // PR-L15 — La columna de valor solo aparece cuando hay algo que pagar aquí.
  const pagaAlgo = items.some((v) => v.pagada_aqui);
  const totalPagado = items.reduce((s, v) => s + pagadoAqui(v), 0);
  const hayCompensacion = items.some((v) => v.paga_dinero_aqui && (v.dias_dinero ?? 0) > 0);
  const totalDias = total ?? items.reduce((s, v) => s + v.dias, 0);

  return (
    <div>
      {titulo && (
        <h4 className={e.titulo}>
          {titulo}
          <span className="font-normal text-muted-foreground">
            {' · '}{totalDias} día{totalDias !== 1 ? 's' : ''}
          </span>
        </h4>
      )}
      <div className={e.marco}>
        <table className={e.tabla}>
          <thead>
            <tr className={e.encabezado}>
              <th className={`${e.th} text-left`}>Comprobante</th>
              <th className={`${e.th} text-left`}>Rango</th>
              <th className={`${e.th} text-right`}>Días</th>
              <th className={`${e.th} text-right`}>Valor día</th>
              {pagaAlgo && <th className={`${e.th} text-right`}>Paga esta nómina</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((v, i) => (
              <tr key={`${v.vacacion_id}-${i}`}>
                <td className={`${e.td} whitespace-nowrap font-medium text-foreground`}>{v.numero_comprobante}</td>
                <td className={`${e.td} text-muted-foreground`}>
                  <span className="whitespace-nowrap">{formatFecha(v.fecha_desde)} a {formatFecha(v.fecha_hasta)}</span>
                  {v.paga_dinero_aqui && (v.dias_dinero ?? 0) > 0 && (
                    <span className="block text-xs">+ {v.dias_dinero} en dinero</span>
                  )}
                </td>
                {/* Los días remunerados del tramo son comerciales; sin PR-L15
                    no llegan y `dias` ya es la cifra comercial. */}
                <td className={`${e.td} text-right tabular-nums`}>{v.dias_remunerados ?? v.dias}</td>
                <td className={`${e.td} whitespace-nowrap text-right tabular-nums text-muted-foreground`}>
                  {formatMoney(v.valor_dia)}
                </td>
                {pagaAlgo && (
                  <td
                    className={`${e.td} whitespace-nowrap text-right tabular-nums ${
                      v.pagada_aqui ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {v.pagada_aqui ? formatMoney(pagadoAqui(v)) : '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {pagaAlgo && (
            <tfoot>
              <tr className={e.pie}>
                <td className={e.td} colSpan={4}>Total pagado en esta nómina</td>
                <td className={`${e.td} whitespace-nowrap text-right tabular-nums`}>{formatMoney(totalPagado)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className={e.nota}>
        {pagaAlgo ? (
          <>
            Vacaciones pagadas en esta nómina: el valor entra como salario del
            período y reemplaza los días que no se trabajaron
            {hayCompensacion && ', junto con la compensación en dinero acordada'}.
            Los tramos sin valor los pagó el módulo de Liquidaciones con su
            propio comprobante.
          </>
        ) : (
          <>
            Días ya pagados por el módulo de Liquidaciones con su propio
            comprobante. No suman ni restan en esta nómina: solo explican por
            qué el período trae menos días trabajados.
          </>
        )}
      </p>
    </div>
  );
}
