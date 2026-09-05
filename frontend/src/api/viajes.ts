/**
 * api/viajes.ts
 * Módulo de Viajes — contrato completo según API_VIAJES.md y API_VIAJES_OCR_BASCULA.md
 * Base: /api/v1/tenant  · Auth: Authorization Bearer + X-Tenant-Id
 *
 * Modelo de validación (refine 2026-05-07):
 *  - 3 estados: CREADO → EN_VALIDACION → FINALIZADO
 *  - PATCH /validar hidrata 10 campos: peso_viaje, numero_remision_extractora,
 *    fecha_llegada, hora_llegada, fruto_verde, sobre_maduro, podrido,
 *    pedunculo_largo, mal_formado, observaciones_extractora.
 *  - OCR Claude Vision asíncrono: subirDocumentoBascula + getDocumentoBasculaStatus.
 *    El GET devuelve `validaciones_cruzadas` (conductor/placa extraídos vs snapshot)
 *    y `datos_extraidos` con los 10 campos persistibles + 2 auxiliares cross-check.
 *  - CRUD completo de paramétricas (empresas_transportadoras, transportadores, extractoras).
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

/**
 * @deprecated Reemplazado por los 5 porcentajes de calificación (fruto_verde,
 * sobre_maduro, podrido, pedunculo_largo, mal_formado). Se mantiene el alias
 * para evitar romper consumidores antiguos durante la transición.
 */
export type CalidadMateriaPrima = 'excelente' | 'buena' | 'regular' | 'deficiente';

// ── Paramétricas ────────────────────────────────────────────────────────────

/** Empresa transportadora — paramétrica */
export interface EmpresaTransportadora {
  id: number;
  /** 'JURIDICA' | 'NATURAL'. Define el badge ("P. Jurídica" / "P. Natural") en el UI. */
  tipo_persona?: 'JURIDICA' | 'NATURAL';
  razon_social: string;
  nit: string;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  email?: string | null;
  contacto_nombre?: string | null;
  observaciones?: string | null;
  estado?: boolean;
  /** Presente cuando se pide con ?with_transportadores_count=1 o en el detalle. */
  transportadores_count?: number;
}

/** Select reducido de empresas (para dropdowns) */
export interface EmpresaTransportadoraSelect {
  id: number;
  razon_social: string;
  nit: string;
  tipo_persona?: 'JURIDICA' | 'NATURAL';
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
  /** Teléfono fijo (opcional). No está en el doc §16.1 oficial, pero el
   *  frontend lo expone como input y el backend lo persiste si la columna existe. */
  telefono_fijo?: string | null;
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

/**
 * Detalle (pivot viaje ↔ cosecha). Soporta cosechas partidas (§2.5):
 * una misma cosecha puede repartirse entre múltiples viajes, cada uno con
 * su propio `gajos_en_viaje`.
 *
 * - `gajos_en_viaje = null` → todos los gajos disponibles van en este viaje
 *   (modo legacy, sin split).
 * - `gajos_en_viaje = N`    → solo N gajos de esa cosecha van en este viaje.
 *
 * Al guardar/editar, el backend recalcula
 * `registro_cosecha.gajos_reconteo = SUM(viaje_detalle.gajos_en_viaje)` sobre
 * los splits activos, para que la nómina siempre lea el total verificado
 * acumulado.
 */
export interface ViajeDetalle {
  id: number;
  viaje_id: number;
  cosecha_id: number;
  /** Gajos de esa cosecha que van en ESTE viaje. NULL = todos (sin split). */
  gajos_en_viaje?: number | null;
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
    /**
     * Cuadrilla de la cosecha. XOR por miembro: `empleado_id` (colaborador
     * propio) u `operario_id` (operario de tercero). El backend inyecta
     * `tercero_id` cuando aplica; el frontend nunca lo envía.
     */
    cuadrilla?: Array<{
      empleado_id?: number | null;
      operario_id?: number | null;
      tercero_id?: number | null;
    }>;
  };
}

/** Viaje completo (con todos los campos del nuevo contrato) */
export interface Viaje {
  id: number;
  remision: string;                                  // REM-{YYYY}-{NNN} o {prefijo}-{NNN}
  /**
   * FK al rango de numeración usado al crear el viaje (§18 API_PARAMETRICAS).
   * `null` = consecutivo automático `REM-{YYYY}-{NNN}`.
   * Cuando está poblado, el backend generó la remisión como
   * `{rango.prefijo}-{numero_zeropaded}`.
   */
  rango_numeracion_id?: number | null;
  /**
   * Objeto expandido del rango cuando el backend lo eager-loadea (para que
   * el form de edición muestre el prefijo elegido en el dropdown sin llamada
   * extra). Es opcional — el backend puede devolver solo `rango_numeracion_id`.
   */
  rango_numeracion?: {
    id: number;
    tipo_documento: string;
    prefijo: string;
    numero_desde: number;
    numero_hasta: number;
    numero_actual: number;
  } | null;
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
  /** Porcentaje 0-100 de fruto verde según calificación de la extractora */
  fruto_verde?: string | number | null;
  /** Porcentaje 0-100 de fruto sobre maduro */
  sobre_maduro?: string | number | null;
  /** Porcentaje 0-100 de fruto podrido */
  podrido?: string | number | null;
  /** Porcentaje 0-100 de fruto con pedúnculo largo */
  pedunculo_largo?: string | number | null;
  /** Porcentaje 0-100 de fruto mal formado */
  mal_formado?: string | number | null;
  observaciones_extractora?: string | null;
  // Datos generales
  observaciones?: string | null;
  /** Solo lectura: lo calcula el backend según los lotes de las cosechas
   *  enlazadas. Se recalcula en cada add/remove de detalles (§6.1 del doc). */
  es_homogeneo: boolean;
  sync_uuid?: string | null;
  /** Soporte offline (§2.4, §7). LOCAL = creado offline pendiente de sync;
   *  SINCRONIZADO = ya replicado al servidor. */
  sync_estado?: 'LOCAL' | 'SINCRONIZADO';
  // Auditoría
  /** FK a `users` — quien creó el viaje (§2.4). */
  creado_por?: number | null;
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

/**
 * Payload para crear viaje (§5.1, §12.3 — `StoreViajeRequest`).
 *
 * NO incluye `es_homogeneo`: el backend lo calcula automáticamente según los
 * lotes de las cosechas asignadas al viaje (se recalcula en `addDetalle` /
 * `removeDetalle`). El frontend recibe el valor en la respuesta `Viaje`.
 *
 * `rango_numeracion_id` (§18 API_PARAMETRICAS + §5.1 nota):
 *  - Presente → el backend genera la remisión como `{prefijo}-{numero}` y
 *    aumenta `rango.numero_actual` en 1.
 *  - Omitido/null → consecutivo automático `REM-{YYYY}-{NNN}`.
 */
export interface CrearViajePayload {
  fecha_viaje: string;
  hora_salida: string;
  transportador_id: number;
  extractora_id: number;
  rango_numeracion_id?: number | null;
  observaciones?: string | null;
  sync_uuid?: string | null;
}

/**
 * Payload para editar viaje (§12.3 — `UpdateViajeRequest`).
 *
 * Solo permitido cuando `viaje.estado = CREADO`. Tampoco acepta `es_homogeneo`
 * (mismo motivo que el POST: lo calcula el backend). Se permite cambiar
 * `rango_numeracion_id` en modo edición (backend recalcula la remisión si el
 * campo llega distinto al actual).
 */
export interface EditarViajePayload {
  fecha_viaje?: string;
  hora_salida?: string;
  transportador_id?: number;
  extractora_id?: number;
  rango_numeracion_id?: number | null;
  observaciones?: string | null;
}

/**
 * Payload para `PUT /viajes/{id}/detalles/{detalleId}/reconteo` (§5.5).
 *
 * Representa el conteo verificado de gajos de ESTA cosecha en ESTE viaje
 * (reemplaza al antiguo `gajos_reconteo` a nivel de registro_cosecha para
 * soportar splits). El backend recalcula
 * `registro_cosecha.gajos_reconteo = SUM(viaje_detalle.gajos_en_viaje)` de
 * todos los splits activos automáticamente.
 *
 * Errores posibles: 422 `GAJOS_INSUFICIENTES` si `gajos_en_viaje` supera los
 * gajos disponibles restantes de la cosecha; 409 `VIAJE_NO_EDITABLE` /
 * `DETALLE_APROBADO` según el estado.
 */
export interface HidratarReconteoPayload {
  /** Reconteo verificado de esta cosecha en este viaje (obligatorio). */
  gajos_en_viaje: number;
  peso_confirmado?: number | null;
}

/**
 * @deprecated Usar `HidratarReconteoPayload` con `gajos_en_viaje`. Se mantiene
 * el alias por compatibilidad con código legacy que aún manda `gajos_reconteo`.
 */
export interface HidratarReconteoLegacyPayload {
  gajos_reconteo: number;
  peso_confirmado?: number | null;
}

/**
 * Payload para PATCH /viajes/{id}/validar — datos del formulario de extractora.
 *
 * Solo permitido cuando viaje.estado = EN_VALIDACION. No transiciona estado
 * (el cierre lo hace POST /finalizar). Todos los campos son opcionales; los
 * porcentajes deben estar entre 0 y 100.
 */
export interface ValidarViajePayload {
  peso_viaje?: number | null;
  numero_remision_extractora?: string | null;
  fecha_llegada?: string | null;
  hora_llegada?: string | null;
  fruto_verde?: number | null;
  sobre_maduro?: number | null;
  podrido?: number | null;
  pedunculo_largo?: number | null;
  mal_formado?: number | null;
  observaciones_extractora?: string | null;
}

/** Operación APROBADA con cosechas disponibles */
export interface OperacionDisponible {
  id: number;
  fecha: string;
  estado: string;
  cosechas_disponibles_count: number;
}

/**
 * Cosecha con gajos pendientes de enviar en una operación (§5.3).
 *
 * Cubre dos escenarios:
 *  - Cosechas sin ningún `viaje_detalle` activo → `gajos_pendientes_enviar`
 *    = `gajos_reconteo ?? gajos_reportados`.
 *  - Cosechas con splits parciales → `gajos_pendientes_enviar` = total menos
 *    la suma de gajos_en_viaje ya asignados a otros viajes.
 *
 * Las cosechas completamente asignadas NO aparecen en el listado.
 */
export interface CosechaLibre {
  id: number;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  /**
   * Campo computado (no persiste). Gajos que aún se pueden asignar a nuevos
   * viajes. Fórmula:
   *   `COALESCE(gajos_reconteo, gajos_reportados) − SUM(gajos_en_viaje activos con valor explícito)`
   */
  gajos_pendientes_enviar?: number;
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

/**
 * Datos extraídos por Claude Vision: 10 campos persistibles en viajes (PATCH /validar)
 * + 2 auxiliares cross-check (no van al viaje, solo se comparan contra el snapshot).
 */
export interface DatosExtraidosBascula extends ValidarViajePayload {
  /** Auxiliar cross-check: nombre del conductor impreso en el documento. */
  nombre_conductor_extraido?: string | null;
  /** Auxiliar cross-check: placa del vehículo impresa en el documento. */
  placa_vehiculo_extraida?: string | null;
}

/**
 * Resultado de la comparación tolerante de un campo cross-check (conductor o placa)
 * entre lo que Claude extrajo y el snapshot guardado en el viaje.
 *
 * - `coincide: true`  → coincide después de normalizar.
 * - `coincide: false` → discrepancia → mostrar alerta no bloqueante.
 * - `coincide: null`  → Claude no pudo leerlo → no se puede verificar.
 */
export interface ValidacionCruzadaCampo {
  extraido: string | null;
  esperado: string;
  coincide: boolean | null;
}

export interface ValidacionesCruzadas {
  conductor: ValidacionCruzadaCampo;
  placa: ValidacionCruzadaCampo;
}

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
  datos_extraidos?: DatosExtraidosBascula | null;
  /**
   * Solo presente en estados terminales con datos disponibles
   * (COMPLETADO o REVISION_MANUAL). Comparación tolerante de conductor y placa
   * extraídos contra el snapshot del viaje.
   */
  validaciones_cruzadas?: ValidacionesCruzadas;
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

  /**
   * GET /empresas-transportadoras — listado paginado (CRUD admin).
   * Filtros: `search`, `estado`, `tipo_persona`, `with_transportadores_count`.
   */
  listar: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    estado?: boolean;
    tipo_persona?: 'JURIDICA' | 'NATURAL';
    /** Si `true`, cada item incluye `transportadores_count`. */
    with_transportadores_count?: boolean;
  }) =>
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
  /**
   * GET /transportadores — listado paginado · filtro por empresa.
   * Filtros: `search`, `estado`, `empresa_transportadora_id`.
   */
  listar: (params?: {
    page?: number;
    per_page?: number;
    empresa_transportadora_id?: number;
    search?: string;
    estado?: boolean;
  }) =>
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

  /**
   * GET /extractoras — listado paginado.
   * Filtros: `search`, `estado`, `departamento_codigo` (código DANE).
   */
  listar: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    estado?: boolean;
    departamento_codigo?: string;
  }) =>
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

  /**
   * POST /viajes/{id}/detalles — enlazar cosecha al viaje (solo CREADO).
   *
   * Acepta `gajos_en_viaje` opcional para splits parciales (§5.4):
   *  - Omitido / null → todos los gajos restantes de la cosecha van en este
   *    viaje (modo legacy).
   *  - Valor entero → split parcial. Solo esa cantidad va en este camión.
   *
   * §5.4.1 — El sobreconteo dentro de la tolerancia (10 gajos) NO bloquea:
   * responde 201 con `advertencia` (string informativo). Solo excede la
   * tolerancia → 422 `GAJOS_INSUFICIENTES`. El caller debe mostrar la
   * advertencia como toast, nunca como error.
   */
  agregarDetalle: (
    viajeId: number,
    cosechaId: number,
    gajosEnViaje?: number | null,
  ) =>
    post<{
      data: ViajeDetalle;
      /** Totales refrescados del viaje tras la asignación (§5.4). */
      viaje?: { id: number; cantidad_gajos_total: number | null };
      /** §5.4.1 — aviso de sobreconteo dentro de tolerancia; null si cabe. */
      advertencia?: string | null;
    }>(`/viajes/${viajeId}/detalles`, {
      cosecha_id: cosechaId,
      ...(gajosEnViaje != null ? { gajos_en_viaje: gajosEnViaje } : {}),
    }),

  /** DELETE /viajes/{id}/detalles/{detalleId} — quitar cosecha (solo CREADO, no aprobado) */
  eliminarDetalle: (viajeId: number, detalleId: number) =>
    del<{ message: string }>(`/viajes/${viajeId}/detalles/${detalleId}`),

  /**
   * PUT /viajes/{id}/detalles/{detalleId}/reconteo — hidratar `gajos_en_viaje`
   * + peso (solo CREADO, no aprobado).
   *
   * §5.5 v2: el reconteo puede superar `gajos_reportados`. El endpoint acepta
   * cualquier valor ≥ 0. Cuando el total excede lo reportado, la respuesta
   * incluye `advertencia` (string informativo, NO bloquea la operación).
   */
  hidratarReconteo: (viajeId: number, detalleId: number, payload: HidratarReconteoPayload) =>
    put<{ data: ViajeDetalle; advertencia?: string }>(
      `/viajes/${viajeId}/detalles/${detalleId}/reconteo`,
      payload,
    ),

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

// ─── códigos de error (§9 API_VIAJES.md) ──────────────────────────────────

/**
 * Códigos de error específicos del módulo Viajes (§9 API_VIAJES.md).
 *
 * Todos se leen del campo `code` (o `error_code`) del response de error.
 * `smartRequest` los expone en `err.code`.
 *
 * Uso típico en un `catch`:
 * ```
 * } catch (err) {
 *   if (err.code === ViajesErrorCodes.VIAJE_NO_EDITABLE) { ... }
 * }
 * ```
 */
export const ViajesErrorCodes = {
  /** 404 — viaje no existe o no pertenece al tenant. */
  VIAJE_NOT_FOUND: 'VIAJE_NOT_FOUND',
  /** 404 — `detalleId` no pertenece al viaje. */
  DETALLE_NOT_FOUND: 'DETALLE_NOT_FOUND',
  /** 409 — transición desde estado incorrecto (ej. `finalizar` en CREADO). */
  VIAJE_ESTADO_INVALIDO: 'VIAJE_ESTADO_INVALIDO',
  /** 409 — PUT/DELETE/reconteo con `estado !== CREADO`. */
  VIAJE_NO_EDITABLE: 'VIAJE_NO_EDITABLE',
  /** 409 — intento de editar/eliminar un detalle con `reconteo_aprobado = true`. */
  DETALLE_APROBADO: 'DETALLE_APROBADO',
  /** 422 — finalizar viaje con detalles pero sin `peso_viaje` o `cantidad_gajos_total`. */
  VIAJE_INCOMPLETO: 'VIAJE_INCOMPLETO',
  /** 422 — aprobar reconteo sin haber hidratado `gajos_en_viaje` del detalle. */
  RECONTEO_PENDIENTE: 'RECONTEO_PENDIENTE',
  /** 422 — colisión de remisión al generar (fallback por concurrencia, muy raro). */
  REMISION_DUPLICADA: 'REMISION_DUPLICADA',
  /** 422 — `reconteo` con una `cosecha_id` que no está en el `viaje_detalle`. */
  COSECHA_FUERA_DE_VIAJE: 'COSECHA_FUERA_DE_VIAJE',
  /**
   * 422 — la cosecha ya está asignada completa (modo legacy) o dos veces en
   * el mismo viaje (índice único `(cosecha_id, viaje_id) WHERE estado = true`).
   */
  COSECHA_YA_ASIGNADA: 'COSECHA_YA_ASIGNADA',
  /** 422 — `gajos_en_viaje` supera los gajos disponibles restantes de la cosecha. */
  GAJOS_INSUFICIENTES: 'GAJOS_INSUFICIENTES',
  /** 422 — la operación padre de la cosecha no está APROBADA. */
  OPERACION_NO_APROBADA: 'OPERACION_NO_APROBADA',
  /**
   * 422 — §6.5: `fecha_viaje` es anterior a la fecha de la cosecha que el
   * viaje transporta (un camión no puede llevar fruta que aún no se cortó).
   * Se valida al enlazar la cosecha (`POST /detalles`) y al finalizar.
   * El `detalle` de la respuesta trae `{fecha_viaje, cosecha_id, fecha_cosecha}`
   * y el `message` es reenviable tal cual.
   */
  FECHA_VIAJE_ANTERIOR_A_COSECHA: 'FECHA_VIAJE_ANTERIOR_A_COSECHA',
  /** 422 — `transportador.estado = false` al crear viaje. */
  TRANSPORTADOR_INACTIVO: 'TRANSPORTADOR_INACTIVO',
  /** 422 — `extractora.estado = false` al crear viaje. */
  EXTRACTORA_INACTIVA: 'EXTRACTORA_INACTIVA',
  /** 404 — polling con `documento_id` que no pertenece al `viaje_id` de la URL. */
  DOCUMENTO_VIAJE_MISMATCH: 'DOCUMENTO_VIAJE_MISMATCH',
  /** 503 — falta `ANTHROPIC_API_KEY` en el env del backend (defensa temprana del POST). */
  ANTHROPIC_SIN_CONFIGURAR: 'ANTHROPIC_SIN_CONFIGURAR',
  /** 403 — `tenant_config.modulo_viajes = false`. */
  MODULO_DESHABILITADO: 'MODULO_DESHABILITADO',
} as const;

export type ViajeErrorCode = typeof ViajesErrorCodes[keyof typeof ViajesErrorCodes];