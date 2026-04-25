/**
 * api/operaciones.ts
 * Módulo Operaciones (Planilla del Día) — contrato completo según API_OPERACIONES.md + API_HORAS_EXTRA.md
 * Base: /api/v1/tenant  · Auth: Authorization Bearer + X-Tenant-Id
 */
import { requestConToken } from './request';

// ─── helpers ────────────────────────────────────────────────────────────────

function tkn() { return localStorage.getItem('palmapp_token'); }

function qs(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${qs(params)}`, { method: 'GET' }, tkn());
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
}
function postForm<T>(path: string, fd: FormData): Promise<T> {
  const token  = tkn();
  const tenant = localStorage.getItem('palmapp_tenant_id');
  const headers: Record<string, string> = {};
  if (token)  headers['Authorization'] = `Bearer ${token}`;
  if (tenant) headers['X-Tenant-Id']   = tenant;
  return fetch(`/api/v1/tenant${path}`, { method: 'POST', headers, body: fd }).then(r => r.json());
}

// ─── tipos ───────────────────────────────────────────────────────────────────

export type EstadoPlanilla      = 'BORRADOR' | 'APROBADA';
export type PeriodoIndicadores  = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';
export type TipoJornalPalma     = 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';
export type EstadoAusencia      = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';
export type EstadoHoraExtra     = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';

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
  horas_extra?: {
    pendientes: number; aprobadas: number; rechazadas: number; liquidadas: number; total: number;
    horas_totales: string; valor_total: string;
  };
}

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
  sublote_id?: number | null;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado?: string | null;
  precio_cosecha?: string;
  promedio_kg_gajo?: string;
  valor_total?: string | null;
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
  cuadrilla: CosechaCuadrillaItem[];
}

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
  labor?: { id: number; nombre: string; valor_base?: string };
}

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
  motivo_rechazo?: string | null;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  motivo_ausencia?: { id: number; nombre: string; tipo_base?: string; requiere_soporte?: boolean };
}

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
  motivo_rechazo?: string | null;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  tipoHoraExtra?: { id: number; codigo: string; nombre: string; porcentaje_recargo: string };
}

/** Item del select de tipos de hora extra */
export interface TipoHoraExtraSelect {
  id: number;
  codigo: string;
  nombre: string;
  porcentaje_recargo: string;
  franja_horaria: string;
  aplica_festivo: boolean;
  es_extra: boolean;
  paga_hora_completa: boolean;
}

/** Item del select de motivos de ausencia */
export interface MotivoAusenciaSelect {
  id: number;
  nombre: string;
  tipo_base?: string;
  requiere_soporte?: boolean;
  es_remunerada?: boolean;
  afecta_nomina?: boolean;
  porcentaje_pago_default?: string;
}

/** Item del select de labores */
export interface LaborSelect {
  id: number;
  nombre: string;
  valor_base?: string;
}

/** Item del select de insumos */
export interface InsumoSelect {
  id: number;
  nombre: string;
}

// ─── §1 — Operaciones ────────────────────────────────────────────────────────

export const operacionesApi = {
  /** POST /operaciones — crea planilla BORRADOR (Paso 1) */
  crear: (b: {
    fecha: string;
    hora_inicio?: string;
    hora_fin?: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia?: number | null;
    observaciones?: string | null;
  }) => post<{ message: string; data: Planilla }>('/operaciones', b),

  /** PUT /operaciones/{id} — edita info general (solo BORRADOR) */
  editar: (id: number, b: Partial<{
    fecha: string; hora_inicio: string; hora_fin: string | null;
    hubo_lluvia: boolean; cantidad_lluvia: number | null; observaciones: string | null;
  }>) => put<{ message: string; data: Planilla }>(`/operaciones/${id}`, b),

  /** GET /operaciones/indicadores?periodo= */
  indicadores: (p: { periodo?: PeriodoIndicadores; fecha_desde?: string; fecha_hasta?: string } = {}) =>
    get<{ data: Indicadores }>('/operaciones/indicadores', p as Record<string, unknown>),

  /** GET /operaciones — listado paginado */
  listar: (p?: { estado?: EstadoPlanilla; fecha_desde?: string; fecha_hasta?: string; per_page?: number; page?: number }) =>
    get<{ data: Planilla[]; meta: any }>('/operaciones', p as Record<string, unknown>),

  /** GET /operaciones/{id} — detalle completo con relaciones */
  ver: (id: number) => get<{ data: Planilla }>(`/operaciones/${id}`),

  /** DELETE /operaciones/{id} — solo BORRADOR sin hijos */
  eliminar: (id: number) => del<{ message: string }>(`/operaciones/${id}`),

  /** GET /operaciones/{id}/resumen — panel derecho del wizard */
  resumen: (id: number) => get<{ data: Resumen }>(`/operaciones/${id}/resumen`),

  /** POST /operaciones/{id}/aprobar — cierra la planilla */
  aprobar: (id: number) => post<{ message: string; data: Planilla }>(`/operaciones/${id}/aprobar`),
};

// ─── §2 — Cosechas ───────────────────────────────────────────────────────────

export const cosechasApi = {
  /** POST /operaciones/{id}/cosechas */
  crear: (operacionId: number, b: {
    lote_id: number;
    sublote_id?: number | null;
    gajos_reportados: number;
    peso_confirmado?: number | null;
    cuadrilla: { empleado_id: number }[];
  }) => post<{ message: string; data: Cosecha }>(`/operaciones/${operacionId}/cosechas`, b),

  /** PUT /cosechas/{id} */
  editar: (id: number, b: Partial<{
    gajos_reportados: number; gajos_reconteo: number;
    peso_confirmado: number | null; cuadrilla: { empleado_id: number }[];
  }>) => put<{ message: string; data: Cosecha }>(`/cosechas/${id}`, b),

  /** DELETE /cosechas/{id} — falla con 409 COSECHA_EN_VIAJE si está en un viaje */
  eliminar: (id: number) => del<{ message: string }>(`/cosechas/${id}`),
};

// ─── §3 — Jornales (PALMA + FINCA) ──────────────────────────────────────────

interface JornalBase { categoria: 'PALMA'; empleado_id: number; lote_id?: number | null; sublote_id?: number | null; }
export interface PlateoPayload  extends JornalBase { tipo: 'PLATEO';        cantidad_palmas: number; }
export interface PodaPayload    extends JornalBase { tipo: 'PODA';          cantidad_palmas: number; }
export interface FertPayload    extends JornalBase { tipo: 'FERTILIZACION'; cantidad_palmas: number; insumo_id: number; gramos_por_palma: number; }
export interface SanidadPayload extends JornalBase { tipo: 'SANIDAD';       descripcion: string; }
export interface OtrosPayload   extends JornalBase { tipo: 'OTROS';         nombre_trabajo: string; descripcion: string; }
export interface FincaPayload   { categoria: 'FINCA'; labor_id: number; empleado_id: number; ubicacion?: string; observacion?: string; }
export type JornalPayload = PlateoPayload | PodaPayload | FertPayload | SanidadPayload | OtrosPayload | FincaPayload;

export const jornalesApi = {
  /** POST /operaciones/{id}/jornales */
  crear: (operacionId: number, b: JornalPayload) =>
    post<{ message: string; data: Jornal }>(`/operaciones/${operacionId}/jornales`, b),

  /** PUT /jornales/{id} */
  editar: (id: number, b: Partial<JornalPayload>) =>
    put<{ message: string; data: Jornal }>(`/jornales/${id}`, b),

  /** DELETE /jornales/{id} */
  eliminar: (id: number) => del<{ message: string }>(`/jornales/${id}`),
};

// ─── §4 — Horas Extras ───────────────────────────────────────────────────────

export const horasExtraApi = {
  /** POST /operaciones/{id}/horas-extra (Paso 4) */
  crear: (operacionId: number, b: {
    empleado_id: number;
    tipo_hora_extra_id: number;
    cantidad_horas: number;
    observacion?: string;
  }) => post<{ message: string; data: HoraExtra }>(`/operaciones/${operacionId}/horas-extra`, b),

  /** PUT /horas-extra/{id} — solo PENDIENTE y planilla no aprobada */
  editar: (id: number, b: Partial<{
    empleado_id: number; tipo_hora_extra_id: number;
    cantidad_horas: number; observacion: string;
  }>) => put<{ message: string; data: HoraExtra }>(`/horas-extra/${id}`, b),

  /** DELETE /horas-extra/{id} */
  eliminar: (id: number) => del<{ message: string }>(`/horas-extra/${id}`),

  /** POST /horas-extra/{id}/aprobar — funciona incluso con planilla APROBADA */
  aprobar: (id: number) => post<{ message: string; data: HoraExtra }>(`/horas-extra/${id}/aprobar`),

  /** POST /horas-extra/{id}/rechazar */
  rechazar: (id: number, motivo: string) =>
    post<{ message: string; data: HoraExtra }>(`/horas-extra/${id}/rechazar`, { motivo_rechazo: motivo }),
};

// ─── §5 — Ausencias ──────────────────────────────────────────────────────────

export const ausenciasApi = {
  /** POST /operaciones/{id}/ausencias (Paso 5) */
  crear: (operacionId: number, b: {
    empleado_id: number;
    motivo_ausencia_id: number;
    motivo?: string;
    fecha_fin?: string;
    entidad?: string;
    numero_radicado?: string;
    porcentaje_pago?: number;
  }) => post<{ message: string; data: Ausencia }>(`/operaciones/${operacionId}/ausencias`, b),

  /** PUT /ausencias/{id} */
  editar: (id: number, b: Partial<{
    empleado_id: number; motivo_ausencia_id: number; motivo: string;
    fecha_fin: string; entidad: string; numero_radicado: string; porcentaje_pago: number;
  }>) => put<{ message: string; data: Ausencia }>(`/ausencias/${id}`, b),

  /** DELETE /ausencias/{id} */
  eliminar: (id: number) => del<{ message: string }>(`/ausencias/${id}`),

  /** POST /ausencias/{id}/aprobar — funciona incluso con planilla APROBADA */
  aprobar: (id: number) => post<{ message: string; data: Ausencia }>(`/ausencias/${id}/aprobar`),

  /** POST /ausencias/{id}/rechazar */
  rechazar: (id: number, motivo: string) =>
    post<{ message: string; data: Ausencia }>(`/ausencias/${id}/rechazar`, { motivo_rechazo: motivo }),

  /** POST /ausencias/{id}/documento — multipart, funciona incluso con planilla APROBADA */
  subirDocumento: (id: number, archivo: File) => {
    const fd = new FormData();
    fd.append('documento', archivo);
    return postForm<{ message: string; data: Ausencia }>(`/ausencias/${id}/documento`, fd);
  },
};

// ─── §6 — Selects (dropdowns del wizard) ─────────────────────────────────────

export const selectsApi = {
  /** GET /colaboradores/select */
  colaboradores: (p?: { modalidad_pago?: string; predio_id?: number }) =>
    get<{ data: any[] }>('/colaboradores/select', p as Record<string, unknown>),

  /** GET /lotes/select */
  lotes: (p?: { predio_id?: number }) =>
    get<{ data: any[] }>('/lotes/select', p as Record<string, unknown>),

  /** GET /sublotes/select?lote_id= */
  sublotes: (p: { lote_id: number }) =>
    get<{ data: any[] }>('/sublotes/select', p as Record<string, unknown>),

  /** GET /insumos/select — fertilizantes */
  insumos: () => get<{ data: InsumoSelect[] }>('/insumos/select'),

  /** GET /labores/select — labores de finca (incluye valor_base) */
  labores: () => get<{ data: LaborSelect[] }>('/labores/select'),

  /** GET /motivos-ausencia/select */
  motivosAusencia: () => get<{ data: MotivoAusenciaSelect[] }>('/motivos-ausencia/select'),

  /** GET /tipos-hora-extra/select — 7 tipos legales colombianos */
  tiposHoraExtra: () => get<{ data: TipoHoraExtraSelect[] }>('/tipos-hora-extra/select'),
};

// ─── Códigos de error ─────────────────────────────────────────────────────────

export const ErrorCodes = {
  OPERACION_APROBADA:          'OPERACION_APROBADA',
  OPERACION_CON_HIJOS:         'OPERACION_CON_HIJOS',
  COSECHA_EN_VIAJE:            'COSECHA_EN_VIAJE',
  CALC_ERROR:                  'CALC_ERROR',
  AUSENCIA_LIQUIDADA:          'AUSENCIA_LIQUIDADA',
  AUSENCIA_ESTADO_INVALIDO:    'AUSENCIA_ESTADO_INVALIDO',
  HORA_EXTRA_LIQUIDADA:        'HORA_EXTRA_LIQUIDADA',
  HORA_EXTRA_ESTADO_INVALIDO:  'HORA_EXTRA_ESTADO_INVALIDO',
  TIPO_HORA_EXTRA_CON_REGISTROS: 'TIPO_HORA_EXTRA_CON_REGISTROS',
  PERMISSION_DENIED:           'PERMISSION_DENIED',
} as const;