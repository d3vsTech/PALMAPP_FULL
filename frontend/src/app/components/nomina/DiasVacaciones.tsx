/**
 * Bloque informativo de vacaciones dentro de la nómina (API_NOMINA PR-L8).
 * Se usa en:
 *  - `LiquidarColaborador` con `preview.detalle_vacaciones`
 *  - `DesprendiblePago` con `liquidacion.detalle_vacaciones`
 *
 * No es un devengado ni una deducción. Esos días los pagó el módulo de
 * Liquidaciones con su comprobante VAC-n, y la nómina solo los neutraliza.
 * Sin esta línea el trabajador no puede explicarse por qué su quincena trae
 * menos días.
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

export function DiasVacaciones({
  items,
  total,
  formatMoney,
  variant = 'default',
  titulo,
}: Props) {
  if (!items || items.length === 0) return null;

  const isCompact = variant === 'compact';
  const gridCols = isCompact
    ? 'grid-cols-[100px_1fr_70px_110px]'
    : 'grid-cols-[140px_1fr_90px_140px]';
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
            </span>
            <span className="text-right pr-2 font-semibold">{v.dias}</span>
            <span className="text-right">{formatMoney(v.valor_dia)}</span>
          </div>
        ))}
      </div>
      <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-2 italic leading-relaxed`}>
        Días ya pagados por el módulo de Liquidaciones con su propio comprobante.
        No suman ni restan en esta nómina: solo explican por qué el período trae
        menos días trabajados.
      </p>
    </div>
  );
}
