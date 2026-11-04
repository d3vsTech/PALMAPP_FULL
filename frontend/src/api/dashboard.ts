/**
 * api/dashboard.ts
 * Dashboard Tenant — GET /api/v1/tenant/dashboard
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

function qs(p: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Los cinco que admite el endpoint (API_DASHBOARD.md). */
export type PeriodoDashboard = 'semanal' | 'quincenal' | 'mensual' | 'anual' | 'personalizado';

/** La quincena del mes: `1` es del 1 al 15; `2`, del 16 al último día. */
export type QuincenaDashboard = 1 | 2;

/**
 * Parámetros de `GET /dashboard`.
 *
 * Mismo calendario que operaciones y viajes desde el 2026-11-03, pero ojo con
 * los nombres: aquí el rango a la medida va en `fecha_inicio` / `fecha_fin`,
 * no en `fecha_desde` / `fecha_hasta`. Las anclas son opcionales: sin ellas el
 * backend resuelve el período sobre hoy, y la que no aplica se ignora.
 */
export interface ParamsDashboard {
  periodo?: PeriodoDashboard;
  /** `YYYY-MM`. Fija el mes en `mensual` y `quincenal`. */
  mes?: string;
  /** Solo en `quincenal`. */
  quincena?: QuincenaDashboard;
  /** Solo en `anual`. */
  anio?: number;
  /** Los dos, y solo en `personalizado`. */
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface DashboardData {
  periodo: { tipo: PeriodoDashboard; fecha_inicio: string; fecha_fin: string };
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
  get: (params: ParamsDashboard = {}) =>
    requestConToken<{ data: DashboardData }>(
      `/api/v1/tenant/dashboard${qs(params as Record<string, unknown>)}`,
      { method: 'GET' },
      tkn()
    ),
};