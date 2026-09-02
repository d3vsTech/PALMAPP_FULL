/**
 * Tabla día por día de descansos dominicales / festivos (§9.9). Se usa en:
 *  - `LiquidarColaborador` con los datos del preview (`detalle_dominicales_festivos`)
 *  - `DesprendiblePago` con los datos congelados en la BD (`detalle_descansos`)
 *
 * El shape es idéntico en ambos endpoints — solo cambia el nombre del array
 * origen. Este componente no lo sabe, recibe ya el array normalizado.
 *
 * Si `items` es undefined o vacío no renderiza nada. La nota art. 173 num. 1
 * se muestra solo cuando `diasPerdidos > 0`.
 */

export interface DescansoItem {
  fecha: string;
  tipo: 'DOMINICAL' | 'FESTIVO';
  pagado: boolean;
  valor_descanso: number;
  valor_recargo: number;
  porcentaje_recargo: number;
  motivo?: string | null;
  nombre_festivo?: string | null;
  // Extensiones §9.9 (opcionales)
  nombre?: string;
  resultado?: string;
  trabajado?: boolean;
}

interface Props {
  items?: DescansoItem[];
  diasPerdidos?: number;
  /**
   * §9.9 — INFORMATIVO. Lo que habría cobrado de no faltar. La UI lo muestra
   * en la nota art. 173 num. 1 para contextualizar. Nunca es un descuento.
   */
  totalDescansoPerdido?: number;
  /** Formatter de dinero. Cada pantalla usa el suyo (fmt vs toLocaleString). */
  formatMoney: (n: number) => string;
  /** `compact` para el desprendible impreso; `default` para la pantalla web. */
  variant?: 'default' | 'compact';
  /** Título opcional encima de la tabla. */
  titulo?: string;
}

export function DetalleDescansos({
  items,
  diasPerdidos,
  totalDescansoPerdido,
  formatMoney,
  variant = 'default',
  titulo,
}: Props) {
  if (!items || items.length === 0) return null;

  const isCompact = variant === 'compact';
  // Anchos fijos en las columnas numéricas para que cada valor caiga debajo
  // de su header. Con `auto` el "—" (más angosto que el título) se colapsaba
  // al lado derecho y dejaba las dos celdas apretadas bajo "Recargo".
  const gridCols = isCompact
    ? 'grid-cols-[80px_70px_1fr_90px_90px]'
    : 'grid-cols-[100px_90px_1fr_120px_120px]';
  const headerText = isCompact ? 'text-[10px]' : 'text-xs';
  const rowText = 'text-xs';
  const container = isCompact
    ? 'bg-muted/30 rounded-lg p-3 border border-border'
    : 'rounded-lg border border-border overflow-hidden';
  const notaText = isCompact
    ? 'text-[10px] text-muted-foreground mt-2 italic'
    : 'text-xs text-muted-foreground mt-2 leading-relaxed';

  return (
    <div>
      {titulo && !isCompact && (
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          {titulo}
        </h3>
      )}
      {titulo && isCompact && (
        <h3 className="font-bold text-xs uppercase mb-2">{titulo}</h3>
      )}
      <div className={container}>
        <div
          className={`grid ${gridCols} ${headerText} uppercase tracking-wide text-muted-foreground ${
            isCompact ? 'pb-1 mb-1 border-b border-border' : 'px-4 py-2 bg-muted/40 border-b'
          }`}
        >
          <span>Fecha</span>
          <span>Tipo</span>
          <span>{isCompact ? 'Estado' : 'Estado / motivo'}</span>
          <span className="text-right pr-2">Descanso</span>
          <span className="text-right">Recargo</span>
        </div>
        {items.map((d) => {
          // §9.9 — El backend puede enviar `resultado` (PAGADO / PERDIDO / SUSPENDIDO)
          // y no siempre incluye el flag `pagado`. Derivamos localmente para no
          // pintar "—" cuando el día sí fue pagado.
          const esPagado = d.pagado ?? d.resultado === 'PAGADO';
          const valorDescanso = Number(d.valor_descanso ?? 0);
          const valorRecargo = Number(d.valor_recargo ?? 0);
          return (
            <div
              key={d.fecha}
              className={`grid ${gridCols} ${rowText} ${
                isCompact
                  ? 'py-0.5'
                  : `px-4 py-2 border-b last:border-b-0 ${esPagado ? '' : 'bg-destructive/5'}`
              }`}
            >
              <span className="font-mono">{d.fecha}</span>
              <span>{d.tipo === 'DOMINICAL' ? 'Dominical' : 'Festivo'}</span>
              <span className={esPagado ? '' : 'text-destructive'}>
                {esPagado
                  ? (d.nombre ?? d.nombre_festivo ?? 'Pagado')
                  : (d.motivo ?? d.resultado ?? 'No pagado')}
              </span>
              {/* Descanso: pintamos el valor cuando exista, aunque el día no
                  esté PAGADO (para SUSPENDIDO_INCAPACIDAD suele venir 0 y sale
                  "—" naturalmente). */}
              <span className="text-right pr-2 font-semibold">
                {valorDescanso > 0 ? formatMoney(valorDescanso) : '—'}
              </span>
              {/* Recargo: solo si el colaborador TRABAJÓ ese día (art. 179).
                  Si no hay valor o no trabajó, sale "—". */}
              <span className="text-right font-semibold">
                {valorRecargo > 0 ? formatMoney(valorRecargo) : '—'}
              </span>
            </div>
          );
        })}
      </div>
      {(diasPerdidos ?? 0) > 0 && (
        <p className={notaText}>
          <strong>Nota (art. 173 num. 1 CST):</strong>{' '}
          se pierden {diasPerdidos} descanso{diasPerdidos !== 1 ? 's' : ''} por inasistencia sin justa causa en la semana previa
          {(totalDescansoPerdido ?? 0) > 0 && (
            <>
              . El monto no percibido —informativo, no se descuenta— asciende a{' '}
              <strong>{formatMoney(totalDescansoPerdido!)}</strong>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}
