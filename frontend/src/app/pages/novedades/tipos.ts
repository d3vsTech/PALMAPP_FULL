/**
 * Piezas de presentación del módulo de novedades.
 *
 * El catálogo de motivos **no vive aquí**: sale de `GET novedades/init` y cambia
 * por finca (API_NOVEDADES §3). Lo único que se fija en el front es qué ícono
 * acompaña a cada `tipo_base` y cómo se formatean fechas y días.
 */
import {
  Activity, Baby, Ban, CalendarCheck, Clock, FileX, Heart, Home,
  ShieldAlert, Umbrella, UserMinus, UserX, type LucideIcon,
} from 'lucide-react';
import type {
  CategoriaNovedad, MotivoNovedad, TipoBaseAusencia,
} from '../../../api/novedades';

export type {
  CategoriaNovedad, FuenteNovedad, TipoBaseAusencia, MotivoNovedad, MotivoRetiro,
  CategoriaInit, InitNovedades, NovedadFila, AusenciaDetalle, AdvertenciaNovedad,
} from '../../../api/novedades';

/** Ícono por `tipo_base`. Un motivo custom hereda el de su tipo. */
export const ICONO_TIPO: Record<TipoBaseAusencia, LucideIcon> = {
  PERMISO_REMUNERADO: CalendarCheck,
  PERMISO_NO_REMUNERADO: Clock,
  CALAMIDAD_DOMESTICA: Home,
  LICENCIA_MATERNIDAD: Baby,
  LICENCIA_PATERNIDAD: Baby,
  LICENCIA_LUTO: Heart,
  INCAPACIDAD_EPS: Activity,
  INCAPACIDAD_ARL: ShieldAlert,
  AUSENCIA_INJUSTIFICADA: UserX,
  SUSPENSION_DISCIPLINARIA: Ban,
  OTRO: CalendarCheck,
};

/** Ícono de cada pestaña del Paso 1. */
export const ICONO_CATEGORIA: Record<CategoriaNovedad, LucideIcon> = {
  PERMISOS_LICENCIAS: CalendarCheck,
  INCAPACIDADES: Activity,
  AUSENCIAS_SANCIONES: UserMinus,
  VACACIONES: Umbrella,
  TERMINACION_CONTRATO: FileX,
};

export function iconoDeMotivo(motivo: MotivoNovedad): LucideIcon {
  return ICONO_TIPO[motivo.tipo_base] ?? CalendarCheck;
}

/** Las incapacidades piden entidad y número de radicado. */
export function esIncapacidad(motivo: MotivoNovedad | null): boolean {
  return motivo?.tipo_base === 'INCAPACIDAD_EPS' || motivo?.tipo_base === 'INCAPACIDAD_ARL';
}

/**
 * La EPS o la ARL de la ficha, según el motivo de la incapacidad.
 *
 * `GET colaboradores/select` las trae desde 2026-10-26 (API_COLABORADORES §0),
 * así que el Paso 2 puede rellenar "Entidad" sin una segunda petición y sin
 * exigir `colaboradores.ver` a quien solo registra novedades. Devuelve `''`
 * cuando el motivo no es una incapacidad o la ficha no tiene la afiliación:
 * el campo queda vacío y se escribe a mano.
 */
export function entidadDeLaFicha(
  colaborador: { eps?: string | null; arl?: string | null } | null,
  motivo: MotivoNovedad | null,
): string {
  if (!colaborador) return '';
  if (motivo?.tipo_base === 'INCAPACIDAD_EPS') return colaborador.eps ?? '';
  if (motivo?.tipo_base === 'INCAPACIDAD_ARL') return colaborador.arl ?? '';
  return '';
}

/** `"66.67"` → `"66.67%"`. Las terminaciones no tienen porcentaje. */
export function formatPorcentaje(valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (Number.isNaN(n)) return String(valor);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}%`;
}

// ── Formato ───────────────────────────────────────────────────────────────────

/**
 * Las fechas llegan como `YYYY-MM-DD`. El `T00:00:00` evita que el navegador
 * las lea como UTC y las corra un día hacia atrás en la zona de Colombia.
 */
export function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatFechaLarga(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatFechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short',
  });
}

export function formatHora(hhmm: string | null): string {
  if (!hhmm) return '';
  const [hh, mm] = hhmm.split(':');
  const n = Number(hh);
  const sufijo = n >= 12 ? 'pm' : 'am';
  const h12 = n === 0 ? 12 : n > 12 ? n - 12 : n;
  return `${h12}:${mm} ${sufijo}`;
}

/** Días calendario entre dos fechas, ambos extremos incluidos. */
export function calcularDias(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const d1 = new Date(`${inicio}T00:00:00`).getTime();
  const d2 = new Date(`${fin}T00:00:00`).getTime();
  const dias = Math.floor((d2 - d1) / 86_400_000) + 1;
  return dias > 0 ? dias : 0;
}

export function etiquetaDias(dias: number): string {
  return dias === 1 ? 'día' : 'días';
}

export function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Estados ───────────────────────────────────────────────────────────────────

/** Clases del badge por estado. Las tres fuentes usan nombres distintos. */
export const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-warning-soft text-warning border-warning/20',
  APROBADA: 'bg-success-soft text-success border-success/20',
  RECHAZADA: 'bg-destructive-soft text-destructive border-destructive/20',
  LIQUIDADA: 'bg-info-soft text-info border-info/20',
  PAGADA: 'bg-success-soft text-success border-success/20',
  PROGRAMADA: 'bg-muted/40 text-foreground border-border',
  EFECTIVA: 'bg-muted/40 text-foreground border-border',
};

export const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  LIQUIDADA: 'Liquidada',
  PAGADA: 'Pagada',
  PROGRAMADA: 'Programada',
  EFECTIVA: 'Efectiva',
};

export const ORIGEN_LABEL: Record<string, string> = {
  PLANILLA: 'Planilla',
  NOVEDADES: 'Novedades',
  IMPORTACION: 'Importación',
  SISTEMA: 'Sistema',
  HISTORICO: 'Histórico',
  LIQUIDACION_FINAL: 'Liquidación final',
  CONTRATO: 'Contrato',
  FICHA: 'Ficha',
};
