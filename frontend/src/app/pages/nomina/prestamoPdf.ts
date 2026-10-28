/**
 * Recibo del pago de una cuota del préstamo.
 *
 * Se arma en el navegador con los bloques de `lib/pdf/palmappPDF`. No hay
 * endpoint de backend para este recibo: el 2026-10-27 el backend se llevó el
 * comprobante del préstamo (el pagaré, API_PRESTAMOS §12, hoy en
 * `prestamosApi.comprobantePdf`), pero no el del abono.
 *
 * No confundirlo con el **soporte adjunto** del préstamo, que es el pagaré ya
 * firmado y escaneado que la finca sube.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  asegurarLogoEmpresa,
  C, TABLE_ALT, pdfChip, pdfFooter, pdfHeader, pdfSectionTitle, pdfSignatureBlock,
} from '../../lib/pdf/palmappPDF';
import type { AbonoPrestamo, Prestamo } from '../../../api/prestamos';
import { formatFecha } from '../../utils/fecha';

const MARGEN = 14;
/** Debajo de esta Y ya no cabe el bloque de firmas: se abre página nueva. */
const Y_MINIMA_FIRMAS = 215;

const NOTA_RECIBO =
  'Este documento certifica el pago relacionado y el saldo pendiente a la fecha de su emisión. ' +
  'Conserve este comprobante.';

/** Pesos colombianos, con punto de miles y sin decimales. */
function cop(v: number | string | null | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0;
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

function primerNombre(p: Prestamo): string {
  return (p.empleado.nombre_completo.split(' ')[0] ?? 'colaborador').toLowerCase();
}

/** Fila etiqueta/valor del bloque de datos del colaborador. */
function filaDato(doc: jsPDF, label: string, valor: string, y: number): number {
  doc.setTextColor(...C.gray);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${label}:`, MARGEN, y);
  doc.setTextColor(...C.darkText);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(valor, 70, y);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

/** La Y donde quedó la última tabla que pintó autoTable. */
function finDeTabla(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function tablaDatos(doc: jsPDF, filas: string[][], y: number): number {
  autoTable(doc, {
    startY: y,
    head: [],
    body: filas,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: C.darkText },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C.gray, cellWidth: 56 },
      1: { halign: 'left' },
    },
    alternateRowStyles: TABLE_ALT,
    margin: { left: MARGEN, right: MARGEN },
  });
  return finDeTabla(doc) + 10;
}

function bloqueColaborador(doc: jsPDF, p: Prestamo, y: number): number {
  let yy = pdfSectionTitle(doc, 'DATOS DEL COLABORADOR', y);
  yy = filaDato(doc, 'Nombre completo', p.empleado.nombre_completo, yy);
  yy = filaDato(doc, 'No. de documento', p.empleado.documento, yy);
  return filaDato(doc, 'Cargo', p.empleado.cargo || 'Sin cargo', yy) + 4;
}

/** Recibo del pago de una cuota, con el saldo que queda después de él. */
export async function descargarComprobanteAbono(p: Prestamo, a: AbonoPrestamo): Promise<void> {
  await asegurarLogoEmpresa();
  const doc = new jsPDF();
  pdfHeader(doc, 'COMPROBANTE DE PAGO DE CUOTA', p.concepto);

  let y = 48;
  y = pdfChip(doc, `Cuota ${a.numero_cuota} de ${p.num_cuotas}`, formatFecha(a.fecha), y) + 6;
  y = bloqueColaborador(doc, p, y);

  y = pdfSectionTitle(doc, 'DETALLE DEL PAGO', y);
  const filas: string[][] = [
    ['Fecha del pago', formatFecha(a.fecha)],
    ['Valor pagado', cop(a.valor)],
    ['Medio de pago', a.medio_pago_label],
  ];
  if (a.referencia) filas.push(['Referencia', a.referencia]);
  filas.push(['Registrado por', a.registrado_por]);
  if (a.nota) filas.push(['Nota', a.nota]);
  y = tablaDatos(doc, filas, y);

  y = pdfSectionTitle(doc, 'ESTADO DEL PRÉSTAMO', y);
  y = tablaDatos(doc, [
    ['Valor del préstamo', cop(p.valor_total)],
    ['Cuotas pagadas', `${p.cuotas_pagadas} de ${p.num_cuotas}`],
    ['Saldo tras este pago', cop(a.saldo_tras_abono)],
  ], y);

  if (y > Y_MINIMA_FIRMAS) {
    doc.addPage();
    y = 20;
  }
  y = pdfSectionTitle(doc, 'FIRMAS', y);
  pdfSignatureBlock(
    doc,
    { titulo: 'EMPLEADOR' },
    { titulo: 'RECIBIDO POR', nombre: p.empleado.nombre_completo, cedula: p.empleado.documento },
    y,
  );

  pdfFooter(doc, NOTA_RECIBO);
  doc.save(`pago_cuota_${a.numero_cuota}_${primerNombre(p)}.pdf`);
}
