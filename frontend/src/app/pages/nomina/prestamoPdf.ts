/**
 * Documentos imprimibles de un préstamo, para entregarle al colaborador.
 *
 * Son dos y no hay que confundirlos con el **soporte adjunto** del préstamo
 * (ese es el papel firmado que la finca escanea y sube):
 *
 *  1. `descargarComprobantePrestamo` — el pagaré con la autorización de
 *     descuento por nómina (CST arts. 149-150) y el calendario completo de
 *     cuotas. Es el que se imprime, se firma y después se sube como soporte.
 *  2. `descargarComprobanteAbono` — el recibo del pago de una cuota, con el
 *     saldo que queda después de él.
 *
 * Los dos se arman en el navegador con los bloques de `lib/pdf/palmappPDF`,
 * para que salgan con la misma cabecera, pie y firmas que el resto de
 * descargables. No hay endpoint de backend para esto.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  asegurarLogoEmpresa,
  C, TABLE_ALT, pdfChip, pdfFooter, pdfHeader, pdfSectionTitle, pdfSignatureBlock,
} from '../../lib/pdf/palmappPDF';
import type { AbonoPrestamo, Prestamo, PrestamoCuota } from '../../../api/prestamos';
import { formatFecha } from '../../utils/fecha';

const MARGEN = 14;
/** Debajo de esta Y ya no cabe el bloque de firmas: se abre página nueva. */
const Y_MINIMA_FIRMAS = 215;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const NOTA_AUTORIZACION =
  'El colaborador autoriza expresamente al empleador a descontar de su salario las cuotas ' +
  'relacionadas en este documento, en los términos de los artículos 149 y 150 del Código ' +
  'Sustantivo del Trabajo. Ambas partes declaran estar de acuerdo con el valor, el número de ' +
  'cuotas y las fechas aquí consignadas.';

const NOTA_RECIBO =
  'Este documento certifica el pago relacionado y el saldo pendiente a la fecha de su emisión. ' +
  'Conserve este comprobante.';

/** Pesos colombianos, con punto de miles y sin decimales. */
function cop(v: number | string | null | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0;
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

function periodoCuota(c: PrestamoCuota): string {
  const mes = MESES[c.mes - 1] ?? String(c.mes);
  return `${mes} ${c.anio}${c.quincena ? ` · Q${c.quincena}` : ''}`;
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

/**
 * Pagaré y autorización de descuento, con el calendario de cuotas.
 *
 * Se entrega al colaborador para que lo firme: es el papel que después se
 * escanea y se sube como soporte del préstamo.
 */
export async function descargarComprobantePrestamo(p: Prestamo): Promise<void> {
  // El logo de la finca vive en localStorage y hay que traerlo antes de pintar
  // la cabecera; si no, sale solo el logo de Palmapp.
  await asegurarLogoEmpresa();
  const doc = new jsPDF();
  const anchoPagina = pdfHeader(doc, 'PRÉSTAMO A COLABORADOR', p.concepto);

  let y = 48;
  y = pdfChip(doc, p.concepto, `Desde ${MESES[p.inicio_mes - 1] ?? p.inicio_mes} ${p.inicio_anio}`, y) + 6;
  y = bloqueColaborador(doc, p, y);

  y = pdfSectionTitle(doc, 'CONDICIONES DEL PRÉSTAMO', y);
  y = tablaDatos(doc, [
    ['Valor del préstamo', cop(p.valor_total)],
    ['Número de cuotas', String(p.num_cuotas)],
    ['Valor de cada cuota', cop(p.cuota_valor)],
    ['Frecuencia de descuento', p.frecuencia === 'QUINCENAL' ? 'Quincenal' : 'Mensual'],
    ['Primera cuota', `${MESES[p.inicio_mes - 1] ?? p.inicio_mes} ${p.inicio_anio}${p.inicio_quincena ? ` · Q${p.inicio_quincena}` : ''}`],
    ['Última cuota', p.fecha_fin ? formatFecha(p.fecha_fin) : 'Por definir'],
    ['Saldo pendiente a la fecha', cop(p.saldo_pendiente)],
  ], y);

  const cuotas = p.cuotas ?? [];
  if (cuotas.length > 0) {
    y = pdfSectionTitle(doc, 'CALENDARIO DE CUOTAS', y);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Período', 'Valor', 'Estado', 'Aplicada el']],
      body: cuotas.map((c) => [
        String(c.numero_cuota),
        periodoCuota(c),
        cop(c.monto),
        c.estado === 'APLICADA' ? 'Aplicada' : 'Pendiente',
        c.aplicada_at ? formatFecha(c.aplicada_at.slice(0, 10)) : '—',
      ]),
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.darkText },
      headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right' } },
      alternateRowStyles: TABLE_ALT,
      margin: { left: MARGEN, right: MARGEN },
    });
    y = finDeTabla(doc) + 10;
  }

  if (p.observaciones) {
    y = pdfSectionTitle(doc, 'OBSERVACIONES', y);
    doc.setTextColor(...C.darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(p.observaciones, anchoPagina - MARGEN * 2);
    doc.text(lineas, MARGEN, y);
    y += lineas.length * 5 + 10;
  }

  if (y > Y_MINIMA_FIRMAS) {
    doc.addPage();
    y = 20;
  }
  y = pdfSectionTitle(doc, 'FIRMAS DE ACEPTACIÓN', y);
  pdfSignatureBlock(
    doc,
    { titulo: 'EMPLEADOR' },
    { titulo: 'COLABORADOR', nombre: p.empleado.nombre_completo, cedula: p.empleado.documento },
    y,
  );

  pdfFooter(doc, NOTA_AUTORIZACION);
  doc.save(`prestamo_${primerNombre(p)}_${p.id}.pdf`);
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
