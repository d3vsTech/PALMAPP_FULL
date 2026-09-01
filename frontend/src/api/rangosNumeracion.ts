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
 * `tipo_documento`, `prefijo` y `numero_desde` son inmutables tras crear el
 * rango. `numero_actual` no se puede editar si el rango tiene viajes activos
 * asociados (409 `RANGO_CON_VIAJES`).
 *
 * ELIMINACIÓN EN TRES NIVELES (§18): los viajes no se borran físicamente
 * (`estado_activo = false`), así que el rango decide el tipo de borrado según
 * qué viajes lo referencian:
 *
 *  | Situación                        | Resultado                            |
 *  |----------------------------------|--------------------------------------|
 *  | Tiene viajes activos             | 409 `RANGO_CON_VIAJES` (no se borra) |
 *  | Solo tiene viajes anulados       | Borrado LÓGICO (`deleted_at`)        |
 *  | Nunca emitió un consecutivo      | Borrado FÍSICO (la fila desaparece)  |
 *
 * El borrado lógico conserva la fila para no romper `viajes.rango_numeracion_id`
 * de las remisiones anuladas, pero el rango desaparece de `/rangos-numeracion`
 * y de `/rangos-numeracion/select`, y ya no puede generar consecutivos
 * (responde 422 `RANGO_INACTIVO` si se intenta usar en un viaje).
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

/**
 * Extrae la lista de una respuesta de colección sin casarse con una única
 * forma. Aceptamos las tres que Laravel puede devolver según cómo esté
 * armado el controlador:
 *
 *   [ … ]                    → array pelado (sin Resource)
 *   { data: [ … ] }          → `ResourceCollection` sin paginar (el contrato §18)
 *   { data: { data: [ … ] } } → paginador anidado dentro de un Resource
 *
 * Es defensivo a propósito: un cambio de forma en el backend dejaba el
 * dropdown de prefijos vacío sin ningún error visible, porque `res.data`
 * caía en el `?? []`.
 */
function unwrapLista<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const d = (res as { data?: unknown })?.data;
  if (Array.isArray(d)) return d as T[];
  const dd = (d as { data?: unknown })?.data;
  if (Array.isArray(dd)) return dd as T[];
  return [];
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
 * POST/PUT.
 *
 * `estado = true` significa activo (aparece en el `/select`); `estado = false`
 * lo retira de circulación pero lo deja visible en el listado. El DELETE es
 * cosa aparte: borra la fila o la marca con `deleted_at` según tenga o no
 * viajes anulados asociados.
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
  /**
   * Marca de borrado lógico. Solo llega poblado al consultar el listado con
   * `incluir_eliminados=true`; en el resto de respuestas viene `null` o
   * ausente porque los eliminados quedan fuera del query por defecto.
   */
  deleted_at?: string | null;
}

/**
 * Tipo de borrado que aplicó el backend al `DELETE` (§18):
 *  - `LOGICA` — el rango tenía viajes anulados, se marcó `deleted_at`.
 *  - `FISICA` — el rango nunca emitió un consecutivo, la fila desapareció.
 *
 * En ambos casos el rango deja de aparecer en el listado y en el `/select`.
 */
export type TipoEliminacionRango = 'LOGICA' | 'FISICA';

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
 * Payload de PUT /rangos-numeracion/{id}.
 *
 * Solo estos cuatro campos son editables. `tipo_documento`, `prefijo` y
 * `numero_desde` son inmutables tras la creación — el backend los ignora
 * silenciosamente, así que no los mandamos para no dar la falsa impresión
 * de que el cambio se aplicó.
 *
 * `numero_actual` sólo se puede editar mientras el rango no tenga viajes
 * activos asociados; si los tiene, el backend responde 409
 * `RANGO_CON_VIAJES`. Por eso conviene omitirlo cuando no cambió, o una
 * edición de `descripcion` rebotaría sin motivo.
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
  /**
   * Ya existe un rango NO eliminado con ese prefijo en el tenant. El índice
   * único es parcial (`WHERE deleted_at IS NULL`), así que tras eliminar un
   * rango su prefijo vuelve a quedar libre.
   */
  RANGO_PREFIJO_DUPLICADO: 'RANGO_PREFIJO_DUPLICADO',
  /**
   * Se intentó usar al crear un viaje un rango inactivo (`estado = false`)
   * o eliminado lógicamente.
   */
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
   * Dropdown sin paginación. Devuelve solo los rangos activos y no
   * eliminados. Usado por el form "Nuevo Viaje" para poblar el selector de
   * prefijo.
   *
   * El filtro `tipo_documento` es opcional y hoy no aporta nada (REMISION es
   * el único tipo), así que el form lo omite: si el backend lo interpretara
   * distinto, el dropdown quedaría vacío sin ningún error visible. Filtrar
   * en cliente es más barato que depurar eso.
   *
   * Siempre resuelve con `{ data: [...] }` — `data` es un array garantizado
   * aunque el backend cambie de forma (ver `unwrapLista`).
   *
   * Permiso: `viajes.crear` o `configuracion.editar`.
   */
  select: async (params?: { tipo_documento?: TipoDocumentoRango }) => {
    const res = await get<unknown>(
      '/rangos-numeracion/select',
      params as Record<string, unknown>,
    );
    return { data: unwrapLista<RangoNumeracionSelectItem>(res) };
  },

  /**
   * GET /rangos-numeracion — listado paginado.
   *
   * Filtros útiles para la pantalla de Configuración → Rangos:
   * `tipo_documento`, `prefijo` (búsqueda parcial), `estado`.
   *
   * Por defecto excluye los eliminados lógicamente; `incluir_eliminados=true`
   * los trae de vuelta (con `deleted_at` poblado) para auditoría.
   */
  listar: (params?: {
    page?: number;
    per_page?: number;
    tipo_documento?: TipoDocumentoRango;
    prefijo?: string;
    estado?: boolean;
    incluir_eliminados?: boolean;
  }) =>
    // Mismo desempaquetado tolerante que `select`: el listado paginado suele
    // llegar como `{ data: { data: [...] } }` y el sin paginar como
    // `{ data: [...] }`. `meta` se conserva cuando viene.
    get<unknown>('/rangos-numeracion', params as Record<string, unknown>).then(
      (res) => ({
        data: unwrapLista<RangoNumeracion>(res),
        meta: (res as { meta?: any })?.meta,
      }),
    ),

  /** GET /rangos-numeracion/{id}. */
  ver: (id: number) =>
    get<{ data: RangoNumeracion }>(`/rangos-numeracion/${id}`),

  /**
   * POST /rangos-numeracion.
   *
   * Errores frecuentes:
   *  - 422 `RANGO_PREFIJO_DUPLICADO` — prefijo ya en uso por un rango no
   *    eliminado de este tenant.
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
   * `tipo_documento`, `prefijo` y `numero_desde` son inmutables.
   *
   * Para retirar un rango de circulación sin eliminarlo: `estado: false`.
   * Deja de aparecer en el `/select` pero sigue visible en el listado.
   *
   * Errores frecuentes:
   *  - 409 `RANGO_CON_VIAJES` — intento de editar `numero_actual` cuando
   *    ya hay viajes activos emitidos con este rango. Omite el campo del
   *    payload cuando no cambió para no disparar este error de más.
   */
  editar: (id: number, payload: EditarRangoNumeracionPayload) =>
    put<{ data: RangoNumeracion; message?: string }>(
      `/rangos-numeracion/${id}`,
      payload,
    ),

  /**
   * DELETE /rangos-numeracion/{id}.
   *
   * El backend decide entre borrado lógico y físico según los viajes que
   * referencien el rango, y lo informa en `tipo_eliminacion` (ver el bloque
   * de tres niveles al inicio del archivo). En ambos casos el rango sale del
   * listado y del `/select`.
   *
   * Errores frecuentes:
   *  - 409 `RANGO_CON_VIAJES` — el rango tiene viajes ACTIVOS, hay documentos
   *    en circulación. Inactivarlo (PUT con `estado: false`) es el reemplazo
   *    funcional.
   */
  eliminar: (id: number) =>
    del<{ message?: string; tipo_eliminacion: TipoEliminacionRango }>(
      `/rangos-numeracion/${id}`,
    ),
};
