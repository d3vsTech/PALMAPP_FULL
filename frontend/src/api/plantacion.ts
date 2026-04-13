/**
 * API — Plantación
 * Base: /api/v1/tenant
 * Cubre: Predios, Lotes, Sublotes, Palmas, Líneas
 * + Departamentos y Municipios
 */
import { requestConToken, fetchConToken } from './request';

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

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
async function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'POST', body: JSON.stringify(body) }, tkn());
}
async function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
async function del<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'DELETE',
    ...(body ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}

// ─── Departamentos / Municipios ───────────────────────────────────────────────
export const getDepartamentos = () =>
  requestConToken<{ data: { codigo: string; nombre: string }[] }>(
    '/api/v1/auth/departamentos', { method: 'GET' }, tkn()
  );

export const getMunicipios = (codigo: string) =>
  requestConToken<{ data: { codigo: string; nombre: string }[]; departamento: string }>(
    `/api/v1/auth/departamentos/${codigo}/municipios`, { method: 'GET' }, tkn()
  );

// ─── Predios ──────────────────────────────────────────────────────────────────
export const prediosApi = {
  listar: (p?: { search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/predios', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/predios/${id}`),

  /** Jerarquía completa: lotes → sublotes + totales. Usar para el panel Resumen del wizard. */
  resumen: (id: number) =>
    get<{ data: any }>(`/predios/${id}/resumen`),

  crear: (b: {
    nombre: string;
    ubicacion: string;
    latitud?: number;
    longitud?: number;
    hectareas_totales?: number;
  }) => post<{ message: string; data: any }>('/predios', b),

  editar: (id: number, b: Partial<{
    nombre: string;
    ubicacion: string;
    latitud: number;
    longitud: number;
    hectareas_totales: number;
    estado: boolean;
  }>) => put<{ message: string; data: any }>(`/predios/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/predios/${id}`),
};

// ─── Lotes ────────────────────────────────────────────────────────────────────
export const lotesApi = {
  /** Semillas activas para el select al crear/editar lote */
  semillas: () =>
    get<{ data: { id: number; tipo: string; nombre: string }[] }>('/lotes/semillas'),

  listar: (p?: { search?: string; predio_id?: number; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/lotes', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/lotes/${id}`),

  crear: (b: {
    predio_id: number;
    nombre: string;
    fecha_siembra?: string;
    hectareas_sembradas?: number;
    semillas_ids?: number[];
  }) => post<{ message: string; data: any }>('/lotes', b),

  editar: (id: number, b: Partial<{
    nombre: string;
    fecha_siembra: string;
    hectareas_sembradas: number;
    semillas_ids: number[];
    estado: boolean;
  }>) => put<{ message: string; data: any }>(`/lotes/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/lotes/${id}`),
};

// ─── Sublotes ─────────────────────────────────────────────────────────────────
export const sublotesApi = {
  listar: (p?: { search?: string; lote_id?: number; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/sublotes', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/sublotes/${id}`),

  crear: (b: {
    lote_id: number;
    nombre: string;
    cantidad_palmas?: number;
  }) => post<{ message: string; data: any }>('/sublotes', b),

  editar: (id: number, b: Partial<{
    lote_id: number;
    nombre: string;
    estado: boolean;
    cantidad_palmas: number; // mayor = crea palmas, menor = elimina las de mayor código
  }>) => put<{ message: string; data: any }>(`/sublotes/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/sublotes/${id}`),
};

// ─── Palmas ───────────────────────────────────────────────────────────────────
export const palmasApi = {
  listar: (p?: {
    sublote_id?: number;
    linea_id?: number;
    sin_linea?: boolean;
    search?: string;
    estado?: boolean;
    per_page?: number;
    page?: number;
  }) => get<{ data: any[]; meta: any }>('/palmas', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/palmas/${id}`),

  /**
   * Crear palmas.
   * Si el sublote tiene líneas, `linea_id` es obligatorio.
   */
  crear: (b: {
    sublote_id: number;
    cantidad_palmas: number;
    linea_id?: number;
  }) => post<{ message: string; data: any[] }>('/palmas', b),

  editar: (id: number, b: Partial<{
    descripcion: string;
    estado: boolean;
    linea_id: number | null; // null = desasignar de línea
  }>) => put<{ message: string; data: any }>(`/palmas/${id}`, b),

  /** Eliminación masiva. Actualiza automáticamente cantidad_palmas del sublote/línea. */
  eliminar: (palmas_ids: number[]) =>
    del<{ message: string }>('/palmas/masivo', { palmas_ids }),
};

// ─── Líneas ───────────────────────────────────────────────────────────────────
export const lineasApi = {
  listar: (p?: { sublote_id?: number; search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta?: any }>('/lineas', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/lineas/${id}`),

  /**
   * Crear línea.
   * `numero` es obligatorio y debe ser único por sublote.
   */
  crear: (b: {
    sublote_id: number;
    numero: number;
    cantidad_palmas?: number;
  }) => post<{ message: string; data: any }>('/lineas', b),

  editar: (id: number, b: Partial<{
    numero: number;
    cantidad_palmas: number;
    estado: boolean;
  }>) => put<{ message: string; data: any }>(`/lineas/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/lineas/${id}`),
};