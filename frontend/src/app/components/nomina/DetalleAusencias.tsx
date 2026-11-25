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
import { Badge } from '../ui/badge';
import { estiloDetalle } from './estiloDetalle';

/** Un tramo del escalón legal de una incapacidad EPS (doc §9.6). */
export interface TramoIncapacidad {
  tramo: 'EMPLEADOR' | 'EPS' | 'EPS_PROLONGADA' | string;
  posicion_desde: number;
  posicion_hasta: number;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  porcentaje: number;
  valor_dia: number;
  valor_dia_pagado: number;
  piso_smlv: boolean;
  valor: number;
}

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
   * Qué le hace la ausencia al pago. Manda sobre `es_remunerada`: una no
   * remunerada descuenta o no según la modalidad del contrato.
   *
   * PR-N3 — `INFORMATIVA` es una novedad parcial: quedó LIQUIDADA en la
   * nómina pero nunca entró al cálculo, así que no suma ni descuenta.
   *
   * 2026-11-10 — `SIN_PAGO` es la no remunerada de un destajero: el día no
   * produjo y no se cobra, pero tampoco se descuenta nada (CST art. 53).
   * Antes llegaba como `DESCUENTO` y la tabla pintaba un negativo en rojo
   * que no salía de ningún total.
   */
  afecta: 'INCAPACIDAD' | 'DESCUENTO' | 'SIN_PAGO' | 'INFORMATIVA' | string;
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
  /**
   * §9.6 (2026-10-26) — El escalón de una incapacidad EPS. Lo manda el
   * preview; el desprendible no.
   */
  porcentaje_efectivo?: number | null;
  valor_dia?: number;
  dias_evento?: number;
  piso_smlv_aplicado?: boolean;
  tramos?: TramoIncapacidad[];
  resumen?: string | null;
  /** Días del rango con jornal o cosecha: se pagaron como trabajados. */
  fechas_con_trabajo?: string[];
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
  return desde === hasta ? desde : `${desde} a ${hasta}`;
}

/** `2026-03-30T05:00:00Z` -> `30/03/2026`, sin construir un Date. */
function soloFecha(iso: string): string {
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : String(iso);
}

/** "EPS" en vez de "EPS_PROLONGADA" ocupa menos y dice lo mismo en la fila. */
const ROTULO_TRAMO: Record<string, string> = {
  EMPLEADOR: 'Empleador',
  EPS: 'EPS',
  EPS_PROLONGADA: 'EPS (día 91+)',
};

/**
 * El escalón de una incapacidad EPS, tramo por tramo.
 *
 * Los días de un mismo evento no valen igual: los dos primeros al 100 % y a
 * cargo del empleador, del 3 al 90 al 66,67 %, del 91 en adelante al 50 %.
 * Sin este desglose la línea dice "66,67 %" y paga el 100, que es justo lo
 * que hacía dudar del cálculo en las incapacidades de uno o dos días.
 */
function TablaTramos({
  tramos,
  formatMoney,
}: {
  tramos: TramoIncapacidad[];
  formatMoney: (n: number) => string;
}) {
  return (
    <div className="mt-1.5 space-y-1 border-l border-border pl-3">
      {tramos.map((t, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {t.posicion_desde === t.posicion_hasta
              ? `día ${t.posicion_desde}`
              : `días ${t.posicion_desde}-${t.posicion_hasta}`}
          </span>
          <span>·</span>
          <span>{ROTULO_TRAMO[t.tramo] ?? t.tramo}</span>
          <span>·</span>
          <span className="tabular-nums">{t.porcentaje}%</span>
          <span>·</span>
          <span className="tabular-nums">{formatMoney(t.valor_dia_pagado)}/día</span>
          {t.piso_smlv && <Badge variant="warning">Piso SMLV</Badge>}
          <span className="ml-auto font-medium tabular-nums text-foreground">{formatMoney(t.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/** Lo que dice la fila sobre el pago, según `afecta`. */
interface Lectura {
  descuenta: boolean;
  sinPago: boolean;
  informativa: boolean;
  horario: string | null;
}

function leer(a: AusenciaItem): Lectura {
  /*
   * Cualquier valor que no conozcamos se trata como informativo: sin cifra y
   * sin signo. Es la única salida segura si el backend agrega un caso nuevo
   * antes que el front.
   */
  return {
    descuenta: a.afecta === 'DESCUENTO',
    sinPago: a.afecta === 'SIN_PAGO',
    informativa: a.parcial === true || !['INCAPACIDAD', 'DESCUENTO', 'SIN_PAGO'].includes(String(a.afecta)),
    horario: a.hora_inicio && a.hora_fin
      ? `${String(a.hora_inicio).slice(0, 5)} a ${String(a.hora_fin).slice(0, 5)}`
      : null,
  };
}

/** El día con jornal o cosecha se paga como trabajado y sale de la licencia. */
function notaTrabajo(a: AusenciaItem): string | null {
  const conTrabajo = (a.fechas_con_trabajo ?? []).map(soloFecha);
  if (conTrabajo.length === 0) return null;
  return conTrabajo.length === 1
    ? `${conTrabajo[0]} se liquidó como día trabajado`
    : `${conTrabajo.join(', ')} se liquidaron como días trabajados`;
}

/** El estilo lo manda `afecta`, no `es_remunerada`. */
function textoValor(a: AusenciaItem, l: Lectura, formatMoney: (n: number) => string): string {
  if (l.sinPago) return 'No se paga';
  const valor = Number(a.valor_calculado ?? 0);
  if (valor <= 0 || l.informativa) return '-';
  return `${l.descuenta ? '−' : ''}${formatMoney(valor)}`;
}

/** Motivo y las notas que explican la cifra de la fila. */
function CeldaMotivo({
  a,
  l,
  isCompact,
  formatMoney,
}: {
  a: AusenciaItem;
  l: Lectura;
  isCompact: boolean;
  formatMoney: (n: number) => string;
}) {
  const tramos = a.ausencia_ids?.length ?? 0;
  // El escalón solo llega en el preview, y solo en las EPS.
  const escalon = !isCompact && (a.tramos?.length ?? 0) > 0 ? a.tramos! : null;
  const nota = notaTrabajo(a);
  /*
   * La tasa de la novedad y la que de verdad se pagó no coinciden en una
   * incapacidad corta: el 100 % de los dos primeros días no depende de lo que
   * diga el motivo. Se muestran las dos cuando difieren.
   */
  const efectivo = a.porcentaje_efectivo;
  const mostrarEfectivo = efectivo != null && Math.abs(efectivo - Number(a.porcentaje_pago)) >= 0.01;
  const sub = 'block text-xs leading-snug text-muted-foreground';

  return (
    <>
      <span className="block font-medium text-foreground">{a.motivo_nombre}</span>
      {l.informativa && (
        <span className={sub}>{l.horario ? `${l.horario} · ` : ''}Informativa: no descuenta día</span>
      )}
      {/* §9.6 — Varios tramos contiguos cuentan como un solo evento EPS. */}
      {tramos > 1 && <span className={sub}>{tramos} tramos en un solo evento</span>}
      {nota && <span className={sub}>{nota}</span>}
      {/* En una fila que no se paga no va texto debajo: la columna de al lado
          ya dijo lo único que hay que decir. */}
      {!isCompact && !l.sinPago && a.resumen && <span className={sub}>{a.resumen}</span>}
      {mostrarEfectivo && (
        <span className={sub}>{a.porcentaje_pago}% de la novedad · {efectivo}% pagado</span>
      )}
      {escalon && <TablaTramos tramos={escalon} formatMoney={formatMoney} />}
      {/* PR-N6 — Conservar el auxilio esos días cambia la cifra del subsidio. */}
      {a.afecta_auxilio_transporte === false && (
        <span className={sub}>
          Conserva el auxilio de transporte
          {(a.dias_con_auxilio ?? 0) > 0 && ` (${a.dias_con_auxilio} día${a.dias_con_auxilio !== 1 ? 's' : ''})`}
        </span>
      )}
    </>
  );
}

export function DetalleAusencias({ items, formatMoney, variant = 'default', titulo }: Props) {
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
              <th className={`${e.th} text-right`}>Días</th>
              <th className={`${e.th} text-left`}>Motivo</th>
              <th className={`${e.th} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((a, i) => {
              const l = leer(a);
              // `dias_en_rango` son los que paga la fila; `dias_calendario`,
              // los del rango completo.
              const dias = a.dias_en_rango ?? a.dias_calendario ?? 0;
              return (
                <tr key={a.id ?? `${a.fecha_inicio}-${i}`}>
                  <td className={`${e.td} whitespace-nowrap tabular-nums text-muted-foreground`}>{rangoFechas(a)}</td>
                  {/* PR-N3: una parcial tiene 0 días; el horario la explica. */}
                  <td className={`${e.td} text-right tabular-nums`}>{l.informativa && l.horario ? '-' : dias}</td>
                  <td className={`${e.td} min-w-48`}>
                    <CeldaMotivo a={a} l={l} isCompact={isCompact} formatMoney={formatMoney} />
                  </td>
                  <td
                    className={`${e.td} whitespace-nowrap text-right tabular-nums ${
                      l.sinPago ? 'text-muted-foreground' : 'font-medium text-foreground'
                    }`}
                  >
                    {textoValor(a, l, formatMoney)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isCompact && (
        <p className={e.nota}>
          Los días son los que caen dentro de esta nómina. Una incapacidad que cruza el corte de
          quincena se paga en las dos, cada una con su tramo.
        </p>
      )}
    </div>
  );
}
