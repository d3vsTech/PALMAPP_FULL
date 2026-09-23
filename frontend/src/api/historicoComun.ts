/**
 * API — Piezas comunes de los cargues históricos desde archivo
 * Contrato: docs/API_LIQUIDACIONES.md (v1.5, PR-L12, 2026-09-22) §12 y §13.
 *
 * Cesantías (§12) y prima (§13) son el mismo mecanismo con columnas distintas:
 * mismo lector, mismos estados de fila, mismos códigos de archivo, mismo flujo
 * de validar antes de importar. Lo que cambia de uno a otro son las columnas
 * del Excel y la unidad del período: el año en cesantías, el semestre en prima.
 *
 * Aquí vive lo que comparten. Cada módulo agrega encima sus propias columnas.
 *
 * Tres reglas que ninguna pantalla debe saltarse:
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
 */

/** Tope del lector del backend. Un archivo más largo se rechaza completo. */
export const MAX_FILAS_ARCHIVO = 1000;
/** Tope de tamaño del request. */
export const MAX_MB_ARCHIVO = 5;

/** Lo que aceptan los dos `input[type=file]` (§12.1, CSV desde PR-L12). */
export const ACCEPT_ARCHIVO = '.xlsx,.xls,.csv';

// ─── Enumeraciones ────────────────────────────────────────────────────────────

/**
 * Estado de cada fila del archivo.
 * OK se carga · SOBRESCRIBIR reemplaza lo ya cargado · ERROR bloquea el archivo.
 */
export type EstadoFilaHistorico = 'OK' | 'SOBRESCRIBIR' | 'ERROR';

/** Cómo leyó el backend el archivo (PR-L12). */
export type FormatoArchivoHistorico = 'XLSX' | 'XLS' | 'CSV';

/** Separador detectado en la fila de cabeceras de un CSV. */
export type SeparadorCsv = ';' | ',' | 'TAB' | '|';

export type CodificacionCsv = 'UTF-8' | 'UTF-16LE' | 'UTF-16BE' | 'WINDOWS-1252';

// ─── Bloques comunes de la respuesta ──────────────────────────────────────────

export interface IncidenciaFila {
  code: string;
  mensaje: string;
  /** Campos extra según el código: fila_id, periodo_id, columna, esperado… */
  [extra: string]: unknown;
}

export interface EmpleadoHistoricoRef {
  id: number;
  nombre_completo: string;
  /** La cédula tal como está en la ficha, no como venía en el archivo. */
  documento: string;
  modalidad_pago: string;
  fecha_ingreso: string | null;
  fecha_retiro: string | null;
  /** Solo lo manda el cargue de cesantías: la prima no tiene fondo. */
  fondo_cesantias?: string | null;
}

export interface DiasFila {
  fecha_computo_desde: string;
  fecha_computo_hasta: string;
  dias_vinculacion: number;
  dias_descontados: number;
  dias_computados: number;
  contrato_id: number | null;
}

/** Lo que ya está cargado para ese colaborador en ese año o semestre. */
export interface FilaExistente {
  fila_id: number;
  periodo_id: number;
  origen: string;
  valor_final: number;
  /** Solo en cesantías: la fila hija de intereses del mismo cargue. */
  intereses_fila_id?: number | null;
}

export interface ArchivoHistorico {
  nombre: string;
  /** Cómo se leyó. En Excel, separador y codificación llegan nulos. */
  formato: FormatoArchivoHistorico;
  separador: SeparadorCsv | null;
  codificacion: CodificacionCsv | null;
  filas_leidas: number;
  /** Columnas que el lector no reconoció y descartó. */
  cabeceras_ignoradas: string[];
}

export interface FechaLimitePar {
  legal: string;
  operativa: string;
}

/** Traza del archivo subido; se acumula en `parametros_snapshot.cargues[]`. */
export interface CargueHistorico {
  archivo: string;
  nombre_original: string;
  cargado_por: number;
  cargado_at: string;
  filas: number;
  insertadas: number;
  sobrescritas: number;
  /** Solo en prima: la política de días vigente en ese cargue. */
  liq_prima_descontar_suspensiones?: boolean;
}

export interface ResumenHistoricoBase {
  filas: number;
  validas: number;
  a_sobrescribir: number;
  con_error: number;
  advertencias: number;
  /** Solo al importar. */
  insertadas?: number;
}

// ─── Códigos que rechazan el archivo entero (§0.1) ────────────────────────────

/** Estos llegan antes de mirar las filas: no hay tabla que pintar. */
export const HistoricoArchivoErrorCodes = {
  HISTORICO_ARCHIVO_INVALIDO: 'HISTORICO_ARCHIVO_INVALIDO',
  HISTORICO_ARCHIVO_VACIO: 'HISTORICO_ARCHIVO_VACIO',
  HISTORICO_ARCHIVO_CON_ERRORES: 'HISTORICO_ARCHIVO_CON_ERRORES',
  HISTORICO_SEMESTRE_NO_CERRADO: 'HISTORICO_SEMESTRE_NO_CERRADO',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  COLABORADOR_EN_LIQUIDACION_SOLAPADA: 'COLABORADOR_EN_LIQUIDACION_SOLAPADA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

/** Motivos de `HISTORICO_ARCHIVO_INVALIDO`. */
export type MotivoArchivoInvalido = 'NO_LEGIBLE' | 'CABECERAS_FALTANTES' | 'MAX_FILAS';

export const MOTIVO_ARCHIVO_LABEL: Record<MotivoArchivoInvalido, string> = {
  NO_LEGIBLE:
    'El archivo no se pudo leer ni como Excel ni como CSV. Si es un CSV, el nombre tiene que terminar en .csv; si es de Excel, vuelva a guardarlo como Libro de Excel.',
  CABECERAS_FALTANTES: 'Al archivo le faltan columnas obligatorias.',
  MAX_FILAS: `El archivo supera las ${MAX_FILAS_ARCHIVO} filas. Divídalo en varios.`,
};

// ─── Códigos por fila comunes a los dos cargues (§12.4, §13.4) ────────────────

/**
 * Errores de fila que comparten los dos cargues. Cualquiera bloquea el archivo.
 * El backend manda su propio `mensaje`; esta tabla es el respaldo.
 */
export const ERROR_FILA_COMUN_LABEL: Record<string, string> = {
  DOCUMENTO_REQUERIDO: 'Falta la cédula',
  DOCUMENTO_INVALIDO: 'La cédula quedó dañada al guardar el CSV',
  EMPLEADO_NO_ENCONTRADO: 'No hay un colaborador con esa cédula',
  EMPLEADO_ELIMINADO: 'El colaborador está eliminado',
  DOCUMENTO_AMBIGUO: 'Dos colaboradores tienen esa misma cédula',
  DOCUMENTO_DUPLICADO_EN_ARCHIVO: 'La cédula se repite en el archivo',
  FECHA_INVALIDA: 'Fecha inválida',
  OBSERVACION_INVALIDA: 'La observación es muy larga',
  SIN_VINCULO_EN_EL_ANIO: 'No tuvo contrato en ese período',
  YA_LIQUIDADO_EN_SISTEMA: 'Ya está liquidado en el sistema',
  YA_CARGADO: 'Ya está cargado',
};

/** Advertencias de fila comunes (Anexo A.1.3 y A.1.4). No bloquean. */
export const ADVERTENCIA_FILA_COMUN_LABEL: Record<string, string> = {
  RETIRADO_EN_EL_ANIO: 'Retirado dentro del período',
  PAGO_CON_MORA: 'Se pagó después de la fecha límite',
  SIN_CONTRATOS_USA_FECHAS_EMPLEADO: 'Sin contratos: se usan las fechas de la ficha',
  CONTRATO_ANTERIOR_EN_EL_ANIO: 'Hubo un contrato anterior en el período',
  CONTRATOS_SOLAPADOS: 'Tiene contratos con fechas cruzadas',
  INGRESO_EN_PERIODO: 'Ingresó dentro del período',
  DIAS_DESCONTADOS: 'Se le descontaron días de servicio',
  FALTAS_IMPLICITAS_NO_DESCONTADAS: 'Tiene faltas sin soporte, no descontadas',
  AUSENCIAS_PENDIENTES_EN_RANGO: 'Tiene ausencias sin aprobar en el período',
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

const SEPARADOR_LABEL: Record<SeparadorCsv, string> = {
  ';': 'punto y coma',
  ',': 'coma',
  TAB: 'tabulador',
  '|': 'barra',
};

/**
 * Cómo se leyó el archivo, en una línea.
 *
 * En un CSV esto no es decoración: un archivo separado por comas que el lector
 * tomó por punto y coma se ve como una sola columna, y el usuario solo puede
 * darse cuenta si le decimos qué entendimos.
 */
export function descripcionFormato(a: ArchivoHistorico | undefined): string | null {
  if (!a) return null;
  if (a.formato !== 'CSV') return 'Excel';
  const partes = ['CSV'];
  if (a.separador) partes.push(`separado por ${SEPARADOR_LABEL[a.separador] ?? a.separador}`);
  if (a.codificacion) partes.push(a.codificacion);
  return partes.join(' · ');
}
