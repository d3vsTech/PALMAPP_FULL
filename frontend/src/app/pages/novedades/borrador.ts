/**
 * Estado del wizard y sus reglas de validación.
 *
 * Las cinco pestañas comparten un solo borrador pero confirman contra tres
 * endpoints distintos (API_NOVEDADES §4, §5 y §6), así que lo que se exige
 * depende de la categoría elegida en el Paso 1.
 */
import type { CategoriaNovedad, MotivoNovedad } from '../../../api/novedades';
import { hoyIso } from './tipos';

export interface BorradorNovedad {
  categoria: CategoriaNovedad | null;
  /** Solo en las tres pestañas de ausencias. Sale de `init`. */
  motivo: MotivoNovedad | null;
  /** Solo en Terminación: código del catálogo `MotivosRetiro`. */
  motivoRetiro: string;
  colaboradorId: number | null;
  colaboradorNombre: string;
  fechaInicio: string;
  fechaFin: string;
  /** `HH:mm`. Las dos o ninguna: la novedad pasa a ser parcial. */
  horaInicio: string;
  horaFin: string;
  /** Solo en Vacaciones: alternativa a `fechaFin`. */
  diasHabiles: string;
  /**
   * Solo en Vacaciones: cuál de los dos campos escribió el usuario.
   *
   * El otro se rellena con el calendario del backend para que se vea hasta
   * dónde llega el disfrute, pero **no viaja en el payload**: §5.1 exige
   * exactamente uno y mandar los dos responde 422 `VACACIONES_DIAS_INVALIDOS`.
   */
  campoVacaciones: 'DIAS' | 'FECHA' | null;
  entidad: string;
  numeroRadicado: string;
  observacion: string;
  documento: File | null;
}

export const BORRADOR_VACIO: BorradorNovedad = {
  categoria: null,
  motivo: null,
  motivoRetiro: '',
  colaboradorId: null,
  colaboradorNombre: '',
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  diasHabiles: '',
  campoVacaciones: null,
  entidad: '',
  numeroRadicado: '',
  observacion: '',
  documento: null,
};

export const TOTAL_PASOS = 3;

export function esVacaciones(b: BorradorNovedad): boolean {
  return b.categoria === 'VACACIONES';
}

export function esTerminacion(b: BorradorNovedad): boolean {
  return b.categoria === 'TERMINACION_CONTRATO';
}

/** Las tres pestañas que escriben en `ausencias`. */
export function esAusencia(b: BorradorNovedad): boolean {
  return b.categoria !== null && !esVacaciones(b) && !esTerminacion(b);
}

/**
 * Valida un paso del wizard.
 * @returns El mensaje a mostrar, o `null` si el paso está completo.
 */
export function validarPaso(paso: number, b: BorradorNovedad): string | null {
  if (paso === 1) {
    if (!b.categoria) return 'Selecciona un tipo de novedad';
    if (esAusencia(b) && !b.motivo) return 'Selecciona un tipo de novedad';
    return null;
  }

  if (paso !== 2) return null;

  if (!b.colaboradorId) return 'Selecciona un colaborador';

  if (esTerminacion(b)) {
    if (!b.fechaInicio) return 'Ingresa la fecha de retiro';
    if (!b.motivoRetiro) return 'Selecciona la causa de terminación';
    return null;
  }

  if (!b.fechaInicio) return 'Ingresa la fecha de inicio';

  if (esVacaciones(b)) {
    // §5.1: la solicitud no puede ser retroactiva, y va fecha fin o días, no ambos.
    if (b.fechaInicio < hoyIso()) {
      return 'La solicitud no puede empezar antes de hoy. Un disfrute ya ocurrido se registra desde Liquidaciones.';
    }
    // Los dos campos se ven llenos (uno lo calcula el calendario), así que
    // lo que se valida es el que el usuario escribió.
    if (!b.campoVacaciones) return 'Indica los días hábiles o la fecha fin';
    if (b.campoVacaciones === 'DIAS') {
      if (b.diasHabiles.trim() === '') return 'Indica los días hábiles';
      const n = Number(b.diasHabiles);
      if (!Number.isInteger(n) || n < 1 || n > 60) return 'Los días hábiles van de 1 a 60';
    } else {
      if (b.fechaFin.trim() === '') return 'Indica la fecha fin';
      if (b.fechaFin < b.fechaInicio) return 'La fecha fin debe ser posterior a la de inicio';
    }
    return null;
  }

  // Ausencias: el rango es opcional (un día) y el horario va completo o vacío.
  if (b.fechaFin && b.fechaFin < b.fechaInicio) {
    return 'La fecha fin debe ser posterior a la de inicio';
  }
  const horas = [b.horaInicio, b.horaFin].filter(Boolean).length;
  if (horas === 1) return 'El horario necesita hora de inicio y de fin, o ninguna';
  if (horas === 2) {
    if (b.horaFin <= b.horaInicio) return 'La hora de fin debe ser posterior a la de inicio';
    // §4.1: una novedad con horario es de un solo día.
    if (b.fechaFin && b.fechaFin !== b.fechaInicio) {
      return 'Una novedad con horario es de un solo día: quita la fecha fin';
    }
  }
  return null;
}

/** La novedad es informativa: no cuenta como día de ausencia (D3). */
export function esParcial(b: BorradorNovedad): boolean {
  return !!b.horaInicio && !!b.horaFin;
}
