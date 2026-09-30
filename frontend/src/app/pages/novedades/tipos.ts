/**
 * Catálogo de novedades laborales.
 *
 * Fuente única de verdad del módulo: ambas pantallas leen de aquí en vez de
 * duplicar etiquetas, colores o reglas de remuneración. Si mañana entra el
 * backend, lo único que cambia es de dónde sale `TIPOS_NOVEDAD`.
 */
import {
  Activity, Baby, Ban, CalendarCheck, Clock, FileX, Heart, Home,
  LogOut, ShieldAlert, Umbrella, UserMinus, UserX, type LucideIcon,
} from 'lucide-react';

export type TipoNovedad =
  | 'AUSENCIA_INJUSTIFICADA'
  | 'CALAMIDAD_DOMESTICA'
  | 'INCAPACIDAD_ARL'
  | 'INCAPACIDAD_EPS'
  | 'LICENCIA_MATERNIDAD'
  | 'LICENCIA_PATERNIDAD'
  | 'LICENCIA_LUTO'
  | 'PERMISO_NO_REMUNERADO'
  | 'PERMISO_REMUNERADO'
  | 'SUSPENSION_DISCIPLINARIA'
  | 'RENUNCIA'
  | 'FINALIZACION_CONTRATO'
  | 'VACACIONES';

export type CategoriaNovedad =
  | 'permisos'
  | 'incapacidades'
  | 'ausencias'
  | 'vacaciones'
  | 'terminacion';

export interface InfoTipoNovedad {
  /** Etiqueta visible al usuario. */
  label: string;
  /** Clases del badge, con su variante oscura. */
  color: string;
  /** Clase del punto de color que acompaña al badge. */
  dot: string;
  /** Ícono representativo del tipo. */
  icono: LucideIcon;
  categoria: CategoriaNovedad;
  remunerado: boolean;
  /** Porcentaje del salario que se paga. `—` cuando no aplica. */
  pct: string;
  afectaSubsidio: boolean;
  /** Pide franja horaria además de las fechas. */
  requiereHoras: boolean;
  /** Admite soporte documental. `labelAdjunto` describe cuál. */
  tieneAdjunto: boolean;
  labelAdjunto: string;
}

export const TIPOS_NOVEDAD: Record<TipoNovedad, InfoTipoNovedad> = {
  PERMISO_REMUNERADO: {
    label: 'Permiso remunerado',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
    dot: 'bg-emerald-500', icono: CalendarCheck, categoria: 'permisos',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: true, tieneAdjunto: true, labelAdjunto: 'Solicitud o autorización',
  },
  PERMISO_NO_REMUNERADO: {
    label: 'Permiso no remunerado',
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
    dot: 'bg-red-500', icono: Clock, categoria: 'permisos',
    remunerado: false, pct: '0%', afectaSubsidio: true,
    requiereHoras: true, tieneAdjunto: true, labelAdjunto: 'Solicitud escrita',
  },
  CALAMIDAD_DOMESTICA: {
    label: 'Calamidad doméstica',
    color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400',
    dot: 'bg-orange-500', icono: Home, categoria: 'permisos',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: true, tieneAdjunto: true, labelAdjunto: 'Certificado o prueba',
  },
  LICENCIA_MATERNIDAD: {
    label: 'Licencia de maternidad',
    color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400',
    dot: 'bg-pink-500', icono: Baby, categoria: 'permisos',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Certificado médico',
  },
  LICENCIA_PATERNIDAD: {
    label: 'Licencia de paternidad',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
    dot: 'bg-purple-500', icono: Baby, categoria: 'permisos',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Registro civil del bebé',
  },
  LICENCIA_LUTO: {
    label: 'Licencia por luto',
    color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400',
    dot: 'bg-slate-500', icono: Heart, categoria: 'permisos',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Certificado de defunción',
  },
  INCAPACIDAD_EPS: {
    label: 'Incapacidad EPS',
    color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400',
    dot: 'bg-sky-400', icono: Activity, categoria: 'incapacidades',
    remunerado: true, pct: '66.67%', afectaSubsidio: true,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Incapacidad médica EPS',
  },
  INCAPACIDAD_ARL: {
    label: 'Incapacidad ARL',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30',
    dot: 'bg-blue-500', icono: ShieldAlert, categoria: 'incapacidades',
    remunerado: true, pct: '100%', afectaSubsidio: true,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Incapacidad ARL',
  },
  AUSENCIA_INJUSTIFICADA: {
    label: 'Ausencia injustificada',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30',
    dot: 'bg-blue-500', icono: UserX, categoria: 'ausencias',
    remunerado: false, pct: '0%', afectaSubsidio: true,
    requiereHoras: true, tieneAdjunto: false, labelAdjunto: '',
  },
  SUSPENSION_DISCIPLINARIA: {
    label: 'Suspensión disciplinaria',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
    dot: 'bg-amber-500', icono: Ban, categoria: 'ausencias',
    remunerado: false, pct: '0%', afectaSubsidio: true,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Acta disciplinaria',
  },
  VACACIONES: {
    label: 'Vacaciones',
    color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400',
    dot: 'bg-teal-500', icono: Umbrella, categoria: 'vacaciones',
    remunerado: true, pct: '100%', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: false, labelAdjunto: '',
  },
  RENUNCIA: {
    label: 'Renuncia',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
    dot: 'bg-rose-600', icono: LogOut, categoria: 'terminacion',
    remunerado: false, pct: '—', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Carta de renuncia',
  },
  FINALIZACION_CONTRATO: {
    label: 'Finalización de contrato',
    color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400',
    dot: 'bg-gray-500', icono: FileX, categoria: 'terminacion',
    remunerado: false, pct: '—', afectaSubsidio: false,
    requiereHoras: false, tieneAdjunto: true, labelAdjunto: 'Acta de terminación',
  },
};

export interface InfoCategoria {
  key: CategoriaNovedad;
  label: string;
  icono: LucideIcon;
  tipos: TipoNovedad[];
}

const ORDEN_CATEGORIAS: { key: CategoriaNovedad; label: string; icono: LucideIcon }[] = [
  { key: 'permisos',      label: 'Permisos y Licencias',    icono: CalendarCheck },
  { key: 'incapacidades', label: 'Incapacidades',           icono: Activity      },
  { key: 'ausencias',     label: 'Ausencias y Sanciones',   icono: UserMinus     },
  { key: 'vacaciones',    label: 'Vacaciones',              icono: Umbrella      },
  { key: 'terminacion',   label: 'Terminación de Contrato', icono: FileX         },
];

const TIPOS_ORDENADOS = Object.keys(TIPOS_NOVEDAD) as TipoNovedad[];

/** Las pestañas del paso 1. Los tipos se derivan del catálogo, no se repiten. */
export const CATEGORIAS: InfoCategoria[] = ORDEN_CATEGORIAS.map((cat) => ({
  ...cat,
  tipos: TIPOS_ORDENADOS.filter((t) => TIPOS_NOVEDAD[t].categoria === cat.key),
}));

export function categoriaDe(tipo: TipoNovedad): InfoCategoria {
  return CATEGORIAS.find((c) => c.key === TIPOS_NOVEDAD[tipo].categoria)!;
}

/** Renuncia y finalización no tienen rango: son una fecha efectiva. */
export function esTerminacion(tipo: TipoNovedad | null): boolean {
  return tipo === 'RENUNCIA' || tipo === 'FINALIZACION_CONTRATO';
}

export function esIncapacidad(tipo: TipoNovedad | null): boolean {
  return tipo === 'INCAPACIDAD_EPS' || tipo === 'INCAPACIDAD_ARL';
}

export const CAUSAS_RENUNCIA = [
  { value: 'RENUNCIA_VOLUNTARIA', label: 'Renuncia voluntaria' },
  { value: 'RENUNCIA_PRESIONADA', label: 'Renuncia presionada' },
] as const;

export const CAUSAS_FINALIZACION = [
  { value: 'VENCIMIENTO_CONTRATO',    label: 'Vencimiento de contrato'      },
  { value: 'MUTUO_ACUERDO',           label: 'Mutuo acuerdo'                },
  { value: 'DESPIDO_JUSTA_CAUSA',     label: 'Despido con justa causa'      },
  { value: 'DESPIDO_SIN_JUSTA_CAUSA', label: 'Despido sin justa causa'      },
  { value: 'OBRA_TERMINADA',          label: 'Terminación de obra o labor'  },
] as const;

export function causasDe(tipo: TipoNovedad | null) {
  return tipo === 'RENUNCIA' ? CAUSAS_RENUNCIA : CAUSAS_FINALIZACION;
}

// ── Modelos ───────────────────────────────────────────────────────────────────

export interface Colaborador {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
}

export interface Novedad {
  id: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  tipo: TipoNovedad;
  /** ISO `YYYY-MM-DD`. En terminaciones es la fecha efectiva. */
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  observaciones?: string;
  fechaRegistro: string;
}

// ── Formato ───────────────────────────────────────────────────────────────────

/**
 * Las fechas llegan como `YYYY-MM-DD`. El `T00:00:00` evita que el navegador
 * las lea como UTC y las corra un día hacia atrás en la zona de Colombia.
 */
export function formatFecha(iso: string): string {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatFechaLarga(iso: string): string {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatFechaCorta(iso: string): string {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short',
  });
}

export function formatHora(hhmm: string): string {
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

/** `DESPIDO_JUSTA_CAUSA` → `Despido Justa Causa`. */
export function humanizarCausa(causa: string): string {
  return causa.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
