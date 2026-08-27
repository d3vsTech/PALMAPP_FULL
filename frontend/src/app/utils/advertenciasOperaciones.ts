/**
 * Helper para mostrar `advertencias` que devuelven POST/PUT de jornales,
 * cosechas y bulk del módulo Operaciones (§3.2 del doc API_OPERACIONES).
 *
 * Son AVISOS informativos, no errores. El registro ya quedó guardado — solo
 * hay que informar al usuario para que corrija la configuración si aplica.
 */
import { toast } from 'sonner';
import type { OperacionAdvertencia } from '../../api/operaciones';

/** Mensajes amistosos por código (fallback al `mensaje` del backend). */
const MENSAJES: Record<string, string> = {
  SIN_PRECIO_LABOR:
    'La labor no tiene precio configurado. El registro queda pendiente hasta que se defina el precio.',
  SIN_RANGO_ABONO:
    'No hay un rango de abono configurado para los gramos indicados. El registro queda sin valor calculado.',
  JORNAL_MINIMO_APLICADO:
    'La labor no tiene tarifa configurada. Se aplicó el jornal mínimo del tenant.',
  SIN_TARIFA_TERCERO:
    'El tercero no tiene tarifa pactada para esta labor. El registro queda en $0.',
  SIN_PRECIO_COSECHA:
    'No hay precio de cosecha configurado para el lote y año. El registro queda pendiente.',
  SIN_TARIFA_COSECHA:
    'La labor de cosecha (jornal fijo) no tiene tarifa. El registro queda en $0.',
};

/**
 * Muestra un toast por cada advertencia recibida. Sin bloqueo — solo informa.
 * Si la respuesta no trae `advertencias`, es un no-op.
 */
export function mostrarAdvertencias(advertencias?: OperacionAdvertencia[] | null): void {
  if (!advertencias || advertencias.length === 0) return;
  for (const adv of advertencias) {
    const mensaje = adv.mensaje || MENSAJES[adv.codigo] || adv.codigo;
    toast.warning(mensaje, { duration: 6000 });
  }
}

/**
 * Consolida N respuestas bulk en un solo toast por código único. Útil cuando
 * varias filas del bulk devuelven la misma advertencia y no queremos spam.
 */
export function mostrarAdvertenciasBulk(
  respuestas: Array<{ advertencias?: OperacionAdvertencia[] | null } | null | undefined>,
): void {
  const porCodigo = new Map<string, OperacionAdvertencia>();
  for (const r of respuestas) {
    for (const adv of r?.advertencias ?? []) {
      if (!porCodigo.has(adv.codigo)) porCodigo.set(adv.codigo, adv);
    }
  }
  mostrarAdvertencias(Array.from(porCodigo.values()));
}
