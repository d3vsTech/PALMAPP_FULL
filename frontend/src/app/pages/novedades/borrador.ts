/**
 * Estado del formulario de registro y sus reglas de validación.
 *
 * Vive aparte de las pantallas para que las reglas se lean de un tirón y
 * puedan probarse sin montar el wizard.
 */
import { TIPOS_NOVEDAD, esTerminacion, type TipoNovedad } from './tipos';

export interface BorradorNovedad {
  tipo: TipoNovedad | null;
  colaboradorId: string;
  /** ISO `YYYY-MM-DD`. En terminaciones es la fecha efectiva. */
  fechaInicio: string;
  fechaFin: string;
  /** `HH:mm`. Solo para los tipos con `requiereHoras`. */
  horaInicio: string;
  horaFin: string;
  adjunto: File | null;
  observaciones: string;
  radicado: string;
  diagnostico: string;
  causaTerminacion: string;
}

export const BORRADOR_VACIO: BorradorNovedad = {
  tipo: null,
  colaboradorId: '',
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  adjunto: null,
  observaciones: '',
  radicado: '',
  diagnostico: '',
  causaTerminacion: '',
};

export const TOTAL_PASOS = 3;

/**
 * Valida un paso del wizard.
 * @returns El mensaje a mostrar, o `null` si el paso está completo.
 */
export function validarPaso(paso: number, borrador: BorradorNovedad): string | null {
  if (paso === 1) {
    return borrador.tipo ? null : 'Selecciona un tipo de novedad';
  }

  if (paso === 2) {
    if (!borrador.colaboradorId) return 'Selecciona un colaborador';
    if (!borrador.fechaInicio)   return 'Ingresa la fecha de inicio';

    // Renuncia y finalización no llevan rango: se registran con una sola fecha.
    if (!esTerminacion(borrador.tipo)) {
      if (!borrador.fechaFin) return 'Ingresa la fecha de fin';
      if (borrador.fechaFin < borrador.fechaInicio) {
        return 'La fecha fin debe ser posterior a la fecha inicio';
      }
    }

    const requiereHoras = borrador.tipo ? TIPOS_NOVEDAD[borrador.tipo].requiereHoras : false;
    if (requiereHoras && !borrador.horaInicio) return 'Ingresa la hora de inicio';
    if (requiereHoras && !borrador.horaFin)    return 'Ingresa la hora de fin';
  }

  return null;
}
