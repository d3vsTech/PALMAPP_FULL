/**
 * Inicio de la barra superior en celular: botón de volver o logo, y el título
 * del módulo.
 *
 * En una pantalla principal no hay a dónde volver, así que va el logo y el
 * título aparece solo al desplazarse, cuando el título grande ya salió de
 * vista. En una pantalla de detalle manda la flecha.
 */
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PalmappLogo } from '../common/PalmappLogo';
import { useDestinoVolver } from './shellState';
import { cn } from '../lib/utils';

interface InicioBarraMovilProps {
  /** Nombre del módulo. En las pantallas principales aparece al desplazarse. */
  titulo?: ReactNode;
  /** Segmentos de la ruta en una pantalla principal: 1 en la finca (/viajes), 2 en los portales (/proveedor/pedidos). */
  nivelRaiz?: number;
}

export default function InicioBarraMovil({ titulo, nivelRaiz = 1 }: InicioBarraMovilProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const destino = useDestinoVolver();
  const ref = useRef<HTMLSpanElement>(null);
  const [pasoTitulo, setPasoTitulo] = useState(false);

  const segmentos = pathname.split('/').filter(Boolean);
  const puedeVolver = Boolean(destino) || segmentos.length > nivelRaiz;

  useEffect(() => {
    const scroller = ref.current?.closest('main');
    if (!scroller) return;
    const alMover = () => setPasoTitulo(scroller.scrollTop > 56);
    alMover();
    scroller.addEventListener('scroll', alMover, { passive: true });
    return () => scroller.removeEventListener('scroll', alMover);
  }, []);

  const volver = () => {
    if (destino) navigate(destino);
    else if (window.history.state?.idx > 0) navigate(-1);
    else navigate(`/${segmentos.slice(0, nivelRaiz).join('/')}`);
  };

  return (
    <>
      {puedeVolver && (
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted md:hidden"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      <PalmappLogo
        variant="isotipo"
        className={cn('h-7 w-auto lg:hidden', puedeVolver ? 'hidden md:block' : 'ml-2 mr-1.5 md:m-0')}
        alt=""
      />
      {titulo && (
        <span
          ref={ref}
          className={cn(
            'truncate text-[17px] font-semibold text-foreground transition-opacity duration-150 md:hidden',
            !puedeVolver && !pasoTitulo && 'opacity-0',
          )}
        >
          {titulo}
        </span>
      )}
    </>
  );
}
