/**
 * API — Super Admin
 * 
 * Paths verificados contra la documentación oficial:
 * 
 * SIN /v1  →  /admin/dashboard, /admin/tenants, /admin/users
 * CON /v1  →  /v1/admin/tenants/{id}/users/{uid} (update),
 *             /v1/admin/auditorias, /v1/admin/diagnostics
 */

import { apiClient, PaginatedResponse } from './client';

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: number;
  nombre: string;
  nit?: string;
  razon_social?: string;
  plan?: string;
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO';
  fecha_suspension?: string;
  correo_contacto?: string;
  telefono?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
  created_at: string;
  users_count?: number;
  total_usuarios?: number;
  total_empleados?: number;
}

export interface CreateTenantPayload {
  nombre: string;                    // requerido
  nit?: string;
  razon_social?: string;
  correo_contacto?: string;
  telefono?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
  plan?: 'BASICO' | 'PROFESIONAL' | 'ENTERPRISE';
  max_empleados?: number;
  max_usuarios?: number;
  usa_jornales?: boolean;
  usa_produccion?: boolean;
  tipo_pago_nomina?: string;
  moneda?: string;
  zona_horaria?: string;
  pais?: string;
  metodo_cosecha_default?: string;
  salario_minimo_vigente?: number;
  auxilio_transporte?: number;
  modulo_vacaciones?: boolean;
  modulo_liquidacion?: boolean;
  modulo_insumos?: boolean;
  sync_habilitado?: boolean;
}

export interface UpdateTenantPayload extends Partial<CreateTenantPayload> {
  estado?: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO';
}

export interface TenantUser {
  id: number;
  name: string;
  email: string;
  status: boolean;
  rol: string;
  estado: boolean;
  asignado_at?: string;
}

export interface AddUsuarioTenantPayload {
  rol: string;                       // requerido: 'ADMIN' | 'LIDER DE CAMPO' | 'PROPIETARIO'
  user_id?: number;                  // opción A: usuario existente
  email?: string;                    // opción B: por email (lo crea si no existe)
  name?: string;
  password?: string;
}

export interface UpdateUsuarioTenantPayload {
  name?: string;
  email?: string;
  rol?: 'ADMIN' | 'LIDER DE CAMPO' | 'PROPIETARIO';
  estado?: boolean;
}

export interface GlobalUser {
  id: number;
  name: string;
  email: string;
  is_super_admin: boolean;
  status: boolean;
  created_at?: string;
  tenants?: {
    tenant_id: number;
    nombre: string;
    nit?: string;
    estado_tenant?: string;
    plan?: string;
    rol: string;
    estado: boolean;
  }[];
}

export interface CreateGlobalUserPayload {
  name: string;
  email: string;
  password: string;
  is_super_admin?: boolean;
  status?: boolean;
}

export interface UpdateGlobalUserPayload {
  name?: string;
  email?: string;
  password?: string;
  is_super_admin?: boolean;
  status?: boolean;
}

export interface DashboardData {
  tenants: {
    total: number;
    activos: number;
    suspendidos: number;
    inactivos: number;
  };
  usuarios: {
    total: number;
    activos: number;
    super_admins: number;
  };
  asignaciones: {
    total: number;
    por_rol: Record<string, number>;
  };
  tenants_recientes: Tenant[];
}

export interface AuditoriaEntry {
  id: number;
  accion: string;
  fecha?: string;
  created_at?: string;
  usuario?: string;
  correo?: string;
  entidad_afectada?: string;
  detalle?: string;
  direccion_ip?: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  tenant_id?: number;
}

export interface AuditoriaParams {
  accion?: string;
  modulo?: string;
  user_id?: number;
  tenant_id?: number;
  correo?: string;
  search?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const superAdminApi = {

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD  →  GET /api/admin/dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  getDashboard: () =>
    apiClient.get<{ data: DashboardData }>('/admin/dashboard'),

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANTS (FINCAS)  →  /api/admin/tenants
  // ═══════════════════════════════════════════════════════════════════════════
  getTenants: (params?: {
    search?: string;
    estado?: string;
    plan?: string;
    sort_by?: string;
    sort_dir?: string;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<Tenant>>(`/admin/tenants${toQuery(params)}`),

  getTenant: (id: number) =>
    apiClient.get<{ data: Tenant }>(`/admin/tenants/${id}`),

  createTenant: (payload: CreateTenantPayload) =>
    apiClient.post<{ data: Tenant; message: string }>('/admin/tenants', payload),

  updateTenant: (id: number, payload: UpdateTenantPayload) =>
    apiClient.put<{ data: Tenant; message: string }>(`/admin/tenants/${id}`, payload),

  deleteTenant: (id: number) =>
    apiClient.delete<{ message: string }>(`/admin/tenants/${id}`),

  /** Alterna entre ACTIVO y SUSPENDIDO */
  toggleTenant: (id: number) =>
    apiClient.patch<{ message: string; data: Tenant }>(`/admin/tenants/${id}/toggle`),

  // ═══════════════════════════════════════════════════════════════════════════
  // USUARIOS DE UN TENANT  →  /api/admin/tenants/{id}/users
  // Excepción: actualizar usa /api/v1/admin/tenants/{id}/users/{uid}
  // ═══════════════════════════════════════════════════════════════════════════
  getUsuariosTenant: (tenantId: number) =>
    apiClient.get<{ data: TenantUser[] }>(`/admin/tenants/${tenantId}/users`),

  addUsuarioTenant: (tenantId: number, payload: AddUsuarioTenantPayload) =>
    apiClient.post<{ message: string }>(`/admin/tenants/${tenantId}/users`, payload),

  /** Este endpoint específico está en /v1/admin según API_UPDATE_USER_TENANT.md */
  updateUsuarioTenant: (tenantId: number, userId: number, payload: UpdateUsuarioTenantPayload) =>
    apiClient.put<{ message: string; data: any }>(
      `/v1/admin/tenants/${tenantId}/users/${userId}`,
      payload
    ),

  removeUsuarioTenant: (tenantId: number, userId: number) =>
    apiClient.delete<{ message: string }>(`/admin/tenants/${tenantId}/users/${userId}`),

  // ═══════════════════════════════════════════════════════════════════════════
  // USUARIOS GLOBALES  →  /api/admin/users
  // ═══════════════════════════════════════════════════════════════════════════
  getUsuarios: (params?: {
    search?: string;
    status?: boolean;
    is_super_admin?: boolean;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<GlobalUser>>(`/admin/users${toQuery(params)}`),

  getUsuario: (id: number) =>
    apiClient.get<{ data: GlobalUser }>(`/admin/users/${id}`),

  createUsuario: (payload: CreateGlobalUserPayload) =>
    apiClient.post<{ data: GlobalUser; message: string }>('/admin/users', payload),

  updateUsuario: (id: number, payload: UpdateGlobalUserPayload) =>
    apiClient.put<{ data: GlobalUser; message: string }>(`/admin/users/${id}`, payload),

  /** Alterna status entre true y false */
  toggleUsuario: (id: number) =>
    apiClient.patch<{ message: string; data: GlobalUser }>(`/admin/users/${id}/toggle`),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDITORÍAS  →  GET /api/v1/admin/auditorias
  // ═══════════════════════════════════════════════════════════════════════════
  getAuditorias: (params?: AuditoriaParams) =>
    apiClient.get<{
      current_page: number;
      data: AuditoriaEntry[];
      last_page: number;
      per_page: number;
      total: number;
    }>(`/v1/admin/auditorias${toQuery(params)}`),

  getAuditoria: (id: number) =>
    apiClient.get<{ data: AuditoriaEntry }>(`/v1/admin/auditorias/${id}`),

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNÓSTICOS  →  GET /api/v1/admin/diagnostics
  // ═══════════════════════════════════════════════════════════════════════════
  getDiagnosticos: () =>
    apiClient.get<{ data: Record<string, unknown> }>('/v1/admin/diagnostics'),

};