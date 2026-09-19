/**
 * Vacaciones dentro del wizard de planilla (API_OPERACIONES §1.1).
 *
 * El backend no impide registrarle jornal a alguien de vacaciones: lo paga y
 * lo advierte despues, al liquidar la nomina. El freno vive aqui.
 *
 * `en_vacaciones` llega con vacaciones recientes y futuras, asi que una fila
 * solo aplica si la fecha de la planilla cae dentro de su rango.
 */
import type { ColaboradorEnVacaciones } from '../../../../api/operaciones';
import type { ColaboradorWizard, VacacionEnPlanilla } from './tipos';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-01-05" → "05-ene". Corta el ISO a mano: no hay zona horaria en juego. */
function diaMes(iso: string): string {
  const partes = String(iso).slice(0, 10).split('-');
  if (partes.length !== 3) return String(iso);
  const mes = MESES[Number(partes[1]) - 1];
  return mes ? `${partes[2]}-${mes}` : String(iso);
}

/** "De vacaciones del 05-ene al 22-ene (VAC-1)". */
export function etiquetaVacaciones(v: VacacionEnPlanilla): string {
  return `De vacaciones del ${diaMes(v.fechaInicio)} al ${diaMes(v.fechaFin)} (${v.comprobante})`;
}

/**
 * Marca en la lista de personas a quien tenga vacaciones que cubran la fecha
 * de la planilla. Devuelve la misma referencia cuando no hay nada que marcar,
 * para no invalidar los memos de los tabs.
 *
 * Solo aplica a colaboradores propios: `en_vacaciones` viene por
 * `empleado_id` y los operarios de tercero usan ids con prefijo `O_`.
 */
export function marcarVacaciones(
  colaboradores: ColaboradorWizard[],
  enVacaciones: ColaboradorEnVacaciones[],
  fecha: string,
): ColaboradorWizard[] {
  if (enVacaciones.length === 0 || !fecha) return colaboradores;

  const porEmpleado = new Map<string, VacacionEnPlanilla>();
  enVacaciones.forEach((v) => {
    // Fechas YYYY-MM-DD: comparar strings basta y evita lios de zona horaria.
    if (fecha >= v.fecha_inicio && fecha <= v.fecha_fin) {
      porEmpleado.set(String(v.empleado_id), {
        comprobante: v.numero_comprobante,
        fechaInicio: v.fecha_inicio,
        fechaFin: v.fecha_fin,
      });
    }
  });
  if (porEmpleado.size === 0) return colaboradores;

  return colaboradores.map((c) => {
    const vac = porEmpleado.get(c.id);
    return vac ? { ...c, enVacaciones: vac } : c;
  });
}
