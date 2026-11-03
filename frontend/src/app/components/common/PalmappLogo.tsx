import { HORIZONTAL, ISOTIPO, LEMA, PALABRA, VERTICAL } from './palmappMarca';

type Variante = 'complete' | 'isotipo' | 'wordmark' | 'vertical';
/**
 * color: verde oscuro y verde claro de la marca (en modo oscuro las hojas y el texto pasan a crema).
 * blanco: para fondos oscuros (hojas y texto blancos, rombo verde claro).
 * mono: un solo color, el del texto que lo rodea (currentColor).
 */
type Tono = 'color' | 'blanco' | 'mono';

interface PalmappLogoProps {
  variant?: Variante;
  tono?: Tono;
  /** Solo en la versión vertical: muestra "Gestión inteligente para palmicultores". */
  conLema?: boolean;
  className?: string;
  alt?: string;
}

const COLORES: Record<Tono, { hojas: string; rombo: string; texto: string }> = {
  color: { hojas: 'var(--logo-oscuro)', rombo: 'var(--logo-claro)', texto: 'var(--logo-oscuro)' },
  blanco: { hojas: '#FFFFFF', rombo: 'var(--logo-claro)', texto: '#FFFFFF' },
  mono: { hojas: 'currentColor', rombo: 'currentColor', texto: 'currentColor' },
};

/** Logo de PalmApp en vector: nítido a cualquier tamaño. */
export function PalmappLogo({ variant = 'complete', tono = 'color', conLema = true, className = '', alt = 'PalmApp' }: PalmappLogoProps) {
  const c = COLORES[tono];
  const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
  const simbolo = (
    <>
      <path fill={c.hojas} d={ISOTIPO.hojas} />
      <path fill={c.rombo} d={ISOTIPO.rombo} />
    </>
  );

  if (variant === 'isotipo') {
    return (
      <svg viewBox={ISOTIPO.viewBox} className={className} {...a11y}>
        {simbolo}
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return (
      <svg viewBox={PALABRA.viewBox} className={className} {...a11y}>
        <path fill={c.texto} d={PALABRA.d} />
      </svg>
    );
  }

  if (variant === 'vertical') {
    return (
      <svg viewBox={VERTICAL.viewBox} className={className} {...a11y}>
        <g transform={VERTICAL.iso}>{simbolo}</g>
        <path transform={VERTICAL.palabra} fill={c.texto} d={PALABRA.d} />
        {conLema && <path transform={VERTICAL.lema} fill={c.texto} d={LEMA.d} />}
      </svg>
    );
  }

  return (
    <svg viewBox={HORIZONTAL.viewBox} className={className} {...a11y}>
      <g transform={HORIZONTAL.iso}>{simbolo}</g>
      <path transform={HORIZONTAL.palabra} fill={c.texto} d={PALABRA.d} />
    </svg>
  );
}
