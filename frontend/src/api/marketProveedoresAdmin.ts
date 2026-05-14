/**
 * API — Market Proveedores (Super Admin)
 * Base: /api/v1/admin/market/proveedores
 * Auth: Bearer JWT con is_super_admin = true (sin X-Tenant-Id).
 * Alineado a docs/API_MARKET_PROVEEDORES_ADMIN.md
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoProveedor = 'activo' | 'inactivo' | 'suspendido';
export type RolProveedorUser = 'ADMIN' | 'OPERADOR';

export interface ProveedorAdmin {
  id: number;
  nombre_empresa: string;
  nit?: string | null;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  descripcion?: string | null;
  logo_url?: string | null;
  estado: EstadoProveedor;
  calificacion_promedio: string | number;
  total_ventas: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  total_usuarios?: number;
  total_productos?: number;
  total_pedidos?: number;
}

export interface ProveedorPayload {
  nombre_empresa: string;
  nit?: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  descripcion?: string;
  logo_url?: string;
}

export interface ProveedorUser {
  id: number;
  name: string;
  email: string;
  status: boolean;
  rol: RolProveedorUser;
  estado: boolean;
  asignado_at?: string;
}

export interface CrearUsuarioProveedorPayload {
  // Modo A — usuario nuevo
  name?: string;
  email?: string;
  password?: string;
  // Modo B — usuario existente
  user_id?: number;
  rol?: RolProveedorUser;
}

export interface ActualizarUsuarioProveedorPayload {
  name?: string;
  email?: string;
  password?: string | null;
  rol?: RolProveedorUser;
  estado?: boolean;
}

export interface ListarProveedoresParams {
  estado?: EstadoProveedor;
  ciudad?: string;
  departamento?: string;
  buscar?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/** Paginación Laravel estándar — top-level, no envuelto en `meta`. */
export interface LaravelPaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url?: string;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Municipio {
  codigo: string;
  nombre: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

const BASE = '/api/v1/admin/market/proveedores';

export const marketProveedoresAdminApi = {
  // ── Proveedores ──────────────────────────────────────────────────────────
  listar: (params?: ListarProveedoresParams) =>
    requestConToken<LaravelPaginatedResponse<ProveedorAdmin>>(
      `${BASE}${toQuery(params as Record<string, unknown>)}`,
      { method: 'GET' },
      tkn(),
    ),

  ver: (id: number) =>
    requestConToken<{ data: ProveedorAdmin & { proveedor_users?: any[] } }>(
      `${BASE}/${id}`,
      { method: 'GET' },
      tkn(),
    ),

  crear: (payload: ProveedorPayload) =>
    requestConToken<{ message: string; data: ProveedorAdmin }>(
      BASE,
      { method: 'POST', body: JSON.stringify(payload) },
      tkn(),
    ),

  actualizar: (id: number, payload: Partial<ProveedorPayload>) =>
    requestConToken<{ message: string; data: ProveedorAdmin }>(
      `${BASE}/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      tkn(),
    ),

  eliminar: (id: number) =>
    requestConToken<{ message: string }>(
      `${BASE}/${id}`,
      { method: 'DELETE' },
      tkn(),
    ),

  toggleEstado: (id: number) =>
    requestConToken<{ message: string; data: ProveedorAdmin }>(
      `${BASE}/${id}/toggle`,
      { method: 'PATCH' },
      tkn(),
    ),

  // ── Usuarios del proveedor ───────────────────────────────────────────────
  listarUsuarios: (proveedorId: number) =>
    requestConToken<{ data: ProveedorUser[] }>(
      `${BASE}/${proveedorId}/usuarios`,
      { method: 'GET' },
      tkn(),
    ),

  crearUsuario: (proveedorId: number, payload: CrearUsuarioProveedorPayload) =>
    requestConToken<{ message: string; data?: ProveedorUser }>(
      `${BASE}/${proveedorId}/usuarios`,
      { method: 'POST', body: JSON.stringify(payload) },
      tkn(),
    ),

  actualizarUsuario: (
    proveedorId: number,
    userId: number,
    payload: ActualizarUsuarioProveedorPayload,
  ) =>
    requestConToken<{ message: string; data?: ProveedorUser }>(
      `${BASE}/${proveedorId}/usuarios/${userId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      tkn(),
    ),

  eliminarUsuario: (proveedorId: number, userId: number) =>
    requestConToken<{ message: string }>(
      `${BASE}/${proveedorId}/usuarios/${userId}`,
      { method: 'DELETE' },
      tkn(),
    ),

  // ── Paramétricas ─────────────────────────────────────────────────────────
  departamentos: () =>
    requestConToken<{ data: Departamento[] }>(
      '/api/v1/auth/departamentos',
      { method: 'GET' },
      tkn(),
    ),

  municipios: (codigoDepartamento: string) =>
    requestConToken<{ data: Municipio[]; departamento: string }>(
      `/api/v1/auth/departamentos/${codigoDepartamento}/municipios`,
      { method: 'GET' },
      tkn(),
    ),
};

// ─── Códigos de error ────────────────────────────────────────────────────────

export const MarketProveedoresErrorCodes = {
  SUPER_ADMIN_REQUIRED: 'SUPER_ADMIN_REQUIRED',
  PROVIDER_ACTIVE: 'PROVIDER_ACTIVE',
  USER_ALREADY_ASSIGNED: 'USER_ALREADY_ASSIGNED',
} as const;
