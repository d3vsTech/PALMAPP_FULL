/**
 * api/viajes.ts
 * Módulo de Viajes — contrato completo según API_VIAJES.md
 * Base: /api/v1/tenant  · Auth: Authorization Bearer + X-Tenant-Id
 *
 * Cambios respecto al contrato anterior:
 *  - 3 estados en vez de 4: CREADO → EN_VALIDACION → FINALIZADO
 *  - `despachar` y `llegada-planta` se reemplazan por `saltar-validacion` y `validar (PATCH)`
 *  - `validar` hidrata: peso_viaje, numero_remision_extractora, fecha_llegada, hora_llegada,
 *    racimos_recibidos, temperatura_pulpa, acidez_inicial, humedad_semilla,
 *    calidad_materia_prima, observaciones_extractora
 *  - CRUD completo de paramétricas (empresas_transportadoras, transportadores, extractoras)
 *  - OCR del formulario de extractora: subirDocumentoBascula + getDocumentoBasculaStatus
 */
import { requestConToken, fetchConToken } from './request';

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
function patch<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, {
    method: 'PATCH',
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

/** Estados del viaje (modelo nuevo de 3 estados) */
export type EstadoViajeApi = 'CREADO' | 'EN_VALIDACION' | 'FINALIZADO';

/** Calidad cualitativa de la materia prima */
export type CalidadMateriaPrima = 'excelente' | 'buena' | 'regular' | 'deficiente';

// ── Paramétricas ────────────────────────────────────────────────────────────

/** Empresa transportadora — paramétrica */
export interface EmpresaTransportadora {
  id: number;
  razon_social: string;
  nit: string;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  email?: string | null;
  contacto_nombre?: string | null;
  observaciones?: string | null;
  estado?: boolean;
}

/** Select reducido de empresas (para dropdowns) */
export interface EmpresaTransportadoraSelect {
  id: number;
  razon_social: string;
  nit: string;
}

/** Transportador (conductor) — paramétrica */
export interface Transportador {
  id: number;
  empresa_transportadora_id: number;
  nombres: string;
  apellidos: string;
  placa_vehiculo: string;
  tipo_documento?: 'CC' | 'CE' | 'PPT' | 'PASAPORTE' | null;
  numero_documento?: string | null;
  telefono?: string | null;
  licencia_conduccion?: string | null;
  licencia_vencimiento?: string | null;
  tipo_vehiculo?: string | null;
  capacidad_kg?: string | number | null;
  observaciones?: string | null;
  estado?: boolean;
  empresa_transportadora?: EmpresaTransportadora;
}

/** Select reducido de transportadores (devuelto por /empresas-transportadoras/{id}/transportadores) */
export interface TransportadorSelect {
  id: number;
  empresa_transportadora_id: number;
  nombres: string;
  apellidos: string;
  placa_vehiculo: string;
  tipo_vehiculo?: string | null;
  capacidad_kg?: string | null;
}

/** Extractora — paramétrica */
export interface Extractora {
  id: number;
  razon_social: string;
  nit: string;
  ubicacion: string;
  departamento_codigo?: string | null;
  municipio_codigo?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  email?: string | null;
  contacto_nombre?: string | null;
  distancia_km?: string | number | null;
  observaciones?: string | null;
  estado?: boolean;
}

/** Select reducido de extractoras */
export interface ExtractoraSelect {
  id: number;
  razon_social: string;
  nit: string;
  ubicacion: string;
  ciudad?: string | null;
  distancia_km?: string | null;
}

// ── Viaje y detalles ────────────────────────────────────────────────────────

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

/** Viaje completo (con todos los campos del nuevo contrato) */
export interface Viaje {
  id: number;
  remision: string;                                  // REM-{YYYY}-{NNN}
  fecha_viaje: string;                               // YYYY-MM-DD
  hora_salida: string;                               // HH:MM:SS
  estado: EstadoViajeApi;
  estado_activo?: boolean;
  // Snapshot del transportador (no edita)
  placa_vehiculo: string;
  nombre_conductor: string;
  // Datos hidratados en EN_VALIDACION (formulario de extractora)
  peso_viaje?: string | number | null;
  cantidad_gajos_total?: number | null;
  numero_remision_extractora?: string | null;
  fecha_llegada?: string | null;
  hora_llegada?: string | null;
  racimos_recibidos?: number | null;
  temperatura_pulpa?: string | number | null;
  acidez_inicial?: string | number | null;
  humedad_semilla?: string | number | null;
  calidad_materia_prima?: CalidadMateriaPrima | null;
  observaciones_extractora?: string | null;
  // Datos generales
  observaciones?: string | null;
  es_homogeneo: boolean;
  sync_uuid?: string | null;
  // Auditoría
  validacion_at?: string | null;
  finalizado_at?: string | null;
  // Legacy (no usar — se mantiene por retro-compat de respuestas)
  despachado_at?: string | null;
  llegada_planta_at?: string | null;
  // Relaciones
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

/** Payload para editar viaje (solo en estado CREADO) */
export interface EditarViajePayload {
  fecha_viaje?: string;
  hora_salida?: string;
  transportador_id?: number;
  extractora_id?: number;
  observaciones?: string | null;
  es_homogeneo?: boolean;
}

/** Payload para hidratar el reconteo de un detalle */
export interface HidratarReconteoPayload {
  gajos_reconteo: number;
  peso_confirmado?: number | null;
}

/** Payload para PATCH /viajes/{id}/validar (datos del formulario de extractora) */
export interface ValidarViajePayload {
  peso_viaje?: number | null;
  numero_remision_extractora?: string | null;
  fecha_llegada?: string | null;
  hora_llegada?: string | null;
  racimos_recibidos?: number | null;
  temperatura_pulpa?: number | null;
  acidez_inicial?: number | null;
  humedad_semilla?: number | null;
  calidad_materia_prima?: CalidadMateriaPrima | null;
  observaciones_extractora?: string | null;
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

/** Respuesta de aprobar-reconteo */
export interface AprobarReconteoResponse {
  detalle_id: number;
  reconteo_aprobado: boolean;
  viaje_estado: EstadoViajeApi;
  /** True si esta aprobación disparó la auto-transición CREADO → EN_VALIDACION */
  auto_en_validacion: boolean;
}

/** KPIs del dashboard */
export interface IndicadoresViajes {
  periodo: string;
  desde: string;
  hasta: string;
  total_viajes: number;
  /** Viajes en estado EN_VALIDACION dentro del rango */
  en_validacion: number;
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

/** Estado del documento de báscula (OCR) */
export type EstadoOcrDocumento = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'REVISION_MANUAL' | 'FALLIDO';

/** Documento de báscula y su estado de OCR — alineado con API_VIAJES_OCR_BASCULA.md */
export interface DocumentoBascula {
  id?: number;
  /** Algunos endpoints (POST) devuelven documento_id; otros (GET) usan id. */
  documento_id?: number;
  viaje_id?: number;
  estado_ocr: EstadoOcrDocumento;
  peso_extraido?: string | number | null;
  confianza?: string | number | null;
  modelo_usado?: string | null;
  intentos?: number;
  procesado_at?: string | null;
  error_mensaje?: string | null;
  datos_extraidos?: Partial<ValidarViajePayload> | null;
  viaje?: { id: number; remision: string; estado: EstadoViajeApi };
  /** URL para hacer polling — devuelta por el POST */
  poll_url?: string;
}

// ─── servicios ───────────────────────────────────────────────────────────────

/**
 * Paramétricas: empresas transportadoras
 *
 * - Endpoints `/select` y `/{id}/transportadores` ya implementados (permiso `viajes.crear`).
 * - CRUD completo (`listar`, `crear`, `ver`, `editar`, `eliminar`) marcado como pendiente
 *   en el contrato (permiso `configuracion.editar`). Los métodos están aquí porque
 *   el frontend ya puede usarlos en cuanto el backend los habilite.
 */
export const empresasTransportadorasApi = {
  /** GET /empresas-transportadoras/select — dropdown empresas activas */
  select: () =>
    get<{ data: EmpresaTransportadoraSelect[] }>('/empresas-transportadoras/select'),

  /** GET /empresas-transportadoras/{id}/transportadores — conductores activos de la empresa */
  transportadoresDe: (empresaId: number) =>
    get<{ data: TransportadorSelect[] }>(`/empresas-transportadoras/${empresaId}/transportadores`),

  /** GET /empresas-transportadoras — listado paginado (CRUD admin) */
  listar: (params?: { page?: number; per_page?: number; search?: string }) =>
    get<{ data: EmpresaTransportadora[]; meta?: any }>('/empresas-transportadoras', params as Record<string, unknown>),

  /** GET /empresas-transportadoras/{id} */
  ver: (id: number) =>
    get<{ data: EmpresaTransportadora }>(`/empresas-transportadoras/${id}`),

  /** POST /empresas-transportadoras */
  crear: (payload: Partial<EmpresaTransportadora>) =>
    post<{ data: EmpresaTransportadora; message?: string }>('/empresas-transportadoras', payload),

  /** PUT /empresas-transportadoras/{id} */
  editar: (id: number, payload: Partial<EmpresaTransportadora>) =>
    put<{ data: EmpresaTransportadora; message?: string }>(`/empresas-transportadoras/${id}`, payload),

  /** DELETE /empresas-transportadoras/{id} (soft delete) */
  eliminar: (id: number) =>
    del<{ message: string }>(`/empresas-transportadoras/${id}`),
};

/** Paramétricas: transportadores (conductores) */
export const transportadoresApi = {
  /** GET /transportadores — listado paginado · filtro por empresa */
  listar: (params?: { page?: number; per_page?: number; empresa_transportadora_id?: number; search?: string }) =>
    get<{ data: Transportador[]; meta?: any }>('/transportadores', params as Record<string, unknown>),

  /** GET /transportadores/{id} */
  ver: (id: number) =>
    get<{ data: Transportador }>(`/transportadores/${id}`),

  /** POST /transportadores */
  crear: (payload: Partial<Transportador>) =>
    post<{ data: Transportador; message?: string }>('/transportadores', payload),

  /** PUT /transportadores/{id} */
  editar: (id: number, payload: Partial<Transportador>) =>
    put<{ data: Transportador; message?: string }>(`/transportadores/${id}`, payload),

  /** DELETE /transportadores/{id} (soft delete) */
  eliminar: (id: number) =>
    del<{ message: string }>(`/transportadores/${id}`),
};

/** Paramétricas: extractoras */
export const extractorasApi = {
  /** GET /extractoras/select — dropdown extractoras activas */
  select: () =>
    get<{ data: ExtractoraSelect[] }>('/extractoras/select'),

  /** GET /extractoras — listado paginado */
  listar: (params?: { page?: number; per_page?: number; search?: string }) =>
    get<{ data: Extractora[]; meta?: any }>('/extractoras', params as Record<string, unknown>),

  /** GET /extractoras/{id} */
  ver: (id: number) =>
    get<{ data: Extractora }>(`/extractoras/${id}`),

  /** POST /extractoras */
  crear: (payload: Partial<Extractora>) =>
    post<{ data: Extractora; message?: string }>('/extractoras', payload),

  /** PUT /extractoras/{id} */
  editar: (id: number, payload: Partial<Extractora>) =>
    put<{ data: Extractora; message?: string }>(`/extractoras/${id}`, payload),

  /** DELETE /extractoras/{id} (soft delete) */
  eliminar: (id: number) =>
    del<{ message: string }>(`/extractoras/${id}`),
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

  /** POST /viajes — crear viaje (queda en CREADO; auto-genera remision REM-YYYY-NNN) */
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

  /**
   * POST /viajes/{id}/detalles/{detalleId}/aprobar-reconteo
   *
   * Aprueba el reconteo de ese detalle. Si era el ÚLTIMO detalle pendiente del viaje,
   * el backend dispara auto-transición a EN_VALIDACION (`auto_en_validacion: true`).
   */
  aprobarReconteo: (viajeId: number, detalleId: number) =>
    post<{ data: AprobarReconteoResponse }>(`/viajes/${viajeId}/detalles/${detalleId}/aprobar-reconteo`),

  // ── Transiciones de estado (modelo nuevo de 3 estados) ──────────────────

  /**
   * POST /viajes/{id}/saltar-validacion — CREADO → EN_VALIDACION
   *
   * Para fincas que pagan por jornal y NO llevan control de cosechas.
   * No requiere detalles enlazados ni reconteos aprobados.
   * Body opcional: { observaciones?: string } se concatena al campo observaciones.
   */
  saltarValidacion: (id: number, observaciones?: string) =>
    post<{ data: Viaje }>(
      `/viajes/${id}/saltar-validacion`,
      observaciones ? { observaciones } : undefined,
    ),

  /**
   * PATCH /viajes/{id}/validar — Hidrata datos del formulario de extractora.
   *
   * - Solo permitido en estado EN_VALIDACION.
   * - NO transiciona estado (el cierre lo hace `finalizar` aparte).
   * - Todos los campos del payload son opcionales.
   */
  validar: (id: number, payload: ValidarViajePayload) =>
    patch<{ data: Viaje }>(`/viajes/${id}/validar`, payload),

  /**
   * POST /viajes/{id}/finalizar — EN_VALIDACION → FINALIZADO.
   *
   * Dispara cálculo HOMOGENEO/NO_HOMOGENEO solo si hay detalles + peso + gajos.
   * Si tiene detalles pero falta peso o gajos: 422 VIAJE_INCOMPLETO.
   */
  finalizar: (id: number) =>
    post<{ data: Viaje }>(`/viajes/${id}/finalizar`),

  // ── OCR del formulario de extractora ────────────────────────────────────

  /**
   * POST /viajes/{id}/documento-bascula — Sube formulario de extractora (foto/PDF)
   * para que un job lo procese con OCR. Devuelve 202 + el id del documento.
   * Usar `getDocumentoBasculaStatus` para hacer polling.
   */
  subirDocumentoBascula: async (id: number, archivo: File) => {
    const fd = new FormData();
    // Backend espera el campo "documento" (multipart) según API_VIAJES_OCR_BASCULA.md §3.1
    fd.append('documento', archivo);
    const res = await fetchConToken(
      `/api/v1/tenant/viajes/${id}/documento-bascula`,
      tkn(),
      { method: 'POST', body: fd },
    );
    if (!res.ok) {
      let code: string | undefined;
      let msg = 'Error al subir el documento';
      try {
        const j = await res.json();
        msg = j.message ?? j.error ?? msg;
        code = j.error_code ?? j.code;
      } catch {}
      const err: any = new Error(msg);
      err.status = res.status;
      err.code = code;
      throw err;
    }
    return res.json() as Promise<{ message?: string; data: DocumentoBascula }>;
  },

  /**
   * GET /viajes/{id}/documento-bascula/{docId} — Polling del estado del OCR.
   *
   * El frontend hace polling cada 2-3s hasta que `estado_ocr` llegue a
   * COMPLETADO, REVISION_MANUAL o ERROR.
   */
  getDocumentoBasculaStatus: (viajeId: number, docId: number) =>
    get<{ data: DocumentoBascula; viaje?: Viaje }>(`/viajes/${viajeId}/documento-bascula/${docId}`),
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
  DOCUMENTO_VIAJE_MISMATCH: 'DOCUMENTO_VIAJE_MISMATCH',
  ANTHROPIC_SIN_CONFIGURAR: 'ANTHROPIC_SIN_CONFIGURAR',
} as const;

// ─── utilidades ──────────────────────────────────────────────────────────────

/** Convierte fecha del API (YYYY-MM-DD o ISO) en Date. Retorna null si es inválida. */
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

/**
 * Mapea el estado del API (3 estados) a la etiqueta UI.
 * El front actualmente sigue usando 'En Validación' para EN_VALIDACION.
 */
export const ESTADO_API_LABEL: Record<EstadoViajeApi, string> = {
  CREADO:        'Creado',
  EN_VALIDACION: 'En Validación',
  FINALIZADO:    'Finalizado',
};

/**
 * Compatibilidad retro: el front previo manejaba 4 estados (CREADO, EN_CAMINO,
 * EN_PLANTA, FINALIZADO) y los colapsaba a 3 etiquetas UI. Esta tabla deja
 * abierto el mapeo defensivo si el backend aún devuelve los estados viejos
 * en algún viaje histórico que no fue migrado.
 */
export const ESTADO_LEGACY_TO_NUEVO: Record<string, EstadoViajeApi> = {
  CREADO:       'CREADO',
  EN_CAMINO:    'EN_VALIDACION',
  EN_PLANTA:    'EN_VALIDACION',
  EN_VALIDACION:'EN_VALIDACION',
  FINALIZADO:   'FINALIZADO',
};

/** Normaliza el estado recibido del API al modelo nuevo (defensivo). */
export function normalizarEstado(raw: string | null | undefined): EstadoViajeApi {
  if (!raw) return 'CREADO';
  return ESTADO_LEGACY_TO_NUEVO[raw] ?? 'CREADO';
}