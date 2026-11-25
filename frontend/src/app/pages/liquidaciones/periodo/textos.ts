/**
 * Textos y helpers compartidos del detalle de período de liquidación.
 * Cesantías e intereses usan el mismo wizard (API_LIQUIDACIONES §1.2);
 * aquí viven las diferencias de wording entre consignar al fondo y pagar
 * al trabajador.
 */

export type TipoPeriodoDetalle = 'CESANTIAS' | 'INTERESES_CESANTIAS' | 'PRIMA';

export interface TextosPeriodo {
  /** "cesantías" / "intereses de cesantías" / "prima de servicios". */
  nombre: string;
  rutaTab: string;
  subtituloWizard: string;
  /** Botón masivo del período cerrado. */
  girarTodos: string;
  /** Botón por fila. */
  girarFila: string;
  giroSustantivo: string;
  giradoLabel: string;
  pendienteGiroLabel: string;
  colValor: string;
  totalPreviewLabel: string;
  totalCardLabel: string;
  avisoLimite: string;
  /** Prefijo de los PDF (§6.2/§6.3). */
  pdfPrefijo: string;
  /** Badge del período cerrado cuando todo quedó girado. */
  badgeCompleto: string;
  /** Rótulo de la fecha del último giro en la ficha del período. */
  giradoEnLabel: string;
  /** Fórmula legal en texto, para las tarjetas de desprendible. */
  formulaGenerica: string;
  /** Nombre corto del período en frases: "período de prima". */
  nombreCorto: string;
  /** Subtítulo del paso de confirmación. */
  desprendiblesLabel: string;
  /** Rótulo de la fecha límite en el aviso del paso 1. */
  limiteLabel: string;
  /** Total del período cerrado cuando todo quedó girado. */
  totalGiradoLabel: string;
  /** Total del período cerrado con giros pendientes. */
  totalLiquidadoLabel: string;
}

export const TEXTOS_PERIODO: Record<TipoPeriodoDetalle, TextosPeriodo> = {
  CESANTIAS: {
    nombre: 'cesantías',
    rutaTab: '/liquidaciones?tab=cesantias',
    subtituloWizard: 'Liquidación de cesantías',
    girarTodos: 'Consignar todos',
    girarFila: 'Registrar consignación',
    giroSustantivo: 'consignación',
    giradoLabel: 'Consignado',
    pendienteGiroLabel: 'Pendiente por consignar',
    colValor: 'Cesantías',
    totalPreviewLabel: 'Total cesantías a consignar',
    totalCardLabel: 'Total cesantías',
    avisoLimite: 'Las cesantías no consignadas a tiempo generan sanción moratoria.',
    pdfPrefijo: 'cesantias',
    badgeCompleto: 'Liquidado y consignado',
    giradoEnLabel: 'Consignado el',
    formulaGenerica: '(base × días) ÷ 360',
    nombreCorto: 'cesantías',
    desprendiblesLabel: 'Desprendibles de liquidación de cesantías',
    limiteLabel: 'Fecha límite de consignación',
    totalGiradoLabel: 'Total cesantías consignadas',
    totalLiquidadoLabel: 'Total cesantías liquidadas',
  },
  INTERESES_CESANTIAS: {
    nombre: 'intereses de cesantías',
    rutaTab: '/liquidaciones?tab=intereses',
    subtituloWizard: 'Intereses sobre cesantías',
    girarTodos: 'Pagar todos',
    girarFila: 'Registrar pago',
    giroSustantivo: 'pago',
    giradoLabel: 'Pagado',
    pendienteGiroLabel: 'Pendiente por pagar',
    colValor: 'Intereses',
    totalPreviewLabel: 'Total intereses a pagar',
    totalCardLabel: 'Total intereses',
    avisoLimite: 'Los intereses no pagados a tiempo generan sanción de mora.',
    pdfPrefijo: 'intereses_cesantias',
    badgeCompleto: 'Liquidado y pagado',
    giradoEnLabel: 'Pagado el',
    formulaGenerica: '(saldo × 12 % × días) ÷ 360',
    nombreCorto: 'intereses',
    desprendiblesLabel: 'Desprendibles de intereses sobre cesantías',
    limiteLabel: 'Fecha límite de pago',
    totalGiradoLabel: 'Total intereses pagados',
    totalLiquidadoLabel: 'Total intereses liquidados',
  },
  PRIMA: {
    nombre: 'prima de servicios',
    rutaTab: '/liquidaciones?tab=prima',
    subtituloWizard: 'Liquidación de prima de servicios',
    girarTodos: 'Pagar todos',
    girarFila: 'Registrar pago',
    giroSustantivo: 'pago',
    giradoLabel: 'Pagado',
    pendienteGiroLabel: 'Pendiente por pagar',
    colValor: 'Prima',
    totalPreviewLabel: 'Total prima a pagar',
    totalCardLabel: 'Total prima',
    avisoLimite: 'La prima debe pagarse en las fechas establecidas por ley (art. 306 CST).',
    pdfPrefijo: 'prima',
    badgeCompleto: 'Liquidado y pagado',
    giradoEnLabel: 'Pagado el',
    formulaGenerica: '(base × días) ÷ 360',
    nombreCorto: 'prima',
    desprendiblesLabel: 'Desprendibles de liquidación de prima',
    limiteLabel: 'Fecha límite de pago',
    totalGiradoLabel: 'Total prima pagada',
    totalLiquidadoLabel: 'Total prima liquidada',
  },
};

/**
 * Cajas de aviso con el vocabulario del diseño: el ícono hereda el color
 * del texto. Aviso = advertencia, nota = informativa, error = bloqueante.
 */
export const CAJA_AVISO = 'flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning';
export const CAJA_NOTA = 'flex items-start gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground';
export const CAJA_ERROR = 'flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive';

/** Método de giro legible. PILA es sigla: no se pasa a minúsculas. */
export const METODO_PAGO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  PILA: 'PILA',
};

/** Etiqueta del semestre para títulos y filtros de prima. */
export const semestreLabel = (semestre: number) =>
  semestre === 1 ? '1° semestre' : semestre === 2 ? '2° semestre' : '';

/** Las liquidaciones se presentan con centavos cuando los hay. */
export const fmtCOP = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;

export const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

/**
 * Nombre del PDF según §6.2 y §6.3. La prima lleva sufijo de semestre;
 * cesantías e intereses no.
 */
export function nombrePdf(
  tipo: TipoPeriodoDetalle,
  parte: { documento: string } | { periodoId: number },
  anio: number,
  semestre: number,
): string {
  const prefijo = TEXTOS_PERIODO[tipo].pdfPrefijo;
  const sufijo = semestre > 0 ? `_S${semestre}` : '';
  return 'documento' in parte
    ? `${prefijo}_${parte.documento}_${anio}${sufijo}.pdf`
    : `${prefijo}_periodo_${parte.periodoId}_${anio}${sufijo}.pdf`;
}

/** Dispara la descarga de un blob con el nombre dado. */
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
