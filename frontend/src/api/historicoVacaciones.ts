/**
 * API — Histórico de vacaciones desde Excel o CSV, un archivo por año (PR-L13)
 * Base: /api/v1/tenant/liquidaciones/historico/vacaciones
 *
 * Contrato: docs/API_LIQUIDACIONES.md (v1.7, PR-L14, 2026-09-29) §14.
 *
 * `POST liquidaciones/vacaciones/historico` (§10.6) registra UNA vacación por
 * petición. Una finca con 80 colaboradores y cuatro vacaciones previas cada uno
 * son cientos de llamadas; este cargue las registra en un archivo.
 *
 * El año del formulario es el de la **fecha de inicio del disfrute**, no el de
 * la fecha fin: una vacación del 16 de diciembre de 2024 al 3 de enero de 2025
 * va en el archivo de 2024.
 *
 * Lo que este cargue tiene y los otros tres no:
 *
 *  1. **Varias filas por cédula.** Una fila es una vacación, no un colaborador.
 *     Lo único prohibido es que dos filas del mismo colaborador se crucen en
 *     fechas (`RANGO_SOLAPADO_EN_ARCHIVO`), así que aquí no existe
 *     `DOCUMENTO_DUPLICADO_EN_ARCHIVO`.
 *
 *  2. **El sistema deriva lo que falte.** Basta una de `fecha_fin` o
 *     `dias_habiles`: la otra la calcula con el calendario de festivos y el
 *     sábado hábil de la finca. Si vienen las dos, manda el archivo (es el
 *     registro de un hecho pasado) y la diferencia solo advierte.
 *
 *  3. **`validar` simula el saldo.** `colaboradores[]` trae `saldo_antes` y
 *     `saldo_despues` con las filas nuevas en memoria: es lo que deja ver, sin
 *     guardar nada, cómo queda "Turnos pendientes" después del cargue.
 *
 * El `valor_pagado` es opcional e informativo: completa el registro del CST
 * art. 187-3, sale en el listado y en el comprobante, y no entra al saldo de
 * días, a la base de cesantías o prima, a la nómina ni a la liquidación final.
 *
 * Permisos: liquidaciones.ver (plantilla) y liquidaciones.editar (validar e
 * importar).
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
  ADVERTENCIA_FILA_COMUN_LABEL,
  ERROR_FILA_COMUN_LABEL,
  queryPlantilla,
  type FormatoPlantilla,
} from './historicoComun';

const T = true; // requiresTenant
const BASE = '/v1/tenant/liquidaciones/historico/vacaciones';

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

// ─── Tipos de la respuesta (§14.2) ────────────────────────────────────────────

/** Cómo se repartió `valor_pagado` entre disfrute y días en dinero. */
export type RepartoValor = 'SIN_VALOR' | 'SOLO_DISFRUTE' | 'PROPORCIONAL_A_DIAS';

export interface DiaNoHabil {
  fecha: string;
  motivo: 'DOMINGO' | 'FESTIVO' | 'SABADO';
}

export interface VacacionFila {
  fecha_inicio: string;
  fecha_fin: string | null;
  /** `true` cuando el archivo no la trajo y la calculó el calendario. */
  fecha_fin_calculada: boolean;
  dias_habiles: number | null;
  /** `true` cuando el archivo no los trajo y los contó el calendario. */
  dias_habiles_calculados: boolean;
  dias_calendario: number | null;
  dias_dinero: number;
  /**
   * Lo leído del archivo. `0` si la celda venía vacía; `null` si es inválida o
   * la fila no tiene un rango con el que repartir.
   */
  valor_pagado: number | null;
  valor_dia: number | null;
  valor_disfrute: number | null;
  valor_dinero: number | null;
  reparto_valor: RepartoValor | null;
  fecha_pago: string | null;
  contrato_id: number | null;
  /** Los días que el calendario descontó del rango. */
  dias_no_habiles: DiaNoHabil[];
}

/** Un período de causación al que la fila imputa días (forma de §10.5). */
export interface PeriodoAfectado {
  periodo: number;
  inicio: string;
  fin: string;
  completo: boolean;
  dias_generados: number;
  dias_disfrute: number;
  dias_dinero: number;
  saldo_restante: number;
}

export interface SaldoFila {
  periodos_afectados: PeriodoAfectado[];
  /** Lo que no cabe en el saldo causado; no bloquea, deja el saldo en cero. */
  dias_sin_saldo: { disfrute: number; dinero: number };
}

/** Vacación histórica que se reemplazaría con `sobrescribir`. */
export interface VacacionExistente {
  id: number;
  numero_comprobante: string;
  origen: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias_habiles: number;
  dias_dinero: number;
  valor_total: number;
}

export interface FilaHistoricoVacaciones {
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
  vacacion: VacacionFila | null;
  /** `null` en filas con error: no hay nada que imputar. */
  saldo: SaldoFila | null;
  observacion: string | null;
  existentes: VacacionExistente[];
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
  /** Solo al importar. */
  vacacion_id?: number;
  numero_comprobante?: string;
}

/** Saldo del colaborador, con los mismos campos del acumulado (§10.1). */
export interface SaldoColaborador {
  dias_generados: number;
  dias_disfrutados: number;
  dias_compensados: number;
  dias_disponibles: number;
  dias_disponibles_exigibles: number;
  dias_causados_periodo_actual: number;
  dias_dinero_max: number;
  fecha_vencimiento: string | null;
  dias_para_vencimiento: number | null;
  estado_vencimiento: string | null;
  elegible: boolean;
  motivo_no_elegible: string | null;
}

export interface ColaboradorHistoricoVacaciones {
  empleado_id: number;
  documento: string;
  nombre_completo: string;
  /** Números de fila del archivo que le pertenecen. */
  filas: number[];
  saldo_antes: SaldoColaborador;
  /** `null` si ninguna de sus filas es cargable. */
  saldo_despues: SaldoColaborador | null;
  advertencias: IncidenciaFila[];
}

export interface ResumenHistoricoVacaciones extends ResumenHistoricoBase {
  colaboradores: number;
  total_dias_habiles: number;
  total_dias_dinero: number;
  total_valor_pagado: number;
}

export interface ParametrosHistoricoVacaciones {
  liq_vacaciones_sabado_habil: boolean;
  dias_vacaciones_anuales: number;
  /** Años del rango sin calendario de festivos generado (informativo). */
  anios_sin_calendario: number[];
}

/** La traza del cargue, con los dos campos propios de vacaciones. */
export type CargueHistoricoVacaciones = CargueHistorico & {
  total_valor_pagado: number;
  liq_vacaciones_sabado_habil: boolean;
};

export interface AnalisisHistoricoVacaciones {
  anio: number;
  sobrescribir: boolean;
  archivo: ArchivoHistorico;
  parametros: ParametrosHistoricoVacaciones;
  resumen: ResumenHistoricoVacaciones;
  filas: FilaHistoricoVacaciones[];
  colaboradores: ColaboradorHistoricoVacaciones[];
  advertencias: IncidenciaFila[];
  /** Solo al importar. */
  cargue?: CargueHistoricoVacaciones;
}

// ─── Códigos por fila (§14.4) ─────────────────────────────────────────────────

/** Errores de fila. Cualquiera bloquea el archivo completo. */
export const ERROR_FILA_LABEL: Record<string, string> = {
  ...ERROR_FILA_COMUN_LABEL,
  VACACIONES_DIAS_INVALIDOS: 'Los días no sirven',
  VACACIONES_VALOR_INVALIDO: 'El valor pagado no sirve',
  VACACIONES_INICIO_NO_HABIL: 'El disfrute empieza en un día no hábil',
  CALENDARIO_FESTIVOS_AUSENTE: 'Falta el calendario de festivos de ese año',
  VACACIONES_FUERA_DE_CONTRATO: 'Las fechas no caen dentro de ningún contrato',
  VACACIONES_HISTORICO_EN_NOMINA: 'Esas fechas ya las liquidó una nómina',
  RANGO_SOLAPADO_EN_ARCHIVO: 'Se cruza con otra fila del archivo',
};

/** Advertencias de fila (Anexo A.1.5). No bloquean; quedan en la vacación. */
export const ADVERTENCIA_FILA_LABEL: Record<string, string> = {
  ...ADVERTENCIA_FILA_COMUN_LABEL,
  VACACIONES_HABILES_DIFIEREN_DEL_CALENDARIO:
    'Los días del archivo no cuadran con el calendario',
  VACACIONES_INICIO_NO_HABIL: 'El disfrute empieza en un día no hábil',
  CALENDARIO_FESTIVOS_AUSENTE: 'Sin calendario de festivos: no se comparó',
  VACACIONES_DISFRUTE_EN_CURSO: 'La vacación todavía no ha terminado',
  VACACIONES_DISFRUTE_MENOR_6_DIAS: 'Menos de 6 días hábiles continuos',
  VACACIONES_PAGO_POSTERIOR_AL_INICIO: 'Se pagó después de salir a vacaciones',
};

/** Advertencias del panel por colaborador (Anexo A.1.5). */
export const ADVERTENCIA_COLABORADOR_LABEL: Record<string, string> = {
  VACACIONES_CONSUMO_SIN_SALDO: 'Se registran más días de los causados',
  VACACIONES_PREVIAS_AL_COMPUTO: 'Son de un vínculo anterior: no consumen saldo',
  VACACIONES_ACUMULACION_MAYOR_2_ANIOS: 'Acumula dos períodos o más sin disfrutar',
  SIN_CONTRATOS_USA_FECHAS_EMPLEADO: 'Sin contratos: se usan las fechas de la ficha',
  CONTRATO_ANTERIOR_EN_EL_ANIO: 'Hubo un contrato anterior',
  CONTRATOS_SOLAPADOS: 'Tiene contratos con fechas cruzadas',
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

export const historicoVacacionesApi = {
  /**
   * §14.1 — Plantilla oficial. El CSV trae las mismas cabeceras sin la hoja de
   * instrucciones.
   */
  plantilla: (formato: FormatoPlantilla = 'xlsx') =>
    apiClient.getBlob(`${BASE}/plantilla${queryPlantilla(formato)}`, T),

  /**
   * §14.2 — Simulación. No guarda nada, no audita y no deja el archivo en el
   * servidor. Es el único paso que muestra cómo se interpretó cada celda y
   * cómo quedaría el saldo de cada colaborador.
   */
  validar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<{ data: AnalisisHistoricoVacaciones }>(
      `${BASE}/validar`,
      cuerpo(archivo, anio, sobrescribir),
      T,
    ),

  /**
   * §14.3 — Cargue, todo o nada. Con una sola fila con error responde 422
   * `HISTORICO_ARCHIVO_CON_ERRORES` con la misma tabla en `data` y no queda
   * nada guardado.
   */
  importar: (archivo: File, anio: number, sobrescribir = false) =>
    apiClient.postForm<{
      message: string;
      data: AnalisisHistoricoVacaciones;
      advertencias: IncidenciaFila[];
    }>(BASE, cuerpo(archivo, anio, sobrescribir), T),
};
