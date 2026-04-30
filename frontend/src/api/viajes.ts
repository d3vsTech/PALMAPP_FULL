/**
 * api/viajes.ts
 * Módulo de Viajes — contrato completo según API_VIAJES.md
 * Base: /api/v1/tenant  · Auth: Authorization Bearer + X-Tenant-Id
 */
import { requestConToken } from './request';

// ─── helpers ────────────────────────────────────────────────────────────────

function tkn() { return localStorage.getItem('palmapp_token'); }

function qs(p?: Record<string, unknown>): string {
  if (!p) return '';
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}${qs(params)}`, { method: 'GET' }, tkn());
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, tkn());
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'PUT', body: JSON.stringify(body) }, tkn());
}
function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
}

// ─── tipos ──────────────────────────────────────────────────────────────────

export type EstadoViajeApi = 'CREADO' | 'EN_CAMINO' | 'EN_PLANTA' | 'FINALIZADO';

/** Select de empresas transportadoras */
export interface EmpresaTransportadoraSelect {
  id: number;
  razon_social: string;
  nit: string;
}

/** Conductor devuelto por /empresas-transportadoras/{id}/transportadores */
export interface TransportadorSelect {
  id: number;
  empresa_transportadora_id: number;
  nombres: string;
  apellidos: string;
  placa_vehiculo: string;
  tipo_vehiculo?: string | null;
  capacidad_kg?: string | null;
}

/** Select de extractoras */
export interface ExtractoraSelect {
  id: number;
  razon_social: string;
  nit: string;
  ubicacion: string;
  ciudad?: string | null;
  distancia_km?: string | null;
}

/** Detalle (pivot viaje ↔ cosecha) */
export interface ViajeDetalle {
  id: number;
  viaje_id: number;
  cosecha_id: number;
  reconteo_aprobado: boolean;
  reconteo_aprobado_at?: string | null;
  reconteo_aprobado_por?: number | null;
  estado?: boolean;
  cosecha?: {
    id: number;
    gajos_reportados: number;
    gajos_reconteo?: number | null;
    peso_confirmado?: string | null;
    cuadrilla_count?: number;
    lote?: { id: number; nombre: string };
    sublote?: { id: number; nombre: string };
    cuadrilla?: Array<{ empleado_id: number }>;
  };
}

/** Viaje completo */
export interface Viaje {
  id: number;
  remision: string;
  fecha_viaje: string;
  hora_salida: string;
  estado: EstadoViajeApi;
  estado_activo?: boolean;
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

/** Payload para crear viaje */
export interface CrearViajePayload {
  fecha_viaje: string;
  hora_salida: string;
  transportador_id: number;
  extractora_id: number;
  observaciones?: string | null;
  es_homogeneo?: boolean;
  sync_uuid?: string | null;
}

/** Payload para editar viaje (todos opcionales; solo en estado CREADO) */
export interface EditarViajePayload {
  fecha_viaje?: string;
  hora_salida?: string;
  transportador_id?: number;
  extractora_id?: number;
  observaciones?: string | null;
  es_homogeneo?: boolean;
}

/** Operación APROBADA con cosechas disponibles */
export interface OperacionDisponible {
  id: number;
  fecha: string;
  estado: string;
  cosechas_disponibles_count: number;
}

/** Cosecha libre (sin viaje activo) de una operación */
export interface CosechaLibre {
  id: number;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado?: string | null;
  cuadrilla_count?: number;
  lote?: { id: number; nombre: string };
  sublote?: { id: number; nombre: string };
}

/** Payload para hidratar el reconteo de un detalle */
export interface HidratarReconteoPayload {
  gajos_reconteo: number;
  peso_confirmado?: number | null;
}

/** Respuesta de aprobar-reconteo */
export interface AprobarReconteoResponse {
  detalle_id: number;
  reconteo_aprobado: boolean;
  viaje_estado: EstadoViajeApi;
  auto_despachado: boolean;
}

/** KPIs del dashboard */
export interface IndicadoresViajes {
  periodo: string;
  desde: string;
  hasta: string;
  total_viajes: number;
  en_camino: number;
  finalizados: number;
  kilogramos_totales: string;
  gajos_totales: number;
}

/** Parámetros de listado */
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

/** Parámetros de indicadores */
export interface IndicadoresParams {
  periodo?: 'MENSUAL' | 'SEMANAL' | 'ANUAL' | 'CUSTOM';
  desde?: string;
  hasta?: string;
}

// ─── servicios ───────────────────────────────────────────────────────────────

/** Paramétricas: empresas transportadoras */
export const empresasTransportadorasApi = {
  /** GET /empresas-transportadoras/select — dropdown empresas */
  select: () =>
    get<{ data: EmpresaTransportadoraSelect[] }>('/empresas-transportadoras/select'),

  /** GET /empresas-transportadoras/{id}/transportadores — conductores de la empresa */
  transportadoresDe: (empresaId: number) =>
    get<{ data: TransportadorSelect[] }>(`/empresas-transportadoras/${empresaId}/transportadores`),
};

/** Paramétricas: extractoras */
export const extractorasApi = {
  /** GET /extractoras/select — dropdown extractoras */
  select: () =>
    get<{ data: ExtractoraSelect[] }>('/extractoras/select'),
};

/** CRUD + máquina de estados de viajes */
export const viajesApi = {
  // ── Listados ────────────────────────────────────────────────────────────

  /** GET /viajes — listado paginado con filtros */
  listar: (params?: ListarViajesParams) =>
    get<{ data: Viaje[]; meta?: any }>('/viajes', params as Record<string, unknown>),

  /** GET /viajes/indicadores — KPIs del dashboard */
  indicadores: (params?: IndicadoresParams) =>
    get<{ data: IndicadoresViajes }>('/viajes/indicadores', params as Record<string, unknown>),

  /** GET /viajes/operaciones-disponibles — operaciones APROBADAS con cosechas libres */
  operacionesDisponibles: (params?: { search?: string; fecha_desde?: string; fecha_hasta?: string }) =>
    get<{ data: OperacionDisponible[] }>('/viajes/operaciones-disponibles', params as Record<string, unknown>),

  /** GET /viajes/operaciones/{id}/cosechas — cosechas libres de una operación */
  cosechasLibresDeOperacion: (operacionId: number) =>
    get<{ data: CosechaLibre[] }>(`/viajes/operaciones/${operacionId}/cosechas`),

  // ── CRUD ────────────────────────────────────────────────────────────────

  /** POST /viajes — crear viaje (queda en CREADO) */
  crear: (payload: CrearViajePayload) =>
    post<{ data: Viaje }>('/viajes', payload),

  /** GET /viajes/{id} — detalle con detalles + transportador + extractora */
  ver: (id: number) =>
    get<{ data: Viaje }>(`/viajes/${id}`),

  /** PUT /viajes/{id} — editar (solo en estado CREADO) */
  editar: (id: number, payload: EditarViajePayload) =>
    put<{ data: Viaje }>(`/viajes/${id}`, payload),

  /** DELETE /viajes/{id} — soft delete (bloqueado en FINALIZADO) */
  eliminar: (id: number) =>
    del<{ message: string }>(`/viajes/${id}`),

  // ── Detalles (cosechas enlazadas al viaje) ───────────────────────────────

  /** POST /viajes/{id}/detalles — enlazar cosecha al viaje (solo CREADO) */
  agregarDetalle: (viajeId: number, cosechaId: number) =>
    post<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles`, { cosecha_id: cosechaId }),

  /** DELETE /viajes/{id}/detalles/{detalleId} — quitar cosecha (solo CREADO, no aprobado) */
  eliminarDetalle: (viajeId: number, detalleId: number) =>
    del<{ message: string }>(`/viajes/${viajeId}/detalles/${detalleId}`),

  /** PUT /viajes/{id}/detalles/{detalleId}/reconteo — hidratar gajos_reconteo + peso (solo CREADO, no aprobado) */
  hidratarReconteo: (viajeId: number, detalleId: number, payload: HidratarReconteoPayload) =>
    put<{ data: ViajeDetalle }>(`/viajes/${viajeId}/detalles/${detalleId}/reconteo`, payload),

  /** POST /viajes/{id}/detalles/{detalleId}/aprobar-reconteo — aprueba reconteo; auto-despacha si es el último */
  aprobarReconteo: (viajeId: number, detalleId: number) =>
    post<{ data: AprobarReconteoResponse }>(`/viajes/${viajeId}/detalles/${detalleId}/aprobar-reconteo`),

  // ── Transiciones de estado ────────────────────────────────────────────────

  /** POST /viajes/{id}/despachar — CREADO → EN_CAMINO (sin requerir conteo previo).
   *  El conteo de cosecha es opcional; este endpoint pasa el viaje a En Validación
   *  directamente. Si el backend no expone esta ruta, devolverá 404 y la UI mostrará
   *  el mensaje de error al usuario. */
  despachar: (id: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/despachar`),

  /** POST /viajes/{id}/llegada-planta — EN_CAMINO → EN_PLANTA (requiere peso_viaje) */
  llegadaPlanta: (id: number, pesoViaje: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/llegada-planta`, { peso_viaje: pesoViaje }),

  /** POST /viajes/{id}/finalizar — EN_PLANTA → FINALIZADO; dispara cálculo homogéneo */
  finalizar: (id: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/finalizar`),
};

// ─── códigos de error del API ────────────────────────────────────────────────

export const ErrorCodes = {
  VIAJE_NOT_FOUND:        'VIAJE_NOT_FOUND',
  DETALLE_NOT_FOUND:      'DETALLE_NOT_FOUND',
  VIAJE_ESTADO_INVALIDO:  'VIAJE_ESTADO_INVALIDO',
  VIAJE_NO_EDITABLE:      'VIAJE_NO_EDITABLE',
  DETALLE_APROBADO:       'DETALLE_APROBADO',
  VIAJE_INCOMPLETO:       'VIAJE_INCOMPLETO',
  RECONTEO_PENDIENTE:     'RECONTEO_PENDIENTE',
  REMISION_DUPLICADA:     'REMISION_DUPLICADA',
  COSECHA_FUERA_DE_VIAJE: 'COSECHA_FUERA_DE_VIAJE',
  COSECHA_YA_ASIGNADA:    'COSECHA_YA_ASIGNADA',
  OPERACION_NO_APROBADA:  'OPERACION_NO_APROBADA',
  TRANSPORTADOR_INACTIVO: 'TRANSPORTADOR_INACTIVO',
  EXTRACTORA_INACTIVA:    'EXTRACTORA_INACTIVA',
  MODULO_DESHABILITADO:   'MODULO_DESHABILITADO',
} as const;

// ─── utilidad: parse fechas ISO/date-only ────────────────────────────────────

export function parseFechaAPI(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const d = fecha.includes('T') ? new Date(fecha) : new Date(`${fecha}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Extrae string de un campo que puede venir como objeto o como string primitivo */
export function strField(val: unknown, fallback = ''): string {
  if (val == null) return fallback;
  if (typeof val === 'string') return val || fallback;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const v = o.razon_social ?? o.nombre_completo ?? o.nombre ?? o.name;
    return v != null ? String(v) : fallback;
  }
  return String(val) || fallback;
}