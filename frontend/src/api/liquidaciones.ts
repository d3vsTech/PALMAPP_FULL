/**
 * API — Liquidaciones (Cesantías · Intereses de cesantías · Prima)
 * Base: /api/v1/tenant/liquidaciones
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.1, PR-L7, 2026-09-14).
 * Las tres pestañas usan exactamente los mismos 18 endpoints cambiando el
 * `tipo`: períodos, wizard de 3 pasos, confirmar, reabrir, consignación al
 * fondo o pago al trabajador con anulación, y desprendibles JSON/PDF.
 * Diferencias por tipo en §2.7 (intereses) y §2.8 (prima). La prima es
 * semestral: `semestre` 1 o 2 es obligatorio al crearla y al pedir su
 * fecha límite.
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
/**
 * PR-L11. `SISTEMA` = liquidado por el wizard. `HISTORICO` = cargado desde
 * Excel (§12): nace CERRADA, ya consignado, sin base salarial ni hash, y solo
 * admite ver, desprendibles, eliminar y quitar filas. Todo lo demás responde
 * 409 PERIODO_HISTORICO, así que esos botones no se deben mostrar.
 */
export type OrigenPeriodo = 'SISTEMA' | 'HISTORICO';
/** Derivado del período: NA en borrador; según filas consignadas después. */
export type EstadoPagoPeriodo = 'NA' | 'PENDIENTE' | 'PARCIAL' | 'COMPLETO';
export type EstadoPagoFila = 'PENDIENTE' | 'CONSIGNADO' | 'PAGADO';
export type MetodoPago = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE' | 'PILA';

/** Advertencia genérica del módulo: `{ code, mensaje, ...extra }`. */
export interface AdvertenciaLiquidacion {
  code: string;
  mensaje?: string;
  [k: string]: unknown;
}

/** Descriptor corto de período (§0.2): duplicados, padre de intereses, etc. */
export interface DescriptorPeriodo {
  id: number;
  tipo: TipoLiquidacion;
  anio: number;
  /** 0 en cesantías e intereses; 1 o 2 en prima. */
  semestre: number;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoLiquidacionPeriodo;
  /** Desde v1.4. */
  origen?: OrigenPeriodo;
  total_colaboradores: number;
}

/** Ítem del listado (§2.3). */
export interface LiquidacionPeriodoItem {
  id: number;
  tipo: TipoLiquidacion;
  anio: number;
  /** 0 en cesantías e intereses; 1 (ene-jun) o 2 (jul-dic) en prima. */
  semestre: number;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  /** La que fija la ley (puede caer en fin de semana). */
  fecha_limite_legal: string;
  /** Último día hábil anterior o igual a la legal. La que se pinta. */
  fecha_limite_operativa: string;
  estado: EstadoLiquidacionPeriodo;
  /** PR-L11. Un HISTORICO llega CERRADA, COMPLETO y sin vencer. */
  origen: OrigenPeriodo;
  estado_pago: EstadoPagoPeriodo;
  total_colaboradores: number;
  /** Promedio de dias_computados de las filas; null en BORRADOR. */
  dias_promedio: number | null;
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
  /** Solo con valor en filas de intereses (§2.7). */
  saldo_cesantias: number | null;
  tasa_aplicada: number | null;
  dias_base_intereses: number | null;
  periodo_empleado_base_id: number | null;
  estado: 'PENDIENTE' | 'LIQUIDADO';
  estado_pago: EstadoPagoFila;
  fecha_pago: string | null;
  valor_pagado: number | null;
  metodo_pago: MetodoPago | null;
  referencia_pago: string | null;
  fondo_consignacion: string | null;
  /** Informativo (corte 3 años); nunca hay sanción en pesos. */
  dias_mora: number | null;
  observacion_pago: string | null;
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
  /** Solo intereses: período de cesantías padre. */
  periodo_base: DescriptorPeriodo | null;
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
  /** null en cesantías e intereses; 1 o 2 en prima. */
  semestre: number | null;
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
  /** Obligatorio (1 o 2) si tipo = PRIMA; se ignora en los demás tipos. */
  semestre?: 1 | 2;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  fecha_limite_legal?: string;
  /** Solo intereses: período de cesantías CERRADA del año (§2.7). */
  periodo_base_id?: number;
  /** true para crear un segundo período del mismo tipo y año (tras el 409). */
  permitir_multiple?: boolean;
}

/**
 * Colaborador elegible del paso 2 (§3.1). Los campos de intereses (§2.7)
 * solo vienen cuando el período es INTERESES_CESANTIAS.
 */
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
  salario_base?: number;
  salario_base_es_contractual?: boolean;
  promedio_mensual_devengado?: number;
  base_prestacional_estimada?: number;
  cobertura_nominas_pct?: number;
  dias_vinculacion?: number;
  dias_computados?: number;
  /** Prima: tramo final sin nómina cerrada que se proyecta. 0 en el resto. */
  dias_proyectados?: number;
  // Solo intereses (§2.7):
  saldo_cesantias?: number;
  dias_base_intereses?: number;
  tasa?: number;
  intereses_estimados?: number;
  periodo_empleado_base_id?: number;
  cesantias_estado_pago?: EstadoPagoFila;
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
    | 'SIN_CESANTIAS_LIQUIDADAS'
    | string;
  fecha_retiro?: string;
  fila_id?: number;
  periodo_base_id?: number;
  liquidacion?: DescriptorPeriodo | null;
}

export interface OmitidoLiquidacion {
  id: number;
  nombre_completo: string;
  code: string;
  liquidacion?: DescriptorPeriodo | null;
}

// ─── Preview (§4.1) ───────────────────────────────────────────────────────────

/** Datos del giro de una fila. En el preview siempre PENDIENTE. */
export interface PagoFilaLiquidacion {
  estado_pago: EstadoPagoFila;
  fecha_pago: string | null;
  metodo_pago: MetodoPago | null;
  referencia_pago: string | null;
  fondo_consignacion: string | null;
  valor_pagado: number | null;
  dias_mora: number | null;
  pagado_por: string | null;
  observacion: string | null;
}

/** Solo intereses (§2.7): de dónde sale el saldo. */
export interface OrigenIntereses {
  periodo_empleado_base_id: number;
  periodo_base_id: number;
  saldo_cesantias: number;
  cesantias_valor_final?: number;
  cesantias_liquidado_at?: string | null;
  cesantias_estado_pago?: EstadoPagoFila;
  dias_vinculacion: number;
  dias_computados: number;
  dias_base_intereses: number;
  modo_dias?: 'DIAS_VINCULACION' | 'DIAS_COMPUTADOS';
}

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
    /** null solo en intereses sin ajuste (§2.7). */
    metodo_base: 'ULTIMO_SALARIO' | 'PROMEDIO' | 'MANUAL' | null;
    salario_basico: number;
    auxilio_transporte: number;
    promedio_variables: number;
    base_prestacional: number;
    meses_base: number;
    fuente_base: 'NOMINAS' | 'MIXTA' | 'MANUAL';
    cobertura_nominas_pct: number;
    /** Prima: días del tramo final proyectado. 0 en cesantías e intereses. */
    dias_proyectados?: number;
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
  /** Solo intereses. */
  origen?: OrigenIntereses;
  fuentes: Array<Record<string, unknown>>;
  metodo_liquidacion?: {
    texto: string;
    normas: string[];
    parametros: Record<string, unknown>;
  };
  advertencias: AdvertenciaLiquidacion[];
  /** Nunca forzables (§4.1). */
  bloqueantes: string[];
  pago: PagoFilaLiquidacion;
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
   * LIQUIDACION_DESACTUALIZADA (con `hash_actual`) y hay que recargar el
   * paso 3.
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

// ─── Consignación / pago (§5) ────────────────────────────────────────────────

export interface RegistrarPagosPayload {
  /** Uno de los dos. `empleado_ids` son ids de EMPLEADO, no de fila. */
  todos?: boolean;
  empleado_ids?: number[];
  /** Obligatoria, ≤ hoy (422 si es futura). */
  fecha_pago: string;
  metodo_pago?: MetodoPago;
  referencia_pago?: string;
  /** Solo cesantías; default = fondo elegido por cada colaborador. */
  fondo_consignacion?: string;
  observacion?: string;
}

export interface OmitidaPago {
  id: number;
  fila_id?: number;
  nombre_completo: string | null;
  code: string;
}

export interface RegistrarPagosResponse {
  message: string;
  data: {
    pagadas: LiquidacionFila[];
    omitidas: OmitidaPago[];
    periodo: LiquidacionPeriodoItem;
  };
  advertencias?: AdvertenciaLiquidacion[];
}

// ─── Desprendible (§6) ───────────────────────────────────────────────────────

/** Comprobante legal por fila. Nunca recalcula: lee lo persistido. */
export interface DesprendibleLiquidacion {
  tipo: TipoLiquidacion;
  titulo: string;
  finca: string;
  nit: string | null;
  numero_comprobante: string;
  periodo: DescriptorPeriodo & { fecha_limite_legal: string; fecha_limite_operativa: string };
  empleado: EmpleadoLiquidacionRef & { salario_contractual?: number };
  dias: PreviewFilaLiquidacion['dias'];
  base: PreviewFilaLiquidacion['base'];
  resultado: PreviewFilaLiquidacion['resultado'];
  origen?: OrigenIntereses;
  /**
   * PR-L11. Fila cargada desde Excel: la base viene en 0 porque la de la
   * época no se registró, así que la vista NO debe pintarla.
   */
  historico?: boolean;
  metodo_liquidacion: { texto: string; normas: string[]; parametros: Record<string, unknown> | null };
  fuentes: Array<Record<string, unknown>>;
  advertencias: AdvertenciaLiquidacion[];
  pago: PagoFilaLiquidacion;
  liquidacion: {
    fecha: string;
    fecha_humana: string;
    liquidado_por: string;
    estado_fila: 'PENDIENTE' | 'LIQUIDADO';
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/v1/tenant/liquidaciones/periodos';
const FILAS = '/v1/tenant/liquidaciones/periodo-empleados';

export const liquidacionesApi = {
  /** §2.1 — Cards del listado. `tipo` default CESANTIAS. */
  resumen: (params?: { tipo?: TipoLiquidacion; anio?: number; semestre?: 1 | 2 }) =>
    apiClient.get<{ data: ResumenLiquidaciones; meta?: { filtros: Record<string, unknown> } }>(
      `${BASE}/resumen${toQuery(params)}`,
      T,
    ),

  /**
   * §2.2 — Fechas límite legal y operativa para precargar el formulario.
   * `semestre` es obligatorio para PRIMA: sin él responde 422
   * LIQUIDACION_SEMESTRE_REQUERIDO.
   */
  fechaLimite: (tipo: TipoLiquidacion, anio: number, semestre?: 1 | 2) =>
    apiClient.get<{ data: FechaLimiteLiquidacion }>(
      `${BASE}/fecha-limite${toQuery({ tipo, anio, semestre })}`,
      T,
    ),

  /** §2.3 — Listado paginado. Orden: año desc, id desc. */
  listar: (params?: {
    tipo?: TipoLiquidacion;
    anio?: number;
    /** Filtra las primas por semestre. */
    semestre?: 1 | 2;
    estado?: EstadoLiquidacionPeriodo;
    /** Separa los del wizard de los cargados desde Excel (§12). */
    origen?: OrigenPeriodo;
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
   * `permitir_multiple: true`. Intereses: 422 PERIODO_CESANTIAS_REQUERIDO
   * sin cesantías CERRADA del año (con `periodos_cesantias[]` si hay
   * varias tandas: reenviar con `periodo_base_id`).
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

  /**
   * §2.6 — Borra el borrador con sus filas. En un período HISTORICO se
   * admite aunque esté CERRADA y arrastra su período de intereses histórico:
   * `eliminados[]` los trae a los dos, el hijo primero.
   */
  eliminar: (id: number) =>
    apiClient.delete<{
      message: string;
      data?: { eliminados: DescriptorPeriodo[] };
    }>(`${BASE}/${id}`, T),

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

  /**
   * §3.3 — Quitar una fila del borrador. En un HISTORICO borra también la
   * fila de intereses histórica del mismo cargue, y por eso devuelve la lista.
   */
  quitarColaborador: (id: number, filaId: number) =>
    apiClient.delete<{
      message: string;
      data?: { filas_eliminadas: Array<{ id: number; tipo: TipoLiquidacion; periodo_id: number }> };
    }>(`${BASE}/${id}/colaboradores/${filaId}`, T),

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

  /**
   * §5.1 — Registrar consignación (cesantías) o pago (intereses) sobre un
   * período CERRADA. Éxito parcial: leer `omitidas[]` y `advertencias[]`.
   * `valor_pagado = valor_final` siempre: no hay pagos parciales por fila.
   */
  registrarPagos: (id: number, payload: RegistrarPagosPayload) =>
    apiClient.post<RegistrarPagosResponse>(`${BASE}/${id}/pagos`, payload, T),

  /** §5.2 — Anula el giro de una fila: vuelve a PENDIENTE. */
  anularPago: (filaId: number) =>
    apiClient.delete<{
      message: string;
      data: { fila: LiquidacionFila; periodo: LiquidacionPeriodoItem };
    }>(`${FILAS}/${filaId}/pago`, T),

  /** §6.1 — Comprobante JSON de una fila LIQUIDADO. Nunca recalcula. */
  desprendible: (filaId: number) =>
    apiClient.get<{ data: DesprendibleLiquidacion }>(`${FILAS}/${filaId}/desprendible`, T),

  /** §6.2 — PDF del comprobante de una fila. */
  desprendiblePdf: (filaId: number) =>
    apiClient.getBlob(`${FILAS}/${filaId}/desprendible/pdf`, T),

  /** §6.3 — PDF del período CERRADA: una página por colaborador. */
  desprendiblesPeriodoPdf: (id: number) =>
    apiClient.getBlob(`${BASE}/${id}/desprendibles/pdf`, T),
};

// ─── Códigos de error del módulo (§0.1) ──────────────────────────────────────

export const LiquidacionesErrorCodes = {
  LIQUIDACION_PERIODO_DUPLICADO: 'LIQUIDACION_PERIODO_DUPLICADO',
  LIQUIDACION_SEMESTRE_REQUERIDO: 'LIQUIDACION_SEMESTRE_REQUERIDO',
  LIQUIDACION_RANGO_FUERA_DE_SEMESTRE: 'LIQUIDACION_RANGO_FUERA_DE_SEMESTRE',
  LIQUIDACION_PERIODO_CERRADO: 'LIQUIDACION_PERIODO_CERRADO',
  LIQUIDACION_PERIODO_NO_CERRADO: 'LIQUIDACION_PERIODO_NO_CERRADO',
  LIQUIDACION_PAGO_YA_REGISTRADO: 'LIQUIDACION_PAGO_YA_REGISTRADO',
  SIN_FONDO_CESANTIAS: 'SIN_FONDO_CESANTIAS',
  LIQUIDACION_PAGO_NO_REGISTRADO: 'LIQUIDACION_PAGO_NO_REGISTRADO',
  LIQUIDACION_FILA_NO_LIQUIDADA: 'LIQUIDACION_FILA_NO_LIQUIDADA',
  LIQUIDACION_DESACTUALIZADA: 'LIQUIDACION_DESACTUALIZADA',
  LIQUIDACION_ADVERTENCIAS_BLOQUEANTES: 'LIQUIDACION_ADVERTENCIAS_BLOQUEANTES',
  LIQUIDACION_COBERTURA_INCOMPLETA: 'LIQUIDACION_COBERTURA_INCOMPLETA',
  LIQUIDACION_CON_PAGOS: 'LIQUIDACION_CON_PAGOS',
  LIQUIDACION_PERIODO_REFERENCIADO: 'LIQUIDACION_PERIODO_REFERENCIADO',
  /** PR-L11: se intentó editar, liquidar, reabrir o pagar un período histórico. */
  PERIODO_HISTORICO: 'PERIODO_HISTORICO',
  PERIODO_CESANTIAS_REQUERIDO: 'PERIODO_CESANTIAS_REQUERIDO',
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

/** Etiquetas legibles para los motivos de exclusión y omisión (Anexo A.4). */
export const MOTIVO_EXCLUSION_LABEL: Record<string, string> = {
  RETIRADO_EN_EL_ANIO: 'Retirado en el año (va por liquidación final)',
  SIN_CONTRATO_EN_RANGO: 'Sin contrato en el rango',
  INACTIVO: 'Inactivo',
  ELIMINADO: 'Eliminado',
  YA_EN_PERIODO: 'Ya está en este período',
  EN_LIQUIDACION_SOLAPADA: 'En otra liquidación con días cruzados',
  COLABORADOR_EN_LIQUIDACION_SOLAPADA: 'En otra liquidación con días cruzados',
  SIN_CESANTIAS_LIQUIDADAS: 'Sin cesantías liquidadas en el período base',
  EMPLEADO_NO_ENCONTRADO: 'No es un colaborador del tenant',
};

/** Etiquetas de los bloqueantes del preview (Anexo A.1). */
export const BLOQUEANTE_LABEL: Record<string, string> = {
  SIN_DIAS_COMPUTADOS: 'Sin días computados: no se puede liquidar',
  SIN_DEVENGADO: 'Sin devengado en nóminas cerradas: no se puede liquidar',
  SIN_CESANTIAS_LIQUIDADAS: 'Sin cesantías liquidadas en el período base: no se puede liquidar',
  SIN_SALDO_CESANTIAS: 'El saldo de cesantías quedó en cero: no se puede liquidar',
};
