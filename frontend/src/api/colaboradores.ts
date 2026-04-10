/**
 * API — Colaboradores
 * Empleados de la finca: creación, contratos, estado laboral.
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

export interface Colaborador {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono?: string;
  correo?: string;
  cargo_id?: number;
  cargo?: { id: number; nombre: string };
  estado: boolean;
  fecha_ingreso?: string;
  tipo_contrato?: string;
  salario_base?: number;
}

export interface ColaboradorPayload {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono?: string;
  correo?: string;
  cargo_id?: number;
  fecha_ingreso?: string;
  tipo_contrato?: string;
  salario_base?: number;
}

export interface Contrato {
  id: number;
  colaborador_id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin?: string;
  salario: number;
  estado: boolean;
}

export const colaboradoresApi = {
  getColaboradores: (params?: {
    search?: string;
    estado?: boolean;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<PaginatedResponse<Colaborador>>(
      `/v1/tenant/colaboradores${toQuery(params)}`, T
    ),

  getColaborador: (id: number) =>
    apiClient.get<{ data: Colaborador }>(`/v1/tenant/colaboradores/${id}`, T),

  createColaborador: (payload: ColaboradorPayload) =>
    apiClient.post<{ data: Colaborador; message: string }>(
      '/v1/tenant/colaboradores', payload, T
    ),

  updateColaborador: (id: number, payload: Partial<ColaboradorPayload>) =>
    apiClient.put<{ data: Colaborador; message: string }>(
      `/v1/tenant/colaboradores/${id}`, payload, T
    ),

  toggleColaborador: (id: number) =>
    apiClient.patch<{ message: string }>(
      `/v1/tenant/colaboradores/${id}/toggle`, undefined, T
    ),

  deleteColaborador: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/colaboradores/${id}`, T),

  // ─── Contratos ─────────────────────────────────────────────────────────────
  getContratos: (colaboradorId: number) =>
    apiClient.get<{ data: Contrato[] }>(
      `/v1/tenant/colaboradores/${colaboradorId}/contratos`, T
    ),

  createContrato: (colaboradorId: number, payload: Omit<Contrato, 'id' | 'colaborador_id'>) =>
    apiClient.post<{ data: Contrato }>(
      `/v1/tenant/colaboradores/${colaboradorId}/contratos`, payload, T
    ),

  updateContrato: (colaboradorId: number, contratoId: number, payload: Partial<Contrato>) =>
    apiClient.put<{ data: Contrato }>(
      `/v1/tenant/colaboradores/${colaboradorId}/contratos/${contratoId}`, payload, T
    ),
};
