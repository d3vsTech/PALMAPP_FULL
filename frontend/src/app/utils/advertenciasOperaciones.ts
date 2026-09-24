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

// ─── Errores de vinculación (§0, 2026-09-23) ─────────────────────────────────

/**
 * Traduce un 422 `COLABORADOR_SIN_CONTRATO_VIGENTE` a un solo texto legible.
 *
 * El backend manda un `errors` indexado por el campo exacto que falló:
 * `empleado_id`, `cuadrilla.{i}.empleado_id`, `miembros.{i}.empleado_id`,
 * `items.{i}.empleado_id`, `items.{i}.cuadrilla.{j}.empleado_id` o
 * `empleado_ids.{i}`. Las claves no le dicen nada a quien llena la planilla;
 * los mensajes sí, porque ya vienen con el nombre y la fecha dentro.
 *
 * Devuelve `null` cuando el error es de otro tipo, para que el llamador siga
 * con su manejo de siempre.
 */
export function mensajeSinContratoVigente(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as { code?: string; errors?: Record<string, string[] | string> };
  if (e.code !== 'COLABORADOR_SIN_CONTRATO_VIGENTE') return null;

  const motivos: string[] = [];
  Object.values(e.errors ?? {}).forEach((v) => {
    const texto = Array.isArray(v) ? v[0] : v;
    // El mismo colaborador puede fallar en varias filas del bulk.
    if (texto && !motivos.includes(texto)) motivos.push(texto);
  });

  if (motivos.length === 0) {
    return 'Hay colaboradores sin contrato vigente en la fecha de la planilla. No se guardó nada.';
  }
  return `${motivos.join(' ')} No se guardó nada.`;
}
