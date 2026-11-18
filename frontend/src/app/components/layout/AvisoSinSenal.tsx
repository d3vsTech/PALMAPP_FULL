/**
 * Franja bajo la barra superior cuando el equipo se queda sin conexión.
 *
 * En finca la señal se cae a cada rato y el usuario alcanzaba a llenar una
 * planilla entera antes de enterarse: el guardado fallaba con un error
 * genérico y parecía culpa de la app. Esto lo avisa antes de que escriba.
 *
 * Solo avisa. El guardado sin señal, que deja el dato en el equipo y lo sube
 * después, necesita un endpoint de reenvío que el backend todavía no tiene.
 */
import { useSyncExternalStore } from 'react';
import { CloudOff } from 'lucide-react';

function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
}

/** `true` cuando el navegador reporta que no hay red. */
export function useSinSenal(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => !navigator.onLine,
    // En el render del servidor no hay navigator: se asume que sí hay señal.
    () => false,
  );
}

export default function AvisoSinSenal() {
  const sinSenal = useSinSenal();
  if (!sinSenal) return null;

  return (
    <div
      role="status"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex min-h-11 items-center gap-2 border-b border-warning/30 bg-warning-soft px-5 py-1.5 text-[13px] font-medium text-foreground md:top-16 md:px-8"
    >
      <CloudOff className="h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
      <span>Sin señal. No vas a poder guardar hasta que vuelva la conexión.</span>
    </div>
  );
}
