/**
 * API — Configuración
 * Perfil de usuario, datos de la finca y tablas paramétricas
 * (semillas, insumos, cargos, labores, conceptos de nómina, etc.)
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

export interface ParametricaParams {
  search?: string;
  estado?: boolean;
  per_page?: number;
  page?: number;
}

// ─── Perfil y Finca ───────────────────────────────────────────────────────────

export interface EditarFincaPayload {
  nombre?: string;
  tipo_persona?: 'NATURAL' | 'JURIDICA';
  nit?: string;
  razon_social?: string;
  correo_contacto?: string;
  telefono?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
  logo?: File;
}

export interface EditarPerfilPayload {
  name?: string;
  email?: string;
}

export interface CambiarPasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// ─── Paramétricas ─────────────────────────────────────────────────────────────

export interface Semilla { id: number; nombre: string; tipo?: string; estado: boolean; }
export interface Insumo { id: number; nombre: string; unidad?: string; estado: boolean; }
export interface Cargo { id: number; nombre: string; estado: boolean; }
export interface Labor { id: number; nombre: string; unidad?: string; estado: boolean; }
export interface ConceptoNomina { id: number; nombre: string; tipo: string; estado: boolean; }
export interface TablaLegal { id: number; nombre: string; valor?: number; vigencia?: string; }
export interface PrecioCosecha { id: number; fecha: string; precio: number; }
export interface LaborFija { id: number; nombre: string; valor: number; estado: boolean; }
export interface EscalaAbonada { id: number; nivel: string; valor: number; }
export interface Promedio { id: number; nombre: string; valor: number; }

export const configuracionApi = {
  // ─── Finca / Perfil ──────────────────────────────────────────────────────

  editarFinca: (payload: EditarFincaPayload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as string | Blob);
    });
    return apiClient.putForm<{ message: string }>('/v1/tenant/configuracion/finca', form, T);
  },

  editarPerfil: (payload: EditarPerfilPayload) =>
    apiClient.put<{ message: string }>('/v1/tenant/perfil', payload, T),

  cambiarPassword: (payload: CambiarPasswordPayload) =>
    apiClient.put<{ message: string }>('/v1/tenant/perfil/password', payload, T),

  // ─── Semillas ────────────────────────────────────────────────────────────

  getSemillas: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<Semilla>>(`/v1/tenant/semillas${toQuery(params)}`, T),
  getSemilla: (id: number) =>
    apiClient.get<{ data: Semilla }>(`/v1/tenant/semillas/${id}`, T),
  createSemilla: (payload: Partial<Semilla>) =>
    apiClient.post<{ data: Semilla }>('/v1/tenant/semillas', payload, T),
  updateSemilla: (id: number, payload: Partial<Semilla>) =>
    apiClient.put<{ data: Semilla }>(`/v1/tenant/semillas/${id}`, payload, T),
  deleteSemilla: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/semillas/${id}`, T),

  // ─── Insumos ─────────────────────────────────────────────────────────────

  getInsumos: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<Insumo>>(`/v1/tenant/insumos${toQuery(params)}`, T),
  getInsumo: (id: number) =>
    apiClient.get<{ data: Insumo }>(`/v1/tenant/insumos/${id}`, T),
  createInsumo: (payload: Partial<Insumo>) =>
    apiClient.post<{ data: Insumo }>('/v1/tenant/insumos', payload, T),
  updateInsumo: (id: number, payload: Partial<Insumo>) =>
    apiClient.put<{ data: Insumo }>(`/v1/tenant/insumos/${id}`, payload, T),
  deleteInsumo: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/insumos/${id}`, T),

  // ─── Cargos ──────────────────────────────────────────────────────────────

  getCargos: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<Cargo>>(`/v1/tenant/cargos${toQuery(params)}`, T),
  getCargo: (id: number) =>
    apiClient.get<{ data: Cargo }>(`/v1/tenant/cargos/${id}`, T),
  createCargo: (payload: Partial<Cargo>) =>
    apiClient.post<{ data: Cargo }>('/v1/tenant/cargos', payload, T),
  updateCargo: (id: number, payload: Partial<Cargo>) =>
    apiClient.put<{ data: Cargo }>(`/v1/tenant/cargos/${id}`, payload, T),
  deleteCargo: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/cargos/${id}`, T),

  // ─── Labores ─────────────────────────────────────────────────────────────

  getLabores: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<Labor>>(`/v1/tenant/labores${toQuery(params)}`, T),
  getLabor: (id: number) =>
    apiClient.get<{ data: Labor }>(`/v1/tenant/labores/${id}`, T),
  createLabor: (payload: Partial<Labor>) =>
    apiClient.post<{ data: Labor }>('/v1/tenant/labores', payload, T),
  updateLabor: (id: number, payload: Partial<Labor>) =>
    apiClient.put<{ data: Labor }>(`/v1/tenant/labores/${id}`, payload, T),
  deleteLabor: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/labores/${id}`, T),

  // ─── Conceptos de Nómina ─────────────────────────────────────────────────

  getConceptosNomina: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<ConceptoNomina>>(
      `/v1/tenant/conceptos-nomina${toQuery(params)}`, T),
  createConceptoNomina: (payload: Partial<ConceptoNomina>) =>
    apiClient.post<{ data: ConceptoNomina }>('/v1/tenant/conceptos-nomina', payload, T),
  updateConceptoNomina: (id: number, payload: Partial<ConceptoNomina>) =>
    apiClient.put<{ data: ConceptoNomina }>(`/v1/tenant/conceptos-nomina/${id}`, payload, T),
  deleteConceptoNomina: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/conceptos-nomina/${id}`, T),

  // ─── Tablas Legales ───────────────────────────────────────────────────────

  getTablasLegales: () =>
    apiClient.get<{ data: TablaLegal[] }>('/v1/tenant/tablas-legales', T),
  updateTablaLegal: (id: number, payload: Partial<TablaLegal>) =>
    apiClient.put<{ data: TablaLegal }>(`/v1/tenant/tablas-legales/${id}`, payload, T),

  // ─── Precios de Cosecha ───────────────────────────────────────────────────

  getPreciosCosecha: (params?: ParametricaParams) =>
    apiClient.get<PaginatedResponse<PrecioCosecha>>(
      `/v1/tenant/precios-cosecha${toQuery(params)}`, T),
  createPrecioCosecha: (payload: Partial<PrecioCosecha>) =>
    apiClient.post<{ data: PrecioCosecha }>('/v1/tenant/precios-cosecha', payload, T),
  updatePrecioCosecha: (id: number, payload: Partial<PrecioCosecha>) =>
    apiClient.put<{ data: PrecioCosecha }>(`/v1/tenant/precios-cosecha/${id}`, payload, T),
  deletePrecioCosecha: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/tenant/precios-cosecha/${id}`, T),

  // ─── Labores Fijas ────────────────────────────────────────────────────────

  getLaborsFijas: () =>
    apiClient.get<{ data: LaborFija[] }>('/v1/tenant/labores-fijas', T),
  updateLaborFija: (id: number, payload: Partial<LaborFija>) =>
    apiClient.put<{ data: LaborFija }>(`/v1/tenant/labores-fijas/${id}`, payload, T),

  // ─── Escala Abonada ───────────────────────────────────────────────────────

  getEscalaAbonada: () =>
    apiClient.get<{ data: EscalaAbonada[] }>('/v1/tenant/escala-abonada', T),
  updateEscalaAbonada: (id: number, payload: Partial<EscalaAbonada>) =>
    apiClient.put<{ data: EscalaAbonada }>(`/v1/tenant/escala-abonada/${id}`, payload, T),

  // ─── Promedios ────────────────────────────────────────────────────────────

  getPromedios: () =>
    apiClient.get<{ data: Promedio[] }>('/v1/tenant/promedios', T),
  updatePromedio: (id: number, payload: Partial<Promedio>) =>
    apiClient.put<{ data: Promedio }>(`/v1/tenant/promedios/${id}`, payload, T),
};
