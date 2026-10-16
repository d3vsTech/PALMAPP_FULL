/**
 * API — Importación masiva de nóminas históricas
 * Contrato: docs/API_NOMINA.md §16 (PR-P1, 2026-10-16).
 * Formato del archivo: docs/ESTRUCTURA_EXCEL_NOMINAS.md
 *
 * El cliente trae los períodos que pagó antes de usar el sistema y los carga
 * por archivo. Es el tercero y último de los cargues del histórico, después de
 * operaciones y viajes.
 *
 * Cada período distinto del archivo se convierte en una nómina real CERRADA
 * con `origen = IMPORTACION`, y cada fila en la misma `nomina_empleado`
 * LIQUIDADO que deja una liquidación cerrada, con los valores del archivo como
 * snapshot. Por eso la base de cesantías, prima y vacaciones los lee sin
 * cambios y nadie puede crear una nómina nueva sobre esos días.
 *
 * Cinco reglas que ninguna pantalla debe saltarse:
 *
 *  1. Una fila es un colaborador en un período, identificado por sus fechas.
 *     Las filas con las mismas `fecha_inicio` y `fecha_fin` son una nómina.
 *
 *  2. El cargue no recalcula nada. Lo que el cliente pagó es la verdad: lo que
 *     no cuadra avisa y entra igual. Solo es error lo que impediría guardar
 *     algo coherente.
 *
 *  3. Siempre `validar` antes de `importar`. Es lo único que muestra la
 *     cobertura del período: quién tenía contrato vigente y no aparece en el
 *     archivo, separando a los que tienen una novedad que lo explica.
 *
 *  4. Todo o nada. Una fila con error y no entra ninguna nómina.
 *
 *  5. Resubir no duplica: la persona y el período identifican la fila. Para
 *     corregir hay que marcar `sobrescribir`, y entonces **toda** fila ya
 *     cargada se reescribe, no solo la que cambió.
 */
import { apiClient } from './client';
import type { ArchivoHistorico, IncidenciaFila } from './historicoComun';

const BASE = '/v1/tenant/nominas/importar';
const T = true; // requiresTenant

// ─── Constantes del cargue (§16) ─────────────────────────────────────────────

/** Tope del lector del backend. Un archivo más largo se rechaza completo. */
export const MAX_FILAS_NOMINAS = 5000;

/** Tope de tamaño del request. */
export const MAX_MB_NOMINAS = 10;

/** Lo que acepta el `input[type=file]`. */
export const ACCEPT_NOMINAS = '.xlsx,.xls,.csv';

/** Rango esperado del promedio kg/gajo de la cosecha histórica. */
export const PROMEDIO_MINIMO = 3;
export const PROMEDIO_MAXIMO = 60;

// ─── Enumeraciones ───────────────────────────────────────────────────────────

export type FormatoPlantillaNominas = 'xlsx' | 'csv';

/**
 * `OK` se carga, `ERROR` bloquea el archivo, `SOBRESCRIBIR` reescribe una fila
 * que ya se había cargado antes.
 */
export type EstadoFilaNomina = 'OK' | 'ERROR' | 'SOBRESCRIBIR';

/** De dónde salió la modalidad con la que se guarda la fila. */
export type ModalidadResueltaPor = 'ARCHIVO' | 'FICHA';

/** Qué explica que un colaborador con contrato no esté en el período. */
export type FuenteNovedad = 'AUSENCIA' | 'VACACION';

// ─── Piezas de una fila ──────────────────────────────────────────────────────

/** El colaborador de la fila, cruzado por cédula contra la ficha. */
export interface EmpleadoDeLaFila {
  id: number;
  nombre_completo: string;
  documento: string;
  modalidad_pago: string | null;
  /** El salario contractual de hoy, como string con dos decimales. */
  salario_base: string | null;
  fecha_ingreso: string | null;
  fecha_retiro: string | null;
  estado: boolean;
}

/** El período al que pertenece la fila, ya clasificado. */
export interface PeriodoDeLaFila {
  fecha_inicio: string;
  fecha_fin: string;
  dias_calendario: number;
  mes: number;
  anio: number;
  quincena: number | null;
  tipo_pago: 'QUINCENAL' | 'MENSUAL';
}

/**
 * Lo que se escribiría en `nomina_empleado`, tal cual.
 *
 * `desglose` dice si el archivo trajo el detalle del devengado o solo el
 * total. Sin desglose, el total va a `salario_base` en FIJO o a
 * `total_jornales` en PRODUCCION, y la fila lo avisa.
 */
export interface ValoresDeLaFila {
  dias_trabajados: number;
  salario_base: string;
  total_jornales: string;
  total_cosecha: string;
  /** Snapshot de cómo se liquidó la cosecha. No entra a ninguna suma. */
  gajos_liquidados: string | null;
  promedio_kg_gajo: string | null;
  complemento_smlv: string;
  total_dominicales: string;
  total_festivos: string;
  total_recargo_dominical: string;
  total_horas_extra: string;
  total_recargos: string;
  /** La parte nocturna de los recargos, que es base de vacaciones. */
  total_recargo_nocturno: string | null;
  total_incapacidades: string;
  total_ausencias_remunerado: string;
  total_devengado: string;
  subsidio_transporte: string;
  total_bonificaciones: string;
  total_deducciones: string;
  total_neto: string;
  desglose: boolean;
}

/** Los snapshots que la fila congela, como cualquier liquidación cerrada. */
export interface SnapshotsDeLaFila {
  salario_contractual: string | null;
  salario_minimo: string | null;
  cargo: string | null;
  predio: string | null;
  liquidado_at: string | null;
}

/** Una deducción o bonificación de la fila, como concepto hijo. */
export interface ConceptoDeLaFila {
  codigo: string;
  operacion: 'SUMA' | 'RESTA';
  valor: string;
  observacion?: string | null;
}

/** La fila que ya estaba cargada con esta misma clave. */
export interface FilaExistenteNomina {
  nomina_empleado_id: number;
  nomina_id: number;
  total_neto: string;
}

export interface FilaNominaCargue {
  /** Número de fila real del archivo, no el índice del array. */
  fila: number;
  estado: EstadoFilaNomina;
  /** `true` cuando ya estaba cargada y no se vuelve a escribir. */
  omitida: boolean;
  sobrescribir: boolean;
  documento: string | null;
  /** Nombre tal como venía en el archivo, para contrastarlo con la ficha. */
  nombre_archivo: string | null;
  /** Índice dentro de `nominas[]`, para enlazar la fila con su período. */
  nomina_indice: number | null;

  empleado: EmpleadoDeLaFila | null;
  periodo: PeriodoDeLaFila | null;
  modalidad: { salario_tipo: 'FIJO' | 'VARIABLE'; resuelta_por: ModalidadResueltaPor } | null;
  valores: ValoresDeLaFila | null;
  snapshots: SnapshotsDeLaFila | null;
  conceptos: ConceptoDeLaFila[];

  existente: FilaExistenteNomina | null;
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];

  /** Solo en el 201 de importar. */
  nomina_empleado_id?: number;
  sobrescrita?: boolean;
}

// ─── Período ─────────────────────────────────────────────────────────────────

/** La novedad que explica por qué a alguien no se le pagó ese período. */
export interface NovedadDelFaltante {
  fuente: FuenteNovedad;
  id: number;
  tipo: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string | null;
  origen?: string | null;
}

/**
 * Un colaborador con contrato vigente en el período que no viene en el archivo
 * ni está en otra nómina de esas fechas.
 *
 * `novedad` en `null` es el caso que hay que revisar: tenía contrato y no
 * quedó ni pago ni explicación.
 */
export interface FaltanteDelPeriodo {
  id: number;
  documento: string;
  nombre_completo: string;
  modalidad_pago: string | null;
  contrato: { id?: number; fecha_inicio: string; fecha_terminacion: string | null } | null;
  novedad: NovedadDelFaltante | null;
}

export interface TotalesDelPeriodo {
  fijos: string;
  variables: string;
  bonificaciones: string;
  deducciones: string;
  general: string;
}

export interface NominaDelCargue {
  fecha_inicio: string;
  fecha_fin: string;
  mes: number;
  anio: number;
  quincena: number | null;
  tipo_pago: 'QUINCENAL' | 'MENSUAL';
  etiqueta: string;
  /** `false` cuando ya existe una nómina importada con esas fechas. */
  nueva: boolean;
  /** Solo viene con valor si la nómina ya existe; en el 201, siempre. */
  nomina_id: number | null;
  /** Números de fila del archivo que forman este período. */
  filas: number[];
  totales: TotalesDelPeriodo;
  faltantes: FaltanteDelPeriodo[];

  /** Solo en el 201 de importar. */
  enlaces?: { detalle: string };
}

// ─── Respuesta ───────────────────────────────────────────────────────────────

export interface ResumenNominasCargue {
  filas: number;
  validas: number;
  con_error: number;
  a_sobrescribir: number;
  ya_cargadas: number;
  nominas: { total: number; nuevas: number; existentes: number };
  colaboradores: number;
  total_devengado: string;
  total_auxilio: string;
  total_bonificaciones: string;
  total_deducciones: string;
  total_neto: string;
  advertencias: number;
  /** Solo en el 201. */
  insertadas?: number;
  sobrescritas?: number;
  omitidas_ya_cargadas?: number;
  nominas_creadas?: number;
  nominas_reutilizadas?: number;
}

/** Traza del archivo guardado. Solo viaja en el 201. */
export interface CargueNominas {
  archivo: string;
  nombre_original: string;
  cargado_por: number;
  cargado_at: string;
  sobrescribir: boolean;
  filas: number;
  insertadas: number;
  sobrescritas: number;
  omitidas: number;
  nominas_creadas: number;
  nominas_reutilizadas: number;
}

export interface ResultadoImportacionNominas {
  tipo: 'NOMINAS';
  sobrescribir: boolean;
  archivo: ArchivoHistorico;
  resumen: ResumenNominasCargue;
  nominas: NominaDelCargue[];
  filas: FilaNominaCargue[];
  /** Advertencias de todo el cargue, no de un período ni de una fila. */
  advertencias: IncidenciaFila[];
  /** Solo en el 201. */
  cargue?: CargueNominas;
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

function cuerpo(archivo: File, sobrescribir?: boolean): FormData {
  const fd = new FormData();
  fd.append('archivo', archivo);
  if (sobrescribir) fd.append('sobrescribir', '1');
  return fd;
}

export const importarNominasApi = {
  /**
   * §16 — Plantilla generada por finca: hoja Nominas con las 32 cabeceras,
   * hoja Catálogos con los colaboradores de la finca (retirados e inactivos
   * incluidos: el histórico les paga), las modalidades y los conceptos del
   * tenant, y listas desplegables en `documento` y `modalidad`.
   */
  plantilla: (formato: FormatoPlantillaNominas = 'xlsx') =>
    apiClient.getBlob(`${BASE}/plantilla${formato === 'csv' ? '?formato=csv' : ''}`, T),

  /** §16 — Dry run: no persiste, no guarda el archivo, no audita. */
  validar: (archivo: File, sobrescribir = false) =>
    apiClient.postForm<{ data: ResultadoImportacionNominas }>(
      `${BASE}/validar`,
      cuerpo(archivo, sobrescribir),
      T,
    ),

  /**
   * §16 — Todo o nada bajo el lock del tenant. El 422
   * `NOMINAS_ARCHIVO_CON_ERRORES` trae en `data` la misma tabla de `validar`.
   */
  importar: (archivo: File, sobrescribir = false) =>
    apiClient.postForm<{ message: string; data: ResultadoImportacionNominas }>(
      '/v1/tenant/nominas/importar',
      cuerpo(archivo, sobrescribir),
      T,
    ),
};

// ─── Códigos (§0 y §16) ──────────────────────────────────────────────────────

export const ImportarNominasErrorCodes = {
  /** No se pudo leer, faltan cabeceras obligatorias o se pasó del tope. */
  NOMINAS_ARCHIVO_INVALIDO: 'NOMINAS_ARCHIVO_INVALIDO',
  NOMINAS_ARCHIVO_VACIO: 'NOMINAS_ARCHIVO_VACIO',
  /** 422: alguna fila falló. `data` trae la misma tabla de `validar`. */
  NOMINAS_ARCHIVO_CON_ERRORES: 'NOMINAS_ARCHIVO_CON_ERRORES',
  /**
   * 422: el archivo trae salud o pensión y el tenant no tiene ese concepto.
   * Se resuelve corriendo el seeder de conceptos, no desde la pantalla.
   */
  CONCEPTO_AUSENTE: 'CONCEPTO_AUSENTE',
  /** 409 de carrera: el wizard metió al colaborador en esos días. */
  COLABORADOR_EN_NOMINA_SOLAPADA: 'COLABORADOR_EN_NOMINA_SOLAPADA',
  /** 409: una cesantía o prima ya usó esa nómina como fuente. */
  NOMINA_IMPORTADA_CONSUMIDA: 'NOMINA_IMPORTADA_CONSUMIDA',
} as const;

/**
 * Errores de fila. Cualquiera bloquea el archivo completo.
 * El backend manda su propio `mensaje`, más específico; esta tabla es el
 * respaldo cuando no llega.
 */
export const ERROR_FILA_NOMINA_LABEL: Record<string, string> = {
  // Colaborador
  DOCUMENTO_REQUERIDO: 'Falta la cédula',
  DOCUMENTO_INVALIDO: 'La cédula quedó dañada al guardar el archivo',
  EMPLEADO_NO_ENCONTRADO: 'No hay un colaborador con esa cédula',
  EMPLEADO_ELIMINADO: 'Ese colaborador está eliminado: restáurelo',
  DOCUMENTO_AMBIGUO: 'Dos colaboradores con la misma cédula',
  // Período
  FECHA_INVALIDA: 'La fecha no se entiende',
  FECHA_FUTURA: 'La fecha es posterior a hoy',
  PERIODO_INVALIDO: 'La fecha de fin es anterior a la de inicio',
  PERIODO_CRUZA_ANIO: 'El período cruza el año: divida la fila',
  FILA_DUPLICADA_EN_ARCHIVO: 'Esa persona y ese período están dos veces',
  PERIODO_SOLAPADO_EN_ARCHIVO: 'Dos filas de la misma persona se cruzan en días',
  COLABORADOR_EN_NOMINA_SOLAPADA: 'Ya tiene una nómina que cubre esos días',
  VACACION_PENDIENTE_DE_PAGO_EN_NOMINA: 'Una vacación por pagar en nómina cruza el período',
  // Valores
  VALOR_INVALIDO: 'Esa celda no es un número',
  VALOR_NEGATIVO: 'El valor no puede ser negativo',
  NETO_NEGATIVO: 'Lo descontado supera lo pagado',
  // Catálogo
  CONCEPTO_AUSENTE: 'La finca no tiene ese concepto en su catálogo',
};

/** Advertencias de fila y globales. Cargan bien y quedan guardadas. */
export const ADVERTENCIA_NOMINA_LABEL: Record<string, string> = {
  // Ficha
  NOMBRE_DIFIERE_DE_LA_FICHA: 'El nombre no coincide con la ficha',
  MODALIDAD_DIFIERE_DE_LA_FICHA: 'La modalidad no coincide con la ficha',
  MODALIDAD_NO_RECONOCIDA: 'No se entendió la modalidad: se usa la de la ficha',
  PERIODO_FUERA_DE_VINCULACION: 'El período queda fuera del ingreso o del retiro',
  SIN_CONTRATO_EN_EL_PERIODO: 'Sin contrato en esas fechas: las prestaciones no cuentan esos días',
  SMLV_DESCONOCIDO_PARA_EL_ANIO: 'No se conoce el salario mínimo de ese año',
  // Valores
  DIAS_POR_DEFECTO: 'Sin días trabajados: se ponen los del período',
  DEVENGADO_SIN_DESGLOSE: 'La fila solo trae el total del devengado',
  DEVENGADO_NO_CUADRA: 'El desglose no suma el total: se guarda el total del archivo',
  NETO_NO_CUADRA: 'El neto no cuadra con el resto de la fila',
  PERIODO_CRUZA_MES: 'El período cruza el mes: la nómina queda en el mes de la fecha final',
  PROMEDIO_FUERA_DE_RANGO: 'El promedio kg/gajo es absurdo: revise el dato',
  CONCEPTO_FSP_CREADO_INACTIVO: 'Se creó el concepto del fondo de solidaridad, inactivo',
  // Cargue
  YA_CARGADA: 'Esa fila ya estaba cargada: se omite',
  NOMINA_CONSUMIDA_POR_LIQUIDACION: 'Una liquidación ya usó esta fila: conserva su copia',
  NOMINAS_NUEVAS: 'Se crearán nóminas históricas cerradas',
  NOMINAS_HISTORICAS_EXISTENTES: 'Hay períodos históricos que ya existen y reciben estas filas',
  FILAS_YA_CARGADAS: 'Algunas filas ya estaban cargadas y se omiten',
  // Cobertura
  PERIODO_CON_PERSONAL_SIN_NOMINA: 'Hay gente con contrato que no viene en el archivo',
  PERIODO_CON_PERSONAL_CON_NOVEDAD: 'Hay gente sin pago que sí tiene una novedad',
};
