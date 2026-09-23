/**
 * API — Histórico de cesantías e intereses desde Excel o CSV (PR-L11; CSV desde PR-L12)
 * Base: /api/v1/tenant/liquidaciones/historico/cesantias
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.5, PR-L12, 2026-09-22) §12.
 *
 * Registra lo que la empresa consignó y pagó antes de que existiera el módulo:
 * un archivo por año, cruzado con cada colaborador por cédula. No calcula ni
 * sanciona: el valor es el que se consignó. Solo los días del año los calcula
 * el sistema desde los contratos.
 *
 * Las reglas del flujo y las piezas que comparte con el cargue de prima (§13)
 * están en `historicoComun.ts`. Aquí van las columnas propias del archivo de
 * cesantías: valor, fecha de consignación, fondo, intereses y su fecha.
 *
 * Permisos: liquidaciones.ver (plantilla) y liquidaciones.editar (validar e importar).
 */
import { apiClient } from './client';
import type { AdvertenciaLiquidacion, DescriptorPeriodo, TipoLiquidacion } from './liquidaciones';
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
import { ADVERTENCIA_FILA_COMUN_LABEL, ERROR_FILA_COMUN_LABEL } from './historicoComun';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/historico/cesantias';

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
  DiasFila,
  EmpleadoHistoricoRef,
  EstadoFilaHistorico,
  FechaLimitePar,
  FilaExistente,
  FormatoArchivoHistorico,
  IncidenciaFila,
  MotivoArchivoInvalido,
} from './historicoComun';

// ─── Tipos de la respuesta (§12.2) ────────────────────────────────────────────

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

export interface FilaHistorico {
  /** Número de fila real del archivo; las vacías se saltan. */
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

export interface FechasLimiteHistorico {
  cesantias: FechaLimitePar;
  intereses: FechaLimitePar;
}

export interface PeriodosHistorico {
  cesantias: DescriptorPeriodo | null;
  intereses: DescriptorPeriodo | null;
}

export interface ResumenHistorico extends ResumenHistoricoBase {
  con_intereses: number;
  total_cesantias: number;
  total_intereses: number;
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

// ─── Códigos por fila (§12.4) ─────────────────────────────────────────────────

/** Los comunes más los propios de cesantías. Cualquiera bloquea el archivo. */
export const ERROR_FILA_LABEL: Record<string, string> = {
  ...ERROR_FILA_COMUN_LABEL,
  CESANTIAS_VALOR_INVALIDO: 'El valor de las cesantías no sirve',
  INTERESES_VALOR_INVALIDO: 'El valor de los intereses no sirve',
  FONDO_INVALIDO: 'El nombre del fondo es muy largo',
  SIN_VINCULO_EN_EL_ANIO: 'No tuvo contrato en ese año',
  YA_LIQUIDADO_EN_SISTEMA: 'Ese año ya se liquidó en el sistema',
  YA_CARGADO: 'Ese año ya está cargado',
  INTERESES_EN_SISTEMA: 'Sus intereses están en un período del sistema',
};

/** Advertencias por fila (Anexo A.1.3). No bloquean: quedan en la fila. */
export const ADVERTENCIA_FILA_LABEL: Record<string, string> = {
  ...ADVERTENCIA_FILA_COMUN_LABEL,
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

// ─── Años cargables ───────────────────────────────────────────────────────────

/** Los dos tipos de período que crea el cargue. */
export const TIPOS_HISTORICO: TipoLiquidacion[] = ['CESANTIAS', 'INTERESES_CESANTIAS'];

/** Años que el backend acepta: de 2020 al año pasado, nunca el actual. */
export function aniosCargables(hoy = new Date()): number[] {
  const ultimo = hoy.getFullYear() - 1;
  const anios: number[] = [];
  for (let a = ultimo; a >= 2020; a--) anios.push(a);
  return anios;
}
