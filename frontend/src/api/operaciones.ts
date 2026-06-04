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
 *
 * Alineado con API_OPERACIONES.md (versión vigente). Incluye:
 *  - Indicadores (§2.2.1) con period semanal/quincenal/mensual/personalizado
 *  - Cosecha con peso_confirmado opcional al crear (§3.1)
 *  - Jornales unificados: solo `labor_id` (§3.2 y §3.3). El backend deriva
 *    categoría y tipo desde la labor. Las custom de palma tienen tipo=null.
 *  - SANIDAD con `tipo_pago` dependiente (POR_PALMA vs JORNAL_FIJO)
 *  - Horas Extras con snapshot legal + aprobar/rechazar (§4)
 *  - Ausencias con aprobar/rechazar/documento + snapshot del motivo (§5)
 *  - Selects: labores (catálogo unificado), crearInsumo on-the-fly (§8)
 *  - Códigos de error: OperacionesErrorCodes (§0)
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

/**
 * §6 Resumen del wizard (GET /operaciones/{id}/resumen)
 *
 * Buckets de `labores`:
 *  - `cosecha`, `plateo`, `poda`, `fertilizacion`, `sanidad`: las 5 labores
 *    fijas del sistema (es_sistema=true), una por bucket.
 *  - `otros`: agrupa los jornales custom de palma (categoria=PALMA, tipo=null).
 *  - `labores_finca`: jornales con categoria=FINCA (antes `auxiliares` en el
 *    doc viejo; el backend ya lo renombró).
 */
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
    labores_finca: number;
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

// ─── Entidades del módulo (cuerpo de respuestas) ──────────────────────────────

export type EstadoNovedad = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';

export interface CosechaCuadrillaItem {
  id: number;
  empleado_id: number;
  peso_calculado_empleado: string | number | null;
  valor_calculado: string | number | null;
  empleado?: { id: number; primer_nombre?: string; primer_apellido?: string };
}

export interface Cosecha {
  id: number;
  operacion_id: number;
  lote_id: number;
  sublote_id: number | null;
  gajos_reportados: number;
  gajos_reconteo?: number | null;
  peso_confirmado: string | number | null;
  precio_cosecha: string | number | null;
  promedio_kg_gajo?: string | number | null;
  valor_total: string | number | null;
  cuadrilla: CosechaCuadrillaItem[];
}

export type CategoriaJornal = 'PALMA' | 'FINCA';
/** Tipos snapshoteados en el jornal. Las labores custom de palma tienen tipo=null. */
export type TipoJornalPalma = 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD';

export interface Jornal {
  id: number;
  operacion_id: number;
  empleado_id: number;
  categoria: CategoriaJornal;
  tipo?: TipoJornalPalma | null;
  lote_id?: number | null;
  sublote_id?: number | null;
  /** Referencia al catálogo unificado de labores (PALMA fijas + custom + FINCA). */
  labor_id?: number | null;
  cantidad_palmas?: number | null;
  insumo_id?: number | null;
  gramos_por_palma?: number | null;
  descripcion?: string | null;
  nombre_trabajo?: string | null;
  ubicacion?: string | null;
  valor_unitario: string | number | null;
  valor_total: string | number | null;
  estado: boolean;
  empleado?: any;
  labor?: any;
  lote?: any;
  sublote?: any;
  insumo?: any;
}

export interface HoraExtra {
  id: number;
  operacion_id: number;
  empleado_id: number;
  tipo_hora_extra_id: number;
  codigo: string;
  porcentaje_recargo: string | number;
  paga_hora_completa: boolean;
  cantidad_horas: string | number;
  valor_hora_base: string | number;
  valor_calculado: string | number;
  estado: EstadoNovedad;
  observacion?: string | null;
  aprobado_por?: number | null;
  aprobado_at?: string | null;
  motivo_rechazo?: string | null;
  empleado?: any;
  tipoHoraExtra?: any;
}

export interface Ausencia {
  id: number;
  operacion_id: number;
  empleado_id: number;
  motivo_ausencia_id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_calendario: number;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago: string | number;
  estado: EstadoNovedad;
  motivo?: string | null;
  documento_soporte?: string | null;
  entidad?: string | null;
  numero_radicado?: string | null;
  empleado?: any;
  motivo_ausencia?: any;
}

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
// 3. jornalesApi (catálogo unificado — solo se envía labor_id)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload único para jornales (PALMA fijas, custom de palma y FINCA).
 *
 * El cliente solo envía `labor_id`. El backend deriva `categoria` y `tipo` desde
 * la labor y los snapshotea en el jornal. NO enviar `categoria` ni `tipo` (son
 * silenciosamente descartados, pero conviene omitirlos).
 *
 * Reglas resumidas (según labor seleccionada):
 *  - `tipo_pago='POR_PALMA'` → enviar `cantidad_palmas` (requerido).
 *  - `tipo_pago='JORNAL_FIJO'` → no enviar `cantidad_palmas`.
 *  - `tipo='FERTILIZACION'` + `POR_PALMA` → además `insumo_id` + `gramos_por_palma`.
 *  - `tipo='SANIDAD'` → `descripcion` requerida.
 *  - `categoria='FINCA'` → opcional `ubicacion` (texto libre).
 *  - COSECHA NO usa este endpoint; va por `POST /operaciones/{id}/cosechas`.
 */
export interface JornalPayload {
  labor_id: number;
  empleado_id: number;
  lote_id?: number | null;
  sublote_id?: number | null;
  cantidad_palmas?: number;
  insumo_id?: number;
  gramos_por_palma?: number;
  descripcion?: string;
  nombre_trabajo?: string;
  ubicacion?: string;
  observacion?: string | null;
}

/** @deprecated Usar `JornalPayload`. La API ya no requiere `categoria`/`tipo`. */
export type JornalPalma = JornalPayload;
/** @deprecated Usar `JornalPayload`. La API ya no requiere `categoria`. */
export type JornalFinca = JornalPayload;

export const jornalesApi = {
  crear: (operacionId: number, payload: JornalPayload) =>
    smartRequest<{ data: any }>(`${BASE}/operaciones/${operacionId}/jornales`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: number, payload: Partial<JornalPayload>) =>
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

  /**
   * §4 unificado: GET /labores/select devuelve TODAS las labores activas con
   * el `categoria`, `tipo`, `tipo_pago`, `precio_palma`, `es_sistema`,
   * `requiere_cosecha_workflow`.
   * Filtros: `?categoria=PALMA|FINCA`, `?estado=false` para inactivas.
   */
  labores: (params: { categoria?: 'PALMA' | 'FINCA'; estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      categoria: 'PALMA' | 'FINCA';
      tipo: 'COSECHA' | 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD' | null;
      tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
      precio_palma: string | number | null;
      es_sistema: boolean;
      requiere_cosecha_workflow: boolean;
    }> }>(`${BASE}/labores/select${qs(params)}`),

  /**
   * @deprecated `/labores-palma/select` ya no existe. Usa `labores({categoria:'PALMA'})`.
   * Wrapper retrocompat: filtra del endpoint unificado las labores PALMA
   * custom (es_sistema=false) más las fijas, para mantener compat con el wizard
   * tab OTROS que muestra todas las opciones de palma.
   */
  laboresPalma: async (_params: { estado?: boolean } = {}) => {
    const res = await requestConToken<{ data: Array<any> }>(
      `${BASE}/labores/select${qs({ categoria: 'PALMA' })}`,
    );
    return { data: (res.data ?? []) as Array<{
      id: number;
      nombre: string;
      tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
      precio_palma: string | number | null;
      es_sistema?: boolean;
      tipo?: string | null;
      requiere_cosecha_workflow?: boolean;
    }> };
  },

  /**
   * @deprecated `/precios-palma` ya no existe. Usa `labores({categoria:'PALMA'})`
   * y filtra `es_sistema=true` para tener solo las 5 fijas.
   */
  preciosPalma: async () => {
    const res = await requestConToken<{ data: Array<any> }>(
      `${BASE}/labores/select${qs({ categoria: 'PALMA' })}`,
    );
    const fijas = (res.data ?? []).filter((l: any) => l.es_sistema === true);
    return { data: fijas as Array<{
      id: number;
      tipo: 'COSECHA' | 'PLATEO' | 'PODA' | 'FERTILIZACION' | 'SANIDAD';
      tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
      precio_palma: string | number | null;
      estado: boolean;
      es_sistema: boolean;
    }> };
  },

  motivosAusencia: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      tipo_base?: string;
      es_remunerada?: boolean;
      afecta_nomina?: boolean;
      requiere_soporte?: boolean;
      color?: string;
    }> }>(`${BASE}/motivos-ausencia/select${qs(params)}`),

  tiposHoraExtra: (params: { estado?: boolean } = {}) =>
    requestConToken<{ data: Array<{
      id: number;
      nombre: string;
      codigo?: string;
      porcentaje_recargo?: string | number;
      franja_horaria?: string;
      es_extra?: boolean;
      paga_hora_completa?: boolean;
    }> }>(`${BASE}/tipos-hora-extra/select${qs(params)}`),

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

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGOS DE ERROR DEL MÓDULO (§0 del doc)
// ─────────────────────────────────────────────────────────────────────────────

export const OperacionesErrorCodes = {
  /** Intento de mutar una planilla ya aprobada. */
  OPERACION_APROBADA: 'OPERACION_APROBADA',
  /** Intento de eliminar planilla con jornales/cosechas/ausencias/horas extras. */
  OPERACION_CON_HIJOS: 'OPERACION_CON_HIJOS',
  /** La cosecha ya está asignada a un viaje. */
  COSECHA_EN_VIAJE: 'COSECHA_EN_VIAJE',
  /** Falta precio configurado, insumo sin rango, precios_cosecha sin registro, etc. */
  CALC_ERROR: 'CALC_ERROR',
  /** Intento de editar/eliminar una ausencia ya liquidada en nómina. */
  AUSENCIA_LIQUIDADA: 'AUSENCIA_LIQUIDADA',
  /** Aprobar/rechazar una ausencia que no está en PENDIENTE. */
  AUSENCIA_ESTADO_INVALIDO: 'AUSENCIA_ESTADO_INVALIDO',
  /** Eliminar un motivo de ausencia con ausencias asociadas. */
  MOTIVO_CON_AUSENCIAS: 'MOTIVO_CON_AUSENCIAS',
  /** Editar/eliminar una hora extra ya liquidada en nómina. */
  HORA_EXTRA_LIQUIDADA: 'HORA_EXTRA_LIQUIDADA',
  /** Aprobar/rechazar una hora extra que no está en PENDIENTE. */
  HORA_EXTRA_ESTADO_INVALIDO: 'HORA_EXTRA_ESTADO_INVALIDO',
  /** Eliminar un tipo paramétrico de hora extra con registros asociados. */
  TIPO_HORA_EXTRA_CON_REGISTROS: 'TIPO_HORA_EXTRA_CON_REGISTROS',
  /** Insumo creado desde el wizard ya existe. Pedir al usuario seleccionarlo del dropdown. */
  INSUMO_DUPLICADO: 'INSUMO_DUPLICADO',
  /** Usuario sin permiso para la acción. */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type OperacionesErrorCode =
  typeof OperacionesErrorCodes[keyof typeof OperacionesErrorCodes];