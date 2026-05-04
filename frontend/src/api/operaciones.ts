/**
 * API Client — Módulo Operaciones (Planilla del Día)
 *
 * Cubre el wizard de 5 pasos:
 *  - Paso 1: Información General
 *  - Paso 2: Labores de Palma (cosecha, plateo, poda, fertilización, sanidad, otros)
 *  - Paso 3: Labores de Finca (categoría=FINCA en jornales)
 *  - Paso 4: Horas Extras
 *  - Paso 5: Finalización + Ausencias
 *
 * Base URL: {host}/api/v1/tenant
 * Headers: Authorization: Bearer {jwt}, X-Tenant-Id: {tenant_id}
 */
import { requestConToken, fetchConToken } from './request';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoPlanilla = 'BORRADOR' | 'APROBADA';

export interface Planilla {
  id: number;
  fecha: string;            // YYYY-MM-DD
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hubo_lluvia: boolean;
  cantidad_lluvia?: string | number | null;
  observaciones?: string | null;
  estado: EstadoPlanilla;
  creado_por?: number;
  creado_por_rel?: { id: number; name: string } | null;
  aprobado_por?: number | null;
  aprobado_por_rel?: { id: number; name: string } | null;
  jornales_count?: number;
  cosechas_count?: number;
  ausencias_count?: number;
  colaboradores_count?: number;
  total_jornales_sum?: string | number;
  total_cosechas_sum?: string | number;
  total_general?: string | number;
}

export interface Resumen {
  fecha: string;
  elaborado_por: string;
  hubo_lluvia: boolean;
  cantidad_lluvia: string | null;
  inicio_labores: string | null;
  estado: EstadoPlanilla;
  labores: {
    cosecha: number;
    plateo: number;
    poda: number;
    fertilizacion: number;
    sanidad: number;
    otros: number;
    auxiliares: number;
  };
  ausencias: {
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    liquidadas: number;
    total: number;
  };
  horas_extra?: {
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    liquidadas: number;
    total: number;
    horas_totales: string;
    valor_total: string;
  };
}

export interface Indicadores {
  periodo: { tipo: string; fecha_desde: string; fecha_hasta: string };
  planillas_borrador: number;
  planillas_aprobadas: number;
  total_planillas: number;
}

export type Periodo = 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/tenant';

function qs(params: Record<string, any> = {}): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

/** Parsea respuestas no-OK e incluye el `code` del backend cuando aplica. */
async function parseError(res: Response): Promise<{ message: string; code?: string }> {
  let data: any = null;
  try {
    const ct = res.headers.get('content-type') ?? '';
    data = ct.includes('application/json') ? await res.json() : await res.text();
  } catch {}
  if (data && typeof data === 'object') {
    const msg =
      (data.errors && typeof data.errors === 'object' && (() => {
        for (const k of Object.keys(data.errors)) {
          const arr = data.errors[k];
          if (Array.isArray(arr) && arr.length && typeof arr[0] === 'string') return arr[0];
          if (typeof arr === 'string' && arr.trim()) return arr;
        }
        return null;
      })()) ||
      data.message ||
      data.error ||
      'Error al comunicarse con el servidor';
    return { message: typeof msg === 'string' ? msg : 'Error', code: data.code };
  }
  return { message: typeof data === 'string' && data.trim() ? data : 'Error al comunicarse con el servidor' };
}

/** Versión de request que devuelve `{ message, code }` en errores HTTP. */
async function smartRequest<T = any>(endpoint: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchConToken(endpoint, undefined, opciones);
  if (!res.ok) {
    const { message, code } = await parseError(res);
    const err: any = new Error(message);
    if (code) err.code = code;
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null as unknown as T;
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('application/json') ? await res.json() : (await res.text() as any)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. operacionesApi (Planilla)
// ─────────────────────────────────────────────────────────────────────────────

export const operacionesApi = {
  listar: (params: {
    estado?: EstadoPlanilla;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  } = {}) =>
    requestConToken<{ data: Planilla[]; meta: any }>(`${BASE}/operaciones${qs(params)}`),

  /**
   * Trae el detalle completo de una planilla incluyendo:
   *  - cosechas[].cuadrilla[].empleado
   *  - jornales[] con empleado, labor, lote, sublote, insumo
   *  - ausencias[] con empleado y motivo_ausencia
   *  - horas_extra[]
   *  - creado_por_rel, aprobado_por_rel
   */
  ver: (id: number) =>
    requestConToken<{ data: Planilla & Record<string, any> }>(`${BASE}/operaciones/${id}`),

  // Alias para compat con código que ya llamaba .detalle(...)
  detalle: (id: number) =>
    requestConToken<{ data: Planilla & Record<string, any> }>(`${BASE}/operaciones/${id}`),

  crear: (payload: {
    fecha: string;
    elaborado_por?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia: number | null;
    observaciones?: string | null;
  }) =>
    smartRequest<{ data: Planilla; message?: string }>(`${BASE}/operaciones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    fecha: string;
    elaborado_por: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    hubo_lluvia: boolean;
    cantidad_lluvia: number | null;
    observaciones: string | null;
  }>) =>
    smartRequest<{ data: Planilla }>(`${BASE}/operaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/operaciones/${id}`, { method: 'DELETE' }),

  aprobar: (id: number) =>
    smartRequest<{ data: Planilla }>(`${BASE}/operaciones/${id}/aprobar`, { method: 'POST' }),

  resumen: (id: number) =>
    requestConToken<{ data: Resumen }>(`${BASE}/operaciones/${id}/resumen`),

  indicadores: (params: { periodo?: Periodo; fecha_desde?: string; fecha_hasta?: string } = {}) =>
    requestConToken<{ data: Indicadores }>(`${BASE}/operaciones/indicadores${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. cosechasApi
// ─────────────────────────────────────────────────────────────────────────────

export const cosechasApi = {
  crear: (operacionId: number, payload: {
    lote_id: number;
    sublote_id?: number | null;
    gajos_reportados: number;
    peso_confirmado?: number | null;
    cuadrilla: Array<{ empleado_id: number }>;
  }) =>
    smartRequest<{ data: any }>(`${BASE}/operaciones/${operacionId}/cosechas`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    gajos_reportados: number;
    gajos_reconteo: number;
    peso_confirmado: number | null;
    cuadrilla: Array<{ empleado_id: number }>;
  }>) =>
    smartRequest<{ data: any }>(`${BASE}/cosechas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/cosechas/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. jornalesApi (PLATEO/PODA/FERTILIZACION/SANIDAD/OTROS + FINCA)
// ─────────────────────────────────────────────────────────────────────────────

export interface JornalPalma {
  categoria: 'PALMA';
  tipo: 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | 'OTROS';
  empleado_id: number;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number;
  insumo_id?: number;
  gramos_por_palma?: number;
  descripcion?: string;
  nombre_trabajo?: string;
}

export interface JornalFinca {
  categoria: 'FINCA';
  labor_id: number;
  empleado_id: number;
  ubicacion?: string;
  observacion?: string | null;
}

export const jornalesApi = {
  crear: (operacionId: number, payload: JornalPalma | JornalFinca) =>
    smartRequest<{ data: any }>(`${BASE}/operaciones/${operacionId}/jornales`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<JornalPalma | JornalFinca>) =>
    smartRequest<{ data: any }>(`${BASE}/jornales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/jornales/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. horasExtraApi
// ─────────────────────────────────────────────────────────────────────────────

export const horasExtraApi = {
  crear: (operacionId: number, payload: {
    empleado_id: number;
    tipo_hora_extra_id: number;
    cantidad_horas: number;
    observacion?: string;
  }) =>
    smartRequest<{ data: any }>(`${BASE}/operaciones/${operacionId}/horas-extra`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    empleado_id: number;
    tipo_hora_extra_id: number;
    cantidad_horas: number;
    observacion: string;
  }>) =>
    smartRequest<{ data: any }>(`${BASE}/horas-extra/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/horas-extra/${id}`, { method: 'DELETE' }),

  aprobar: (id: number) =>
    smartRequest<{ data: any }>(`${BASE}/horas-extra/${id}/aprobar`, { method: 'POST' }),

  rechazar: (id: number, motivo_rechazo: string) =>
    smartRequest<{ data: any }>(`${BASE}/horas-extra/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. ausenciasApi
// ─────────────────────────────────────────────────────────────────────────────

export const ausenciasApi = {
  crear: (operacionId: number, payload: {
    empleado_id: number;
    motivo_ausencia_id: number;
    motivo?: string;
    fecha_fin?: string;
    entidad?: string;
    numero_radicado?: string;
    porcentaje_pago?: number;
  }) =>
    smartRequest<{ data: any }>(`${BASE}/operaciones/${operacionId}/ausencias`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<{
    motivo_ausencia_id: number;
    motivo: string;
    fecha_fin: string;
    entidad: string;
    numero_radicado: string;
    porcentaje_pago: number;
  }>) =>
    smartRequest<{ data: any }>(`${BASE}/ausencias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  eliminar: (id: number) =>
    smartRequest<{ message: string }>(`${BASE}/ausencias/${id}`, { method: 'DELETE' }),

  aprobar: (id: number) =>
    smartRequest<{ data: any }>(`${BASE}/ausencias/${id}/aprobar`, { method: 'POST' }),

  rechazar: (id: number, motivo_rechazo: string) =>
    smartRequest<{ data: any }>(`${BASE}/ausencias/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo }),
    }),

  subirDocumento: (id: number, documento: File) => {
    const fd = new FormData();
    fd.append('documento', documento);
    return smartRequest<{ data: any }>(`${BASE}/ausencias/${id}/documento`, {
      method: 'POST',
      body: fd,
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. selectsApi (dropdowns auxiliares del wizard)
// ─────────────────────────────────────────────────────────────────────────────

export const selectsApi = {
  colaboradores: (params: { modalidad_pago?: string; predio_id?: number } = {}) =>
    requestConToken<{ data: any[] }>(`${BASE}/colaboradores/select${qs(params)}`),

  /** Endpoint dedicado del wizard. Solo requiere operaciones.crear|editar. */
  lotes: (params: { predio_id?: number } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; predio_id: number }> }>(
      `${BASE}/operaciones/lotes/select${qs(params)}`
    ),

  /** Endpoint dedicado del wizard. Trae cantidad_palmas para autofill. */
  sublotes: (params: { lote_id?: number } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; lote_id: number; cantidad_palmas: number }> }>(
      `${BASE}/operaciones/sublotes/select${qs(params)}`
    ),

  insumos: () =>
    requestConToken<{ data: Array<{ id: number; nombre: string; unidad_medida?: string }> }>(
      `${BASE}/insumos/select`
    ),

  labores: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; valor_base?: string | number }> }>(
      `${BASE}/labores/select${qs(params)}`
    ),

  motivosAusencia: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; tipo_base?: string }> }>(
      `${BASE}/motivos-ausencia/select${qs(params)}`
    ),

  tiposHoraExtra: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{ id: number; nombre: string; codigo?: string; porcentaje_recargo?: string | number }> }>(
      `${BASE}/tipos-hora-extra/select${qs(params)}`
    ),

  /**
   * Crear insumo "on-the-fly" desde el wizard cuando el operador selecciona
   * "Otro" en el dropdown de Tipo de Fertilizante.
   *
   * Endpoint: POST /operaciones/insumos
   * Permisos: operaciones.crear u operaciones.editar
   *
   * Respuesta 201: { data: { id, nombre, unidad_medida: "GRAMOS" } }
   * Respuesta 409 INSUMO_DUPLICADO: el front debe pedir al usuario que lo
   *   seleccione del dropdown en lugar de crearlo.
   *
   * @example
   *   try {
   *     const r = await selectsApi.crearInsumo('Urea 46%');
   *     // → r.data.id, r.data.nombre, r.data.unidad_medida
   *   } catch (err: any) {
   *     if (err.code === 'INSUMO_DUPLICADO') {
   *       // Pedir al usuario que use el dropdown
   *     }
   *   }
   */
  crearInsumo: (nombre: string) =>
    smartRequest<{ data: { id: number; nombre: string; unidad_medida: string } }>(
      `${BASE}/operaciones/insumos`,
      {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      }
    ),
};