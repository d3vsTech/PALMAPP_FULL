import { useEffect, useRef } from 'react';

/**
 * Re-ejecuta `fn` automáticamente para mantener una vista sincronizada sin
 * que el usuario tenga que recargar la página. Se usa principalmente en las
 * pantallas de pedidos del market (lado finca) y portal proveedor para que
 * los cambios de estado del otro lado aparezcan solos.
 *
 * Combina dos disparadores:
 *  1. **Polling** cada `intervalMs` (default 20 s) mientras la pestaña está
 *     visible. No corre en pestañas en background para no malgastar red.
 *  2. **Visibility/focus**: refetch inmediato al volver a la pestaña o
 *     ventana. Cubre el caso típico de "cambié de pestaña 30 s y volví",
 *     donde el polling todavía no había disparado.
 *
 * No invoca `fn` en el montaje (eso lo hace el `useEffect` original del
 * componente). Solo se encarga de la actualización pasiva.
 *
 * @param fn         Función a ejecutar (típicamente la que carga datos).
 * @param intervalMs Cada cuánto refrescar mientras la pestaña esté visible.
 * @param enabled    Permite pausar el auto-refresh (ej. mientras hay un modal abierto).
 */
export function useAutoRefresh(
  fn: () => void,
  intervalMs = 20_000,
  enabled = true,
): void {
  // Guardamos la última `fn` en una ref para que el interval no se recree en
  // cada render (cambia muchísimo cuando hay estado en la pantalla).
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      // No correr si la pestaña está oculta — ahorra red y batería.
      if (document.visibilityState !== 'visible') return;
      fnRef.current();
    };

    const id = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fnRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [intervalMs, enabled]);
}
