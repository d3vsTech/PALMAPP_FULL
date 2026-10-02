/**
 * Novedades ya vigentes dentro del wizard de planilla (API_OPERACIONES §1.1).
 *
 * Hermano de `vacacionesPlanilla`, con otra regla: las vacaciones solo
 * advierten, porque se pueden interrumpir y la persona pudo haber trabajado.
 * Una novedad vigente sí bloquea registrar otra novedad el mismo día: el
 * backend responde 422 `NOVEDAD_SOLAPADA` y guardar sería imposible.
 *
 * `novedades_vigentes` llega con las novedades que cruzan la fecha pedida, así
 * que aquí solo se filtra por rango para los casos en que el usuario cambió la
 * fecha del paso 1 y la lista todavía es la anterior.
 */
import type { NovedadVigente } from '../../../../api/operaciones';
import type { ColaboradorWizard, NovedadEnPlanilla } from './tipos';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-01-05" → "05-ene". Corta el ISO a mano: no hay zona horaria en juego. */
function diaMes(iso: string): string {
  const partes = String(iso).slice(0, 10).split('-');
  if (partes.length !== 3) return String(iso);
  const mes = MESES[Number(partes[1]) - 1];
  return mes ? `${partes[2]}-${mes}` : String(iso);
}

/** "Incapacidad EPS del 05-ene al 22-ene (Pendiente)". */
export function etiquetaNovedad(n: NovedadEnPlanilla): string {
  const rango = n.fechaInicio === n.fechaFin
    ? `el ${diaMes(n.fechaInicio)}`
    : `del ${diaMes(n.fechaInicio)} al ${diaMes(n.fechaFin)}`;
  const cola = n.horario ? ` ${n.horario}` : '';
  return `${n.tipo} ${rango}${cola}`;
}

function aLocal(n: NovedadVigente): NovedadEnPlanilla {
  return {
    fuente: n.fuente,
    tipo: n.tipo?.nombre ?? n.categoria ?? 'Novedad',
    estado: n.estado,
    fechaInicio: String(n.fecha_inicio).slice(0, 10),
    fechaFin: String(n.fecha_fin ?? n.fecha_inicio).slice(0, 10),
    parcial: !!n.parcial,
    horario: n.horario ?? null,
    deEstaPlanilla: !!n.de_esta_planilla,
  };
}

/**
 * Marca a quien ya tenga una novedad que cubra la fecha de la planilla.
 * Devuelve la misma referencia cuando no hay nada que marcar, para no
 * invalidar los memos de los tabs.
 *
 * Se ignoran las PARCIALES (horas sueltas, el día sigue trabajado), las
 * RECHAZADAS y las que registró esta misma planilla.
 */
export function marcarNovedades(
  colaboradores: ColaboradorWizard[],
  novedades: NovedadVigente[],
  fecha: string,
): ColaboradorWizard[] {
  if (novedades.length === 0 || !fecha) return colaboradores;

  const porEmpleado = new Map<string, NovedadEnPlanilla>();
  novedades.forEach((n) => {
    if (n.parcial || n.estado === 'RECHAZADA' || n.de_esta_planilla) return;
    const inicio = String(n.fecha_inicio).slice(0, 10);
    const fin = String(n.fecha_fin ?? n.fecha_inicio).slice(0, 10);
    // Fechas YYYY-MM-DD: comparar strings basta y evita lios de zona horaria.
    if (fecha >= inicio && fecha <= fin) {
      porEmpleado.set(String(n.empleado_id), aLocal(n));
    }
  });
  if (porEmpleado.size === 0) return colaboradores;

  return colaboradores.map((c) => {
    const nov = porEmpleado.get(c.id);
    return nov ? { ...c, novedadVigente: nov } : c;
  });
}
