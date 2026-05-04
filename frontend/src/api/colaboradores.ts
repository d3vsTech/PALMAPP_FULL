/**
 * API — Colaboradores
 * Base: /api/v1/tenant/colaboradores
 *
 * Cubre:
 *  - CRUD completo con soft delete + restaurar
 *  - Avatar (subir/eliminar, multipart)
 *  - Documentos (listar/subir/descargar/visualizar inline/eliminar)
 *  - Paramétricas para dropdowns: EPS / ARL / Fondos de Pensión / Entidades Bancarias
 *  - Listado liviano /select para wizards (Operaciones, Nómina, etc.)
 */
import { requestConToken, fetchConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

// ─── Base URL del servidor (sin /api) para construir URLs absolutas de archivos ──
const _API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ??
  'https://31.97.7.50:3000/api'
).replace(/\/+$/, '');
/** Host raíz del backend (sin /api), para componer URLs de avatares y documentos */
export const FILES_BASE_URL = _API_BASE.replace(/\/api\/?$/, '');

/**
 * Convierte una URL de avatar relativa (ej. /storage/avatars/abc.jpg) en URL absoluta.
 * Si ya viene completa (http:// o https://) la devuelve tal cual.
 * Devuelve null si no hay URL.
 */
export function buildAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl;          // data URL (preview local)
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${FILES_BASE_URL}${path}`;
}

// ─── Tipos públicos ────────────────────────────────────────────────────────────
export interface ColaboradorListadoParams {
  search?: string;
  cargo?: string;
  modalidad_pago?: 'FIJO' | 'PRODUCCION';
  predio_id?: number;
  estado?: boolean;
  /** Incluir colaboradores eliminados (soft delete) junto con los vigentes */
  incluir_eliminados?: boolean;
  /** Devolver únicamente los colaboradores eliminados */
  solo_eliminados?: boolean;
  per_page?: number;
  page?: number;
}

export interface ColaboradorSelectParams {
  estado?: boolean;
  modalidad_pago?: 'FIJO' | 'PRODUCCION';
  predio_id?: number;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const q = params ? '?' + new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
  ).toString() : '';
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}${q}`, { method: 'GET' }, tkn());
}
async function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'POST', body: JSON.stringify(body) }, tkn());
}
async function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
async function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant/colaboradores${path}`, { method: 'DELETE' }, tkn());
}

export const colaboradoresApi = {
  // ─── Listado / búsqueda ──────────────────────────────────────────────────
  listar: (p?: ColaboradorListadoParams) =>
    get<{ data: any[]; meta: any }>('', p as any),

  /**
   * Listado liviano para dropdowns (sin paginación).
   * Retorna: [{ id, nombre_completo, documento, modalidad_pago }]
   */
  selectListado: (p?: ColaboradorSelectParams) =>
    get<{ data: Array<{ id: number; nombre_completo: string; documento: string; modalidad_pago: string }> }>('/select', p as any),

  ver: (id: number) => get<{ data: any }>(`/${id}`),

  crear: (b: Record<string, unknown>) =>
    post<{ message: string; data: any }>('', b),

  editar: (id: number, b: Record<string, unknown>) =>
    put<{ message: string; data: any }>(`/${id}`, b),

  /**
   * Soft delete del colaborador. Mantiene historial (jornales, nómina, contratos, docs).
   * Para reincorporarlo usar `restaurar(id)`.
   */
  eliminar: (id: number) => del<{ message: string }>(`/${id}`),

  /** Restaura un colaborador previamente eliminado (soft delete). */
  restaurar: (id: number) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/restaurar`,
      { method: 'POST' },
      tkn()
    ),

  toggle: (id: number) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/toggle`, { method: 'PATCH' }, tkn()
    ),

  // ─── Avatar ──────────────────────────────────────────────────────────────
  /**
   * Sube/reemplaza el avatar del colaborador.
   * El FormData debe traer un campo `avatar` con el archivo (jpg/png/webp, máx 3 MB).
   *
   * Ejemplo de uso:
   *   const fd = new FormData();
   *   fd.append('avatar', file);
   *   colaboradoresApi.subirAvatar(id, fd);
   */
  subirAvatar: (id: number, formData: FormData) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/avatar`,
      { method: 'POST', body: formData },
      tkn()
    ),

  eliminarAvatar: (id: number) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/avatar`,
      { method: 'DELETE' },
      tkn()
    ),

  // ─── Documentos ──────────────────────────────────────────────────────────
  getCategorias: () => get<{ data: Record<string, any> }>('/documento-categorias'),

  getDocumentos: (id: number, categoria?: string) =>
    get<{ data: any[] }>(`/${id}/documentos`, categoria ? { categoria } : undefined),

  verDocumento: (id: number, docId: number) =>
    get<{ data: any }>(`/${id}/documentos/${docId}`),

  subirDocumento: (id: number, formData: FormData) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/documentos`,
      { method: 'POST', body: formData },
      tkn()
    ),

  eliminarDocumento: (id: number, docId: number) =>
    requestConToken<{ message: string }>(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}`,
      { method: 'DELETE' }, tkn()
    ),

  /**
   * URL relativa para descarga (Content-Disposition: attachment).
   * Para fetch autenticado real usar `descargarDocumentoBlob` (incluye token).
   */
  descargarDocumento: (id: number, docId: number) =>
    `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`,

  /**
   * Descarga el archivo como Blob con headers de auth + tenant.
   * Útil para hacer download programático: `URL.createObjectURL(blob)` + `<a download>`.
   */
  descargarDocumentoBlob: async (id: number, docId: number): Promise<Blob> => {
    const res = await fetchConToken(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`,
      tkn(),
      { method: 'GET' }
    );
    if (!res.ok) throw new Error(`Error ${res.status} al descargar el documento`);
    return res.blob();
  },

  /**
   * Visualiza el documento inline (preview en navegador).
   * Devuelve el Blob; el caller debe generar `URL.createObjectURL(blob)`
   * y asignarlo a un <iframe> (PDF) o <img> (imagen).
   *
   * Mime types soportados: application/pdf, image/jpeg, image/png, image/webp.
   * Si no es previsualizable, lanza error con `code: 'MIME_NOT_PREVIEWABLE'` (HTTP 415).
   *
   * IMPORTANTE: revocar la URL al desmontar para liberar memoria:
   *   URL.revokeObjectURL(objectUrl);
   */
  visualizarDocumento: async (
    id: number,
    docId: number
  ): Promise<{ blob: Blob; mimeType: string; filename?: string }> => {
    const res = await fetchConToken(
      `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/visualizar`,
      tkn(),
      { method: 'GET' }
    );
    if (res.status === 415) {
      // Body viene como JSON pero la respuesta puede llegar como blob
      let payload: any = {};
      try {
        const text = await res.clone().text();
        payload = JSON.parse(text);
      } catch { /* ignore */ }
      const err = new Error(payload?.message ?? 'Tipo de archivo no previsualizable');
      (err as any).code = payload?.code ?? 'MIME_NOT_PREVIEWABLE';
      (err as any).mimeType = payload?.mime_type;
      (err as any).status = 415;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`Error ${res.status} al visualizar el documento`);
      (err as any).status = res.status;
      throw err;
    }
    const mimeType = res.headers.get('content-type') ?? 'application/octet-stream';
    // Extraer filename del Content-Disposition (inline; filename="...")
    const cd = res.headers.get('content-disposition') ?? '';
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    const filename = m ? decodeURIComponent(m[1]) : undefined;
    const blob = await res.blob();
    return { blob, mimeType, filename };
  },

  // ─── Paramétricas (selects para dropdowns del formulario) ──────────────────
  // Endpoints: /api/v1/tenant/{recurso}/select → { data: [{ id, nombre }] }
  // Devuelven solo activos (estado=true), sin paginación, ordenados por nombre.
  // El frontend guarda el `nombre` (no el id) en el payload del colaborador.
  getEPS: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/eps/select', { method: 'GET' }, tkn()
    ),

  getARL: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/arl/select', { method: 'GET' }, tkn()
    ),

  getFondosPension: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/fondos-pension/select', { method: 'GET' }, tkn()
    ),

  getEntidadesBancarias: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string }> }>(
      '/api/v1/tenant/entidades-bancarias/select', { method: 'GET' }, tkn()
    ),
};