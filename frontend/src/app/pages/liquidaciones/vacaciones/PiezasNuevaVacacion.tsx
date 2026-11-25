/**
 * Piezas de la pantalla de liquidación de vacaciones (NuevaVacaciones).
 * Solo pintan: todo lo que muestran llega calculado del backend o del padre.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, CalendarDays, Check, Loader2, type LucideIcon } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  DIA_NO_HABIL_LABEL,
  type CalendarioVacaciones,
  type ComprobanteVacaciones,
  type MetodoPagoVacacion,
} from '../../../../api/vacaciones';
import { formatFecha } from '../../../utils/fecha';
import { fmtCOP, fmtDias } from './comunes';

// ── Aviso ────────────────────────────────────────────────────────────────────

type Tono = 'destructive' | 'warning' | 'info' | 'muted';

const FONDO: Record<Tono, string> = {
  destructive: 'bg-destructive-soft',
  warning: 'bg-warning-soft',
  info: 'bg-info-soft',
  muted: 'bg-muted/60',
};

const ICONO: Record<Tono, string> = {
  destructive: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
  muted: 'text-muted-foreground',
};

/** Caja de aviso del diseño: fondo suave, texto normal y solo el ícono con tono. */
export function Aviso({ tono, icono: Icono, children }: {
  tono: Tono;
  icono: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-3 rounded-lg px-4 py-3 text-sm text-foreground ${FONDO[tono]}`}>
      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${ICONO[tono]}`} strokeWidth={2} />
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

// ── Control segmentado ───────────────────────────────────────────────────────

export interface OpcionSegmento<T extends string> {
  valor: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

/** Botones pegados con la opción activa en primary, como en el diseño. */
export function Segmentado<T extends string>({ opciones, valor, onCambio, ariaLabel }: {
  opciones: OpcionSegmento<T>[];
  valor: T;
  onCambio: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-input" role="group" aria-label={ariaLabel}>
      {opciones.map((o, i) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambio(o.valor)}
          disabled={o.disabled}
          title={o.title}
          aria-pressed={valor === o.valor}
          className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${i > 0 ? 'border-l border-input' : ''} ${
            valor === o.valor ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Pago anticipado ──────────────────────────────────────────────────────────

/** Fecha, método y referencia del giro cuando se paga de una vez. */
export function DatosPagoAnticipado({ fecha, onFecha, metodo, onMetodo, referencia, onReferencia, disabled }: {
  fecha: string;
  onFecha: (v: string) => void;
  metodo: MetodoPagoVacacion;
  onMetodo: (v: MetodoPagoVacacion) => void;
  referencia: string;
  onReferencia: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 rounded-lg bg-muted/60 p-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="vac-fecha-pago">Fecha de pago *</Label>
        <Input id="vac-fecha-pago" type="date" value={fecha} onChange={(e) => onFecha(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vac-metodo-pago">Método *</Label>
        <Select value={metodo} onValueChange={(v) => onMetodo(v as MetodoPagoVacacion)} disabled={disabled}>
          <SelectTrigger id="vac-metodo-pago"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vac-referencia">
          Referencia <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="vac-referencia"
          placeholder="N.º de comprobante"
          value={referencia}
          onChange={(e) => onReferencia(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ── Calendario resuelto ──────────────────────────────────────────────────────

/** Rango que resolvió `/calendario`: fechas, hábiles y días que se pagan. */
export function RangoCalendario({ calendario, calculando, diasPago }: {
  calendario: CalendarioVacaciones | null;
  calculando: boolean;
  diasPago: number | null;
}) {
  if (calculando) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculando el rango
      </p>
    );
  }
  if (!calendario) {
    return (
      <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        No se pudo resolver el rango. Revisa la fecha de inicio.
      </p>
    );
  }
  const difiere = diasPago != null && diasPago !== calendario.dias_calendario;
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          {formatFecha(calendario.fecha_inicio)} al {formatFecha(calendario.fecha_fin)}
        </span>
        <span className="text-muted-foreground">{fmtDias(calendario.dias_habiles)} días hábiles</span>
        <span className="font-semibold text-foreground">
          {difiere
            ? `${fmtDias(diasPago)} días a pagar (${fmtDias(calendario.dias_calendario)} calendario)`
            : `${fmtDias(calendario.dias_calendario)} días calendario a pagar`}
        </span>
      </div>
      {calendario.dias_no_habiles.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No hábiles dentro del rango:{' '}
          {calendario.dias_no_habiles
            .map((d) => `${formatFecha(d.fecha)} (${DIA_NO_HABIL_LABEL[d.motivo]})`)
            .join(', ')}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Se regresa a trabajar el día hábil siguiente al {formatFecha(calendario.fecha_fin)}.
      </p>
    </div>
  );
}

// ── Consumo del saldo ────────────────────────────────────────────────────────

/** Barra de cuánto del saldo disponible se está liquidando. */
export function ConsumoSaldo({ disfrute, dinero, disponibles }: {
  disfrute: number;
  dinero: number;
  disponibles: number;
}) {
  const total = disfrute + dinero;
  const excede = total > disponibles;
  const pct = (total / disponibles) * 100;
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 px-4 py-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Días a liquidar: <strong className="text-foreground">{fmtDias(total)}</strong> de{' '}
          <strong className="text-foreground">{fmtDias(disponibles)}</strong> disponibles
        </span>
        <span className={`font-semibold tabular-nums ${excede ? 'text-destructive' : 'text-foreground'}`}>
          {Math.round(pct)} %
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${excede ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Disfrute: {fmtDias(disfrute)} días
        {dinero > 0 && ` · Dinero: ${fmtDias(dinero)} días`}
        {' · '}Quedan: {fmtDias(Math.max(disponibles - total, 0))}
      </p>
    </div>
  );
}

// ── Estado del ajuste de base ────────────────────────────────────────────────

/**
 * En qué va el ajuste de base. Sin esto no había señal de que el backend
 * hubiera recalculado, ni de qué faltaba para poder confirmar.
 */
export function EstadoAjuste({ calculando, aplicado, sinDias, conError }: {
  calculando: boolean;
  aplicado: boolean;
  sinDias: boolean;
  conError: boolean;
}) {
  if (calculando) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Recalculando con la base manual
      </p>
    );
  }
  if (aplicado) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" />
        El cálculo de abajo ya usa esta base. Confirme para guardarla con su motivo.
      </p>
    );
  }
  if (conError && !sinDias) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
      {sinDias
        ? 'Capture los días a liquidar: el recálculo sale con ellos.'
        : 'El cálculo todavía no trae la base manual. Revise el motivo y los días.'}
    </p>
  );
}

// ── Plan de pago en nómina ───────────────────────────────────────────────────

/**
 * Qué nómina va a pagar cada tramo del disfrute (§10.4, `nomina.plan_pago`).
 *
 * Es una previsión, no un hecho: las nóminas pueden estar en BORRADOR y
 * algunos tramos no tener todavía una fila del colaborador. Eso último es lo
 * que importa mostrar, porque esos días solo se podrán pagar a mano.
 */
export function PlanDePago({ preview }: { preview: ComprobanteVacaciones | null }) {
  if (!preview) {
    return (
      <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Completa las fechas para ver qué nómina paga cada tramo.
      </p>
    );
  }

  const plan = preview.nomina?.plan_pago ?? [];
  const sinNomina = preview.nomina?.sin_nomina ?? null;
  const sinCubrir = (sinNomina?.dias ?? 0) > 0 || !!sinNomina?.paga_dinero;

  return (
    <div className="space-y-3 rounded-lg bg-muted/60 px-4 py-3">
      <p className="text-sm font-medium text-foreground">Plan de pago</p>
      {plan.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ninguna nómina del colaborador cubre todavía estas fechas.</p>
      ) : (
        <div className="divide-y divide-border">
          {plan.map((t) => (
            <div key={`${t.nomina_id}-${t.fecha_desde}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {t.etiqueta || `Nómina ${t.nomina_id}`}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatFecha(t.fecha_desde)} al {formatFecha(t.fecha_hasta)} · {fmtDias(t.dias)} días
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.estado_nomina === 'CERRADA' ? 'Cerrada' : 'En borrador'}
                  {t.paga_dinero && ` · paga además ${fmtCOP(t.valor_dinero)} de compensación`}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">{fmtCOP(t.valor_tramo)}</p>
            </div>
          ))}
        </div>
      )}
      {sinCubrir && (
        <Aviso tono="warning" icono={AlertTriangle}>
          <p>
            Quedan {fmtDias(sinNomina?.dias ?? 0)} días ({fmtCOP(sinNomina?.valor ?? 0)}) que ninguna nómina
            cubre todavía. Si la nómina de ese tramo ya cerró sin el colaborador, ese saldo habrá que pagarlo
            a mano desde el histórico.
          </p>
        </Aviso>
      )}
    </div>
  );
}
