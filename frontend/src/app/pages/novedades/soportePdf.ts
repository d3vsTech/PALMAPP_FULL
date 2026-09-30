/**
 * Soporte en PDF de una novedad, para imprimir y firmar.
 *
 * Usa los bloques compartidos de `lib/pdf/palmappPDF` para que salga con la
 * misma cabecera, pie y firmas que el resto de descargables del sistema.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  C, TABLE_ALT, pdfChip, pdfFooter, pdfHeader, pdfSectionTitle, pdfSignatureBlock,
} from '../../lib/pdf/palmappPDF';
import { TIPOS_NOVEDAD, etiquetaDias, formatFecha, type Novedad } from './tipos';

const MARGEN = 14;
/** Debajo de esta Y ya no cabe el bloque de firmas: se abre página nueva. */
const Y_MINIMA_FIRMAS = 215;

const NOTA_LEGAL =
  'Este documento constituye el soporte formal de la novedad laboral registrada. ' +
  'Ambas partes declaran estar de acuerdo con la información consignada.';

function nombreArchivo(novedad: Novedad): string {
  const tipo = TIPOS_NOVEDAD[novedad.tipo].label.toLowerCase().replace(/\s+/g, '_');
  const primerNombre = novedad.colaborador.split(' ')[0]!.toLowerCase();
  return `soporte_${tipo}_${primerNombre}_${novedad.fechaInicio}.pdf`;
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

function filasDetalle(novedad: Novedad): string[][] {
  const tipo = TIPOS_NOVEDAD[novedad.tipo];
  const filas: string[][] = [
    ['Tipo de novedad', tipo.label],
    ['Fecha inicio', formatFecha(novedad.fechaInicio)],
  ];
  // Las terminaciones se registran con `dias = 0`: son una fecha efectiva.
  if (novedad.dias > 0) {
    filas.push(['Fecha fin', formatFecha(novedad.fechaFin)]);
    filas.push(['Días de novedad', `${novedad.dias} ${etiquetaDias(novedad.dias)}`]);
  }
  filas.push([
    'Remuneración',
    tipo.remunerado ? `Remunerado · ${tipo.pct} del salario` : 'No remunerado',
  ]);
  filas.push(['Afecta subsidio de transporte', tipo.afectaSubsidio ? 'Sí' : 'No']);
  return filas;
}

export function descargarSoporte(novedad: Novedad): void {
  const tipo = TIPOS_NOVEDAD[novedad.tipo];
  const doc = new jsPDF();
  const anchoPagina = pdfHeader(doc, 'SOPORTE DE NOVEDAD LABORAL', tipo.label);

  let y = 48;
  y = pdfChip(doc, tipo.label, `Registrada el ${formatFecha(novedad.fechaRegistro)}`, y) + 6;

  y = pdfSectionTitle(doc, 'DATOS DEL COLABORADOR', y);
  y = filaDato(doc, 'Nombre completo', novedad.colaborador, y);
  y = filaDato(doc, 'No. de documento', novedad.cedula, y);
  y = filaDato(doc, 'Cargo', novedad.cargo, y) + 4;

  y = pdfSectionTitle(doc, 'DETALLE DE LA NOVEDAD', y);
  autoTable(doc, {
    startY: y,
    body: filasDetalle(novedad),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    alternateRowStyles: TABLE_ALT,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } },
    margin: { left: MARGEN, right: MARGEN },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (novedad.observaciones) {
    y = pdfSectionTitle(doc, 'OBSERVACIONES', y);
    doc.setTextColor(...C.darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(novedad.observaciones, anchoPagina - MARGEN * 2);
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
    { titulo: 'EMPLEADOR', nombre: 'Finca Palmapp' },
    { titulo: 'EMPLEADO', nombre: novedad.colaborador, cedula: novedad.cedula },
    y,
  );

  pdfFooter(doc, NOTA_LEGAL);
  doc.save(nombreArchivo(novedad));
}
