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
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  APROBADA: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  RECHAZADA: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  LIQUIDADA: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400',
  PAGADA: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  PROGRAMADA: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400',
  EFECTIVA: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400',
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
