/**
 * TabLoadingGate.tsx
 *
 * Wrapper compartido para todos los tabs de Configuración: mientras los datos
 * iniciales están cargando muestra SOLO un spinner centrado (sin headers ni
 * "Cargando..." dentro de las cards, sin botones de "Agregar" colgando). En
 * cuanto `loading` pasa a `false` renderiza el contenido normal del tab.
 *
 * Uso:
 *   <TabLoadingGate loading={loading}>
 *     ... contenido del tab (cards, tablas, etc.) ...
 *   </TabLoadingGate>
 */
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  loading: boolean;
  message?: string;
  children: ReactNode;
}

export function TabLoadingGate({ loading, message = 'Cargando…', children }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    );
  }
  return <>{children}</>;
}
