/**
 * API — Viajes (V1)
 * Base: /api/v1/tenant
 *
 * Contrato completo según API_VIAJES.md:
 *   - Selects paramétricos (empresas, transportadores, extractoras)
 *   - CRUD viajes
 *   - Máquina de estados: CREADO → EN_CAMINO → EN_PLANTA → FINALIZADO
 *   - Agregar/quitar cosechas (detalles)
 *   - Hidratar + aprobar reconteo (auto-despacho al último)
 *   - Llegada a planta, finalizar
 *   - Indicadores / KPIs
 */
import { requestConToken } from './request';

function tkn() { return localStorage.getItem('palmapp_token'); }

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${toQuery(params)}`, { method: 'GET' }, tkn());
}
async function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, tkn());
}
async function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
async function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
}

// ─── Tipos ──────────────────────────────────────────────────────────

export type EstadoViajeApi = 'CREADO' | 'EN_CAMINO' | 'EN_PLANTA' | 'FINALIZADO';

/** §4.1 Select empresa transportadora */
export interface EmpresaTransportadoraSelect {
  id: number;
  razon_social: string;
  nit: string;
}

/** §4.1 Lista de transportadores de una empresa */
export interface TransportadorSelect {
  id: number;
  empresa_transportadora_id: number;
  nombres: string;
  apellidos: string;
  placa_vehiculo: string;
  tipo_vehiculo?: string | null;
  capacidad_kg?: string | null;
}

/** §4.1 Select extractora */
export interface ExtractoraSelect {
  id: number;
  razon_social: string;
  nit: string;
  ubicacion: string;
  ciudad?: string | null;
  distancia_km?: string | null;
}

/** §2.5 Detalle de viaje (pivot con cosecha) */
export interface ViajeDetalle {
  id: number;
  viaje_id: number;
  cosecha_id: number;
  reconteo_aprobado: boolean;
  reconteo_aprobado_at?: string | null;
  reconteo_aprobado_por?: number | null;
  estado_activo?: boolean;
  cosecha?: {
    id: number;
    gajos_reportados: number;
    gajos_reconteo?: number | null;
    peso_confirmado?: string | null;
    cuadrilla_count?: number;
    lote?: { id: number; nombre: string };
    sublote?: { id: number; nombre: string };
  };
}

/** §2.4 + §5.1 response shape de viaje */
export interface Viaje {
  id: number;
  remision: string;
  fecha_viaje: string;               // "YYYY-MM-DD" (puede llegar como ISO)
  hora_salida: string;               // "HH:MM" o "HH:MM:SS"
  estado: EstadoViajeApi;
  placa_vehiculo: string;            // snapshot
  nombre_conductor: string;          // snapshot
  peso_viaje?: string | number | null;
  cantidad_gajos_total?: number | null;
  observaciones?: string | null;
  es_homogeneo: boolean;
  sync_uuid?: string | null;
  despachado_at?: string | null;
  llegada_planta_at?: string | null;
  finalizado_at?: string | null;
  transportador?: {
    id: number;
    nombres?: string;
    apellidos?: string;
    nombre_completo?: string;
    placa_vehiculo?: string;
  };
  empresa?: { id: number; razon_social: string };
  extractora?: { id: number; razon_social: string; ubicacion?: string };
  detalles?: ViajeDetalle[];
  detalles_count?: number;
}

export interface CrearViajePayload {
  fecha_viaje: string;        // YYYY-MM-DD
  hora_salida: string;        // HH:MM
  transportador_id: number;
  extractora_id: number;
  observaciones?: string | null;
  es_homogeneo?: boolean;
  sync_uuid?: string | null;
}

export interface EditarViajePayload {
  fecha_viaje?: string;
  hora_salida?: string;
  transportador_id?: number;
  extractora_id?: number;
  observaciones?: string | null;
  es_homogeneo?: boolean;
}

/** §5.2 Operación disponible con cosechas libres */
export interface OperacionDisponible {
  id: number;
  fecha: string;
  estado: string;
  cosechas_disponibles_count: number;
}

/** §5.3 Cosecha libre de una operación */
export interface CosechaLibre {
  id: number;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado?: string | null;
  cuadrilla_count?: number;
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
}

/** §5.5 Payload de hidratar reconteo */
export interface HidratarReconteoPayload {
  gajos_reconteo: number;
  peso_confirmado?: number | null;
}

/** §5.6 Response al aprobar reconteo */
export interface AprobarReconteoResponse {
  detalle_id: number;
  reconteo_aprobado: boolean;
  viaje_estado: EstadoViajeApi;
  auto_despachado: boolean;
}

/** §5.9 Indicadores / KPIs */
export interface IndicadoresViajes {
  periodo: 'MENSUAL' | 'SEMANAL' | 'ANUAL' | 'CUSTOM';
  desde: string;
  hasta: string;
  total_viajes: number;
  en_camino: number;
  finalizados: number;
  kilogramos_totales: string;
  gajos_totales: number;
}

/** §5.8 Listado paginado */
export interface ListadoViajesResponse {
  data: Viaje[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ListarViajesParams {
  remision?: string;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: EstadoViajeApi;
  vehiculo?: string;
  conductor?: string;
  extractora_id?: number;
  transportador_id?: number;
  empresa_transportadora_id?: number;
  page?: number;
  per_page?: number;
}

export interface IndicadoresParams {
  periodo?: 'MENSUAL' | 'SEMANAL' | 'ANUAL' | 'CUSTOM';
  desde?: string;
  hasta?: string;
}

// ─── Servicios ──────────────────────────────────────────────────────

/** §4.1 Paramétricas: empresas transportadoras */
export const empresasTransportadorasApi = {
  /** GET /empresas-transportadoras/select */
  select: () =>
    get<{ data: EmpresaTransportadoraSelect[] }>('/empresas-transportadoras/select'),

  /** GET /empresas-transportadoras/{empresa}/transportadores */
  transportadoresDe: (empresaId: number) =>
    get<{ data: TransportadorSelect[] }>(`/empresas-transportadoras/${empresaId}/transportadores`),
};

/** §4.1 Paramétricas: extractoras */
export const extractorasApi = {
  /** GET /extractoras/select */
  select: () => get<{ data: ExtractoraSelect[] }>('/extractoras/select'),
};

/** §4.2 Viajes */
export const viajesApi = {
  // ── Listado y KPIs ──────────────────────────────────────────────
  /** GET /viajes */
  listar: (params?: ListarViajesParams) =>
    get<ListadoViajesResponse>('/viajes', params as Record<string, unknown>),

  /** GET /viajes/indicadores */
  indicadores: (params?: IndicadoresParams) =>
    get<{ data: IndicadoresViajes }>('/viajes/indicadores', params as Record<string, unknown>),

  /** GET /viajes/operaciones-disponibles */
  operacionesDisponibles: (params?: { search?: string; fecha_desde?: string; fecha_hasta?: string }) =>
    get<{ data: OperacionDisponible[] }>('/viajes/operaciones-disponibles', params),

  /** GET /viajes/operaciones/{operacionId}/cosechas */
  cosechasLibresDeOperacion: (operacionId: number) =>
    get<{ data: CosechaLibre[] }>(`/viajes/operaciones/${operacionId}/cosechas`),

  // ── CRUD ────────────────────────────────────────────────────────
  /** POST /viajes */
  crear: (payload: CrearViajePayload) =>
    post<{ data: Viaje }>('/viajes', payload),

  /** GET /viajes/{id} */
  ver: (id: number) => get<{ data: Viaje }>(`/viajes/${id}`),

  /** PUT /viajes/{id} (solo estado CREADO) */
  editar: (id: number, payload: EditarViajePayload) =>
    put<{ data: Viaje }>(`/viajes/${id}`, payload),

  /** DELETE /viajes/{id} — soft delete */
  eliminar: (id: number) => del<{ message: string }>(`/viajes/${id}`),

  // ── Detalles (cosechas del viaje) ───────────────────────────────
  /** POST /viajes/{id}/detalles */
  agregarDetalle: (viajeId: number, cosechaId: number) =>
    post<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles`, { cosecha_id: cosechaId }),

  /** DELETE /viajes/{id}/detalles/{detalleId} */
  eliminarDetalle: (viajeId: number, detalleId: number) =>
    del<{ message: string }>(`/viajes/${viajeId}/detalles/${detalleId}`),

  // ── Reconteo ────────────────────────────────────────────────────
  /** PUT /viajes/{id}/detalles/{detalleId}/reconteo */
  hidratarReconteo: (viajeId: number, detalleId: number, payload: HidratarReconteoPayload) =>
    put<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles/${detalleId}/reconteo`, payload),

  /** POST /viajes/{id}/detalles/{detalleId}/aprobar-reconteo (auto-despacha al último) */
  aprobarReconteo: (viajeId: number, detalleId: number) =>
    post<{ data: AprobarReconteoResponse }>(`/viajes/${viajeId}/detalles/${detalleId}/aprobar-reconteo`),

  // ── Transiciones de estado ──────────────────────────────────────
  /** POST /viajes/{id}/llegada-planta — EN_CAMINO → EN_PLANTA */
  llegadaPlanta: (id: number, pesoViaje: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/llegada-planta`, { peso_viaje: pesoViaje }),

  /** POST /viajes/{id}/finalizar — EN_PLANTA → FINALIZADO */
  finalizar: (id: number) => post<{ data: Viaje }>(`/viajes/${id}/finalizar`),
};

// ─── Códigos de error (§9) ──────────────────────────────────────────
export const ErrorCodes = {
  VIAJE_NOT_FOUND: 'VIAJE_NOT_FOUND',
  DETALLE_NOT_FOUND: 'DETALLE_NOT_FOUND',
  VIAJE_ESTADO_INVALIDO: 'VIAJE_ESTADO_INVALIDO',
  VIAJE_NO_EDITABLE: 'VIAJE_NO_EDITABLE',
  DETALLE_APROBADO: 'DETALLE_APROBADO',
  VIAJE_INCOMPLETO: 'VIAJE_INCOMPLETO',
  RECONTEO_PENDIENTE: 'RECONTEO_PENDIENTE',
  REMISION_DUPLICADA: 'REMISION_DUPLICADA',
  COSECHA_FUERA_DE_VIAJE: 'COSECHA_FUERA_DE_VIAJE',
  COSECHA_YA_ASIGNADA: 'COSECHA_YA_ASIGNADA',
  OPERACION_NO_APROBADA: 'OPERACION_NO_APROBADA',
  TRANSPORTADOR_INACTIVO: 'TRANSPORTADOR_INACTIVO',
  EXTRACTORA_INACTIVA: 'EXTRACTORA_INACTIVA',
  MODULO_DESHABILITADO: 'MODULO_DESHABILITADO',
} as const;

// ─── Helper de fechas robusto ──────────────────────────────────────
/**
 * Parsea una fecha del API (puede venir como "2026-04-22", ISO "2026-04-22T00:00:00Z",
 * o ISO con timestamp completo). Retorna Date válido o null.
 */
export function parseFechaAPI(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  // Si ya trae 'T' o 'Z', es ISO
  if (fecha.includes('T') || fecha.includes('Z')) {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }
  // Solo YYYY-MM-DD: añadir hora para evitar timezone shift
  const d = new Date(fecha + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}