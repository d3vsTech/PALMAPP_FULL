/**
 * Props para un elemento que se comporta como botón sin serlo.
 *
 * En varias pantallas hay `div` con `onClick`: la fila que se despliega, la
 * palma que se selecciona, el nombre del producto que lleva al detalle. Con el
 * mouse funcionan; con el teclado no existen, porque un `div` no recibe foco
 * ni responde a Enter. Quien navega con Tab no puede usarlos.
 *
 * Lo ideal sería un `<button>`, pero cambiarlo arrastra los estilos de la
 * tarjeta o de la fila. Esto le da al elemento lo que le falta: foco, el papel
 * de botón y las dos teclas que todos esperan.
 *
 * Úsalo con spread:
 *   <div {...comoBoton(() => abrir(id))} className="...">
 */
import type { KeyboardEvent } from 'react';

export function comoBoton(alActivar: () => void, habilitado = true) {
  if (!habilitado) return {};

  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: alActivar,
    onKeyDown: (e: KeyboardEvent) => {
      // La barra espaciadora desplaza la página si no se la detiene.
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      alActivar();
    },
  };
}
