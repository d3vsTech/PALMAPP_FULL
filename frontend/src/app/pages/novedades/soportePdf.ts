/**
 * Soporte en PDF de una novedad, para imprimir y firmar.
 *
 * No es el documento que se adjunta (ese lo descarga `ausencias.descargarDocumento`):
 * es el acta que genera la finca para que el colaborador firme la novedad. Usa
 * los bloques compartidos de `lib/pdf/palmappPDF` para que salga con la misma
 * cabecera, pie y firmas que el resto de descargables.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  asegurarLogoEmpresa,
  C, TABLE_ALT, pdfChip, pdfFooter, pdfHeader, pdfSectionTitle, pdfSignatureBlock,
} from '../../lib/pdf/palmappPDF';
import type { AusenciaDetalle } from '../../../api/novedades';
import { etiquetaDias, formatFecha, formatHora, formatPorcentaje } from './tipos';

const MARGEN = 14;
/** Debajo de esta Y ya no cabe el bloque de firmas: se abre página nueva. */
const Y_MINIMA_FIRMAS = 215;

const NOTA_LEGAL =
  'Este documento constituye el soporte formal de la novedad laboral registrada. ' +
  'Ambas partes declaran estar de acuerdo con la información consignada.';

function nombreArchivo(n: AusenciaDetalle): string {
  const tipo = n.motivo_ausencia.nombre.toLowerCase().replace(/\s+/g, '_');
  const primerNombre = n.empleado.nombre_completo.split(' ')[0]!.toLowerCase();
  return `soporte_${tipo}_${primerNombre}_${n.fecha_inicio}.pdf`;
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

function filasDetalle(n: AusenciaDetalle): string[][] {
  const filas: string[][] = [
    ['Tipo de novedad', n.motivo_ausencia.nombre],
    ['Fecha inicio', formatFecha(n.fecha_inicio)],
  ];

  if (n.parcial && n.hora_inicio && n.hora_fin) {
    // Una parcial no tiene rango: es un horario dentro de un día.
    filas.push(['Horario', `${formatHora(n.hora_inicio)} a ${formatHora(n.hora_fin)}`]);
    filas.push(['Carácter', 'Informativa: no cuenta como día de ausencia']);
  } else {
    filas.push(['Fecha fin', formatFecha(n.fecha_fin)]);
    filas.push(['Días de novedad', `${n.dias_calendario} ${etiquetaDias(n.dias_calendario)}`]);
  }

  filas.push([
    'Remuneración',
    n.es_remunerada
      ? `Remunerado · ${formatPorcentaje(n.porcentaje_pago)} del salario`
      : 'No remunerado',
  ]);
  filas.push(['Afecta subsidio de transporte', n.afecta_auxilio_transporte ? 'Sí' : 'No']);

  if (n.entidad) filas.push(['Entidad', n.entidad]);
  if (n.numero_radicado) filas.push(['Número de radicado', n.numero_radicado]);

  return filas;
}

export async function descargarSoporte(n: AusenciaDetalle): Promise<void> {
  // El logo de la finca vive en localStorage y hay que traerlo antes de pintar
  // la cabecera; si no, el acta sale solo con el logo de Palmapp.
  await asegurarLogoEmpresa();
  const doc = new jsPDF();
  const anchoPagina = pdfHeader(doc, 'SOPORTE DE NOVEDAD LABORAL', n.motivo_ausencia.nombre);

  const registrada = n.aprobado_at ?? n.fecha_inicio;
  let y = 48;
  y = pdfChip(doc, n.motivo_ausencia.nombre, `Registrada el ${formatFecha(registrada.slice(0, 10))}`, y) + 6;

  y = pdfSectionTitle(doc, 'DATOS DEL COLABORADOR', y);
  y = filaDato(doc, 'Nombre completo', n.empleado.nombre_completo, y);
  y = filaDato(doc, 'No. de documento', n.empleado.documento, y);
  y = filaDato(doc, 'Cargo', n.empleado.cargo ?? 'Sin cargo', y) + 4;

  y = pdfSectionTitle(doc, 'DETALLE DE LA NOVEDAD', y);
  autoTable(doc, {
    startY: y,
    body: filasDetalle(n),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    alternateRowStyles: TABLE_ALT,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } },
    margin: { left: MARGEN, right: MARGEN },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const observacion = n.observacion ?? n.motivo;
  if (observacion) {
    y = pdfSectionTitle(doc, 'OBSERVACIONES', y);
    doc.setTextColor(...C.darkText);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(observacion, anchoPagina - MARGEN * 2);
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
    { titulo: 'EMPLEADO', nombre: n.empleado.nombre_completo, cedula: n.empleado.documento },
    y,
  );

  pdfFooter(doc, NOTA_LEGAL);
  doc.save(nombreArchivo(n));
}
