/**
 * Utilidades para ordenar listas de personas alfabeticamente por primer
 * nombre. Se aplica en todo el sistema: colaboradores, terceros, operarios,
 * usuarios, cuadrillas, listas de pago, etc.
 *
 * Convencion: el primer nombre es lo que aparece primero como identificador
 * de la persona. Segundo nombre y apellidos se usan como desempate cuando
 * dos personas comparten primer nombre.
 */

/** Extrae el primer nombre desde cualquier forma comun de "persona". */
export function firstNameOf(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') {
    // Un solo string ("Juan Perez Gomez") — tomamos la primera palabra.
    return p.trim().split(/\s+/)[0] ?? '';
  }
  // Campos por prioridad.
  if (p.primer_nombre) return String(p.primer_nombre).trim();
  if (p.nombres) {
    // "Juan Carlos" → "Juan"
    return String(p.nombres).trim().split(/\s+/)[0] ?? '';
  }
  if (p.nombre) return String(p.nombre).trim().split(/\s+/)[0] ?? '';
  if (p.nombre_completo) return String(p.nombre_completo).trim().split(/\s+/)[0] ?? '';
  if (p.full_name) return String(p.full_name).trim().split(/\s+/)[0] ?? '';
  if (p.name) return String(p.name).trim().split(/\s+/)[0] ?? '';
  return '';
}

/** Nombre completo derivado, para desempate secundario. */
export function fullNameOf(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') return p.trim();
  if (p.nombre_completo) return String(p.nombre_completo).trim();
  if (p.full_name) return String(p.full_name).trim();
  if (p.name) return String(p.name).trim();
  const partes = [
    p.primer_nombre ?? p.nombres ?? p.nombre ?? '',
    p.segundo_nombre ?? '',
    p.primer_apellido ?? p.apellidos ?? p.apellido ?? '',
    p.segundo_apellido ?? '',
  ].map((s) => String(s ?? '').trim()).filter(Boolean);
  return partes.join(' ');
}

/**
 * Comparador para `Array.sort` que ordena personas por primer nombre.
 * Desempata por nombre completo. Compara con locale es-CO, insensible a
 * mayusculas y acentos.
 */
export function comparePersonaByFirstName(a: any, b: any): number {
  const fnA = firstNameOf(a);
  const fnB = firstNameOf(b);
  const cmp = fnA.localeCompare(fnB, 'es', { sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return fullNameOf(a).localeCompare(fullNameOf(b), 'es', { sensitivity: 'base' });
}

/**
 * Devuelve una copia del array ordenada por primer nombre. No muta el
 * original.
 */
export function sortByFirstName<T>(list: readonly T[] | undefined | null): T[] {
  if (!list) return [];
  return [...list].sort(comparePersonaByFirstName);
}
