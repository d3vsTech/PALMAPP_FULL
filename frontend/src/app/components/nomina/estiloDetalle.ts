/**
 * Clases de las tablas de detalle de nómina (ausencias, descansos, faltas y
 * vacaciones). Dos variantes:
 *  - `default`: dentro de una tarjeta en pantalla, como las tablas del diseño.
 *  - `compact`: dentro del desprendible, como su "Detalle de días trabajados".
 */
export type VarianteDetalle = 'default' | 'compact';

export interface EstiloDetalle {
  titulo: string;
  marco: string;
  tabla: string;
  encabezado: string;
  th: string;
  td: string;
  pie: string;
  nota: string;
}

const PANTALLA: EstiloDetalle = {
  // Sin clases de tamaño: el h4 del tema es el mismo de los bloques por
  // actividad del "Resumen de trabajo" del diseño.
  titulo: 'mb-2',
  marco: 'overflow-x-auto rounded-lg border border-border',
  tabla: 'w-full text-sm',
  encabezado: 'bg-muted/60 text-[13px] font-medium text-muted-foreground',
  th: 'whitespace-nowrap px-4 py-2.5 font-semibold',
  td: 'px-4 py-2.5 align-top',
  pie: 'border-t border-border bg-muted/60 font-semibold text-foreground',
  nota: 'mt-2 text-xs text-muted-foreground',
};

const PAPEL: EstiloDetalle = {
  // `font-sans`: el rótulo del diseño es un <p>, no un encabezado.
  titulo: 'mb-2 font-sans text-[13px] font-medium text-muted-foreground',
  marco: 'overflow-x-auto',
  tabla: 'w-full text-xs',
  encabezado: 'border-b border-border text-muted-foreground',
  th: 'whitespace-nowrap px-2 py-1.5 font-semibold first:pl-0 last:pr-0',
  td: 'px-2 py-1.5 align-top first:pl-0 last:pr-0',
  pie: 'border-t border-foreground/40 font-semibold',
  nota: 'mt-2 text-xs text-muted-foreground',
};

export function estiloDetalle(variante: VarianteDetalle = 'default'): EstiloDetalle {
  return variante === 'compact' ? PAPEL : PANTALLA;
}
