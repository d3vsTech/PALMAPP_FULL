/**
 * API Client — Módulo Terceros y Operarios
 *
 * Cubre el contrato completo de `API_TERCEROS.md`:
 *  - CRUD de Terceros (Jurídica o Natural).
 *  - CRUD de Operarios anidados.
 *  - Wizard init (sin tercero) y Configuración init (con tercero existente).
 *  - Overrides de precios: labor-precios, precios-cosecha, precios-abono.
 *  - Toggle (activar/desactivar) para terceros y operarios.
 *
 * Base URL: {host}/api/v1/tenant  (el prefijo `/api` ya viene en BASE_URL)
 * Headers : Authorization Bearer + X-Tenant-Id (vía `requiresTenant = true`)
 * Permiso : `configuracion.editar` (los `/select` también aceptan
 *           `operaciones.crear|editar` para poblar dropdowns del wizard).
 */
import { apiClient, type PaginatedResponse } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Terceros
// ─────────────────────────────────────────────────────────────────────────────

export type TipoPersonaTercero = 'JURIDICA' | 'NATURAL';

/**
 * Entidad Tercero. Los campos de identificación dependen de `tipo_persona`:
 *   - JURIDICA → `nit` + `razon_social` (+ `representante`)
 *   - NATURAL  → `cedula` + `nombre_completo`
 */
export interface Tercero {
  id: number;
  tipo_persona: TipoPersonaTercero;
  // Jurídica
  nit?: string | null;
  razon_social?: string | null;
  representante?: string | null;
  // Natural
  cedula?: string | null;
  nombre_completo?: string | null;
  // Comunes
  nombre_comercial?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado: boolean;
  /** Solo presente en GET /terceros/{id}. */
  operarios_count?: number;
}

/** Shape reducido de `/terceros/select`. */
export interface TerceroSelectItem {
  id: number;
  tipo_persona: TipoPersonaTercero;
  /** Mejor campo para mostrar: razon_social o nombre_completo según tipo. */
  nombre_display: string;
  /** NIT o cédula según tipo. */
  documento: string;
}

/** Payload para crear Tercero. El backend valida según `tipo_persona`. */
export type CrearTerceroPayload =
  | {
      tipo_persona: 'JURIDICA';
      nit: string;
      razon_social: string;
      representante?: string;
      nombre_comercial?: string;
      telefono?: string;
      email?: string;
    }
  | {
      tipo_persona: 'NATURAL';
      cedula: string;
      nombre_completo: string;
      nombre_comercial?: string;
      telefono?: string;
      email?: string;
    };

/** Editar Tercero — todos los campos opcionales (`sometimes` en backend). */
export type EditarTerceroPayload = Partial<{
  tipo_persona: TipoPersonaTercero;
  nit: string;
  razon_social: string;
  representante: string;
  cedula: string;
  nombre_completo: string;
  nombre_comercial: string;
  telefono: string;
  email: string;
}>;

/** Filtros del listado paginado (GET /terceros). */
export interface ListarTercerosParams {
  tipo_persona?: TipoPersonaTercero;
  estado?: boolean;
  search?: string;
  per_page?: number;
  page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Operarios
// ─────────────────────────────────────────────────────────────────────────────

export interface Operario {
  id: number;
  tercero_id: number;
  nombres: string;
  apellidos: string;
  cedula?: string | null;
  cargo?: string | null;
  /** Texto libre (no FK). Igual que en Empleado. */
  eps?: string | null;
  /** Texto libre (no FK). */
  arl?: string | null;
  estado: boolean;
}

/** Shape de `/operarios/select` (standalone) y wizard de operaciones. */
export interface OperarioSelectItem {
  id: number;
  tercero_id: number;
  nombre_completo: string;
  cedula: string;
  /** Mostrado al lado del nombre en el dropdown unificado. */
  tercero_nombre: string;
}

export interface CrearOperarioPayload {
  nombres: string;
  apellidos: string;
  cedula?: string;
  cargo?: string;
  eps?: string;
  arl?: string;
}

export type EditarOperarioPayload = Partial<CrearOperarioPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Overrides de precios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Override de precio (y opcionalmente modo de pago) por tercero+labor.
 *
 * `tipo_pago` se introdujo en la API actualizada (ver §2 y §3 de
 * `API_TERCEROS.md`):
 *  - `null`        → solo override de monto. El modo de pago efectivo lo
 *                    hereda del catálogo (`labor.tipo_pago`).
 *  - `POR_PALMA`   → fuerza pago por palma para este tercero+labor. Solo
 *                    válido para labores PALMA — FINCA lo rechaza con 422.
 *  - `JORNAL_FIJO` → fuerza pago plano.
 */
export interface TerceroLaborPrecio {
  id: number;
  labor_id: number;
  tipo_pago?: 'POR_PALMA' | 'JORNAL_FIJO' | null;
  precio_palma: string | number;
  estado: boolean;
}

export interface UpsertLaborPrecioPayload {
  labor_id: number;
  precio_palma: number;
  /**
   * Override explícito del modo de pago para este tercero+labor.
   * Omitir (o enviar `null`) deja el modo heredado del catálogo del tenant.
   * `POR_PALMA` con `labor.categoria=FINCA` → 422 ("FINCA solo admite JORNAL_FIJO").
   */
  tipo_pago?: 'POR_PALMA' | 'JORNAL_FIJO' | null;
}

export interface TerceroPrecioCosecha {
  id: number;
  lote_id: number;
  anio: number;
  precio: string | number;
}

export interface UpsertPrecioCosechaPayload {
  lote_id: number;
  /** Opcional. Si se omite, el backend usa `now()->year`. */
  anio?: number;
  precio: number;
}

export interface TerceroPrecioAbono {
  id: number;
  gramos_min: string | number;
  gramos_max: string | number;
  precio_palma: string | number;
  estado: boolean;
}

export interface CrearPrecioAbonoPayload {
  gramos_min: number;
  gramos_max: number;
  precio_palma: number;
}

export type EditarPrecioAbonoPayload = Partial<CrearPrecioAbonoPayload> & {
  estado?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Bundles del wizard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Item del bundle `labores_contexto`. La API actualizada (ver §6.1 de
 * `API_TERCEROS.md`) incluye labores PALMA + FINCA en el mismo arreglo,
 * **excluyendo COSECHA y FERTILIZACION** (esas tienen sus flujos dedicados:
 * `precios-cosecha` y `precios-abono`). El frontend agrupa por `categoria`.
 */
export interface LaborContextoItem {
  id: number;
  nombre: string;
  categoria: 'PALMA' | 'FINCA';
  tipo: string | null;
  tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
  precio_palma: string | number | null;
  es_sistema: boolean;
}

export interface LoteContextoItem {
  id: number;
  nombre: string;
  sublotes: Array<{ id: number; nombre: string; estado?: boolean }>;
}

export interface ParametricaSelectItem {
  id: number;
  nombre: string;
}

/**
 * Bundle del paso 2-3 del wizard de creación (§6.1). Devuelve los catálogos
 * necesarios para configurar precios y operarios sin necesidad de tener
 * todavía un `tercero_id`.
 */
export interface TerceroWizardInit {
  /** Labores PALMA activas excluyendo COSECHA y FERTILIZACION. */
  labores_contexto: LaborContextoItem[];
  lotes_contexto: LoteContextoItem[];
  precios_abono_referencia: Array<{
    gramos_min: string | number;
    gramos_max: string | number;
    precio_palma: string | number;
    estado: boolean;
  }>;
  anio_actual: number;
  eps: ParametricaSelectItem[];
  arl: ParametricaSelectItem[];
}

/**
 * Bundle de la pantalla de edición (§6) — estado actual del tercero +
 * overrides ya configurados + catálogos para la UI.
 */
export interface TerceroConfiguracionInit {
  tercero: Tercero;
  labor_precios: TerceroLaborPrecio[];
  precios_cosecha: TerceroPrecioCosecha[];
  precios_abono: TerceroPrecioAbono[];
  labores_contexto: LaborContextoItem[];
  lotes_contexto: LoteContextoItem[];
  eps: ParametricaSelectItem[];
  arl: ParametricaSelectItem[];
}

/**
 * Payload para `POST /terceros/{id}/wizard-complete`.
 * Consolida toda la configuración del wizard en una sola petición,
 * eliminando las ~15 peticiones individuales del flujo anterior.
 * El backend lo procesa dentro de una DB transaction.
 */
export interface WizardCompletePayload {
  precios_cosecha: Pick<UpsertPrecioCosechaPayload, 'lote_id' | 'precio'>[];
  precios_abono: CrearPrecioAbonoPayload[];
  labor_precios: UpsertLaborPrecioPayload[];
  operarios: CrearOperarioPayload[];
}

/** Resumen de ítems persistidos por `wizard-complete`. */
export interface WizardCompleteResult {
  labor_precios: number;
  precios_cosecha: number;
  precios_abono: number;
  operarios: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/v1/tenant';
const T = true;

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// Respuestas de mutaciones.
type Mutation<X> = { data: X; message?: string };
type MessageOnly = { message: string };

// ─────────────────────────────────────────────────────────────────────────────
// API — Terceros (§4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permiso: `configuracion.editar`. El `/select` también acepta
 * `operaciones.{crear|editar}` para dropdowns del wizard de planilla.
 */
export const tercerosApi = {
  listar: (params?: ListarTercerosParams) =>
    apiClient.get<PaginatedResponse<Tercero>>(
      `${BASE}/terceros${qs(params as Record<string, unknown>)}`,
      T,
    ),

  select: () =>
    apiClient.get<{ data: TerceroSelectItem[] }>(`${BASE}/terceros/select`, T),

  ver: (id: number) =>
    apiClient.get<{ data: Tercero }>(`${BASE}/terceros/${id}`, T),

  crear: (payload: CrearTerceroPayload) =>
    apiClient.post<Mutation<Tercero>>(`${BASE}/terceros`, payload, T),

  editar: (id: number, payload: EditarTerceroPayload) =>
    apiClient.put<Mutation<Tercero>>(`${BASE}/terceros/${id}`, payload, T),

  /**
   * §4 DELETE /terceros/{id}.
   * 409 `TERCERO_CON_OPERARIOS` si tiene operarios asociados.
   */
  eliminar: (id: number) =>
    apiClient.delete<MessageOnly>(`${BASE}/terceros/${id}`, T),

  toggle: (id: number) =>
    apiClient.patch<Mutation<Tercero>>(`${BASE}/terceros/${id}/toggle`, undefined, T),

  /** §6.1 contexto para creación sin tercero. */
  wizardInit: () =>
    apiClient.get<{ data: TerceroWizardInit }>(`${BASE}/terceros/wizard-init`, T),

  /** §6 bundle completo para edición de un tercero existente. */
  configuracionInit: (terceroId: number) =>
    apiClient.get<{ data: TerceroConfiguracionInit }>(
      `${BASE}/terceros/${terceroId}/configuracion/init`,
      T,
    ),

  /**
   * Consolida precios-cosecha, precios-abono, labor-precios y operarios en
   * una sola petición atómica. Reemplaza las N peticiones individuales del
   * wizard de creación. Ver `WIZARD_COMPLETE_ENDPOINT.md` para la spec del backend.
   */
  wizardComplete: (terceroId: number, payload: WizardCompletePayload) =>
    apiClient.post<Mutation<WizardCompleteResult>>(
      `${BASE}/terceros/${terceroId}/wizard-complete`,
      payload,
      T,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// API — Operarios (§5)
// ─────────────────────────────────────────────────────────────────────────────

export const operariosApi = {
  listarPorTercero: (terceroId: number) =>
    apiClient.get<{ data: Operario[] }>(
      `${BASE}/terceros/${terceroId}/operarios`,
      T,
    ),

  selectPorTercero: (terceroId: number) =>
    apiClient.get<{ data: OperarioSelectItem[] }>(
      `${BASE}/terceros/${terceroId}/operarios/select`,
      T,
    ),

  /**
   * §5 GET /operarios/select — dropdown STANDALONE con TODOS los operarios
   * activos del tenant (cruza terceros). Consumido por el wizard de planilla.
   */
  selectGlobal: () =>
    apiClient.get<{ data: OperarioSelectItem[] }>(`${BASE}/operarios/select`, T),

  crear: (terceroId: number, payload: CrearOperarioPayload) =>
    apiClient.post<Mutation<Operario>>(
      `${BASE}/terceros/${terceroId}/operarios`,
      payload,
      T,
    ),

  editar: (terceroId: number, operarioId: number, payload: EditarOperarioPayload) =>
    apiClient.put<Mutation<Operario>>(
      `${BASE}/terceros/${terceroId}/operarios/${operarioId}`,
      payload,
      T,
    ),

  /**
   * §5 DELETE — 409 `OPERARIO_CON_JORNALES` si el operario tiene jornales o
   * registros de cosecha.
   */
  eliminar: (terceroId: number, operarioId: number) =>
    apiClient.delete<MessageOnly>(
      `${BASE}/terceros/${terceroId}/operarios/${operarioId}`,
      T,
    ),

  toggle: (terceroId: number, operarioId: number) =>
    apiClient.patch<Mutation<Operario>>(
      `${BASE}/terceros/${terceroId}/operarios/${operarioId}/toggle`,
      undefined,
      T,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// API — Overrides de precios (§6)
// ─────────────────────────────────────────────────────────────────────────────

export const tercerosPreciosApi = {
  // ── Labores ──────────────────────────────────────────────────────────────

  /** Upsert por (tercero, labor_id). */
  upsertLaborPrecio: (terceroId: number, payload: UpsertLaborPrecioPayload) =>
    apiClient.post<Mutation<TerceroLaborPrecio>>(
      `${BASE}/terceros/${terceroId}/labor-precios`,
      payload,
      T,
    ),

  /** Eliminar override → sistema vuelve al precio del catálogo del tenant. */
  eliminarLaborPrecio: (terceroId: number, precioId: number) =>
    apiClient.delete<MessageOnly>(
      `${BASE}/terceros/${terceroId}/labor-precios/${precioId}`,
      T,
    ),

  // ── Cosecha ──────────────────────────────────────────────────────────────

  /**
   * Upsert por (tercero, lote_id, anio). El backend acepta `anio` opcional —
   * si se omite usa `now()->year`. El wizard de creación lo omite siempre.
   */
  upsertPrecioCosecha: (terceroId: number, payload: UpsertPrecioCosechaPayload) =>
    apiClient.post<Mutation<TerceroPrecioCosecha>>(
      `${BASE}/terceros/${terceroId}/precios-cosecha`,
      payload,
      T,
    ),

  eliminarPrecioCosecha: (terceroId: number, precioId: number) =>
    apiClient.delete<MessageOnly>(
      `${BASE}/terceros/${terceroId}/precios-cosecha/${precioId}`,
      T,
    ),

  // ── Abono ────────────────────────────────────────────────────────────────

  /**
   * Crea escala de gramos. Valida solapamiento dentro del mismo tercero →
   * 409 `RANGO_SOLAPADO`.
   */
  crearPrecioAbono: (terceroId: number, payload: CrearPrecioAbonoPayload) =>
    apiClient.post<Mutation<TerceroPrecioAbono>>(
      `${BASE}/terceros/${terceroId}/precios-abono`,
      payload,
      T,
    ),

  editarPrecioAbono: (
    terceroId: number,
    precioId: number,
    payload: EditarPrecioAbonoPayload,
  ) =>
    apiClient.put<Mutation<TerceroPrecioAbono>>(
      `${BASE}/terceros/${terceroId}/precios-abono/${precioId}`,
      payload,
      T,
    ),

  eliminarPrecioAbono: (terceroId: number, precioId: number) =>
    apiClient.delete<MessageOnly>(
      `${BASE}/terceros/${terceroId}/precios-abono/${precioId}`,
      T,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGOS DE ERROR (§9)
// ─────────────────────────────────────────────────────────────────────────────

export const TercerosErrorCodes = {
  TERCERO_CON_OPERARIOS: 'TERCERO_CON_OPERARIOS',
  OPERARIO_CON_JORNALES: 'OPERARIO_CON_JORNALES',
  RANGO_SOLAPADO: 'RANGO_SOLAPADO',
  CALC_ERROR: 'CALC_ERROR',
} as const;

export type TercerosErrorCode =
  typeof TercerosErrorCodes[keyof typeof TercerosErrorCodes];

/** Claves de caché en memoria usadas por los componentes del módulo. */
export const TercerosCacheKeys = {
  /** Listado principal en `TercerosTab.tsx`. Invalidar tras crear/eliminar/toggle. */
  LISTADO: 'config:terceros',
  /** Bundle del wizard. Estable durante la sesión. */
  WIZARD_INIT: 'config:terceros:wizard-init',
} as const;
