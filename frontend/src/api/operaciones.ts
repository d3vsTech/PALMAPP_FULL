/**
 * API — Operaciones
 * Planillas diarias de trabajo en campo.
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

export interface Planilla {
  id: number;
  fecha: string;
  lote_id?: number;
  lote?: { id: number; nombre: string };
  estado: string;
  total_jornales?: number;
  created_at: string;
}

export interface LineaPlanilla {
  id?: number;
  colaborador_id: number;
  labor_id: number;
  cantidad: number;
  valor_unitario?: number;
  total?: number;
}

export interface PlanillaPayload {
  fecha: string;
  lote_id?: number;
  lineas: LineaPlanilla[];
}

export const operacionesApi = {
  getPlanillas: (params?: {
    search?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<Planilla>>(`/v1/tenant/planillas${toQuery(params)}`, T),

  getPlanilla: (id: number) =>
    apiClient.get<{ data: Planilla & { lineas: LineaPlanilla[] } }>(
      `/v1/tenant/planillas/${id}`, T
    ),

  createPlanilla: (payload: PlanillaPayload) =>
    apiClient.post<{ data: Planilla; message: string }>('/v1/tenant/planillas', payload, T),

  updatePlanilla: (id: number, payload: Partial<PlanillaPayload>) =>
    apiClient.put<{ data: Planilla; message: string }>(
      `/v1/tenant/planillas/${id}`, payload, T
    ),

  cerrarPlanilla: (id: number) =>
    apiClient.patch<{ message: string }>(`/v1/tenant/planillas/${id}/cerrar`, undefined, T),

  deletePlanilla: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/planillas/${id}`, T),
};
