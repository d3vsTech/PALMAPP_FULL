/**
 * Piezas compartidas por las pantallas de vacaciones.
 * Los helpers de dinero y descarga viven en periodo/textos.ts y se reexportan
 * aquí para no duplicarlos.
 */
import type { EstadoVacacion, EstadoVencimiento, OrigenVacacion } from '../../../../api/vacaciones';

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
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30',
    label: 'Urgente',
  },
  PROXIMA: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
    label: 'Próxima',
  },
  CON_TIEMPO: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30',
    label: 'Con tiempo',
  },
  AL_DIA: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted/50 text-muted-foreground border-border',
    label: 'Al día',
  },
};

export const ESTADO_VACACION_BADGE: Record<EstadoVacacion, string> = {
  APROBADA: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
  PAGADA: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30',
  CANCELADA: 'bg-destructive/10 text-destructive border-destructive/30',
  PENDIENTE: 'bg-muted/50 text-muted-foreground border-border',
};

export const ESTADO_VACACION_LABEL: Record<EstadoVacacion, string> = {
  APROBADA: 'Pendiente de pago',
  PAGADA: 'Pagada',
  CANCELADA: 'Anulada',
  PENDIENTE: 'Pendiente',
};

export const ORIGEN_LABEL: Record<OrigenVacacion, string> = {
  SISTEMA: 'Liquidada aquí',
  HISTORICO: 'Registro histórico',
};

/** Días enteros o con media unidad: 7,5 se escribe con coma. */
export const fmtDias = (n: number) =>
  Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
