/**
 * operaciones.ts
 * Servicio API para el módulo Operaciones (Planilla del Día).
 *
 * Alcance:
 *  §2 — Paso 1 Información General (CRUD + indicadores + listado)
 *  §3 — Paso 2 Labores de Palma (cosechas + jornales unificados)
 *  §4 — Resumen del panel derecho
 *  §5 — Aprobación de planilla
 *  §6 — Endpoints /select para los dropdowns del wizard
 *
 * Base URL: {host}/api/v1/tenant
 * Auth: Authorization Bearer + X-Tenant-Id inyectados por requestConToken.
 */
import { requestConToken } from './request';

function tkn(): string | null { return localStorage.getItem('palmapp_token'); }

/** Convierte un objeto a ?query omitiendo undefined/null/''. */
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

// ────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────

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
}

export interface Indicadores {
  periodo: {
    tipo: PeriodoIndicadores;
    fecha_desde: string;
    fecha_hasta: string;
  };
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
    cosecha: number;
    plateo: number;
    poda: number;
    fertilizacion: number;
    sanidad: number;
    otros: number;
    auxiliares: number;
  };
}

// §3.1 Cosecha
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

// §3.2 Jornal unificado (PALMA + tipo discriminador)
export type TipoJornalPalma = 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';

export interface Jornal {
  id: number;
  operacion_id: number;
  empleado_id: number;
  categoria: 'PALMA' | 'FINCA';
  tipo: TipoJornalPalma | string;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number | null;
  insumo_id?: number | null;
  gramos_por_palma?: number | null;
  nombre_trabajo?: string | null;
  descripcion?: string | null;
  valor_unitario?: string | null;
  valor_total?: string | null;
  estado: boolean;
  empleado?: { id: number; primer_nombre: string; primer_apellido: string };
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
  insumo?: { id: number; nombre: string };
}

// ────────────────────────────────────────────────────────────────────────
// §2 — Paso 1 · Información General
// ────────────────────────────────────────────────────────────────────────

export const operacionesApi = {
  /** §2.1 POST /operaciones — crea planilla BORRADOR */
  crear: (b: {
    fecha: string;
    hora_inicio?: string;
    hora_fin?: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia?: number | null;
    observaciones?: string | null;
  }) => post<{ message: string; data: Planilla }>('/operaciones', b),

  /** §2.2 PUT /operaciones/{id} — edita info general */
  editar: (id: number, b: Partial<{
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia: number | null;
    observaciones: string | null;
  }>) => put<{ message: string; data: Planilla }>(`/operaciones/${id}`, b),

  /** §2.2.1 GET /operaciones/indicadores?periodo=... */
  indicadores: (p: {
    periodo?: PeriodoIndicadores;
    fecha_desde?: string;
    fecha_hasta?: string;
  } = {}) => get<{ data: Indicadores }>('/operaciones/indicadores', p),

  /** §2.3 GET /operaciones — listado paginado con agregados */
  listar: (p?: {
    estado?: EstadoPlanilla;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  }) => get<{ data: Planilla[]; meta: any }>('/operaciones', p),

  /** §2.4 GET /operaciones/{id} — detalle con relaciones */
  ver: (id: number) => get<{ data: Planilla }>(`/operaciones/${id}`),

  /** §2.5 DELETE /operaciones/{id} — solo BORRADOR sin hijos */
  eliminar: (id: number) => del<{ message: string }>(`/operaciones/${id}`),

  /** §4 GET /operaciones/{id}/resumen — panel derecho del wizard */
  resumen: (id: number) => get<{ data: Resumen }>(`/operaciones/${id}/resumen`),

  /** §5 POST /operaciones/{id}/aprobar — deja la planilla inmutable */
  aprobar: (id: number) => post<{ message: string; data: Planilla }>(`/operaciones/${id}/aprobar`),
};

// ────────────────────────────────────────────────────────────────────────
// §3.1 — Cosechas (cabecera + cuadrilla)
// ────────────────────────────────────────────────────────────────────────

export const cosechasApi = {
  /** §3.1 POST /operaciones/{id}/cosechas */
  crear: (operacionId: number, b: {
    lote_id: number;
    sublote_id: number;
    gajos_reportados: number;
    peso_confirmado?: number | null;
    cuadrilla: { empleado_id: number }[];
  }) => post<{ message: string; data: Cosecha }>(`/operaciones/${operacionId}/cosechas`, b),

  /** §3.1 PUT /cosechas/{id} — recalcula valor_total si cambia peso_confirmado */
  editar: (id: number, b: Partial<{
    gajos_reportados: number;
    gajos_reconteo: number;
    peso_confirmado: number | null;
    cuadrilla: { empleado_id: number }[];
  }>) => put<{ message: string; data: Cosecha }>(`/cosechas/${id}`, b),

  /** §3.1 DELETE /cosechas/{id} — 409 COSECHA_EN_VIAJE si ya está en viaje */
  eliminar: (id: number) => del<{ message: string }>(`/cosechas/${id}`),
};

// ────────────────────────────────────────────────────────────────────────
// §3.2 — Jornales unificados (PLATEO/PODA/FERT/SANIDAD/OTROS)
// ────────────────────────────────────────────────────────────────────────

interface JornalBase {
  categoria: 'PALMA';
  empleado_id: number;
  lote_id?: number | null;
  sublote_id?: number | null;
}

export interface PlateoPayload  extends JornalBase { tipo: 'PLATEO';        cantidad_palmas: number; }
export interface PodaPayload    extends JornalBase { tipo: 'PODA';          cantidad_palmas: number; }
export interface FertPayload    extends JornalBase { tipo: 'FERTILIZACION'; cantidad_palmas: number; insumo_id: number; gramos_por_palma: number; }
export interface SanidadPayload extends JornalBase { tipo: 'SANIDAD';       descripcion: string; }
export interface OtrosPayload   extends JornalBase { tipo: 'OTROS';         nombre_trabajo: string; descripcion: string; }

export type JornalPayload =
  | PlateoPayload | PodaPayload | FertPayload | SanidadPayload | OtrosPayload;

export const jornalesApi = {
  /** §3.2 POST /operaciones/{id}/jornales — discriminado por categoria+tipo */
  crear: (operacionId: number, b: JornalPayload) =>
    post<{ message: string; data: Jornal }>(`/operaciones/${operacionId}/jornales`, b),

  /** §3.2 PUT /jornales/{id} — backend recalcula valores */
  editar: (id: number, b: Partial<JornalPayload>) =>
    put<{ message: string; data: Jornal }>(`/jornales/${id}`, b),

  /** §3.2 DELETE /jornales/{id} — 409 si planilla aprobada */
  eliminar: (id: number) => del<{ message: string }>(`/jornales/${id}`),
};

// ────────────────────────────────────────────────────────────────────────
// §6 — Selects (dropdowns del wizard)
// ────────────────────────────────────────────────────────────────────────

export const selectsApi = {
  /** GET /colaboradores/select */
  colaboradores: (p?: { modalidad_pago?: string; predio_id?: number; estado?: boolean }) =>
    get<{ data: any[] }>('/colaboradores/select', p),

  /** GET /lotes/select */
  lotes: (p?: { predio_id?: number; estado?: boolean }) =>
    get<{ data: any[] }>('/lotes/select', p),

  /** GET /sublotes/select?lote_id=X */
  sublotes: (p: { lote_id: number; estado?: boolean }) =>
    get<{ data: any[] }>('/sublotes/select', p),

  /** GET /insumos/select */
  insumos: (p?: { estado?: boolean }) =>
    get<{ data: any[] }>('/insumos/select', p),
};

// ────────────────────────────────────────────────────────────────────────
// Códigos de error del backend
// ────────────────────────────────────────────────────────────────────────

export const ErrorCodes = {
  OPERACION_APROBADA: 'OPERACION_APROBADA',
  OPERACION_CON_HIJOS: 'OPERACION_CON_HIJOS',
  COSECHA_EN_VIAJE:   'COSECHA_EN_VIAJE',
  CALC_ERROR:         'CALC_ERROR',
  PERMISSION_DENIED:  'PERMISSION_DENIED',
} as const;