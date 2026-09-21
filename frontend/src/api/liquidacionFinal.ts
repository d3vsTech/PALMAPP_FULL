/**
 * API — Liquidación final de contrato (módulo Liquidaciones, fase 5)
 * Base: /api/v1/tenant/liquidaciones/finales
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.3, PR-L9, 2026-09-20) §11.
 *
 * El flujo es por CONTRATO, no por colaborador: un reingreso genera otro
 * contrato y otra liquidación. No usa `liquidacion_periodos` ni el wizard.
 *
 * Cuatro reglas que el frontend NO debe reimplementar ni suponer:
 *
 *  1. Aquí no se calcula nada. Los inputs de Salario / Auxilio / Días del
 *     formulario viajan como `ajustes[CODIGO]` con motivo obligatorio, y el
 *     backend devuelve `conceptos` y `totales` ya armados. Multiplicar en el
 *     navegador produce el "$-0" del mock y rompe la auditoría del ajuste.
 *
 *  2. Aprobar aplica el retiro. Termina el contrato vigente y escribe la
 *     fecha y el motivo en la ficha del colaborador, con el mismo código que
 *     `PUT colaboradores/{id}`. Anular lo revierte solo si nadie tocó la
 *     ficha después. Confirmar con el usuario antes de llamar a `aprobar`.
 *
 *  3. Salud y pensión solo gravan lo salarial. Las prestaciones, las
 *     vacaciones compensadas y la indemnización no cotizan (Ley 100 art. 17).
 *
 *  4. El salario del último período lo paga la nómina. `SALARIO_PENDIENTE`
 *     existe solo como devengado manual con motivo; cobrarlo por defecto lo
 *     pagaría dos veces.
 *
 * Permisos: liquidaciones.ver / .crear / .editar / .eliminar / .liquidar / .pagar.
 */
import { apiClient } from './client';
import type { AdvertenciaLiquidacion } from './liquidaciones';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/finales';

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

/**
 * FINAL liquida el retiro. SIMULACION es la "Liquidación Normal" del mock:
 * estado de cuenta a una fecha de corte, sin motivo, sin indemnización, y
 * no persiste ni paga nada.
 */
export type TipoLiquidacionFinal = 'FINAL' | 'SIMULACION';

export type EstadoLiquidacionFinal = 'BORRADOR' | 'APROBADA' | 'PAGADA' | 'ANULADA';

export type MotivoRetiroCodigo =
  | 'RENUNCIA'
  | 'RENUNCIA_MOTIVADA'
  | 'DESPIDO_SIN_JUSTA_CAUSA'
  | 'DESPIDO_CON_JUSTA_CAUSA'
  | 'MUTUO_ACUERDO'
  | 'VENCIMIENTO_PLAZO'
  | 'TERMINACION_OBRA'
  | 'PERIODO_PRUEBA'
  | 'FALLECIMIENTO'
  | 'PENSION'
  | 'OTRO';

export type TipoContrato = 'INDEFINIDO' | 'TERMINO_FIJO' | 'OBRA_LABOR';

/** MANUAL = el tipo lo sobrescribió el formulario con `motivo_override`. */
export type TipoContratoOrigen = 'CONTRATO' | 'MANUAL';

export type CodigoDevengado =
  | 'SALARIO_PENDIENTE'
  | 'CESANTIAS'
  | 'INTERESES_CESANTIAS'
  | 'PRIMA'
  | 'VACACIONES'
  | 'INDEMNIZACION'
  | 'OTRO_DEVENGADO';

export type CodigoDeduccion = 'SALUD' | 'PENSION' | 'PRESTAMO' | 'OTRA_DEDUCCION';

export type CodigoConcepto = CodigoDevengado | CodigoDeduccion;

/** Los dos códigos que el formulario puede capturar a mano. */
export type CodigoDevengadoManual = 'SALARIO_PENDIENTE' | 'OTRO_DEVENGADO';

/** Sin PILA: la liquidación se le paga a la persona. */
export type MetodoPagoLiquidacion = 'TRANSFERENCIA' | 'EFECTIVO' | 'CHEQUE';

export type MetodoBaseLiquidacion = 'ULTIMO_SALARIO' | 'PROMEDIO' | 'MANUAL';

/** Los cinco conceptos que admiten ajuste manual desde el formulario. */
export type CodigoAjustable =
  | 'CESANTIAS'
  | 'INTERESES_CESANTIAS'
  | 'PRIMA'
  | 'VACACIONES'
  | 'INDEMNIZACION';

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface EmpleadoLiquidacionRef {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: 'FIJO' | 'PRODUCCION' | string;
  salario_contractual?: number | null;
  subsidio_transporte?: boolean;
  telefono?: string | null;
  fecha_ingreso?: string | null;
}

export interface MotivoRetiroItem {
  codigo: MotivoRetiroCodigo;
  etiqueta: string;
  /** Solo DESPIDO_SIN_JUSTA_CAUSA y RENUNCIA_MOTIVADA liquidan el art. 64. */
  indemniza: boolean;
  norma: string | null;
}

export interface TiempoServicio {
  dias: number;
  anios: number;
  meses: number;
  dias_resto: number;
  anios_decimal: number;
  texto: string;
}

/** Bloqueante del preview o de aprobar. `forzable` decide si admite `forzar`. */
export interface BloqueanteLiquidacion {
  code: string;
  mensaje: string;
  forzable?: boolean;
  concepto?: CodigoConcepto | string;
  nominas?: number[];
  periodos?: unknown[];
  vacaciones?: unknown[];
  cobertura_pct?: number;
  cobertura_exigible_pct?: number;
  [extra: string]: unknown;
}

export interface CoberturaIncompletaItem {
  concepto?: string;
  cobertura_pct?: number;
  cobertura_exigible_pct?: number;
  [extra: string]: unknown;
}

// ─── Buscador y ficha del colaborador (§11.4) ─────────────────────────────────

export interface LiquidacionActivaRef {
  id: number;
  numero_comprobante: string;
  estado: EstadoLiquidacionFinal;
  fecha_retiro: string | null;
}

export interface ContratoVigenteRef {
  id: number;
  fecha_inicio: string;
  tipo_contrato: TipoContrato;
  fecha_fin_pactada: string | null;
}

export interface ColaboradorLiquidable {
  id: number;
  nombre_completo: string;
  documento: string;
  cargo: string | null;
  modalidad_pago: string;
  salario_base: number | null;
  fecha_ingreso: string | null;
  fecha_retiro: string | null;
  estado: boolean;
  contrato_vigente: ContratoVigenteRef | null;
  /** Con valor, ya tiene una liquidación no anulada: no se puede liquidar otra. */
  liquidacion_activa: LiquidacionActivaRef | null;
  elegible: boolean;
}

export interface ContratoFicha {
  id: number | null;
  tipo_contrato: TipoContrato;
  fecha_inicio: string | null;
  fecha_terminacion: string | null;
  fecha_fin_pactada: string | null;
  estado_contrato: string | null;
  salario: number | null;
}

export interface PrestamoLiquidable {
  prestamo_id: number;
  concepto: string;
  valor_total: number;
  saldo_pendiente: number;
  cuotas_pendientes: number;
  cuotas_pagadas?: number;
  num_cuotas?: number;
  /** Lo propone el backend según `liq_final_descontar_prestamos`. */
  descontar?: boolean;
  valor?: number;
  autorizacion_escrita?: boolean;
}

export interface NominaRef {
  nomina_id: number;
  nomina_empleado_id?: number | null;
  etiqueta?: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  fila_estado?: string | null;
  total_neto?: number | null;
}

export interface BloqueNominaLiquidacion {
  ultima_nomina: NominaRef | null;
  nominas_borrador: number[];
  nominas_posteriores_al_retiro: number[];
  borradores_a_reliquidar?: unknown[];
  nominas?: NominaRef[];
}

export interface BloqueVacacionesLiquidacion {
  saldo_dias: number;
  saldo_causado?: number;
  dias_disponibles_exigibles: number;
  dias_causados_periodo_actual: number;
  dias_generados?: number;
  dias_disfrutados?: number;
  dias_compensados?: number;
  periodos: unknown[];
  valor_dia?: number | null;
  base_mensual?: number | null;
  metodo_base?: MetodoBaseLiquidacion | null;
  /** Id de la vacación compensada creada al aprobar. */
  vacacion_id?: number | null;
  vacaciones_pendientes_pago?: unknown[];
  vacaciones_posteriores?: unknown[];
}

export interface ParametrosFichaLiquidacion {
  liq_final_deducir_seguridad_social: boolean;
  liq_final_descontar_prestamos: boolean;
  dias_mes_comercial: number;
}

export interface FichaColaboradorLiquidacion {
  empleado: EmpleadoLiquidacionRef & {
    fecha_retiro: string | null;
    motivo_retiro: string | null;
  };
  contrato: ContratoFicha | null;
  /** Hoy, o la fecha de retiro de la ficha si el colaborador ya está retirado. */
  fecha_corte: string;
  vacaciones: BloqueVacacionesLiquidacion;
  prestamos: PrestamoLiquidable[];
  nomina: BloqueNominaLiquidacion;
  periodos: unknown[];
  liquidaciones: LiquidacionFinalItem[];
  liquidacion_activa: LiquidacionActivaRef | null;
  motivos: MotivoRetiroItem[];
  parametros: ParametrosFichaLiquidacion;
  advertencias: AdvertenciaLiquidacion[];
}

// ─── Comprobante (§11.8) ──────────────────────────────────────────────────────

export interface ConceptoLiquidacion {
  codigo: CodigoConcepto;
  tipo?: 'DEVENGO' | 'DEDUCCION';
  orden?: number;
  nombre: string;
  /** Texto ya armado por el backend: "120 días", "12 % anual · 120 días". */
  detalle_texto?: string | null;
  dias?: number | null;
  base?: number | null;
  porcentaje?: number | null;
  valor: number;
  formula_aplicada?: string | null;
  norma?: string | null;
  es_manual?: boolean;
  /** Id del préstamo o consecutivo de un concepto repetible. */
  ref_id?: number | null;
  concepto_id?: number | null;
  ajuste_manual?: Record<string, unknown> | null;
  detalle?: Record<string, unknown> | null;
  advertencias?: AdvertenciaLiquidacion[];
}

export interface ConceptosLiquidacion {
  devengados: ConceptoLiquidacion[];
  deducciones: ConceptoLiquidacion[];
}

export interface TotalesLiquidacion {
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
}

export interface BloqueRetiro {
  fecha_retiro: string | null;
  fecha_retiro_humana?: string | null;
  motivo_retiro: MotivoRetiroCodigo | null;
  motivo_etiqueta: string | null;
  indemniza: boolean;
  tiempo_servicio: TiempoServicio;
  fecha_retiro_ficha: string | null;
  retiro_aplicado_por_liquidacion: boolean;
}

export interface BloqueContrato {
  id: number | null;
  tipo_contrato: TipoContrato;
  tipo_contrato_etiqueta?: string;
  tipo_contrato_origen: TipoContratoOrigen;
  fecha_inicio: string | null;
  fecha_fin_pactada: string | null;
  estado_contrato: string | null;
  fecha_terminacion?: string | null;
  tramos?: unknown[];
}

export interface BloqueSeguridadSocial {
  aplica: boolean;
  ibc: number;
  salud: number;
  pension: number;
  tasas?: { salud_trabajador: number; pension_trabajador: number; fuente: string };
  nota: string;
}

export interface BloqueRetencion {
  aplica: boolean;
  uvt: number;
  umbral_indemnizacion_uvt: number;
  umbral_indemnizacion_valor?: number;
  umbral_prestaciones_uvt?: number;
  umbral_prestaciones_valor?: number;
  salario_mensual_referencia?: number;
  nota: string;
}

export interface MetodoLiquidacion {
  texto: string;
  normas: string[];
  parametros: Record<string, unknown> | null;
}

export interface BloquePagoLiquidacion {
  estado: EstadoLiquidacionFinal;
  fecha_pago: string | null;
  metodo_pago: MetodoPagoLiquidacion | null;
  referencia_pago: string | null;
  observacion: string | null;
  total_pagado: number | null;
  pagado_por: string | null;
  pagado_at: string | null;
  /** Informativo: el art. 65 exige mala fe, no se calcula sanción. */
  dias_desde_retiro: number | null;
}

export interface BloqueCompartir {
  /** Enlace firmado de 72 h; abre sin sesión. */
  pdf_url: string;
  expires_at: string;
  whatsapp_url: string;
  telefono?: string | null;
}

export interface BloqueAnulacion {
  motivo: string;
  anulado_por: string | null;
  anulado_at: string | null;
}

export interface AuditoriaLiquidacion {
  creado_por: string | null;
  created_at: string | null;
  updated_at?: string | null;
  aprobado_por: string | null;
  aprobado_at: string | null;
}

/**
 * Cuerpo del comprobante. Lo devuelven preview, POST, GET, PUT, aprobar,
 * pago y anular; `GET …/{id}` nunca recalcula, lee lo persistido.
 * En el preview, `id`, `numero_comprobante` y `estado` llegan en null.
 */
export interface ComprobanteLiquidacionFinal {
  tipo: TipoLiquidacionFinal;
  titulo: string;
  /** "SIMULACIÓN — no constituye pago" en la simulación. */
  marca: string | null;
  finca: string | null;
  nit: string | null;
  fecha_generacion: string | null;
  id: number | null;
  numero_comprobante: string | null;
  estado: EstadoLiquidacionFinal | null;
  empleado: EmpleadoLiquidacionRef;
  contrato: BloqueContrato;
  retiro: BloqueRetiro;
  conceptos: ConceptosLiquidacion;
  totales: TotalesLiquidacion;
  nomina: BloqueNominaLiquidacion;
  vacaciones: BloqueVacacionesLiquidacion;
  prestamos: PrestamoLiquidable[];
  seguridad_social: BloqueSeguridadSocial;
  retencion: BloqueRetencion;
  metodo_liquidacion: MetodoLiquidacion;
  advertencias: AdvertenciaLiquidacion[];
  /** Solo se publican en BORRADOR y en el preview. */
  bloqueantes: BloqueanteLiquidacion[];
  cobertura_incompleta: CoberturaIncompletaItem[];
  calculo_hash: string | null;
  observaciones: string | null;
  pago: BloquePagoLiquidacion;
  /** Solo en APROBADA y PAGADA. */
  compartir: BloqueCompartir | null;
  anulacion: BloqueAnulacion | null;
  auditoria: AuditoriaLiquidacion;
}

// ─── Listado y resumen (§11.2, §11.5) ─────────────────────────────────────────

export interface ResumenLiquidacionFinal {
  anio: number | null;
  borradores: number;
  aprobadas: number;
  pagadas: number;
  anuladas: number;
  monto_por_pagar: number;
  monto_pagado: number;
  monto_total: number;
}

export interface LiquidacionFinalItem {
  id: number;
  numero_comprobante: string;
  estado: EstadoLiquidacionFinal;
  empleado: EmpleadoLiquidacionRef;
  contrato_id: number | null;
  motivo_retiro: MotivoRetiroCodigo | null;
  motivo_etiqueta: string | null;
  indemniza: boolean;
  fecha_ingreso: string | null;
  fecha_retiro: string | null;
  dias_servicio: number | null;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  fecha_pago: string | null;
  aprobado_at: string | null;
  anulado_at: string | null;
  advertencias_count: number;
  created_at: string | null;
}

export interface MetaPaginacion {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface FiltrosListadoLiquidaciones {
  q?: string;
  estado?: EstadoLiquidacionFinal;
  anio?: number;
  motivo_retiro?: MotivoRetiroCodigo;
  page?: number;
  per_page?: number;
}

// ─── Payloads (§11.6) ─────────────────────────────────────────────────────────

/**
 * Un bloque de ajuste por concepto. Si trae algún valor, `motivo` es
 * obligatorio (422 AJUSTE_SIN_MOTIVO). Los campos que se dejan en null los
 * resuelve el backend con su propio cálculo.
 */
export interface AjusteConcepto {
  salario_basico?: number | null;
  auxilio_transporte?: number | null;
  promedio_variables?: number | null;
  dias_computados?: number | null;
  fecha_computo_desde?: string | null;
  saldo_cesantias?: number | null;
  dias_base_intereses?: number | null;
  base_mensual?: number | null;
  base?: number | null;
  dias?: number | null;
  motivo?: string;
}

export type AjustesLiquidacion = Partial<Record<CodigoAjustable, AjusteConcepto>>;

export interface DevengadoManual {
  codigo: CodigoDevengadoManual;
  /** Solo SALARIO_PENDIENTE: se convierte en salario_base ÷ 30 × dias. */
  dias?: number | null;
  valor?: number | null;
  /** Obligatorio en OTRO_DEVENGADO. */
  nombre?: string;
  motivo?: string;
}

export interface PrestamoADescontar {
  prestamo_id: number;
  descontar: boolean;
}

export interface OtraDeduccion {
  nombre: string;
  valor: number;
  motivo?: string;
  autorizacion_escrita?: boolean;
}

export interface DeduccionesLiquidacion {
  seguridad_social?: boolean;
  prestamos?: PrestamoADescontar[];
  /** CST arts. 149-150: sin ella el backend rechaza el descuento. */
  autorizacion_escrita?: boolean;
  otras?: OtraDeduccion[];
}

/** Mismo cuerpo para preview, POST, PUT y el PDF de la simulación. */
export interface PayloadLiquidacionFinal {
  tipo?: TipoLiquidacionFinal;
  empleado_id: number;
  /** Obligatoria salvo en SIMULACION. */
  fecha_retiro?: string | null;
  /** Obligatoria en SIMULACION. */
  fecha_corte?: string | null;
  motivo_retiro?: MotivoRetiroCodigo | null;
  tipo_contrato?: TipoContrato | null;
  fecha_fin_pactada?: string | null;
  /** Obligatorio si se sobrescribe el tipo de contrato o la fecha pactada. */
  motivo_override?: string | null;
  dias_indemnizacion?: number | null;
  ajustes?: AjustesLiquidacion;
  devengados_manuales?: DevengadoManual[];
  deducciones?: DeduccionesLiquidacion;
  observaciones?: string | null;
  forzar?: boolean;
  motivo_forzado?: string | null;
  calculo_hash?: string | null;
}

export interface PayloadAprobar {
  calculo_hash: string;
  forzar?: boolean;
  motivo_forzado?: string | null;
}

export interface PayloadPagoLiquidacion {
  fecha_pago: string;
  metodo_pago: MetodoPagoLiquidacion;
  referencia_pago?: string | null;
  observacion?: string | null;
}

// ─── Respuestas ───────────────────────────────────────────────────────────────

export interface PrestamoSaldadoRef {
  prestamo_id: number;
  valor_liquidado: number;
  valor_aplicado: number;
  cuotas: number;
  estado: string;
}

export interface RespuestaComprobante {
  message?: string;
  data: ComprobanteLiquidacionFinal;
  advertencias?: AdvertenciaLiquidacion[];
  /** Solo en la respuesta del pago: qué préstamos quedaron saldados. */
  prestamos?: PrestamoSaldadoRef[];
}

export interface RespuestaListadoLiquidaciones {
  data: LiquidacionFinalItem[];
  meta: MetaPaginacion;
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export const liquidacionFinalApi = {
  /** Cards del listado. `anio` filtra por el año de la fecha de retiro. */
  resumen: (anio?: number) =>
    apiClient
      .get<{ data: ResumenLiquidacionFinal }>(`${BASE}/resumen${toQuery({ anio })}`, T)
      .then((r) => r.data),

  listar: (filtros?: FiltrosListadoLiquidaciones) =>
    apiClient.get<RespuestaListadoLiquidaciones>(
      `${BASE}${toQuery(filtros as Record<string, unknown>)}`,
      T,
    ),

  /** Catálogo de los 11 motivos con su etiqueta y si indemnizan. */
  motivos: () =>
    apiClient.get<{ data: MotivoRetiroItem[] }>(`${BASE}/motivos`, T).then((r) => r.data),

  /** Buscador del formulario: nombre, cédula o cargo. Máximo 30 resultados. */
  colaboradores: (q?: string) =>
    apiClient
      .get<{ data: ColaboradorLiquidable[] }>(`${BASE}/colaboradores${toQuery({ q })}`, T)
      .then((r) => r.data),

  /** Ficha previa: contrato, vacaciones, préstamos, nóminas y períodos. */
  ficha: (empleadoId: number) =>
    apiClient
      .get<{ data: FichaColaboradorLiquidacion }>(`${BASE}/colaboradores/${empleadoId}`, T)
      .then((r) => r.data),

  /** Cálculo completo sin persistir. Devuelve `calculo_hash`. */
  preview: (payload: PayloadLiquidacionFinal) =>
    apiClient.post<RespuestaComprobante>(`${BASE}/preview`, payload, T),

  /**
   * PDF "Estado de prestaciones sociales" con marca de agua. Va por POST
   * porque la simulación no persiste: el cálculo viaja en el cuerpo.
   */
  simulacionPdf: (payload: PayloadLiquidacionFinal) =>
    apiClient.postBlob(`${BASE}/simulacion/pdf`, payload, T),

  crear: (payload: PayloadLiquidacionFinal) =>
    apiClient.post<RespuestaComprobante>(BASE, payload, T),

  /** Detalle = comprobante. Nunca recalcula. */
  ver: (id: number) =>
    apiClient.get<{ data: ComprobanteLiquidacionFinal }>(`${BASE}/${id}`, T).then((r) => r.data),

  /** "Volver a editar": solo en BORRADOR. Recalcula y guarda el hash nuevo. */
  actualizar: (id: number, payload: PayloadLiquidacionFinal) =>
    apiClient.put<RespuestaComprobante>(`${BASE}/${id}`, payload, T),

  eliminar: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`, T),

  /**
   * "Aceptar". Congela el cálculo, termina el contrato y registra el retiro
   * en la ficha del colaborador. Exige el hash del último cálculo guardado.
   */
  aprobar: (id: number, payload: PayloadAprobar) =>
    apiClient.post<RespuestaComprobante>(`${BASE}/${id}/aprobar`, payload, T),

  /** Desde BORRADOR o APROBADA sin pago. Revierte el retiro con guardas. */
  anular: (id: number, motivo: string) =>
    apiClient.post<RespuestaComprobante>(`${BASE}/${id}/anular`, { motivo }, T),

  /** Pago único por el neto. Salda los préstamos descontados. */
  registrarPago: (id: number, payload: PayloadPagoLiquidacion) =>
    apiClient.post<RespuestaComprobante>(`${BASE}/${id}/pago`, payload, T),

  anularPago: (id: number) => apiClient.delete<RespuestaComprobante>(`${BASE}/${id}/pago`, T),

  /** `inline` abre el PDF en el navegador ("Imprimir"); sin él, descarga. */
  comprobantePdf: (id: number, inline = false) =>
    apiClient.getBlob(`${BASE}/${id}/comprobante/pdf${inline ? '?inline=1' : ''}`, T),
};

// ─── Códigos de error (§0.1) ──────────────────────────────────────────────────

/**
 * Códigos propios de la liquidación final más los que reutiliza del módulo.
 * Discriminar siempre por `code`, nunca por el texto del mensaje.
 */
export const LiquidacionFinalErrorCodes = {
  // Propios
  LIQUIDACION_NO_ENCONTRADA: 'LIQUIDACION_NO_ENCONTRADA',
  EMPLEADO_NO_ELEGIBLE: 'EMPLEADO_NO_ELEGIBLE',
  MOTIVO_RETIRO_INVALIDO: 'MOTIVO_RETIRO_INVALIDO',
  TIPO_CONTRATO_REQUERIDO: 'TIPO_CONTRATO_REQUERIDO',
  FECHA_FIN_PACTADA_REQUERIDA: 'FECHA_FIN_PACTADA_REQUERIDA',
  DIAS_INDEMNIZACION_REQUERIDOS: 'DIAS_INDEMNIZACION_REQUERIDOS',
  DEDUCCION_SIN_AUTORIZACION: 'DEDUCCION_SIN_AUTORIZACION',
  PRESTAMO_NO_VIGENTE: 'PRESTAMO_NO_VIGENTE',
  LIQUIDACION_FECHA_RETIRO_INVALIDA: 'LIQUIDACION_FECHA_RETIRO_INVALIDA',
  LIQUIDACION_ESTADO_INVALIDO: 'LIQUIDACION_ESTADO_INVALIDO',
  LIQUIDACION_CONTRATO_YA_LIQUIDADO: 'LIQUIDACION_CONTRATO_YA_LIQUIDADO',
  LIQUIDACION_RETIRO_FUTURO: 'LIQUIDACION_RETIRO_FUTURO',
  LIQUIDACION_FECHA_RETIRO_DISTINTA: 'LIQUIDACION_FECHA_RETIRO_DISTINTA',
  LIQUIDACION_CON_PAGO: 'LIQUIDACION_CON_PAGO',
  ENLACE_INVALIDO_O_VENCIDO: 'ENLACE_INVALIDO_O_VENCIDO',
  LIQUIDACION_NO_DISPONIBLE: 'LIQUIDACION_NO_DISPONIBLE',
  // Reutilizados del módulo, con la misma semántica
  LIQUIDACION_DESACTUALIZADA: 'LIQUIDACION_DESACTUALIZADA',
  LIQUIDACION_ADVERTENCIAS_BLOQUEANTES: 'LIQUIDACION_ADVERTENCIAS_BLOQUEANTES',
  LIQUIDACION_COBERTURA_INCOMPLETA: 'LIQUIDACION_COBERTURA_INCOMPLETA',
  LIQUIDACION_PAGO_YA_REGISTRADO: 'LIQUIDACION_PAGO_YA_REGISTRADO',
  LIQUIDACION_PAGO_NO_REGISTRADO: 'LIQUIDACION_PAGO_NO_REGISTRADO',
  AJUSTE_SIN_MOTIVO: 'AJUSTE_SIN_MOTIVO',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  EMPLEADO_NO_ENCONTRADO: 'EMPLEADO_NO_ENCONTRADO',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CALC_ERROR: 'CALC_ERROR',
  // Bloqueantes forzables que aprobar devuelve como 409
  ULTIMA_NOMINA_SIN_CERRAR: 'ULTIMA_NOMINA_SIN_CERRAR',
  NOMINA_POSTERIOR_AL_RETIRO: 'NOMINA_POSTERIOR_AL_RETIRO',
} as const;

/** Bloqueantes que aprobar admite superar con `forzar` + `motivo_forzado`. */
export const BLOQUEANTES_FORZABLES: readonly string[] = [
  LiquidacionFinalErrorCodes.LIQUIDACION_COBERTURA_INCOMPLETA,
  LiquidacionFinalErrorCodes.ULTIMA_NOMINA_SIN_CERRAR,
  LiquidacionFinalErrorCodes.NOMINA_POSTERIOR_AL_RETIRO,
];

export function esBloqueanteForzable(b: BloqueanteLiquidacion): boolean {
  return b.forzable === true || BLOQUEANTES_FORZABLES.includes(b.code);
}

// ─── Rótulos ──────────────────────────────────────────────────────────────────

export const ESTADO_LIQUIDACION_LABEL: Record<EstadoLiquidacionFinal, string> = {
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  INDEFINIDO: 'Término indefinido',
  TERMINO_FIJO: 'Término fijo',
  OBRA_LABOR: 'Obra o labor',
};

export const METODO_PAGO_LABEL: Record<MetodoPagoLiquidacion, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
};

/** Nombre por defecto de cada concepto, por si el backend no lo envía. */
export const CONCEPTO_LABEL: Record<CodigoConcepto, string> = {
  SALARIO_PENDIENTE: 'Salario pendiente',
  CESANTIAS: 'Cesantías',
  INTERESES_CESANTIAS: 'Intereses de cesantías',
  PRIMA: 'Prima de servicios',
  VACACIONES: 'Vacaciones compensadas',
  INDEMNIZACION: 'Indemnización',
  OTRO_DEVENGADO: 'Otro devengado',
  SALUD: 'Salud',
  PENSION: 'Pensión',
  PRESTAMO: 'Préstamo',
  OTRA_DEDUCCION: 'Otra deducción',
};
