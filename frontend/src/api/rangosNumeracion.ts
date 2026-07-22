/**
 * API Client — Rangos de Numeración Manual (§18 API_PARAMETRICAS.md).
 *
 * Base URL: {host}/api/v1/tenant
 * Permisos:
 *   - CRUD              → `configuracion.editar`
 *   - `/select`         → `viajes.crear` **o** `configuracion.editar`
 *
 * Los rangos definen prefijos y consecutivos para los documentos asociados
 * a los viajes (por ahora solo `REMISION`). Al crear un viaje con
 * `rango_numeracion_id`, el backend genera la remisión como
 * `{prefijo}-{numero_zeropaded}` — el ancho del padding se toma del
 * `numero_hasta`. Ej: prefijo=`DEV`, numero_hasta=333, numero_actual=34
 * → remisión `DEV-034`.
 *
 * El uso del rango es OPCIONAL: si no se envía `rango_numeracion_id` al
 * crear el viaje, el sistema sigue usando el formato automático
 * `REM-{YYYY}-{NNN}`.
 *
 * `tipo_documento` y `prefijo` son inmutables tras crear el rango.
 * `numero_actual` no se puede editar si el rango tiene viajes activos
 * asociados (409 `RANGO_CON_VIAJES`).
 */
import { requestConToken } from './request';

// ─── helpers ─────────────────────────────────────────────────────────────

function tkn() {
  return localStorage.getItem('palmapp_token');
}

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
  return requestConToken<T>(
    `/api/v1/tenant${path}${qs(params)}`,
    { method: 'GET' },
    tkn(),
  );
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return requestConToken<T>(
    `/api/v1/tenant${path}`,
    { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) },
    tkn(),
  );
}
function put<T>(path: string, body: unknown): Promise<T> {
  return requestConToken<T>(
    `/api/v1/tenant${path}`,
    { method: 'PUT', body: JSON.stringify(body) },
    tkn(),
  );
}
function del<T>(path: string): Promise<T> {
  return requestConToken<T>(`/api/v1/tenant${path}`, { method: 'DELETE' }, tkn());
}

// ─── tipos ───────────────────────────────────────────────────────────────

/**
 * Tipos de documento manejados por el sistema de rangos.
 * Solo `REMISION` disponible por ahora; extensible a FACTURA, NOTA_CREDITO
 * a futuro sin cambios de contrato.
 */
export type TipoDocumentoRango = 'REMISION';

/**
 * Entidad completa devuelta por GET /rangos-numeracion(/{id}) y por
 * POST/PUT. `estado = true` significa activo; el DELETE es soft
 * (marca `estado = false`).
 */
export interface RangoNumeracion {
  id: number;
  tenant_id?: number;
  tipo_documento: TipoDocumentoRango;
  prefijo: string;
  numero_desde: number;
  numero_hasta: number;
  numero_actual: number;
  descripcion?: string | null;
  estado: boolean;
}

/**
 * Item liviano devuelto por GET /rangos-numeracion/select.
 * No incluye `descripcion` ni `estado` (siempre viene con estado=true por
 * el filtro del backend).
 */
export interface RangoNumeracionSelectItem {
  id: number;
  tipo_documento: TipoDocumentoRango;
  prefijo: string;
  numero_desde: number;
  numero_hasta: number;
  numero_actual: number;
}

/** Payload de POST /rangos-numeracion — todos los campos requeridos. */
export interface CrearRangoNumeracionPayload {
  tipo_documento: TipoDocumentoRango;
  prefijo: string;
  numero_desde: number;
  numero_hasta: number;
  numero_actual: number;
  descripcion?: string | null;
}

/**
 * Payload de PUT /rangos-numeracion/{id} — solo campos editables.
 * `tipo_documento` y `prefijo` son inmutables (silenciosamente descartados
 * si llegan). `numero_actual` solo se puede editar si no hay viajes
 * activos asociados.
 */
export interface EditarRangoNumeracionPayload {
  numero_hasta?: number;
  numero_actual?: number;
  descripcion?: string | null;
  estado?: boolean;
}

/** Códigos de error específicos del módulo (§18 tabla final). */
export const RangosNumeracionErrorCodes = {
  /** DELETE o edición de `numero_actual` cuando el rango tiene viajes activos. */
  RANGO_CON_VIAJES: 'RANGO_CON_VIAJES',
  /** Ya existe un rango con ese prefijo en el tenant. */
  RANGO_PREFIJO_DUPLICADO: 'RANGO_PREFIJO_DUPLICADO',
  /** Se intentó usar un rango inactivo al crear un viaje. */
  RANGO_INACTIVO: 'RANGO_INACTIVO',
  /** `numero_actual > numero_hasta` al intentar generar una remisión. */
  RANGO_AGOTADO: 'RANGO_AGOTADO',
} as const;

export type RangoNumeracionErrorCode =
  typeof RangosNumeracionErrorCodes[keyof typeof RangosNumeracionErrorCodes];

// ─── cliente ─────────────────────────────────────────────────────────────

export const rangosNumeracionApi = {
  /**
   * GET /rangos-numeracion/select
   *
   * Dropdown sin paginación, solo activos. Filtro opcional por tipo.
   * Usado por el form "Nuevo Viaje" para poblar el selector de prefijo.
   *
   * Permiso: `viajes.crear` o `configuracion.editar`.
   */
  select: (params?: { tipo_documento?: TipoDocumentoRango }) =>
    get<{ data: RangoNumeracionSelectItem[] }>(
      '/rangos-numeracion/select',
      params as Record<string, unknown>,
    ),

  /**
   * GET /rangos-numeracion — listado paginado.
   *
   * Filtros útiles para la pantalla de Configuración → Rangos:
   * `tipo_documento`, `prefijo` (búsqueda parcial), `estado`.
   */
  listar: (params?: {
    page?: number;
    per_page?: number;
    tipo_documento?: TipoDocumentoRango;
    prefijo?: string;
    estado?: boolean;
  }) =>
    get<{ data: RangoNumeracion[]; meta?: any }>(
      '/rangos-numeracion',
      params as Record<string, unknown>,
    ),

  /** GET /rangos-numeracion/{id}. */
  ver: (id: number) =>
    get<{ data: RangoNumeracion }>(`/rangos-numeracion/${id}`),

  /**
   * POST /rangos-numeracion.
   *
   * Errores frecuentes:
   *  - 422 `RANGO_PREFIJO_DUPLICADO` — prefijo ya en uso en este tenant.
   *  - 422 genérico — `numero_actual` fuera de [`numero_desde`, `numero_hasta`],
   *    o `numero_hasta < numero_desde`.
   */
  crear: (payload: CrearRangoNumeracionPayload) =>
    post<{ data: RangoNumeracion; message?: string }>(
      '/rangos-numeracion',
      payload,
    ),

  /**
   * PUT /rangos-numeracion/{id}.
   *
   * Solo edita `numero_hasta`, `numero_actual`, `descripcion` y `estado`.
   * `tipo_documento` y `prefijo` son inmutables.
   *
   * Errores frecuentes:
   *  - 409 `RANGO_CON_VIAJES` — intento de editar `numero_actual` cuando
   *    ya hay viajes emitidos con este rango.
   */
  editar: (id: number, payload: EditarRangoNumeracionPayload) =>
    put<{ data: RangoNumeracion; message?: string }>(
      `/rangos-numeracion/${id}`,
      payload,
    ),

  /**
   * DELETE /rangos-numeracion/{id} — soft delete (marca `estado = false`).
   *
   * Errores frecuentes:
   *  - 409 `RANGO_CON_VIAJES` — el rango tiene viajes activos. Inactivar
   *    (PUT con `estado: false`) es el reemplazo funcional.
   */
  eliminar: (id: number) =>
    del<{ message: string }>(`/rangos-numeracion/${id}`),
};
