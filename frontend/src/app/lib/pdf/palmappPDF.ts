/**
 * palmappPDF.ts
 * Utilidad centralizada de generación PDF para Palmapp.
 * Todos los descargables del sistema deben usar estas funciones
 * para garantizar formato, marca y estilo consistentes.
 */

import jsPDF from 'jspdf';
import { configuracionApi } from '../../../api/configuracion';
import palmappIsotipoSrc from '../../../assets/90f63474a4a0ddb51ea409c23fa86e2b485ee0b8.png';
import palmappLogoSrc from '../../../assets/adf2cc8f5c11d4595840726d8165f5dc63d3cec0.png';

// Pre-cargar isotipo para uso en PDF (inyección sincrónica vía HTMLImageElement)
let _isotipo: HTMLImageElement | null = null;
let _logoComplete: HTMLImageElement | null = null;

function _preload(src: string, setter: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => setter(img);
  img.src = src;
  if (img.complete) setter(img);
}
_preload(palmappIsotipoSrc, (img) => { _isotipo = img; });
_preload(palmappLogoSrc,    (img) => { _logoComplete = img; });

// ── Paleta de colores ─────────────────────────────────────────────────────────
export const C = {
  primary:      [22, 101, 52]   as [number, number, number],
  primaryLight: [240, 247, 243] as [number, number, number],
  primaryMid:   [30, 86, 49]    as [number, number, number],
  gray:         [107, 114, 128] as [number, number, number],
  darkText:     [30, 30, 30]    as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  border:       [200, 210, 200] as [number, number, number],
  boxBg:        [248, 250, 252] as [number, number, number],
};

// ── Estilos de autoTable reutilizables ────────────────────────────────────────
export const TABLE_HEAD: object = {
  fillColor:  C.primary,
  textColor:  255,
  fontStyle:  'bold',
  fontSize:   9,
};

export const TABLE_ALT: object = {
  fillColor: C.primaryLight,
};

export const TABLE_FOOT_GREEN: object = {
  fillColor: C.primary,
  textColor: 255,
  fontStyle: 'bold',
  fontSize:  10,
};

// ── Logo de la finca ──────────────────────────────────────────────────────────
/** Donde `pdfHeader` busca el logo de la finca. */
const CLAVE_LOGO = 'palmapp_empresa_logo';
const CLAVE_LOGO_URL = 'palmapp_empresa_logo_url';

/** Host del backend, sin el sufijo `/api`. */
const HOST_BACKEND = String(import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '');

/**
 * Nginx sirve `/storage` sin cabeceras CORS, así que `fetch` contra la URL
 * absoluta del logo se bloquea y el PDF salía solo con el logo de Palmapp.
 *
 * Se pide por `/backend-files`, que es el mismo origen del frontend: lo
 * reescribe el proxy de Vite en dev y el de `public/_redirects` en Netlify.
 * Un `<img src>` no necesita esto (mostrar una imagen de otro origen siempre
 * se permite); leer sus bytes, sí.
 */
function viaProxy(url: string): string {
  if (!HOST_BACKEND || !url.startsWith(HOST_BACKEND)) return url;
  return `/backend-files${url.slice(HOST_BACKEND.length)}`;
}

/** Una sola consulta por sesión, aunque se bajen varios PDF seguidos. */
let _logoEmpresaEnCurso: Promise<void> | null = null;

/**
 * Deja el logo de la finca en el almacenamiento local, que es de donde lo lee
 * `pdfHeader`. Hay que llamarlo (y esperarlo) antes de armar cualquier PDF: si
 * no, el documento sale solo con el logo de Palmapp.
 *
 * Se guarda en base64 porque jsPDF no acepta una URL, necesita los bytes.
 *
 * Nunca interrumpe la descarga: si la imagen no se puede traer o no cabe en el
 * almacenamiento, el PDF sale con el logo de Palmapp y el nombre de la finca.
 *
 * @param logoUrl `info-empresa.logo_url`. Si no se pasa, se consulta solo.
 */
export async function asegurarLogoEmpresa(logoUrl?: string | null): Promise<void> {
  if (logoUrl === undefined) {
    _logoEmpresaEnCurso ??= (async () => {
      try {
        const res = await configuracionApi.infoEmpresa.obtener();
        await asegurarLogoEmpresa(res.data.logo_url);
      } catch {
        // Sin permiso sobre configuración, o la finca no tiene logo cargado.
      }
    })();
    return _logoEmpresaEnCurso;
  }
  if (!logoUrl) return;
  try {
    if (localStorage.getItem(CLAVE_LOGO) && localStorage.getItem(CLAVE_LOGO_URL) === logoUrl) {
      return;
    }
    const res = await fetch(viaProxy(logoUrl));
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

// ── Encabezado Palmapp ────────────────────────────────────────────────────────
/**
 * Dibuja la barra de encabezado verde con el logo de la finca.
 *
 * El logo lo deja `asegurarLogoEmpresa`, que hay que esperar antes de llamar
 * aquí. Sin él sale el de Palmapp.
 * @param doc        Instancia de jsPDF
 * @param docTitle   Título del documento (ej. "LIQUIDACIÓN DE VACACIONES")
 * @param docSubtitle Subtítulo opcional (ej. nombre del colaborador)
 * @returns El ancho de página para uso posterior
 */
export function pdfHeader(doc: jsPDF, docTitle: string, docSubtitle?: string): number {
  const pageW = doc.internal.pageSize.width;

  // Barra verde de fondo
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 36, 'F');

  // ── Logo (izquierda) ───────────────────────────────────────────────────────
  /*
   * Manda el logo de la finca: el documento lo emite ella, no Palmapp. El de
   * Palmapp solo aparece cuando la finca no tiene uno cargado en Configuración,
   * para que la cabecera no quede vacía. Los dos juntos confundían: el acta
   * parecía emitida por el proveedor del software.
   *
   * El logo de la finca va directo sobre la barra verde, sin recuadro blanco
   * detrás. El de Palmapp sí lo necesita: es verde y sobre verde no se vería.
   */
  const logoFinca = localStorage.getItem(CLAVE_LOGO);
  const contW = 72;
  const contX = 8;
  const contY = 5;
  const contH = 26;
  const imgX = contX + 4;
  const imgY = contY + 3;
  const imgH = contH - 6;
  const imgMaxW = contW - 8;
  let logoPintado = false;

  if (logoFinca) {
    try {
      // Sin esto la imagen sale estirada al ancho de la caja: los logos de las
      // fincas no vienen con una proporción fija.
      const props = doc.getImageProperties(logoFinca);
      const escala = Math.min(imgMaxW / props.width, contH / props.height);
      const w = props.width * escala;
      const h = props.height * escala;
      doc.addImage(logoFinca, contX, contY + (contH - h) / 2, w, h);
      logoPintado = true;
    } catch { /* formato que jsPDF no reconoce: cae al logo de Palmapp */ }
  }

  if (!logoPintado) {
    doc.setFillColor(...C.white);
    doc.roundedRect(contX, contY, contW, contH, 3, 3, 'F');
  }

  if (!logoPintado && _logoComplete) {
    const ratio = _logoComplete.naturalWidth / _logoComplete.naturalHeight;
    const w = Math.min(imgH * ratio, imgMaxW);
    try {
      doc.addImage(_logoComplete, 'PNG', imgX, imgY, w, imgH);
      logoPintado = true;
    } catch { /* se intenta con el isotipo */ }
  }

  if (!logoPintado && _isotipo) {
    const ratio = _isotipo.naturalWidth / _isotipo.naturalHeight;
    const isoW = imgH * ratio;
    try {
      doc.addImage(_isotipo, 'PNG', imgX, imgY, isoW, imgH);
      doc.setTextColor(...C.primary);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PALMAPP', imgX + isoW + 3, imgY + imgH * 0.52);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('Tu palma en la palma', imgX + isoW + 3, imgY + imgH * 0.8);
      logoPintado = true;
    } catch { /* se cae al texto */ }
  }

  if (!logoPintado) _drawLogoFallback(doc, imgX, imgY, imgH);

  const titleMaxRight = pageW - 12;

  // ── Título y fecha (texto blanco, a la derecha del logo) ────────────────────
  doc.setTextColor(...C.white);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(docTitle, titleMaxRight, 16, { align: 'right' });

  const genDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  if (docSubtitle) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(docSubtitle, titleMaxRight, 23, { align: 'right' });
    doc.text(`Generado: ${genDate}`, titleMaxRight, 29, { align: 'right' });
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${genDate}`, titleMaxRight, 24, { align: 'right' });
  }

  doc.setTextColor(...C.darkText);
  return pageW;
}

function _drawLogoFallback(doc: jsPDF, x: number, y: number, h: number) {
  // Fallback: texto PALMAPP en verde sobre el fondo blanco del contenedor
  doc.setTextColor(...C.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PALMAPP', x, y + h * 0.58);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Tu palma en la palma', x, y + h * 0.82);
}

// ── Pie de página ─────────────────────────────────────────────────────────────
/**
 * Dibuja la barra de pie verde en la última página.
 * Opcionalmente imprime una nota legal sobre la barra.
 */
export function pdfFooter(doc: jsPDF, legalNote?: string) {
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  if (legalNote) {
    doc.setTextColor(...C.gray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const lines = doc.splitTextToSize(legalNote, pageW - 28);
    doc.text(lines, 14, pageH - 16 - lines.length * 4);
  }

  doc.setFillColor(...C.primary);
  doc.rect(0, pageH - 10, pageW, 10, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Palmapp · Tu palma en la palma · Colombia', 14, pageH - 3.5);
  doc.text(new Date().toLocaleDateString('es-CO'), pageW - 14, pageH - 3.5, { align: 'right' });

  doc.setTextColor(...C.darkText);
}

// ── Título de sección ─────────────────────────────────────────────────────────
/**
 * Dibuja un título de sección con línea divisora verde.
 * @returns La nueva posición Y (lista para el siguiente elemento)
 */
export function pdfSectionTitle(doc: jsPDF, title: string, y: number): number {
  const pageW = doc.internal.pageSize.width;
  doc.setTextColor(...C.primary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, pageW - 14, y + 2);
  doc.setTextColor(...C.darkText);
  return y + 10;
}

// ── Caja de total / neto a pagar ──────────────────────────────────────────────
/**
 * Dibuja una barra verde con etiqueta y valor (para totales destacados).
 * @returns La nueva posición Y
 */
export function pdfTotalBox(doc: jsPDF, label: string, value: string, y: number): number {
  const pageW = doc.internal.pageSize.width;
  doc.setFillColor(...C.primary);
  doc.roundedRect(14, y, pageW - 28, 14, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(label, 20, y + 9.5);
  doc.text(value, pageW - 20, y + 9.5, { align: 'right' });
  doc.setTextColor(...C.darkText);
  return y + 20;
}

// ── Bloque de firmas ──────────────────────────────────────────────────────────
/**
 * Dibuja dos cuadros de firma lado a lado (empleador / colaborador o similar).
 * Si `nombre` tiene valor, se preimprime el nombre en el cuadro.
 * @returns La nueva posición Y tras las cajas
 */
export function pdfSignatureBlock(
  doc: jsPDF,
  left:  { titulo: string; nombre?: string; cedula?: string },
  right: { titulo: string; nombre?: string; cedula?: string },
  y: number,
): number {
  const pageW = doc.internal.pageSize.width;
  const boxW  = 82;
  const boxH  = 64;
  const lx    = 14;
  const rx    = pageW - 14 - boxW;

  const drawBox = (x: number, titulo: string, nombre?: string, cedula?: string) => {
    // Fondo
    doc.setFillColor(...C.boxBg);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');

    // Barra de título verde
    doc.setFillColor(...C.primary);
    doc.roundedRect(x, y, boxW, 10, 2, 2, 'F');
    doc.rect(x, y + 6, boxW, 4, 'F'); // rellenar esquinas inferiores del rounded
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, x + boxW / 2, y + 7, { align: 'center' });

    // Línea de firma
    const sigY = y + 28;
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.4);
    doc.line(x + 8, sigY, x + boxW - 8, sigY);
    doc.setTextColor(...C.gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma', x + boxW / 2, sigY + 4, { align: 'center' });

    // Línea de nombre
    const nameY = y + 44;
    doc.line(x + 8, nameY, x + boxW - 8, nameY);
    if (nombre) {
      doc.setTextColor(...C.darkText);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      // Truncar si es muy largo
      const maxW = boxW - 16;
      const truncated = doc.getTextWidth(nombre) > maxW
        ? nombre.substring(0, 20) + '...'
        : nombre;
      doc.text(truncated, x + boxW / 2, nameY - 2.5, { align: 'center' });
    }
    doc.setTextColor(...C.gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(cedula ? `CC: ${cedula}` : 'Nombre y CC', x + boxW / 2, nameY + 4, { align: 'center' });

    // Línea de fecha
    const dateY = y + 57;
    doc.line(x + 8, dateY, x + boxW - 8, dateY);
    doc.text('Fecha', x + boxW / 2, dateY + 4, { align: 'center' });
  };

  drawBox(lx, left.titulo,  left.nombre,  left.cedula);
  drawBox(rx, right.titulo, right.nombre, right.cedula);

  doc.setTextColor(...C.darkText);
  return y + boxH + 8;
}

// ── Chip de tipo/estado ────────────────────────────────────────────────────────
/**
 * Dibuja un recuadro con fondo tenue y texto de tipo/categoría.
 * Útil para identificar el tipo de documento de un vistazo.
 */
export function pdfChip(doc: jsPDF, label: string, fecha: string, y: number): number {
  const pageW = doc.internal.pageSize.width;
  doc.setFillColor(...C.primaryLight);
  doc.roundedRect(14, y - 6, pageW - 28, 18, 2, 2, 'F');
  doc.setTextColor(...C.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), 22, y + 5);
  doc.setTextColor(...C.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(fecha, pageW - 20, y + 5, { align: 'right' });
  doc.setTextColor(...C.darkText);
  return y + 18;
}
