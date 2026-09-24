/**
 * Quién puede aparecer en la planilla de un día (API_OPERACIONES §1.1).
 *
 * Antes el selector solo miraba `empleados.estado`, así que salía el retirado
 * al que nadie le apagó el interruptor, y salía en la planilla del día 3 quien
 * entra el 8. Ahora manda la fecha del contrato.
 *
 * El filtro vive en el navegador y no en el servidor a propósito: el catálogo
 * del wizard se cachea 15 minutos sin fecha, y en modo creación se pide antes
 * de que el usuario elija el día en el paso 1. Es el mismo trato que reciben
 * las vacaciones en `vacacionesPlanilla`.
 *
 * Tres reglas que no son evidentes y que vienen del contrato:
 *
 *  - `estado_contrato` no participa. Un contrato TERMINADO el 15 de marzo sí
 *    cubre la planilla del 10 de marzo, y una planilla histórica puede caer
 *    dentro de un contrato viejo.
 *  - `fecha_fin_pactada` tampoco. El término fijo vencido sin preaviso se
 *    prorroga solo (CST art. 46), así que no termina nada.
 *  - Sin contratos registrados no se filtra a nadie. Una finca que nunca
 *    cargó contratos no puede quedarse sin colaboradores en la planilla.
 */
import type { ColaboradorWizard } from './tipos';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-01-05" → "5 de ene". Corta el ISO a mano: no hay zona horaria en juego. */
function diaMes(iso: string): string {
  const partes = String(iso).slice(0, 10).split('-');
  if (partes.length !== 3) return String(iso);
  const mes = MESES[Number(partes[1]) - 1];
  return mes ? `${Number(partes[2])} de ${mes}` : String(iso);
}

/**
 * La regla del §1.1, tal cual.
 *
 * Las fechas son `YYYY-MM-DD`: compararlas como texto da el mismo resultado
 * que compararlas como fechas y evita los líos de zona horaria.
 */
export function disponibleEn(c: ColaboradorWizard, fecha: string): boolean {
  // Los operarios de tercero no tienen contrato propio: su empleador es el
  // contratista. El backend tampoco los valida.
  if (c.terceroNombre) return true;

  const ventanas = c.vinculacion ?? [];
  if (ventanas.length === 0) return true;

  return ventanas.some((v) => v.desde <= fecha && (v.hasta == null || v.hasta >= fecha));
}

/** Por qué alguien no aparece, en una línea que el usuario entiende. */
export function motivoNoDisponible(c: ColaboradorWizard, fecha: string): string {
  if (c.fechaRetiro && fecha > c.fechaRetiro) {
    return `Se retiró el ${diaMes(c.fechaRetiro)}`;
  }

  const ventanas = c.vinculacion ?? [];
  const primera = ventanas[0];
  if (primera && primera.desde > fecha) {
    return `Ingresó el ${diaMes(primera.desde)}`;
  }

  const ultima = ventanas[ventanas.length - 1];
  if (ultima?.hasta && ultima.hasta < fecha) {
    return `Su contrato terminó el ${diaMes(ultima.hasta)}`;
  }

  return 'Sin contrato vigente ese día';
}

export interface ColaboradorExcluido {
  id: string;
  nombre: string;
  motivo: string;
}

export interface ResultadoVinculacion {
  /** La lista completa, con los no vinculados marcados. */
  colaboradores: ColaboradorWizard[];
  excluidos: ColaboradorExcluido[];
}

/**
 * Marca a quien no tenía contrato el día de la planilla. No los saca de la
 * lista: los marca.
 *
 * La diferencia importa. Las tarjetas ya guardadas resuelven el nombre de cada
 * persona buscándola en esta misma lista, así que sacarla hace desaparecer en
 * silencio a un miembro de una cuadrilla guardada. Pasa de verdad: se registra
 * la planilla, después alguien captura el retiro, y al reabrirla el retirado ya
 * no cumple la regla. Marcado, sigue visible y se puede quitar; filtrado,
 * simplemente deja de existir y la tarjeta miente sobre quién trabajó.
 *
 * De ocultarlo en los selectores se encargan ellos, que sí saben qué está ya
 * seleccionado y no se puede esconder.
 *
 * Sin fecha todavía elegida no se marca nada: en modo creación el bundle llega
 * antes del paso 1.
 */
export function marcarVinculacion(
  colaboradores: ColaboradorWizard[],
  fecha: string,
): ResultadoVinculacion {
  if (!fecha) return { colaboradores, excluidos: [] };

  const excluidos: ColaboradorExcluido[] = [];
  const marcados = colaboradores.map((c) => {
    if (disponibleEn(c, fecha)) return c;
    const motivo = motivoNoDisponible(c, fecha);
    excluidos.push({ id: c.id, nombre: `${c.nombres} ${c.apellidos}`.trim(), motivo });
    return { ...c, noVinculado: { motivo } };
  });

  // Nadie quedó fuera: se devuelve la misma referencia para no invalidar los
  // memos de los seis tabs que cuelgan de esta lista.
  return excluidos.length === 0
    ? { colaboradores, excluidos }
    : { colaboradores: marcados, excluidos };
}

/**
 * Qué se le ofrece al usuario en un selector.
 *
 * Los no vinculados se esconden, salvo los que ya están escogidos en una
 * tarjeta guardada: esos tienen que seguir a la vista para poder quitarlos.
 * Es la misma excepción que aplica el bloqueo por vacaciones.
 */
export function opcionesSeleccionables(
  colaboradores: ColaboradorWizard[],
  yaSeleccionados: Iterable<string> = [],
): ColaboradorWizard[] {
  const escogidos = new Set(yaSeleccionados);
  return colaboradores.filter((c) => !c.noVinculado || escogidos.has(c.id));
}
