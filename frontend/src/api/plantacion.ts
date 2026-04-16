/**
 * plantacion.ts
 * Cubre todos los endpoints del API Plantación:
 * §1 Predios (1.1-1.6) · §2 Lotes (2.0-2.5) · §3 Sublotes (3.1-3.5)
 * §4 Palmas (4.1-4.6)  · §5 Líneas (5.1-5.5)
 *
 * Base URL: /api/v1/tenant
 * Headers: Authorization: Bearer {token} · X-Tenant-Id: {id}
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

/** Convierte un objeto a query string, omitiendo undefined/null/'' */
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
function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'POST', body: JSON.stringify(body) }, tkn());
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
function del<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}

// ─── Departamentos / Municipios ─────────────────────────────────────────────
export const getDepartamentos = () =>
  requestConToken<{ data: { codigo: string; nombre: string }[] }>(
    '/api/v1/auth/departamentos', { method: 'GET' }, tkn());
export const getMunicipios = (codigo: string) =>
  requestConToken<{ data: { codigo: string; nombre: string }[] }>(
    `/api/v1/auth/departamentos/${codigo}/municipios`, { method: 'GET' }, tkn());

// ──────────────────────────────────────────────────────────────────────────────
// §1. PREDIOS
// ──────────────────────────────────────────────────────────────────────────────

/** §1.1 GET /predios — respuesta paginada, incluye lotes_count y palmas_count */
/** §1.2 GET /predios/{id} — incluye lotes[] con sublotes_count */
/** §1.3 POST /predios — campos: nombre*, ubicacion*, latitud?, longitud?, hectareas_totales? */
/** §1.4 PUT /predios/{id} — todos opcionales + estado? */
/** §1.5 DELETE /predios/{id} — recursivo: elimina lotes + sublotes + palmas */
/** §1.6 GET /predios/{id}/resumen — jerarquía completa para panel wizard */
export const prediosApi = {
  listar: (p?: { search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/predios', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/predios/${id}`),

  resumen: (id: number) =>
    get<{ data: any }>(`/predios/${id}/resumen`),

  crear: (b: { nombre: string; ubicacion: string; latitud?: number; longitud?: number; hectareas_totales?: number }) =>
    post<{ message: string; data: any }>('/predios', b),

  editar: (id: number, b: Partial<{ nombre: string; ubicacion: string; latitud: number; longitud: number; hectareas_totales: number; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/predios/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/predios/${id}`),
};

// ──────────────────────────────────────────────────────────────────────────────
// §2. LOTES
// ──────────────────────────────────────────────────────────────────────────────

/** §2.0 GET /lotes/semillas — id, tipo, nombre */
/** §2.1 GET /lotes — predio_id param, sublotes_count en respuesta */
/** §2.2 GET /lotes/{id} — incluye sublotes[] y semillas[] */
/** §2.3 POST /lotes — semillas_ids: number[] (IDs, NO strings) */
/** §2.4 PUT /lotes/{id} — semillas_ids reemplaza todas; [] elimina todas */
/** §2.5 DELETE /lotes/{id} — recursivo */
export const lotesApi = {
  semillas: () =>
    get<{ data: { id: number; tipo: string; nombre: string }[] }>('/lotes/semillas'),

  listar: (p?: { search?: string; predio_id?: number; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/lotes', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/lotes/${id}`),

  crear: (b: { predio_id: number; nombre: string; fecha_siembra?: string; hectareas_sembradas?: number; semillas_ids?: number[] }) =>
    post<{ message: string; data: any }>('/lotes', b),

  editar: (id: number, b: Partial<{ nombre: string; fecha_siembra: string; hectareas_sembradas: number; semillas_ids: number[]; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/lotes/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/lotes/${id}`),
};

// ──────────────────────────────────────────────────────────────────────────────
// §3. SUBLOTES
// ──────────────────────────────────────────────────────────────────────────────

/** §3.3 POST /sublotes y §3.4 PUT /sublotes/{id}:
 *  - cantidad_palmas <= 5000 → sync (201, sin palmas_async)
 *  - cantidad_palmas > 5000  → async (201 con palmas_async:true y batch_id)
 *  - PUT con batch activo    → 409 {code: BATCH_EN_CURSO}
 */
export interface SubloteResponse {
  message: string;
  data: any;
  palmas_async?: boolean;
  batch_id?: string;
}

export const sublotesApi = {
  listar: (p?: { search?: string; lote_id?: number; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/sublotes', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/sublotes/${id}`),

  crear: (b: { lote_id: number; nombre: string; cantidad_palmas?: number }) =>
    post<SubloteResponse>('/sublotes', b),

  editar: (id: number, b: Partial<{ lote_id: number; nombre: string; estado: boolean; cantidad_palmas: number }>) =>
    put<SubloteResponse>(`/sublotes/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/sublotes/${id}`),
};

// ──────────────────────────────────────────────────────────────────────────────
// §4. PALMAS
// ──────────────────────────────────────────────────────────────────────────────

/** §4.3 POST /palmas respuesta sync */
export interface PalmasSyncResponse {
  message: string;
  async: false;
  cantidad_creada: number;
  sublote_id: number;
  linea_id: number | null;
}

/** §4.3 POST /palmas respuesta async */
export interface PalmasAsyncResponse {
  message: string;
  async: true;
  batch_id: string;
  sublote_id: number;
  linea_id: number | null;
  cantidad: number;
}

export type PalmasCreateResponse = PalmasSyncResponse | PalmasAsyncResponse;

/** §4.6 Estado de batch */
export interface BatchStatus {
  id: string;
  name: string;
  total_jobs: number;
  pending_jobs: number;
  failed_jobs: number;
  processed_jobs: number;
  progress: number;     // 0-100
  finished: boolean;
  cancelled: boolean;
  has_failures: boolean;
  created_at: number;
  finished_at: number | null;
}

export const palmasApi = {
  /**
   * §4.1 GET /palmas — SIEMPRE paginada (default per_page=50)
   * sin_linea es un FLAG: se envía como sin_linea=1 cuando true
   * meta: { current_page, last_page, per_page, total }
   */
  listar: (p?: {
    sublote_id?: number;
    linea_id?: number;
    sin_linea?: boolean;
    search?: string;
    estado?: boolean;
    per_page?: number;
    page?: number;
  }) => {
    const params: Record<string, unknown> = { ...p };
    if (p?.sin_linea) params.sin_linea = '1';
    else delete params.sin_linea;
    return get<{ data: any[]; meta: any }>('/palmas', params);
  },

  /** §4.2 GET /palmas/{id} */
  ver: (id: number) =>
    get<{ data: any }>(`/palmas/${id}`),

  /**
   * §4.3 POST /palmas
   * <= 5000 → 201 sync (async:false, cantidad_creada)
   * > 5000  → 202 async (async:true, batch_id)
   * linea_id obligatorio si el sublote tiene líneas
   */
  crear: (b: { sublote_id: number; cantidad_palmas: number; linea_id?: number | null }) =>
    post<PalmasCreateResponse>('/palmas', b),

  /** §4.4 PUT /palmas/{id} — descripcion, estado, linea_id */
  editar: (id: number, b: Partial<{ descripcion: string; estado: boolean; linea_id: number | null }>) =>
    put<{ message: string; data: any }>(`/palmas/${id}`, b),

  /** §4.5 DELETE /palmas/masivo — body: { palmas_ids: number[] } */
  eliminar: (palmas_ids: number[]) =>
    del<{ message: string }>('/palmas/masivo', { palmas_ids }),

  /** §4.6 GET /palmas/batch/{batchId} — polling de estado */
  getBatch: (batchId: string) =>
    get<{ data: BatchStatus }>(`/palmas/batch/${batchId}`),
};

// ──────────────────────────────────────────────────────────────────────────────
// §5. LÍNEAS
// ──────────────────────────────────────────────────────────────────────────────

/** §5. Líneas — metadata organizacional por sublote
 *  - numero: único por sublote (≥1)
 *  - cantidad_palmas: teórico (palmas_count = real asignadas)
 *  - §5.5 DELETE: palmas quedan con linea_id=null, NO se eliminan
 */
export const lineasApi = {
  listar: (p?: { sublote_id?: number; search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta?: any }>('/lineas', p as any),

  ver: (id: number) =>
    get<{ data: any }>(`/lineas/${id}`),

  crear: (b: { sublote_id: number; numero: number; cantidad_palmas?: number }) =>
    post<{ message: string; data: any }>('/lineas', b),

  editar: (id: number, b: Partial<{ numero: number; cantidad_palmas: number; estado: boolean }>) =>
    put<{ message: string; data: any }>(`/lineas/${id}`, b),

  eliminar: (id: number) =>
    del<{ message: string }>(`/lineas/${id}`),
};