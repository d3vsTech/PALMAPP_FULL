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

  const isCompact = variant === 'compact';
  // PR-L15 — La columna de valor solo aparece cuando hay algo que pagar aquí.
  const pagaAlgo = items.some((v) => v.pagada_aqui);
  const totalPagado = items.reduce((s, v) => s + pagadoAqui(v), 0);
  const hayCompensacion = items.some((v) => v.paga_dinero_aqui && (v.dias_dinero ?? 0) > 0);

  const gridCols = pagaAlgo
    ? (isCompact
      ? 'grid-cols-[90px_1fr_55px_90px_100px]'
      : 'grid-cols-[130px_1fr_70px_120px_130px]')
    : (isCompact
      ? 'grid-cols-[100px_1fr_70px_110px]'
      : 'grid-cols-[140px_1fr_90px_140px]');
  const headerText = isCompact ? 'text-[10px]' : 'text-xs';
  const container = isCompact
    ? 'bg-muted/30 rounded-lg p-3 border border-border'
    : 'rounded-lg border border-border overflow-hidden';
  const totalDias = total ?? items.reduce((s, v) => s + v.dias, 0);

  return (
    <div>
      {titulo && !isCompact && (
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          {titulo}
          <span className="text-xs font-normal text-muted-foreground">
            · {totalDias} día{totalDias !== 1 ? 's' : ''}
          </span>
        </h3>
      )}
      {titulo && isCompact && (
        <h3 className="font-bold text-xs uppercase mb-2">
          {titulo}
          <span className="ml-1 font-normal text-muted-foreground normal-case">
            ({totalDias})
          </span>
        </h3>
      )}
      <div className={container}>
        <div
          className={`grid ${gridCols} ${headerText} uppercase tracking-wide text-muted-foreground ${
            isCompact ? 'pb-1 mb-1 border-b border-border' : 'px-4 py-2 bg-muted/40 border-b'
          }`}
        >
          <span>Comprobante</span>
          <span>Rango</span>
          <span className="text-right pr-2">Días</span>
          <span className="text-right">Valor día</span>
          {pagaAlgo && <span className="text-right">Paga esta nómina</span>}
        </div>
        {items.map((v, i) => (
          <div
            key={`${v.vacacion_id}-${i}`}
            className={`grid ${gridCols} text-xs ${
              isCompact
                ? 'py-0.5'
                : 'px-4 py-2 border-b last:border-b-0 bg-primary/5'
            }`}
          >
            <span className="font-mono">{v.numero_comprobante}</span>
            <span className="truncate">
              {formatFecha(v.fecha_desde)} — {formatFecha(v.fecha_hasta)}
              {v.paga_dinero_aqui && (v.dias_dinero ?? 0) > 0 && (
                <span className="text-muted-foreground">
                  {' '}+ {v.dias_dinero} en dinero
                </span>
              )}
            </span>
            <span className="text-right pr-2 font-semibold">
              {/* Los días remunerados del tramo son comerciales; sin PR-L15 no
                  llegan y `dias` ya es la cifra comercial. */}
              {v.dias_remunerados ?? v.dias}
            </span>
            <span className="text-right">{formatMoney(v.valor_dia)}</span>
            {pagaAlgo && (
              <span className={`text-right ${v.pagada_aqui ? 'font-semibold' : 'text-muted-foreground'}`}>
                {v.pagada_aqui ? formatMoney(pagadoAqui(v)) : '—'}
              </span>
            )}
          </div>
        ))}
        {pagaAlgo && (
          <div
            className={`grid ${gridCols} text-xs font-semibold ${
              isCompact ? 'pt-1 mt-1 border-t border-border' : 'px-4 py-2 border-t bg-muted/40'
            }`}
          >
            <span className="col-span-4">Total pagado en esta nómina</span>
            <span className="text-right">{formatMoney(totalPagado)}</span>
          </div>
        )}
      </div>
      <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-2 italic leading-relaxed`}>
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
