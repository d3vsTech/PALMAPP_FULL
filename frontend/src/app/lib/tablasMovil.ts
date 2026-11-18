// En celular las tablas se muestran como tarjetas (estilos en theme.css, "Vista de app").
// Aquí cada celda recibe el título de su columna, sin tocar las pantallas.
// Para dejar una tabla con desplazamiento horizontal: data-tabla="ancha".

/** Con más columnas que estas, la tarjeta sería muy larga: se conserva la tabla. */
const MAX_COLUMNAS = 10;

function etiquetarTabla(tabla: HTMLTableElement) {
  const encabezado = tabla.tHead?.rows[tabla.tHead.rows.length - 1];
  const convertir = Boolean(encabezado) && encabezado!.cells.length <= MAX_COLUMNAS && tabla.dataset.tabla !== 'ancha';

  if (!convertir) {
    delete tabla.dataset.tarjetas;
    return;
  }
  tabla.dataset.tarjetas = '';

  const titulos: string[] = [];
  for (const celda of encabezado!.cells) {
    const texto = celda.textContent?.trim() ?? '';
    // La columna de acciones no necesita título: los íconos ya se entienden.
    const titulo = /^acci[oó]n(es)?$/i.test(texto) ? '' : texto;
    for (let i = 0; i < celda.colSpan; i++) titulos.push(titulo);
  }

  for (const seccion of [...tabla.tBodies, tabla.tFoot]) {
    if (!seccion) continue;
    for (const fila of seccion.rows) {
      let columna = 0;
      for (const celda of fila.cells) {
        const titulo = celda.colSpan > 1 ? '' : titulos[columna] ?? '';
        if (celda.dataset.etiqueta !== titulo) celda.dataset.etiqueta = titulo;
        columna += celda.colSpan;
        // Un solo ícono de acción va en la esquina de la tarjeta, sin ocupar una fila.
        const acciones = titulo === '' && celda !== fila.cells[0] && celda.colSpan === 1 ? celda.querySelectorAll('button, a') : null;
        celda.toggleAttribute('data-accion-unica', acciones?.length === 1 && acciones[0].querySelector(':scope > svg:only-child') !== null);
      }
    }
  }
}

/** Tocar una tarjeta abre su detalle, si la fila tiene el ícono de ver. */
function abrirDetalleDeTarjeta(e: MouseEvent) {
  if (!window.matchMedia('(max-width: 767.98px)').matches) return;
  const objetivo = e.target as Element;
  if (objetivo.closest('a, button, input, select, textarea, label, [role="checkbox"]')) return;
  const fila = objetivo.closest('table[data-tarjetas] > tbody > tr');
  if (!fila || fila.classList.contains('cursor-pointer')) return;
  fila.querySelector('.lucide-eye')?.closest<HTMLElement>('a, button')?.click();
}

export function iniciarTablasMovil() {
  document.addEventListener('click', abrirDetalleDeTarjeta);
  let pendiente = false;
  const revisar = () => {
    pendiente = false;
    document.querySelectorAll('table').forEach(etiquetarTabla);
  };
  const programar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(revisar);
  };
  new MutationObserver(programar).observe(document.body, { childList: true, subtree: true, characterData: true });
  programar();
}
