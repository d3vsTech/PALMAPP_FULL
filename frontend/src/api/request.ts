/**
 * Funciones de compatibilidad para páginas que usan requestConToken / fetchConToken
 * Usa el mismo BASE_URL del cliente principal.
 */

const BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ??
  'https://31.97.7.50:3000/api'
).replace(/\/+$/, '');

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
  if (!res.ok) throw new Error(extractError(data));
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