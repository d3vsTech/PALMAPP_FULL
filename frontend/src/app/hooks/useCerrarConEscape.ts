/**
 * Cierra con la tecla Escape lo que esté abierto encima de la pantalla.
 *
 * Los diálogos y los menús laterales solo se cerraban tocando el fondo con el
 * mouse. Quien navega con el teclado quedaba atrapado: ninguna tecla salía de
 * ahí. Escape es lo que todo el mundo intenta primero, y es lo que exige la
 * guía de accesibilidad para cualquier capa modal.
 *
 * Además deja el fondo como decoración (`aria-hidden`), porque con Escape ya
 * no es el único camino de salida.
 */
import { useEffect } from 'react';

export function useCerrarConEscape(activo: boolean, alCerrar: () => void): void {
  useEffect(() => {
    if (!activo) return;

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };

    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [activo, alCerrar]);
}
