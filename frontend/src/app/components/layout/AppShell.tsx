import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 grid-pattern-subtle pointer-events-none opacity-40" />
      
      <Sidebar />
      {/* `min-w-0`: un hijo de flex no baja de su ancho de contenido a menos
          que se le diga. Sin esto una tabla ancha estira esta columna y
          empuja la página entera, que es lo que se ve cortado. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative z-10">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-hidden">
          {/* Padding adaptativo: 4 en mobile, 6 en tablet, 8 en desktop.
              `overflow-auto` y no solo `-y`: si algo se pasa de ancho se
              scrollea aquí dentro en vez de quedar recortado sin salida. */}
          <div className="h-full overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}