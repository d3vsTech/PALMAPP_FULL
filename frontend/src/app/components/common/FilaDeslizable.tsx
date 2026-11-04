/**
 * Fila de tarjetas que se desliza de lado.
 *
 * Con el dedo basta con arrastrar, pero con mouse no: la barra va oculta y la
 * rueda solo mueve vertical. Por eso la fila trae flechas, y cada una aparece
 * nada más cuando hay algo hacia ese lado.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilaDeslizableProps {
  children: ReactNode;
  /** Etiqueta para quien navega con lector de pantalla. */
  etiqueta: string;
  className?: string;
}

export function FilaDeslizable({ children, etiqueta, className }: FilaDeslizableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hayAntes, setHayAntes] = useState(false);
  const [hayDespues, setHayDespues] = useState(false);

  const revisar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHayAntes(el.scrollLeft > 4);
    setHayDespues(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    revisar();
    el.addEventListener('scroll', revisar, { passive: true });
    // El contenido cambia de ancho al abrir el menú o al quitar una tarjeta.
    const observador = new ResizeObserver(revisar);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', revisar);
      observador.disconnect();
    };
  }, [revisar, children]);

  const mover = (direccion: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/fila relative', className)}>
      <div
        ref={ref}
        role="group"
        aria-label={etiqueta}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide px-1 pb-1 md:gap-4"
      >
        {children}
      </div>

      {hayAntes && (
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Ver anteriores"
          className="absolute -left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground md:flex"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
      )}

      {hayDespues && (
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label="Ver siguientes"
          className="absolute -right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground md:flex"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
