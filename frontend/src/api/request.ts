/**
 * Funciones de compatibilidad para páginas que usan requestConToken / fetchConToken
 * Usa el mismo BASE_URL del cliente principal.
 */

import { API_URL as BASE_URL } from './env';

function getToken(): string | null {
  return localStorage.getItem('palmapp_token');
}

function getTenantId(): string | null {
  return localStorage.getItem('palmapp_tenant_id');
}

function buildHeaders(body?: BodyInit | null): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (!(body instanceof FormData)) h['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  const tenantId = getTenantId();
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
}

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  // El endpoint viene como /api/v1/admin/... — quitamos el /api del principio
  // porque nuestro BASE_URL ya termina en /api
  const path = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
  return `${BASE_URL}${path}`;
}

async function parseBody(res: Response): Promise<any> {
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') ?? '';
  try {
    return ct.includes('application/json') ? await res.json() : await res.text();
  } catch { return null; }
}

function extractError(data: unknown): string {
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;

    // Errores de validación (422): preferir el primer detalle de `errors` antes que el mensaje genérico
    // Forma esperada: { message: "Error de validación", errors: { avatar: ["El avatar no puede superar los 3 MB"] } }
    const errors = d.errors;
    if (errors && typeof errors === 'object') {
      for (const key of Object.keys(errors as Record<string, unknown>)) {
        const arr = (errors as Record<string, unknown>)[key];
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
          return arr[0] as string;
        }
        if (typeof arr === 'string' && arr.trim()) return arr;
      }
    }

    const msg = d.message ?? d.error ?? d.code;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Error al comunicarse con el servidor';
}

export async function fetchConToken(
  endpoint: string,
  token?: string | null,
  opciones: RequestInit = {},
): Promise<Response> {
  const authToken = token ?? getToken();
  const h = buildHeaders(opciones.body ?? null);
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return fetch(buildUrl(endpoint), { ...opciones, headers: h });
}

export async function requestConToken<T = any>(
  endpoint: string,
  opciones: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const res = await fetchConToken(endpoint, token, opciones);
  const data = await parseBody(res);
  if (!res.ok) {
    const err: any = new Error(extractError(data));
    err.status = res.status;
    err.code = (data as any)?.code ?? null;
    err.errors = (data as any)?.errors ?? null;
    err.body = data;
    throw err;
  }
  return data as T;
}

export async function requestSinToken<T = any>(
  endpoint: string,
  opciones: RequestInit = {},
): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    ...opciones,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(opciones.headers ?? {}) },
  });
  const data = await parseBody(res);
  if (!res.ok) throw new Error(extractError(data));
  return data as T;
}