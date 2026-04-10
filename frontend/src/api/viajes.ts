/**
 * API — Viajes / Remisiones
 * Transporte y remisión de cosecha.
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

export interface Viaje {
  id: number;
  numero_remision?: string;
  fecha: string;
  origen?: string;
  destino?: string;
  conductor?: string;
  placa?: string;
  peso_bruto?: number;
  peso_tara?: number;
  peso_neto?: number;
  precio_kilo?: number;
  total?: number;
  estado: string;
  lote_id?: number;
  lote?: { id: number; nombre: string };
}

export interface ViajePayload {
  fecha: string;
  origen?: string;
  destino?: string;
  conductor?: string;
  placa?: string;
  peso_bruto?: number;
  peso_tara?: number;
  precio_kilo?: number;
  lote_id?: number;
  estado?: string;
}

export const viajesApi = {
  getViajes: (params?: {
    search?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<Viaje>>(`/v1/tenant/viajes${toQuery(params)}`, T),

  getViaje: (id: number) =>
    apiClient.get<{ data: Viaje }>(`/v1/tenant/viajes/${id}`, T),

  createViaje: (payload: ViajePayload) =>
    apiClient.post<{ data: Viaje; message: string }>('/v1/tenant/viajes', payload, T),

  updateViaje: (id: number, payload: Partial<ViajePayload>) =>
    apiClient.put<{ data: Viaje; message: string }>(`/v1/tenant/viajes/${id}`, payload, T),

  deleteViaje: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/viajes/${id}`, T),

  cerrarViaje: (id: number) =>
    apiClient.patch<{ message: string }>(`/v1/tenant/viajes/${id}/cerrar`, undefined, T),
};
