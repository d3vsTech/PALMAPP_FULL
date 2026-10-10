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

/**
 * Solo la hora (HH:mm). Útil para marcas de tiempo dentro del mismo día.
 *
 * Acepta tanto un timestamp completo como una hora suelta: el backend manda
 * `hora_salida` y `hora_llegada` como "14:30:00", que `new Date` no parsea.
 * Sin este caso el dato existía pero la pantalla pintaba "—".
 */
export function formatHora(
  raw?: string | number | Date | null,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  if (raw === null || raw === undefined || raw === '') return FALLBACK;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? FALLBACK : raw.toLocaleTimeString('es-CO', opts);
  }

  const s = String(raw).trim();
  // Hora suelta "H:mm", "HH:mm" o "HH:mm:ss". Se ancla a una fecha cualquiera
  // para poder formatearla; solo se usan las horas y los minutos.
  const soloHora = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (soloHora) {
    const h = Number(soloHora[1]);
    const m = Number(soloHora[2]);
    const seg = Number(soloHora[3] ?? '0');
    if (h > 23 || m > 59 || seg > 59) return FALLBACK;
    return new Date(2000, 0, 1, h, m, seg).toLocaleTimeString('es-CO', opts);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? FALLBACK : d.toLocaleTimeString('es-CO', opts);
}