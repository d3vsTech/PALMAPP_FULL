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
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Topbar />
        <main className="flex-1 overflow-hidden">
          {/* Padding adaptativo: 4 en mobile, 6 en tablet, 8 en desktop */}
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}