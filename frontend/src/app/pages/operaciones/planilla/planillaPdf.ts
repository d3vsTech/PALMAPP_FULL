/**
 * La planilla del día en PDF, para imprimir y archivar.
 *
 * Antes el botón "Descargar" llamaba a `window.print()`, que entrega una
 * captura de la pantalla con el menú y los colores de la aplicación. Esto arma
 * el documento con los bloques de `lib/pdf/palmappPDF`, los mismos del pagaré
 * y del acta de novedad: misma cabecera, mismo pie, misma retícula.
 *
 * Lleva lo mismo que la pantalla y en el mismo orden, **sin valores en pesos**:
 * la planilla es el parte de trabajo del día, no una liquidación.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  asegurarLogoEmpresa,
  C, TABLE_ALT, pdfChip, pdfFooter, pdfHeader, pdfSectionTitle,
} from '../../../lib/pdf/palmappPDF';
import type { PlanillaDetalle } from '../../../../api/operaciones';
import type { ResumenPlanilla } from './resumenPlanilla';

const MARGEN = 14;

const NOTA_LEGAL =
  'Parte de trabajo del día. Las cantidades aquí registradas son las que reportó la finca; '
  + 'el pago de cada labor se liquida en la nómina del período.';

/** Celda de autoTable con estilos propios. Lo que la librería acepta en `body`. */
type Celda = string | { content: string; colSpan?: number; rowSpan?: number; styles?: object };

/** La Y donde quedó la última tabla que pintó autoTable. */
function finDeTabla(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function fechaLarga(fecha: string): string {
  const d = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const texto = d.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Debajo de esta Y ya no cabe nada: empieza el pie con su nota legal. */
const Y_LIMITE = 268;

/**
 * Abre una sección cuidando que el título no quede solo al final de la hoja.
 *
 * autoTable pagina la tabla por su cuenta, pero el título lo escribimos antes:
 * sin esto, "LABORES DE FINCA" se quedaba en el pie de una página y su tabla
 * arrancaba en la siguiente.
 *
 * @param alturaMinima Lo que debe caber para que valga la pena empezar aquí:
 *   el título más la cabecera de la tabla y un par de filas.
 */
function abrirSeccion(doc: jsPDF, titulo: string, y: number, alturaMinima = 40): number {
  if (y + alturaMinima > Y_LIMITE) {
    doc.addPage();
    return pdfSectionTitle(doc, titulo, 20);
  }
  return pdfSectionTitle(doc, titulo, y);
}

/** Tabla de dos columnas: rótulo a la izquierda, dato a la derecha. */
function tablaDatos(doc: jsPDF, filas: string[][], y: number): number {
  autoTable(doc, {
    startY: y,
    body: filas,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: C.darkText },
    columnStyles: { 0: { fontStyle: 'bold', textColor: C.gray, cellWidth: 56 } },
    alternateRowStyles: TABLE_ALT,
    margin: { left: MARGEN, right: MARGEN },
  });
  return finDeTabla(doc) + 10;
}

/** Las filas de las labores de palma: los renglones y el total de cada labor. */
function filasDePalma(resumen: ResumenPlanilla): Celda[][] {
  const filas: Celda[][] = [];

  resumen.laboresPalma.forEach((grupo) => {
    grupo.trabajos.forEach((t, i) => {
      filas.push([
        ...(i === 0
          ? [{ content: grupo.labor, rowSpan: grupo.trabajos.length, styles: { fontStyle: 'bold' } }]
          : []),
        t.colaboradores.join(', ') || '—',
        t.lotes.join(', ') || '—',
        t.sublotes.join(', ') || '—',
        t.detalle || '—',
      ]);
    });

    if (!grupo.total) return;
    filas.push([
      {
        content: `Total ${grupo.labor}`,
        colSpan: 4,
        styles: { fontStyle: 'bold', halign: 'right', fillColor: C.primaryLight },
      },
      { content: grupo.total, styles: { fontStyle: 'bold', fillColor: C.primaryLight } },
    ]);
  });

  return filas;
}

function seccionPalma(doc: jsPDF, resumen: ResumenPlanilla, y: number): number {
  if (resumen.laboresPalma.length === 0) return y;

  const yy = abrirSeccion(doc, 'LABORES DE PALMA', y);
  autoTable(doc, {
    startY: yy,
    head: [['Labor', 'Colaboradores', 'Lotes', 'Sublotes', 'Detalle']],
    body: filasDePalma(resumen) as never,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.darkText, valign: 'middle' },
    headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 52 } },
    margin: { left: MARGEN, right: MARGEN },
  });
  return finDeTabla(doc) + 10;
}

function seccionHorasExtra(doc: jsPDF, resumen: ResumenPlanilla, y: number): number {
  if (resumen.horasExtra.length === 0) return y;

  const yy = abrirSeccion(doc, 'HORAS EXTRA', y);
  autoTable(doc, {
    startY: yy,
    head: [['Colaborador', 'Tipo', 'Horas', 'Estado']],
    body: resumen.horasExtra.map((h) => [h.colaborador, h.tipo, String(h.horas), h.estado]),
    foot: [[
      { content: 'Total de horas', colSpan: 2, styles: { halign: 'right' } },
      String(resumen.horasExtraSumadas),
      '',
    ]] as never,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.darkText },
    headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: C.primaryLight, textColor: C.darkText, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' } },
    alternateRowStyles: TABLE_ALT,
    margin: { left: MARGEN, right: MARGEN },
  });
  return finDeTabla(doc) + 10;
}

function seccionFinca(doc: jsPDF, resumen: ResumenPlanilla, y: number): number {
  if (resumen.laboresFinca.length === 0) return y;

  const yy = abrirSeccion(doc, 'LABORES DE FINCA', y);
  autoTable(doc, {
    startY: yy,
    head: [['Colaborador', 'Labor', 'Lugar']],
    body: resumen.laboresFinca.map((f) => [f.colaborador, f.labor, f.ubicacion || '—']),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.darkText },
    headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: TABLE_ALT,
    margin: { left: MARGEN, right: MARGEN },
  });
  return finDeTabla(doc) + 10;
}

function seccionNovedades(
  doc: jsPDF,
  observaciones: string,
  ausentes: string[],
  y: number,
): number {
  if (!observaciones && ausentes.length === 0) return y;

  let yy = abrirSeccion(doc, 'NOVEDADES', y, 34);
  const filas: string[][] = [];
  if (observaciones) filas.push(['Observaciones', observaciones]);
  if (ausentes.length > 0) filas.push(['Ausentes', ausentes.join('\n')]);
  yy = tablaDatos(doc, filas, yy);
  return yy;
}

export async function descargarPlanillaPdf(
  planilla: PlanillaDetalle,
  resumen: ResumenPlanilla,
): Promise<void> {
  // El logo de la finca vive en localStorage y hay que traerlo antes de pintar
  // la cabecera; si no, el documento sale solo con el logo de Palmapp.
  await asegurarLogoEmpresa();

  const doc = new jsPDF();
  const fecha = fechaLarga(planilla.fecha);
  pdfHeader(doc, 'PLANILLA DEL DÍA', fecha);

  let y = 48;
  y = pdfChip(doc, planilla.estado === 'APROBADA' ? 'Aprobada' : 'Borrador', fecha, y) + 6;

  y = abrirSeccion(doc, 'DATOS DEL DÍA', y);
  y = tablaDatos(doc, [
    ['Elaborado por', resumen.elaboradoPor],
    ['Inicio de labores', resumen.inicioLabores],
    ['Lluvia', resumen.lluvia],
    ['Colaboradores en cosecha', String(resumen.colaboradoresCosecha)],
    ['Palmas plateadas', resumen.palmasPlateadas.toLocaleString('es-CO')],
    ['Palmas podadas', resumen.palmasPodadas.toLocaleString('es-CO')],
    ['Palmas fertilizadas', resumen.palmasFertilizadas.toLocaleString('es-CO')],
    ['Horas extra', String(resumen.horasExtraSumadas)],
  ], y);

  y = seccionPalma(doc, resumen, y);
  y = seccionHorasExtra(doc, resumen, y);
  y = seccionFinca(doc, resumen, y);
  seccionNovedades(doc, planilla.observaciones ?? '', resumen.ausentes, y);

  pdfFooter(doc, NOTA_LEGAL);
  doc.save(`planilla_${String(planilla.fecha).slice(0, 10)}.pdf`);
}
