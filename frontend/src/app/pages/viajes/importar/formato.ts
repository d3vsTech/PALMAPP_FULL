/**
 * Cómo se pintan los números del cargue de viajes.
 *
 * Vive aparte porque el backend omite o deja en null partes enteras de una
 * fila con error: el reconteo llega sin total, el cálculo sin gajos. La
 * pantalla tiene que poder pintar esa fila, que es justo donde el usuario va a
 * leer qué le faltó; si revienta, el error del archivo se vuelve un error de
 * la aplicación y la validación no le sirve de nada.
 */

/** Un entero con punto de miles, o una raya si no hay número que pintar. */
export function miles(valor: number | string | null | undefined): string {
  const n = numero(valor);
  return n === null ? '—' : n.toLocaleString('es-CO');
}

/** Kilos con dos decimales, como los manda el backend en texto. */
export function kg(valor: number | string | null | undefined): string {
  const n = numero(valor);
  return n === null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`;
}

function numero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}
