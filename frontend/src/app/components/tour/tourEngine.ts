import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// Motor del tour guiado de PalmApp (driver.js, licencia MIT).
// Los pasos ubican los elementos por lo que ya muestra la pantalla (texto de un botón,
// título de una sección, la tabla o los indicadores), así no hace falta tocar las páginas.
// Si un elemento no existe o no está visible (por ejemplo el menú lateral en el celular),
// el paso se omite.

export type Buscador = () => Element | null | undefined;

export interface PasoTour {
  /** Elemento a resaltar. Sin elemento, el paso sale centrado en la pantalla. */
  donde?: Buscador | Buscador[];
  titulo: string;
  texto: string;
  lado?: 'top' | 'right' | 'bottom' | 'left';
}

export interface Tour {
  id: string;
  nombre: string;
  pasos: PasoTour[];
}

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const main = () => document.querySelector('main');

function visible(el: Element | null | undefined): el is Element {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}

const tarjeta = (el: Element | null | undefined) =>
  el ? el.closest('[data-slot="card"], section') ?? el.parentElement : null;

// ---------- Buscadores reutilizables ----------

/** Botón o enlace del contenido cuyo texto empieza por `texto`. */
export const boton = (texto: string): Buscador => () =>
  [...(main()?.querySelectorAll('button, a') ?? [])].find(
    e => norm(e.textContent).startsWith(norm(texto)) && visible(e)
  );

/** Tarjeta o sección que contiene un título que empieza por `texto`. */
export const seccion = (texto: string): Buscador => () => {
  const titulos = [...(main()?.querySelectorAll('h1, h2, h3, h4') ?? [])];
  const h =
    titulos.find(e => norm(e.textContent) === norm(texto)) ??
    titulos.find(e => norm(e.textContent).startsWith(norm(texto)));
  return tarjeta(h);
};

/** Campo de texto por el inicio de su placeholder. */
export const campo = (placeholder: string): Buscador => () =>
  [...(main()?.querySelectorAll('input, textarea') ?? [])].find(e =>
    norm((e as HTMLInputElement).placeholder).startsWith(norm(placeholder))
  );

/** El bloque más pequeño del contenido que contiene todos estos textos (sirve para los pasos de un asistente). */
export const bloqueCon = (...textos: string[]): Buscador => () => {
  const buscados = textos.map(norm);
  let mejor: Element | undefined;
  let largo = Infinity;
  for (const e of main()?.querySelectorAll('*') ?? []) {
    const t = norm(e.textContent);
    if (t.length < largo && buscados.every(b => t.includes(b)) && visible(e)) {
      mejor = e;
      largo = t.length;
    }
  }
  return mejor;
};

/** Selector genérico dentro del contenido. */
export const en = (selector: string): Buscador => () => main()?.querySelector(selector);

/** Los indicadores de la pantalla. */
export const indicadores: Buscador = () => main()?.querySelector('dl');

/** La primera tabla de la pantalla, con su tarjeta. */
export const tabla: Buscador = () => tarjeta(main()?.querySelector('table'));

/** Las pestañas de la pantalla. */
export const pestanas: Buscador = () => main()?.querySelector('[role="tablist"]');

/** Cabecera de la pantalla (título, descripción y acciones). */
export const cabecera: Buscador = () => main()?.querySelector('header:not([class*="sticky"])');

/** Menú lateral en escritorio o barra inferior en el celular. */
export const menu: Buscador[] = [
  () => document.querySelector('aside nav'),
  () => document.querySelector('nav[aria-label="Navegación principal"]'),
];

/** Buscador rápido de la barra superior. */
export const buscadorRapido: Buscador[] = [
  () => [...document.querySelectorAll('header button')].find(b => norm(b.textContent).startsWith('buscar')),
  () => document.querySelector('header button[aria-label="Buscar"]'),
];

/** Botón "Iniciar tour". */
export const botonTour: Buscador = () =>
  [...document.querySelectorAll('[data-tour-boton]')].find(visible);

// ---------- Ejecución ----------

function resolver(donde: PasoTour['donde']): Element | undefined {
  if (!donde) return undefined;
  const lista = Array.isArray(donde) ? donde : [donde];
  for (const f of lista) {
    const el = f();
    if (visible(el)) return el;
  }
  return undefined;
}

const KEY_VISTOS = 'palmapp:tours-vistos';

export function toursVistos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_VISTOS) ?? '[]');
  } catch {
    return [];
  }
}

function marcarVisto(id: string) {
  try {
    const v = new Set(toursVistos());
    v.add(id);
    localStorage.setItem(KEY_VISTOS, JSON.stringify([...v]));
    window.dispatchEvent(new Event(KEY_VISTOS));
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
}

export const EVT_TOURS_VISTOS = KEY_VISTOS;

export function iniciarTour(tour: Tour) {
  const pasos: DriveStep[] = [];
  for (const p of tour.pasos) {
    const el = resolver(p.donde);
    if (p.donde && !el) continue; // el elemento no está en esta vista: se omite
    pasos.push({
      element: el,
      popover: {
        title: p.titulo,
        description: p.texto,
        side: p.lado,
        align: 'start',
      },
    });
  }
  if (pasos.length === 0) return;

  const d = driver({
    steps: pasos,
    showProgress: pasos.length > 1,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Terminar',
    popoverClass: 'palmapp-tour',
    overlayColor: '#0F2116',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: true,
    onDestroyed: () => marcarVisto(tour.id),
  });
  d.drive();
}
