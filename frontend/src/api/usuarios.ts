/**
 * API — Usuarios del Tenant
 * Gestión de usuarios y permisos dentro de la finca.
 */

import { apiClient } from './client';

const T = true;

export interface UsuarioTenant {
  id: number;
  name: string;
  email: string;
  status: boolean;
  is_admin: boolean;
  estado: boolean;
  asignado_at: string;
  permisos?: string[];
}

export interface ResumenUsuarios {
  total: number;
  activos: number;
  inactivos: number;
}

export interface ListUsuariosResponse {
  data: UsuarioTenant[];
  resumen: ResumenUsuarios;
}

export interface CreateUsuarioPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  is_admin?: boolean;
}

export interface UpdateUsuarioPayload {
  name?: string;
  email?: string;
  is_admin?: boolean;
}

export interface PermisosPayload {
  permisos: string[];
}

export const usuariosApi = {
  /** Listar usuarios del tenant */
  getUsuarios: (params?: { search?: string; estado?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.estado !== undefined) q.append('estado', String(params.estado));
    const qs = q.toString();
    return apiClient.get<ListUsuariosResponse>(
      `/v1/tenant/usuarios${qs ? `?${qs}` : ''}`,
      T
    );
  },

  /** Detalle de un usuario */
  getUsuario: (id: number) =>
    apiClient.get<{ data: UsuarioTenant }>(`/v1/tenant/usuarios/${id}`, T),

  /** Crear usuario */
  createUsuario: (payload: CreateUsuarioPayload) =>
    apiClient.post<{ data: UsuarioTenant; message: string }>('/v1/tenant/usuarios', payload, T),

  /** Actualizar usuario */
  updateUsuario: (id: number, payload: UpdateUsuarioPayload) =>
    apiClient.put<{ data: UsuarioTenant; message: string }>(
      `/v1/tenant/usuarios/${id}`,
      payload,
      T
    ),

  /** Eliminar usuario */
  deleteUsuario: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/usuarios/${id}`, T),

  /** Activar / desactivar usuario */
  toggleUsuario: (id: number) =>
    apiClient.patch<{ data: UsuarioTenant; message: string }>(
      `/v1/tenant/usuarios/${id}/toggle`,
      undefined,
      T
    ),

  /** Ver permisos de un usuario */
  getPermisos: (id: number) =>
    apiClient.get<{ permisos: string[] }>(`/v1/tenant/usuarios/${id}/permisos`, T),

  /** Actualizar permisos */
  updatePermisos: (id: number, payload: PermisosPayload) =>
    apiClient.put<{ message: string; permisos: string[] }>(
      `/v1/tenant/usuarios/${id}/permisos`,
      payload,
      T
    ),

  /** Revocar todos los permisos */
  deletePermisos: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/usuarios/${id}/permisos`, T),
};
