/**
 * Piezas compartidas por las pantallas de vacaciones.
 * Los helpers de dinero y descarga viven en periodo/textos.ts y se reexportan
 * aquí para no duplicarlos.
 */
import type {
  EstadoVacacion, EstadoVencimiento, ModoPagoVacacion, OrigenVacacion,
} from '../../../../api/vacaciones';

export { fmtCOP, getIniciales, descargarBlob } from '../periodo/textos';

/** El semáforo lo decide el backend; aquí solo se pinta. */
export interface EstiloSemaforo {
  dot: string;
  badge: string;
  label: string;
}

export const SEMAFORO: Record<EstadoVencimiento, EstiloSemaforo> = {
  VENCIDA: {
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    label: 'Vencida',
  },
  URGENTE: {
    dot: 'bg-destructive',
    badge: 'bg-destructive-soft text-destructive border-destructive/20',
    label: 'Urgente',
  },
  PROXIMA: {
    dot: 'bg-warning',
    badge: 'bg-warning-soft text-warning border-warning/20',
    label: 'Próxima',
  },
  CON_TIEMPO: {
    dot: 'bg-success',
    badge: 'bg-success-soft text-success border-success/20',
    label: 'Con tiempo',
  },
  AL_DIA: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted/50 text-muted-foreground border-border',
    label: 'Al día',
  },
};

// PR-N4 — PENDIENTE pasó a ser un estado real: una solicitud venida de
// Novedades, sin valores y sin consumir saldo. Se pinta en ámbar fuerte
// porque pide acción: liquidarla o rechazarla.
export const ESTADO_VACACION_BADGE: Record<EstadoVacacion, string> = {
  APROBADA: 'bg-warning-soft text-warning border-warning/20',
  PAGADA: 'bg-success-soft text-success border-success/20',
  CANCELADA: 'bg-destructive/10 text-destructive border-destructive/30',
  PENDIENTE: 'bg-warning-soft text-warning border-warning/20',
};

export const ESTADO_VACACION_LABEL: Record<EstadoVacacion, string> = {
  APROBADA: 'Pendiente de pago',
  PAGADA: 'Pagada',
  CANCELADA: 'Anulada',
  PENDIENTE: 'Solicitud pendiente',
};

// PR-L15 — El modo de pago no es un estado: es quien pone la plata. En
// NOMINA el modulo no gira nada, cada nomina paga su tramo del disfrute.
export const MODO_PAGO_BADGE: Record<ModoPagoVacacion, string> = {
  DIRECTO: 'bg-muted/50 text-muted-foreground border-border',
  NOMINA: 'bg-info-soft text-info border-info/20',
};

export const ORIGEN_LABEL: Record<OrigenVacacion, string> = {
  SISTEMA: 'Liquidada aquí',
  HISTORICO: 'Registro histórico',
  LIQUIDACION_FINAL: 'Compensada al retiro',
};

/** Días enteros o con media unidad: 7,5 se escribe con coma. */
export const fmtDias = (n: number) =>
  Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
