/**
 * api/proveedorAuth.ts
 * Cliente del Portal Proveedor (Marketplace). Aut. JWT.
 * Base: /api/v1/proveedor-auth
 * No usa X-Tenant-Id — el proveedor se infiere del JWT.
 *
 * Storage keys:
 *   palmapp_proveedor_token   → JWT actual
 *   palmapp_proveedor_user    → { id, name, email }
 *   palmapp_proveedor         → proveedor seleccionado (ProveedorActivo)
 *   palmapp_proveedor_rol     → 'ADMIN' | 'OPERADOR'
 *   palmapp_proveedor_pend    → en flujo multi-proveedor, los proveedores entre los que elegir
 */
import { requestSinToken, requestConToken } from './request';

const BASE = '/api/v1/proveedor-auth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RolProveedor = 'ADMIN' | 'OPERADOR';
export type EstadoProveedor = 'activo' | 'inactivo' | 'suspendido';

export interface UsuarioProveedor {
  id: number;
  name: string;
  email: string;
}

export interface ProveedorBase {
  id: number;
  nombre_empresa: string;
  nit?: string | null;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  descripcion?: string | null;
  logo_url?: string | null;
  estado: EstadoProveedor;
}

export interface ProveedorOpcion extends ProveedorBase {
  rol: RolProveedor;
}

/**
 * Respuesta de login.
 * - Caso A (auto-select): requires_proveedor_selection=false + proveedor + rol.
 * - Caso B (multi):       requires_proveedor_selection=true  + proveedores[].
 */
export interface LoginResponse {
  token: string;
  token_type: 'bearer';
  expires_in: number;
  requires_proveedor_selection: boolean;
  user: UsuarioProveedor;
  proveedor?: ProveedorBase;
  rol?: RolProveedor;
  proveedores?: ProveedorOpcion[];
}

export interface SelectProveedorResponse {
  token: string;
  token_type: 'bearer';
  expires_in: number;
  proveedor: ProveedorBase;
  rol: RolProveedor;
}

export interface MeResponse {
  user: UsuarioProveedor;
  proveedores: ProveedorOpcion[];
}

export interface RefreshResponse {
  token: string;
  token_type: 'bearer';
  expires_in: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'palmapp_proveedor_token';
const USER_KEY  = 'palmapp_proveedor_user';
const PROV_KEY  = 'palmapp_proveedor';
const ROL_KEY   = 'palmapp_proveedor_rol';
const PEND_KEY  = 'palmapp_proveedor_pend';

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/**
 * Notifica a los suscriptores (típicamente el layout del portal proveedor)
 * que algún campo de la sesión del proveedor cambió. `storage` event nativo
 * solo dispara entre pestañas; este evento custom cubre la misma pestaña.
 */
function emitirSesionCambiada() {
  try {
    window.dispatchEvent(new CustomEvent('proveedor-user-changed'));
  } catch { /* SSR o entorno sin window */ }
}

export const proveedorAuthStorage = {
  getToken:     (): string | null            => localStorage.getItem(TOKEN_KEY),
  setToken:     (t: string)                  => { localStorage.setItem(TOKEN_KEY, t); },

  getUser:      (): UsuarioProveedor | null  => readJSON<UsuarioProveedor>(USER_KEY),
  setUser:      (u: UsuarioProveedor)        => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    // Dispara automático para que cualquier consumidor (layout, header)
    // refresque sin necesidad de cablearlo en cada call site.
    emitirSesionCambiada();
  },

  getProveedor: (): ProveedorBase | null     => readJSON<ProveedorBase>(PROV_KEY),
  setProveedor: (p: ProveedorBase)           => {
    localStorage.setItem(PROV_KEY, JSON.stringify(p));
    emitirSesionCambiada();
  },

  getRol:       (): RolProveedor | null      => (localStorage.getItem(ROL_KEY) as RolProveedor | null),
  setRol:       (r: RolProveedor)            => { localStorage.setItem(ROL_KEY, r); },

  getPendientes:(): ProveedorOpcion[] | null => readJSON<ProveedorOpcion[]>(PEND_KEY),
  setPendientes:(arr: ProveedorOpcion[])     => { localStorage.setItem(PEND_KEY, JSON.stringify(arr)); },
  clearPendientes:()                         => { localStorage.removeItem(PEND_KEY); },

  clearAll: () => {
    [TOKEN_KEY, USER_KEY, PROV_KEY, ROL_KEY, PEND_KEY, 'proveedorSession'].forEach(k =>
      localStorage.removeItem(k),
    );
    emitirSesionCambiada();
  },
};

// ─── Cliente API ──────────────────────────────────────────────────────────────
// NOTA: `requestSinToken` y `requestConToken` apuntan al cliente Laravel global
// (mismo BASE_URL del .env). El portal proveedor NO requiere X-Tenant-Id; sí
// requiere Authorization en endpoints autenticados.

function tkn(): string | null {
  return proveedorAuthStorage.getToken();
}

export const proveedorAuthApi = {
  /** POST /login — Caso A (auto) o Caso B (multi). */
  login: (email: string, password: string) =>
    requestSinToken<LoginResponse>(`${BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** POST /select-proveedor — usa el token devuelto por login (caso B). */
  selectProveedor: (proveedorId: number) =>
    requestConToken<SelectProveedorResponse>(
      `${BASE}/select-proveedor`,
      { method: 'POST', body: JSON.stringify({ proveedor_id: proveedorId }) },
      tkn(),
    ),

  /** GET /me — devuelve user + proveedores activos accesibles. */
  me: () =>
    requestConToken<MeResponse>(`${BASE}/me`, { method: 'GET' }, tkn()),

  /** POST /logout — invalida el JWT actual. */
  logout: () =>
    requestConToken<{ message: string }>(`${BASE}/logout`, { method: 'POST' }, tkn()),

  /** POST /refresh — devuelve un token nuevo. NO preserva proveedor_id claim. */
  refresh: () =>
    requestConToken<RefreshResponse>(`${BASE}/refresh`, { method: 'POST' }, tkn()),

  /** POST /forgot-password — siempre 200 (anti-enumeración). */
  forgotPassword: (email: string) =>
    requestSinToken<{ message: string }>(`${BASE}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** POST /reset-password — fija una nueva contraseña con el token del email. */
  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) =>
    requestSinToken<{ message: string }>(`${BASE}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

};

// ─── Códigos de error documentados ────────────────────────────────────────────

export const ProveedorAuthErrorCodes = {
  USER_INACTIVE:           'USER_INACTIVE',
  USE_ADMIN_LOGIN:         'USE_ADMIN_LOGIN',
  NO_PROVEEDORES_ACTIVOS:  'NO_PROVEEDORES_ACTIVOS',
  PROVEEDOR_ACCESS_DENIED: 'PROVEEDOR_ACCESS_DENIED',
  PROVEEDOR_INACTIVE:      'PROVEEDOR_INACTIVE',
  PASSWORD_RESET_FAILED:   'PASSWORD_RESET_FAILED',
  MAIL_ERROR:              'MAIL_ERROR',
} as const;
