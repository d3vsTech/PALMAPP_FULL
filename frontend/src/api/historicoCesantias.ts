/**
 * API — Histórico de cesantías e intereses desde Excel (PR-L11)
 * Base: /api/v1/tenant/liquidaciones/historico/cesantias
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.4, PR-L11, 2026-09-21) §12.
 *
 * Registra lo que la empresa consignó y pagó antes de que existiera el módulo:
 * un archivo por año, cruzado con cada colaborador por cédula. No calcula ni
 * sanciona: el valor es el que se consignó. Solo los días del año los calcula
 * el sistema desde los contratos.
 *
 * Tres reglas que la pantalla NO debe saltarse:
 *
 *  1. Siempre `validar` antes de `importar`. La simulación no guarda nada y es
 *     lo único que muestra cómo interpretó el sistema cada celda. Sin ese paso
 *     un `10/02/2024` leído como 10 de febrero pasa sin que nadie lo vea.
 *
 *  2. Todo o nada. Una sola fila con error y no se carga nada: ni períodos, ni
 *     filas, ni auditoría. El botón de cargar va deshabilitado mientras
 *     `resumen.con_error` sea mayor que cero.
 *
 *  3. Error y advertencia no son lo mismo. Las advertencias cargan bien y
 *     quedan guardadas en la fila; los errores bloquean el archivo completo.
 *
 * Permisos: liquidaciones.ver (plantilla) y liquidaciones.editar (validar e importar).
 */
import { apiClient } from './client';
import type {
  AdvertenciaLiquidacion,
  DescriptorPeriodo,
  TipoLiquidacion,
} from './liquidaciones';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/historico/cesantias';

/** Tope del lector del backend. Un archivo más largo se rechaza completo. */
export const MAX_FILAS_ARCHIVO = 1000;
/** Tope de tamaño del request. */
export const MAX_MB_ARCHIVO = 5;

// ─── Enumeraciones ────────────────────────────────────────────────────────────

/**
 * Estado de cada fila del Excel.
 * OK se carga · SOBRESCRIBIR reemplaza lo ya cargado · ERROR bloquea el archivo.
 */
export type EstadoFilaHistorico = 'OK' | 'SOBRESCRIBIR' | 'ERROR';

// ─── Tipos de la respuesta (§12.2) ────────────────────────────────────────────

export interface IncidenciaFila {
  code: string;
  mensaje: string;
  /** Campos extra según el código: fila_id, periodo_id, columna, esperado… */
  [extra: string]: unknown;
}

export interface EmpleadoHistoricoRef {
  id: number;
  nombre_completo: string;
  /** La cédula tal como está en la ficha, no como venía en el Excel. */
  documento: string;
  modalidad_pago: string;
  fecha_ingreso: string | null;
  fecha_retiro: string | null;
  fondo_cesantias: string | null;
}

export interface CesantiasFila {
  valor: number | null;
  fecha_consignacion: string | null;
  /** La celda venía vacía y se usó la fecha límite legal. */
  fecha_por_defecto: boolean;
  fondo: string | null;
  dias_mora: number | null;
}

export interface InteresesFila {
  valor: number | null;
  fecha_pago: string | null;
  fecha_por_defecto: boolean;
  /** Lo que daría el 12 % legal sobre los días base. */
  esperado?: number | null;
  dias_base?: number | null;
  dias_mora: number | null;
}

export interface DiasFila {
  fecha_computo_desde: string;
  fecha_computo_hasta: string;
  dias_vinculacion: number;
  dias_descontados: number;
  dias_computados: number;
  contrato_id: number | null;
}

/** Lo que ya está cargado para ese colaborador y año. */
export interface FilaExistente {
  fila_id: number;
  periodo_id: number;
  origen: string;
  valor_final: number;
  intereses_fila_id: number | null;
}

export interface FilaHistorico {
  /** Número de fila real del Excel; las vacías se saltan. */
  fila: number;
  estado: EstadoFilaHistorico;
  documento: string | null;
  empleado: EmpleadoHistoricoRef | null;
  cesantias: CesantiasFila | null;
  intereses: InteresesFila | null;
  dias: DiasFila | null;
  observacion: string | null;
  existente: FilaExistente | null;
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
  /** Solo en la respuesta de importar: los ids que quedaron creados. */
  fila_id?: number;
  intereses_fila_id?: number | null;
}

export interface ArchivoHistorico {
  nombre: string;
  filas_leidas: number;
  /** Columnas del Excel que el lector no reconoció y descartó. */
  cabeceras_ignoradas: string[];
}

export interface FechaLimitePar {
  legal: string;
  operativa: string;
}

export interface FechasLimiteHistorico {
  cesantias: FechaLimitePar;
  intereses: FechaLimitePar;
}

export interface PeriodosHistorico {
  cesantias: DescriptorPeriodo | null;
  intereses: DescriptorPeriodo | null;
}

export interface ResumenHistorico {
  filas: number;
  validas: number;
  a_sobrescribir: number;
  con_error: number;
  con_intereses: number;
  total_cesantias: number;
  total_intereses: number;
  advertencias: number;
  /** Solo al importar. */
  insertadas?: number;
}

/** Traza del archivo subido; se acumula en el período. */
export interface CargueHistorico {
  archivo: string;
  nombre_original: string;
  cargado_por: number;
  cargado_at: string;
  filas: number;
  insertadas: number;
  sobrescritas: number;
}

/** Mismo bloque en validar, en el 201 de importar y en el 422 con errores. */
export interface AnalisisHistorico {
  anio: number;
  sobrescribir: boolean;
  archivo: ArchivoHistorico;
  fechas_limite: FechasLimiteHistorico;
  periodos: PeriodosHistorico;
  resumen: ResumenHistorico;
  filas: FilaHistorico[];
  /** Globales del año; no bloquean. */
  advertencias: AdvertenciaLiquidacion[];
  /** Solo en el 201. */
  cargue?: CargueHistorico;
}

export interface RespuestaHistorico {
  message?: string;
  data: AnalisisHistorico;
  advertencias?: AdvertenciaLiquidacion[];
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

/** El request es multipart: el booleano viaja como "1" / "0". */
function armarForm(archivo: File, anio: number, sobrescribir: boolean): FormData {
  const fd = new FormData();
  fd.append('archivo', archivo);
  fd.append('anio', String(anio));
  fd.append('sobrescribir', sobrescribir ? '1' : '0');
  return fd;
}

export const historicoCesantiasApi = {
  /** Plantilla oficial con las cabeceras, el formato y la hoja de instrucciones. */
  plantilla: () => apiClient.getBlob(`${BASE}/plantilla`, T),

  /**
   * Simulación: lee, cruza y valida sin guardar nada, ni siquiera el archivo.
   * Es el paso que muestra cómo se interpretó cada celda.
   */
  validar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<RespuestaHistorico>(
      `${BASE}/validar`,
      armarForm(archivo, anio, sobrescribir),
      T,
    ),

  /**
   * Carga definitiva. Repite la validación dentro de la transacción: con una
   * sola fila con error responde 422 y no queda nada.
   */
  importar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<RespuestaHistorico>(BASE, armarForm(archivo, anio, sobrescribir), T),
};

// ─── Códigos de error (§0.1 y §12.4) ──────────────────────────────────────────

/** Los que rechazan el archivo entero, antes de mirar las filas. */
export const HistoricoArchivoErrorCodes = {
  HISTORICO_ARCHIVO_INVALIDO: 'HISTORICO_ARCHIVO_INVALIDO',
  HISTORICO_ARCHIVO_VACIO: 'HISTORICO_ARCHIVO_VACIO',
  HISTORICO_ARCHIVO_CON_ERRORES: 'HISTORICO_ARCHIVO_CON_ERRORES',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  COLABORADOR_EN_LIQUIDACION_SOLAPADA: 'COLABORADOR_EN_LIQUIDACION_SOLAPADA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

/** Motivos de `HISTORICO_ARCHIVO_INVALIDO`. */
export type MotivoArchivoInvalido = 'NO_LEGIBLE' | 'CABECERAS_FALTANTES' | 'MAX_FILAS';

export const MOTIVO_ARCHIVO_LABEL: Record<MotivoArchivoInvalido, string> = {
  NO_LEGIBLE:
    'El archivo no se pudo leer como Excel. Si lo guardó como CSV y le cambió el nombre, vuelva a guardarlo como Libro de Excel.',
  CABECERAS_FALTANTES: 'Al archivo le faltan columnas obligatorias.',
  MAX_FILAS: `El archivo supera las ${MAX_FILAS_ARCHIVO} filas. Divídalo en varios.`,
};

/**
 * Errores por fila (§12.4). Cualquiera de estos bloquea el archivo completo.
 * El backend manda su propio `mensaje`; esta tabla es el respaldo y el título
 * corto para la tabla.
 */
export const ERROR_FILA_LABEL: Record<string, string> = {
  DOCUMENTO_REQUERIDO: 'Falta la cédula',
  EMPLEADO_NO_ENCONTRADO: 'No hay un colaborador con esa cédula',
  EMPLEADO_ELIMINADO: 'El colaborador está eliminado',
  DOCUMENTO_AMBIGUO: 'Dos colaboradores tienen esa misma cédula',
  DOCUMENTO_DUPLICADO_EN_ARCHIVO: 'La cédula se repite en el archivo',
  CESANTIAS_VALOR_INVALIDO: 'El valor de las cesantías no sirve',
  INTERESES_VALOR_INVALIDO: 'El valor de los intereses no sirve',
  FECHA_INVALIDA: 'Fecha inválida',
  FONDO_INVALIDO: 'El nombre del fondo es muy largo',
  OBSERVACION_INVALIDA: 'La observación es muy larga',
  SIN_VINCULO_EN_EL_ANIO: 'No tuvo contrato en ese año',
  YA_LIQUIDADO_EN_SISTEMA: 'Ese año ya se liquidó en el sistema',
  YA_CARGADO: 'Ese año ya está cargado',
  INTERESES_EN_SISTEMA: 'Sus intereses están en un período del sistema',
};

/** Advertencias por fila (Anexo A.1.3). No bloquean: quedan en la fila. */
export const ADVERTENCIA_FILA_LABEL: Record<string, string> = {
  FECHA_CONSIGNACION_POR_DEFECTO: 'Sin fecha: se usa la fecha límite legal',
  FECHA_PAGO_INTERESES_POR_DEFECTO: 'Sin fecha: se usa la fecha límite legal',
  INTERESES_NO_CARGADOS: 'Sin intereses para este colaborador',
  INTERESES_DIFIEREN_DEL_LEGAL: 'Los intereses no dan el 12 % legal',
  RETIRADO_EN_EL_ANIO: 'Retirado dentro del año',
  SIN_FONDO_CESANTIAS: 'Sin fondo ni en el archivo ni en la ficha',
  FONDO_DISTINTO_AL_ELEGIDO: 'El fondo no es el de la ficha',
  FONDO_NO_CATALOGADO: 'El fondo no está en el catálogo de la finca',
  PAGO_CON_MORA: 'Se consignó después de la fecha límite',
};

// ─── Rótulos ──────────────────────────────────────────────────────────────────

export const ESTADO_FILA_BADGE: Record<EstadoFilaHistorico, string> = {
  OK: 'bg-success/10 text-success border-success/30',
  SOBRESCRIBIR:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
  ERROR: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const ESTADO_FILA_LABEL: Record<EstadoFilaHistorico, string> = {
  OK: 'Se carga',
  SOBRESCRIBIR: 'Reemplaza',
  ERROR: 'Con error',
};

/** Los dos tipos de período que crea el cargue. */
export const TIPOS_HISTORICO: TipoLiquidacion[] = ['CESANTIAS', 'INTERESES_CESANTIAS'];

/** Años que el backend acepta: de 2020 al año pasado, nunca el actual. */
export function aniosCargables(hoy = new Date()): number[] {
  const ultimo = hoy.getFullYear() - 1;
  const anios: number[] = [];
  for (let a = ultimo; a >= 2020; a--) anios.push(a);
  return anios;
}
