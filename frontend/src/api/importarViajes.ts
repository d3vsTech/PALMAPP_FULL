/**
 * API — Importación masiva de viajes históricos
 * Contrato: docs/API_VIAJES.md §15 (PR-V1, 2026-10-14).
 * Formato del archivo: docs/ESTRUCTURA_EXCEL_VIAJES.md
 *
 * El cliente trae su historial de despachos de fruta de antes de usar el
 * sistema y lo carga por archivo en vez de capturar viaje por viaje. Cada
 * grupo de filas se convierte en el mismo viaje que dejaría el flujo manual:
 * crear, enlazar cosechas, recontear y finalizar, con los mismos servicios de
 * cálculo y las mismas guardas.
 *
 * Es el segundo de los tres cargues del histórico y va después de las
 * operaciones: las cosechas que el archivo referencia tienen que existir ya en
 * planillas APROBADAS.
 *
 * Cinco reglas que ninguna pantalla debe saltarse:
 *
 *  1. El archivo es plano y de dos niveles: una fila es una cosecha
 *     transportada, y las filas con la misma `remision` son un viaje. Las
 *     columnas del viaje pueden ir solo en la primera fila del grupo.
 *
 *  2. Siempre `validar` antes de `importar`. El dry run no guarda nada y es lo
 *     único que muestra cómo interpretó cada celda: qué camión, qué planta,
 *     qué cosecha con su cuadrilla y con qué promedio kg/gajo va a quedar.
 *
 *  3. Todo o nada. Una sola fila con error y no entra ningún viaje, y el error
 *     de una fila marca ERROR a todo su viaje. El botón de importar va
 *     deshabilitado mientras `resumen.con_error` sea mayor que 0.
 *
 *  4. `estado_final` por defecto es FINALIZADO, y un viaje finalizado siembra
 *     el promedio kg/gajo del lote, que es lo que la nómina usa para pagar la
 *     cosecha. No es una preferencia de UI.
 *
 *  5. El 409 `NOMINA_ABIERTA_EN_RANGO` no es un fallo: es una pregunta. Esas
 *     fechas caen en una nómina sin cerrar, así que esa liquidación pagaría lo
 *     que se está cargando. La única salida es forzar; importar en CREADO no
 *     esquiva la guarda, porque el cargue también escribe el reconteo de gajos
 *     y la nómina lo lee.
 */
import { apiClient } from './client';
import type { ArchivoHistorico, IncidenciaFila } from './historicoComun';

const BASE = '/v1/tenant/viajes/importar';
const T = true; // requiresTenant

// ─── Constantes del cargue (§15) ─────────────────────────────────────────────

/** Tope del lector del backend. Un archivo más largo se rechaza completo. */
export const MAX_FILAS_VIAJES = 5000;

/** Tope de tamaño del request. */
export const MAX_MB_VIAJES = 10;

/** Lo que acepta el `input[type=file]`. */
export const ACCEPT_VIAJES = '.xlsx,.xls,.csv';

/** Rango esperado del promedio kg/gajo. Fuera de ahí el cargue avisa. */
export const PROMEDIO_MINIMO = 3;
export const PROMEDIO_MAXIMO = 60;

/** Gajos de sobreconteo que un split tolera antes de bloquear (§5.4.1). */
export const TOLERANCIA_SOBRECONTEO = 10;

// ─── Enumeraciones ───────────────────────────────────────────────────────────

export type FormatoPlantillaViajes = 'xlsx' | 'csv';

/**
 * Estado en el que queda cada viaje del cargue.
 *
 * `FINALIZADO` es el default del backend y lo deja cerrado como lo haría la
 * pantalla: promedio kg/gajo por lote si es homogéneo, snapshot en las
 * cosechas, peso de cuadrilla y reconteos aprobados. Exige `peso_viaje`
 * cuando el viaje lleva cosechas.
 *
 * `CREADO` lo deja en reconteo para revisarlo y cerrarlo a mano. No esquiva la
 * guarda de nómina: el reconteo de gajos se escribe igual.
 */
export type EstadoFinalViaje = 'FINALIZADO' | 'CREADO';

/** `OK` se carga, `ERROR` bloquea el archivo completo. */
export type EstadoFilaViaje = 'OK' | 'ERROR';

/** Cómo se cruzó la celda del camión contra el catálogo de la finca. */
export type ResueltoPorTransportador = 'PLACA' | 'ID' | 'NOMBRE';

/** Cómo se cruzó la celda de la planta extractora. */
export type ResueltoPorExtractora = 'NIT' | 'ID' | 'NOMBRE';

/**
 * Cómo se identificó la cosecha: `LISTA` es la etiqueta de la plantilla con el
 * id adentro, `ID` el número solo y `REFERENCIA` el tiquete con el que se
 * cargó la cosecha.
 */
export type ResueltaPorCosecha = 'LISTA' | 'ID' | 'REFERENCIA';

/** Por qué un viaje FINALIZADO cerró sin sembrar `promedio_lote`. */
export type MotivoSinPromedio = 'MIXTO' | 'PESO_CERO' | 'SIN_GAJOS_EFECTIVOS' | 'SIN_COSECHAS';

// ─── Piezas de un viaje ──────────────────────────────────────────────────────

/** El camión del viaje, ya cruzado contra el catálogo. */
export interface TransportadorDelCargue {
  id: number;
  placa: string;
  nombre: string;
  empresa: { id: number; razon_social: string } | null;
  /** `false` es un camión retirado: el histórico lo admite con advertencia. */
  estado: boolean;
  resuelto_por: ResueltoPorTransportador;
}

/** La planta a la que llegó el camión. */
export interface ExtractoraDelCargue {
  id: number;
  razon_social: string;
  nit: string | null;
  estado: boolean;
  resuelto_por: ResueltoPorExtractora;
}

/** Lo que reportó la extractora al recibir el camión. */
export interface DatosExtractoraDelCargue {
  numero_remision_extractora: string | null;
  fecha_llegada: string | null;
  hora_llegada: string | null;
  fruto_verde: string | null;
  sobre_maduro: string | null;
  podrido: string | null;
  pedunculo_largo: string | null;
  mal_formado: string | null;
  observaciones_extractora: string | null;
}

/** El promedio kg/gajo que el viaje va a sembrar en un lote. */
export interface PromedioPrevistoLote {
  lote_id: number;
  lote: string | null;
  gajos: number;
  promedio_kg_gajo: string;
}

/** El `promedio_lote` que el cargue creó de verdad. Solo en el 201. */
export interface PromedioGeneradoLote {
  lote_id: number;
  promedio: string;
  fecha: string;
}

/**
 * Lo que el viaje va a producir al cerrar.
 *
 * `promedio_previsto` llega `null` con `estado_final = CREADO`: un viaje en
 * reconteo todavía no siembra promedios.
 */
export interface CalculoViajeCargue {
  es_homogeneo: boolean;
  lotes: number[];
  /** Null mientras alguna fila del viaje no resolvió su cosecha. */
  cantidad_gajos_total: number | null;
  detalles: number;
  promedio_previsto: PromedioPrevistoLote[] | null;
  /** Solo en el 201. */
  promedio_generado?: PromedioGeneradoLote[];
}

/** Una nómina del tenant que cubre alguna fecha del viaje. */
export interface NominaDelCargue {
  id: number;
  etiqueta: string | null;
  inicio?: string;
  fin?: string;
  estado?: string;
  filas_liquidadas?: number;
  /** Las fechas del viaje que esa nómina cubre. */
  cubre?: string[];
  motivo?: 'CERRADA' | 'FILAS_LIQUIDADAS';
}

/**
 * Las nóminas que tocan al viaje. `abiertas` son las que bloquean el cargue
 * sin `forzar`; `liquidadas` solo avisan, porque lo ya pagado no cambia.
 */
export interface NominaDelViajeCargue {
  fechas: string[];
  abiertas: NominaDelCargue[];
  liquidadas: NominaDelCargue[];
}

// ─── Viaje y fila ────────────────────────────────────────────────────────────

export interface ViajeDelCargue {
  /** El consecutivo propio del cliente. Agrupa las filas y es la clave. */
  remision: string;
  /** Números de fila reales del archivo que forman este viaje. */
  filas: number[];
  estado: EstadoFilaViaje;
  /** `false` cuando ya existía un viaje con la misma clave de idempotencia. */
  nuevo: boolean;
  /** `true` si se omite completo porque ya se había cargado. */
  omitido: boolean;

  fecha_viaje: string | null;
  hora_salida: string | null;

  transportador: TransportadorDelCargue | null;
  /** El nombre que queda en el viaje: el del archivo si vino, si no el de la ficha. */
  conductor: string | null;
  /** Lo que decía la columna `conductor`, cuando difiere de la ficha. */
  conductor_archivo: string | null;
  extractora: ExtractoraDelCargue | null;

  peso_viaje: string | null;
  extractora_datos: DatosExtractoraDelCargue | null;
  observaciones: string | null;
  estado_final: EstadoFinalViaje;

  /** `null` en un viaje con error: no se llegó a calcular nada. */
  calculo: CalculoViajeCargue | null;
  nomina: NominaDelViajeCargue | null;

  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];

  /** Solo en el 201 de importar. */
  viaje_id?: number;
  estado_viaje?: 'CREADO' | 'EN_VALIDACION' | 'FINALIZADO';
  enlaces?: { detalle: string };
}

/** La cosecha de la fila, ya resuelta con su planilla y su cuadrilla. */
export interface CosechaDelCargue {
  id: number;
  resuelta_por: ResueltaPorCosecha;
  /** La etiqueta vigente de la lista, para contrastarla con lo escrito. */
  etiqueta?: string | null;
  referencia: string | null;
  operacion: { id: number; fecha: string; estado: string };
  lote: { id: number; nombre: string } | null;
  sublote: { id: number; nombre: string } | null;
  gajos_reportados: number | null;
  /** El reconteo que la cosecha ya tenía antes de este archivo. */
  gajos_reconteo_actual: number | null;
  peso_confirmado: string | null;
  colaboradores?: string[];
}

/**
 * El reconteo que quedaría en la cosecha tras el archivo.
 *
 * `gajos_restantes` llega `null` en la primera asignación: ahí no hay techo,
 * porque el reconteo del camión corrige hacia arriba lo que anotó la planilla.
 */
/**
 * En una fila con error el bloque llega a medias: el backend lo arma con lo
 * que alcanzó a resolver, así que cualquier número puede venir en null.
 */
export interface ReconteoDeLaFila {
  gajos_ya_asignados: number | null;
  gajos_restantes: number | null;
  exceso: number | null;
  nuevo_total: number | null;
  reconteo_aprobado: boolean;
}

export interface FilaViajeCargue {
  /** Número de fila real del archivo, no el índice del array. */
  fila: number;
  estado: EstadoFilaViaje;
  remision: string | null;
  /** Índice dentro de `viajes[]`, para enlazar la fila con su viaje. */
  viaje_indice: number | null;

  /** `null` en la fila del viaje sin cosechas y en la que no resolvió. */
  cosecha: CosechaDelCargue | null;
  /** Lo que el usuario escribió en la celda, tal cual. */
  cosecha_celda: string | null;
  /** `null` = toda la cosecha; el detalle queda con reconteo pendiente. */
  gajos_en_viaje: number | null;
  reconteo: ReconteoDeLaFila | null;

  omitida: boolean;
  errores: IncidenciaFila[];
  advertencias: IncidenciaFila[];

  /** Solo en el 201 de importar. */
  detalle_id?: number;
  promedio_aplicado?: string | null;
}

// ─── Respuesta ───────────────────────────────────────────────────────────────

export interface ResumenViajesCargue {
  filas: number;
  validas: number;
  con_error: number;
  viajes: {
    total: number;
    nuevos: number;
    ya_cargados: number;
    con_error: number;
    con_cosechas: number;
    sin_cosechas: number;
    homogeneos: number;
    sin_promedio: number;
  };
  detalles: number;
  cosechas: number;
  peso_total: string;
  gajos_total: number;
  /** Previstos en `validar`; los realmente creados en `importar`. */
  promedios_lote: number;
  transportadores: number;
  extractoras: number;
  advertencias: number;
  /** Solo en el 201. */
  insertados?: { viajes: number; detalles: number };
  omitidos_ya_cargados?: number;
}

/** Traza del archivo guardado. Solo viaja en el 201. */
export interface CargueViajes {
  archivo: string;
  nombre_original: string;
  cargado_por: number;
  cargado_at: string;
  estado_final: EstadoFinalViaje;
  forzado: boolean;
  filas: number;
  viajes_insertados: number;
  detalles_insertados: number;
  viajes_omitidos: number;
  promedios_lote_creados: number;
  /** Nóminas cuya validación de cosecha quedó sin confirmar por `forzar`. */
  validaciones_reiniciadas: number[];
}

export interface ResultadoImportacionViajes {
  tipo: 'VIAJES';
  estado_final: EstadoFinalViaje;
  archivo: ArchivoHistorico;
  resumen: ResumenViajesCargue;
  viajes: ViajeDelCargue[];
  filas: FilaViajeCargue[];
  /** Advertencias de todo el cargue, no de un viaje ni de una fila. */
  advertencias: IncidenciaFila[];
  /** Solo en el 201. */
  cargue?: CargueViajes;
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

function cuerpo(archivo: File, estadoFinal: EstadoFinalViaje, forzar?: boolean): FormData {
  const fd = new FormData();
  fd.append('archivo', archivo);
  fd.append('estado_final', estadoFinal);
  if (forzar) fd.append('forzar', '1');
  return fd;
}

export const importarViajesApi = {
  /**
   * §15 — Plantilla generada por finca: hoja Viajes con las 20 cabeceras, hoja
   * Catálogos con los camiones, las plantas y las cosechas por despachar de
   * esta finca, y listas desplegables en `placa`, `extractora` y `cosecha`.
   * El CSV solo trae los datos.
   */
  plantilla: (formato: FormatoPlantillaViajes = 'xlsx') =>
    apiClient.getBlob(`${BASE}/plantilla${formato === 'csv' ? '?formato=csv' : ''}`, T),

  /** §15 — Dry run: no persiste, no guarda el archivo, no audita. */
  validar: (archivo: File, estadoFinal: EstadoFinalViaje = 'FINALIZADO') =>
    apiClient.postForm<{ data: ResultadoImportacionViajes }>(
      `${BASE}/validar`,
      cuerpo(archivo, estadoFinal),
      T,
    ),

  /**
   * §15 — Todo o nada bajo el lock del tenant. Puede responder 409
   * `NOMINA_ABIERTA_EN_RANGO`, que no es un fallo del archivo: la única salida
   * es reintentar con `forzar`.
   */
  importar: (archivo: File, estadoFinal: EstadoFinalViaje = 'FINALIZADO', forzar = false) =>
    apiClient.postForm<{ message: string; data: ResultadoImportacionViajes }>(
      '/v1/tenant/viajes/importar',
      cuerpo(archivo, estadoFinal, forzar),
      T,
    ),
};

// ─── Códigos (§9 y §15) ──────────────────────────────────────────────────────

export const ImportarViajesErrorCodes = {
  /** No se pudo leer, faltan cabeceras obligatorias o se pasó del tope. */
  VIAJES_ARCHIVO_INVALIDO: 'VIAJES_ARCHIVO_INVALIDO',
  VIAJES_ARCHIVO_VACIO: 'VIAJES_ARCHIVO_VACIO',
  /** 422: alguna fila o viaje falló. `data` trae la misma tabla de `validar`. */
  VIAJES_ARCHIVO_CON_ERRORES: 'VIAJES_ARCHIVO_CON_ERRORES',
  /** 409: las fechas caen en una nómina sin cerrar. Solo queda forzar. */
  NOMINA_ABIERTA_EN_RANGO: 'NOMINA_ABIERTA_EN_RANGO',
  /**
   * 409 de carrera: otro proceso tomó la remisión o tocó la cosecha después
   * de validar. Hay que volver a validar.
   */
  REMISION_DUPLICADA: 'REMISION_DUPLICADA',
  COSECHA_YA_ASIGNADA: 'COSECHA_YA_ASIGNADA',
  GAJOS_INSUFICIENTES: 'GAJOS_INSUFICIENTES',
  GAJOS_EN_VIAJE_REQUERIDO_PARA_SPLIT: 'GAJOS_EN_VIAJE_REQUERIDO_PARA_SPLIT',
} as const;

/**
 * Errores de fila y de viaje. Cualquiera bloquea el archivo completo.
 * El backend manda su propio `mensaje`, más específico; esta tabla es el
 * respaldo cuando no llega.
 */
export const ERROR_VIAJE_LABEL: Record<string, string> = {
  // Remisión
  REMISION_REQUERIDA: 'Falta la remisión',
  REMISION_PATRON_SISTEMA: 'Esa remisión es el consecutivo del sistema: use la del cliente',
  REMISION_DUPLICADA: 'Ya existe un viaje con esa remisión',
  VIAJE_INCONSISTENTE_EN_EL_ARCHIVO: 'Dos filas del mismo viaje dicen cosas distintas',
  // Fechas y valores del viaje
  FECHA_INVALIDA: 'La fecha no se entiende',
  FECHA_FUTURA: 'La fecha es posterior a hoy',
  HORA_INVALIDA: 'La hora no se entiende',
  PESO_VIAJE_INVALIDO: 'El peso de báscula no es válido',
  PORCENTAJE_INVALIDO: 'El porcentaje tiene que ir entre 0 y 100',
  GAJOS_TOTAL_INVALIDO: 'El total de gajos no es válido',
  CAMPO_NO_APLICA: 'Esa columna no aplica a este viaje',
  TEXTO_INVALIDO: 'El texto se pasa del máximo',
  VIAJE_INCOMPLETO: 'Un viaje con cosechas necesita el peso de báscula para cerrarse',
  // Camión
  PLACA_REQUERIDA: 'Falta la placa',
  TRANSPORTADOR_NO_ENCONTRADO: 'Ese camión no está en Configuración',
  PLACA_AMBIGUA: 'Dos camiones con esa misma placa',
  TRANSPORTADOR_AMBIGUO: 'Dos conductores con ese mismo nombre',
  // Planta
  EXTRACTORA_REQUERIDA: 'Falta la extractora',
  EXTRACTORA_NO_ENCONTRADA: 'Esa planta no está en Configuración',
  EXTRACTORA_AMBIGUA: 'Hay varias plantas con ese nombre',
  // Cosecha
  FILA_SIN_COSECHA_EN_VIAJE_CON_COSECHAS: 'Elija la cosecha o borre la fila',
  COSECHA_REQUERIDA: 'Falta la cosecha',
  COSECHA_ID_INVALIDO: 'El id de la cosecha no es válido',
  COSECHA_NO_ENCONTRADA: 'Esa cosecha no existe en la finca',
  COSECHA_AMBIGUA: 'Ese tiquete está en más de una cosecha: escriba el id',
  OPERACION_NO_APROBADA: 'La planilla de esa cosecha sigue en borrador: apruébela',
  FECHA_VIAJE_ANTERIOR_A_COSECHA: 'El viaje es anterior a la cosecha que transporta',
  COSECHA_REPETIDA_EN_VIAJE: 'La misma cosecha dos veces en el viaje: sume los gajos',
  // Gajos
  GAJOS_EN_VIAJE_INVALIDOS: 'Los gajos del camión no son válidos',
  COSECHA_YA_ASIGNADA: 'Otro viaje ya se llevó esa cosecha completa',
  GAJOS_EN_VIAJE_REQUERIDO_PARA_SPLIT: 'Esa cosecha ya viaja en otro camión: ponga los gajos',
  GAJOS_INSUFICIENTES: 'Los gajos se pasan de lo que queda por enviar',
};

/** Advertencias de fila y de viaje. Cargan bien y quedan guardadas. */
export const ADVERTENCIA_VIAJE_LABEL: Record<string, string> = {
  // Catálogo
  TRANSPORTADOR_INACTIVO: 'El camión está retirado',
  EXTRACTORA_INACTIVA: 'La planta está inactiva',
  NOMBRE_DIFIERE_DEL_CATALOGO: 'El nombre no coincide con el catálogo',
  CONDUCTOR_DIFIERE_DEL_TRANSPORTADOR: 'El conductor del archivo no es el de la ficha',
  // Remisión
  REMISION_COINCIDE_CON_RANGO: 'La remisión choca con un rango de numeración activo',
  REMISION_SIMILAR: 'Ya hay una remisión igual con otras mayúsculas',
  LLEGADA_ANTERIOR_A_SALIDA: 'La llegada es anterior a la salida',
  // Gajos y reconteo
  GAJOS_NO_ESPECIFICADOS: 'Sin gajos: se lleva toda la cosecha y el reconteo queda pendiente',
  RECONTEO_SUPERA_PLANILLA: 'Se contaron más gajos de los que anotó la planilla',
  SOBRECONTEO_TOLERADO: 'Hay gajos de más, dentro de la tolerancia',
  RECONTEO_DIFIERE_DE_PLANILLA: 'El reconteo no cuadra con la planilla: la nómina paga el reconteo',
  COSECHA_YA_EN_OTROS_VIAJES: 'Esa cosecha ya viaja en otros camiones',
  COSECHA_CON_PESO_CONFIRMADO: 'La cosecha ya tiene kilos: la báscula no reparte peso a su cuadrilla',
  // Promedios
  VIAJE_SIN_PROMEDIO: 'Este viaje cierra sin sembrar promedio kg/gajo',
  SIN_PROMEDIO_PARA_LOTE: 'Ese lote no tiene promedio del año: el detalle queda sin aporte',
  PROMEDIO_FUERA_DE_RANGO: 'El promedio previsto es absurdo: revise el peso y los gajos',
  // Nómina
  NOMINA_ABIERTA_EN_FECHA: 'Una nómina sin cerrar cubre esa fecha',
  NOMINA_LIQUIDADA_EN_FECHA: 'Una nómina que ya liquidó cubre esa fecha',
  NOMINA_ABIERTA_EN_RANGO: 'Hay una nómina sin cerrar sobre estas fechas',
  NOMINA_LIQUIDADA_EN_RANGO: 'Hay nóminas que ya liquidaron sobre estas fechas',
  NOMINA_ABIERTA_PROXIMA: 'Una nómina abierta empieza poco después de estas fechas',
  VALIDACION_COSECHA_REINICIADA: 'Hay que volver a confirmar Validar Cosecha antes de cerrar',
  // Cargue
  YA_CARGADO: 'Ese viaje ya se había cargado: se omite',
  ESTADO_FINAL_CREADO: 'Los viajes quedan en reconteo, sin promedio',
  VIAJES_YA_CARGADOS: 'Algunos viajes ya estaban cargados y se omiten',
  VIAJES_SIN_COSECHAS: 'Hay viajes sin cosechas: cierran sin promedio',
  VIAJES_SIN_PROMEDIO: 'Hay viajes que cierran sin sembrar promedio',
  COSECHAS_EN_MAS_DE_UN_VIAJE: 'Hay cosechas repartidas entre varios camiones',
};
