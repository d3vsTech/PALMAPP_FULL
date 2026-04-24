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

export interface EmpresaTransportadoraSelect {
  id: number;
  razon_social: string;
  nit: string;
}

export interface TransportadorSelect {
  id: number;
  empresa_transportadora_id: number;
  nombres: string;
  apellidos: string;
  placa_vehiculo: string;
  tipo_vehiculo?: string | null;
  capacidad_kg?: string | null;
}

export interface ExtractoraSelect {
  id: number;
  razon_social: string;
  nit: string;
  ubicacion: string;
  ciudad?: string | null;
  distancia_km?: string | null;
}

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

export interface Viaje {
  id: number;
  remision: string;
  fecha_viaje: string;
  hora_salida: string;
  estado: EstadoViajeApi;
  placa_vehiculo: string;
  nombre_conductor: string;
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
  fecha_viaje: string;
  hora_salida: string;
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

export interface OperacionDisponible {
  id: number;
  fecha: string;
  estado: string;
  cosechas_disponibles_count: number;
}

export interface CosechaLibre {
  id: number;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado?: string | null;
  cuadrilla_count?: number;
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
}

export interface HidratarReconteoPayload {
  gajos_reconteo: number;
  peso_confirmado?: number | null;
}

export interface AprobarReconteoResponse {
  detalle_id: number;
  reconteo_aprobado: boolean;
  viaje_estado: EstadoViajeApi;
  auto_despachado: boolean;
}

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

export const empresasTransportadorasApi = {
  select: () =>
    get<{ data: EmpresaTransportadoraSelect[] }>('/empresas-transportadoras/select'),
  transportadoresDe: (empresaId: number) =>
    get<{ data: TransportadorSelect[] }>(`/empresas-transportadoras/${empresaId}/transportadores`),
};

export const extractorasApi = {
  select: () => get<{ data: ExtractoraSelect[] }>('/extractoras/select'),
};

export const viajesApi = {
  listar: (params?: ListarViajesParams) =>
    get<ListadoViajesResponse>('/viajes', params as Record<string, unknown>),

  indicadores: (params?: IndicadoresParams) =>
    get<{ data: IndicadoresViajes }>('/viajes/indicadores', params as Record<string, unknown>),

  operacionesDisponibles: (params?: { search?: string; fecha_desde?: string; fecha_hasta?: string }) =>
    get<{ data: OperacionDisponible[] }>('/viajes/operaciones-disponibles', params),

  cosechasLibresDeOperacion: (operacionId: number) =>
    get<{ data: CosechaLibre[] }>(`/viajes/operaciones/${operacionId}/cosechas`),

  crear: (payload: CrearViajePayload) =>
    post<{ data: Viaje }>('/viajes', payload),

  ver: (id: number) => get<{ data: Viaje }>(`/viajes/${id}`),

  editar: (id: number, payload: EditarViajePayload) =>
    put<{ data: Viaje }>(`/viajes/${id}`, payload),

  eliminar: (id: number) => del<{ message: string }>(`/viajes/${id}`),

  agregarDetalle: (viajeId: number, cosechaId: number) =>
    post<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles`, { cosecha_id: cosechaId }),

  eliminarDetalle: (viajeId: number, detalleId: number) =>
    del<{ message: string }>(`/viajes/${viajeId}/detalles/${detalleId}`),

  hidratarReconteo: (viajeId: number, detalleId: number, payload: HidratarReconteoPayload) =>
    put<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles/${detalleId}/reconteo`, payload),

  aprobarReconteo: (viajeId: number, detalleId: number) =>
    post<{ data: AprobarReconteoResponse }>(`/viajes/${viajeId}/detalles/${detalleId}/aprobar-reconteo`),

  llegadaPlanta: (id: number, pesoViaje: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/llegada-planta`, { peso_viaje: pesoViaje }),

  finalizar: (id: number) => post<{ data: Viaje }>(`/viajes/${id}/finalizar`),
};

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

export function parseFechaAPI(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  if (fecha.includes('T') || fecha.includes('Z')) {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(fecha + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}