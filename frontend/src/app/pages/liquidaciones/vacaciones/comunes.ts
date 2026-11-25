/**
 * Piezas compartidas por las pantallas de vacaciones.
 * Los helpers de dinero y descarga viven en periodo/textos.ts y se reexportan
 * aquí para no duplicarlos.
 */
import type {
  EstadoVacacion, EstadoVencimiento, ModoPagoVacacion, OrigenVacacion,
} from '../../../../api/vacaciones';
import { formatFecha } from '../../../utils/fecha';

export { fmtCOP, getIniciales, descargarBlob } from '../periodo/textos';

/** Variantes de Badge del diseño (components/liquidaciones/EstadoBadges). */
export type VarianteBadge = 'secondary' | 'success' | 'warning' | 'info' | 'destructive';

/** El semáforo lo decide el backend; aquí solo se pinta. */
export interface EstiloSemaforo {
  variant: VarianteBadge;
  label: string;
}

export const SEMAFORO: Record<EstadoVencimiento, EstiloSemaforo> = {
  VENCIDA: { variant: 'destructive', label: 'Vencida' },
  URGENTE: { variant: 'destructive', label: 'Urgente' },
  PROXIMA: { variant: 'warning', label: 'Próxima' },
  CON_TIEMPO: { variant: 'success', label: 'Con tiempo' },
  AL_DIA: { variant: 'secondary', label: 'Al día' },
};

// PR-N4 — PENDIENTE pasó a ser un estado real: una solicitud venida de
// Novedades, sin valores y sin consumir saldo. Va en ámbar porque pide
// acción: liquidarla o rechazarla.
export const ESTADO_VACACION_VARIANTE: Record<EstadoVacacion, VarianteBadge> = {
  APROBADA: 'warning',
  PAGADA: 'success',
  CANCELADA: 'destructive',
  PENDIENTE: 'warning',
};

export const ESTADO_VACACION_LABEL: Record<EstadoVacacion, string> = {
  APROBADA: 'Pendiente de pago',
  PAGADA: 'Pagada',
  CANCELADA: 'Anulada',
  PENDIENTE: 'Solicitud pendiente',
};

// PR-L15 — El modo de pago no es un estado: es quien pone la plata. En
// NOMINA el modulo no gira nada, cada nomina paga su tramo del disfrute.
export const MODO_PAGO_VARIANTE: Record<ModoPagoVacacion, VarianteBadge> = {
  DIRECTO: 'secondary',
  NOMINA: 'info',
};

export const ORIGEN_LABEL: Record<OrigenVacacion, string> = {
  SISTEMA: 'Liquidada aquí',
  HISTORICO: 'Registro histórico',
  LIQUIDACION_FINAL: 'Compensada al retiro',
};

/** Fechas de las tablas como en el diseño: "15 de ene de 2024". */
const FECHA_CORTA: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

export const fmtFechaCorta = (raw?: string | null) => formatFecha(raw, FECHA_CORTA);

/** Días enteros o con media unidad: 7,5 se escribe con coma. */
export const fmtDias = (n: number) =>
  Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
