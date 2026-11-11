import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Compass } from 'lucide-react';
import { EVT_TOURS_VISTOS, iniciarTour, toursVistos } from './tourEngine';
import { tourParaRuta } from './tours';

/**
 * Botón "Iniciar tour" de la barra superior. El tour nunca arranca solo:
 * solo con este botón. Un punto lima avisa que la guía de esta pantalla aún no se ha visto.
 */
export default function BotonTour() {
  const { pathname, search } = useLocation();
  const tour = tourParaRuta(pathname, search);
  const [vistos, setVistos] = useState<string[]>(toursVistos);

  useEffect(() => {
    const on = () => setVistos(toursVistos());
    window.addEventListener(EVT_TOURS_VISTOS, on);
    return () => window.removeEventListener(EVT_TOURS_VISTOS, on);
  }, []);

  const nuevo = !vistos.includes(tour.id);

  return (
    <button
      type="button"
      data-tour-boton
      onClick={() => iniciarTour(tour)}
      title={`Conoce esta pantalla: ${tour.nombre}`}
      className="relative flex h-11 w-11 items-center justify-center gap-2 rounded-full px-2.5 md:h-9 md:w-auto md:rounded-[10px] text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Compass className="h-[18px] w-[18px]" strokeWidth={2} />
      <span className="hidden lg:inline">Iniciar tour</span>
      {nuevo && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background lg:static lg:ring-0" aria-label="Tour sin ver" />
      )}
    </button>
  );
}
