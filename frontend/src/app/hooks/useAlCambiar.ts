import { useEffect, useRef } from 'react';

/**
 * Corre `efecto` cuando `firma` cambia, pero no la primera vez que se conoce.
 *
 * Un `useEffect` normal también dispara en el montaje. Eso servía mientras el
 * estado arrancaba siempre en limpio, pero al restaurar filtros desde la
 * sesión pisaba la página que el usuario venía viendo. Una firma vacía se
 * ignora: significa que el valor todavía no llegó del backend.
 */
export function useAlCambiar(firma: string, efecto: () => void) {
  const previa = useRef<string | null>(null);
  const ultimo = useRef(efecto);

  useEffect(() => { ultimo.current = efecto; });

  useEffect(() => {
    if (!firma) return;
    if (previa.current === null) {
      previa.current = firma;
      return;
    }
    if (previa.current === firma) return;
    previa.current = firma;
    ultimo.current();
  }, [firma]);
}
