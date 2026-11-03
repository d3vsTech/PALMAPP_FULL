// Formato de cifras de PalmApp: siempre en es-CO.

const nf = (opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat('es-CO', opts);

/** 1234567 -> "1.234.567" */
export const num = (n: number, decimales = 0) =>
  nf({ minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);

/** 1234567 -> "$1.234.567" */
export const cop = (n: number) => `$${num(Math.round(n))}`;

/**
 * Pesos abreviados para indicadores: 33150000 -> "$33,2 M"; 850000 -> "$850 mil".
 * Debajo de mil muestra la cifra completa.
 */
export function copCompacto(n: number, decimales = 1): string {
  const signo = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${signo}$${num(v / 1_000_000_000, decimales)} mil M`;
  if (v >= 1_000_000) return `${signo}$${num(v / 1_000_000, decimales)} M`;
  if (v >= 1_000) return `${signo}$${num(Math.round(v / 1_000))} mil`;
  return `${signo}$${num(v)}`;
}

/** Cantidades grandes sin moneda: 135000 -> "135 mil"; 2400000 -> "2,4 M". */
export function compacto(n: number, decimales = 1): string {
  const v = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (v >= 1_000_000) return `${signo}${num(v / 1_000_000, decimales)} M`;
  if (v >= 10_000) return `${signo}${num(Math.round(v / 1_000))} mil`;
  return `${signo}${num(v)}`;
}
