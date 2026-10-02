/**
 * Tabla de ausencias y novedades del período (§5.1 y §6.2). Se usa en:
 *  - `LiquidarColaborador` con `preview.detalle_ausencias`
 *  - `DesprendiblePago` con `liquidacion.detalle_ausencias`
 *
 * Existe por lo mismo que la de descansos: la línea "INCAPACIDADES $58.363,5"
 * del devengado dice cuánto, pero no qué día ni por qué. Con una incapacidad
 * de tres días partida entre dos quincenas, esa cifra sola no se puede
 * verificar contra nada.
 *
 * El shape es casi idéntico en los dos endpoints. El preview manda
 * `dias_en_rango`, que son los días que caen dentro de esta nómina; el
 * desprendible manda `dias_calendario`, que son los de la ausencia completa.
 * No es lo mismo y por eso se muestran con etiquetas distintas.
 *
 * Si `items` es undefined o vacío no renderiza nada.
 */

export interface AusenciaItem {
  id?: number;
  /** Constante del modelo: INCAPACIDAD_EPS, AUSENCIA_INJUSTIFICADA, etc. */
  tipo: string;
  /** Nombre del motivo del catálogo del tenant. */
  motivo_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  /** Días dentro de esta nómina (preview). */
  dias_en_rango?: number;
  /** Días de la ausencia completa (desprendible). */
  dias_calendario?: number;
  es_remunerada: boolean;
  porcentaje_pago: number;
  /** Suma (INCAPACIDAD) o descuenta (DESCUENTO). Ausente en el desprendible. */
  valor_calculado?: number;
  /**
   * PR-N3 — `INFORMATIVA` es una novedad parcial: quedó LIQUIDADA en la
   * nómina pero nunca entró al cálculo, así que no suma ni descuenta.
   */
  afecta: 'INCAPACIDAD' | 'DESCUENTO' | 'INFORMATIVA' | string;
  /** PR-N3 — Solo en el desprendible: la novedad es por horas. */
  parcial?: boolean;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  /** §9.6 — Tramos contiguos agrupados en un solo evento EPS. */
  ausencia_ids?: number[];
  /** PR-N6 — Si estos días descuentan del auxilio de transporte. */
  afecta_auxilio_transporte?: boolean;
  /** PR-N6 — Días de la fila que conservan el auxilio. */
  dias_con_auxilio?: number;
}

interface Props {
  items?: AusenciaItem[];
  /** Formatter de dinero. Cada pantalla usa el suyo. */
  formatMoney: (n: number) => string;
  /** `compact` para el desprendible impreso; `default` para la pantalla web. */
  variant?: 'default' | 'compact';
  titulo?: string;
}

/**
 * `YYYY-MM-DD`, igual que la tabla de descansos. Un solo día no se pinta
 * como rango.
 *
 * Se recorta el ISO a mano en vez de construir un `Date`: el backend manda
 * `2026-05-14T05:00:00.000000Z` y parsear eso corre el día hacia atrás en
 * cualquier zona al oeste de UTC. Cortando los 10 primeros caracteres no
 * hay zona horaria en juego.
 */
function rangoFechas(a: AusenciaItem): string {
  const desde = String(a.fecha_inicio).slice(0, 10);
  const hasta = String(a.fecha_fin).slice(0, 10);
  return desde === hasta ? desde : `${desde} — ${hasta}`;
}

export function DetalleAusencias({ items, formatMoney, variant = 'default', titulo }: Props) {
  if (!items || items.length === 0) return null;

  const isCompact = variant === 'compact';
  const gridCols = isCompact
    ? 'grid-cols-[150px_50px_1fr_90px]'
    : 'grid-cols-[195px_60px_1fr_120px]';
  const headerText = isCompact ? 'text-[10px]' : 'text-xs';
  const container = isCompact
    ? 'bg-muted/30 rounded-lg p-3 border border-border'
    : 'rounded-lg border border-border overflow-hidden';

  return (
    <div>
      {titulo && !isCompact && <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">{titulo}</h3>}
      {titulo && isCompact && <h3 className="mb-2 text-xs font-bold uppercase">{titulo}</h3>}

      <div className={container}>
        <div
          className={`grid ${gridCols} ${headerText} uppercase tracking-wide text-muted-foreground ${
            isCompact ? 'mb-1 border-b border-border pb-1' : 'border-b bg-muted/40 px-4 py-2'
          }`}
        >
          <span>Fecha</span>
          <span className="text-center">Días</span>
          <span>Motivo</span>
          <span className="text-right">Valor</span>
        </div>

        {items.map((a, i) => {
          const dias = a.dias_en_rango ?? a.dias_calendario ?? 0;
          const descuenta = a.afecta === 'DESCUENTO';
          const informativa = a.afecta === 'INFORMATIVA' || a.parcial === true;
          const horario = a.hora_inicio && a.hora_fin
            ? `${String(a.hora_inicio).slice(0, 5)} a ${String(a.hora_fin).slice(0, 5)}`
            : null;
          const valor = Number(a.valor_calculado ?? 0);
          const tramos = a.ausencia_ids?.length ?? 0;

          return (
            <div
              key={a.id ?? `${a.fecha_inicio}-${i}`}
              className={`grid ${gridCols} text-xs ${
                isCompact
                  ? 'py-0.5'
                  : `border-b px-4 py-2 last:border-b-0 ${descuenta ? 'bg-destructive/5' : ''}`
              }`}
            >
              <span className="font-mono">{rangoFechas(a)}</span>
              {/* PR-N3: una parcial tiene 0 días; el horario es lo que la
                  explica, y poner un 0 ahí parece un error de cálculo. */}
              <span className="text-center">{informativa && horario ? '—' : dias}</span>

              <span className="min-w-0">
                <span className="block truncate">{a.motivo_nombre}</span>
                {/* §9.6 — Varios tramos contiguos cuentan como un solo evento
                    EPS, para que la regla del 100 % los dos primeros días
                    arranque en el día real y no se reinicie en cada fila. */}
                {informativa && (
                  <span className="block text-[10px] text-sky-700 dark:text-sky-400">
                    {horario ? `${horario} · ` : ''}informativa: no descuenta día
                  </span>
                )}
                {tramos > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {tramos} tramos en un solo evento
                  </span>
                )}
                {/* PR-N6 — Conservar el auxilio esos días cambia la cifra
                    del subsidio, así que se dice en la fila que lo causa. */}
                {a.afecta_auxilio_transporte === false && (
                  <span className="block text-[10px] text-muted-foreground">
                    Conserva el auxilio de transporte
                    {(a.dias_con_auxilio ?? 0) > 0 && ` (${a.dias_con_auxilio} día${a.dias_con_auxilio !== 1 ? 's' : ''})`}
                  </span>
                )}
              </span>

              <span
                className={`text-right font-semibold ${descuenta ? 'text-destructive' : ''}`}
              >
                {valor > 0 && !informativa ? `${descuenta ? '−' : ''}${formatMoney(valor)}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {!isCompact && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Los días son los que caen dentro de esta nómina. Una incapacidad que cruza el corte de
          quincena se paga en las dos, cada una con su tramo.
        </p>
      )}
    </div>
  );
}
