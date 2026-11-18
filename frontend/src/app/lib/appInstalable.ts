/**
 * Instalación de PalmApp en el celular.
 *
 * Chrome y Edge avisan con `beforeinstallprompt` y dejan instalar de una.
 * iOS no tiene ese evento: ahí toca explicarle al usuario el paso manual
 * desde el botón Compartir, que es lo que significa la forma `ios`.
 */
import { useEffect, useState } from 'react';

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
}

const EVT_INSTALABLE = 'palmapp:instalable';
let eventoInstalar: EventoInstalar | null = null;

export function registrarApp() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalar = e as EventoInstalar;
    window.dispatchEvent(new Event(EVT_INSTALABLE));
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    window.dispatchEvent(new Event(EVT_INSTALABLE));
  });
  // Solo en la versión publicada: en desarrollo guardaría pantallas viejas.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* sin instalación: la app sigue funcionando en el navegador */
      });
    });
  }
}

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export type FormaInstalar = 'directa' | 'ios' | null;

function formaInstalar(): FormaInstalar {
  if (yaInstalada()) return null;
  if (eventoInstalar) return 'directa';
  return esIOS() ? 'ios' : null;
}

/** Cómo se puede instalar en este celular. Null si ya está instalada o el navegador no lo permite. */
export function useFormaInstalar(): FormaInstalar {
  const [forma, setForma] = useState(formaInstalar);
  useEffect(() => {
    const on = () => setForma(formaInstalar());
    window.addEventListener(EVT_INSTALABLE, on);
    return () => window.removeEventListener(EVT_INSTALABLE, on);
  }, []);
  return forma;
}

export function pedirInstalacion() {
  eventoInstalar?.prompt();
}
