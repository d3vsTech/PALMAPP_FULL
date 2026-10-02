/**
 * API — Novedades (API_NOVEDADES.md v1.5, PR-N1..N7, 2026-10-01)
 * Base: /api/v1/tenant/novedades
 *
 * Novedades no es una tabla: `GET novedades` es la unión de tres fuentes que
 * siguen siendo dueñas de su dato. Las ausencias se registran aquí; las
 * vacaciones nacen como **solicitud** que Liquidaciones aprueba liquidándola
 * (§5); las terminaciones usan el mismo servicio de retiro que la ficha del
 * colaborador (§6).
 *
 * Lo que el front no debe asumir:
 *
 *  1. **El catálogo de motivos es por finca.** Sale de `GET novedades/init`,
 *     no de una constante: cada tenant puede tener motivos propios y todos
 *     heredan su pestaña del `tipo_base`.
 *  2. **Una novedad con horario es parcial**: un solo día, `dias_calendario: 0`
 *     e informativa. No cuenta en nómina ni cubre el día en la planilla.
 *  3. **Las vacaciones y las terminaciones no son motivos de ausencia.** No
 *     salen en `categorias[].motivos[]` y tienen sus propios endpoints.
 */
import { apiClient } from './client';
import type { ArchivoHistorico } from './historicoComun';

const BASE = '/v1/tenant/novedades';
const T = true; // requiresTenant

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Arma el multipart solo con los campos presentes (§4.1, §5.1, §6.1). */
function toFormData(payload: object): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null || v === '') continue;
    fd.append(k, v instanceof File ? v : String(v));
  }
  return fd;
}

// ─── Dominio ─────────────────────────────────────────────────────────────────

/** Las cinco pestañas del Paso 1 (§1). Se derivan del `tipo_base`. */
export type CategoriaNovedad =
  | 'PERMISOS_LICENCIAS'
  | 'INCAPACIDADES'
  | 'AUSENCIAS_SANCIONES'
  | 'VACACIONES'
  | 'TERMINACION_CONTRATO';

/** Qué tabla es dueña de la fila (§2). */
export type FuenteNovedad = 'AUSENCIA' | 'VACACION' | 'TERMINACION';

/**
 * Los 11 tipos de `motivos_ausencia`. VACACIONES y las terminaciones NO están
 * aquí: son otras fuentes con sus propios endpoints.
 */
export type TipoBaseAusencia =
  | 'INCAPACIDAD_EPS'
  | 'INCAPACIDAD_ARL'
  | 'LICENCIA_MATERNIDAD'
  | 'LICENCIA_PATERNIDAD'
  | 'LICENCIA_LUTO'
  | 'PERMISO_REMUNERADO'
  | 'PERMISO_NO_REMUNERADO'
  | 'AUSENCIA_INJUSTIFICADA'
  | 'CALAMIDAD_DOMESTICA'
  | 'SUSPENSION_DISCIPLINARIA'
  | 'OTRO';

export type EstadoAusencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'LIQUIDADA';
export type EstadoVacacionNovedad = 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'RECHAZADA';
export type EstadoTerminacion = 'PROGRAMADA' | 'EFECTIVA' | 'LIQUIDADA';

/** `PLANILLA` conserva `operacion_id`; `NOVEDADES` e `IMPORTACION` no (§1). */
export type OrigenAusencia = 'PLANILLA' | 'NOVEDADES' | 'IMPORTACION';
export type OrigenNovedad =
  | OrigenAusencia
  | 'SISTEMA' | 'HISTORICO' | 'LIQUIDACION_FINAL'
  | 'CONTRATO' | 'FICHA';

export interface EmpleadoNovedadRef {
  id: number;
  nombre_completo: string;
  documento: string;
  /** La ficha está eliminada: la historia se conserva igual. */
  eliminado?: boolean;
  cargo?: string | null;
  modalidad_pago?: string;
}

export interface TipoNovedadRef {
  /** `tipo_base`, `VACACIONES` o código de `MotivosRetiro` según la fuente. */
  codigo: string;
  nombre: string;
  color: string | null;
  motivo_ausencia_id: number | null;
}

export interface EnlacesNovedad {
  detalle: string | null;
  colaborador: string;
  operacion: string | null;
  liquidacion?: string | null;
}

/** Fila del listado unificado (§2). */
export interface NovedadFila {
  fuente: FuenteNovedad;
  id: number;
  empleado: EmpleadoNovedadRef;
  categoria: CategoriaNovedad;
  tipo: TipoNovedadRef;
  fecha_inicio: string;
  fecha_fin: string;
  /** Ausencia: `dias_calendario`. Vacación: hábiles. Terminación: `null`. */
  dias: number | null;
  dias_calendario: number | null;
  parcial: boolean;
  /** `"07:00-09:30"` cuando es parcial. */
  horario: string | null;
  estado: EstadoAusencia | EstadoVacacionNovedad | EstadoTerminacion;
  origen: OrigenNovedad;
  tiene_soporte: boolean;
  contrato_id?: number | null;
  liquidacion_id?: number | null;
  reingreso?: boolean;
  enlaces: EnlacesNovedad;
}

export interface TotalesNovedades extends Partial<Record<CategoriaNovedad, number>> {
  total: number;
}

export interface MetaNovedades {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  totales?: TotalesNovedades;
}

export interface FiltrosNovedades {
  q?: string;
  empleado_id?: number;
  categoria?: CategoriaNovedad;
  /** Id de motivo, `tipo_base`, `VACACIONES` o código de `MotivosRetiro`. */
  tipo?: string | number;
  fuente?: FuenteNovedad;
  estado?: string;
  origen?: OrigenNovedad;
  /** Solape con el rango de la fila, no igualdad. */
  desde?: string;
  hasta?: string;
  per_page?: number;
  page?: number;
  /** `1` para que `meta.totales` traiga el conteo por categoría. */
  con_totales?: 1;
}

// ─── Bundle del wizard (§3) ──────────────────────────────────────────────────

export interface MotivoNovedad {
  id: number;
  nombre: string;
  tipo_base: TipoBaseAusencia;
  /** Columna REMUNERADO del Paso 1. */
  es_remunerada: boolean;
  /** Columna % REMUNERACIÓN. Llega como texto: `"66.67"`. */
  porcentaje_pago_default: string;
  /** Columna AFECTA SUBSIDIO DE TRANSPORTE (PR-N6). */
  afecta_auxilio_transporte: boolean;
  afecta_nomina: boolean;
  /** Solo advierte al registrar, nunca bloquea (decisión 12). */
  requiere_soporte: boolean;
  color: string;
  condicion: string | null;
  norma_legal: string | null;
}

export interface MotivoRetiro {
  codigo: string;
  etiqueta: string;
  indemniza: boolean;
  norma: string | null;
}

export interface CategoriaInit {
  codigo: CategoriaNovedad;
  etiqueta: string;
  fuente: FuenteNovedad;
  orden: number;
  /** Color de la pestaña cuando no hay motivos que lo aporten. */
  color: string | null;
  motivos: MotivoNovedad[];
  /** Solo en TERMINACION_CONTRATO. */
  motivos_retiro?: MotivoRetiro[];
}

export interface PermisosNovedades {
  puede_aprobar: boolean;
  puede_importar: boolean;
  puede_liquidar_vacaciones: boolean;
  puede_liquidar_final: boolean;
}

export interface InitNovedades {
  categorias: CategoriaInit[];
  parametros: {
    liq_vacaciones_sabado_habil: boolean;
    dias_vacaciones_anuales: number;
    soporte: { mimes: string[]; max_kb: number };
  };
  permisos: PermisosNovedades;
  /**
   * Con qué estado nacerán las ausencias de este usuario (D5). La UI debe
   * avisarlo antes de confirmar.
   */
  estado_inicial_ausencias: 'APROBADA' | 'PENDIENTE';
}

// ─── Ausencias (§4) ──────────────────────────────────────────────────────────

export interface AdvertenciaNovedad {
  code: string;
  mensaje: string;
  [extra: string]: unknown;
}

export interface DocumentoNovedad {
  id: number;
  nombre_archivo: string;
  mime_type: string;
  archivo_tamano: number;
  previsualizable: boolean;
  enlaces: { descargar: string; visualizar: string; expediente: string };
}

/** Qué se puede tocar en el estado actual (§4.2). La UI pinta el form con esto. */
export interface EditableAusencia {
  campos: string[];
  motivo_bloqueo: null | 'ESTADO_APROBADA' | 'ESTADO_LIQUIDADA' | 'RECHAZADA';
  puede_eliminar: boolean;
  /** Nóminas CERRADAS que cruzan el rango: sus días no se agregan ni se quitan. */
  nominas_cerradas: Array<{ id: number; etiqueta: string; inicio: string; fin: string }>;
}

export interface AusenciaDetalle {
  id: number;
  operacion_id: number | null;
  empleado_id: number;
  motivo_ausencia_id: number;
  origen: OrigenAusencia;
  tipo: TipoBaseAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  /** `HH:MM` o `null`. Con horas la novedad es parcial. */
  hora_inicio: string | null;
  hora_fin: string | null;
  /** 0 cuando es parcial. */
  dias_calendario: number;
  es_remunerada: boolean;
  afecta_nomina: boolean;
  porcentaje_pago: string;
  afecta_auxilio_transporte: boolean;
  entidad: string | null;
  numero_radicado: string | null;
  /** El backend guarda la observación en la columna `motivo`. */
  motivo: string | null;
  observacion: string | null;
  estado: EstadoAusencia;
  aprobado_at: string | null;
  aprobado_por_id: number | null;
  creado_por_id: number | null;
  nomina_id: number | null;
  categoria: CategoriaNovedad;
  parcial: boolean;
  horario: string | null;
  empleado: EmpleadoNovedadRef;
  motivo_ausencia: MotivoNovedad;
  operacion: Record<string, unknown> | null;
  nomina: Record<string, unknown> | null;
  aprobado_por: { id: number; name: string } | null;
  creado_por: { id: number; name: string } | null;
  documento: DocumentoNovedad | null;
  editable: EditableAusencia;
  enlaces: EnlacesNovedad & { nomina: string | null };
}

export interface CrearAusenciaPayload {
  empleado_id: number;
  motivo_ausencia_id: number;
  fecha_inicio: string;
  /** Default: `fecha_inicio`. */
  fecha_fin?: string;
  /** `HH:MM`. Las dos o ninguna, y entonces es de un solo día. */
  hora_inicio?: string;
  hora_fin?: string;
  entidad?: string;
  numero_radicado?: string;
  porcentaje_pago?: number;
  observacion?: string;
  documento?: File;
}

export type EditarAusenciaPayload = Partial<CrearAusenciaPayload>;

export interface RespuestaAusencia {
  message: string;
  data: AusenciaDetalle;
  advertencias: AdvertenciaNovedad[];
}

// ─── Solicitud de vacaciones (§5) ────────────────────────────────────────────

export interface CrearSolicitudVacacionesPayload {
  empleado_id: number;
  /** Debe ser hoy o futura y día hábil. */
  fecha_inicio: string;
  /** Exactamente uno de los dos. */
  dias_habiles?: number;
  fecha_fin?: string;
  observacion?: string;
  /** Carta de solicitud. */
  documento?: File;
}

export interface RespuestaSolicitudVacaciones {
  message: string;
  /** El mismo mapa de `GET liquidaciones/vacaciones/{id}` más `solicitud{}`. */
  data: Record<string, unknown> & { id: number; estado: string; es_solicitud?: boolean };
  enlaces: { detalle: string; liquidar: string; rechazar: string };
  advertencias: AdvertenciaNovedad[];
}

// ─── Terminación de contrato (§6) ────────────────────────────────────────────

export interface CrearTerminacionPayload {
  empleado_id: number;
  fecha_retiro: string;
  /** Código de `MotivosRetiro`, no la etiqueta. */
  motivo: string;
  observaciones?: string;
  /** Carta o acta. Solo PDF. */
  soporte?: File;
}

export interface TerminacionData {
  empleado: EmpleadoNovedadRef & {
    fecha_ingreso: string | null;
    fecha_retiro: string | null;
    motivo_retiro: string | null;
    estado: boolean;
  };
  contrato: {
    id: number;
    fecha_inicio: string;
    fecha_terminacion: string;
    motivo_terminacion: string;
    observacion_terminacion: string | null;
    tipo_contrato: string;
    fecha_fin_pactada: string | null;
    salario: number;
    estado_contrato: string;
  } | null;
  terminacion: {
    fecha_retiro: string;
    motivo: MotivoRetiro;
    observaciones: string | null;
    estado: EstadoTerminacion;
    /** La ficha quedó inactiva. Con fecha futura es `false`. */
    ficha_inactivada: boolean;
    reingreso: boolean;
    /** La fecha del contrato sigue siendo la de la ficha. */
    coincide_con_ficha: boolean;
  };
  documento: Record<string, unknown> | null;
  liquidacion: { id: number; numero_comprobante: string; estado: string; fecha_retiro: string } | null;
}

export interface RespuestaTerminacion {
  message: string;
  data: TerminacionData;
  enlaces: {
    detalle: string | null;
    colaborador: string;
    liquidacion_final: string;
    liquidacion: string | null;
    corregir: string;
  };
  advertencias: AdvertenciaNovedad[];
}

// ─── Importación masiva (§8) ─────────────────────────────────────────────────

export type FormatoPlantillaNovedades = 'xlsx' | 'csv';

export interface FilaImportacionNovedad {
  /** Número de fila real del archivo, no del índice. */
  fila: number;
  estado: 'OK' | 'ERROR';
  documento: string | null;
  empleado: (EmpleadoNovedadRef & { fecha_ingreso: string | null; fecha_retiro: string | null; estado: boolean }) | null;
  novedad: {
    tipo_novedad: string | null;
    motivo_ausencia_id: number | null;
    motivo: MotivoNovedad | null;
    /** Cómo se cruzó el tipo escrito en el archivo. */
    resuelto_por: 'NOMBRE' | 'TIPO_BASE' | null;
    categoria: CategoriaNovedad | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    dias_calendario: number | null;
    parcial: boolean;
    hora_inicio: string | null;
    hora_fin: string | null;
    horario: string | null;
    entidad: string | null;
    numero_radicado: string | null;
    observacion: string | null;
    estado_inicial: 'APROBADA' | 'PENDIENTE';
    /** Solo en el 201 de importar. */
    estado?: EstadoAusencia;
  };
  errores: AdvertenciaNovedad[];
  advertencias: AdvertenciaNovedad[];
  /** Solo en el 201 de importar. */
  ausencia_id?: number;
  enlaces?: { detalle: string };
}

export interface ResultadoImportacionNovedades {
  /**
   * Cómo se leyó el archivo. Es la misma forma que los cargues históricos de
   * liquidaciones, para poder reutilizar sus piezas de UI.
   */
  archivo: ArchivoHistorico;
  estado_inicial: 'APROBADA' | 'PENDIENTE';
  puede_aprobar: boolean;
  resumen: {
    filas: number;
    validas: number;
    con_error: number;
    colaboradores: number;
    parciales: number;
    dias_calendario: number;
    por_categoria: Partial<Record<CategoriaNovedad, number>>;
    advertencias: number;
    /** Solo en el 201. */
    insertadas?: number;
  };
  filas: FilaImportacionNovedad[];
  advertencias: AdvertenciaNovedad[];
  /** Solo en el 201. */
  cargue?: Record<string, unknown>;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const novedadesApi = {
  /** §2 — Listado unificado de las tres fuentes. */
  listar: (filtros?: FiltrosNovedades) =>
    apiClient.get<{ data: NovedadFila[]; meta: MetaNovedades }>(
      `${BASE}${toQuery(filtros as Record<string, unknown>)}`, T),

  /** §3 — Catálogo del Paso 1. Es por finca: no se cachea entre tenants. */
  init: () => apiClient.get<InitNovedades>(`${BASE}/init`, T),

  ausencias: {
    /** §4.1 — `fecha_inicio` libre, sin planilla de por medio. */
    crear: (payload: CrearAusenciaPayload) =>
      payload.documento
        ? apiClient.postForm<RespuestaAusencia>(`${BASE}/ausencias`, toFormData(payload), T)
        : apiClient.post<RespuestaAusencia>(`${BASE}/ausencias`, payload, T),

    /** §4.2 — Trae `editable{}` para saber qué campos habilitar. */
    ver: (id: number) => apiClient.get<{ data: AusenciaDetalle }>(`${BASE}/ausencias/${id}`, T),

    /**
     * §4.3 — Matriz de mutabilidad por estado. Una APROBADA solo acepta fechas,
     * entidad, radicado, observación y soporte, y ningún día que entre o salga
     * puede caer en una nómina cerrada.
     */
    editar: (id: number, payload: EditarAusenciaPayload) =>
      payload.documento
        ? apiClient.postForm<RespuestaAusencia>(
            `${BASE}/ausencias/${id}`, toFormData({ ...payload, _method: 'PUT' }), T)
        : apiClient.put<RespuestaAusencia>(`${BASE}/ausencias/${id}`, payload, T),

    /** §4.4 — No una LIQUIDADA, ni una APROBADA con días en nómina cerrada. */
    eliminar: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/ausencias/${id}`, T),

    /** §4.5 — Solo desde PENDIENTE. */
    aprobar: (id: number) =>
      apiClient.post<RespuestaAusencia>(`${BASE}/ausencias/${id}/aprobar`, {}, T),
    rechazar: (id: number, motivo_rechazo: string) =>
      apiClient.post<{ message: string; data: AusenciaDetalle }>(
        `${BASE}/ausencias/${id}/rechazar`, { motivo_rechazo }, T),

    /** §4.6 — Se puede adjuntar en cualquier estado. Reemplaza el anterior. */
    subirDocumento: (id: number, documento: File) => {
      const fd = new FormData();
      fd.append('documento', documento);
      return apiClient.postForm<RespuestaAusencia>(`${BASE}/ausencias/${id}/documento`, fd, T);
    },
    descargarDocumento: (id: number, inline = false) =>
      apiClient.getBlob(`${BASE}/ausencias/${id}/documento${inline ? '?inline=1' : ''}`, T),
  },

  vacaciones: {
    /**
     * §5.1 — Crea una solicitud PENDIENTE, no una liquidación. Reserva el rango
     * sin consumir saldo. El saldo insuficiente solo advierte.
     */
    solicitar: (payload: CrearSolicitudVacacionesPayload) =>
      payload.documento
        ? apiClient.postForm<RespuestaSolicitudVacaciones>(
            `${BASE}/vacaciones`, toFormData(payload), T)
        : apiClient.post<RespuestaSolicitudVacaciones>(`${BASE}/vacaciones`, payload, T),

    /** §5.2 — Solo mientras está PENDIENTE. Lo que no viene se conserva. */
    editar: (id: number, payload: Partial<CrearSolicitudVacacionesPayload>) =>
      payload.documento
        ? apiClient.postForm<RespuestaSolicitudVacaciones>(
            `${BASE}/vacaciones/${id}`, toFormData({ ...payload, _method: 'PUT' }), T)
        : apiClient.put<RespuestaSolicitudVacaciones>(`${BASE}/vacaciones/${id}`, payload, T),

    /** §5.3 — Deja la fila CANCELADA y libera el rango. No hay DELETE. */
    rechazar: (id: number, motivo: string) =>
      apiClient.post<{ message: string; data: Record<string, unknown> }>(
        `${BASE}/vacaciones/${id}/rechazar`, { motivo }, T),
  },

  terminaciones: {
    /** §6.1 — Registra el retiro. No liquida: devuelve el enlace a la final. */
    crear: (payload: CrearTerminacionPayload) =>
      payload.soporte
        ? apiClient.postForm<RespuestaTerminacion>(
            `${BASE}/terminaciones`, toFormData(payload), T)
        : apiClient.post<RespuestaTerminacion>(`${BASE}/terminaciones`, payload, T),

    /** §6.2 — Por id de CONTRATO, no de colaborador. */
    ver: (contratoId: number) =>
      apiClient.get<{ data: TerminacionData; enlaces: RespuestaTerminacion['enlaces'] }>(
        `${BASE}/terminaciones/${contratoId}`, T),
  },

  importar: {
    plantilla: (formato: FormatoPlantillaNovedades = 'xlsx') =>
      apiClient.getBlob(`${BASE}/importar/plantilla${formato === 'csv' ? '?formato=csv' : ''}`, T),

    /** §8 — Dry run: no persiste nada ni guarda el archivo. */
    validar: (archivo: File) => {
      const fd = new FormData();
      fd.append('archivo', archivo);
      return apiClient.postForm<{ data: ResultadoImportacionNovedades }>(
        `${BASE}/importar/validar`, fd, T);
    },

    /** §8 — Todo o nada: una fila con error responde 422 y no inserta nada. */
    confirmar: (archivo: File) => {
      const fd = new FormData();
      fd.append('archivo', archivo);
      return apiClient.postForm<{ message: string; data: ResultadoImportacionNovedades }>(
        `${BASE}/importar`, fd, T);
    },
  },
};

// ─── Códigos (§0) ────────────────────────────────────────────────────────────

export const NovedadesErrorCodes = {
  NOVEDAD_NO_ENCONTRADA: 'NOVEDAD_NO_ENCONTRADA',
  EMPLEADO_NO_ENCONTRADO: 'EMPLEADO_NO_ENCONTRADO',
  DOCUMENTO_NO_ENCONTRADO: 'DOCUMENTO_NO_ENCONTRADO',
  OPERACION_NO_ENCONTRADA: 'OPERACION_NO_ENCONTRADA',
  OPERACION_APROBADA: 'OPERACION_APROBADA',
  AUSENCIA_ESTADO_INVALIDO: 'AUSENCIA_ESTADO_INVALIDO',
  AUSENCIA_LIQUIDADA: 'AUSENCIA_LIQUIDADA',
  NOVEDAD_CAMPO_NO_EDITABLE: 'NOVEDAD_CAMPO_NO_EDITABLE',
  NOVEDAD_EN_NOMINA_CERRADA: 'NOVEDAD_EN_NOMINA_CERRADA',
  MIME_NOT_PREVIEWABLE: 'MIME_NOT_PREVIEWABLE',
  /** El colaborador ya tiene otra novedad de día completo que cruza el rango. */
  NOVEDAD_SOLAPADA: 'NOVEDAD_SOLAPADA',
  RANGO_INVALIDO: 'RANGO_INVALIDO',
  HORARIO_INVALIDO: 'HORARIO_INVALIDO',
  MOTIVO_INACTIVO: 'MOTIVO_INACTIVO',
  COLABORADOR_SIN_CONTRATO_VIGENTE: 'COLABORADOR_SIN_CONTRATO_VIGENTE',
  // Solicitud de vacaciones (§5)
  VACACION_NO_ENCONTRADA: 'VACACION_NO_ENCONTRADA',
  VACACION_SOLICITUD_NO_PENDIENTE: 'VACACION_SOLICITUD_NO_PENDIENTE',
  VACACIONES_SOLAPADAS: 'VACACIONES_SOLAPADAS',
  VACACION_EN_NOMINA_CERRADA: 'VACACION_EN_NOMINA_CERRADA',
  VACACIONES_DIAS_INVALIDOS: 'VACACIONES_DIAS_INVALIDOS',
  VACACIONES_SOLICITUD_RETROACTIVA: 'VACACIONES_SOLICITUD_RETROACTIVA',
  VACACIONES_INICIO_NO_HABIL: 'VACACIONES_INICIO_NO_HABIL',
  EMPLEADO_NO_ELEGIBLE: 'EMPLEADO_NO_ELEGIBLE',
  VACACIONES_FUERA_DE_CONTRATO: 'VACACIONES_FUERA_DE_CONTRATO',
  VACACIONES_CON_AUSENCIA_EN_RANGO: 'VACACIONES_CON_AUSENCIA_EN_RANGO',
  CONFIG_LEGAL_INCOMPLETA: 'CONFIG_LEGAL_INCOMPLETA',
  // Terminación (§6)
  TERMINACION_NO_ENCONTRADA: 'TERMINACION_NO_ENCONTRADA',
  COLABORADOR_YA_RETIRADO: 'COLABORADOR_YA_RETIRADO',
  VACACION_POSTERIOR_AL_RETIRO: 'VACACION_POSTERIOR_AL_RETIRO',
  VACACION_SOLICITUD_PENDIENTE: 'VACACION_SOLICITUD_PENDIENTE',
  MOTIVO_RETIRO_INVALIDO: 'MOTIVO_RETIRO_INVALIDO',
  FECHA_RETIRO_INVALIDA: 'FECHA_RETIRO_INVALIDA',
  NOVEDAD_POSTERIOR_AL_RETIRO: 'NOVEDAD_POSTERIOR_AL_RETIRO',
  // Importación (§8)
  NOVEDADES_ARCHIVO_INVALIDO: 'NOVEDADES_ARCHIVO_INVALIDO',
  NOVEDADES_ARCHIVO_VACIO: 'NOVEDADES_ARCHIVO_VACIO',
  NOVEDADES_ARCHIVO_CON_ERRORES: 'NOVEDADES_ARCHIVO_CON_ERRORES',
} as const;

/** Advertencias: informan, nunca bloquean. */
export const ADVERTENCIA_NOVEDAD_LABEL: Record<string, string> = {
  SOPORTE_REQUERIDO: 'El motivo pide soporte. Adjúntelo después desde el detalle.',
  DIAS_EN_NOMINA_CERRADA: 'Hay días dentro de nóminas ya cerradas, que no se recalculan.',
  NOVEDAD_FUTURA: 'La novedad empieza en una fecha futura.',
  TRABAJO_REGISTRADO_EN_EL_RANGO: 'El colaborador tiene jornal o cuadrilla en esas fechas.',
  VACACIONES_SALDO_INSUFICIENTE: 'El saldo de vacaciones no alcanza. Se exigirá al liquidar.',
  VACACIONES_FECHA_FIN_AJUSTADA: 'La fecha fin se movió al último día hábil contado.',
  AUSENCIAS_PENDIENTES_EN_RANGO: 'Hay ausencias sin aprobar dentro del rango.',
  VACACIONES_SIN_AVISO_15_DIAS: 'Se avisa con menos de 15 días de anticipación.',
  VACACIONES_DISFRUTE_MENOR_6_DIAS: 'El disfrute continuo es menor a 6 días hábiles.',
  CALENDARIO_FESTIVOS_AUSENTE: 'Falta el calendario de festivos de ese año.',
  RETIRO_FUTURO: 'La fecha de retiro es futura: la ficha se apaga ese día.',
  /** §6.1 — Solicitud anterior al retiro: la liquidación final la bloqueará. */
  VACACION_SOLICITUD_PENDIENTE: 'Hay una solicitud de vacaciones sin resolver. La liquidación final la va a bloquear.',
  VACACIONES_PENDIENTES_DE_PAGO: 'Hay vacaciones aprobadas sin pagar.',
  NOVEDAD_PENDIENTE_POSTERIOR_AL_RETIRO: 'Hay novedades sin aprobar después del retiro.',
  NOMINA_POSTERIOR_AL_RETIRO: 'Hay nóminas cerradas con días después del retiro.',
  NOMINA_BORRADOR_REQUIERE_RELIQUIDAR: 'Hay una nómina en borrador que toca reliquidar.',
  LIQUIDACION_EN_CURSO: 'Ya hay una liquidación final en borrador para este colaborador.',
};

/** Errores por fila de la importación (§8). */
export const ERROR_FILA_NOVEDAD_LABEL: Record<string, string> = {
  DOCUMENTO_REQUERIDO: 'Falta la cédula',
  DOCUMENTO_INVALIDO: 'La cédula no es legible. Guarde el archivo con valores, no fórmulas.',
  EMPLEADO_NO_ENCONTRADO: 'No hay un colaborador con esa cédula en la finca',
  EMPLEADO_ELIMINADO: 'La ficha del colaborador está eliminada',
  DOCUMENTO_AMBIGUO: 'Dos fichas vivas con la misma cédula',
  MOTIVO_REQUERIDO: 'Falta el tipo de novedad',
  MOTIVO_NO_ENCONTRADO: 'Ese tipo de novedad no existe en la finca',
  MOTIVO_AMBIGUO: 'El tipo tiene varios motivos activos. Escriba el nombre exacto.',
  MOTIVO_INACTIVO: 'El motivo está inactivo',
  FECHA_INVALIDA: 'La fecha no se puede interpretar',
  RANGO_INVALIDO: 'La fecha fin es anterior a la de inicio',
  HORARIO_INVALIDO: 'El horario no es válido. Van las dos horas y de un solo día.',
  TEXTO_INVALIDO: 'El texto supera el máximo de la columna',
  SIN_VINCULO_EN_EL_RANGO: 'El colaborador no tenía contrato en esos días',
  NOVEDAD_SOLAPADA: 'Ya hay una novedad registrada que cruza esas fechas',
  RANGO_SOLAPADO_EN_ARCHIVO: 'Dos filas del archivo se cruzan en fechas',
};
