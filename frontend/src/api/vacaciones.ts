/**
 * API — Vacaciones (módulo Liquidaciones, fase 4)
 * Base: /api/v1/tenant/liquidaciones/vacaciones
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.2, PR-L8, 2026-09-16) §10.
 *
 * Vacaciones NO usa `liquidacion_periodos`: no hay período, ni wizard de 3
 * pasos, ni reabrir. Cada liquidación es una fila por colaborador con sus
 * días de disfrute (hábiles y calendario), sus días compensados en dinero
 * (CST 189), la base del art. 192 y el `calculo_hash` del preview que la
 * firmó. El pago sale de aquí con su propio comprobante VAC-{id}; la nómina
 * del período solo neutraliza esos días (§10.12).
 *
 * Dos reglas legales que el frontend NO debe reimplementar:
 *  - Se pagan los días CALENDARIO del disfrute, no los hábiles (CST 192).
 *    15 hábiles desde un lunes suelen ser 17 o 18 de calendario.
 *  - La compensación en dinero se topa en la MITAD de cada período causado
 *    (CST 189), no en los días de disfrute de la misma solicitud.
 * Los dos valores los calcula el backend: `resultado.*` y `dias_dinero_max`.
 *
 * Permisos: liquidaciones.ver / .liquidar / .editar / .pagar.
 */
import { apiClient } from './client';
import type { AdvertenciaLiquidacion } from './liquidaciones';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/vacaciones';

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Enumeraciones (§0.2) ─────────────────────────────────────────────────────

/** Ciclo propio, sin período. PENDIENTE está reservado y hoy no se produce. */
export type EstadoVacacion = 'APROBADA' | 'PAGADA' | 'CANCELADA' | 'PENDIENTE';
/** HISTORICO = disfrutada antes del sistema; consume saldo, sin valores. */
export type OrigenVacacion = 'SISTEMA' | 'HISTORICO';
export type EstadoVencimiento = 'VENCIDA' | 'URGENTE' | 'PROXIMA' | 'CON_TIEMPO' | 'AL_DIA';
/** Sin PILA: las vacaciones se pagan a la persona, no a un fondo. */
export type MetodoPagoVacacion = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE';
export type MetodoBaseVacacion = 'ULTIMO_SALARIO' | 'PROMEDIO' | 'MANUAL';
export type MotivoNoElegible = 'RETIRADO' | 'INACTIVO' | 'SIN_CONTRATO' | 'ELIMINADO';
export type MotivoDiaNoHabil = 'DOMINGO' | 'FESTIVO' | 'SABADO';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EmpleadoVacacionRef {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
  salario_base?: number;
  fecha_ingreso?: string | null;
  fecha_retiro?: string | null;
  estado?: boolean;
}

/** Un año de servicio causado (§10.1). */
export interface PeriodoCausacion {
  periodo: number;
  inicio: string;
  fin: string;
  completo: boolean;
  cubierto: boolean;
  dias_vinculacion: number;
  dias_descontados: number;
  dias_computados: number;
  dias_generados: number;
  dias_disfrutados: number;
  dias_compensados: number;
  saldo: number;
  fecha_vencimiento: string | null;
  fecha_prescripcion: string | null;
  descuentos: Array<Record<string, unknown>>;
}

/** Fila de "Turnos pendientes" (§10.1). */
export interface TurnoPendienteVacaciones {
  empleado: EmpleadoVacacionRef;
  fecha_computo_desde: string | null;
  fecha_computo_hasta: string | null;
  contrato_id: number | null;
  dias_vinculacion: number;
  dias_descontados: number;
  dias_computados: number;
  dias_generados: number;
  dias_disfrutados: number;
  dias_compensados: number;
  /** Incluye el período en curso. */
  dias_disponibles: number;
  /** Solo períodos completos: es lo que se puede liquidar hoy. */
  dias_disponibles_exigibles: number;
  dias_causados_periodo_actual: number;
  dias_dinero_max: number;
  anticipadas_habilitadas: boolean;
  /** Fin del período de causación más un año (CST 187). */
  fecha_vencimiento: string | null;
  fecha_prescripcion: string | null;
  /** Negativo cuando ya venció. */
  dias_para_vencimiento: number | null;
  estado_vencimiento: EstadoVencimiento;
  periodos: PeriodoCausacion[];
  advertencias: AdvertenciaLiquidacion[];
}

export interface MetaTurnosPendientes {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  fecha_corte: string;
  anticipadas_habilitadas: boolean;
  dias_vacaciones_anuales: number;
  totales: {
    colaboradores: number;
    dias_exigibles: number;
    /** Se calcula sobre todos los elegibles, antes de filtrar. */
    por_estado: Record<EstadoVencimiento, number>;
  };
}

/** Respuesta del datepicker (§10.2). */
export interface CalendarioVacaciones {
  fecha_inicio: string;
  /** El n-ésimo día hábil, no el último del rango. */
  fecha_fin: string;
  dias_habiles: number;
  /** Lo que se paga (CST 192), no los hábiles. */
  dias_calendario: number;
  sabado_habil: boolean;
  dias_no_habiles: Array<{ fecha: string; motivo: MotivoDiaNoHabil }>;
  festivos_hash?: string;
  advertencias: AdvertenciaLiquidacion[];
}

/** Base del art. 192 (§10.3). */
export interface BaseVacaciones {
  metodo_base: MetodoBaseVacacion | null;
  fuente_base: 'NOMINAS' | 'MIXTA' | 'MANUAL' | null;
  modalidad: string;
  fecha_base: string;
  ventana: { inicio: string; fin: string; dias: number };
  salario_basico: number;
  promedio_recargo_nocturno: number;
  base_mensual: number;
  dias_mes: number;
  valor_dia: number;
  meses_base: number;
  cobertura_nominas_pct: number;
  cobertura_exigible_pct: number;
  cobertura_incompleta: boolean;
  /** Solo bloquea cuando el método es PROMEDIO. */
  bloquea_cobertura: boolean;
  dias_proyectados: number;
  fecha_ultima_nomina_cerrada: string | null;
  nominas_borrador: number[];
  smlv_anio: number;
  ajuste_aplicado: Record<string, unknown> | null;
  dias?: Record<string, unknown>;
  componentes: {
    ordinario: number;
    vacaciones_previas: number;
    recargo_nocturno: number;
    /** Lo que el art. 192 deja fuera de la base. */
    excluido_192: {
      horas_extra: number;
      recargo_dominical: number;
      recargos_descanso: number;
      auxilio: number;
    };
    no_salarial_excluido: number;
    bonificaciones_excluidas: number;
  };
}

/** Detalle del colaborador (§10.3). */
export interface DetalleColaboradorVacaciones {
  empleado: EmpleadoVacacionRef;
  elegible: boolean;
  motivo_no_elegible: MotivoNoElegible | null;
  fecha_corte: string;
  causacion: TurnoPendienteVacaciones & {
    consumo?: Array<Record<string, unknown>>;
    tramos?: Array<Record<string, unknown>>;
  };
  base: BaseVacaciones;
  valor_dia: number;
  dias_dinero_max: number;
  bloqueantes_base: string[];
  parametros: {
    sabado_habil: boolean;
    anticipadas_habilitadas: boolean;
    dias_vacaciones_anuales: number;
    dias_mes_comercial: number;
  };
  fuentes: Array<Record<string, unknown>>;
  vacaciones: VacacionItem[];
  advertencias: AdvertenciaLiquidacion[];
}

export interface SaldoVacaciones {
  dias_disponibles_exigibles_antes: number;
  dias_disponibles_antes: number;
  dias_causados_periodo_actual: number;
  dias_disponibles_exigibles_despues: number;
  dias_disponibles_despues: number;
  dias_dinero_max: number;
  usa_periodo_en_curso: boolean;
  anticipadas_habilitadas: boolean;
  fecha_vencimiento_antes: string | null;
  estado_vencimiento_antes: EstadoVencimiento;
  fecha_vencimiento_despues: string | null;
  dias_para_vencimiento_despues: number | null;
  estado_vencimiento_despues: EstadoVencimiento;
}

export interface PeriodoAfectado {
  periodo: number;
  inicio: string;
  fin: string;
  dias_generados: number;
  dias_disfrute: number;
  dias_dinero: number;
  saldo_restante: number;
}

export interface ResultadoVacaciones {
  dias_disfrute: number;
  /** Los que se pagan: CST 192. */
  dias_calendario: number;
  valor_disfrute: number;
  dias_dinero: number;
  valor_dinero: number;
  valor_total: number;
  valor_dia: number;
  formula_aplicada: string;
  ajuste_manual: Record<string, unknown> | null;
  acuerdo_escrito?: boolean;
}

/** Informativo: el módulo paga el bruto, PILA va aparte. */
export interface SeguridadSocialVacaciones {
  ibc: number;
  salud_trabajador: number;
  pension_trabajador: number;
  aplicadas: boolean;
  nota: string;
}

export interface BloqueanteVacaciones {
  code: string;
  mensaje?: string;
  /** Solo la cobertura incompleta se puede forzar con motivo. */
  forzable?: boolean;
  [k: string]: unknown;
}

export interface PagoVacacion {
  estado: EstadoVacacion | null;
  fecha_pago: string | null;
  metodo_pago: MetodoPagoVacacion | null;
  referencia_pago: string | null;
  total_pagado: number | null;
  pagado_por: string | number | null;
  pagado_at?: string | null;
  observacion: string | null;
}

/** Preview (§10.4) y comprobante (§10.11) comparten contrato. */
export interface ComprobanteVacaciones {
  tipo: 'VACACIONES';
  titulo?: string;
  finca?: string;
  nit?: string | null;
  id?: number;
  numero_comprobante?: string;
  estado: EstadoVacacion | null;
  origen: OrigenVacacion;
  empleado: EmpleadoVacacionRef & { salario_contractual?: number };
  fechas: {
    fecha_liquidacion: string;
    fecha_liquidacion_humana?: string;
    fecha_base: string;
    fecha_corte?: string;
    liquidado_por?: string;
    liquidado_at?: string;
  };
  calendario: CalendarioVacaciones | null;
  solicitud: { dias_disfrute: number; dias_dinero: number };
  saldo: SaldoVacaciones | null;
  periodos_afectados: PeriodoAfectado[];
  base: BaseVacaciones | null;
  resultado: ResultadoVacaciones;
  seguridad_social: SeguridadSocialVacaciones | null;
  metodo_liquidacion?: {
    texto: string;
    normas: string[];
    parametros: Record<string, unknown> | null;
  };
  parametros?: Record<string, unknown>;
  fuentes: Array<Record<string, unknown>>;
  nomina?: {
    nomina_id?: number | null;
    nota?: string;
    nominas_en_rango?: Array<Record<string, unknown>>;
    nominas_cerradas?: Array<Record<string, unknown>>;
    borradores_a_reliquidar?: Array<Record<string, unknown>>;
  };
  observacion?: string | null;
  anulacion: Record<string, unknown> | null;
  advertencias: AdvertenciaLiquidacion[];
  bloqueantes?: BloqueanteVacaciones[];
  pago: PagoVacacion;
  /** Huella de los insumos. Enviarla siempre al confirmar. */
  calculo_hash?: string;
}

/** Fila del histórico (§10.8). */
export interface VacacionItem {
  id: number;
  numero_comprobante: string;
  origen: OrigenVacacion;
  estado: EstadoVacacion;
  empleado: EmpleadoVacacionRef;
  fecha_liquidacion: string;
  fecha_base: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_habiles: number;
  dias_calendario: number;
  dias_dinero: number;
  acuerdo_escrito: boolean;
  base_mensual: number;
  valor_dia: number;
  valor_disfrute: number;
  valor_dinero: number;
  valor_total: number;
  metodo_base: MetodoBaseVacacion | null;
  fuente_base: string | null;
  cobertura_nominas_pct: number | null;
  formula_aplicada: string | null;
  periodos_afectados: PeriodoAfectado[];
  calendario: CalendarioVacaciones | null;
  ajuste_manual: Record<string, unknown> | null;
  contrato_id: number | null;
  /** Lo fija el cierre de la nómina que contiene fecha_fin. Informativo. */
  nomina_id: number | null;
  observacion: string | null;
  liquidado_por: number | string | null;
  liquidado_at: string | null;
  pago: PagoVacacion;
  anulacion: Record<string, unknown> | null;
  advertencias_count: number;
  advertencias: AdvertenciaLiquidacion[];
  calculo_hash: string | null;
  created_at?: string;
}

export interface MetaHistoricoVacaciones {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  totales: {
    registros: number;
    total_pagado: number;
    valor_total: number;
    dias_disfrute: number;
    dias_dinero: number;
    pendientes_pago: number;
    pagadas: number;
    canceladas: number;
  };
}

export interface CrearVacacionPayload {
  empleado_id: number;
  /** Obligatoria si dias_disfrute > 0. */
  fecha_inicio?: string;
  dias_disfrute: number;
  /** Múltiplos de 0,5. Exige acuerdo_escrito. */
  dias_dinero?: number;
  acuerdo_escrito?: boolean;
  fecha_liquidacion?: string;
  observacion?: string;
  calculo_hash: string;
  ajuste?: { base_mensual: number; motivo: string };
  forzar?: boolean;
  motivo_forzado?: string;
}

export interface CrearHistoricoPayload {
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  dias_dinero?: number;
  fecha_pago?: string;
  observacion?: string;
}

export interface RegistrarPagoVacacionPayload {
  fecha_pago: string;
  metodo_pago: MetodoPagoVacacion;
  referencia_pago?: string;
  observacion?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const vacacionesApi = {
  /** §10.1 — Turnos pendientes, ya ordenados por vencimiento. */
  pendientes: (params?: { q?: string; estado?: EstadoVencimiento; page?: number; per_page?: number }) =>
    apiClient.get<{ data: TurnoPendienteVacaciones[]; meta: MetaTurnosPendientes }>(
      `${BASE}/pendientes${toQuery(params)}`,
      T,
    ),

  /**
   * §10.2 — Dónde termina un disfrute de N días hábiles. No toca al
   * colaborador ni su saldo: es el datepicker.
   */
  calendario: (fechaInicio: string, diasHabiles: number) =>
    apiClient.get<{ data: CalendarioVacaciones }>(
      `${BASE}/calendario${toQuery({ fecha_inicio: fechaInicio, dias_habiles: diasHabiles })}`,
      T,
    ),

  /** §10.3 — Causación, saldo, base y histórico de un colaborador. */
  detalleColaborador: (empleadoId: number) =>
    apiClient.get<{ data: DetalleColaboradorVacaciones }>(`${BASE}/colaboradores/${empleadoId}`, T),

  /** §10.4 — Calcula sin persistir; devuelve el comprobante y el hash. */
  preview: (
    empleadoId: number,
    params: { fecha_inicio?: string; dias_disfrute: number; dias_dinero?: number; fecha_liquidacion?: string },
  ) =>
    apiClient.get<{ data: ComprobanteVacaciones }>(
      `${BASE}/colaboradores/${empleadoId}/preview${toQuery(params)}`,
      T,
    ),

  /** §10.5 — Confirma la liquidación. */
  crear: (payload: CrearVacacionPayload) =>
    apiClient.post<{ message: string; data: VacacionItem; advertencias?: AdvertenciaLiquidacion[] }>(
      BASE,
      payload,
      T,
    ),

  /**
   * §10.6 — Vacaciones disfrutadas antes de usar el sistema. Sin ellas, los
   * saldos de los colaboradores antiguos salen inflados.
   */
  crearHistorico: (payload: CrearHistoricoPayload) =>
    apiClient.post<{ message: string; data: VacacionItem }>(`${BASE}/historico`, payload, T),

  /** §10.7 — Histórico paginado con totales del filtro completo. */
  listar: (params?: {
    q?: string;
    desde?: string;
    hasta?: string;
    estado?: EstadoVacacion;
    origen?: OrigenVacacion;
    empleado_id?: number;
    page?: number;
    per_page?: number;
  }) =>
    apiClient.get<{ data: VacacionItem[]; meta: MetaHistoricoVacaciones }>(`${BASE}${toQuery(params)}`, T),

  /** §10.8 — Una vacación. */
  ver: (id: number) => apiClient.get<{ data: VacacionItem }>(`${BASE}/${id}`, T),

  /** §10.9 — Pago directo al trabajador. Sin fondo y sin mora. */
  registrarPago: (id: number, payload: RegistrarPagoVacacionPayload) =>
    apiClient.post<{ message: string; data: VacacionItem; advertencias?: AdvertenciaLiquidacion[] }>(
      `${BASE}/${id}/pago`,
      payload,
      T,
    ),

  /** §10.9 — Devuelve la vacación a APROBADA. */
  anularPago: (id: number) =>
    apiClient.delete<{ message: string; data: VacacionItem }>(`${BASE}/${id}/pago`, T),

  /** §10.10 — CANCELADA con motivo; el saldo vuelve a estar disponible. */
  anular: (id: number, motivo: string) =>
    apiClient.post<{ message: string; data: VacacionItem }>(`${BASE}/${id}/anular`, { motivo }, T),

  /** §10.11 — Comprobante legal. Nunca recalcula. */
  comprobante: (id: number) =>
    apiClient.get<{ data: ComprobanteVacaciones }>(`${BASE}/${id}/comprobante`, T),

  /** §10.11 — Mismo comprobante en PDF. */
  comprobantePdf: (id: number) => apiClient.getBlob(`${BASE}/${id}/comprobante/pdf`, T),
};

// ─── Códigos de error propios (§0.1) ─────────────────────────────────────────

export const VacacionesErrorCodes = {
  VACACION_NO_ENCONTRADA: 'VACACION_NO_ENCONTRADA',
  EMPLEADO_NO_ENCONTRADO: 'EMPLEADO_NO_ENCONTRADO',
  EMPLEADO_NO_ELEGIBLE: 'EMPLEADO_NO_ELEGIBLE',
  VACACIONES_SALDO_INSUFICIENTE: 'VACACIONES_SALDO_INSUFICIENTE',
  VACACIONES_COMPENSACION_EXCEDE_MITAD: 'VACACIONES_COMPENSACION_EXCEDE_MITAD',
  VACACIONES_COMPENSACION_SIN_ACUERDO: 'VACACIONES_COMPENSACION_SIN_ACUERDO',
  VACACIONES_INICIO_NO_HABIL: 'VACACIONES_INICIO_NO_HABIL',
  VACACIONES_DIAS_INVALIDOS: 'VACACIONES_DIAS_INVALIDOS',
  VACACIONES_FUERA_DE_CONTRATO: 'VACACIONES_FUERA_DE_CONTRATO',
  VACACIONES_CON_AUSENCIA_EN_RANGO: 'VACACIONES_CON_AUSENCIA_EN_RANGO',
  VACACIONES_HISTORICO_EN_NOMINA: 'VACACIONES_HISTORICO_EN_NOMINA',
  CALENDARIO_FESTIVOS_AUSENTE: 'CALENDARIO_FESTIVOS_AUSENTE',
  VACACIONES_SOLAPADAS: 'VACACIONES_SOLAPADAS',
  VACACION_EN_NOMINA_CERRADA: 'VACACION_EN_NOMINA_CERRADA',
  VACACION_PAGADA: 'VACACION_PAGADA',
  VACACION_ESTADO_INVALIDO: 'VACACION_ESTADO_INVALIDO',
  // Reutilizados de los períodos, con la misma semántica:
  LIQUIDACION_DESACTUALIZADA: 'LIQUIDACION_DESACTUALIZADA',
  LIQUIDACION_ADVERTENCIAS_BLOQUEANTES: 'LIQUIDACION_ADVERTENCIAS_BLOQUEANTES',
  LIQUIDACION_COBERTURA_INCOMPLETA: 'LIQUIDACION_COBERTURA_INCOMPLETA',
  LIQUIDACION_PAGO_YA_REGISTRADO: 'LIQUIDACION_PAGO_YA_REGISTRADO',
  LIQUIDACION_PAGO_NO_REGISTRADO: 'LIQUIDACION_PAGO_NO_REGISTRADO',
  AJUSTE_SIN_MOTIVO: 'AJUSTE_SIN_MOTIVO',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CALC_ERROR: 'CALC_ERROR',
} as const;

/** Rótulos del semáforo de vencimiento. */
export const VENCIMIENTO_LABEL: Record<EstadoVencimiento, string> = {
  VENCIDA: 'Vencida',
  URGENTE: 'Urgente',
  PROXIMA: 'Próxima',
  CON_TIEMPO: 'Con tiempo',
  AL_DIA: 'Al día',
};

/** Por qué un colaborador no puede liquidar vacaciones hoy. */
export const NO_ELEGIBLE_LABEL: Record<MotivoNoElegible, string> = {
  RETIRADO: 'Retirado: sus vacaciones van en la liquidación final',
  INACTIVO: 'Inactivo',
  SIN_CONTRATO: 'Sin contrato vigente',
  ELIMINADO: 'Eliminado',
};

export const DIA_NO_HABIL_LABEL: Record<MotivoDiaNoHabil, string> = {
  DOMINGO: 'Domingo',
  FESTIVO: 'Festivo',
  SABADO: 'Sábado',
};

/** Texto de "Vence en N días" / "Venció hace N días". */
export function textoVencimiento(dias: number | null): string {
  if (dias == null) return 'Sin días pendientes';
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}
