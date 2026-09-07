/**
 * Funciones de compatibilidad para páginas que usan requestConToken / fetchConToken
 * Usa el mismo BASE_URL del cliente principal.
 *
 * Renovación de sesión: igual que `client.ts`, ante un 401 con code
 * TOKEN_EXPIRED se intenta el refresh del token de FINCA y se reintenta la
 * petición una vez. Aplica SOLO cuando la petición usó el token de finca
 * (`palmapp_token`): el módulo proveedor pasa su propio token explícito
 * (`palmapp_proveedor_token`) y su ciclo de sesión no se toca desde acá.
 */

import { API_URL as BASE_URL } from './env';

function getToken(): string | null {
  return localStorage.getItem('palmapp_token');
}

/** Mismas claves que `auth.clearSession()` — borrar solo el token dejaría
 *  permisos y módulos viejos que la UI sigue leyendo. */
function clearTenantSession(): void {
  ['palmapp_token', 'palmapp_tenant_id', 'palmapp_user', 'palmapp_permisos', 'palmapp_modulos']
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * Refresh del token de finca con single-flight: si varias peticiones
 * paralelas expiran a la vez (típico al volver a una pantalla con varios
 * fetches), solo se dispara UN refresh y todas esperan el mismo resultado.
 */
let refreshEnCurso: Promise<void> | null = null;

function refreshTenantToken(): Promise<void> {
  if (!refreshEnCurso) {
    refreshEnCurso = (async () => {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/v1/tenant-auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      localStorage.setItem('palmapp_token', data.token);
    })().finally(() => { refreshEnCurso = null; });
  }
  return refreshEnCurso;
}

/** ¿La petición usó el token de finca? Solo entonces aplica el refresh. */
function usoTokenDeFinca(tokenExplicito?: string | null): boolean {
  return tokenExplicito == null || tokenExplicito === getToken();
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

async function doFetch(
  endpoint: string,
  token: string | null | undefined,
  opciones: RequestInit,
): Promise<Response> {
  const authToken = token ?? getToken();
  const h = buildHeaders(opciones.body ?? null);
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return fetch(buildUrl(endpoint), { ...opciones, headers: h });
}

export async function fetchConToken(
  endpoint: string,
  token?: string | null,
  opciones: RequestInit = {},
): Promise<Response> {
  const res = await doFetch(endpoint, token, opciones);

  // Renovación transparente del token de finca (igual que client.ts).
  // Se lee el body en un clone para no consumir la Response del caller.
  if (res.status === 401 && usoTokenDeFinca(token)) {
    let code: string | null = null;
    try { code = (await res.clone().json())?.code ?? null; } catch { /* sin json */ }
    if (code === 'TOKEN_EXPIRED') {
      try {
        await refreshTenantToken();
        // Reintento con el token nuevo (token=null → se relee de storage).
        return await doFetch(endpoint, null, opciones);
      } catch {
        clearTenantSession();
        window.dispatchEvent(new CustomEvent('palmapp:auth:logout', {
          detail: { reason: 'refresh_failed' },
        }));
        return res;
      }
    }
    clearTenantSession();
  }
  return res;
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