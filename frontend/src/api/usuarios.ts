/**
 * API — Usuarios del Tenant
 * Alineada a docs/API_USUARIOS_TENANT.md.
 * Base: /api/v1/tenant/usuarios
 * Headers: Authorization Bearer + X-Tenant-Id (apiClient los agrega).
 */

import { apiClient } from './client';

const T = true;

export interface UsuarioTenant {
  id: number;
  name: string;
  email: string;
  /** Estado global del usuario (`true`=activo). */
  status: boolean;
  /** Si es ADMIN de la finca (creado por el super_admin). Read-only. */
  is_admin: boolean;
  /** Estado de la relación usuario↔tenant (`true`=acceso a la finca). */
  estado: boolean;
  asignado_at: string;
}

export interface ResumenUsuarios {
  /** Totales globales del tenant — NO se ven afectados por filtros. */
  total: number;
  activos: number;
  inactivos: number;
}

export interface ListUsuariosResponse {
  data: UsuarioTenant[];
  resumen: ResumenUsuarios;
}

/**
 * Body para POST /usuarios. El backend acepta dos variantes:
 *  - Crear nuevo: `{ name, email, password }`
 *  - Asignar existente: `{ user_id }`
 * Los usuarios siempre se crean como USUARIO (sin permisos); el ADMIN
 * los asigna después con PUT /usuarios/{id}/permisos.
 */
export type CreateUsuarioPayload =
  | { name: string; email: string; password: string }
  | { user_id: number };

export interface UpdateUsuarioPayload {
  name?: string;
  email?: string;
  /** Nueva contraseña (mín. 8). Omitir o `null` para no cambiarla. */
  password?: string | null;
  /** Estado de la relación con el tenant. */
  estado?: boolean;
}

export interface PermisosPayload {
  permisos: string[];
}

export interface PermisosResponse {
  user_id: number;
  user_name: string;
  is_admin: boolean;
  /** Permisos asignados directamente (vacío para ADMIN). Editables. */
  permisos_directos: string[];
  /** Lo que el usuario realmente puede hacer (todos para ADMIN). */
  permisos_efectivos: string[];
  /** Catálogo completo del sistema (para renderizar checkboxes). */
  permisos_disponibles: string[];
  /** Mapa de auto-asignación: padre → hijos. */
  dependencias: Record<string, string[]>;
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

  /** Ver permisos de un usuario (GET /usuarios/{id}/permisos). */
  getPermisos: (id: number) =>
    apiClient.get<PermisosResponse>(`/v1/tenant/usuarios/${id}/permisos`, T),

  /** Asignar permisos directos (PUT /usuarios/{id}/permisos). */
  updatePermisos: (id: number, payload: PermisosPayload) =>
    apiClient.put<{
      message: string;
      permisos_directos: string[];
      permisos_efectivos: string[];
    }>(`/v1/tenant/usuarios/${id}/permisos`, payload, T),

  /** Revocar todos los permisos directos del usuario. */
  deletePermisos: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/usuarios/${id}/permisos`, T),
};

/** Códigos de error que retorna el backend (campo `code` en la respuesta). */
export const UsuariosErrorCodes = {
  USER_ALREADY_ASSIGNED:    'USER_ALREADY_ASSIGNED',
  MAX_USERS_REACHED:        'MAX_USERS_REACHED',
  USER_NOT_IN_TENANT:       'USER_NOT_IN_TENANT',
  SELF_REMOVE_DENIED:       'SELF_REMOVE_DENIED',
  SELF_TOGGLE_DENIED:       'SELF_TOGGLE_DENIED',
  SELF_PERMISSION_DENIED:   'SELF_PERMISSION_DENIED',
  ADMIN_PERMISSION_DENIED:  'ADMIN_PERMISSION_DENIED',
} as const;
