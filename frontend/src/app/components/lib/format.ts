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

// ─── Helpers PARA INPUTS QUE PERMITEN DECIMALES ──────────────────────────────
// Usan `,` (coma) como separador decimal (convención es-CO) y `.` como
// separador de miles al mostrar. Aceptan ambos al escribir.

/**
 * Formatea un número/string para mostrarse en un input decimal (es-CO).
 * Preserva hasta `maxDecimals` decimales sin recortarlos.
 *
 *   1750.5     → "1.750,5"
 *   "200.00"   → "200"     (el trailing .00 no aporta)
 *   "1,5"      → "1,5"
 *   "1.750,5"  → "1.750,5" (mantiene tal cual mientras se está escribiendo)
 *
 * Para uso en inputs "en vivo": si el texto termina en `,` o tiene ceros
 * finales tras el separador (`"1,50"`), preserva esa forma mientras el
 * usuario escribe (para no borrar dígitos al vuelo).
 */
export function formatDecimal(
  value: number | string | null | undefined,
  maxDecimals = 3,
): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).trim().replace(/\s/g, '');
  // Si viene ya con coma decimal (es-CO), mantener el formato mientras se escribe.
  if (str.includes(',')) {
    const [ent, dec = ''] = str.split(',');
    const entNum = Number(ent.replace(/\./g, '').replace(/[^\d-]/g, ''));
    const entFmt = Number.isFinite(entNum)
      ? new Intl.NumberFormat('es-CO').format(entNum)
      : '0';
    const decLimpio = dec.replace(/[^\d]/g, '').slice(0, maxDecimals);
    return `${entFmt},${decLimpio}`;
  }
  // Sin coma: puede ser número puro o decimal del API con punto ("200.00").
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (pareceDecimalApi(str)) {
    num = parseFloat(str);
  } else {
    num = Number(str.replace(/\./g, '').replace(/[^\d-]/g, ''));
  }
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

/**
 * Filtra caracteres para input decimal live: solo permite dígitos, coma,
 * punto y guión al inicio. Convierte punto tipeado a coma (para navegadores
 * que remapean automaticamente segun locale). NO agrega separadores de miles
 * — así preserva EXACTAMENTE lo que el usuario está tipeando sin ambiguedad.
 *
 * Usar en onChange; el formateo bonito con separadores va en onBlur via
 * `formatDecimal`.
 */
export function sanitizeDecimalInput(text: string): string {
  if (!text) return '';
  // Permitimos: dígitos, punto, coma y guión.
  let s = String(text).replace(/[^\d.,-]/g, '');
  // Guión solo al inicio.
  const negativo = s.startsWith('-');
  s = s.replace(/-/g, '');
  // Convertimos puntos a comas para unificar (usuarios que tipean `.` como
  // decimal separator). Después colapsamos comas múltiples a la primera.
  s = s.replace(/\./g, ',');
  const idxComa = s.indexOf(',');
  if (idxComa >= 0) {
    // Quitamos comas subsecuentes.
    s = s.slice(0, idxComa + 1) + s.slice(idxComa + 1).replace(/,/g, '');
  }
  return (negativo ? '-' : '') + s;
}

/**
 * Formatea el input en vivo (usar en onChange) preservando lo que el usuario
 * tipea Y agregando separadores de miles. Heurística:
 *  - Coma presente → coma es decimal, puntos son miles (formato es-CO).
 *  - Múltiples puntos → todos son miles.
 *  - Un solo punto:
 *      • integer="0" o vacío → decimal (ej "0.125" o ".5")
 *      • 0-2 dígitos después → decimal (ej "45.9", "45.99", "45.")
 *      • 3+ dígitos después → miles (ej "1.750", "45.988" de auto-formateo)
 *
 * Preserva coma final ("45," → "45,") para permitir seguir tipeando decimales.
 * Trunca decimales a `maxDecimals` (default 3).
 */
export function formatDecimalLive(text: string, maxDecimals = 3): string {
  if (!text) return '';
  const raw = String(text).replace(/[^\d.,\-]/g, '');
  const negativo = raw.startsWith('-');
  const sinSigno = negativo ? raw.slice(1) : raw;
  if (!sinSigno) return negativo ? '-' : '';

  let integer = '';
  let decimal = '';
  let hasDecimal = false;

  const commaIdx = sinSigno.lastIndexOf(',');
  if (commaIdx >= 0) {
    integer = sinSigno.slice(0, commaIdx).replace(/[^\d]/g, '');
    decimal = sinSigno.slice(commaIdx + 1).replace(/[^\d]/g, '').slice(0, maxDecimals);
    hasDecimal = true;
  } else {
    const dotCount = (sinSigno.match(/\./g) || []).length;
    if (dotCount >= 2) {
      integer = sinSigno.replace(/[^\d]/g, '');
    } else if (dotCount === 1) {
      const dotIdx = sinSigno.indexOf('.');
      const before = sinSigno.slice(0, dotIdx).replace(/[^\d]/g, '');
      const after = sinSigno.slice(dotIdx + 1).replace(/[^\d]/g, '');
      const asDecimal = before === '' || before === '0' || after.length <= 2;
      if (asDecimal) {
        integer = before;
        decimal = after.slice(0, maxDecimals);
        hasDecimal = true;
      } else {
        integer = before + after;
      }
    } else {
      integer = sinSigno.replace(/[^\d]/g, '');
    }
  }

  const intNum = integer ? Number(integer) : NaN;
  const intFmt = Number.isFinite(intNum)
    ? new Intl.NumberFormat('es-CO').format(intNum)
    : '';
  const prefix = negativo ? '-' : '';
  if (hasDecimal) {
    return `${prefix}${intFmt || (integer === '' ? '' : '0')},${decimal}`;
  }
  return `${prefix}${intFmt}`;
}

/**
 * Convierte el texto de un input decimal (formato es-CO: `1.750,5`) al string
 * numérico que espera el backend Laravel (`1750.5`). Preserva los decimales.
 *
 *   "1.750,5"   → "1750.5"
 *   "1.750,50"  → "1750.50"
 *   "1750.5"    → "1750.5"    (ya está en formato API)
 *   "200,"      → "200"       (coma sin decimales aún)
 *   ""          → ""
 */
export function parseDecimal(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  const str = String(text).trim();
  if (!str) return '';
  if (str.includes(',')) {
    const [ent, dec = ''] = str.split(',');
    const entLimpio = ent.replace(/\./g, '').replace(/[^\d-]/g, '');
    const decLimpio = dec.replace(/[^\d]/g, '');
    return decLimpio ? `${entLimpio}.${decLimpio}` : entLimpio;
  }
  // Sin coma: puede venir del API con `.` o del user con solo dígitos.
  if (pareceDecimalApi(str)) return str;
  return str.replace(/\./g, '').replace(/[^\d-]/g, '');
}
