import { useEffect, useState } from 'react';

/**
 * Lee el valor guardado; si no hay o quedó ilegible, devuelve el inicial.
 */
function leer<T>(clave: string, inicial: T): T {
  try {
    const crudo = sessionStorage.getItem(clave);
    return crudo === null ? inicial : (JSON.parse(crudo) as T);
  } catch (e) {
    console.warn(`[useEstadoPersistido] valor ilegible en "${clave}"`, e);
    return inicial;
  }
}

/**
 * `useState` que recuerda su valor mientras dure la pestaña.
 *
 * Las pantallas de listado perdían sus filtros al entrar al detalle de un
 * registro y volver: el componente se vuelve a montar y el estado arranca en
 * su valor por defecto, así que el usuario caía en el mes corriente y perdía
 * el punto donde venia revisando.
 *
 * Es `sessionStorage` y no `localStorage` a propósito: la selección vale para
 * la jornada de trabajo. Mañana la pantalla vuelve a abrir en el período de
 * hoy, que es lo que se espera al entrar de nuevo.
 */
export function useEstadoPersistido<T>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, inicial));

  useEffect(() => {
    try {
      sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      console.warn(`[useEstadoPersistido] no se pudo guardar "${clave}"`, e);
    }
  }, [clave, valor]);

  return [valor, setValor] as const;
}
