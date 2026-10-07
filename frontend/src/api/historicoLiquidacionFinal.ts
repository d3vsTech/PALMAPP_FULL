/**
 * API — Histórico de liquidaciones finales desde Excel o CSV (PR-L14)
 * Base: /api/v1/tenant/liquidaciones/historico/finales
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.7, PR-L14, 2026-09-29) §15.
 *
 * La pestaña Liquidación (§11) **calcula** con el salario de la ficha y las
 * nóminas cerradas: no sirve para una liquidación de 2021 que ya se pagó. Este
 * cargue la registra tal como quedó, un archivo por año de la fecha de retiro.
 *
 * Es un registro, no una operación. El cargue **no** termina contratos, no
 * escribe el retiro en la ficha, no salda préstamos, no crea la vacación
 * compensada y no recalcula nada. Tampoco certifica que la liquidación esté
 * bien calculada: certifica que se pagó esa cifra.
 *
 * Dos cosas propias de este archivo:
 *
 *  1. **Total de control.** El desglose por concepto es opcional y
 *     `neto_pagado` es obligatorio: debe ser lo pagado menos lo descontado.
 *     Una diferencia de hasta un peso advierte y se guarda lo calculado; más
 *     de un peso es error. Es lo que atrapa la fila corrida o la columna que
 *     se quedó por fuera.
 *
 *  2. **Puede quedar sin contrato.** Se enlaza el contrato terminado en la
 *     fecha de retiro; si ninguno coincide, la fila se carga igual con
 *     `contrato_id = null` y `fecha_ingreso` pasa a ser obligatoria. Ojo: una
 *     liquidación sin contrato **no** impide volver a liquidar ese contrato
 *     desde la pestaña.
 *
 * Los prefijos `liq_` y `ded_` de las columnas son deliberados: los lectores
 * de cesantías y prima aceptan `cesantias`, `prima`, `valor_pagado` y `valor`
 * como nombres de sus columnas obligatorias, así que sin prefijo un archivo
 * subido a la pantalla equivocada se cargaría como cesantías consignadas.
 *
 * Permisos: liquidaciones.ver (plantilla) y liquidaciones.editar (validar e
 * importar). Para corregir: eliminar la liquidación (`liquidaciones.eliminar`)
 * y volver a cargar, o recargar con `sobrescribir`.
 */
import { apiClient } from './client';
import type {
  ArchivoHistorico,
  CargueHistorico,
  EmpleadoHistoricoRef,
  EstadoFilaHistorico,
  IncidenciaFila,
  ResumenHistoricoBase,
} from './historicoComun';
import {
  ERROR_FILA_COMUN_LABEL,
  queryPlantilla,
  type FormatoPlantilla,
} from './historicoComun';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/historico/finales';

/** Primer año que acepta el backend (§0.3). */
export const PRIMER_ANIO_CARGABLE = 2000;

// Lo común se re-exporta para que la pantalla importe de un solo sitio.
export {
  ACCEPT_ARCHIVO,
  descripcionFormato,
  ESTADO_FILA_BADGE,
  ESTADO_FILA_LABEL,
  HistoricoArchivoErrorCodes,
  MAX_FILAS_ARCHIVO,
  MAX_MB_ARCHIVO,
  MOTIVO_ARCHIVO_LABEL,
} from './historicoComun';
export type {
  ArchivoHistorico,
  CargueHistorico,
  EmpleadoHistoricoRef,
  EstadoFilaHistorico,
  FormatoArchivoHistorico,
  FormatoPlantilla,
  IncidenciaFila,
  MotivoArchivoInvalido,
} from './historicoComun';

/** Años cargables: de 2000 al año en curso, del más reciente al más viejo. */
export function aniosCargables(): number[] {
  const hasta = new Date().getFullYear();
  const anios: number[] = [];
  for (let a = hasta; a >= PRIMER_ANIO_CARGABLE; a--) anios.push(a);
  return anios;
}

// ─── Tipos de la respuesta (§15.2) ────────────────────────────────────────────

/** Cómo se enlazó el contrato (§0.2). */
export type ContratoEnlace = 'EXACTO' | 'FICHA' | 'SIN_CONTRATO';

/** De dónde salió el dato. `DESCONOCIDO` solo en el salario. */
export type OrigenDato = 'CONTRATO' | 'ARCHIVO' | 'FICHA' | 'DESCONOCIDO';

export interface ConceptoHistoricoFinal {
  codigo: string;
  nombre: string;
  valor: number;
  /** Solo en VACACIONES, y solo si el archivo trajo los días compensados. */
  dias?: number | null;
}

export interface TotalesHistoricoFinal {
  total_devengado: number;
  total_deducciones: number;
  /** Lo calculado desde los conceptos: es lo que se guarda. */
  total_neto: number;
  /** El `neto_pagado` que traía el archivo. */
  neto_archivo: number;
  /** `total_neto − neto_archivo`. Hasta un peso solo advierte. */
  diferencia: number;
}

export interface LiquidacionFilaHistorico {
  fecha_retiro: string;
  fecha_ingreso: string | null;
  fecha_ingreso_origen: OrigenDato;
  dias_servicio: number | null;
  motivo_retiro: string;
  motivo_etiqueta: string;
  /** `true` cuando el archivo no trajo motivo y se registró OTRO. */
  motivo_por_defecto: boolean;
  /** Se toma de lo pagado, no del motivo. */
  indemniza: boolean;
  tipo_contrato: string;
  tipo_contrato_origen: 'CONTRATO' | 'MANUAL';
  /** `true` cuando nadie lo informó: no pintarlo como un dato cierto. */
  tipo_contrato_asumido: boolean;
  /** `null` cuando ni el archivo ni el contrato lo informan. */
  salario_base: number | null;
  salario_base_origen: OrigenDato;
  contrato_id: number | null;
  contrato_enlace: ContratoEnlace;
  conceptos: {
    devengados: ConceptoHistoricoFinal[];
    deducciones: ConceptoHistoricoFinal[];
  };
  /** `null` si alguna celda de valor es inválida: no se puede sumar. */
  totales: TotalesHistoricoFinal | null;
  /** La fila solo trajo el total: un único concepto sin desglose. */
  sin_desglose: boolean;
  fecha_pago: string | null;
  /** `true` cuando la celda venía vacía y se usó la fecha de retiro. */
  fecha_pago_por_defecto: boolean;
  metodo_pago: string | null;
  referencia_pago: string | null;
  /** Solo al importar. */
  id?: number;
  numero_comprobante?: string;
}

/** Liquidación histórica que se reemplazaría con `sobrescribir`. */
export interface LiquidacionExistente {
  id: number;
  numero_comprobante: string;
  origen: string;
  estado: string;
  fecha_retiro: string;
  contrato_id: number | null;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  conceptos: Record<string, number>;
}

export interface FilaHistoricoLiquidacionFinal {
  fila: number;
  estado: EstadoFilaHistorico;
  documento: string;
  /**
   * Nombres y apellidos tal como venían en el archivo (2026-10-06).
   * **Solo informativos:** el colaborador se cruza por `documento`. Si no se
   * parecen al nombre de la ficha, la fila trae la advertencia
   * `NOMBRE_DIFIERE_DE_LA_FICHA` y se carga igual.
   */
  nombres: string | null;
  apellidos: string | null;
  empleado: (EmpleadoHistoricoRef & { estado?: boolean }) | null;
  liquidacion: LiquidacionFilaHistorico | null;
  observacion: string | null;
  existentes: LiquidacionExistente[];
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
}

export interface ResumenHistoricoLiquidacionFinal extends ResumenHistoricoBase {
  /** Personas que el archivo cruzó: quien tiene dos retiros cuenta una vez. */
  colaboradores: number;
  /** Filas cargables que quedarían sin contrato enlazado. */
  sin_contrato: number;
  /** Filas cargables que solo traen el total. */
  sin_desglose: number;
  /** Los tres suman solo las filas cargables (OK y SOBRESCRIBIR). */
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
}

export interface AnalisisHistoricoLiquidacionFinal {
  anio: number;
  sobrescribir: boolean;
  archivo: ArchivoHistorico;
  resumen: ResumenHistoricoLiquidacionFinal;
  filas: FilaHistoricoLiquidacionFinal[];
  advertencias: IncidenciaFila[];
  /** Solo al importar. */
  cargue?: CargueHistorico & { total_neto: number };
}

// ─── Códigos por fila (§15.4) ─────────────────────────────────────────────────

/**
 * Errores de fila. Cualquiera bloquea el archivo completo.
 *
 * No existe `DOCUMENTO_DUPLICADO_EN_ARCHIVO`: varias filas por cédula son
 * válidas (quien se retiró y reingresó tiene una por cada retiro). Lo que no
 * se puede repetir es la misma cédula con la misma fecha de retiro.
 */
export const ERROR_FILA_LABEL: Record<string, string> = {
  ...ERROR_FILA_COMUN_LABEL,
  LIQUIDACION_VALOR_INVALIDO: 'Hay un valor que no sirve',
  MOTIVO_RETIRO_INVALIDO: 'El motivo de retiro no está en el catálogo',
  TIPO_CONTRATO_INVALIDO: 'El tipo de contrato no está en el catálogo',
  METODO_PAGO_INVALIDO: 'El método de pago no está en el catálogo',
  REFERENCIA_PAGO_INVALIDA: 'La referencia de pago es muy larga',
  NETO_NO_CUADRA: 'El neto no es lo pagado menos lo descontado',
  NETO_NEGATIVO: 'Lo descontado supera lo pagado',
  RETIRO_DUPLICADO_EN_ARCHIVO: 'Ese retiro se repite en el archivo',
};

/** Advertencias de fila (Anexo A.1.6). No bloquean; quedan en la liquidación. */
export const ADVERTENCIA_FILA_LABEL: Record<string, string> = {
  LIQUIDACION_SIN_CONTRATO: 'Se carga sin contrato enlazado',
  CONTRATO_CON_FECHA_CERCANA: 'Hay un contrato que termina en una fecha cercana',
  RETIRO_DENTRO_DE_CONTRATO_VIGENTE: 'El retiro cae dentro de un contrato vigente',
  CONTRATO_AMBIGUO_SE_USA_EL_MAS_RECIENTE: 'Varios contratos terminan ese día',
  SIN_CONTRATOS_USA_FECHAS_EMPLEADO: 'Sin contratos: se usan las fechas de la ficha',
  FECHA_INGRESO_DIFIERE_DEL_CONTRATO: 'La fecha de ingreso no es la del contrato',
  TIPO_CONTRATO_SOBRESCRITO: 'El tipo de contrato viene del archivo',
  TIPO_CONTRATO_ASUMIDO: 'Nadie informó el tipo de contrato',
  MOTIVO_RETIRO_POR_DEFECTO: 'Sin motivo en el archivo: se registra Otro',
  FECHA_PAGO_LIQUIDACION_POR_DEFECTO: 'Sin fecha de pago: se usa la del retiro',
  PAGO_ANTERIOR_AL_RETIRO: 'Se pagó antes del retiro',
  PAGO_POSTERIOR_AL_RETIRO: 'Se pagó después del retiro',
  LIQUIDACION_SIN_DESGLOSE: 'Solo trae el total, sin desglose por concepto',
  NETO_DIFIERE_POR_REDONDEO: 'El neto difiere por redondeo: se guarda el calculado',
  INDEMNIZACION_SIN_MOTIVO_QUE_INDEMNICE: 'Paga indemnización con un motivo que no la genera',
  MOTIVO_INDEMNIZA_SIN_VALOR: 'El motivo indemniza y no hay valor',
  VACACIONES_DIAS_SIN_VALOR: 'Trae días de vacaciones sin valor',
  PAGO_A_BENEFICIARIOS_ART_212: 'Fallecimiento: se paga a los beneficiarios',
  PRESTAMO_VIGENTE_NO_SALDADO: 'Tiene préstamos vigentes que el cargue no salda',
  CONCEPTO_PAGADO_EN_PERIODO: 'Ese concepto ya está en un período del año',
  SIN_DESGLOSE_CON_PERIODO: 'Sin desglose y con períodos del año cargados',
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** El multipart que reciben `validar` e `importar` (§0.3). */
function cuerpo(archivo: File, anio: number, sobrescribir: boolean): FormData {
  const form = new FormData();
  form.append('archivo', archivo);
  form.append('anio', String(anio));
  // En multipart un booleano viaja como "1" / "0".
  form.append('sobrescribir', sobrescribir ? '1' : '0');
  return form;
}

export const historicoLiquidacionFinalApi = {
  /**
   * §15.1 — Plantilla oficial de 23 columnas. El CSV trae las mismas cabeceras
   * sin la hoja de instrucciones.
   */
  plantilla: (formato: FormatoPlantilla = 'xlsx') =>
    apiClient.getBlob(`${BASE}/plantilla${queryPlantilla(formato)}`, T),

  /**
   * §15.2 — Simulación. No guarda nada, no audita y no deja el archivo en el
   * servidor. Muestra el desglose de cada fila y el neto calculado frente al
   * del archivo.
   */
  validar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<{ data: AnalisisHistoricoLiquidacionFinal }>(
      `${BASE}/validar`,
      cuerpo(archivo, anio, sobrescribir),
      T,
    ),

  /**
   * §15.3 — Cargue, todo o nada. Con `sobrescribir` la liquidación anterior se
   * borra y la nueva queda con **otro número `LIQ-`**: un comprobante ya
   * entregado conserva el número viejo.
   */
  importar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<{
      message: string;
      data: AnalisisHistoricoLiquidacionFinal;
      advertencias: IncidenciaFila[];
    }>(BASE, cuerpo(archivo, anio, sobrescribir), T),
};
