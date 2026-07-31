/**
 * api/ajustesCosecha.ts
 *
 * Cliente del módulo "Ajuste de Gajos Pendientes" de Viajes.
 * Ver API_VIAJES.md §13.
 *
 * Concepto de "clavijo": gajos reportados en la planilla que nunca aparecen
 * físicamente en un camión. Cuando quedan pendientes durante 3+ viajes
 * FINALIZADOS, el sistema alerta al operador para decidir qué hacer:
 *
 *   - CLAVIJO      → nunca existieron. Baja `gajos_reconteo` al SUM asignado.
 *   - REASIGNADO   → sí existían; se agregan como split parcial a un viaje
 *                    en estado CREADO.
 *   - MANTENIDO    → silenciar N viajes más sin modificar cantidades.
 *
 * Endpoints (base `/api/v1/tenant`):
 *   GET  /viajes/ajuste-gajos/indicador
 *   GET  /viajes/ajuste-gajos
 *   GET  /viajes/ajuste-gajos/{cosecha}/viajes-disponibles
 *   POST /viajes/ajuste-gajos/{cosecha}
 */
import { requestConToken } from './request';

const BASE = '/api/v1/tenant/viajes/ajuste-gajos';

function tkn() { return localStorage.getItem('palmapp_token'); }

function get<T>(path: string): Promise<T> {
  return requestConToken<T>(path, { method: 'GET' }, tkn());
}
function post<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }, tkn());
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Accion = 'CLAVIJO' | 'REASIGNADO' | 'MANTENIDO';

/** Códigos de error del backend (§13.12). */
export const AjusteGajosErrorCodes = {
  SIN_GAJOS_PENDIENTES: 'SIN_GAJOS_PENDIENTES',
  VIAJE_NOT_FOUND: 'VIAJE_NOT_FOUND',
  VIAJE_NO_EDITABLE: 'VIAJE_NO_EDITABLE',
  COSECHA_YA_ASIGNADA: 'COSECHA_YA_ASIGNADA',
} as const;

export interface IndicadorAgregado {
  cosechas_afectadas: number;
  gajos_pendientes_total: number;
  peso_estimado_total: number;
}

export interface UltimoAjuste {
  id: number;
  accion: Accion;
  motivo: string;
  created_at: string;
  ajustado_por?: { id: number; name: string } | null;
}

export interface CosechaConAjustePendiente {
  id: number;
  lote: { id: number; nombre: string } | null;
  sublote: { id: number; nombre: string } | null;
  operacion: { id: number; fecha: string };
  reportado_por: { id: number; name: string } | null;
  gajos_reportados: number;
  gajos_reconteo: number | null;
  gajos_en_viajes: number;
  gajos_pendientes: number;
  viajes_transcurridos: number;
  peso_estimado_perdido: number | null;
  ultimo_ajuste: UltimoAjuste | null;
}

export interface AjustesPendientesResponse {
  data: {
    indicador: IndicadorAgregado;
    cosechas: CosechaConAjustePendiente[];
  };
}

export interface ViajeDisponible {
  id: number;
  remision: string;
  fecha_viaje: string;
  placa_vehiculo: string;
  nombre_conductor: string;
  extractora_id: number;
}

export interface AplicarAjustePayload {
  accion: Accion;
  motivo: string;
  /** Requerido si `accion = REASIGNADO`. Viaje destino (estado CREADO). */
  viaje_destino_id?: number;
  /** Requerido si `accion = MANTENIDO`. Entero entre 1 y 20. */
  silenciar_viajes?: number;
}

export interface RegistroAjusteResponse {
  message: string;
  data: {
    id: number;
    cosecha_id: number;
    accion: Accion;
    gajos_pendientes: number;
    motivo: string;
    ajustado_por: { id: number; name: string } | null;
    viaje_destino: { id: number; remision: string } | null;
    created_at: string;
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const ajustesCosechaApi = {
  /**
   * Conteo simple para el banner de alerta.
   * GET /viajes/ajuste-gajos/indicador
   */
  indicador: () =>
    get<{ data: { count: number } }>(`${BASE}/indicador`),

  /**
   * Listado completo con indicador agregado y cosechas afectadas.
   * GET /viajes/ajuste-gajos
   */
  listar: () =>
    get<AjustesPendientesResponse>(`${BASE}`),

  /**
   * Viajes en estado CREADO que no tienen esta cosecha asignada.
   * Alimenta el dropdown de la acción REASIGNADO.
   * GET /viajes/ajuste-gajos/{cosecha}/viajes-disponibles
   */
  viajesDisponibles: (cosechaId: number) =>
    get<{ data: ViajeDisponible[] }>(`${BASE}/${cosechaId}/viajes-disponibles`),

  /**
   * Aplica un ajuste sobre la cosecha.
   * POST /viajes/ajuste-gajos/{cosecha}
   */
  aplicar: (cosechaId: number, payload: AplicarAjustePayload) =>
    post<RegistroAjusteResponse>(`${BASE}/${cosechaId}`, payload),
};

// ─── Etiquetas UI ────────────────────────────────────────────────────────────

export const ACCION_AJUSTE_LABEL: Record<Accion, { label: string; color: string; descripcion: string }> = {
  CLAVIJO: {
    label: 'Clavijo',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    descripcion: 'Los gajos nunca existieron (clavijos). Se baja el reconteo al total real asignado.',
  },
  REASIGNADO: {
    label: 'Reasignado a otro viaje',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    descripcion: 'Los gajos sí existían; se agregan como split parcial al viaje seleccionado.',
  },
  MANTENIDO: {
    label: 'Mantenido pendiente',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    descripcion: 'Silencia la alerta N viajes más; no modifica cantidades.',
  },
};
