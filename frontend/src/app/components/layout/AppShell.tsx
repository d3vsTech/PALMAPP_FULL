/**
 * Marco de la aplicación.
 *
 * La app vive dentro de un marco verde casi negro y el contenido es una hoja
 * clara con esquinas de 20 px (SISTEMA_VISUAL.md). El scroll vive en el
 * `main`, no en la ventana, para que la barra superior pueda pegarse.
 */
import { ReactNode } from 'react';
import { useLocation } from 'react-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="flex h-dvh overflow-hidden bg-frame">
      <Sidebar />
      {/* `min-w-0`: un hijo de flex no baja de su ancho de contenido a menos
          que se le diga. Sin esto una tabla ancha estira esta columna y
          empuja la página entera, que es lo que se ve cortado. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:my-2.5 lg:mr-2.5 lg:rounded-[20px]">
        <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
          <Topbar />
          {/* La `key` reinicia la animación de entrada en cada pantalla. */}
          <div
            key={location.pathname}
            className="pagina-entra mx-auto w-full max-w-[1440px] px-5 pb-10 pt-3 md:px-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
