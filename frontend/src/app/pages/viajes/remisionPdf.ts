/**
 * Remisión de entrega de un viaje, para imprimir y mandar con el conductor.
 *
 * No es el desprendible de `viajesApi.desprendiblePdf`: ese lo arma el backend
 * y solo existe en FINALIZADO, porque lleva los lotes, el peso de la báscula y
 * la calificación de la extractora. Este es el papel que sale **antes** del
 * viaje, el que hoy se llena a mano.
 *
 * Lleva la cabecera y el pie del sistema (`lib/pdf/palmappPDF`), que es lo que
 * identifica a todos los descargables de la app, y debajo la rejilla del
 * talonario de la finca casilla por casilla —datos del destinatario, tabla de
 * artículos, TOTAL, SON y la banda de firmas— para que quien lo recibe en la
 * planta reconozca el mismo documento.
 */
import jsPDF from 'jspdf';
import { C, pdfFooter, pdfHeader } from '../../lib/pdf/palmappPDF';

/** Lo que el PDF necesita del viaje. Todo opcional salvo la remisión. */
export interface DatosRemisionViaje {
  remision: string;
  /** `YYYY-MM-DD`. */
  fecha?: string;
  horaSalida?: string;
  extractora?: string;
  /** Dirección o punto físico de la extractora. */
  extractoraUbicacion?: string;
  transportador?: string;
  conductor?: string;
  placaVehiculo?: string;
  /** Estimado de la finca. Lo que manda es el peso de la báscula. */
  gajosEstimados?: number;
  observaciones?: string;
}

/** Lo que el PDF necesita de la finca (`configuracion/info-empresa`). */
export interface DatosRemisionEmpresa {
  nombre?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
  direccion?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  telefonoFijo?: string | null;
  representante?: string | null;
  /** URL pública del logo (`info-empresa.logo_url`). */
  logoUrl?: string | null;
}

/** Donde `palmappPDF.pdfHeader` busca el logo de la finca. */
const CLAVE_LOGO = 'palmapp_empresa_logo';
const CLAVE_LOGO_URL = 'palmapp_empresa_logo_url';

/**
 * Deja el logo de la finca en el almacenamiento local, que es de donde lo lee
 * la cabecera de **todos** los PDF del sistema.
 *
 * Esa clave se leía pero nadie la escribía, así que ningún descargable salía
 * con el logo de la finca aunque estuviera cargado en Configuración. Se guarda
 * en base64 porque jsPDF no acepta una URL: necesita los bytes.
 *
 * Nunca interrumpe la descarga: si la imagen no se puede traer o no cabe en el
 * almacenamiento, el PDF sale con el logo de Palmapp y el nombre de la finca.
 */
export async function asegurarLogoEmpresa(logoUrl?: string | null): Promise<void> {
  if (!logoUrl) return;
  try {
    if (localStorage.getItem(CLAVE_LOGO) && localStorage.getItem(CLAVE_LOGO_URL) === logoUrl) {
      return;
    }
    const res = await fetch(logoUrl);
    if (!res.ok) return;
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
    localStorage.setItem(CLAVE_LOGO, base64);
    localStorage.setItem(CLAVE_LOGO_URL, logoUrl);
  } catch {
    // Logo inalcanzable, CORS, o cuota del almacenamiento superada.
  }
}

// ── Geometría del talonario (mm) ──────────────────────────────────────────────
const M = 12;                 // margen lateral
const ANCHO = 210 - M * 2;    // 186
const COL_IZQ = 112;          // bloque Señor(es) / Dirección / Transportador
const COL_DER = ANCHO - COL_IZQ;
const MITAD_DER = COL_DER / 2;
const FILA = 11;              // alto de las filas de datos
const COL_REF = 36;           // REFERENCIA
const COL_CANT = 38;          // CANTIDAD
const FILAS_CUERPO = 8;
const ALTO_CUERPO = 11;

const BORDE: [number, number, number] = [150, 170, 155];

const NOTA_LEGAL =
  'Documento de despacho. El peso y la calificación que rigen la liquidación son los que ' +
  'registre la báscula de la planta extractora al recibir el fruto.';

function formatFecha(iso?: string): string {
  if (!iso) return '';
  // El `T12:00:00` evita que el navegador lea la fecha como UTC y la corra
  // un día hacia atrás en la zona de Colombia.
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nombreFinca(e: DatosRemisionEmpresa): string {
  return e.razonSocial || e.nombre || 'Finca';
}

/** Etiqueta pequeña en verde, como el texto preimpreso del talonario. */
function etiqueta(doc: jsPDF, texto: string, x: number, y: number): void {
  doc.setTextColor(...C.primary);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(texto, x, y);
}

/** Valor escrito sobre la casilla, recortado al ancho disponible. */
function valor(doc: jsPDF, texto: string | undefined, x: number, y: number, ancho: number): void {
  if (!texto) return;
  doc.setTextColor(...C.darkText);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(texto, ancho)[0] as string, x, y);
}

/**
 * Casilla con la etiqueta y el valor en la misma línea, como en el papel.
 * `anchoEtiqueta` reserva el espacio del texto preimpreso.
 */
function celdaInline(
  doc: jsPDF,
  label: string,
  texto: string | undefined,
  x: number,
  yTop: number,
  ancho: number,
  anchoEtiqueta: number,
): void {
  etiqueta(doc, label, x + 2, yTop + 7);
  valor(doc, texto, x + 2 + anchoEtiqueta, yTop + 7, ancho - anchoEtiqueta - 4);
}

/**
 * Casilla con la etiqueta arriba y el valor debajo. Se usa donde el valor no
 * cabe al lado de la etiqueta: un nombre completo en media casilla se montaba
 * sobre la fila siguiente.
 */
function celdaApilada(
  doc: jsPDF,
  label: string,
  texto: string | undefined,
  x: number,
  yTop: number,
  ancho: number,
): void {
  etiqueta(doc, label, x + 2, yTop + 4.5);
  valor(doc, texto, x + 2, yTop + 9, ancho - 4);
}

/**
 * Membrete de la finca y número de remisión, debajo de la cabecera verde del
 * sistema. Es la información del preimpreso que la cabecera no cubre.
 */
function membrete(doc: jsPDF, e: DatosRemisionEmpresa, remision: string, y: number): number {
  const alto = 22;
  const anchoCaja = 56;

  doc.setTextColor(...C.darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(nombreFinca(e), ANCHO - anchoCaja - 8)[0] as string, M, y + 6);

  const lineas = [
    [e.direccion, [e.municipio, e.departamento].filter(Boolean).join(' - ')].filter(Boolean).join(' · '),
    [
      [e.telefono, e.telefonoFijo].filter(Boolean).map((t) => `Cel: ${t}`).join('  '),
      e.nit ? `NIT ${e.nit}` : '',
    ].filter(Boolean).join('  ·  '),
  ].filter(Boolean) as string[];

  doc.setTextColor(...C.gray);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  lineas.forEach((linea, i) => {
    doc.text(doc.splitTextToSize(linea, ANCHO - anchoCaja - 8)[0] as string, M, y + 12 + i * 4.5);
  });

  // Número de remisión: lo primero que busca quien recibe el papel.
  const xCaja = M + ANCHO - anchoCaja;
  doc.setTextColor(...C.primary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REMISIÓN N°', M + ANCHO, y + 3, { align: 'right' });

  doc.setFillColor(...C.primaryLight);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(xCaja, y + 5, anchoCaja, 14, 3, 3, 'FD');
  doc.setFontSize(14);
  doc.text(remision, xCaja + anchoCaja / 2, y + 14.5, { align: 'center' });

  doc.setTextColor(...C.darkText);
  return y + alto;
}

/**
 * Rejilla de datos: tres filas a la izquierda (destinatario y transportador) y
 * cinco casillas a la derecha. Las que van en blanco se llenan a mano al
 * entregar.
 */
function rejillaDatos(doc: jsPDF, v: DatosRemisionViaje, y: number): number {
  const alto = FILA * 3;
  const xDer = M + COL_IZQ;

  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.3);
  doc.rect(M, y, ANCHO, alto, 'S');
  for (let i = 1; i < 3; i++) doc.line(M, y + FILA * i, M + ANCHO, y + FILA * i);
  doc.line(xDer, y, xDer, y + alto);
  // Las dos últimas filas de la derecha van partidas en dos casillas.
  doc.line(xDer + MITAD_DER, y + FILA, xDer + MITAD_DER, y + alto);

  const fila = (n: number) => y + FILA * n;

  celdaInline(doc, 'Señor(es):', v.extractora, M, fila(0), COL_IZQ, 22);
  celdaInline(doc, 'Dirección:', v.extractoraUbicacion || 'Planta extractora', M, fila(1), COL_IZQ, 22);
  celdaInline(doc, 'Transportador:', v.transportador, M, fila(2), COL_IZQ, 28);

  celdaInline(doc, 'Fecha:', formatFecha(v.fecha), xDer, fila(0), COL_DER, 16);
  celdaInline(doc, 'Teléfono:', undefined, xDer, fila(1), MITAD_DER, 18);
  celdaInline(doc, 'Ciudad:', undefined, xDer + MITAD_DER, fila(1), MITAD_DER, 16);
  celdaApilada(doc, 'Conductor:', v.conductor, xDer, fila(2), MITAD_DER);
  celdaApilada(doc, 'Placa Vehículo:', v.placaVehiculo, xDer + MITAD_DER, fila(2), MITAD_DER);

  doc.setTextColor(...C.darkText);
  return y + alto;
}

/**
 * Tabla de artículos con la cabecera en verde y el cuerpo reglado.
 *
 * Los renglones van salteados como en el papel: el artículo, la finca y el
 * remitente ocupan tres líneas separadas y el resto queda en blanco para
 * escribir a mano.
 */
function tablaArticulos(
  doc: jsPDF,
  v: DatosRemisionViaje,
  e: DatosRemisionEmpresa,
  y: number,
): number {
  const altoCabecera = 10;
  const xCant = M + COL_REF;
  const xDesc = xCant + COL_CANT;

  doc.setFillColor(...C.primary);
  doc.rect(M, y, ANCHO, altoCabecera, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REFERENCIA', M + COL_REF / 2, y + 6.5, { align: 'center' });
  doc.text('CANTIDAD', xCant + COL_CANT / 2, y + 6.5, { align: 'center' });
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', xDesc + (ANCHO - COL_REF - COL_CANT) / 2, y + 6.5, { align: 'center' });

  const yCuerpo = y + altoCabecera;
  const altoTotal = ALTO_CUERPO * FILAS_CUERPO;
  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.3);
  doc.rect(M, yCuerpo, ANCHO, altoTotal, 'S');
  for (let i = 1; i < FILAS_CUERPO; i++) {
    doc.line(M, yCuerpo + ALTO_CUERPO * i, M + ANCHO, yCuerpo + ALTO_CUERPO * i);
  }
  doc.line(xCant, yCuerpo, xCant, yCuerpo + altoTotal);
  doc.line(xDesc, yCuerpo, xDesc, yCuerpo + altoTotal);

  const linea = (i: number) => yCuerpo + ALTO_CUERPO * i + 7;

  doc.setTextColor(...C.darkText);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('1', xCant + COL_CANT / 2, linea(1), { align: 'center' });
  doc.text('Viaje de Fruto de Palma de Aceite', xDesc + 6, linea(1));
  doc.text(nombreFinca(e), xDesc + 6, linea(3));
  if (e.representante) doc.text(`De: ${e.representante}`, xDesc + 6, linea(5));

  // Los gajos son el estimado del despacho, no el peso: van en REFERENCIA.
  if (v.gajosEstimados) {
    doc.setFontSize(8);
    doc.text(`${v.gajosEstimados} gajos`, M + COL_REF / 2, linea(1), { align: 'center' });
  }

  return yCuerpo + altoTotal;
}

/** Fila del TOTAL y renglón de "SON" para el valor en letras. */
function totalYSon(doc: jsPDF, y: number): number {
  const altoTotal = 13;
  const anchoTotal = 62;
  const xTotal = M + ANCHO - anchoTotal;

  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.3);
  doc.rect(M, y, ANCHO, altoTotal, 'S');
  doc.line(xTotal, y, xTotal, y + altoTotal);

  doc.setFillColor(...C.primaryLight);
  doc.rect(xTotal + 0.3, y + 0.3, anchoTotal - 0.6, altoTotal - 0.6, 'F');
  doc.setTextColor(...C.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL $', xTotal + 6, y + 8.8);

  const ySon = y + altoTotal;
  doc.setDrawColor(...BORDE);
  doc.rect(M, ySon, ANCHO, FILA, 'S');
  etiqueta(doc, 'SON:', M + 2, ySon + 7);

  doc.setTextColor(...C.darkText);
  return ySon + FILA;
}

/**
 * Banda de cierre: las tres firmas, las casillas de bultos y peso, y las
 * observaciones. Es la parte que se diligencia al entregar.
 */
function bandaCierre(doc: jsPDF, v: DatosRemisionViaje, y: number): number {
  const alto = 30;
  const anchoFirma = 40;
  const anchoPesos = 36;
  const anchoObs = ANCHO - anchoFirma * 3 - anchoPesos;

  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.3);
  doc.rect(M, y, ANCHO, alto, 'S');

  const cortes = [
    M + anchoFirma,
    M + anchoFirma * 2,
    M + anchoFirma * 3,
    M + anchoFirma * 3 + anchoPesos,
  ];
  cortes.forEach((x) => doc.line(x, y, x, y + alto));
  // La columna de bultos y peso va partida en dos casillas.
  doc.line(cortes[2], y + alto / 2, cortes[3], y + alto / 2);

  etiqueta(doc, 'DESPACHADO POR:', M + 2, y + 5);
  etiqueta(doc, 'TRANSPORTADO POR:', cortes[0] + 2, y + 5);
  etiqueta(doc, 'RECIBIDO POR:', cortes[1] + 2, y + 5);
  etiqueta(doc, 'CAJAS, BULTOS, ETC', cortes[2] + 2, y + 5);
  etiqueta(doc, 'PESO TOTAL', cortes[2] + 2, y + alto / 2 + 5);
  etiqueta(doc, 'OBSERVACIONES', cortes[3] + 2, y + 5);

  if (v.observaciones) {
    doc.setTextColor(...C.darkText);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(v.observaciones, anchoObs - 4).slice(0, 4), cortes[3] + 2, y + 10);
  }

  doc.setTextColor(...C.darkText);
  return y + alto;
}

export async function descargarRemision(
  viaje: DatosRemisionViaje,
  empresa: DatosRemisionEmpresa = {},
): Promise<void> {
  await asegurarLogoEmpresa(empresa.logoUrl);

  const doc = new jsPDF();

  // Cabecera del sistema: logo de Palmapp, logo de la finca si está cargado
  // y el título. Es lo que identifica a todos los descargables de la app.
  pdfHeader(doc, 'REMISIÓN DE ENTREGA', `Viaje ${viaje.remision}`);

  let y = 42;
  y = membrete(doc, empresa, viaje.remision, y) + 4;
  y = rejillaDatos(doc, viaje, y);
  y = tablaArticulos(doc, viaje, empresa, y);
  y = totalYSon(doc, y);
  bandaCierre(doc, viaje, y);

  pdfFooter(doc, NOTA_LEGAL);
  doc.save(`remision_${viaje.remision}.pdf`);
}
