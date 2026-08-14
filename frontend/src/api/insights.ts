/**
 * api/insights.ts
 *
 * Cliente del módulo "Insights con IA" — diagnóstico operativo automatizado
 * usando Claude (Anthropic) desde el backend. Ver API_INSIGHTS.md.
 *
 * Flujo end-to-end:
 *   1. `insightsApi.generar({...})` → 202 + poll_url
 *   2. `insightsApi.esperar(id)` hace polling cada 3s hasta terminal
 *   3. Cuando estado === 'COMPLETADO', trae alertas, recomendaciones, hallazgos
 *
 * Idempotencia: dentro de 30 min, mismo scope+período devuelve el mismo id
 * con `reused: true` — no llama a Claude ni cobra tokens.
 */
import { requestConToken } from './request';

const BASE = '/api/v1/tenant';

function tkn() { return localStorage.getItem('palmapp_token'); }

function toQuery(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`${BASE}${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}
function patch<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`${BASE}${path}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, tkn());
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Severidad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type EstadoInsight = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';
export type EstadoAlerta = 'ACTIVA' | 'RESUELTA' | 'DESCARTADA';
export type EstadoRecomendacion = 'PENDIENTE' | 'APLICADA' | 'DESCARTADA';
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';
export type ScopeTipo = 'TENANT' | 'PREDIO' | 'LOTE';
/** El backend valida en MAYÚSCULAS aunque los ejemplos de la doc los
 *  muestran en minúsculas. La regla efectiva es `in:SEMANAL,MENSUAL,ANUAL,CUSTOM`. */
export type PeriodoTipo = 'SEMANAL' | 'MENSUAL' | 'ANUAL' | 'CUSTOM';

/** 8 dominios habilitados en Fase 2 (§4 API_INSIGHTS). */
export type Dominio =
  | 'rendimiento_lotes'
  | 'calidad_post_cosecha'
  | 'friccion_laboral'
  | 'cobertura_agronomica'
  | 'calidad_medicion'
  | 'contratistas_vs_propios'
  | 'impacto_lluvia'
  | 'comparativa_ano_ano';

/** KPI objetivo para las recomendaciones (§5 API_INSIGHTS). */
export type KpiObjetivo =
  | 'kg_totales'
  | 'kg_gajo'
  | 'verde_pct'
  | 'sobre_maduro_pct'
  | 'podrido_pct'
  | 'costo_por_palma'
  | 'dias_sin_labor'
  | 'delta_medicion_pct'
  | 'horas_extra_semanales';

export interface Alerta {
  id: number;
  severidad: Severidad;
  dominio: Dominio;
  titulo: string;
  descripcion: string;
  confianza: string | null;
  evidencia: Record<string, unknown>;
  lote_id: number | null;
  predio_id: number | null;
  empleado_id: number | null;
  viaje_id: number | null;
  fecha_evidencia: string | null;
  metrica: string | null;
  valor: string | null;
  umbral: string | null;
  estado: EstadoAlerta;
  /** Si false, el backend detectó que la IA citó ids no existentes en el
   *  snapshot. Se persiste con severidad reducida — el frontend debe
   *  pintar un badge ⚠ y no linkear a la entidad. */
  evidencia_verificada: boolean;
  resuelto_at?: string | null;
  comentario_resolucion?: string | null;
}

export interface Recomendacion {
  id: number;
  titulo: string;
  descripcion: string;
  dominio: Dominio;
  accion_sugerida: string;
  kpi_objetivo: KpiObjetivo | string | null;
  delta_pct_estimado: string | null;
  horizonte_dias: number | null;
  prioridad: Prioridad;
  estado: EstadoRecomendacion;
  aplicada_at?: string | null;
  comentario_resolucion?: string | null;
}

export interface Hallazgo {
  dominio: Dominio;
  texto: string;
  evidencia?: Record<string, unknown>;
}

export interface Insight {
  id: number;
  estado: EstadoInsight;
  periodo_tipo: string;
  periodo_desde: string;
  periodo_hasta: string;
  scope_tipo: ScopeTipo;
  scope_ref_id: number | null;
  prompt_version: string;
  modelo: string | null;
  resumen_ejecutivo: string | null;
  costo_estimado_usd: string;
  intentos?: number;
  procesado_at: string | null;
  error_mensaje: string | null;
  created_at?: string;
  alertas?: Alerta[];
  recomendaciones?: Recomendacion[];
  hallazgos?: Hallazgo[];
}

export interface InsightListItem extends Omit<Insight, 'alertas' | 'recomendaciones' | 'hallazgos'> {
  alertas_count: number;
}

export interface GenerarInsightPayload {
  periodo_tipo: PeriodoTipo;
  /** Solo requerido si `periodo_tipo === 'custom'`. */
  periodo_desde?: string;
  periodo_hasta?: string;
  scope_tipo: ScopeTipo;
  /** Solo requerido si `scope_tipo` es `PREDIO` o `LOTE`. */
  scope_ref_id?: number;
}

export interface GenerarInsightResponse {
  id: number;
  estado: EstadoInsight;
  poll_url: string;
  /** True → reusó un insight reciente (30 min), no se llamó a Claude. */
  reused: boolean;
}

export interface ListarInsightsParams {
  estado?: EstadoInsight;
  scope_tipo?: ScopeTipo;
  periodo_desde?: string;
  periodo_hasta?: string;
  per_page?: number;
  page?: number;
}

/** §6 API_INSIGHTS. */
export const InsightErrorCodes = {
  RATE_LIMIT_USUARIO: 'RATE_LIMIT_USUARIO',
  RATE_LIMIT_TENANT: 'RATE_LIMIT_TENANT',
  ANTHROPIC_SIN_CONFIGURAR: 'ANTHROPIC_SIN_CONFIGURAR',
} as const;

// ─── API ─────────────────────────────────────────────────────────────────────

export const insightsApi = {
  /**
   * Dispara la generación de un nuevo insight.
   * POST /insights → 202 (nuevo) o 200 (reused).
   */
  generar: async (payload: GenerarInsightPayload): Promise<GenerarInsightResponse> => {
    const r = await post<{ data: GenerarInsightResponse }>('/insights', payload);
    return r.data;
  },

  /**
   * Consulta el estado o resultado completo de un insight.
   * GET /insights/{id}
   */
  ver: async (id: number): Promise<Insight> => {
    const r = await get<{ data: Insight }>(`/insights/${id}`);
    return r.data;
  },

  /**
   * Lista histórico de insights con filtros.
   * GET /insights
   */
  listar: (params?: ListarInsightsParams) =>
    get<{
      data: InsightListItem[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>('/insights', params as Record<string, unknown>),

  /**
   * Marca una alerta como RESUELTA o DESCARTADA.
   * PATCH /insights/alertas/{id}/estado
   */
  marcarAlerta: async (
    alertaId: number,
    estado: 'RESUELTA' | 'DESCARTADA',
    comentario?: string,
  ) => {
    const r = await patch<{ message: string; data: Alerta }>(
      `/insights/alertas/${alertaId}/estado`,
      comentario ? { estado, comentario } : { estado },
    );
    return r.data;
  },

  /**
   * Marca una recomendación como APLICADA o DESCARTADA.
   * PATCH /insights/recomendaciones/{id}/estado
   */
  marcarRecomendacion: async (
    recId: number,
    estado: 'APLICADA' | 'DESCARTADA',
    comentario?: string,
  ) => {
    const r = await patch<{ message: string; data: Recomendacion }>(
      `/insights/recomendaciones/${recId}/estado`,
      comentario ? { estado, comentario } : { estado },
    );
    return r.data;
  },

  /**
   * Helper: hace polling cada `delayMs` hasta que el insight llegue a un
   * estado terminal (COMPLETADO o FALLIDO). Timeout por defecto: 5 min.
   */
  esperar: async (
    id: number,
    opts?: { delayMs?: number; timeoutMs?: number; onProgress?: (i: Insight) => void },
  ): Promise<Insight> => {
    const delay = opts?.delayMs ?? 3000;
    const timeout = opts?.timeoutMs ?? 300_000;
    const inicio = Date.now();

    while (true) {
      const insight = await insightsApi.ver(id);
      opts?.onProgress?.(insight);
      if (insight.estado === 'COMPLETADO' || insight.estado === 'FALLIDO') {
        return insight;
      }
      if (Date.now() - inicio > timeout) {
        throw new Error('Timeout esperando insight');
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  },
};

// ─── Etiquetas UI ────────────────────────────────────────────────────────────

/** §5 API_INSIGHTS — colores sugeridos por severidad. */
export const SEVERIDAD_LABEL: Record<Severidad, { label: string; color: string; badgeClass: string }> = {
  CRITICA: {
    label: 'Crítica',
    color: '#DC2626',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
  },
  ALTA: {
    label: 'Alta',
    color: '#EA580C',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  MEDIA: {
    label: 'Media',
    color: '#CA8A04',
    badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  BAJA: {
    label: 'Baja',
    color: '#2563EB',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
  },
};

export const DOMINIO_LABEL: Record<Dominio, string> = {
  rendimiento_lotes: 'Rendimiento de lotes',
  calidad_post_cosecha: 'Calidad post-cosecha',
  friccion_laboral: 'Fricción laboral',
  cobertura_agronomica: 'Cobertura agronómica',
  calidad_medicion: 'Calidad de medición',
  contratistas_vs_propios: 'Contratistas vs propios',
  impacto_lluvia: 'Impacto de lluvia',
  comparativa_ano_ano: 'Comparativa año-año',
};

export const PRIORIDAD_LABEL: Record<Prioridad, { label: string; badgeClass: string }> = {
  ALTA: { label: 'Alta', badgeClass: 'bg-red-100 text-red-700 border-red-300' },
  MEDIA: { label: 'Media', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  BAJA: { label: 'Baja', badgeClass: 'bg-blue-100 text-blue-700 border-blue-300' },
};

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Devuelve true si el insight tiene menos de N horas de generado. */
export function esInsightReciente(insight: InsightListItem | Insight, horasMax = 24): boolean {
  const fecha = insight.procesado_at ?? insight.created_at;
  if (!fecha) return false;
  const diffMs = Date.now() - new Date(fecha).getTime();
  return diffMs < horasMax * 3600 * 1000;
}
