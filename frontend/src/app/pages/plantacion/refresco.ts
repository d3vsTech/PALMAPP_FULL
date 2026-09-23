/**
 * Refresco de las pantallas de plantación.
 *
 * Las dos vistas que listan la jerarquía, el índice de predios y el detalle de
 * un lote, se llenan una sola vez al montarse. Eso deja dos huecos por donde
 * se cuela información vieja:
 *
 *  - Se vuelve de guardar y la relectura choca con una caché.
 *  - La app estuvo en segundo plano y al volver sigue pintado lo de antes.
 *
 * Lo que sigue tapa el segundo. El primero lo resuelve el aviso `recargar` que
 * mandan las pantallas de guardado, leído con `vengoDeGuardar`.
 */
import { useEffect, useRef, useState } from 'react';
import type { Location } from 'react-router';

/** Lo que las pantallas de guardado mandan al volver. */
export interface EstadoNavegacion {
  recargar?: boolean;
  openSubloteId?: number | string;
}

/** El aviso de "vengo de guardar", leído una sola vez al montar. */
export function useVengoDeGuardar(location: Location): boolean {
  const [vengoDeGuardar] = useState(
    () => (location.state as EstadoNavegacion | null)?.recargar === true,
  );
  return vengoDeGuardar;
}

/** Tiempo mínimo entre dos refrescos por foco. */
const ESPERA_MS = 30_000;

/**
 * Vuelve a pedir los datos cuando la pantalla recupera el foco.
 *
 * En un celular la app se manda a segundo plano todo el tiempo. Al volver, lo
 * que quedó pintado puede ser de hace media hora, y si en ese rato alguien
 * guardó algo la lista se ve incompleta sin que nada lo señale.
 *
 * `recargar` debe ser estable y silenciosa: esto corre cada vez que el usuario
 * vuelve a la pestaña, así que no puede mostrar el spinner ni borrar lo que ya
 * está en pantalla.
 *
 * Dos detalles que evitan pedir de más. Volver a la ventana dispara `focus` y
 * `visibilitychange` casi a la vez, que serían dos cargas iguales seguidas; y
 * salir y entrar de la pestaña un par de veces seguidas no cambia nada del
 * otro lado. Por eso entre un refresco y el siguiente pasan 30 segundos: una
 * ausencia real siempre dura más que eso.
 */
export function useRefrescoAlVolver(recargar: () => void): void {
  const ultimoRef = useRef(Date.now());

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      const ahora = Date.now();
      if (ahora - ultimoRef.current < ESPERA_MS) return;
      ultimoRef.current = ahora;
      recargar();
    };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [recargar]);
}
