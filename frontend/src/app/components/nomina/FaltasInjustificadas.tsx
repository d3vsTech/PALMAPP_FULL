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

  const isCompact = variant === 'compact';
  // Anchos fijos en las columnas numéricas (VALOR DÍA y DOMINGO PERDIDO)
  // para que cada valor caiga debajo de su header. Con `auto` el "—" (más
  // angosto que el título) colapsaba y desalineaba la tabla.
  const gridCols = isCompact
    ? 'grid-cols-[80px_1fr_120px_100px_100px]'
    : 'grid-cols-[100px_1fr_160px_120px_140px]';
  const headerText = isCompact ? 'text-[10px]' : 'text-xs';
  const container = isCompact
    ? 'bg-muted/30 rounded-lg p-3 border border-border'
    : 'rounded-lg border border-border overflow-hidden';
  const totalCount = total ?? items.length;

  return (
    <div>
      {titulo && !isCompact && (
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          {titulo}
          <span className="text-xs font-normal text-muted-foreground">
            · {totalCount} día{totalCount !== 1 ? 's' : ''}
          </span>
        </h3>
      )}
      {titulo && isCompact && (
        <h3 className="font-bold text-xs uppercase mb-2">
          {titulo}
          <span className="ml-1 font-normal text-muted-foreground normal-case">
            ({totalCount})
          </span>
        </h3>
      )}
      <div className={container}>
        <div
          className={`grid ${gridCols} ${headerText} uppercase tracking-wide text-muted-foreground ${
            isCompact ? 'pb-1 mb-1 border-b border-border' : 'px-4 py-2 bg-muted/40 border-b'
          }`}
        >
          <span>Fecha</span>
          <span>Origen</span>
          <span>Impacto</span>
          <span className="text-right pr-2">Valor día</span>
          <span className="text-right">Domingo perdido</span>
        </div>
        {items.map((f, i) => (
          <div
            key={`${f.fecha}-${i}`}
            className={`grid ${gridCols} text-xs ${
              isCompact
                ? 'py-0.5'
                : 'px-4 py-2 border-b last:border-b-0 bg-destructive/5'
            }`}
          >
            <span className="font-mono">{f.fecha}</span>
            <span className="truncate">{labelOrigen(f.origen)}</span>
            <span className={f.impacto === 'DIA_DESCONTADO' ? 'text-destructive' : ''}>
              {labelImpacto(f.impacto)}
            </span>
            <span className="text-right pr-2 font-semibold">
              {f.impacto === 'DIA_DESCONTADO' ? formatMoney(f.valor_dia) : '—'}
            </span>
            <span className="text-right font-mono">
              {f.consecuencia_dominical ?? '—'}
            </span>
          </div>
        ))}
      </div>
      <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-2 italic leading-relaxed`}>
        Días con planilla aprobada donde el colaborador no aparece y no tiene
        novedad de ausencia registrada. Se tratan como inasistencia injustificada.
      </p>
    </div>
  );
}
