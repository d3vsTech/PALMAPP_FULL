/**
 * api/dashboard.ts
 * Dashboard Tenant — GET /api/v1/tenant/dashboard
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

function qs(p: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v) q.append(k, v); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type PeriodoDashboard = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

export interface DashboardData {
  periodo: { fecha_inicio: string; fecha_fin: string };
  indicadores: { produccion_total_kg: number; promedio_kg_gajo: number };
  lotes: { id: number; codigo: string; nombre: string; kg_promedio: number }[];
  viajes: { id: number; remision: string; peso_viaje: number; fecha_viaje: string }[];
  lluvias: {
    semana_actual_mm: number;
    semana_anterior_mm: number;
    mes_actual_mm: number;
    promedio_mensual_historico_mm: number;
  };
}

export const dashboardApi = {
  get: (params: { periodo?: PeriodoDashboard; fecha_inicio?: string; fecha_fin?: string } = {}) =>
    requestConToken<{ data: DashboardData }>(
      `/api/v1/tenant/dashboard${qs(params as Record<string, string | undefined>)}`,
      { method: 'GET' },
      tkn()
    ),
};