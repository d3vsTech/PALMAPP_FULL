/**
 * Formato de pesos colombianos (COP).
 *
 * Convención: punto como separador de miles, sin decimales por defecto.
 *   1750905   →  "1.750.905"        (formatThousands)
 *   1750905   →  "$1.750.905"       (formatCOP)
 *   "1.750.905" → 1750905           (parseCOP)
 */

/** Formatea un número con puntos de miles. Sin símbolo. */
export function formatThousands(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\./g, ''));
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num);
}

/** Formatea como peso colombiano para display. Prefijo `$`, sin decimales. */
export function formatCOP(value: number | string | null | undefined): string {
  const t = formatThousands(value);
  return t ? `$${t}` : '';
}

/** Quita los puntos y devuelve el número limpio como string (para enviar al backend o a Number()). */
export function parseCOP(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).replace(/\./g, '').replace(/[^\d]/g, '');
}
