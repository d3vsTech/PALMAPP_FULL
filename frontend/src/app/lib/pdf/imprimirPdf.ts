/**
 * Manda a la impresora el PDF del backend, no la pantalla.
 *
 * Los botones "Imprimir" llamaban a `window.print()`, que imprime el HTML de
 * la vista: salía el menú lateral, los botones y los colores del navegador, un
 * pantallazo del sitio en vez del documento. Aquí se carga el mismo archivo
 * que baja el botón "Descargar PDF" en un marco oculto y la impresión sale de
 * ahí, así que el papel es idéntico al PDF.
 *
 * El marco se queda en el documento mientras dura el diálogo: quitarlo antes
 * lo cierra en Chrome. Cada impresión limpia el de la anterior.
 */

/** Un solo marco a la vez; el id permite reemplazarlo sin acumularlos. */
const ID_MARCO = 'palmapp-impresion-pdf';

/**
 * Carga el PDF y abre el diálogo de impresión del navegador.
 *
 * Si el navegador no trae visor de PDF embebido no hay diálogo que abrir, así
 * que el archivo se abre en una pestaña y el usuario imprime desde ella.
 */
export function imprimirPdf(blob: Blob): void {
  document.getElementById(ID_MARCO)?.remove();

  const url = URL.createObjectURL(blob);
  const marco = document.createElement('iframe');
  marco.id = ID_MARCO;
  // Fuera de la vista pero con tamaño: con `display:none` Chrome no carga el
  // visor y el marco nunca dispara `load`.
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
  marco.src = url;

  marco.onload = () => {
    try {
      marco.contentWindow?.focus();
      marco.contentWindow?.print();
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  document.body.appendChild(marco);
  // El objeto no se puede soltar hasta que el visor termine de leerlo.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
