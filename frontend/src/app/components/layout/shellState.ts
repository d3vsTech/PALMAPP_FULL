import { useEffect, useState, useSyncExternalStore } from 'react';

// Estado de presentación del shell, compartido entre menú, barra superior y barra inferior.
// Solo afecta la vista; no toca datos ni rutas.

const KEY_COLAPSADO = 'palmapp:menu-colapsado';
const EVT_COLAPSADO = 'palmapp:menu-colapsado';
export const EVT_ABRIR_MENU = 'palmapp:abrir-menu';
export const EVT_ABRIR_BUSCADOR = 'palmapp:abrir-buscador';

function leerColapsado() {
  try {
    return localStorage.getItem(KEY_COLAPSADO) === '1';
  } catch {
    return false;
  }
}

/** Menú lateral en modo íconos. Se recuerda por navegador. */
export function useMenuColapsado(): [boolean, (v: boolean) => void] {
  const [colapsado, setColapsado] = useState(leerColapsado);
  useEffect(() => {
    const on = () => setColapsado(leerColapsado());
    window.addEventListener(EVT_COLAPSADO, on);
    return () => window.removeEventListener(EVT_COLAPSADO, on);
  }, []);
  const set = (v: boolean) => {
    try {
      localStorage.setItem(KEY_COLAPSADO, v ? '1' : '0');
    } catch {
      /* sin almacenamiento: solo esta sesión */
    }
    setColapsado(v);
    window.dispatchEvent(new Event(EVT_COLAPSADO));
  };
  return [colapsado, set];
}

/** Escucha un evento del shell (abrir menú móvil, abrir buscador). */
export function useEventoShell(nombre: string, handler: () => void) {
  useEffect(() => {
    window.addEventListener(nombre, handler);
    return () => window.removeEventListener(nombre, handler);
  }, [nombre, handler]);
}

// Destino del botón de volver de la barra superior en celular. Lo fija el encabezado de cada pantalla.
const EVT_VOLVER = 'palmapp:volver';
let destinoVolver: string | null = null;

export function fijarVolver(destino: string | null) {
  destinoVolver = destino;
  window.dispatchEvent(new Event(EVT_VOLVER));
}

export function useDestinoVolver() {
  return useSyncExternalStore(
    (avisar) => {
      window.addEventListener(EVT_VOLVER, avisar);
      return () => window.removeEventListener(EVT_VOLVER, avisar);
    },
    () => destinoVolver
  );
}

/** Formularios y asistentes: en celular ocultan el menú inferior y fijan sus botones abajo (.barra-acciones). */
export const esPantallaFormulario = (ruta: string) =>
  /\/(nuev[oa]|editar)(\/|-|$)|\/conteo$|^\/operaciones\/planilla\//.test(ruta);

export const abrirMenuMovil = () => window.dispatchEvent(new Event(EVT_ABRIR_MENU));
export const abrirBuscador = () => window.dispatchEvent(new Event(EVT_ABRIR_BUSCADOR));
