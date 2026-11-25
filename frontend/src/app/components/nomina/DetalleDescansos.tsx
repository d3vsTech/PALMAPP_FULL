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

import { estiloDetalle } from './estiloDetalle';

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

/**
 * Rótulos de `resultado` (§9.9). `SUSPENDIDO_VACACIONES` llega con PR-L8:
 * el día cae dentro de unas vacaciones que ya pagó Liquidaciones, así que
 * no vale, pero tampoco se perdió.
 */
const RESULTADO_LABEL: Record<string, string> = {
  PAGADO: 'Pagado',
  PERDIDO_INASISTENCIA: 'Perdido por inasistencia',
  SUSPENDIDO_INCAPACIDAD: 'Suspendido por incapacidad',
  SUSPENDIDO_VACACIONES: 'En vacaciones',
};

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
  const e = estiloDetalle(variant);

  return (
    <div>
      {titulo && <h4 className={e.titulo}>{titulo}</h4>}
      <div className={e.marco}>
        <table className={e.tabla}>
          <thead>
            <tr className={e.encabezado}>
              <th className={`${e.th} text-left`}>Fecha</th>
              <th className={`${e.th} text-left`}>Tipo</th>
              <th className={`${e.th} text-left`}>{isCompact ? 'Estado' : 'Estado o motivo'}</th>
              <th className={`${e.th} text-right`}>Descanso</th>
              <th className={`${e.th} text-right`}>Recargo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((d) => {
              // §9.9 — El backend puede enviar `resultado` sin el flag
              // `pagado`. Derivamos localmente para no pintar "—" cuando el
              // día sí fue pagado.
              const esPagado = d.pagado ?? d.resultado === 'PAGADO';
              const valorDescanso = Number(d.valor_descanso ?? 0);
              const valorRecargo = Number(d.valor_recargo ?? 0);
              return (
                <tr key={d.fecha}>
                  <td className={`${e.td} whitespace-nowrap tabular-nums text-muted-foreground`}>{d.fecha}</td>
                  <td className={e.td}>{d.tipo === 'DOMINICAL' ? 'Dominical' : 'Festivo'}</td>
                  <td className={`${e.td} ${esPagado ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {esPagado
                      ? (d.nombre ?? d.nombre_festivo ?? 'Pagado')
                      : (d.motivo ?? RESULTADO_LABEL[d.resultado ?? ''] ?? d.resultado ?? 'No pagado')}
                  </td>
                  {/* Descanso: el valor cuando exista, aunque el día no esté
                      PAGADO (en SUSPENDIDO_INCAPACIDAD suele venir 0). */}
                  <td className={`${e.td} whitespace-nowrap text-right tabular-nums`}>
                    {valorDescanso > 0 ? formatMoney(valorDescanso) : '-'}
                  </td>
                  {/* Recargo: solo si el colaborador trabajó ese día (art. 179). */}
                  <td className={`${e.td} whitespace-nowrap text-right tabular-nums`}>
                    {valorRecargo > 0 ? formatMoney(valorRecargo) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(diasPerdidos ?? 0) > 0 && (
        <p className={e.nota}>
          <span className="font-medium text-foreground">Nota (art. 173 num. 1 CST):</span>{' '}
          se pierden {diasPerdidos} descanso{diasPerdidos !== 1 ? 's' : ''} por inasistencia sin justa causa en la semana previa
          {(totalDescansoPerdido ?? 0) > 0 && (
            <>
              . El monto no percibido, informativo y sin descuento, asciende a{' '}
              <span className="font-medium text-foreground">{formatMoney(totalDescansoPerdido!)}</span>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}
