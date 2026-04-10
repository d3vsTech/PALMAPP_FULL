/**
 * API Client — PalmApp
 * Cliente base con interceptores de autenticación y manejo de errores.
 * Base URL configurada por variable de entorno VITE_API_URL
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://31.97.7.50:3000/api').replace(/\/+$/, '');

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

function buildHeaders(requiresTenant = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

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

async function request<T>(
  path: string,
  options: RequestInit & { requiresTenant?: boolean } = {}
): Promise<T> {
  const { requiresTenant = false, ...fetchOptions } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...buildHeaders(requiresTenant),
      ...(fetchOptions.headers ?? {}),
    },
  });

  // Token expirado → intentar refresh automático
  if (response.status === 401) {
    const err = await parseError(response);
    if (err.code === 'TOKEN_EXPIRED') {
      try {
        await refreshToken();
        // Reintentar con nuevo token
        const retryResponse = await fetch(`${BASE_URL}${path}`, {
          ...fetchOptions,
          headers: {
            ...buildHeaders(requiresTenant),
            ...(fetchOptions.headers ?? {}),
          },
        });
        if (!retryResponse.ok) throw await parseError(retryResponse);
        return retryResponse.json() as Promise<T>;
      } catch {
        tokenStorage.remove();
        tenantStorage.remove();
        window.location.href = '/login';
        throw err;
      }
    }
    tokenStorage.remove();
    tenantStorage.remove();
    throw err;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;

  return response.json() as Promise<T>;
}

// ─── Refresh token ────────────────────────────────────────────────────────────

async function refreshToken(): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/tenant-auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(),
  });
  if (!response.ok) throw new Error('Refresh failed');
  const data = await response.json();
  tokenStorage.set(data.token);
}

// ─── HTTP methods ─────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, requiresTenant = false) =>
    request<T>(path, { method: 'GET', requiresTenant }),

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

  /** Multipart/form-data (ej: subir logo) */
  postForm: <T>(path: string, formData: FormData, requiresTenant = false) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = tokenStorage.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (requiresTenant) {
      const tenantId = tenantStorage.get();
      if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
    }
    return request<T>(path, {
      method: 'POST',
      headers,
      body: formData,
      requiresTenant,
    });
  },

  putForm: <T>(path: string, formData: FormData, requiresTenant = false) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = tokenStorage.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (requiresTenant) {
      const tenantId = tenantStorage.get();
      if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
    }
    return request<T>(path, {
      method: 'PUT',
      headers,
      body: formData,
      requiresTenant,
    });
  },
};