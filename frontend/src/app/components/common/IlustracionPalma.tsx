import { cn } from '../lib/utils';

type Variante = 'palma' | 'busqueda' | 'documento';

interface Props {
  variante?: Variante;
  className?: string;
}

/**
 * Ilustración de línea para estados vacíos, con la hoja de palma de la marca.
 * Usa currentColor para el trazo y los tokens del sistema para los rellenos.
 */
export default function IlustracionPalma({ variante = 'palma', className }: Props) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden
      className={cn('h-24 w-32 text-primary', className)}
    >
      <ellipse cx="80" cy="104" rx="56" ry="8" className="fill-muted" />
      {variante === 'palma' && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M80 102V46" stroke="currentColor" strokeWidth="3" />
          <path d="M80 50c-6-14-20-22-36-20 6 12 20 20 36 20Z" className="fill-primary-soft" stroke="currentColor" strokeWidth="2.5" />
          <path d="M80 50c6-14 20-22 36-20-6 12-20 20-36 20Z" className="fill-primary-soft" stroke="currentColor" strokeWidth="2.5" />
          <path d="M80 66c-8-10-22-14-34-10 7 9 20 13 34 10Z" className="fill-accent/40" stroke="currentColor" strokeWidth="2.5" />
          <path d="M80 66c8-10 22-14 34-10-7 9-20 13-34 10Z" className="fill-accent/40" stroke="currentColor" strokeWidth="2.5" />
          <path d="M80 46c-3-10-1-20 0-26 1 6 3 16 0 26Z" className="fill-primary-soft" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="124" cy="24" r="3" className="fill-accent" />
          <circle cx="36" cy="72" r="2.5" className="fill-accent" />
        </g>
      )}
      {variante === 'busqueda' && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="72" cy="56" r="26" className="fill-primary-soft" stroke="currentColor" strokeWidth="3" />
          <path d="M91 75l20 20" stroke="currentColor" strokeWidth="5" />
          <path d="M72 70V50" stroke="currentColor" strokeWidth="2.5" />
          <path d="M72 54c-3-7-10-10-17-9 3 6 10 9 17 9ZM72 54c3-7 10-10 17-9-3 6-10 9-17 9Z" className="fill-accent/40" stroke="currentColor" strokeWidth="2" />
          <circle cx="122" cy="30" r="3" className="fill-accent" />
        </g>
      )}
      {variante === 'documento' && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <rect x="52" y="22" width="56" height="74" rx="8" className="fill-card" stroke="currentColor" strokeWidth="3" />
          <path d="M64 42h32M64 54h32M64 66h20" stroke="currentColor" strokeWidth="2.5" className="opacity-60" />
          <path d="M100 84V70" stroke="currentColor" strokeWidth="2.5" />
          <path d="M100 74c-3-6-9-9-15-8 3 5 9 8 15 8ZM100 74c3-6 9-9 15-8-3 5-9 8-15 8Z" className="fill-accent/50" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="34" r="3" className="fill-accent" />
        </g>
      )}
    </svg>
  );
}

/** Elige la ilustración según el texto del estado vacío: búsqueda sin resultados o lista vacía. */
export function varianteParaVacio(texto: string): Variante {
  return /result|coincid|encontr|búsqueda|busqueda|filtro/i.test(texto) ? 'busqueda' : 'palma';
}
