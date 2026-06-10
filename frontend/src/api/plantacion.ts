/**
 * plantacion.ts
 * Cubre todos los endpoints del API Plantación:
 * §1 Predios   (1.1-1.7)  — incluye wizard-init bundle
 * §2 Lotes     (2.0-2.5)  — incluye /lotes/select y /lotes/semillas
 * §3 Sublotes  (3.0-3.5)  — incluye /sublotes/select
 * §4 Palmas    (4.1-4.7)  — sync/async + batch polling + asignar-linea masivo
 * §5 Líneas    (5.1-5.5)
 *
 * Base URL:  /api/v1/tenant
 * Headers:   Authorization: Bearer {token} · X-Tenant-Id: {id}
 *
 * Notas:
 *  - `requestConToken` lee el token y X-Tenant-Id desde localStorage:
 *      palmapp_token, palmapp_tenant_id.
 *  - Endpoints `/select` son livianos (sin paginación) y los usan los dropdowns
 *    del wizard de Operaciones y Plantación.
 *  - `POST /palmas` y `POST /sublotes` pueden ser sync (201) o async (202)
 *    cuando `cantidad_palmas > 5000`. El frontend debe inspeccionar `async`/
 *    `palmas_async` y, si es true, hacer polling de `palmasApi.getBatch`.
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

/** §1.1   GET /predios — respuesta paginada, incluye lotes_count y palmas_count */
/** §1.1.1 GET /predios/totales — totales globales del tenant (cache 60s backend) */
/** §1.2   GET /predios/{id} — incluye lotes[] con sublotes_count */
/** §1.3   POST /predios — campos: nombre*, ubicacion*, latitud?, longitud?, hectareas_totales? */
/** §1.4   PUT /predios/{id} — todos opcionales + estado? */
/** §1.5   DELETE /predios/{id} — recursivo: elimina lotes + sublotes + palmas */
/** §1.6   GET /predios/{id}/resumen — jerarquía completa para panel wizard */
/** §1.7   GET /predios/{id}/wizard-init — bundle predio + lotes + sublotes + lineas + paramétricas */

/**
 * Totales globales del tenant — alimenta las tarjetas "Hectáreas / Lotes / Palmas"
 * del index `/plantacion`. Reemplaza el N+1 anterior que llamaba a
 * `/predios/{id}/resumen` por cada predio.
 *
 * Backend cachea 60s por tenant; se invalida automáticamente tras cualquier
 * mutación de predio, lote, sublote o palma (incluye jobs async de palmas).
 */
export interface PrediosTotales {
  predios_count: number;
  lotes_count: number;
  palmas_count: number;
  /** Decimal serializado, p.ej. "1105.00". Casteable a Number en el render. */
  hectareas_totales: string;
}
export interface PredioWizardLote {
  id: number;
  nombre: string;
  hectareas_sembradas: string | number | null;
  semillas: Array<{ id: number; nombre: string }>;
}
export interface PredioWizardSublote {
  id: number;
  nombre: string;
  cantidad_palmas: number;
  cantidad_lineas: number;
}
export interface PredioWizardLinea {
  id: number;
  numero: number;
  cantidad_palmas: number;
}
export interface PredioWizardInitResponse {
  predio: {
    id: number;
    nombre: string;
    ubicacion: string | null;
    hectareas_totales: string | number;
  } | null;
  lotes: PredioWizardLote[];
  /** Sublotes indexados por lote_id (string numérico) */
  sublotes: Record<string, PredioWizardSublote[]>;
  /** Líneas indexadas por sublote_id (string numérico) */
  lineas: Record<string, PredioWizardLinea[]>;
  parametricas: {
    semillas: Array<{ id: number; tipo: string; nombre: string }>;
    departamentos: Array<{ codigo: string; nombre: string }>;
  };
}

export const prediosApi = {
  listar: (p?: { search?: string; estado?: boolean; per_page?: number; page?: number }) =>
    get<{ data: any[]; meta: any }>('/predios', p as any),

  /** §1.1.1 Totales globales del tenant. Endpoint liviano para las tarjetas
   *  de resumen del index. Usar **junto** a `listar` (no lo reemplaza). */
  totales: () =>
    get<{ data: PrediosTotales }>('/predios/totales'),

  ver: (id: number) =>
    get<{ data: any }>(`/predios/${id}`),

  resumen: (id: number) =>
    get<{ data: any }>(`/predios/${id}/resumen`),

  /**
   * Bundle del wizard. Reemplaza 14+ requests (predio + lotes + sublotes + lineas
   * + semillas + departamentos) por 1 sola petición.
   * - id presente → modo edición.
   * - id ausente  → modo creación (predio/lotes/sublotes/lineas vienen vacíos).
   */
  wizardInit: (id?: number | string) =>
    get<{ data: PredioWizardInitResponse }>(
      id != null ? `/predios/${id}/wizard-init` : '/predios/wizard-init',
    ),

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

/** §2.0   GET /lotes/select — liviano, sin paginación, para dropdowns */
/** §2.0.1 GET /lotes/semillas — id, tipo, nombre (cache 15min backend) */
/** §2.1   GET /lotes — predio_id param, sublotes_count en respuesta */
/** §2.2   GET /lotes/{id} — incluye sublotes[] y semillas[] */
/** §2.3   POST /lotes — semillas_ids: number[] (IDs, NO strings) */
/** §2.4   PUT /lotes/{id} — semillas_ids reemplaza todas; [] elimina todas */
/** §2.5   DELETE /lotes/{id} — recursivo */
export const lotesApi = {
  /**
   * §2.0 GET /lotes/select
   * Endpoint liviano sin paginación. Permiso: `lotes.ver` o
   * `operaciones.crear|editar`. Devuelve `{id, nombre, predio_id, predio}`.
   * Default filtra activos; pasar `estado: false` para inactivos.
   */
  select: (p?: { predio_id?: number; estado?: boolean }) =>
    get<{ data: Array<{
      id: number;
      nombre: string;
      predio_id: number;
      predio?: { id: number; nombre: string };
    }> }>('/lotes/select', p as any),

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

/** §3.0   GET /sublotes/select — liviano, sin paginación, para dropdowns */
/** §3.1   GET /sublotes — paginado, filtrable por lote_id */
/** §3.2   GET /sublotes/{id} — incluye palmas[] */
/** §3.3   POST /sublotes y §3.4 PUT /sublotes/{id}:
 *  - Diferencia (crear o eliminar) <= 5000 → sync (sin palmas_async).
 *  - Diferencia > 5000 → async: respuesta trae palmas_async:true y batch_id.
 *    Tanto la creación como la eliminación de palmas se hacen en segundo plano.
 *  - PUT con un batch (creación o eliminación) en curso → 409 {code: BATCH_EN_CURSO}.
 *  - Polling vía palmasApi.getBatch(batch_id).
 */
/** §3.5   DELETE /sublotes/{id} — recursivo (elimina palmas y líneas) */
export interface SubloteResponse {
  message: string;
  data: any;
  palmas_async?: boolean;
  batch_id?: string;
}

export const sublotesApi = {
  /**
   * §3.0 GET /sublotes/select
   * Endpoint liviano sin paginación. Permiso: `sublotes.ver` o
   * `operaciones.crear|editar`. Devuelve `{id, nombre, lote_id, cantidad_palmas}`.
   */
  select: (p?: { lote_id?: number; estado?: boolean }) =>
    get<{ data: Array<{
      id: number;
      nombre: string;
      lote_id: number;
      cantidad_palmas: number;
    }> }>('/sublotes/select', p as any),

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

/** §4.5 Asignar palmas a línea (masivo) — sync siempre */
export interface AsignarLineaMasivoPayload {
  sublote_id: number;
  /** ID de la línea destino. `null` para desasignar. */
  linea_id: number | null;
  /**
   * IDs explícitos a reasignar.
   * Si se omite y `linea_id` es número → asigna todas las palmas SIN LÍNEA del sublote.
   * Si se omite y `linea_id` es null   → desasigna todas las palmas del sublote.
   */
  palmas_ids?: number[];
}
export interface AsignarLineaMasivoResponse {
  message: string;
  cantidad_asignadas: number;
  sublote_id: number;
  linea_id: number | null;
}

/** §4.7 Estado de batch */
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

  /**
   * §4.5 PUT /palmas/masivo/asignar-linea — asocia/desasocia en bulk palmas a una línea.
   * - `palmas_ids` presente   → reasigna esas palmas a `linea_id`.
   * - `palmas_ids` omitido + `linea_id` numérico → asigna todas las SIN LÍNEA del sublote.
   * - `palmas_ids` omitido + `linea_id: null`     → desasigna TODAS las del sublote.
   * Siempre sync, incluso con 100k palmas (es un solo UPDATE WHERE).
   */
  asignarLineaMasivo: (payload: AsignarLineaMasivoPayload) =>
    put<AsignarLineaMasivoResponse>('/palmas/masivo/asignar-linea', payload),

  /** §4.6 DELETE /palmas/masivo — body: { palmas_ids: number[] } */
  eliminar: (palmas_ids: number[]) =>
    del<{ message: string }>('/palmas/masivo', { palmas_ids }),

  /** §4.7 GET /palmas/batch/{batchId} — polling de estado */
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