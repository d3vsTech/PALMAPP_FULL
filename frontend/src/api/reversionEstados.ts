/**
 * API — Reversión de estados: desaprobar planilla y reabrir viaje
 * Contrato: docs/API_OPERACIONES.md §7.3 y docs/API_VIAJES.md §5.10 (2026-10-12).
 * Plan y decisiones: docs/PLAN_REVERSION_ESTADOS.md
 *
 * Hasta ahora una planilla APROBADA y un viaje FINALIZADO eran callejones sin
 * salida: un error detectado después obligaba a borrar y rehacer, y borrar
 * también estaba bloqueado. Estos cuatro endpoints son la única vuelta atrás.
 *
 * Tres cosas que la pantalla no debe saltarse:
 *
 *  1. Llamar `verificar` **antes** de abrir el diálogo. Trae los bloqueos con
 *     su mensaje y los efectos previstos, así el botón se deshabilita con el
 *     motivo a la vista en lugar de descubrirlo con un 409.
 *
 *  2. La guarda de nómina **no tiene `forzar`**. Si una nómina que cubre la
 *     fecha ya liquidó —cerrada, o abierta con una sola fila liquidada— no hay
 *     manera de revertir. No ofrecer un "continuar de todas formas" que no
 *     existe.
 *
 *  3. Las dos acciones se encadenan. Para desaprobar una planilla cuyas
 *     cosechas van en un camión finalizado: reabrir el viaje, quitar la
 *     cosecha del viaje, y recién ahí desaprobar.
 */
import { apiClient } from './client';

const BASE = '/v1/tenant';
const T = true; // requiresTenant

/** Mínimo y máximo del `motivo`, iguales en los dos endpoints. */
export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 500;

// ─── Piezas comunes ──────────────────────────────────────────────────────────

/**
 * Una nómina que cubre la fecha afectada.
 *
 * `motivo` dice por qué bloquea: `CERRADA` es definitivo, `FILAS_LIQUIDADAS`
 * se puede resolver si esas filas vuelven a PENDIENTE desde su módulo.
 */
export interface NominaQueCubre {
  id: number;
  etiqueta: string | null;
  inicio: string;
  fin: string;
  estado: 'BORRADOR' | 'EN_PROGRESO' | 'CERRADA';
  filas_liquidadas: number;
  motivo?: 'CERRADA' | 'FILAS_LIQUIDADAS';
  /** Las fechas afectadas que esta nómina cubre. */
  cubre: string[];
}

/** El viaje que retiene una cosecha de la planilla (§7.3). */
export interface ViajeQueRetiene {
  id: number;
  remision: string;
  estado: 'CREADO' | 'EN_VALIDACION' | 'FINALIZADO';
  cosechas: number[];
}

/**
 * Un impedimento. `message` ya viene redactado por el backend con los nombres
 * y las fechas del caso, así que la pantalla lo muestra tal cual.
 */
export interface BloqueoReversion {
  code: string;
  message: string;
  nominas?: NominaQueCubre[];
  fechas?: string[];
  viajes?: ViajeQueRetiene[];
}

/** Aviso que no impide la acción, pero conviene leer antes de confirmar. */
export interface AvisoReversion {
  code: string;
  mensaje?: string;
  message?: string;
  nominas?: NominaQueCubre[] | number[];
  detalle?: Record<string, unknown>;
}

// ─── Desaprobar planilla (§7.3) ──────────────────────────────────────────────

export interface EfectosDesaprobar {
  horas_extra_a_pendiente: number;
  ausencias_a_pendiente: number;
  validaciones_cosecha_a_reiniciar: number[];
}

export interface VerificacionDesaprobar {
  permitido: boolean;
  bloqueos: BloqueoReversion[];
  advertencias: AvisoReversion[];
  efectos_previstos: EfectosDesaprobar;
}

export interface RespuestaDesaprobar {
  message: string;
  data: {
    id: number;
    fecha: string;
    estado: 'BORRADOR';
    aprobado_por: null;
    aprobado_at: null;
  };
  /** Cuántas horas extra y ausencias volvieron a PENDIENTE. */
  reversion_cascada: { horas_extra: number; ausencias: number };
  advertencias: AvisoReversion[];
}

// ─── Reabrir viaje (§5.10) ───────────────────────────────────────────────────

export interface EfectosReabrir {
  /** `fecha_viaje` más la fecha de cada cosecha transportada. */
  fechas_evaluadas: string[];
  promedios_lote_a_eliminar: number;
  detalles_a_reiniciar: number;
  cosechas_con_promedio_a_restaurar: number[];
  cosechas_a_recalcular: number[];
  validaciones_cosecha_a_reiniciar: number[];
}

export interface VerificacionReabrir {
  permitido: boolean;
  bloqueos: BloqueoReversion[];
  advertencias: AvisoReversion[];
  efectos_previstos: EfectosReabrir;
}

/** De dónde salió el promedio que se le devolvió a cada cosecha. */
export type OrigenPromedioRestaurado = 'OTRO_VIAJE' | 'BASELINE' | 'NINGUNO';

export interface RespuestaReabrir {
  message: string;
  data: { id: number; remision: string; estado: 'CREADO' } & Record<string, unknown>;
  efectos: {
    promedios_lote_eliminados: number;
    detalles_reiniciados: number;
    promedio_restaurado: Array<{
      cosecha_id: number;
      antes: string | null;
      despues: string | null;
      origen: OrigenPromedioRestaurado;
    }>;
    cosechas_recalculadas: number[];
  };
  advertencias: AvisoReversion[];
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

export const reversionApi = {
  planilla: {
    /** §7.3 — Las mismas guardas que el POST, sin efectos. */
    verificar: (operacionId: number) =>
      apiClient.get<{ data: VerificacionDesaprobar }>(
        `${BASE}/operaciones/${operacionId}/desaprobar/verificar`, T),

    /** §7.3 — APROBADA → BORRADOR. `motivo` de 5 a 500 caracteres. */
    desaprobar: (operacionId: number, motivo: string) =>
      apiClient.post<RespuestaDesaprobar>(
        `${BASE}/operaciones/${operacionId}/desaprobar`, { motivo }, T),
  },

  viaje: {
    /** §5.10 — Idem para el viaje. */
    verificar: (viajeId: number) =>
      apiClient.get<{ data: VerificacionReabrir }>(
        `${BASE}/viajes/${viajeId}/reabrir/verificar`, T),

    /** §5.10 — FINALIZADO → CREADO, conservando los datos de extractora. */
    reabrir: (viajeId: number, motivo: string) =>
      apiClient.post<RespuestaReabrir>(
        `${BASE}/viajes/${viajeId}/reabrir`, { motivo }, T),
  },
};

// ─── Códigos ─────────────────────────────────────────────────────────────────

export const ReversionErrorCodes = {
  /** La planilla no está APROBADA. */
  OPERACION_NO_APROBADA: 'OPERACION_NO_APROBADA',
  /** Una cosecha de la planilla va en un viaje activo. Trae `viajes[]`. */
  COSECHA_EN_VIAJE: 'COSECHA_EN_VIAJE',
  /** Una nómina que cubre la fecha ya liquidó. Sin salida: no hay `forzar`. */
  OPERACION_EN_NOMINA_LIQUIDADA: 'OPERACION_EN_NOMINA_LIQUIDADA',
  /** El viaje no está FINALIZADO. */
  VIAJE_ESTADO_INVALIDO: 'VIAJE_ESTADO_INVALIDO',
  /** Idem sobre `fecha_viaje` o la fecha de alguna cosecha transportada. */
  VIAJE_EN_NOMINA_LIQUIDADA: 'VIAJE_EN_NOMINA_LIQUIDADA',
} as const;

/** Títulos cortos para los avisos. El texto largo lo manda el backend. */
export const AVISO_REVERSION_LABEL: Record<string, string> = {
  NOMINA_ABIERTA_EN_FECHA: 'Hay una nómina abierta sobre esa fecha',
  NOVEDADES_LIQUIDADAS_CONSERVADAS: 'Algunas novedades ya liquidadas se conservan',
  VALIDACION_COSECHA_REINICIADA: 'Habrá que volver a validar la cosecha',
  DESPRENDIBLE_NO_DISPONIBLE: 'El desprendible deja de estar disponible',
};
