/**
 * Recortes y limpieza de los textos del análisis.
 *
 * Las descripciones vienen largas, de varias frases, y salpicadas con nombres
 * de campos de la base (`total_ausencias=0`). Eso es depuración, no es para
 * quien administra la finca, así que se quita antes de mostrarlo.
 */

/** Hasta dónde se deja crecer la primera frase antes de recortarla. */
const LARGO_MAXIMO = 130;

/**
 * Paréntesis que solo contienen pares campo=valor, con el campo en
 * snake_case: `(n_registros_evaluados=0)`, `(total_ausencias=0, horas=2)`.
 * Un paréntesis normal como "(326 días)" no tiene `=` y se respeta.
 */
const PARENTESIS_TECNICO =
  /\s*\(\s*[a-z][a-z0-9]*(?:_[a-z0-9]+)+\s*=\s*[^(),]*(?:,\s*[a-z][a-z0-9]*(?:_[a-z0-9]+)*\s*=\s*[^(),]*)*\s*\)/gi;

/** El mismo par pero suelto en la frase, sin paréntesis. */
const CAMPO_SUELTO = /\s*\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\s*=\s*[^\s,.;)]+/gi;

/** Quita la jerga de base de datos y deja la puntuación en su sitio. */
export function sinJerga(texto: string | null | undefined): string {
  return (texto ?? '')
    .replace(PARENTESIS_TECNICO, '')
    .replace(CAMPO_SUELTO, '')
    // Un paréntesis que quedó vacío al sacar su contenido.
    .replace(/\s*\(\s*\)/g, '')
    // Un slug suelto que quedó de nombre de columna: sobre_maduro.
    .replace(/[a-z]+(?:_[a-z0-9]+)+/g, (palabra) => palabra.replace(/_/g, ' '))
    // El espacio que quedó colgando antes de un signo.
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * La primera frase del texto, ya limpio. Si pasa del largo máximo, se corta
 * en la última palabra que quepa y se cierra con puntos suspensivos.
 */
export function primeraFrase(texto: string | null | undefined, largo = LARGO_MAXIMO): string {
  const limpio = sinJerga(texto);
  if (!limpio) return '';

  // Un punto seguido de espacio cierra frase. Los decimales y las siglas con
  // punto no llevan espacio detrás, así que no parten el texto.
  const corte = limpio.search(/\.\s/);
  const frase = corte > 0 ? limpio.slice(0, corte + 1) : limpio;

  if (frase.length <= largo) return frase;

  const recorte = frase.slice(0, largo);
  const ultimoEspacio = recorte.lastIndexOf(' ');
  return `${(ultimoEspacio > 40 ? recorte.slice(0, ultimoEspacio) : recorte).trimEnd()}…`;
}
