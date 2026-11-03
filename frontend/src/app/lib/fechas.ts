// Fechas de PalmApp. Una fecha sin hora (aaaa-mm-dd) es un día del calendario de la finca, no un instante.

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte a Date respetando el día escrito: '2024-01-15' es el 15 de enero en la hora local.
 * `new Date('2024-01-15')` lo toma en hora universal y en Colombia se ve como el 14.
 * Los valores con hora y los que ya son Date se convierten igual que con `new Date`.
 */
export function fechaLocal(valor: string | number | Date): Date {
  if (typeof valor === 'string') {
    const m = SOLO_FECHA.exec(valor);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(valor);
}

/** El día local de una fecha como aaaa-mm-dd. A diferencia de `toISOString`, no adelanta el día en la noche. */
export function fechaISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
