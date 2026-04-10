/**
 * API — Nómina, Liquidaciones, Préstamos, Permisos, Ausencias
 */

import { apiClient, PaginatedResponse } from './client';

const T = true;

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface Nomina {
  id: number;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  total?: number;
}

export interface Prestamo {
  id: number;
  colaborador_id: number;
  monto: number;
  cuotas: number;
  saldo: number;
  estado: string;
}

export interface Permiso {
  id: number;
  colaborador_id: number;
  fecha: string;
  tipo: string;
  motivo?: string;
  estado: string;
}

export interface Ausencia {
  id: number;
  colaborador_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  tipo: string;
  motivo?: string;
}

export interface Vacacion {
  id: number;
  colaborador_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: string;
}

export const nominaApi = {
  // ─── Nóminas ───────────────────────────────────────────────────────────────
  getNominas: (params?: { search?: string; estado?: string; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Nomina>>(`/v1/tenant/nominas${toQuery(params)}`, T),

  getNomina: (id: number) =>
    apiClient.get<{ data: Nomina }>(`/v1/tenant/nominas/${id}`, T),

  createNomina: (payload: Partial<Nomina>) =>
    apiClient.post<{ data: Nomina; message: string }>('/v1/tenant/nominas', payload, T),

  cerrarNomina: (id: number) =>
    apiClient.patch<{ message: string }>(`/v1/tenant/nominas/${id}/cerrar`, undefined, T),

  getDesprendible: (nominaId: number, colaboradorId: number) =>
    apiClient.get<{ data: Record<string, unknown> }>(
      `/v1/tenant/nominas/${nominaId}/desprendible/${colaboradorId}`, T
    ),

  // ─── Liquidaciones ─────────────────────────────────────────────────────────
  getLiquidaciones: (params?: { per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Record<string, unknown>>>(
      `/v1/tenant/liquidaciones${toQuery(params)}`, T
    ),

  createLiquidacion: (payload: Record<string, unknown>) =>
    apiClient.post<{ data: Record<string, unknown>; message: string }>(
      '/v1/tenant/liquidaciones', payload, T
    ),

  // ─── Préstamos ─────────────────────────────────────────────────────────────
  getPrestamos: (params?: { colaborador_id?: number; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Prestamo>>(`/v1/tenant/prestamos${toQuery(params)}`, T),

  createPrestamo: (payload: Partial<Prestamo>) =>
    apiClient.post<{ data: Prestamo; message: string }>('/v1/tenant/prestamos', payload, T),

  updatePrestamo: (id: number, payload: Partial<Prestamo>) =>
    apiClient.put<{ data: Prestamo }>(`/v1/tenant/prestamos/${id}`, payload, T),

  // ─── Permisos laborales ────────────────────────────────────────────────────
  getPermisos: (params?: { colaborador_id?: number; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Permiso>>(`/v1/tenant/permisos${toQuery(params)}`, T),

  createPermiso: (payload: Partial<Permiso>) =>
    apiClient.post<{ data: Permiso; message: string }>('/v1/tenant/permisos', payload, T),

  updatePermiso: (id: number, payload: Partial<Permiso>) =>
    apiClient.put<{ data: Permiso }>(`/v1/tenant/permisos/${id}`, payload, T),

  // ─── Ausencias ─────────────────────────────────────────────────────────────
  getAusencias: (params?: { colaborador_id?: number; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Ausencia>>(`/v1/tenant/ausencias${toQuery(params)}`, T),

  createAusencia: (payload: Partial<Ausencia>) =>
    apiClient.post<{ data: Ausencia; message: string }>('/v1/tenant/ausencias', payload, T),

  updateAusencia: (id: number, payload: Partial<Ausencia>) =>
    apiClient.put<{ data: Ausencia }>(`/v1/tenant/ausencias/${id}`, payload, T),

  // ─── Vacaciones ────────────────────────────────────────────────────────────
  getVacaciones: (params?: { colaborador_id?: number; per_page?: number; page?: number }) =>
    apiClient.get<PaginatedResponse<Vacacion>>(`/v1/tenant/vacaciones${toQuery(params)}`, T),

  createVacacion: (payload: Partial<Vacacion>) =>
    apiClient.post<{ data: Vacacion; message: string }>('/v1/tenant/vacaciones', payload, T),

  updateVacacion: (id: number, payload: Partial<Vacacion>) =>
    apiClient.put<{ data: Vacacion }>(`/v1/tenant/vacaciones/${id}`, payload, T),
};
