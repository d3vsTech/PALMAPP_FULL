/**
 * API — Plantación
 * Base: /api/v1/tenant
 * Cubre: Predios, Lotes, Sublotes, Palmas, Líneas
 */
import { requestConToken, fetchConToken } from './request';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function tkn(): string | null { return localStorage.getItem('palmapp_token'); }

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
async function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'POST', body: JSON.stringify(body) }, tkn());
}
async function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
async function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
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
  listar:   (p?: { search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/predios', p as any),
  ver:      (id: number) => get<{ data: any }>(`/predios/${id}`),
  resumen:  (id: number) => get<{ data: any }>(`/predios/${id}/resumen`),
  crear:    (b: { nombre: string; ubicacion: string; latitud?: number; longitud?: number; hectareas_totales?: number }) =>
    post<{ message: string; data: any }>('/predios', b),
  editar:   (id: number, b: Partial<{ nombre: string; ubicacion: string; latitud: number; longitud: number; hectareas_totales: number; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/predios/${id}`, b),
  eliminar: (id: number) => del<{ message: string }>(`/predios/${id}`),
};

// ─── Lotes ────────────────────────────────────────────────────────────────────
export const lotesApi = {
  semillas: () => get<{ data: any[] }>('/lotes/semillas'),
  listar:   (p?: { predio_id?: number; search?: string; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/lotes', p as any),
  ver:      (id: number) => get<{ data: any }>(`/lotes/${id}`),
  crear:    (b: { predio_id: number; nombre: string; fecha_siembra?: string; hectareas_sembradas?: number; semillas_ids?: number[] }) =>
    post<{ message: string; data: any }>('/lotes', b),
  editar:   (id: number, b: Partial<{ nombre: string; fecha_siembra: string; hectareas_sembradas: number; semillas_ids: number[]; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/lotes/${id}`, b),
  eliminar: (id: number) => del<{ message: string }>(`/lotes/${id}`),
};

// ─── Sublotes ─────────────────────────────────────────────────────────────────
export const sublotesApi = {
  listar:   (p?: { lote_id?: number; search?: string; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/sublotes', p as any),
  ver:      (id: number) => get<{ data: any }>(`/sublotes/${id}`),
  crear:    (b: { lote_id: number; nombre: string; cantidad_palmas?: number }) =>
    post<{ message: string; data: any }>('/sublotes', b),
  editar:   (id: number, b: Partial<{ nombre: string; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/sublotes/${id}`, b),
  eliminar: (id: number) => del<{ message: string }>(`/sublotes/${id}`),
};

// ─── Palmas ───────────────────────────────────────────────────────────────────
export const palmasApi = {
  listar:   (p?: { sublote_id?: number; search?: string; estado?: string; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/palmas', p as any),
  ver:      (id: number) => get<{ data: any }>(`/palmas/${id}`),
  crear:    (b: { sublote_id: number; cantidad: number; estado?: string }) =>
    post<{ message: string; data: any }>('/palmas', b),
  editar:   (id: number, b: Partial<{ codigo: string; estado: string; fecha_siembra: string; observaciones: string }>) =>
    put<{ message: string; data: any }>(`/palmas/${id}`, b),
  eliminar: (ids: number[]) =>
    requestConToken<{ message: string }>('/api/v1/tenant/palmas', { method: 'DELETE', body: JSON.stringify({ ids }) }, tkn()),
};

// ─── Líneas ───────────────────────────────────────────────────────────────────
export const lineasApi = {
  listar:   (p?: { sublote_id?: number }) => get<{ data: any[] }>('/lineas', p as any),
  ver:      (id: number) => get<{ data: any }>(`/lineas/${id}`),
  crear:    (b: { sublote_id: number; nombre: string; palmas_ids?: number[] }) =>
    post<{ message: string; data: any }>('/lineas', b),
  editar:   (id: number, b: Partial<{ nombre: string }>) =>
    put<{ message: string; data: any }>(`/lineas/${id}`, b),
  eliminar: (id: number) => del<{ message: string }>(`/lineas/${id}`),
};