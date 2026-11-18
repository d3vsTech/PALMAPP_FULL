/**
 * Marco de la aplicación.
 *
 * La app vive dentro de un marco verde casi negro y el contenido es una hoja
 * clara con esquinas de 20 px (SISTEMA_VISUAL.md). El scroll vive en el
 * `main`, no en la ventana, para que la barra superior pueda pegarse.
 *
 * En celular hay una barra de módulos abajo, así que el contenido reserva
 * espacio para no quedar debajo de ella. En un formulario esa barra se
 * esconde y el espacio sobra, por eso el relleno depende de la ruta.
 */
import { ReactNode } from 'react';
import { useLocation } from 'react-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';
import AvisoSinSenal from './AvisoSinSenal';
import { esPantallaFormulario } from './shellState';
import { cn } from '../lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    // `data-barra-volver` lo lee PageHeader para esconder su flecha en celular
    // cuando la barra superior ya trae una.
    <div data-barra-volver className="group/shell flex h-dvh overflow-hidden bg-frame">
      <Sidebar />
      {/* `min-w-0`: un hijo de flex no baja de su ancho de contenido a menos
          que se le diga. Sin esto una tabla ancha estira esta columna y
          empuja la página entera, que es lo que se ve cortado. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:my-2.5 lg:mr-2.5 lg:rounded-[20px]">
        <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
          <Topbar />
          <AvisoSinSenal />
          {/* La `key` reinicia la animación de entrada en cada pantalla. */}
          <div
            key={location.pathname}
            className={cn(
              'pagina-entra mx-auto w-full max-w-[1440px] px-5 pt-3 md:px-8 md:pb-28 lg:pb-10',
              esPantallaFormulario(location.pathname)
                ? 'pb-6'
                : 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]',
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
