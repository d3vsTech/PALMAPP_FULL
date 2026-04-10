/**
 * API — Autenticación
 * Cubre login de finca, super admin, selección de tenant,
 * recuperación de contraseña y perfil de usuario.
 */

import { apiClient, tokenStorage, tenantStorage } from './client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface LoginFincaPayload {
  email: string;
  password: string;
}

export interface LoginSuperAdminPayload {
  email: string;
  password: string;
}

export interface TenantInfo {
  id: number;
  nombre: string;
  nit: string;
  plan: string;
  rol?: string;
}

export interface LoginFincaResponse {
  token: string;
  token_type: string;
  expires_in: number;
  requires_tenant_selection: boolean;
  user: { id: number; name: string; email: string };
  // Cuando requires_tenant_selection = false (auto-seleccionado)
  tenant?: TenantInfo;
  rol?: string;
  permisos?: string[];
  modulos?: Record<string, boolean>;
  config_nomina?: Record<string, unknown>;
  // Cuando requires_tenant_selection = true
  tenants?: (TenantInfo & { rol: string })[];
}

export interface LoginSuperAdminResponse {
  token: string;
  token_type: string;
  expires_in: number;
  user: { id: number; name: string; email: string; is_super_admin: boolean };
}

export interface SelectTenantPayload {
  tenant_id: number;
}

export interface SelectTenantResponse {
  token: string;
  token_type: string;
  expires_in: number;
  tenant_id: number;
  tenant_nombre: string;
  rol: string;
  permisos: string[];
  modulos: Record<string, boolean>;
  config_nomina: Record<string, unknown>;
}

export interface MeResponse {
  user: { id: number; name: string; email: string };
  tenants: (TenantInfo & { rol: string })[];
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const authApi = {
  /** Login de usuarios de finca */
  loginFinca: (payload: LoginFincaPayload) =>
    apiClient.post<LoginFincaResponse>('/v1/tenant-auth/login', payload),

  /** Login de super admin */
  loginSuperAdmin: (payload: LoginSuperAdminPayload) =>
    apiClient.post<LoginSuperAdminResponse>('/v1/auth/login', payload),

  /** Seleccionar finca cuando hay múltiples (tenant-auth) */
  selectTenantFinca: (payload: SelectTenantPayload) =>
    apiClient.post<SelectTenantResponse>('/v1/tenant-auth/select-tenant', payload),

  /** Seleccionar tenant desde super admin */
  selectTenantAdmin: (payload: SelectTenantPayload) =>
    apiClient.post<SelectTenantResponse>('/v1/auth/select-tenant', payload),

  /** Perfil del usuario de finca (rehidratar sesión) */
  meFinca: () => apiClient.get<MeResponse>('/v1/tenant-auth/me'),

  /** Perfil del super admin */
  meSuperAdmin: () => apiClient.get<MeResponse>('/v1/auth/me'),

  /** Logout finca */
  logoutFinca: () => apiClient.post<{ message: string }>('/v1/tenant-auth/logout', {}),

  /** Logout super admin */
  logoutSuperAdmin: () => apiClient.post<{ message: string }>('/v1/auth/logout', {}),

  /** Refresh token finca */
  refreshFinca: () =>
    apiClient.post<{ token: string; token_type: string; expires_in: number }>(
      '/v1/tenant-auth/refresh',
      {}
    ),

  /** Solicitar restablecimiento de contraseña */
  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<{ message: string }>('/v1/auth/forgot-password', payload),

  /** Restablecer contraseña con token de correo */
  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<{ message: string }>('/v1/auth/reset-password', payload),

  /** Departamentos (Colombia) */
  getDepartamentos: () =>
    apiClient.get<{ data: { codigo: string; nombre: string }[] }>('/v1/auth/departamentos'),

  /** Municipios por departamento */
  getMunicipios: (codigoDepartamento: string) =>
    apiClient.get<{ data: { codigo: string; nombre: string }[] }>(
      `/v1/auth/departamentos/${codigoDepartamento}/municipios`
    ),

  // ─── Helpers de almacenamiento ──────────────────────────────────────────────

  /** Guarda token y tenant después de login exitoso */
  saveSession: (token: string, tenantId?: number) => {
    tokenStorage.set(token);
    if (tenantId) tenantStorage.set(tenantId);
  },

  /** Limpia sesión */
  clearSession: () => {
    tokenStorage.remove();
    tenantStorage.remove();
    localStorage.removeItem('palmapp_user');
    localStorage.removeItem('palmapp_permisos');
    localStorage.removeItem('palmapp_modulos');
  },
};
