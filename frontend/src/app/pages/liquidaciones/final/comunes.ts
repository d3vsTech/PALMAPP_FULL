/**
 * Piezas compartidas por las tres pantallas de la liquidación final.
 * Los helpers de dinero y descarga viven en periodo/textos.ts y se reexportan
 * aquí para no duplicarlos.
 */
import type {
  EstadoLiquidacionFinal,
  ComprobanteLiquidacionFinal,
  ConceptoLiquidacion,
} from '../../../../api/liquidacionFinal';
import type { ApiError } from '../../../../api/client';
import { LiquidacionFinalErrorCodes as E } from '../../../../api/liquidacionFinal';

export { fmtCOP, getIniciales, descargarBlob } from '../periodo/textos';

// ─── Estados ──────────────────────────────────────────────────────────────────

export const ESTADO_BADGE: Record<EstadoLiquidacionFinal, string> = {
  BORRADOR: 'bg-muted text-muted-foreground border-muted',
  APROBADA:
    'bg-primary/5 text-primary border-blue-200 dark:bg-primary/10 dark:border-blue-900/30',
  PAGADA: 'bg-success/10 text-success border-success/30',
  ANULADA: 'bg-destructive/10 text-destructive border-destructive/30',
};

/** Frase corta bajo el estado, para que la tabla explique qué falta. */
export const ESTADO_NOTA: Record<EstadoLiquidacionFinal, string> = {
  BORRADOR: 'sin aprobar',
  APROBADA: 'pendiente de pago',
  PAGADA: 'finalizada',
  ANULADA: 'sin efecto',
};

// ─── Formato ──────────────────────────────────────────────────────────────────

/** Fecha corta del backend (YYYY-MM-DD) a formato local, sin desfase de zona. */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const soloFecha = iso.slice(0, 10);
  const [a, m, d] = soloFecha.split('-').map(Number);
  if (!a || !m || !d) return '—';
  return new Date(a, m - 1, d).toLocaleDateString('es-CO');
}

/** Días con hasta dos decimales: la causación de vacaciones da 34,46. */
export const fmtDias = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });

/** Nombre del PDF del comprobante, igual que el del backend. */
export function nombrePdfLiquidacion(c: ComprobanteLiquidacionFinal): string {
  const doc = c.empleado?.documento ?? 'colaborador';
  const fecha = (c.retiro?.fecha_retiro ?? c.fecha_generacion ?? '').slice(0, 10);
  return `liquidacion_final_${doc}${fecha ? `_${fecha}` : ''}.pdf`;
}

// ─── Lectura del comprobante ──────────────────────────────────────────────────

/** Busca un concepto por código dentro de devengados o deducciones. */
export function buscarConcepto(
  c: ComprobanteLiquidacionFinal | null,
  codigo: string,
): ConceptoLiquidacion | undefined {
  if (!c) return undefined;
  return [...c.conceptos.devengados, ...c.conceptos.deducciones].find(
    (x) => x.codigo === codigo,
  );
}

// ─── Errores ──────────────────────────────────────────────────────────────────

/**
 * Traduce los códigos del §0.1 a una frase que le dice al usuario qué hacer.
 * Solo se discrimina por `code`; el mensaje del backend queda como respaldo
 * para los códigos que no están en esta tabla.
 */
const MENSAJES: Record<string, string> = {
  [E.LIQUIDACION_NO_ENCONTRADA]: 'La liquidación no existe o es de otra finca.',
  [E.EMPLEADO_NO_ENCONTRADO]: 'El colaborador no existe o es de otra finca.',
  [E.EMPLEADO_NO_ELEGIBLE]: 'Este colaborador no se puede liquidar a esa fecha.',
  [E.MOTIVO_RETIRO_INVALIDO]: 'El motivo de retiro no está en el catálogo.',
  [E.TIPO_CONTRATO_REQUERIDO]: 'Elija un tipo de contrato válido.',
  [E.FECHA_FIN_PACTADA_REQUERIDA]:
    'Un contrato a término fijo necesita la fecha de fin pactada para calcular la indemnización.',
  [E.DIAS_INDEMNIZACION_REQUERIDOS]:
    'Este caso exige escribir a mano los días de indemnización.',
  [E.DEDUCCION_SIN_AUTORIZACION]:
    'Descontar exige la autorización escrita del trabajador (CST arts. 149 y 150).',
  [E.PRESTAMO_NO_VIGENTE]: 'Ese préstamo ya no está vigente.',
  [E.LIQUIDACION_FECHA_RETIRO_INVALIDA]:
    'La fecha de retiro no coincide con la terminación del contrato.',
  [E.LIQUIDACION_ESTADO_INVALIDO]: 'La liquidación ya no está en ese estado.',
  [E.LIQUIDACION_CONTRATO_YA_LIQUIDADO]:
    'Ese contrato ya tiene una liquidación. Anule la anterior si quiere rehacerla.',
  [E.LIQUIDACION_RETIRO_FUTURO]:
    'No se puede aprobar con una fecha de retiro futura. Se puede guardar en borrador.',
  [E.LIQUIDACION_FECHA_RETIRO_DISTINTA]:
    'La ficha del colaborador ya tiene otro retiro registrado. Use la misma fecha o corrija la ficha.',
  [E.LIQUIDACION_CON_PAGO]: 'Anule primero el pago.',
  [E.LIQUIDACION_DESACTUALIZADA]:
    'Los datos cambiaron mientras revisaba. Se recargó el cálculo: revise y vuelva a intentar.',
  [E.LIQUIDACION_ADVERTENCIAS_BLOQUEANTES]:
    'Hay puntos que impiden liquidar. Revise la lista de arriba.',
  [E.LIQUIDACION_COBERTURA_INCOMPLETA]:
    'Faltan nóminas cerradas del período. Ciérrelas o confirme de todas formas con un motivo.',
  [E.LIQUIDACION_PAGO_YA_REGISTRADO]: 'Esta liquidación ya tiene el pago registrado.',
  [E.LIQUIDACION_PAGO_NO_REGISTRADO]: 'Esta liquidación no tiene ningún pago que anular.',
  [E.AJUSTE_SIN_MOTIVO]: 'Cada valor que cambie a mano necesita un motivo.',
  [E.CONFIG_LEGAL_INCOMPLETA]:
    'Faltan constantes legales. Revise Configuración, Legal, Constantes legales.',
  [E.ULTIMA_NOMINA_SIN_CERRAR]:
    'La nómina del período del retiro sigue en borrador.',
  [E.NOMINA_POSTERIOR_AL_RETIRO]:
    'Hay nóminas cerradas con días posteriores a la fecha de retiro.',
  [E.PERMISSION_DENIED]: 'No tiene permiso para esta acción.',
};

/**
 * `ApiError` es una interfaz, no una clase: se reconoce por su forma.
 * El cliente HTTP rechaza siempre con ese objeto, nunca con un Error nativo.
 */
export function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'message' in e;
}

export function mensajeErrorLiquidacion(e: unknown, respaldo: string): string {
  if (!esApiError(e)) return respaldo;
  if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
  return e.message || respaldo;
}

/** `true` si el error trae ese código, para decidir el flujo tras un 409. */
export function tieneCodigo(e: unknown, code: string): boolean {
  return esApiError(e) && e.code === code;
}
