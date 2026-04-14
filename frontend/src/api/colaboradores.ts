/**
 * API — Colaboradores
 * Base: /api/v1/tenant/colaboradores
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const q = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => [k, String(v)]))
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
  listar: (p?: {
    search?: string; cargo?: string; modalidad_pago?: string;
    predio_id?: number; estado?: boolean; per_page?: number; page?: number;
  }) => get<{ data: any[]; meta: any }>('', p as any),

  ver: (id: number) => get<{ data: any }>(`/${id}`),

  crear: (b: Record<string, unknown>) =>
    post<{ message: string; data: any }>('', b),

  editar: (id: number, b: Record<string, unknown>) =>
    put<{ message: string; data: any }>(`/${id}`, b),

  eliminar: (id: number) => del<{ message: string }>(`/${id}`),

  toggle: (id: number) =>
    requestConToken<{ message: string; data: any }>(
      `/api/v1/tenant/colaboradores/${id}/toggle`, { method: 'PATCH' }, tkn()
    ),

  // ─── Documentos ────────────────────────────────────────────────────────────
  getCategorias: () => get<{ data: Record<string, any> }>('/documento-categorias'),

  getDocumentos: (id: number, categoria?: string) =>
    get<{ data: any[] }>(`/${id}/documentos`, categoria ? { categoria } : undefined),

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

  descargarDocumento: (id: number, docId: number) =>
    `/api/v1/tenant/colaboradores/${id}/documentos/${docId}/descargar`,
};