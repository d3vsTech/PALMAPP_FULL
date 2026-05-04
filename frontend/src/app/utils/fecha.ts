/**
 * Helpers de formateo de fechas seguros — evitan "Invalid Date" cuando el API
 * devuelve null, strings malformados o ISO con timestamp.
 *
 * Uso típico:
 *   formatFecha(viaje.fecha_viaje)            → "15/01/2026"
 *   formatFecha(viaje.fecha_viaje, { month: 'long', day: 'numeric' })
 *   formatFechaHora(audit.creado_at)          → "15/01/2026, 14:30:25"
 */

const FALLBACK = '—';

/** Formatea una fecha (solo día/mes/año). Acepta YYYY-MM-DD, ISO con timestamp, etc. */
export function formatFecha(
  raw?: string | number | Date | null,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (raw === null || raw === undefined || raw === '') return FALLBACK;

  // Si ya es Date válido, formatear directamente
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? FALLBACK : raw.toLocaleDateString('es-CO', opts);
  }

  const s = String(raw);
  // Tomar solo los primeros 10 caracteres si tiene formato YYYY-MM-DD (con o sin timestamp)
  const ymd = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    // Construir fecha local a las 12:00 para evitar problemas de timezone
    const d = new Date(ymd + 'T12:00:00');
    return isNaN(d.getTime()) ? FALLBACK : d.toLocaleDateString('es-CO', opts);
  }

  // Otros formatos: intentar parsing genérico
  const d = new Date(s);
  return isNaN(d.getTime()) ? FALLBACK : d.toLocaleDateString('es-CO', opts);
}

/** Formatea fecha + hora. Para audit logs, timestamps, etc. */
export function formatFechaHora(
  raw?: string | number | Date | null,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (raw === null || raw === undefined || raw === '') return FALLBACK;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? FALLBACK : raw.toLocaleString('es-CO', opts);
  }
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? FALLBACK : d.toLocaleString('es-CO', opts);
}

/** Solo la hora (HH:mm). Útil para marcas de tiempo dentro del mismo día. */
export function formatHora(
  raw?: string | number | Date | null,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  if (raw === null || raw === undefined || raw === '') return FALLBACK;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? FALLBACK : raw.toLocaleTimeString('es-CO', opts);
  }
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? FALLBACK : d.toLocaleTimeString('es-CO', opts);
}