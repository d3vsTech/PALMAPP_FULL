/**
 * API Client — PalmApp
 * Cliente base con interceptores de autenticación y manejo de errores.
 * Base URL configurada por variable de entorno VITE_API_URL
 */

import { API_URL as BASE_URL } from './env';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export const tokenStorage = {
  get: (): string | null => localStorage.getItem('palmapp_token'),
  set: (token: string) => localStorage.setItem('palmapp_token', token),
  remove: () => localStorage.removeItem('palmapp_token'),
};

export const tenantStorage = {
  get: (): number | null => {
    const id = localStorage.getItem('palmapp_tenant_id');
    return id ? parseInt(id) : null;
  },
  set: (id: number) => localStorage.setItem('palmapp_tenant_id', String(id)),
  remove: () => localStorage.removeItem('palmapp_tenant_id'),
};

// ─── Request builder ──────────────────────────────────────────────────────────

/**
 * Con FormData NO se fija Content-Type: el navegador lo pone solo con el
 * boundary multipart. Forzarlo a application/json (bug histórico de
 * postForm/putForm) hacía que el backend no pudiera parsear el archivo.
 */
function buildHeaders(requiresTenant = false, isFormData = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = tokenStorage.get();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (requiresTenant) {
    const tenantId = tenantStorage.get();
    if (tenantId) {
      headers['X-Tenant-Id'] = String(tenantId);
    }
  }

  return headers;
}

/**
 * Limpieza COMPLETA de la sesión local. Debe borrar las mismas claves que
 * `auth.clearSession()` — si solo se borra el token, la UI sigue leyendo
 * permisos y módulos viejos de localStorage para decidir qué renderizar.
 */
function clearLocalSession(): void {
  tokenStorage.remove();
  tenantStorage.remove();
  localStorage.removeItem('palmapp_user');
  localStorage.removeItem('palmapp_permisos');
  localStorage.removeItem('palmapp_modulos');
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return {
      message: data.message ?? 'Error desconocido',
      code: data.code,
      errors: data.errors,
      status: response.status,
    };
  } catch {
    return { message: response.statusText, status: response.status };
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────

/**
 * Núcleo compartido: hace el fetch con headers de auth, y ante un 401 por
 * token vencido intenta refresh + un reintento. TODAS las variantes (json,
 * blob, form) pasan por acá para tener el mismo manejo de sesión.
 */
async function rawRequest(
  path: string,
  options: RequestInit & { requiresTenant?: boolean } = {}
): Promise<Response> {
  const { requiresTenant = false, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        ...buildHeaders(requiresTenant, isFormData),
        ...(fetchOptions.headers ?? {}),
      },
    });

  const response = await doFetch();

  // Token expirado → intentar refresh automático
  if (response.status === 401) {
    const err = await parseError(response);
    if (err.code === 'TOKEN_EXPIRED') {
      try {
        await refreshToken();
        // Reintentar con nuevo token
        const retryResponse = await doFetch();
        if (!retryResponse.ok) throw await parseError(retryResponse);
        return retryResponse;
      } catch {
        // Refresh falló: limpia sesión y avisa al árbol React que navegue al
        // login. NO usamos `window.location.href` (causa full page reload, pierde
        // estado de React Router). El AuthContext escucha este evento y llama
        // a `navigate('/login', { replace: true })`.
        clearLocalSession();
        window.dispatchEvent(new CustomEvent('palmapp:auth:logout', {
          detail: { reason: 'refresh_failed' },
        }));
        throw err;
      }
    }
    clearLocalSession();
    throw err;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
}

async function request<T>(
  path: string,
  options: RequestInit & { requiresTenant?: boolean } = {}
): Promise<T> {
  const response = await rawRequest(path, options);

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;

  return response.json() as Promise<T>;
}

// ─── Refresh token ────────────────────────────────────────────────────────────

/**
 * Single-flight: si varias peticiones paralelas expiran a la vez, solo se
 * dispara UN refresh y todas esperan el mismo resultado.
 */
let refreshEnCurso: Promise<void> | null = null;

function refreshToken(): Promise<void> {
  if (!refreshEnCurso) {
    refreshEnCurso = (async () => {
      const response = await fetch(`${BASE_URL}/v1/tenant-auth/refresh`, {
        method: 'POST',
        headers: buildHeaders(),
      });
      if (!response.ok) throw new Error('Refresh failed');
      const data = await response.json();
      tokenStorage.set(data.token);
    })().finally(() => { refreshEnCurso = null; });
  }
  return refreshEnCurso;
}

// ─── HTTP methods ─────────────────────────────────────────────────────────────

export const apiClient = {
  // `signal` opcional permite cancelar la request desde afuera (AbortController).
  // Se usa en pantallas que disparan muchos previews en paralelo — al desmontar
  // el componente se abortan y se liberan las conexiones HTTP del navegador.
  get: <T>(path: string, requiresTenant = false, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', requiresTenant, signal }),

  post: <T>(path: string, body: unknown, requiresTenant = false) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      requiresTenant,
    }),

  put: <T>(path: string, body: unknown, requiresTenant = false) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      requiresTenant,
    }),

  patch: <T>(path: string, body?: unknown, requiresTenant = false) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      requiresTenant,
    }),

  delete: <T>(path: string, requiresTenant = false) =>
    request<T>(path, { method: 'DELETE', requiresTenant }),

  // Pasa por rawRequest para tener el mismo refresh de token que el resto —
  // las descargas de PDF son flujos largos donde el token vence más seguido.
  getBlob: async (path: string, requiresTenant = false): Promise<Blob> => {
    const response = await rawRequest(path, { method: 'GET', requiresTenant });
    return response.blob();
  },

  /** Multipart/form-data (ej: subir logo). El Content-Type con boundary lo
   *  pone el navegador — rawRequest lo omite al detectar FormData. */
  postForm: <T>(path: string, formData: FormData, requiresTenant = false) =>
    request<T>(path, { method: 'POST', body: formData, requiresTenant }),

  putForm: <T>(path: string, formData: FormData, requiresTenant = false) =>
    request<T>(path, { method: 'PUT', body: formData, requiresTenant }),
};