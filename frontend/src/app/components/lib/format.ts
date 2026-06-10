/**
 * Formato de pesos colombianos (COP).
 *
 * Convención: punto como separador de miles, sin decimales por defecto.
 *   1750905     →  "1.750.905"        (formatThousands)
 *   1750905     →  "$1.750.905"       (formatCOP)
 *   "1.750.905" →  "1750905"          (parseCOP)
 *
 * El backend Laravel devuelve decimales como string ("200.00", "450.50").
 * Por eso `formatThousands` distingue entre:
 *   - "200.00"      → decimal del API → parseFloat → 200
 *   - "1.750.905"   → formato CO con miles → strip dots → 1750905
 */

/** Heurística: ¿el string parece un decimal del API ("200.00", "1750.5")? */
function pareceDecimalApi(str: string): boolean {
  // Un único punto, seguido por 1-2 dígitos hasta el final. Los formatos CO
  // de miles tienen 3 dígitos en cada grupo (".905", ".000", etc.).
  return /^-?\d+\.\d{1,2}$/.test(str);
}

/** Formatea un número con puntos de miles. Sin símbolo. */
export function formatThousands(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    const str = String(value).trim();
    if (pareceDecimalApi(str)) {
      num = parseFloat(str);
    } else {
      // Asumimos formato CO con separadores de miles: strip dots y caracteres no numéricos.
      num = Number(str.replace(/\./g, '').replace(/[^\d-]/g, ''));
    }
  }
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num);
}

/** Formatea como peso colombiano para display. Prefijo `$`, sin decimales. */
export function formatCOP(value: number | string | null | undefined): string {
  const t = formatThousands(value);
  return t ? `$${t}` : '';
}

/** Quita los puntos de miles y devuelve el número limpio como string. Si el
 *  input es un decimal del API ("200.50"), trunca y devuelve la parte entera. */
export function parseCOP(text: string | null | undefined): string {
  if (!text) return '';
  const str = String(text).trim();
  if (pareceDecimalApi(str)) {
    return String(Math.trunc(parseFloat(str)));
  }
  return str.replace(/\./g, '').replace(/[^\d]/g, '');
}
