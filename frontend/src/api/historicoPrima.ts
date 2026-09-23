/**
 * API — Histórico de prima de servicios desde Excel o CSV (PR-L12)
 * Base: /api/v1/tenant/liquidaciones/historico/prima
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.5, PR-L12, 2026-09-22) §13.
 *
 * Registra la prima que la empresa pagó antes de que existiera el módulo:
 * un archivo por semestre, cruzado con cada colaborador por cédula. No calcula
 * nada, el valor es el que se pagó. Solo los días del semestre los calcula el
 * sistema desde los contratos.
 *
 * Dos diferencias con el cargue de cesantías, y las dos importan:
 *
 *  1. La unidad es el semestre, no el año. Van `anio` y `semestre` en el form,
 *     y solo se admiten semestres ya terminados: el primero del año en curso
 *     desde el 1 de julio, el segundo desde el 1 de enero siguiente.
 *
 *  2. Cuatro columnas. No hay fondo ni intereses: la prima se le paga a la
 *     persona, no a una administradora.
 *
 * El flujo es el mismo de §12: validar sin guardar, importar todo o nada.
 *
 * Permisos: liquidaciones.ver (plantilla) y liquidaciones.editar (validar e importar).
 */
import { apiClient } from './client';
import type { AdvertenciaLiquidacion, DescriptorPeriodo } from './liquidaciones';
import type {
  ArchivoHistorico,
  CargueHistorico,
  DiasFila,
  EmpleadoHistoricoRef,
  EstadoFilaHistorico,
  FechaLimitePar,
  FilaExistente,
  IncidenciaFila,
  ResumenHistoricoBase,
} from './historicoComun';
import {
  ADVERTENCIA_FILA_COMUN_LABEL,
  ERROR_FILA_COMUN_LABEL,
} from './historicoComun';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/historico/prima';

/** Primer año que acepta el backend. */
export const PRIMER_ANIO_CARGABLE = 2020;

export type Semestre = 1 | 2;

// ─── Tipos de la respuesta (§13.2) ────────────────────────────────────────────

export interface PrimaFila {
  valor: number | null;
  fecha_pago: string | null;
  /** La celda venía vacía y se usó la fecha límite legal del semestre. */
  fecha_por_defecto: boolean;
  dias_mora: number | null;
  /**
   * `valor × 360 ÷ días computados`: la base mensual que explica la prima
   * cargada. Es lo que delata un dígito de más o de menos.
   */
  base_implicita: number | null;
}

export interface FilaHistoricoPrima {
  /** Número de fila real del archivo; las vacías se saltan. */
  fila: number;
  estado: EstadoFilaHistorico;
  documento: string | null;
  empleado: EmpleadoHistoricoRef | null;
  prima: PrimaFila | null;
  dias: DiasFila | null;
  observacion: string | null;
  existente: FilaExistente | null;
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
  /** Solo en la respuesta de importar: el id que quedó creado. */
  fila_id?: number;
}

export interface FechasLimitePrima {
  prima: FechaLimitePar;
}

export interface PeriodosPrima {
  prima: DescriptorPeriodo | null;
}

export interface ResumenHistoricoPrima extends ResumenHistoricoBase {
  total_prima: number;
}

/** Mismo bloque en validar, en el 201 de importar y en el 422 con errores. */
export interface AnalisisHistoricoPrima {
  anio: number;
  semestre: Semestre;
  sobrescribir: boolean;
  archivo: ArchivoHistorico;
  fechas_limite: FechasLimitePrima;
  periodos: PeriodosPrima;
  resumen: ResumenHistoricoPrima;
  filas: FilaHistoricoPrima[];
  /** Globales del semestre; no bloquean. */
  advertencias: AdvertenciaLiquidacion[];
  /** Solo en el 201. */
  cargue?: CargueHistorico;
}

export interface RespuestaHistoricoPrima {
  message?: string;
  data: AnalisisHistoricoPrima;
  advertencias?: AdvertenciaLiquidacion[];
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

/** El request es multipart: los números y el booleano viajan como texto. */
function armarForm(
  archivo: File,
  anio: number,
  semestre: Semestre,
  sobrescribir: boolean,
): FormData {
  const fd = new FormData();
  fd.append('archivo', archivo);
  fd.append('anio', String(anio));
  fd.append('semestre', String(semestre));
  fd.append('sobrescribir', sobrescribir ? '1' : '0');
  return fd;
}

export const historicoPrimaApi = {
  /** Plantilla oficial con las cabeceras, el formato y la hoja de instrucciones. */
  plantilla: () => apiClient.getBlob(`${BASE}/plantilla`, T),

  /**
   * Simulación: lee, cruza y valida sin guardar nada, ni siquiera el archivo.
   * Es el paso que muestra cómo se interpretó cada celda.
   */
  validar: (archivo: File, anio: number, semestre: Semestre, sobrescribir = false) =>
    apiClient.postForm<RespuestaHistoricoPrima>(
      `${BASE}/validar`,
      armarForm(archivo, anio, semestre, sobrescribir),
      T,
    ),

  /**
   * Carga definitiva. Repite la validación dentro de la transacción: con una
   * sola fila con error responde 422 y no queda nada.
   */
  importar: (archivo: File, anio: number, semestre: Semestre, sobrescribir = false) =>
    apiClient.postForm<RespuestaHistoricoPrima>(
      BASE,
      armarForm(archivo, anio, semestre, sobrescribir),
      T,
    ),
};

// ─── Códigos por fila (§13.4) ─────────────────────────────────────────────────

/** Los comunes de §12.4 más los propios de prima. */
export const ERROR_FILA_PRIMA_LABEL: Record<string, string> = {
  ...ERROR_FILA_COMUN_LABEL,
  PRIMA_VALOR_INVALIDO: 'El valor de la prima no sirve',
  SIN_VINCULO_EN_EL_ANIO: 'No tuvo contrato en ese semestre',
  YA_LIQUIDADO_EN_SISTEMA: 'Ese semestre ya se liquidó en el sistema',
  YA_CARGADO: 'Ese semestre ya está cargado',
};

/** Advertencias por fila (Anexo A.1.4). No bloquean: quedan en la fila. */
export const ADVERTENCIA_FILA_PRIMA_LABEL: Record<string, string> = {
  ...ADVERTENCIA_FILA_COMUN_LABEL,
  FECHA_PAGO_PRIMA_POR_DEFECTO: 'Sin fecha: se usa la fecha límite legal',
  PRIMA_INFERIOR_AL_MINIMO: 'El valor parece bajo para los días trabajados',
  LIQUIDACION_FINAL_CONTRATO_ANTERIOR: 'Un contrato anterior ya se liquidó en una final',
  RETIRADO_EN_EL_ANIO: 'Retirado dentro del semestre',
};

// ─── Semestres cargables ──────────────────────────────────────────────────────

export interface OpcionSemestre {
  anio: number;
  semestre: Semestre;
  /** Lo que se guarda en el select: los dos valores no caben en uno solo. */
  valor: string;
  label: string;
}

export function claveSemestre(anio: number, semestre: Semestre): string {
  return `${anio}-${semestre}`;
}

export function etiquetaSemestre(anio: number, semestre: Semestre): string {
  return `${semestre}° semestre ${anio}`;
}

/** Rango de fechas del semestre, para los textos de ayuda. */
export function rangoSemestre(semestre: Semestre): { inicio: string; fin: string } {
  return semestre === 1
    ? { inicio: '1 de enero', fin: '30 de junio' }
    : { inicio: '1 de julio', fin: '31 de diciembre' };
}

/** Fecha límite legal de pago del semestre (CST art. 306). */
export function fechaLimiteSemestre(semestre: Semestre): string {
  return semestre === 1 ? '30 de junio' : '20 de diciembre';
}

/**
 * Semestres que el backend acepta: solo los ya terminados, de 2020-S1 hacia
 * adelante. El primero del año en curso se abre el 1 de julio; el segundo, el
 * 1 de enero siguiente.
 */
export function semestresCargables(hoy = new Date()): OpcionSemestre[] {
  const anioHoy = hoy.getFullYear();
  // getMonth() es 0-based: 6 es julio.
  const ultimo: { anio: number; semestre: Semestre } =
    hoy.getMonth() >= 6 ? { anio: anioHoy, semestre: 1 } : { anio: anioHoy - 1, semestre: 2 };

  const opciones: OpcionSemestre[] = [];
  let { anio, semestre } = ultimo;
  while (anio >= PRIMER_ANIO_CARGABLE) {
    opciones.push({
      anio,
      semestre,
      valor: claveSemestre(anio, semestre),
      label: etiquetaSemestre(anio, semestre),
    });
    if (semestre === 1) {
      anio -= 1;
      semestre = 2;
    } else {
      semestre = 1;
    }
  }
  return opciones;
}
