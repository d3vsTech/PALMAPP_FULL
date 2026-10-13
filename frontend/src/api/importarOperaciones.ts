/**
 * API — Importación masiva de jornales y cosechas históricos
 * Contrato: docs/API_OPERACIONES.md §13 y §13.1 (PR-I1 y PR-I2, 2026-10-10).
 * Formato del archivo: docs/ESTRUCTURA_EXCEL_OPERACIONES.md
 *
 * El cliente trae su historial de campo de antes de usar el sistema y lo carga
 * por archivo en vez de digitar planilla por planilla. Cada fila se convierte
 * en la misma tarjeta que crearía el wizard: mismos servicios de cálculo,
 * misma matriz de campos por labor, misma regla de vínculo.
 *
 * Cuatro reglas que ninguna pantalla debe saltarse:
 *
 *  1. Siempre `validar` antes de `importar`. El dry run no guarda nada y es lo
 *     único que muestra cómo interpretó el sistema cada celda. Sin ese paso un
 *     `04/03/2025` leído como 4 de marzo pasa sin que nadie lo vea.
 *
 *  2. Todo o nada. Una sola fila con error y no entra ninguna. El botón de
 *     importar va deshabilitado mientras `resumen.con_error` sea mayor que 0.
 *
 *  3. `estado_final` por defecto es APROBADA, y una planilla aprobada entra
 *     derecho al cálculo de nómina. No es una preferencia de UI: el dashboard,
 *     los insights, el ajuste de gajos y los viajes solo ven planillas
 *     aprobadas, así que un histórico en BORRADOR es invisible.
 *
 *  4. El 409 `NOMINA_ABIERTA_EN_RANGO` no es un fallo: es una pregunta. Esas
 *     fechas caen en una nómina sin cerrar, así que esa liquidación pagaría lo
 *     que se está cargando. Las salidas son importar en BORRADOR o forzar.
 */
import { apiClient } from './client';
import type { ArchivoHistorico, IncidenciaFila } from './historicoComun';

const BASE = '/v1/tenant/operaciones/importar';
const T = true; // requiresTenant

// ─── Constantes del cargue (§13) ─────────────────────────────────────────────

/** Tope del lector del backend. Un archivo más largo se rechaza completo. */
export const MAX_FILAS_OPERACIONES = 5000;

/** Tope de tamaño del request. */
export const MAX_MB_OPERACIONES = 10;

/** Lo que acepta el `input[type=file]`. */
export const ACCEPT_OPERACIONES = '.xlsx,.xls,.csv';

/** Tope de días por llamada de `aprobar-rango` (§13.1). */
export const MAX_DIAS_APROBAR_RANGO = 366;

// ─── Enumeraciones ───────────────────────────────────────────────────────────

/** Los dos archivos del módulo. Una fila de jornal y una de cosecha no
 *  comparten ni la mitad de las columnas, por eso van separados. */
export type TipoImportacion = 'jornales' | 'cosechas';

/** Como lo devuelve el backend en `data.tipo`, en mayúsculas. */
export type TipoImportacionRespuesta = 'JORNALES' | 'COSECHAS';

export type FormatoPlantillaOperaciones = 'xlsx' | 'csv';

/**
 * Estado en el que quedan las planillas que crea el cargue.
 *
 * `APROBADA` es el default del backend y lo que hace visible el histórico en
 * reportes y viajes. `BORRADOR` sirve para revisar en el wizard antes de
 * aprobar, o para esquivar la guarda de nómina abierta.
 */
export type EstadoFinalPlanilla = 'APROBADA' | 'BORRADOR';

/** `OK` se carga, `ERROR` bloquea el archivo completo. */
export type EstadoFilaOperacion = 'OK' | 'ERROR';

/** Cómo se cruzó una celda de catálogo contra la finca. */
export type ResueltoPor = 'ID' | 'NOMBRE' | 'SUBLOTE' | 'DOCUMENTO';

/** Si el valor salió del cálculo de hoy o del `valor_total` del archivo. */
export type OrigenValor = 'CALCULADO' | 'ARCHIVO';

/** Un colaborador propio o un operario de contratista (§13, PR-I2). */
export type TipoPersonaFila = 'COLABORADOR' | 'OPERARIO';

// ─── Piezas de una fila ──────────────────────────────────────────────────────

/**
 * Una celda de catálogo ya resuelta: labor, actividad, lote, sublote o insumo.
 * `resuelto_por` dice si mandó el id de la lista desplegable o el nombre.
 */
export interface CatalogoResuelto {
  id: number;
  nombre: string;
  estado: boolean;
  resuelto_por?: ResueltoPor;
}

export interface LaborResuelta extends CatalogoResuelto {
  categoria: 'PALMA' | 'FINCA';
  tipo: string | null;
  tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
}

export interface SubloteResuelto extends CatalogoResuelto {
  lote_id: number;
  cantidad_palmas: number | null;
}

/** El contratista de la fila, cuando la columna `tercero` viene llena. */
export interface TerceroResuelto {
  id: number;
  nombre: string;
  tipo_persona: 'JURIDICA' | 'NATURAL';
  documento: string | null;
  estado: boolean;
  resuelto_por: ResueltoPor;
}

/**
 * Una persona de la fila. Con `tercero` lleno son operarios de ese contratista;
 * sin él, colaboradores propios. Una fila nunca mezcla los dos.
 */
export interface PersonaFila {
  tipo: TipoPersonaFila;
  id: number;
  documento: string;
  nombre_completo: string;
  modalidad_pago: string | null;
  estado: boolean;
  fecha_retiro: string | null;
  /** Solo en operarios. */
  tercero_id?: number;
}

/** Lo que recibe cada persona del reparto de la fila. */
export interface ValorPorPersona {
  empleado_id: number | null;
  operario_id?: number | null;
  tercero_id?: number | null;
  documento?: string;
  modalidad_pago?: string | null;
  valor_unitario?: string | null;
  valor_total: string | null;
  /** Solo en cosechas. */
  valor_calculado?: string | null;
  peso_calculado?: string | null;
  sync_uuid?: string;
}

/** Campos libres de una fila de jornales. */
export interface DatosJornalFila {
  cantidad_palmas: number | null;
  gramos_por_palma: number | null;
  descripcion: string | null;
  nombre_trabajo: string | null;
  ubicacion: string | null;
  observacion: string | null;
}

export interface CalculoJornalFila {
  tipo_pago: 'POR_PALMA' | 'JORNAL_FIJO';
  tercero_id: number | null;
  valor_unitario: string | null;
  precio_insumo_snapshot: string | null;
  valor_total: string | null;
  origen_valor: OrigenValor;
  /** Lo que traía la columna `valor_total`, si venía. */
  valor_archivo: string | null;
  /** Lo que habría costado con la tarifa de hoy. */
  valor_calculado_hoy: string | null;
  por_persona: ValorPorPersona[];
}

export interface CalculoCosechaFila {
  anio: number;
  tercero_id: number | null;
  precio_cosecha: string | null;
  promedio_kg_gajo: string | null;
  valor_total: string | null;
  origen_valor: OrigenValor;
  valor_archivo: string | null;
  valor_calculado_hoy: string | null;
  por_persona: ValorPorPersona[];
}

/**
 * Si la nómina podrá pagar esa cosecha. Paga por **gajos**
 * (`gajos / N × promedio kg/gajo × precio del lote del año`), nunca por kilos
 * ni por el `valor_total` del archivo.
 */
export interface LiquidableCosecha {
  ok: boolean;
  motivos: Array<'SIN_CUADRILLA' | 'GAJOS_EN_CERO' | 'SIN_PRECIO_ANIO' | 'SIN_PROMEDIO_ANIO'>;
}

// ─── Filas ───────────────────────────────────────────────────────────────────

interface FilaBase {
  /** Número de fila real del archivo, no el índice del array. */
  fila: number;
  estado: EstadoFilaOperacion;
  fecha: string | null;
  tercero: TerceroResuelto | null;
  lote: CatalogoResuelto | null;
  sublote: SubloteResuelto | null;
  /** `true` cuando la fila ya se había cargado antes y no se vuelve a insertar. */
  omitida?: boolean;
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];
}

export interface FilaJornal extends FilaBase {
  documento: string | null;
  personas: PersonaFila[];
  /** Varias cédulas en la celda: un grupo que hizo la labor junto. */
  grupo: boolean;
  labor: LaborResuelta | null;
  actividad: CatalogoResuelto | null;
  insumo: CatalogoResuelto | null;
  /** Nulo en una fila con error: no se llegó a leer los campos libres. */
  datos: DatosJornalFila | null;
  calculo: CalculoJornalFila | null;
  /** Solo en el 201 de importar. */
  jornal_id?: number;
  jornal_grupo_id?: number;
  jornales?: Array<{ id: number; empleado_id: number | null; operario_id?: number | null; tercero_id?: number | null }>;
}

export interface FilaCosecha extends FilaBase {
  /** Nulo en una fila con error: no se llegó a leer gajos ni kilos. */
  cosecha: {
    gajos: number | null;
    kilos: string | null;
    referencia: string | null;
    observacion: string | null;
  } | null;
  cuadrilla: PersonaFila[];
  calculo: CalculoCosechaFila | null;
  /** Nulo mientras la fila no se pueda evaluar (error de celda). */
  liquidable: LiquidableCosecha | null;
  /** Solo en el 201 de importar. */
  cosecha_id?: number;
  cuadrilla_ids?: Array<{ id: number; empleado_id: number | null; operario_id?: number | null; tercero_id?: number | null }>;
}

export type FilaImportacionOperacion = FilaJornal | FilaCosecha;

/** Discrimina la unión sin mirar `data.tipo`. */
export function esFilaCosecha(fila: FilaImportacionOperacion): fila is FilaCosecha {
  return 'cosecha' in fila;
}

// ─── Planillas tocadas ───────────────────────────────────────────────────────

/** Faltantes de una planilla aprobada, mismo shape de §7.1. */
export interface FaltantesPlanilla {
  colaboradores_faltantes: Array<{
    id: number;
    nombre_completo: string;
    documento: string;
    modalidad_pago: string;
  }>;
  operarios_faltantes: Array<{
    id: number;
    nombre_completo: string;
    cedula: string | null;
    tercero_nombre: string | null;
  }>;
}

export interface PlanillaDelCargue {
  fecha: string;
  /** `null` mientras la planilla no exista: la crea `importar`. */
  operacion_id: number | null;
  estado: 'BORRADOR' | 'APROBADA' | null;
  nueva: boolean;
  estado_final: EstadoFinalPlanilla;
  filas: number;
  filas_ok: number;
  /** Solo en el 201 y solo en las aprobadas. */
  faltantes?: FaltantesPlanilla | null;
  enlaces?: { wizard: string };
}

// ─── Respuesta ───────────────────────────────────────────────────────────────

export interface ResumenImportacionOperaciones {
  filas: number;
  validas: number;
  con_error: number;
  ya_cargadas: number;
  planillas: {
    total: number;
    nuevas: number;
    existentes: number;
    aprobadas: number;
  };
  colaboradores: number;
  operarios: number;
  terceros: number;
  jornales: number;
  grupos: number;
  cosechas: number;
  valor_total: string;
  advertencias: number;
  /** Solo en el 201. */
  insertadas?: number;
  omitidas_ya_cargadas?: number;
}

/** Traza del archivo guardado. Solo viaja en el 201. */
export interface CargueOperaciones {
  archivo: string;
  nombre_original: string;
  cargado_por: number;
  cargado_at: string;
  tipo: TipoImportacionRespuesta;
  estado_final: EstadoFinalPlanilla;
  forzado: boolean;
  filas: number;
  insertadas: number;
  omitidas: number;
  planillas_nuevas: number;
  planillas_aprobadas: number;
}

export interface ResultadoImportacionOperaciones {
  tipo: TipoImportacionRespuesta;
  estado_final: EstadoFinalPlanilla;
  archivo: ArchivoHistorico;
  resumen: ResumenImportacionOperaciones;
  planillas: PlanillaDelCargue[];
  filas: FilaImportacionOperacion[];
  /** Advertencias de todo el cargue, no de una fila. */
  advertencias: IncidenciaFila[];
  /** Solo en el 201. */
  cargue?: CargueOperaciones;
}

// ─── Aprobación por rango (§13.1) ────────────────────────────────────────────

export interface AprobarRangoPayload {
  fecha_desde: string;
  fecha_hasta: string;
  /** Por defecto solo toca las planillas que creó una importación. */
  solo_importadas?: boolean;
  /** Pasa por encima de la guarda de nómina abierta. */
  forzar?: boolean;
}

export interface PlanillaAprobada {
  fecha: string;
  operacion_id: number;
  origen: 'MANUAL' | 'IMPORTACION';
  estado: 'APROBADA';
  aprobaciones_cascada: { horas_extra: number; ausencias: number };
  enlaces: { wizard: string };
  faltantes: FaltantesPlanilla | null;
}

export interface RespuestaAprobarRango {
  message: string;
  data: {
    aprobadas: number;
    planillas: PlanillaAprobada[];
    omitidas: Array<{ fecha: string; operacion_id: number; motivo: string }>;
  };
  advertencias: IncidenciaFila[];
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

function cuerpo(
  archivo: File,
  tipo: TipoImportacion,
  estadoFinal: EstadoFinalPlanilla,
  forzar?: boolean,
): FormData {
  const fd = new FormData();
  fd.append('archivo', archivo);
  fd.append('tipo', tipo);
  fd.append('estado_final', estadoFinal);
  if (forzar) fd.append('forzar', '1');
  return fd;
}

export const importarOperacionesApi = {
  /**
   * §13 — Plantilla generada por finca: hoja de datos, hoja Catálogos con los
   * ids de la finca y listas desplegables. El CSV solo trae los datos.
   */
  plantilla: (tipo: TipoImportacion, formato: FormatoPlantillaOperaciones = 'xlsx') =>
    apiClient.getBlob(
      `${BASE}/plantilla?tipo=${tipo}${formato === 'csv' ? '&formato=csv' : ''}`,
      T,
    ),

  /** §13 — Dry run: no persiste, no guarda el archivo, no audita. */
  validar: (
    archivo: File,
    tipo: TipoImportacion,
    estadoFinal: EstadoFinalPlanilla = 'APROBADA',
  ) =>
    apiClient.postForm<{ data: ResultadoImportacionOperaciones }>(
      `${BASE}/validar`,
      cuerpo(archivo, tipo, estadoFinal),
      T,
    ),

  /**
   * §13 — Todo o nada. Puede responder 409 `NOMINA_ABIERTA_EN_RANGO`, que no
   * es un fallo del archivo: hay que reintentar en BORRADOR o con `forzar`.
   */
  importar: (
    archivo: File,
    tipo: TipoImportacion,
    estadoFinal: EstadoFinalPlanilla = 'APROBADA',
    forzar = false,
  ) =>
    apiClient.postForm<{ message: string; data: ResultadoImportacionOperaciones }>(
      '/v1/tenant/operaciones/importar',
      cuerpo(archivo, tipo, estadoFinal, forzar),
      T,
    ),

  /** §13.1 — Aprueba en bloque los borradores del rango. Máximo 366 días. */
  aprobarRango: (payload: AprobarRangoPayload) =>
    apiClient.post<RespuestaAprobarRango>(
      '/v1/tenant/operaciones/aprobar-rango',
      payload,
      T,
    ),
};

// ─── Códigos (§0 y §13) ──────────────────────────────────────────────────────

export const ImportarOperacionesErrorCodes = {
  /** No se pudo leer, faltan cabeceras o se pasó del tope de filas. */
  OPERACIONES_ARCHIVO_INVALIDO: 'OPERACIONES_ARCHIVO_INVALIDO',
  OPERACIONES_ARCHIVO_VACIO: 'OPERACIONES_ARCHIVO_VACIO',
  /** Alguna fila falló: `data` trae la misma tabla de `validar`. */
  OPERACIONES_ARCHIVO_CON_ERRORES: 'OPERACIONES_ARCHIVO_CON_ERRORES',
  /** 409: las fechas caen en una nómina sin cerrar. Reintentar o forzar. */
  NOMINA_ABIERTA_EN_RANGO: 'NOMINA_ABIERTA_EN_RANGO',
} as const;

/**
 * Errores de fila. El mensaje del backend ya viene en español y es más
 * específico que esto; estas etiquetas son el respaldo cuando no llega.
 */
export const ERROR_FILA_OPERACION_LABEL: Record<string, string> = {
  FECHA_INVALIDA: 'La fecha no se entiende',
  FECHA_FUTURA: 'La fecha es posterior a hoy',
  PLANILLA_APROBADA: 'Ese día ya tiene una planilla aprobada',
  DOCUMENTO_REQUERIDO: 'Falta la cédula',
  DOCUMENTO_INVALIDO: 'La cédula no es válida',
  EMPLEADO_NO_ENCONTRADO: 'No hay un colaborador con esa cédula',
  EMPLEADO_ELIMINADO: 'Ese colaborador está eliminado',
  DOCUMENTO_AMBIGUO: 'Dos colaboradores con la misma cédula',
  DOCUMENTO_REPETIDO_EN_CELDA: 'La cédula está dos veces en la celda',
  SIN_VINCULO_EN_LA_FECHA: 'No estaba vinculado ese día',
  OPERARIO_NO_ENCONTRADO: 'Ese contratista no tiene un operario con esa cédula',
  OPERARIO_AMBIGUO: 'Dos operarios del contratista con la misma cédula',
  TERCERO_NO_ENCONTRADO: 'No se encontró el contratista',
  TERCERO_AMBIGUO: 'Hay varios contratistas con ese nombre',
  LABOR_REQUERIDA: 'Falta la labor',
  LABOR_NO_ENCONTRADA: 'Esa labor no existe en la finca',
  LABOR_AMBIGUA: 'Hay varias labores con ese nombre',
  LABOR_ES_COSECHA: 'La cosecha va en el otro archivo',
  ACTIVIDAD_NO_ENCONTRADA: 'Esa actividad no existe',
  ACTIVIDAD_AMBIGUA: 'Hay varias actividades con ese nombre',
  ACTIVIDAD_NO_PERTENECE_A_LABOR: 'La actividad es de otra labor',
  LOTE_NO_ENCONTRADO: 'Ese lote no existe en la finca',
  LOTE_AMBIGUO: 'Hay varios lotes con ese nombre',
  SUBLOTE_NO_ENCONTRADO: 'Ese sublote no existe',
  SUBLOTE_AMBIGUO: 'Hay varios sublotes con ese nombre',
  SUBLOTE_NO_PERTENECE_AL_LOTE: 'El sublote no es de ese lote',
  SUBLOTE_REQUERIDO: 'Falta el sublote',
  LOTE_O_SUBLOTE_REQUERIDO: 'Falta el lote o el sublote',
  INSUMO_NO_ENCONTRADO: 'Ese insumo no existe',
  INSUMO_AMBIGUO: 'Hay varios insumos con ese nombre',
  CANTIDAD_PALMAS_REQUERIDA: 'Esa labor necesita el número de palmas',
  INSUMO_REQUERIDO: 'La fertilización necesita el insumo',
  GRAMOS_REQUERIDOS: 'La fertilización necesita los gramos por palma',
  DESCRIPCION_O_ACTIVIDAD_REQUERIDA: 'Falta la actividad o la descripción',
  CAMPO_NO_APLICA: 'Esa columna no aplica a esta labor',
  PALMAS_INVALIDAS: 'El número de palmas no es válido',
  GRAMOS_INVALIDOS: 'Los gramos no son válidos',
  GAJOS_INVALIDOS: 'Los gajos no son válidos',
  KILOS_INVALIDOS: 'Los kilos no son válidos',
  GAJOS_O_KILOS_REQUERIDOS: 'La cosecha necesita gajos o kilos',
  VALOR_TOTAL_INVALIDO: 'El valor no es válido',
  TEXTO_INVALIDO: 'El texto se pasa del máximo',
  FILA_DUPLICADA_EN_ARCHIVO: 'Esta fila está repetida en el archivo',
  REFERENCIA_DUPLICADA: 'Esa referencia ya está usada',
};

/** Advertencias de fila. Cargan bien y quedan guardadas. */
export const ADVERTENCIA_OPERACION_LABEL: Record<string, string> = {
  PLANILLA_NUEVA: 'Se creará la planilla de ese día',
  PLANILLA_EXISTENTE_NO_APROBADA: 'La planilla ya existía en borrador',
  PRECIO_ACTUAL_APLICADO: 'Se liquidó con la tarifa de hoy',
  VALOR_HISTORICO_APLICADO: 'Se guardó el valor del archivo',
  EMPLEADO_FIJO_VALOR_CERO: 'Es de salario fijo: su jornal queda en cero',
  SIN_PRECIO_LABOR: 'La labor no tiene precio configurado',
  SIN_RANGO_ABONO: 'No hay rango de abono para esos gramos',
  JORNAL_MINIMO_APLICADO: 'Se aplicó el jornal mínimo',
  SIN_TARIFA_TERCERO: 'El contratista no tiene tarifa pactada',
  SIN_PRECIO_COSECHA: 'No hay precio de cosecha para ese lote y año',
  SIN_TARIFA_COSECHA: 'La cosecha no tiene tarifa',
  FECHA_EN_NOMINA_CERRADA: 'Ese día ya está en una nómina cerrada',
  FECHA_EN_NOMINA_ABIERTA: 'Ese día cae en una nómina sin cerrar',
  SIN_NOMINA_EN_FECHA: 'Ninguna nómina cubre ese día',
  NOVEDAD_EN_LA_FECHA: 'Tenía una novedad ese día',
  LABOR_INACTIVA: 'La labor está inactiva',
  LOTE_INACTIVO: 'El lote está inactivo',
  SUBLOTE_INACTIVO: 'El sublote está inactivo',
  ACTIVIDAD_INACTIVA: 'La actividad está inactiva',
  INSUMO_INACTIVO: 'El insumo está inactivo',
  TERCERO_INACTIVO: 'El contratista está inactivo',
  OPERARIO_INACTIVO: 'El operario está inactivo',
  PALMAS_SUPERAN_SUBLOTE: 'Las palmas superan las del sublote',
  NOMBRE_DIFIERE_DE_LA_FICHA: 'El nombre no coincide con la ficha',
  NOMBRE_DIFIERE_DEL_CATALOGO: 'El nombre no coincide con el catálogo',
  YA_CARGADA: 'Ya se había cargado: se omite',
  POSIBLE_DUPLICADO_EN_PLANILLA: 'La planilla ya tiene una tarjeta igual',
  COSECHA_SIN_CUADRILLA: 'Cosecha sin cuadrilla: no paga a nadie',
  GAJOS_EN_CERO: 'Sin gajos: la nómina no la paga',
  COSECHA_NO_LIQUIDABLE: 'La nómina no podrá pagar esta cosecha',
  NOMINA_ABIERTA_EN_RANGO: 'Hay una nómina sin cerrar sobre estas fechas',
  SIN_NOMINA_EN_RANGO: 'Ninguna nómina cubre estas fechas',
  PLANILLAS_NUEVAS: 'Se crearán planillas nuevas',
  PLANILLA_CON_PERSONAL_SIN_REGISTRAR: 'Quedó gente sin registrar en la planilla',
};
