/**
 * API — Liquidaciones (Cesantías · Intereses · Prima)
 * Base: /api/v1/tenant/liquidaciones
 *
 * Contrato: docs/API_LIQUIDACIONES.md (PR-L3, 2026-09-11).
 * Alcance actual del backend: pestaña CESANTIAS hasta "Confirmar" y
 * "Reabrir". Consignación y desprendible llegan con PR-L4; el tipo
 * INTERESES_CESANTIAS con PR-L5 (hoy responde 422
 * LIQUIDACION_TIPO_NO_SOPORTADO); PRIMA en fase 3.
 *
 * Permisos: liquidaciones.ver / .crear / .editar / .eliminar / .liquidar
 * / .pagar (instalaciones existentes: AddLiquidacionesPermissionsSeeder).
 */
import { apiClient } from './client';

const T = true; // requiresTenant

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoLiquidacion = 'CESANTIAS' | 'INTERESES_CESANTIAS' | 'PRIMA';
export type EstadoLiquidacionPeriodo = 'BORRADOR' | 'CERRADA';
/** Derivado del período: NA en borrador; según filas consignadas después. */
export type EstadoPagoPeriodo = 'NA' | 'PENDIENTE' | 'PARCIAL' | 'COMPLETO';
export type EstadoPagoFila = 'PENDIENTE' | 'CONSIGNADO' | 'PAGADO';

/** Advertencia genérica del módulo: `{ code, mensaje, ...extra }`. */
export interface AdvertenciaLiquidacion {
  code: string;
  mensaje?: string;
  [k: string]: unknown;
}

/** Ítem del listado (§2.3). */
export interface LiquidacionPeriodoItem {
  id: number;
  tipo: TipoLiquidacion;
  anio: number;
  /** 0 anual; 1|2 solo PRIMA. */
  semestre: number;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  /** La que fija la ley (puede caer en fin de semana). */
  fecha_limite_legal: string;
  /** Último día hábil anterior o igual a la legal. La que se pinta. */
  fecha_limite_operativa: string;
  estado: EstadoLiquidacionPeriodo;
  estado_pago: EstadoPagoPeriodo;
  total_colaboradores: number;
  total_liquidado: number;
  total_consignado: number;
  monto_pendiente: number;
  dias_para_limite: number;
  vencida: boolean;
  periodo_base_id: number | null;
  cerrado_at: string | null;
  created_at: string;
}

/** Snapshot del colaborador que viaja en cada fila. */
export interface EmpleadoLiquidacionRef {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
  fondo_cesantias: string | null;
  fecha_ingreso?: string;
}

/** Fila del período (§2.5). Antes de confirmar viene con ceros. */
export interface LiquidacionFila {
  id: number;
  empleado: EmpleadoLiquidacionRef;
  fecha_computo_desde: string | null;
  fecha_computo_hasta: string | null;
  dias_vinculacion: number;
  dias_computados: number;
  metodo_base: 'ULTIMO_SALARIO' | 'PROMEDIO' | 'MANUAL' | null;
  base_prestacional: number;
  valor_calculado: number;
  valor_final: number;
  cobertura_nominas_pct: number | null;
  estado: 'PENDIENTE' | 'LIQUIDADO';
  estado_pago: EstadoPagoFila;
  fecha_pago: string | null;
  valor_pagado: number | null;
  ajuste_manual: Record<string, unknown> | null;
  advertencias_count: number;
  advertencias: AdvertenciaLiquidacion[];
}

/** Detalle del período (§2.5) = ítem del listado + lo propio del detalle. */
export interface LiquidacionPeriodoDetalle extends LiquidacionPeriodoItem {
  notas: string | null;
  parametros_snapshot: Record<string, unknown> | null;
  calculo_hash: string | null;
  creado_por: { id: number; name: string } | null;
  cerrado_por: { id: number; name: string } | null;
  filas: LiquidacionFila[];
  totales: { liquidado: number; consignado: number; pendiente: number };
  advertencias_globales: AdvertenciaLiquidacion[];
}

/** Cards del listado (§2.1). Los totales solo suman períodos CERRADA. */
export interface ResumenLiquidaciones {
  total_liquidado: number;
  total_consignado: number;
  monto_pendiente: number;
  periodos_pendientes: number;
  periodos_borrador: number;
  periodos_cerrados: number;
}

/** Precarga del formulario "Nuevo período" (§2.2). */
export interface FechaLimiteLiquidacion {
  tipo: TipoLiquidacion;
  anio: number;
  fecha_limite_legal: string;
  fecha_limite_operativa: string;
  es_dia_habil: boolean;
  texto_config: string;
  fuente: string;
  advertencias?: AdvertenciaLiquidacion[];
}

export interface CrearPeriodoPayload {
  tipo: TipoLiquidacion;
  anio: number;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  fecha_limite_legal?: string;
  /** true para crear un segundo período del mismo tipo y año (tras el 409). */
  permitir_multiple?: boolean;
}

/** Colaborador elegible del paso 2 (§3.1). */
export interface EmpleadoDisponibleLiquidacion {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
  fondo_cesantias: string | null;
  estado: boolean;
  eliminado: boolean;
  /**
   * ⚠ Para PRODUCCION es un placeholder al SMLV
   * (`salario_base_es_contractual = false`): la columna "Salario base"
   * debe pintar `promedio_mensual_devengado` en ese caso.
   */
  salario_base: number;
  salario_base_es_contractual: boolean;
  promedio_mensual_devengado: number;
  base_prestacional_estimada: number;
  cobertura_nominas_pct: number;
  dias_vinculacion: number;
  dias_computados: number;
  advertencias: string[];
}

export interface EmpleadoExcluidoLiquidacion {
  id: number;
  nombre_completo: string;
  documento?: string;
  modalidad_pago?: string;
  motivo:
    | 'RETIRADO_EN_EL_ANIO'
    | 'SIN_CONTRATO_EN_RANGO'
    | 'INACTIVO'
    | 'ELIMINADO'
    | 'YA_EN_PERIODO'
    | 'EN_LIQUIDACION_SOLAPADA'
    | string;
  fecha_retiro?: string;
  fila_id?: number;
  liquidacion?: Partial<LiquidacionPeriodoItem> | null;
}

export interface OmitidoLiquidacion {
  id: number;
  nombre_completo: string;
  code: string;
  liquidacion?: Partial<LiquidacionPeriodoItem> | null;
}

// ─── Preview (§4.1) ───────────────────────────────────────────────────────────

export interface PreviewFilaLiquidacion {
  fila_id: number;
  empleado_id: number;
  tipo: TipoLiquidacion;
  empleado: EmpleadoLiquidacionRef;
  dias: {
    fecha_computo_desde: string;
    fecha_computo_hasta: string;
    dias_vinculacion: number;
    dias_descontados: number;
    dias_computados: number;
    dias_incapacidad: number;
    dias_base_promedio: number;
    detalle_descuentos: Array<{
      tipo: string;
      desde: string;
      hasta: string;
      dias: number;
      regla: string;
    }>;
    contrato_id: number | null;
  };
  base: {
    metodo_base: 'ULTIMO_SALARIO' | 'PROMEDIO' | 'MANUAL';
    salario_basico: number;
    auxilio_transporte: number;
    promedio_variables: number;
    base_prestacional: number;
    meses_base: number;
    fuente_base: 'NOMINAS' | 'MIXTA' | 'MANUAL';
    cobertura_nominas_pct: number;
    componentes: {
      ordinario: number;
      variables: number;
      auxilio_devengado: number;
      no_salarial_excluido: number;
      bonificaciones_excluidas: number;
    };
  };
  resultado: {
    valor_base_calculo: number;
    dias: number;
    tasa_aplicada: number | null;
    dias_base_intereses: number | null;
    formula_aplicada: string;
    valor_calculado: number;
    valor_final: number;
    ajuste_manual: Record<string, unknown> | null;
  };
  fuentes: Array<Record<string, unknown>>;
  advertencias: AdvertenciaLiquidacion[];
  /** SIN_DIAS_COMPUTADOS | SIN_DEVENGADO — nunca forzables. */
  bloqueantes: string[];
}

export interface PreviewLiquidacionPeriodo {
  periodo: LiquidacionPeriodoItem;
  filas: PreviewFilaLiquidacion[];
  totales: { colaboradores: number; base: number; dias: number; valor: number };
  bloqueantes: Array<{ fila_id: number; empleado_id: number; nombre_completo: string; codes: string[] }>;
  cobertura_incompleta: Array<{ fila_id: number; empleado_id: number; nombre_completo: string; cobertura_pct: number }>;
  advertencias_globales: AdvertenciaLiquidacion[];
  /**
   * Huella de los insumos del cálculo. Enviarla SIEMPRE en confirmar: si
   * algo cambió entre el preview y el clic, el backend responde 409
   * LIQUIDACION_DESACTUALIZADA y hay que recargar el paso 3.
   */
  calculo_hash: string;
}

export interface AjusteLiquidacion {
  empleado_id: number;
  /** Obligatorio (422 AJUSTE_SIN_MOTIVO). */
  motivo: string;
  fecha_computo_desde?: string;
  dias_computados?: number;
  base_prestacional?: number;
  devengado_previo?: {
    desde: string;
    hasta: string;
    ordinario: number;
    variables: number;
    auxilio: number;
    dias: number;
  };
}

export interface ConfirmarLiquidacionPayload {
  calculo_hash: string;
  ajustes?: AjusteLiquidacion[];
  /** Solo levanta LIQUIDACION_COBERTURA_INCOMPLETA; exige motivo_forzado. */
  forzar?: boolean;
  motivo_forzado?: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/v1/tenant/liquidaciones/periodos';

export const liquidacionesApi = {
  /** §2.1 — Cards del listado. `tipo` default CESANTIAS. */
  resumen: (params?: { tipo?: TipoLiquidacion; anio?: number }) =>
    apiClient.get<{ data: ResumenLiquidaciones; meta?: { filtros: Record<string, unknown> } }>(
      `${BASE}/resumen${toQuery(params)}`,
      T,
    ),

  /** §2.2 — Fechas límite legal y operativa para precargar el formulario. */
  fechaLimite: (tipo: TipoLiquidacion, anio: number) =>
    apiClient.get<{ data: FechaLimiteLiquidacion }>(
      `${BASE}/fecha-limite${toQuery({ tipo, anio })}`,
      T,
    ),

  /** §2.3 — Listado paginado. Orden: año desc, id desc. */
  listar: (params?: {
    tipo?: TipoLiquidacion;
    anio?: number;
    estado?: EstadoLiquidacionPeriodo;
    q?: string;
    per_page?: number;
    page?: number;
  }) =>
    apiClient.get<{
      data: LiquidacionPeriodoItem[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>(`${BASE}${toQuery(params)}`, T),

  /**
   * §2.4 — Crear período (BORRADOR). 409 LIQUIDACION_PERIODO_DUPLICADO con
   * `periodos_existentes[]` si ya hay uno del mismo tipo y año y no viene
   * `permitir_multiple: true`.
   */
  crear: (payload: CrearPeriodoPayload) =>
    apiClient.post<{
      message: string;
      data: LiquidacionPeriodoDetalle;
      advertencias?: AdvertenciaLiquidacion[];
    }>(BASE, payload, T),

  /** §2.5 — Detalle del período con filas y advertencias globales. */
  ver: (id: number) =>
    apiClient.get<{ data: LiquidacionPeriodoDetalle }>(`${BASE}/${id}`, T),

  /** §2.6 — Solo BORRADOR. */
  editar: (
    id: number,
    payload: Partial<Pick<CrearPeriodoPayload, 'descripcion' | 'fecha_inicio' | 'fecha_fin' | 'notas' | 'fecha_limite_legal'>>,
  ) =>
    apiClient.put<{ message: string; data: LiquidacionPeriodoDetalle }>(`${BASE}/${id}`, payload, T),

  /** §2.6 — Borra el borrador con sus filas. */
  eliminar: (id: number) =>
    apiClient.delete<{ message: string }>(`${BASE}/${id}`, T),

  /** §3.1 — Elegibles + excluidos con motivo. */
  colaboradoresDisponibles: (
    id: number,
    flags?: { incluir_inactivos?: boolean; incluir_eliminados?: boolean },
  ) =>
    apiClient.get<{
      data: { empleados: EmpleadoDisponibleLiquidacion[] };
      meta: { excluidos: EmpleadoExcluidoLiquidacion[] };
    }>(
      `${BASE}/${id}/colaboradores-disponibles${toQuery({
        incluir_inactivos: flags?.incluir_inactivos ? 1 : undefined,
        incluir_eliminados: flags?.incluir_eliminados ? 1 : undefined,
      })}`,
      T,
    ),

  /**
   * §3.2 — Agregar filas (éxito parcial: leer SIEMPRE `omitidos[]`).
   * Idempotente: los YA_EN_PERIODO se saltan en silencio.
   */
  agregarColaboradores: (id: number, body: { empleado_ids?: number[]; todos?: boolean }) =>
    apiClient.post<{
      message: string;
      data: { creados: LiquidacionFila[] };
      omitidos: OmitidoLiquidacion[];
    }>(`${BASE}/${id}/colaboradores`, body, T),

  /** §3.3 — Quitar una fila del borrador. */
  quitarColaborador: (id: number, filaId: number) =>
    apiClient.delete<{ message: string }>(`${BASE}/${id}/colaboradores/${filaId}`, T),

  /** §4.1 — Calcula todas las filas sin persistir. Devuelve `calculo_hash`. */
  preview: (id: number) =>
    apiClient.get<{ data: PreviewLiquidacionPeriodo }>(`${BASE}/${id}/preview`, T),

  /** §4.2 — Confirma y cierra el período. */
  confirmar: (id: number, payload: ConfirmarLiquidacionPayload) =>
    apiClient.post<{
      message: string;
      data: LiquidacionPeriodoDetalle;
      advertencias?: AdvertenciaLiquidacion[];
    }>(`${BASE}/${id}/confirmar`, payload, T),

  /** §4.3 — Reabre una CERRADA sin pagos ni intereses que la referencien. */
  reabrir: (id: number, motivo: string) =>
    apiClient.post<{ message: string; data: LiquidacionPeriodoDetalle }>(
      `${BASE}/${id}/reabrir`,
      { motivo },
      T,
    ),
};

// ─── Códigos de error del módulo (§0.1) ──────────────────────────────────────

export const LiquidacionesErrorCodes = {
  LIQUIDACION_PERIODO_DUPLICADO: 'LIQUIDACION_PERIODO_DUPLICADO',
  LIQUIDACION_PERIODO_CERRADO: 'LIQUIDACION_PERIODO_CERRADO',
  LIQUIDACION_PERIODO_NO_CERRADO: 'LIQUIDACION_PERIODO_NO_CERRADO',
  LIQUIDACION_DESACTUALIZADA: 'LIQUIDACION_DESACTUALIZADA',
  LIQUIDACION_ADVERTENCIAS_BLOQUEANTES: 'LIQUIDACION_ADVERTENCIAS_BLOQUEANTES',
  LIQUIDACION_COBERTURA_INCOMPLETA: 'LIQUIDACION_COBERTURA_INCOMPLETA',
  LIQUIDACION_CON_PAGOS: 'LIQUIDACION_CON_PAGOS',
  LIQUIDACION_PERIODO_REFERENCIADO: 'LIQUIDACION_PERIODO_REFERENCIADO',
  COLABORADOR_EN_LIQUIDACION_SOLAPADA: 'COLABORADOR_EN_LIQUIDACION_SOLAPADA',
  LIQUIDACION_FILA_NO_ENCONTRADA: 'LIQUIDACION_FILA_NO_ENCONTRADA',
  LIQUIDACION_PERIODO_NO_ENCONTRADO: 'LIQUIDACION_PERIODO_NO_ENCONTRADO',
  LIQUIDACION_SIN_COLABORADORES: 'LIQUIDACION_SIN_COLABORADORES',
  LIQUIDACION_TIPO_NO_SOPORTADO: 'LIQUIDACION_TIPO_NO_SOPORTADO',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  AJUSTE_SIN_MOTIVO: 'AJUSTE_SIN_MOTIVO',
  LIQUIDACION_RANGO_INVALIDO: 'LIQUIDACION_RANGO_INVALIDO',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CALC_ERROR: 'CALC_ERROR',
} as const;

export type LiquidacionesErrorCode =
  typeof LiquidacionesErrorCodes[keyof typeof LiquidacionesErrorCodes];

/** Etiquetas legibles para los motivos de exclusión del paso 2. */
export const MOTIVO_EXCLUSION_LABEL: Record<string, string> = {
  RETIRADO_EN_EL_ANIO: 'Retirado en el año (va por liquidación final)',
  SIN_CONTRATO_EN_RANGO: 'Sin contrato en el rango',
  INACTIVO: 'Inactivo',
  ELIMINADO: 'Eliminado',
  YA_EN_PERIODO: 'Ya está en este período',
  EN_LIQUIDACION_SOLAPADA: 'En otra liquidación con días cruzados',
};
