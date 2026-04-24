/**
 * operaciones.ts
 * Servicio API para el módulo Operaciones (Planilla del Día).
 * Base URL: {host}/api/v1/tenant
 * Auth: Authorization Bearer + X-Tenant-Id inyectados por requestConToken.
 */
import { requestConToken } from './request';

function tkn(): string | null { return localStorage.getItem('palmapp_token'); }

function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(
    `/api/v1/tenant${path}`,
    { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) },
    tkn(),
  );
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
}
function postForm<T>(path: string, formData: FormData): Promise<T> {
  const token = tkn();
  const tenantId = localStorage.getItem('palmapp_tenant_id');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  return fetch(`/api/v1/tenant${path}`, { method: 'POST', headers, body: formData }).then(r => r.json());
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export type EstadoPlanilla = 'BORRADOR' | 'APROBADA';
export type PeriodoIndicadores = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

export interface Planilla {
  id: number;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hubo_lluvia: boolean;
  cantidad_lluvia?: string | null;
  observaciones?: string | null;
  estado: EstadoPlanilla;
  creado_por: number;
  creado_por_rel?: { id: number; name: string };
  aprobado_por?: number | null;
  aprobado_at?: string | null;
  aprobado_por_rel?: { id: number; name: string };
  // Agregados del listado
  jornales_count?: number;
  cosechas_count?: number;
  ausencias_count?: number;
  colaboradores_count?: number;
  total_jornales_sum?: string;
  total_cosechas_sum?: string;
  total_general?: number;
  // Relaciones del detalle
  cosechas?: Cosecha[];
  jornales?: Jornal[];
  ausencias?: Ausencia[];
  horas_extra?: HoraExtra[];
}

export interface Indicadores {
  periodo: { tipo: PeriodoIndicadores; fecha_desde: string; fecha_hasta: string };
  planillas_borrador: number;
  planillas_aprobadas: number;
  total_planillas: number;
}

export interface Resumen {
  fecha: string;
  elaborado_por: string;
  hubo_lluvia: boolean;
  cantidad_lluvia: string | null;
  inicio_labores: string | null;
  estado: EstadoPlanilla;
  labores: {
    cosecha: number; plateo: number; poda: number;
    fertilizacion: number; sanidad: number; otros: number; auxiliares: number;
  };
  ausencias?: { pendientes: number; aprobadas: number; rechazadas: number; liquidadas: number; total: number };
  horas_extra?: { pendientes: number; aprobadas: number; rechazadas: number; liquidadas: number; total: number; horas_totales: string; valor_total: string };
}

// Cosecha
export interface CosechaCuadrillaItem {
  id?: number;
  empleado_id: number;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  peso_calculado_empleado?: string | null;
  valor_calculado?: string | null;
}
export interface Cosecha {
  id: number;
  operacion_id: number;
  lote_id: number;
  sublote_id: number;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado: string | null;
  precio_cosecha?: string;
  promedio_kg_gajo?: string;
  valor_total: string | null;
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
  cuadrilla: CosechaCuadrillaItem[];
}

// Jornal
export type TipoJornalPalma = 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';
export interface Jornal {
  id: number;
  operacion_id: number;
  empleado_id: number;
  categoria: 'PALMA' | 'FINCA';
  tipo?: TipoJornalPalma | null;
  labor_id?: number | null;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number | null;
  insumo_id?: number | null;
  gramos_por_palma?: number | null;
  nombre_trabajo?: string | null;
  descripcion?: string | null;
  ubicacion?: string | null;
  valor_unitario?: string | null;
  valor_total?: string | null;
  estado: boolean;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
  insumo?: { id: number; nombre: string };
  labor?: { id: number; nombre: string };
}

// Ausencia
export type EstadoAusencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';
export interface Ausencia {
  id: number;
  operacion_id: number;
  empleado_id: number;
  motivo_ausencia_id: number;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_calendario?: number;
  es_remunerada?: boolean;
  afecta_nomina?: boolean;
  porcentaje_pago?: string;
  estado: EstadoAusencia;
  motivo?: string;
  documento_soporte?: string | null;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  motivo_ausencia?: { id: number; nombre: string; tipo_base?: string };
}

// Hora Extra
export type EstadoHoraExtra = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';
export interface HoraExtra {
  id: number;
  operacion_id: number;
  empleado_id: number;
  tipo_hora_extra_id: number;
  codigo?: string;
  porcentaje_recargo?: string;
  paga_hora_completa?: boolean;
  cantidad_horas: string;
  valor_hora_base?: string;
  valor_calculado?: string;
  estado: EstadoHoraExtra;
  observacion?: string;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  tipoHoraExtra?: { id: number; codigo: string; nombre: string; porcentaje_recargo: string };
}

// ── §2 — Operaciones ────────────────────────────────────────────────────────

export const operacionesApi = {
  crear: (b: {
    fecha: string; hora_inicio?: string; hora_fin?: string | null;
    hubo_lluvia: boolean; cantidad_lluvia?: number | null; observaciones?: string | null;
  }) => post<{ message: string; data: Planilla }>('/operaciones', b),

  editar: (id: number, b: Partial<{
    fecha: string; hora_inicio: string; hora_fin: string | null;
    hubo_lluvia: boolean; cantidad_lluvia: number | null; observaciones: string | null;
  }>) => put<{ message: string; data: Planilla }>(`/operaciones/${id}`, b),

  indicadores: (p: { periodo?: PeriodoIndicadores; fecha_desde?: string; fecha_hasta?: string } = {}) =>
    get<{ data: Indicadores }>('/operaciones/indicadores', p as Record<string, unknown>),

  listar: (p?: { estado?: EstadoPlanilla; fecha_desde?: string; fecha_hasta?: string; per_page?: number; page?: number }) =>
    get<{ data: Planilla[]; meta: any }>('/operaciones', p as Record<string, unknown>),

  ver: (id: number) => get<{ data: Planilla }>(`/operaciones/${id}`),

  eliminar: (id: number) => del<{ message: string }>(`/operaciones/${id}`),

  resumen: (id: number) => get<{ data: Resumen }>(`/operaciones/${id}/resumen`),

  aprobar: (id: number) => post<{ message: string; data: Planilla }>(`/operaciones/${id}/aprobar`),
};

// ── §3.1 — Cosechas ─────────────────────────────────────────────────────────

export const cosechasApi = {
  crear: (operacionId: number, b: {
    lote_id: number; sublote_id?: number; gajos_reportados: number;
    peso_confirmado?: number | null; cuadrilla: { empleado_id: number }[];
  }) => post<{ message: string; data: Cosecha }>(`/operaciones/${operacionId}/cosechas`, b),

  editar: (id: number, b: Partial<{
    gajos_reportados: number; gajos_reconteo: number;
    peso_confirmado: number | null; cuadrilla: { empleado_id: number }[];
  }>) => put<{ message: string; data: Cosecha }>(`/cosechas/${id}`, b),

  eliminar: (id: number) => del<{ message: string }>(`/cosechas/${id}`),
};

// ── §3.2 — Jornales unificados ───────────────────────────────────────────────

interface JornalBase { categoria: 'PALMA'; empleado_id: number; lote_id?: number | null; sublote_id?: number | null; }
export interface PlateoPayload  extends JornalBase { tipo: 'PLATEO';        cantidad_palmas: number; }
export interface PodaPayload    extends JornalBase { tipo: 'PODA';          cantidad_palmas: number; }
export interface FertPayload    extends JornalBase { tipo: 'FERTILIZACION'; cantidad_palmas: number; insumo_id: number; gramos_por_palma: number; }
export interface SanidadPayload extends JornalBase { tipo: 'SANIDAD';       descripcion: string; }
export interface OtrosPayload   extends JornalBase { tipo: 'OTROS';         nombre_trabajo: string; descripcion: string; }
export interface FincaPayload { categoria: 'FINCA'; labor_id: number; empleado_id: number; ubicacion?: string; observacion?: string; }

export type JornalPayload = PlateoPayload | PodaPayload | FertPayload | SanidadPayload | OtrosPayload | FincaPayload;

export const jornalesApi = {
  crear: (operacionId: number, b: JornalPayload) =>
    post<{ message: string; data: Jornal }>(`/operaciones/${operacionId}/jornales`, b),

  editar: (id: number, b: Partial<JornalPayload>) =>
    put<{ message: string; data: Jornal }>(`/jornales/${id}`, b),

  eliminar: (id: number) => del<{ message: string }>(`/jornales/${id}`),
};

// ── §4 — Horas Extras ───────────────────────────────────────────────────────

export const horasExtraApi = {
  crear: (operacionId: number, b: {
    empleado_id: number; tipo_hora_extra_id: number;
    cantidad_horas: number; observacion?: string;
  }) => post<{ message: string; data: HoraExtra }>(`/operaciones/${operacionId}/horas-extra`, b),

  editar: (id: number, b: Partial<{
    empleado_id: number; tipo_hora_extra_id: number;
    cantidad_horas: number; observacion: string;
  }>) => put<{ message: string; data: HoraExtra }>(`/horas-extra/${id}`, b),

  eliminar: (id: number) => del<{ message: string }>(`/horas-extra/${id}`),

  aprobar: (id: number) => post<{ message: string; data: HoraExtra }>(`/horas-extra/${id}/aprobar`),

  rechazar: (id: number, motivo: string) =>
    post<{ message: string; data: HoraExtra }>(`/horas-extra/${id}/rechazar`, { motivo_rechazo: motivo }),
};

// ── §5 — Ausencias ──────────────────────────────────────────────────────────

export const ausenciasApi = {
  crear: (operacionId: number, b: {
    empleado_id: number; motivo_ausencia_id: number;
    motivo?: string; fecha_fin?: string;
  }) => post<{ message: string; data: Ausencia }>(`/operaciones/${operacionId}/ausencias`, b),

  editar: (id: number, b: Partial<{
    empleado_id: number; motivo_ausencia_id: number; motivo: string;
    fecha_fin: string; entidad: string; numero_radicado: string; porcentaje_pago: number;
  }>) => put<{ message: string; data: Ausencia }>(`/ausencias/${id}`, b),

  eliminar: (id: number) => del<{ message: string }>(`/ausencias/${id}`),

  aprobar: (id: number) => post<{ message: string; data: Ausencia }>(`/ausencias/${id}/aprobar`),

  rechazar: (id: number, motivo: string) =>
    post<{ message: string; data: Ausencia }>(`/ausencias/${id}/rechazar`, { motivo_rechazo: motivo }),

  subirDocumento: (id: number, archivo: File) => {
    const fd = new FormData();
    fd.append('documento', archivo);
    return postForm<{ message: string; data: Ausencia }>(`/ausencias/${id}/documento`, fd);
  },
};

// ── §6 — Selects (dropdowns del wizard) ─────────────────────────────────────

export const selectsApi = {
  colaboradores: (p?: { modalidad_pago?: string; predio_id?: number }) =>
    get<{ data: any[] }>('/colaboradores/select', p as Record<string, unknown>),

  lotes: (p?: { predio_id?: number }) =>
    get<{ data: any[] }>('/lotes/select', p as Record<string, unknown>),

  sublotes: (p: { lote_id: number }) =>
    get<{ data: any[] }>('/sublotes/select', p as Record<string, unknown>),

  insumos: () =>
    get<{ data: any[] }>('/insumos/select'),

  labores: () =>
    get<{ data: any[] }>('/labores/select'),

  motivosAusencia: () =>
    get<{ data: any[] }>('/motivos-ausencia/select'),

  tiposHoraExtra: () =>
    get<{ data: any[] }>('/tipos-hora-extra/select'),
};

// ── Códigos de error ─────────────────────────────────────────────────────────

export const ErrorCodes = {
  OPERACION_APROBADA:    'OPERACION_APROBADA',
  OPERACION_CON_HIJOS:   'OPERACION_CON_HIJOS',
  COSECHA_EN_VIAJE:      'COSECHA_EN_VIAJE',
  CALC_ERROR:            'CALC_ERROR',
  AUSENCIA_LIQUIDADA:    'AUSENCIA_LIQUIDADA',
  HORA_EXTRA_LIQUIDADA:  'HORA_EXTRA_LIQUIDADA',
  PERMISSION_DENIED:     'PERMISSION_DENIED',
} as const;